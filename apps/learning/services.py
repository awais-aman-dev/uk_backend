"""Publishing and ordering learning material.

Saving content and showing it to students are deliberately separate actions. Everything starts as
a draft; publishing is its own step, with its own permission, that checks the material will
actually work before anybody can reach it, and records who released it.

The admin calls these functions. So will the student API, which is why the rules live here rather
than in the admin screens.
"""

import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.core import audit
from apps.core.models import PublishStatus
from apps.learning import html
from apps.learning.models import (
    AVAILABLE_CONTENT_TYPES,
    Chapter,
    ContentType,
    LearningContent,
    Subchapter,
)
from apps.staff.authz import require_permission

logger = logging.getLogger(__name__)


class NotReadyToPublishError(Exception):
    """The material would not work for students."""

    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("; ".join(problems))


def publish_permission_for(instance) -> str:
    """The permission needed to publish this kind of material, e.g. ``learning.publish_chapter``."""
    meta = instance._meta
    return f"{meta.app_label}.publish_{meta.model_name}"


# --- What students can see -----------------------------------------------------------------------


def live(queryset, at=None):
    """Narrow a queryset to what students can see now.

    Published is not the same as visible: material can be published today and scheduled to appear
    next Monday, and until then it stays out of sight.
    """
    at = at or timezone.now()
    return queryset.filter(status=PublishStatus.PUBLISHED).filter(
        Q(publish_from__isnull=True) | Q(publish_from__lte=at)
    )


def live_subchapters_of(chapter: Chapter, at=None):
    return live(chapter.subchapters.all(), at)


def live_content_of(subchapter: Subchapter, at=None):
    return live(subchapter.content.all(), at)


# --- Checks before anything reaches students -----------------------------------------------------


def problems_with(instance) -> list[str]:
    """Everything that would stop this being published. Empty means it is ready."""
    if isinstance(instance, Chapter):
        return _problems_with_chapter(instance)
    if isinstance(instance, Subchapter):
        return _problems_with_subchapter(instance)
    if isinstance(instance, LearningContent):
        return _problems_with_content(instance)
    return []


def _problems_with_chapter(chapter: Chapter) -> list[str]:
    if not live_subchapters_of(chapter).exists():
        # A chapter with nothing inside it is an empty room for students.
        return ["No subchapter in this chapter is published yet."]
    return []


def _problems_with_subchapter(subchapter: Subchapter) -> list[str]:
    problems = []
    if not subchapter.chapter.is_published:
        problems.append(f"Its chapter '{subchapter.chapter.title}' is not published, so students cannot reach it.")
    if not live_content_of(subchapter).exists():
        problems.append("Nothing in this subchapter is published yet.")
    return problems


def _problems_with_content(content: LearningContent) -> list[str]:
    problems = []

    if content.content_type not in AVAILABLE_CONTENT_TYPES:
        kind = ContentType(content.content_type).label
        problems.append(f"{kind} material cannot be served yet, so it cannot be published.")
    elif html.is_empty(content.body_html):
        problems.append("There is no content yet.")

    if not content.subchapter.is_published:
        problems.append(f"Its subchapter '{content.subchapter.title}' is not published, so students cannot reach it.")

    return problems


# --- Actions -------------------------------------------------------------------------------------


@transaction.atomic
def publish(*, actor, instance, reason: str = ""):
    """Release material to students. Raises if the actor may not, or it is not ready."""
    require_permission(actor, publish_permission_for(instance))

    problems = problems_with(instance)
    if problems:
        raise NotReadyToPublishError(problems)

    instance.status = PublishStatus.PUBLISHED
    instance.published_at = timezone.now()
    instance.published_by = actor
    instance.save(update_fields=["status", "published_at", "published_by", "updated_at"])

    audit.record(
        actor=actor,
        action=f"learning.{instance._meta.model_name}.published",
        target=instance,
        changes={"status": {"from": "draft", "to": "published"}},
        reason=reason,
    )
    logger.info("%s published %s %s", getattr(actor, "email", "system"), instance._meta.model_name, instance.pk)
    return instance


@transaction.atomic
def unpublish(*, actor, instance, reason: str = ""):
    """Take material back off the site. It becomes a draft again, keeping what was written."""
    require_permission(actor, publish_permission_for(instance))

    was = instance.status
    instance.status = PublishStatus.DRAFT
    instance.save(update_fields=["status", "updated_at"])

    audit.record(
        actor=actor,
        action=f"learning.{instance._meta.model_name}.unpublished",
        target=instance,
        changes={"status": {"from": was, "to": "draft"}},
        reason=reason,
    )
    return instance


@transaction.atomic
def reorder(*, actor, model, ordered_ids: list[int]) -> None:
    """Put material in the given order, numbering it 1, 2, 3 with no gaps.

    Positions are counted within one parent, so renumbering a chapter never disturbs another.
    """
    require_permission(actor, f"{model._meta.app_label}.change_{model._meta.model_name}")

    by_id = {item.pk: item for item in model.objects.filter(pk__in=ordered_ids)}
    changed = []
    for position, item_id in enumerate(ordered_ids, start=1):
        item = by_id.get(item_id)
        if item is not None and item.order != position:
            item.order = position
            changed.append(item)

    if changed:
        model.objects.bulk_update(changed, ["order"])


# --- What the API will serve ---------------------------------------------------------------------


def student_view_of(instance) -> dict:
    """The shape of this material for the student API, also used by the admin preview.

    Built here rather than in the preview page, so the preview cannot drift away from what is
    actually served. The API keeps its existing names — a chapter is a "topic" to the frontend and
    a subchapter is a "lesson" — so the rename inside the product does not reach it.

    This leaves out drafts and anything not yet live, but not material limited to packages: that
    depends on who is asking, so the API view narrows it with ``entitlements.visible_to`` for the
    signed-in student. Staff previewing see everything that is live.
    """
    if isinstance(instance, Subchapter):
        return {
            "slug": instance.slug,
            "title": instance.title,
            "summary": instance.summary,
            "minutes": instance.minutes,
            "topic": {"slug": instance.chapter.slug, "title": instance.chapter.title},
            "blocks": [block_for(item) for item in live_content_of(instance).order_by("order", "title")],
        }

    if isinstance(instance, LearningContent):
        return {
            "slug": instance.slug,
            "title": instance.title,
            "blocks": [block_for(instance)],
        }

    return {
        "slug": instance.slug,
        "title": instance.title,
        "summary": getattr(instance, "description", ""),
        "blocks": [],
    }


def block_for(content: LearningContent) -> dict:
    """One content item as the frontend reads it.

    The frontend takes content as a list of blocks, so theory is served as a single HTML block:
    the shape it already expects, needing one renderer rather than one per kind of material.
    """
    return {"type": "html", "html": content.body_html, "title": content.title}

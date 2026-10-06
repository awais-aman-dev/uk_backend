"""Who may study, and until when.

One place answers "does this person have access right now?", used by the cabinet and by every
learning endpoint, so the answer cannot differ between them.
"""

import logging
from datetime import timedelta

from constance import config
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from apps.accounts.models import User
from apps.billing.models import Order, PromoCode
from apps.entitlements.models import Subscription

logger = logging.getLogger(__name__)


def current_subscription(user: User) -> Subscription | None:
    """The subscription that decides the customer's access: the one reaching furthest ahead.

    Returns the most recently expiring subscription even when it has already lapsed, because the
    cabinet shows "expired" rather than "never bought anything".
    """
    return (
        Subscription.objects.filter(user=user)
        .select_related("package", "order")
        .order_by("-package_expires_at")
        .first()
    )


def has_access(user: User, at=None) -> bool:
    """Whether this person may use the learning material."""
    if not user.is_authenticated or not user.is_active:
        return False

    at = at or timezone.now()
    return Subscription.objects.filter(
        user=user,
        starts_at__lte=at,
        package_expires_at__gt=at,
    ).exists()


def package_of(user: User) -> int | None:
    """Which package this person is currently on, or None if they have bought nothing."""
    subscription = current_subscription(user)
    return subscription.package_id if subscription else None


def _allows(package_id: int | None, prefix: str = "") -> Q:
    """Material is allowed when it lists no packages, or lists the one the student is on.

    ``prefix`` walks up the hierarchy, so the same rule covers an item, its subchapter and its
    chapter: a restriction higher up covers everything beneath it.
    """
    unrestricted = Q(**{f"{prefix}only_for_packages__isnull": True})
    if package_id is None:
        return unrestricted
    return unrestricted | Q(**{f"{prefix}only_for_packages": package_id})


def can_view(user: User, content, at=None) -> bool:
    """Whether this person may see a particular piece of learning material.

    Two questions, in order: do they have learning access at all, and is this material — or the
    subchapter or chapter holding it — limited to packages they did not buy.
    """
    if not has_access(user, at):
        return False

    package_id = package_of(user)
    owners = [content]
    subchapter = getattr(content, "subchapter", None)
    if subchapter is not None:
        owners += [subchapter, subchapter.chapter]
    chapter = getattr(content, "chapter", None)
    if chapter is not None:
        owners.append(chapter)

    # A question carries no gate of its own: it follows the chapter it belongs to, so it cannot
    # fall out of step with the material it is testing.
    owners = [owner for owner in owners if hasattr(owner, "only_for_packages")]

    for owner in owners:
        required = {package.pk for package in owner.only_for_packages.all()}
        if required and package_id not in required:
            return False

    return True


def visible_content(user: User, queryset, at=None):
    """Narrow a queryset of learning content to what this person may see.

    Used for lists, where asking per item would mean a query per row. Checks the item, its
    subchapter and its chapter, because a package that excludes a chapter excludes its contents.
    """
    if not has_access(user, at):
        return queryset.none()

    package_id = package_of(user)
    return queryset.filter(
        _allows(package_id),
        _allows(package_id, "subchapter__"),
        _allows(package_id, "subchapter__chapter__"),
    ).distinct()


def visible_subchapters(user: User, queryset, at=None):
    if not has_access(user, at):
        return queryset.none()

    package_id = package_of(user)
    return queryset.filter(_allows(package_id), _allows(package_id, "chapter__")).distinct()


def visible_questions(user: User, queryset, at=None):
    """Narrow a queryset of questions to what this person may practise.

    A question belongs to a chapter, and a package that excludes the chapter excludes its
    questions too, so a student is never asked about material they cannot read.
    """
    if not has_access(user, at):
        return queryset.none()

    return queryset.filter(_allows(package_of(user), "chapter__")).distinct()


def visible_chapters(user: User, queryset, at=None):
    if not has_access(user, at):
        return queryset.none()

    return queryset.filter(_allows(package_of(user))).distinct()


def account_lifetime_days(duration_days: int) -> float:
    """How long the account stays open for a package of this length.

    The multiplier is editable in the admin, so marketing can change the grace period without
    a deploy. It only affects purchases made afterwards.
    """
    return duration_days * float(config.ACCOUNT_LIFETIME_COEFFICIENT)


@transaction.atomic
def activate(order: Order, user: User) -> tuple[Subscription, bool]:
    """Turn a paid order into access. Returns the subscription and whether it was just created.

    Safe to call repeatedly for the same order: the second call returns the existing subscription
    untouched, so a redelivered webhook cannot extend access twice or count a promo code twice.
    """
    existing = Subscription.objects.filter(order=order).first()
    if existing is not None:
        return existing, False

    # Access continues from whatever the customer already has, so buying early never costs them
    # the days they have left.
    starts_at = order.paid_at or timezone.now()
    active = (
        Subscription.objects.select_for_update()
        .filter(user=user, package_expires_at__gt=starts_at)
        .order_by("-package_expires_at")
        .first()
    )
    if active is not None:
        starts_at = active.package_expires_at

    duration = order.package.duration_days
    subscription = Subscription.objects.create(
        user=user,
        order=order,
        package=order.package,
        starts_at=starts_at,
        package_expires_at=starts_at + timedelta(days=duration),
        account_expires_at=starts_at + timedelta(days=account_lifetime_days(duration)),
    )

    _sync_account(user, subscription)

    if order.promo_code_id:
        # F() so simultaneous purchases both count.
        PromoCode.objects.filter(pk=order.promo_code_id).update(uses_count=F("uses_count") + 1)

    logger.info("Granted access to %s until %s", user.email, subscription.package_expires_at)
    return subscription, True


def _sync_account(user: User, subscription: Subscription) -> None:
    """Copy the account expiry onto the user and let a lapsed customer back in.

    Without the reactivation a returning customer whose account had been closed would pay and
    still be unable to sign in. Staff accounts are left alone; their access is not bought.

    Reads the row again under a lock rather than trusting the object it was handed: the caller may
    have been holding it since before the nightly job closed the account, and deciding from a
    stale copy would leave a paying customer locked out.
    """
    account = User.objects.select_for_update().get(pk=user.pk)

    fields = ["account_expires_at", "updated_at"]
    account.account_expires_at = subscription.account_expires_at

    if not account.is_active and not account.is_staff:
        account.is_active = True
        fields.append("is_active")

    account.save(update_fields=fields)

    # Keep the caller's copy in step, so it does not go on to save stale values.
    user.account_expires_at = account.account_expires_at
    user.is_active = account.is_active

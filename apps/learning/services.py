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
    LessonProgress,
    MediaKind,
    MockAttempt,
    PracticeExam,
    Question,
    QuestionAttempt,
    QuestionType,
    SavedQuestion,
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
    if isinstance(instance, Question):
        return problems_with_question(instance)
    if isinstance(instance, PracticeExam):
        return problems_with_exam(instance)
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


def problems_with_question(question: Question) -> list[str]:
    """What would make a question unusable for a student."""
    problems = []
    options = list(question.options.all())
    correct = [option for option in options if option.is_correct]

    if len(options) < 2:
        problems.append("A question needs at least two answers to choose between.")

    if question.question_type == QuestionType.MULTI:
        if len(correct) < 2:
            problems.append("A question with several answers needs at least two of them marked correct.")
    elif len(correct) != 1:
        # Without exactly one, the frontend cannot tell the student what the answer was.
        problems.append("Exactly one answer must be marked correct.")

    if question.question_type == QuestionType.IMAGE and any(option.sign_id is None for option in options):
        problems.append("Every answer needs a road sign, because this question is answered with signs.")

    if not question.prompt.strip():
        problems.append("There is no question text yet.")

    return problems


def problems_with_exam(exam: PracticeExam) -> list[str]:
    """What would make an exam unusable."""
    problems = []
    questions = list(exam.questions.all())

    if not questions:
        problems.append("This exam has no questions yet.")

    drafts = [question for question in questions if not question.is_published]
    if drafts:
        # Naming them, so staff can go and fix the right ones.
        listed = ", ".join(question.key for question in drafts[:5])
        problems.append(f"Some questions are not published yet: {listed}.")

    if exam.pass_mark > len(questions):
        problems.append(f"The pass mark is {exam.pass_mark} but there are only {len(questions)} questions.")

    return problems


def _problems_with_content(content: LearningContent) -> list[str]:
    problems = []

    if content.content_type not in AVAILABLE_CONTENT_TYPES:
        kind = ContentType(content.content_type).label
        problems.append(f"{kind} material cannot be served yet, so it cannot be published.")
    elif content.content_type == ContentType.QUESTION:
        if content.question is None:
            problems.append("No question has been chosen from the bank.")
        elif not content.question.is_published:
            problems.append(f"The question '{content.question.key}' is not published yet.")
    elif content.content_type in MEDIA_CONTENT_TYPES:
        wanted = MEDIA_CONTENT_TYPES[ContentType(content.content_type)]
        if content.media is None:
            problems.append("No file has been chosen from the media library.")
        elif content.media.kind != wanted:
            # Otherwise the frontend would be told to play a PDF, or to download a video.
            problems.append(
                f"'{content.media.title}' is {content.media.get_kind_display().lower()}, "
                f"but this is {ContentType(content.content_type).label.lower()} material."
            )
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

    if isinstance(instance, Question):
        # A question has no body to render, so the preview page shows the answer sheet instead.
        return {
            "slug": instance.key,
            "title": instance.prompt,
            "summary": "",
            "blocks": [],
        }

    return {
        "slug": instance.slug,
        "title": instance.title,
        "summary": getattr(instance, "description", ""),
        "blocks": [],
    }


def answer_sheet_for(question: Question) -> dict:
    """A question with its answers marked, for staff checking it before publishing.

    Deliberately a separate function from :func:`student_view_of_question`, which never carries
    the answer, so a page meant for staff cannot be wired to students by mistake.
    """
    return {
        "prompt": question.prompt,
        "sign": question.media_sign.code if question.media_sign else "",
        "explanation": question.explanation,
        "learn_more": question.learn_more.title if question.learn_more else "",
        "options": [
            {
                "id": option.option_id,
                "text": option.text,
                "sign": option.sign.code if option.sign else "",
                "is_correct": option.is_correct,
            }
            for option in question.options.all()
        ],
    }


#: Which kind of file each media content type expects, so one cannot be published with the other.
MEDIA_CONTENT_TYPES = {
    ContentType.VIDEO: MediaKind.VIDEO,
    ContentType.DOCUMENT: MediaKind.DOCUMENT,
}


def block_for(content: LearningContent) -> dict:
    """One content item as the frontend reads it.

    The frontend takes content as a list of blocks: theory is one HTML block, a question is a
    check block naming the question, and a file is a video or document block carrying a URL.

    That URL is signed and expires, and it is built here — at the moment of serving — rather than
    stored, so a link cannot be kept or shared beyond its lifetime. The caller has already decided
    this student may see the content, which is what earns them the URL.
    """
    if content.content_type == ContentType.QUESTION and content.question:
        return {"type": "check", "questions": [content.question.key], "title": content.title}

    if content.content_type in MEDIA_CONTENT_TYPES and content.media:
        return {
            "type": content.content_type,
            "title": content.title,
            "url": content.media.file.url,
            "durationSeconds": content.media.duration_seconds,
        }

    return {"type": "html", "html": content.body_html, "title": content.title}


def student_view_of_question(question: Question) -> dict:
    """A question as a student sees it before answering.

    Built without ``is_correct``: the answer is not in the payload at all, rather than being sent
    and hidden by the frontend.
    """
    return {
        "id": question.pk,
        "key": question.key,
        "topic": question.chapter.slug,
        "type": question.question_type,
        "prompt": question.prompt,
        "media": {"kind": "sign", "code": question.media_sign.code} if question.media_sign else None,
        "options": [
            {
                "id": option.option_id,
                **({"text": option.text} if option.text else {}),
                **({"sign": option.sign.code} if option.sign else {}),
            }
            for option in question.options.all()
        ],
        "pick": question.pick,
    }


def questions_in_exam(exam: PracticeExam, at=None):
    """The exam's published questions, in the order staff put them in.

    Drafts are left out rather than shown unanswerable, which is also why an exam cannot be
    published while any of its questions is still a draft — see :func:`problems_with_exam`.
    """
    return live(
        Question.objects.filter(exam_places__exam=exam).select_related("chapter").prefetch_related("options"),
        at=at,
    ).order_by("exam_places__order")


def mark_exam(exam: PracticeExam, answers: dict[str, list[str]]) -> dict:
    """Score a whole sitting, which is the only place a pass or fail is decided.

    ``answers`` maps a question id to the option ids chosen for it. Anything not answered counts
    as wrong, so a student cannot improve a score by leaving questions out, and unknown ids are
    ignored rather than rejected: a question unpublished mid-sitting should not void the attempt.
    """
    results = []
    score = 0

    for question in questions_in_exam(exam):
        chosen = answers.get(str(question.pk)) or []
        correct_ids = question.correct_option_ids
        correct = sorted(chosen) == sorted(correct_ids)
        score += correct
        results.append(
            {
                "id": question.pk,
                "key": question.key,
                "correct": correct,
                "selected": chosen,
                "correctIds": correct_ids,
                "explanation": question.explanation,
            }
        )

    return {
        "score": score,
        "total": len(results),
        "passMark": exam.pass_mark,
        "passed": score >= exam.pass_mark,
        "questions": results,
    }


def mark_answer(question: Question, selected: list[str]) -> dict:
    """Mark an answer, which is the only place correctness is decided.

    Marking happens here rather than in the browser, so the answer is never in the page before
    the student commits to one.
    """
    correct_ids = question.correct_option_ids
    return {
        "correct": sorted(selected) == sorted(correct_ids),
        "correctIds": correct_ids,
        "explanation": question.explanation,
        "lesson": (
            {"slug": question.learn_more.slug, "title": question.learn_more.title} if question.learn_more else None
        ),
    }


# --- Progress ------------------------------------------------------------------------------------
#
# Everything here is worked out from the attempt records rather than kept in a counter, so a
# number shown to a student can never drift away from what they actually did.


def record_answer(student, question: Question, was_correct: bool) -> None:
    """Remember one answer."""
    QuestionAttempt.objects.create(student=student, question=question, was_correct=was_correct)


def record_sitting(student, exam: PracticeExam, result: dict) -> None:
    """Remember one exam sitting: the score, and every answer that made it up.

    The answers are recorded too, so a question got wrong in a mock turns up under "mistakes"
    exactly as one got wrong while practising.
    """
    MockAttempt.objects.create(
        student=student,
        exam=exam,
        score=result["score"],
        total=result["total"],
        passed=result["passed"],
    )
    QuestionAttempt.objects.bulk_create(
        QuestionAttempt(student=student, question_id=answer["id"], was_correct=answer["correct"])
        for answer in result["questions"]
    )


def mark_lesson_done(student, subchapter: Subchapter) -> None:
    """Record that a student finished a subchapter. Finishing it twice changes nothing."""
    LessonProgress.objects.get_or_create(student=student, subchapter=subchapter)


def completed_lesson_ids(student) -> set[int]:
    """Which subchapters this student has finished, for marking up a listing in one query."""
    return set(LessonProgress.objects.filter(student=student).values_list("subchapter_id", flat=True))


def saved_question_keys(student) -> list[str]:
    return list(SavedQuestion.objects.filter(student=student).values_list("question__key", flat=True))


def mastery_of(student, chapter: Chapter) -> dict:
    """How much of a chapter's question bank the student has got right at least once.

    Counted over questions rather than attempts, so answering the same question ten times does
    not look like progress, and a question answered right once stays counted even if a later
    attempt was wrong — this is "have you learnt it", not "how are you doing today".
    """
    total = live(Question.objects.filter(chapter=chapter)).count()
    if not total:
        return {"mastery": 0, "questions": 0}

    learnt = (
        QuestionAttempt.objects.filter(student=student, was_correct=True, question__chapter=chapter)
        .values("question_id")
        .distinct()
        .count()
    )
    return {"mastery": round(learnt * 100 / total), "questions": total}


def study_days(student) -> list:
    """The distinct dates this student did something, newest first.

    Both answering a question and finishing a lesson count, so a day spent reading is not lost.
    """
    answered = QuestionAttempt.objects.filter(student=student).dates("created_at", "day", order="DESC")
    read = LessonProgress.objects.filter(student=student).dates("completed_at", "day", order="DESC")
    return sorted(set(answered) | set(read), reverse=True)


def streak(student, today=None) -> int:
    """How many days in a row up to today the student has studied.

    Today not being used yet does not break the streak — it is only broken by a day that has
    passed with nothing in it — so the number does not drop to zero overnight.
    """
    today = today or timezone.localdate()
    days = study_days(student)
    if not days:
        return 0

    first = days[0]
    if (today - first).days > 1:
        return 0

    count = 1
    for earlier in days[1:]:
        if (first - earlier).days != 1:
            break
        count += 1
        first = earlier
    return count


def question_ids_attempted(student):
    """Every question this student has attempted, right or wrong, for going back over."""
    return QuestionAttempt.objects.filter(student=student).values("question_id")


def question_ids_already_learnt(student):
    """Questions this student has answered correctly at least once.

    Practising "weak" areas excludes these, which leaves both the questions got wrong and the
    ones never seen — so a new student asking for their weak areas gets the whole bank rather
    than nothing.
    """
    return QuestionAttempt.objects.filter(student=student, was_correct=True).values_list("question_id", flat=True)


def question_ids_answered_wrong(student):
    """Questions the student's most recent attempt got wrong, for practising mistakes.

    A question answered right since is left out: it is no longer a mistake to go back over.
    """
    wrong = set(
        QuestionAttempt.objects.filter(student=student, was_correct=False).values_list("question_id", flat=True)
    )
    right = set(
        QuestionAttempt.objects.filter(student=student, was_correct=True).values_list("question_id", flat=True)
    )
    return wrong - right


def progress_summary(student) -> dict:
    """The headline numbers for the Today screen."""
    days = study_days(student)
    attempts = QuestionAttempt.objects.filter(student=student)
    answered = attempts.values("question_id").distinct().count()
    learnt = attempts.filter(was_correct=True).values("question_id").distinct().count()
    bank = live(Question.objects.all()).count()
    sittings = MockAttempt.objects.filter(student=student)
    best = sittings.order_by("-score").first()

    return {
        "streak": streak(student),
        "studyDays": len(days),
        "lastStudiedOn": days[0] if days else None,
        "questionsAnswered": answered,
        "questionsLearnt": learnt,
        "mastery": round(learnt * 100 / bank) if bank else 0,
        "lessonsCompleted": LessonProgress.objects.filter(student=student).count(),
        "mockAttempts": sittings.count(),
        "mocksPassed": sittings.filter(passed=True).count(),
        "bestMockScore": best.score if best else None,
    }

"""The learning material students work through.

One hierarchy holds everything::

    Chapter  →  Subchapter  →  LearningContent (theory, video, document, question, hazard)

Packages buy access to parts of it: a chapter, a subchapter or a single item can be limited to
the packages that include it, and a restriction on a chapter covers everything inside it.

A **chapter** is a major area such as "Road signs". A **subchapter** divides it into a sitting's
worth of study. A **learning content** item is the thing a student actually reads or does, and its
``content_type`` says which kind it is. Adding a kind of material later means another content type,
not another hierarchy, so the Highway Code e-book is simply a chapter whose subchapters hold
theory and a document, rather than a second structure beside this one.

Two things deliberately sit outside the hierarchy, because they are libraries rather than places
in a course: road **signs**, which the frontend draws from a specification, and — from a later
branch — the question bank and hazard clips, which are referenced by content rather than owned
by it.

Content is addressed by ``slug`` because that is what the API asks for, so a slug becomes part of
the public contract once published.
"""

from django.conf import settings
from django.db import models

from apps.core.models import PublishableModel, TimestampedModel
from apps.learning import html


class Chapter(PublishableModel, TimestampedModel):
    """A major area of the course, such as "Road signs" or "The Highway Code"."""

    slug = models.SlugField(unique=True, help_text="Used in links. Changing it breaks saved links.")
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=300, blank=True)
    icon = models.CharField(max_length=40, blank=True, help_text="Icon name the frontend knows.")
    order = models.PositiveSmallIntegerField(default=0, help_text="Lower numbers come first.")

    only_for_packages = models.ManyToManyField(
        "catalog.Package",
        blank=True,
        related_name="%(class)ss",
        verbose_name="only for packages",
        help_text="Leave empty to include it in every package.",
    )

    class Meta:
        ordering = ["order", "title"]
        permissions = [("publish_chapter", "Can publish and unpublish chapters")]

    def __str__(self) -> str:
        return self.title


class Subchapter(PublishableModel, TimestampedModel):
    """A section of a chapter, holding the material for one sitting of study."""

    chapter = models.ForeignKey(Chapter, on_delete=models.PROTECT, related_name="subchapters")
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    summary = models.CharField(max_length=300, blank=True)
    minutes = models.PositiveSmallIntegerField(default=5, help_text="Rough study time, shown to students.")
    # Counted from 1 within its own chapter, so renumbering one chapter never disturbs another.
    order = models.PositiveSmallIntegerField(default=0, help_text="Position within this chapter.")

    only_for_packages = models.ManyToManyField(
        "catalog.Package",
        blank=True,
        related_name="%(class)ss",
        verbose_name="only for packages",
        help_text="Leave empty to include it in every package.",
    )

    class Meta:
        ordering = ["chapter", "order", "title"]
        indexes = [models.Index(fields=["chapter", "order"])]
        permissions = [("publish_subchapter", "Can publish and unpublish subchapters")]

    def __str__(self) -> str:
        return self.title


class ContentType(models.TextChoices):
    """What kind of material a content item holds.

    The hierarchy does not change when a kind is added: the item carries its type, and the kinds
    beyond theory arrive with the work that can actually serve them.
    """

    THEORY = "theory", "Theory"
    VIDEO = "video", "Video"
    DOCUMENT = "document", "Document"
    QUESTION = "question", "Question"
    HAZARD = "hazard", "Hazard clip"


# The kinds staff can create today. The rest are part of the shape, not yet of the product, and
# publishing one is refused rather than quietly serving an empty item.
AVAILABLE_CONTENT_TYPES = (ContentType.THEORY, ContentType.QUESTION)


class LearningContent(PublishableModel, TimestampedModel):
    """One piece of material inside a subchapter."""

    subchapter = models.ForeignKey(Subchapter, on_delete=models.PROTECT, related_name="content")
    content_type = models.CharField(
        max_length=20,
        choices=ContentType.choices,
        default=ContentType.THEORY,
        help_text="What kind of material this is.",
    )
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    body_html = models.TextField("content", blank=True, help_text="Used by theory material.")
    question = models.ForeignKey(
        "learning.Question",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="used_in",
        help_text="Used by question material: which question from the bank to ask here.",
    )
    order = models.PositiveSmallIntegerField(default=0, help_text="Position within this subchapter.")

    only_for_packages = models.ManyToManyField(
        "catalog.Package",
        blank=True,
        related_name="%(class)ss",
        verbose_name="only for packages",
        help_text="Leave empty to include it in every package.",
    )

    class Meta:
        ordering = ["subchapter", "order", "title"]
        indexes = [models.Index(fields=["subchapter", "order"])]
        verbose_name = "learning content"
        verbose_name_plural = "learning content"
        permissions = [("publish_learningcontent", "Can publish and unpublish learning content")]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        # Cleaned here rather than in the form, so content written by an import or the shell is
        # as safe as content typed by staff.
        self.body_html = html.clean(self.body_html)
        super().save(*args, **kwargs)


class SignCategory(models.TextChoices):
    WARNING = "warning", "Warning"
    REGULATORY = "regulatory", "Regulatory"
    INFORMATION = "information", "Information"
    MOTORWAY = "motorway", "Motorway"


class Sign(TimestampedModel):
    """A road sign, stored as instructions for drawing it rather than as an image.

    A library rather than a place in the course: content refers to signs by code, and the frontend
    draws them from its own symbol set, so they stay sharp at any size and need no uploads.
    """

    code = models.SlugField(unique=True, help_text="How content refers to this sign, e.g. give-way.")
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=20, choices=SignCategory.choices)
    meaning = models.CharField(max_length=300)
    spec = models.JSONField(default=dict, help_text="Shape, colours and symbol. See the drawing rules.")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["category", "order", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class QuestionType(models.TextChoices):
    """How a question is answered.

    ``image`` is a single-answer question whose options are road signs rather than words, which
    the frontend lays out as pictures.
    """

    SINGLE = "single", "One answer"
    MULTI = "multi", "Several answers"
    IMAGE = "image", "Road sign answers"


class Question(PublishableModel, TimestampedModel):
    """A question in the bank.

    Questions live in one bank and are referred to wherever they are used — in a subchapter, in a
    practice exam, in a mock test — so the same question is never copied and an edit reaches every
    place at once.

    Which package a question belongs to follows from its chapter, so there is no separate gate
    here to fall out of step with the material it is testing.
    """

    key = models.SlugField(unique=True, help_text="How content and bookmarks refer to this question.")
    chapter = models.ForeignKey(
        Chapter,
        on_delete=models.PROTECT,
        related_name="questions",
        help_text="The area this question belongs to. Students practise and are scored by it.",
    )
    question_type = models.CharField("type", max_length=10, choices=QuestionType.choices, default=QuestionType.SINGLE)
    prompt = models.TextField(help_text="The question itself.")
    explanation = models.TextField(blank=True, help_text="Shown after answering.")
    media_sign = models.ForeignKey(
        Sign,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="questions",
        verbose_name="sign shown with the question",
    )
    learn_more = models.ForeignKey(
        Subchapter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        help_text="Where a student can go to read about this, offered after answering.",
    )

    class Meta:
        ordering = ["chapter", "key"]
        permissions = [("publish_question", "Can publish and unpublish questions")]

    def __str__(self) -> str:
        return self.prompt[:70]

    @property
    def correct_option_ids(self) -> list[str]:
        return [option.option_id for option in self.options.all() if option.is_correct]

    @property
    def pick(self) -> int:
        """How many answers a student marks, which is simply how many are right."""
        return len(self.correct_option_ids) or 1


class QuestionOption(TimestampedModel):
    """One answer a student can choose.

    Whether it is the right one is never serialised to students before they answer: the API builds
    their view of a question without this column.
    """

    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
    option_id = models.CharField(
        max_length=4,
        help_text="Short id the frontend sends back, such as a, b, c.",
    )
    text = models.CharField(max_length=300, blank=True)
    sign = models.ForeignKey(
        Sign,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="answer_options",
        help_text="For questions answered with road signs.",
    )
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["question", "order", "option_id"]
        constraints = [models.UniqueConstraint(fields=["question", "option_id"], name="unique_option_id_per_question")]

    def __str__(self) -> str:
        return f"{self.option_id}. {self.text or self.sign_id or ''}"


class ExamKind(models.TextChoices):
    PRACTICE = "practice", "Practice exam"
    MOCK = "mock", "Mock test"


class PracticeExam(PublishableModel, TimestampedModel):
    """A set of questions a student sits in one go.

    Questions are referred to, not copied, so the same question can appear in several exams and an
    edit reaches all of them.
    """

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    description = models.CharField(max_length=300, blank=True)
    kind = models.CharField(max_length=10, choices=ExamKind.choices, default=ExamKind.PRACTICE)

    time_limit_seconds = models.PositiveIntegerField(null=True, blank=True, help_text="Leave empty for no time limit.")
    pass_mark = models.PositiveSmallIntegerField(help_text="How many questions must be right to pass.")
    order = models.PositiveSmallIntegerField(default=0)

    questions = models.ManyToManyField(Question, through="learning.ExamQuestion", related_name="exams")

    class Meta:
        ordering = ["order", "title"]
        permissions = [("publish_practiceexam", "Can publish and unpublish exams")]

    def __str__(self) -> str:
        return self.title


class ExamQuestion(models.Model):
    """One question's place in an exam."""

    exam = models.ForeignKey(PracticeExam, on_delete=models.CASCADE, related_name="exam_questions")
    question = models.ForeignKey(Question, on_delete=models.PROTECT, related_name="exam_places")
    order = models.PositiveSmallIntegerField(default=0, help_text="Position within this exam.")

    class Meta:
        ordering = ["exam", "order"]
        constraints = [models.UniqueConstraint(fields=["exam", "question"], name="unique_question_per_exam")]

    def __str__(self) -> str:
        return f"{self.exam.title}: {self.question}"


# --- What a student has done ---------------------------------------------------------------------
#
# These are records of a person, not of the course, so they are never edited by staff. Each one is
# written by the endpoint the student was already calling, so the frontend needs no extra request
# to keep progress up to date. Streaks and mastery are worked out from these rather than stored,
# so a recount can never disagree with the attempts behind it.


class QuestionAttempt(TimestampedModel):
    """One answer a student gave. Kept per attempt, not per question.

    Keeping every attempt is what makes "questions I got wrong" and "questions I keep getting
    wrong" answerable later; a single row per question would lose that the moment they retried.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="question_attempts")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="attempts")
    was_correct = models.BooleanField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["student", "question"])]

    def __str__(self) -> str:
        return f"{self.student} · {self.question.key} · {'right' if self.was_correct else 'wrong'}"


class MockAttempt(TimestampedModel):
    """One sitting of an exam, with the score it earned.

    The score is stored rather than recomputed, because an exam's questions and pass mark can
    change afterwards and a past result should not move.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mock_attempts")
    exam = models.ForeignKey(PracticeExam, on_delete=models.CASCADE, related_name="attempts")
    score = models.PositiveSmallIntegerField()
    total = models.PositiveSmallIntegerField()
    passed = models.BooleanField()

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["student", "exam"])]

    def __str__(self) -> str:
        return f"{self.student} · {self.exam.title} · {self.score}/{self.total}"


class LessonProgress(models.Model):
    """That a student has finished a subchapter.

    One model covers both a lesson being completed and an e-book section being read, because the
    e-book is a chapter of subchapters like any other — so there is nothing to keep in step.
    """

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lesson_progress")
    subchapter = models.ForeignKey(Subchapter, on_delete=models.CASCADE, related_name="progress")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-completed_at"]
        constraints = [models.UniqueConstraint(fields=["student", "subchapter"], name="one_progress_row_per_lesson")]

    def __str__(self) -> str:
        return f"{self.student} · {self.subchapter.title}"


class SavedQuestion(models.Model):
    """A question a student put aside to come back to."""

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_questions")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="saved_by")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-saved_at"]
        constraints = [models.UniqueConstraint(fields=["student", "question"], name="one_saved_row_per_question")]

    def __str__(self) -> str:
        return f"{self.student} · {self.question.key}"

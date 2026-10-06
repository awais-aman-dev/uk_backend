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
AVAILABLE_CONTENT_TYPES = (ContentType.THEORY,)


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

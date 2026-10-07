"""The Learning screens.

Screens only: which material may be published, whether it is fit to publish, and who may see it
are decided in ``services.py`` and ``apps.entitlements``, so the same rules apply to the student
API.

The hierarchy is navigated the way staff think about it — a chapter lists its subchapters, a
subchapter lists its material — while each item is written on its own page, because a rich-text
editor inside a nested inline is unusable.
"""

from django import forms
from django.contrib import admin, messages
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404, render
from django.urls import URLPattern, path, reverse
from django.utils.html import format_html, format_html_join
from django.utils.safestring import SafeString, mark_safe
from django_ckeditor_5.widgets import CKEditor5Widget  # type: ignore[import-untyped]  # ships no types

from apps.core.models import PublishStatus
from apps.learning import services
from apps.learning.models import (
    AVAILABLE_CONTENT_TYPES,
    Chapter,
    ContentType,
    ExamQuestion,
    LearningContent,
    LessonProgress,
    MockAttempt,
    PracticeExam,
    Question,
    QuestionAttempt,
    QuestionOption,
    SavedQuestion,
    Sign,
    Subchapter,
)
from apps.staff.admin import badge, placeholder

STATUS_TONES = {PublishStatus.PUBLISHED: "success", PublishStatus.DRAFT: "neutral"}


class ContentForm(forms.ModelForm):
    """Writes the material in a rich-text editor.

    Whatever the editor produces is cleaned when the model is saved, so the toolbar is a
    convenience rather than the thing that keeps the content safe.
    """

    body_html = forms.CharField(
        label="Content",
        required=False,
        widget=CKEditor5Widget(config_name="default"),
    )

    class Meta:
        model = LearningContent
        # Listed rather than "__all__", so a field added later is not exposed by accident.
        # Status is not here: publishing goes through the service, not the form.
        fields = [
            "subchapter",
            "content_type",
            "title",
            "slug",
            "body_html",
            "question",
            "order",
            "only_for_packages",
            "publish_from",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only the kinds of material the product can serve today. The rest exist in the model so
        # the hierarchy does not change when they arrive.
        content_type = self.fields["content_type"]
        content_type.choices = [  # type: ignore[attr-defined]  # it is a ChoiceField here
            (value, label) for value, label in ContentType.choices if value in AVAILABLE_CONTENT_TYPES
        ]


class PublishableAdmin(admin.ModelAdmin):
    """Shared behaviour for anything students only see once it is published."""

    actions = ["publish_selected", "unpublish_selected"]

    @admin.display(description="Status", ordering="status")
    def state(self, obj) -> SafeString:
        if obj.is_published and not obj.is_live():
            return badge("Scheduled", "neutral")
        return badge(obj.get_status_display(), STATUS_TONES.get(obj.status, "neutral"))

    @admin.display(description="Ready to publish")
    def readiness(self, obj) -> SafeString:
        """Tells an editor what is still missing, rather than only refusing at publish time."""
        if obj.pk is None:
            return placeholder()
        problems = services.problems_with(obj)
        if not problems:
            return badge("Ready", "success")
        listed = format_html_join(mark_safe("<br>"), "&bull; {}", ((problem,) for problem in problems))
        return format_html("Not yet:<br>{}", listed)

    def has_publish_permission(self, request: HttpRequest) -> bool:
        return request.user.has_perm(f"{self.opts.app_label}.publish_{self.opts.model_name}")

    @admin.action(description="Publish the selected material")
    def publish_selected(self, request: HttpRequest, queryset) -> None:
        published = 0
        for instance in queryset:
            try:
                services.publish(actor=request.user, instance=instance)
                published += 1
            except services.NotReadyToPublishError as error:
                self.message_user(request, f"{instance}: {error}", level=messages.ERROR)
            except Exception:
                self.message_user(request, f"You may not publish {instance}.", level=messages.ERROR)
        if published:
            self.message_user(request, f"Published {published} item(s).", level=messages.SUCCESS)

    @admin.action(description="Take the selected material off the site")
    def unpublish_selected(self, request: HttpRequest, queryset) -> None:
        for instance in queryset:
            try:
                services.unpublish(actor=request.user, instance=instance)
            except Exception:
                self.message_user(request, f"You may not unpublish {instance}.", level=messages.ERROR)

    def get_actions(self, request: HttpRequest):
        """Hide the publish actions from staff who may not use them."""
        actions = super().get_actions(request)
        if not self.has_publish_permission(request):
            actions.pop("publish_selected", None)
            actions.pop("unpublish_selected", None)
        return actions


def _answer_sheet(instance) -> dict | None:
    """The answers to check, for a question or for a content item that asks one."""
    question = instance if isinstance(instance, Question) else getattr(instance, "question", None)
    return services.answer_sheet_for(question) if question else None


class PreviewMixin(admin.ModelAdmin):
    """Adds a page showing material as a student would see it.

    Declared on top of ModelAdmin, because it is only ever mixed into one and relies on its urls,
    permissions and model.
    """

    preview_template = "admin/learning/preview.html"

    def get_urls(self) -> list[URLPattern]:
        meta = self.model._meta
        preview = path(
            "<int:object_id>/preview/",
            self.admin_site.admin_view(self.preview_view),
            name=f"{meta.app_label}_{meta.model_name}_preview",
        )
        return [preview, *super().get_urls()]

    def preview_view(self, request: HttpRequest, object_id: int) -> HttpResponse:
        """Render the material for staff who may view it. Checked here, not just hidden in the UI."""
        if not self.has_view_permission(request):
            return HttpResponse("You may not preview this material.", status=403)

        instance = get_object_or_404(self.model, pk=object_id)
        return render(
            request,
            self.preview_template,
            {
                **self.admin_site.each_context(request),
                "title": f"Preview: {instance}",
                "instance": instance,
                "content": services.student_view_of(instance),
                "problems": services.problems_with(instance),
                # A question, or a content item that asks one; the template leaves the section
                # out for anything else.
                "answer_sheet": _answer_sheet(instance),
                "opts": self.model._meta,
            },
        )

    @admin.display(description="Preview")
    def preview_link(self, obj) -> SafeString:
        if obj.pk is None:
            return placeholder()
        meta = self.model._meta
        url = reverse(f"admin:{meta.app_label}_{meta.model_name}_preview", args=[obj.pk])
        return format_html('<a class="adm-btn" href="{}" target="_blank">See it as a student</a>', url)


# --- Inlines, for navigating the hierarchy -------------------------------------------------------


class ChildInline(admin.TabularInline):
    """Lists what sits under this record, for ordering and getting to it.

    Each child is written on its own page: a rich-text editor inside a nested inline is unusable,
    and the publishing and access settings would not fit either.
    """

    extra = 0
    show_change_link = True

    @admin.display(description="Status")
    def state(self, obj) -> SafeString:
        if obj.pk is None:
            return placeholder()
        if obj.is_published and not obj.is_live():
            return badge("Scheduled", "neutral")
        return badge(obj.get_status_display(), STATUS_TONES.get(obj.status, "neutral"))


class SubchapterInline(ChildInline):
    model = Subchapter
    fields = ["title", "order", "state"]
    readonly_fields = ["state"]
    ordering = ["order"]


class LearningContentInline(ChildInline):
    model = LearningContent
    fields = ["title", "content_type", "order", "state"]
    readonly_fields = ["state"]
    ordering = ["order"]
    verbose_name_plural = "Learning content"


# --- The screens ---------------------------------------------------------------------------------


@admin.register(Chapter)
class ChapterAdmin(PublishableAdmin):
    list_display = ["title", "order", "subchapter_count", "state"]
    list_editable = ["order"]
    list_filter = ["status"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [SubchapterInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "description", "icon", "order")}),
        (
            "Publishing",
            {
                "fields": ("status", "publish_from", "published_at", "published_by", "readiness"),
                "description": "Students see this only once it is published.",
            },
        ),
    )
    readonly_fields = ["status", "published_at", "published_by", "readiness"]

    @admin.display(description="Subchapters")
    def subchapter_count(self, chapter: Chapter) -> str:
        published = chapter.subchapters.filter(status=PublishStatus.PUBLISHED).count()
        return f"{published} published / {chapter.subchapters.count()} total"


@admin.register(Subchapter)
class SubchapterAdmin(PreviewMixin, PublishableAdmin):
    list_display = ["title", "chapter", "order", "content_count", "state"]
    list_editable = ["order"]
    list_filter = ["status", "chapter"]
    search_fields = ["title", "slug", "summary"]
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ["chapter"]
    autocomplete_fields = ["chapter"]
    inlines = [LearningContentInline]
    fieldsets = (
        (None, {"fields": ("chapter", "title", "slug", "summary", "minutes", "order")}),
        (
            "Publishing",
            {
                "fields": (
                    "status",
                    "publish_from",
                    "published_at",
                    "published_by",
                    "readiness",
                    "preview_link",
                )
            },
        ),
    )
    readonly_fields = ["status", "published_at", "published_by", "readiness", "preview_link"]

    @admin.display(description="Material")
    def content_count(self, subchapter: Subchapter) -> str:
        published = subchapter.content.filter(status=PublishStatus.PUBLISHED).count()
        return f"{published} published / {subchapter.content.count()} total"


@admin.register(LearningContent)
class LearningContentAdmin(PreviewMixin, PublishableAdmin):
    form = ContentForm
    list_display = ["title", "subchapter", "chapter", "content_type", "order", "state"]
    list_editable = ["order"]
    list_filter = ["status", "content_type", "subchapter__chapter"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ["subchapter", "subchapter__chapter"]
    autocomplete_fields = ["subchapter", "question"]
    filter_horizontal = ["only_for_packages"]
    fieldsets = (
        (None, {"fields": ("subchapter", "content_type", "title", "slug", "order")}),
        (
            "Content",
            {
                "fields": ("body_html", "question"),
                "description": "Theory material uses the text; question material uses the question.",
            },
        ),
        (
            "Access",
            {
                "fields": ("only_for_packages",),
                "description": "Who can see this. Leave empty for everyone with learning access.",
            },
        ),
        (
            "Publishing",
            {
                "fields": (
                    "status",
                    "publish_from",
                    "published_at",
                    "published_by",
                    "readiness",
                    "preview_link",
                )
            },
        ),
    )
    readonly_fields = ["status", "published_at", "published_by", "readiness", "preview_link"]

    @admin.display(description="Chapter", ordering="subchapter__chapter__order")
    def chapter(self, content: LearningContent) -> str:
        return content.subchapter.chapter.title


@admin.register(Sign)
class SignAdmin(admin.ModelAdmin):
    """Road signs. Stored as drawing instructions, so there is no image to upload."""

    list_display = ["name", "code", "category", "order"]
    list_editable = ["order"]
    list_filter = ["category"]
    search_fields = ["code", "name", "meaning"]
    prepopulated_fields = {"code": ("name",)}


class QuestionOptionInline(admin.TabularInline):
    """The answers to choose between, edited beside the question they belong to."""

    model = QuestionOption
    extra = 2
    fields = ["order", "option_id", "text", "sign", "is_correct"]
    ordering = ["order"]
    autocomplete_fields = ["sign"]


@admin.register(Question)
class QuestionAdmin(PreviewMixin, PublishableAdmin):
    """The question bank.

    One question, used wherever it is needed. Editing it reaches every exam and subchapter that
    refers to it, which is the point of a bank rather than copies.
    """

    list_display = ["prompt_preview", "key", "chapter", "question_type", "answer_summary", "state"]
    list_filter = ["status", "question_type", "chapter"]
    search_fields = ["key", "prompt", "explanation"]
    prepopulated_fields = {"key": ("prompt",)}
    list_select_related = ["chapter"]
    autocomplete_fields = ["chapter", "media_sign", "learn_more"]
    inlines = [QuestionOptionInline]
    fieldsets = (
        (None, {"fields": ("chapter", "key", "question_type", "prompt", "media_sign")}),
        (
            "After answering",
            {
                "fields": ("explanation", "learn_more"),
                "description": "Shown once the student has committed to an answer.",
            },
        ),
        (
            "Publishing",
            {"fields": ("status", "publish_from", "published_at", "published_by", "readiness", "preview_link")},
        ),
    )
    readonly_fields = ["status", "published_at", "published_by", "readiness", "preview_link"]

    @admin.display(description="Question", ordering="prompt")
    def prompt_preview(self, question: Question) -> str:
        return question.prompt[:70] + ("…" if len(question.prompt) > 70 else "")

    @admin.display(description="Answers")
    def answer_summary(self, question: Question) -> str:
        options = question.options.all()
        correct = sum(1 for option in options if option.is_correct)
        return f"{len(options)} options, {correct} correct"


class ExamQuestionInline(admin.TabularInline):
    """Which questions an exam asks, and in what order.

    The questions themselves are not edited here: an exam points at the bank, so changing a
    question in one exam would change it everywhere.
    """

    model = ExamQuestion
    extra = 1
    fields = ["order", "question"]
    ordering = ["order"]
    autocomplete_fields = ["question"]


@admin.register(PracticeExam)
class PracticeExamAdmin(PublishableAdmin):
    list_display = ["title", "kind", "question_count", "pass_mark", "order", "state"]
    list_editable = ["order"]
    list_filter = ["status", "kind"]
    search_fields = ["title", "slug", "description"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ExamQuestionInline]
    fieldsets = (
        (None, {"fields": ("title", "slug", "description", "kind", "order")}),
        (
            "Rules",
            {
                "fields": ("pass_mark", "time_limit_seconds"),
                "description": "How many answers must be right, and how long the student has.",
            },
        ),
        (
            "Publishing",
            {"fields": ("status", "publish_from", "published_at", "published_by", "readiness")},
        ),
    )
    readonly_fields = ["status", "published_at", "published_by", "readiness"]

    @admin.display(description="Questions")
    def question_count(self, exam: PracticeExam) -> int:
        return exam.questions.count()


# --- What students have done ---------------------------------------------------------------------
#
# Records of a person, not of the course, so they are read-only everywhere: staff look at them to
# answer "how is this student getting on", and nothing good comes of editing somebody's history.


class ReadOnlyAdmin(admin.ModelAdmin):
    """Shows records without offering a way to change them."""

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return False


@admin.register(QuestionAttempt)
class QuestionAttemptAdmin(ReadOnlyAdmin):
    list_display = ["student", "question", "was_correct", "created_at"]
    list_filter = ["was_correct", "question__chapter", "created_at"]
    search_fields = ["student__email", "question__key", "question__prompt"]
    list_select_related = ["student", "question"]
    date_hierarchy = "created_at"


@admin.register(MockAttempt)
class MockAttemptAdmin(ReadOnlyAdmin):
    list_display = ["student", "exam", "result", "passed", "created_at"]
    list_filter = ["passed", "exam", "created_at"]
    search_fields = ["student__email", "exam__title"]
    list_select_related = ["student", "exam"]
    date_hierarchy = "created_at"

    @admin.display(description="Score")
    def result(self, attempt: MockAttempt) -> str:
        return f"{attempt.score}/{attempt.total}"


@admin.register(LessonProgress)
class LessonProgressAdmin(ReadOnlyAdmin):
    list_display = ["student", "subchapter", "completed_at"]
    list_filter = ["subchapter__chapter", "completed_at"]
    search_fields = ["student__email", "subchapter__title"]
    list_select_related = ["student", "subchapter"]
    date_hierarchy = "completed_at"


@admin.register(SavedQuestion)
class SavedQuestionAdmin(ReadOnlyAdmin):
    list_display = ["student", "question", "saved_at"]
    search_fields = ["student__email", "question__key"]
    list_select_related = ["student", "question"]

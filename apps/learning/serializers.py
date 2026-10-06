"""The shapes the learning endpoints return, declared so Swagger can describe them.

These serializers are **documentation, not machinery**. The endpoints build their responses from
``services``, because what a student may see is decided by publishing state and package rather
than by field lists, and routing that through a serializer would hide the decision. So nothing
here is used to render a response — each one is named in an ``extend_schema`` so a developer
reading Swagger can see exactly what comes back.

Nothing enforces the match, so these have to be kept in step by hand: a key added to a response in
``api.py`` is added here too, and one removed is removed here.

Keys are camelCase where the endpoint returns camelCase: these describe the contract the frontend
already implements, not Python conventions.
"""

from drf_spectacular.utils import PolymorphicProxySerializer, extend_schema_field
from rest_framework import serializers

from apps.learning.models import QuestionType, SignCategory


class SignSerializer(serializers.Serializer):
    """A road sign, which the frontend draws rather than loading an image."""

    code = serializers.SlugField(help_text="How content and questions refer to this sign.")
    name = serializers.CharField()
    category = serializers.ChoiceField(choices=SignCategory.choices)
    meaning = serializers.CharField()
    spec = serializers.DictField(
        help_text="Drawing instructions — shape, colours and symbol. The keys depend on the shape."
    )


class SignMapField(serializers.DictField):
    """The signs a response mentions, keyed by sign code."""

    def __init__(self, **kwargs):
        kwargs.setdefault("child", SignSerializer())
        kwargs.setdefault(
            "help_text", "Every sign this response refers to, keyed by code, so no second request is needed."
        )
        super().__init__(**kwargs)


# --- Questions -----------------------------------------------------------------------------------


class QuestionMediaSerializer(serializers.Serializer):
    """What is shown alongside a question. Only road signs so far."""

    kind = serializers.ChoiceField(choices=[("sign", "sign")])
    code = serializers.SlugField(help_text="Look this up in the response's `signs` map.")


class QuestionOptionSerializer(serializers.Serializer):
    """One answer to choose between.

    Whether it is the right one is deliberately absent: the answer is not in the payload at all,
    so it cannot be read out of the page. Send the id to ``/api/learn/answer/`` to find out.
    """

    id = serializers.CharField(help_text="Send this back to answer, e.g. 'a'.")
    text = serializers.CharField(required=False, help_text="Absent on answers that are a sign rather than words.")
    sign = serializers.SlugField(required=False, help_text="Present when the answer is a road sign.")


class StudentQuestionSerializer(serializers.Serializer):
    """A question as a student is given it, before answering."""

    id = serializers.IntegerField(help_text="Send this as `questionId` when answering.")
    key = serializers.SlugField(help_text="How lesson blocks refer to this question.")
    topic = serializers.SlugField(help_text="The slug of the chapter it belongs to.")
    type = serializers.ChoiceField(choices=QuestionType.choices)
    prompt = serializers.CharField()
    media = QuestionMediaSerializer(allow_null=True)
    options = QuestionOptionSerializer(many=True)
    pick = serializers.IntegerField(help_text="How many answers the student should choose.")


class QuestionMapField(serializers.DictField):
    """The questions a response's check blocks name, keyed by question key."""

    def __init__(self, **kwargs):
        kwargs.setdefault("child", StudentQuestionSerializer())
        kwargs.setdefault("help_text", "The questions this content asks, keyed by the key its check blocks name.")
        super().__init__(**kwargs)


# --- Content blocks ------------------------------------------------------------------------------


class HtmlBlockSerializer(serializers.Serializer):
    """Material to read. The HTML was cleaned against an allowlist before it was stored."""

    type = serializers.ChoiceField(choices=[("html", "html")])
    title = serializers.CharField(help_text="Shown as a heading when the lesson has more than one block.")
    html = serializers.CharField()


class CheckBlockSerializer(serializers.Serializer):
    """A question to answer in the middle of a lesson."""

    type = serializers.ChoiceField(choices=[("check", "check")])
    title = serializers.CharField()
    questions = serializers.ListField(
        child=serializers.SlugField(),
        help_text="Question keys to look up in the response's `questions` map.",
    )


CONTENT_BLOCK = PolymorphicProxySerializer(
    component_name="ContentBlock",
    serializers={"html": HtmlBlockSerializer, "check": CheckBlockSerializer},
    resource_type_field_name="type",
)


@extend_schema_field(CONTENT_BLOCK)
class ContentBlockField(serializers.JSONField):
    """One block of a lesson, which the frontend renders according to its ``type``."""


class BlockListField(serializers.ListField):
    def __init__(self, **kwargs):
        kwargs.setdefault("child", ContentBlockField())
        kwargs.setdefault("help_text", "The material, in reading order.")
        super().__init__(**kwargs)


class LinkSerializer(serializers.Serializer):
    """Where "previous" and "next" go. Null at either end of a chapter."""

    slug = serializers.SlugField()
    title = serializers.CharField()


class ClipMapField(serializers.DictField):
    """Hazard clips, keyed by code.

    Always empty today: hazard perception is part of the shape the frontend expects, not yet of
    the product. The key is sent so the frontend needs no special case for its absence.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("help_text", "Always empty until hazard clips are part of the product.")
        super().__init__(**kwargs)


# --- Topics --------------------------------------------------------------------------------------


class LessonSummarySerializer(serializers.Serializer):
    """A lesson as it appears in the topic list: enough to show it, not to read it."""

    slug = serializers.SlugField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    minutes = serializers.IntegerField(help_text="Rough study time.")
    done = serializers.BooleanField(help_text="Always false until progress is recorded.")


class TopicSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    icon = serializers.CharField(allow_blank=True, help_text="An icon name the frontend knows.")
    mastery = serializers.IntegerField(help_text="Always 0 until progress is recorded.")
    questions = serializers.IntegerField(help_text="Always 0 until progress is recorded.")
    lessons = LessonSummarySerializer(many=True)


class TopicListResponseSerializer(serializers.Serializer):
    topics = TopicSerializer(many=True)


# --- A lesson ------------------------------------------------------------------------------------


class LessonSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    minutes = serializers.IntegerField()
    blocks = BlockListField()


class TopicRefSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    icon = serializers.CharField(allow_blank=True)


class LessonDetailResponseSerializer(serializers.Serializer):
    lesson = LessonSerializer()
    topic = TopicRefSerializer()
    done = serializers.BooleanField(help_text="Always false until progress is recorded.")
    prev = LinkSerializer(allow_null=True)
    next = LinkSerializer(allow_null=True)
    signs = SignMapField(
        help_text=(
            "Empty today: lesson material names signs in its HTML rather than as data, so there is "
            "nothing to resolve. The key is sent so the frontend needs no special case for it."
        )
    )
    questions = QuestionMapField()
    clips = ClipMapField()


# --- The e-book ----------------------------------------------------------------------------------


class EbookChapterSummarySerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    number = serializers.IntegerField(help_text="Its position in the book, counted from 1.")
    read = serializers.BooleanField(help_text="Always false until reading progress is recorded.")


class EbookListResponseSerializer(serializers.Serializer):
    chapters = EbookChapterSummarySerializer(many=True)
    current = serializers.SlugField(
        allow_null=True, help_text="Where the student left off. Always null until reading progress is recorded."
    )


class EbookChapterSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    summary = serializers.CharField(allow_blank=True)
    number = serializers.IntegerField()
    blocks = BlockListField()


class EbookTocEntrySerializer(serializers.Serializer):
    slug = serializers.SlugField()
    title = serializers.CharField()
    number = serializers.IntegerField()


class EbookChapterResponseSerializer(serializers.Serializer):
    chapter = EbookChapterSerializer()
    toc = EbookTocEntrySerializer(many=True, help_text="The whole book, so the reader can jump about.")
    prev = LinkSerializer(allow_null=True)
    next = LinkSerializer(allow_null=True)
    signs = SignMapField(help_text="Empty today, as on a lesson. The key is always present.")
    questions = QuestionMapField(
        help_text="Empty today: the e-book is read straight through, and its sections carry no check blocks."
    )
    clips = ClipMapField()


# --- Signs, practice and answering ---------------------------------------------------------------


class SignListResponseSerializer(serializers.Serializer):
    signs = SignSerializer(many=True)


class PracticeSetResponseSerializer(serializers.Serializer):
    questions = StudentQuestionSerializer(many=True)
    signs = SignMapField()
    saved = serializers.ListField(
        child=serializers.SlugField(),
        help_text="Keys of the questions this student has saved. Always empty until that is recorded.",
    )


class AnswerRequestSerializer(serializers.Serializer):
    """What to post to have an answer marked."""

    questionId = serializers.IntegerField(help_text="The question's `id` from the practice set.")  # noqa: N815
    selected = serializers.ListField(
        child=serializers.CharField(),
        help_text="The option ids the student chose, e.g. ['a']. Order does not matter.",
    )


class AnswerResponseSerializer(serializers.Serializer):
    """The marking, which only the server decides."""

    correct = serializers.BooleanField()
    correctIds = serializers.ListField(  # noqa: N815
        child=serializers.CharField(), help_text="The ids that were right, revealed now the student has answered."
    )
    explanation = serializers.CharField(allow_blank=True)
    lesson = LinkSerializer(allow_null=True, help_text="Where to read more about this, when there is somewhere.")

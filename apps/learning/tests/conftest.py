import pytest
from django.contrib.auth.models import Group

from apps.accounts.models import User
from apps.core.models import PublishStatus
from apps.learning.models import (
    Chapter,
    LearningContent,
    Question,
    QuestionOption,
    QuestionType,
    Sign,
    SignCategory,
    Subchapter,
)

PASSWORD = "Riverbank42"
CONTENT = "<p>Thinking distance plus braking distance.</p>"


def staff_member(email: str, role: str | None = None) -> User:
    user = User.objects.create_user(email=email, password=PASSWORD, first_name=email[:3], is_staff=True)
    if role:
        user.groups.add(Group.objects.get(name=role))
    return user


@pytest.fixture
def editor(db):
    """Writes material but may not release it."""
    return staff_member("editor@example.com", "Content Editor")


@pytest.fixture
def publisher(db):
    """Writes material and may release it."""
    return staff_member("publisher@example.com", "Content Publisher")


@pytest.fixture
def outsider(db):
    """Staff with no learning permissions at all."""
    return staff_member("outsider@example.com")


@pytest.fixture
def editor_client(client, editor):
    client.force_login(editor)
    return client


@pytest.fixture
def publisher_client(client, publisher):
    client.force_login(publisher)
    return client


@pytest.fixture
def chapter(db):
    return Chapter.objects.create(slug="road-signs", title="Road signs", order=1)


@pytest.fixture
def subchapter(chapter):
    return Subchapter.objects.create(chapter=chapter, slug="warning-signs", title="Warning signs", minutes=5, order=1)


@pytest.fixture
def content(subchapter):
    return LearningContent.objects.create(
        subchapter=subchapter, slug="what-they-mean", title="What they mean", body_html=CONTENT, order=1
    )


@pytest.fixture
def sign(db):
    return Sign.objects.create(
        code="give-way",
        name="Give way",
        category=SignCategory.REGULATORY,
        meaning="Give way to traffic on the major road.",
        spec={"shape": "inverted-triangle", "fill": "#fff", "symbol": "give-way"},
    )


@pytest.fixture
def make_question(chapter):
    """A question with four answers, the first of which is right unless told otherwise."""

    def build(key="distraction", question_type=QuestionType.SINGLE, correct=("a",), **fields):
        question = Question.objects.create(
            chapter=fields.pop("chapter", chapter),
            key=key,
            question_type=question_type,
            prompt=fields.pop("prompt", "Which of these could distract you while driving?"),
            **fields,
        )
        for order, option_id in enumerate(("a", "b", "c", "d"), start=1):
            QuestionOption.objects.create(
                question=question,
                option_id=option_id,
                text=f"Answer {option_id}",
                is_correct=option_id in correct,
                order=order,
            )
        return question

    return build


@pytest.fixture
def published_tree(chapter, subchapter, content, publisher):
    """A whole branch live, from the chapter down, which is the usual starting point.

    The parents are set published directly, because each level refuses to go live while its own
    parent is still a draft — the rule under test elsewhere.
    """
    from apps.learning import services

    chapter.status = PublishStatus.PUBLISHED
    chapter.save(update_fields=["status"])
    subchapter.status = PublishStatus.PUBLISHED
    subchapter.save(update_fields=["status"])

    services.publish(actor=publisher, instance=content)
    content.refresh_from_db()
    return chapter, subchapter, content

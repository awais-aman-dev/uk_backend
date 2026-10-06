"""The student endpoints.

The point of these tests is what a student is and is not served: drafts, scheduled material and
anything their package does not include must never appear, whatever the frontend asks for.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Order, OrderStatus
from apps.catalog.models import Package
from apps.core.models import PublishStatus
from apps.entitlements import services as entitlements
from apps.learning.models import Chapter, LearningContent, Subchapter

pytestmark = pytest.mark.django_db

TOPICS_URL = reverse("learn-topics")
SIGNS_URL = reverse("learn-signs")
EBOOK_URL = reverse("learn-ebook")


def lesson_url(slug: str) -> str:
    return reverse("learn-lesson", args=[slug])


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def packages(db):
    return {
        "starter": Package.objects.create(name="Starter", duration_days=7, price=Decimal("5.00")),
        "premium": Package.objects.create(name="Premium", duration_days=30, price=Decimal("15.00")),
    }


@pytest.fixture
def student(db, packages):
    """Somebody on the Starter package, with live access."""

    def buy(package_name="starter", paid_at=None):
        package = packages[package_name]
        user = User.objects.create_user(email=f"{package_name}@example.com", first_name="Sam")
        order = Order.objects.create(
            package=package,
            email=user.email,
            user=user,
            status=OrderStatus.PAID,
            paid_at=paid_at or timezone.now(),
            original_price=package.price,
            final_price=package.price,
        )
        entitlements.activate(order, user)
        return user

    return buy


@pytest.fixture
def live_tree(published_tree):
    """A published chapter, subchapter and one piece of material."""
    return published_tree


def sign_in(api, user):
    api.force_authenticate(user=user)
    return api


class TestTopics:
    def test_signed_out_visitors_are_refused(self, api):
        assert api.get(TOPICS_URL).status_code == 401

    def test_the_catalogue_is_readable_without_a_plan(self, api, live_tree, db):
        """Somebody deciding what to buy can see what is on offer, but not the material."""
        browsing = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        response = sign_in(api, browsing).get(TOPICS_URL)

        assert response.status_code == 200
        assert response.data["topics"][0]["slug"] == "road-signs"
        assert "blocks" not in response.data["topics"][0]

    def test_it_lists_the_lessons_in_each_topic(self, api, live_tree, student):
        chapter, subchapter, _ = live_tree

        response = sign_in(api, student()).get(TOPICS_URL)

        topic = response.data["topics"][0]
        assert topic["title"] == chapter.title
        assert [lesson["slug"] for lesson in topic["lessons"]] == [subchapter.slug]

    def test_draft_chapters_never_appear(self, api, live_tree, student):
        Chapter.objects.create(slug="draft-chapter", title="Draft chapter", order=2)

        response = sign_in(api, student()).get(TOPICS_URL)

        assert [topic["slug"] for topic in response.data["topics"]] == ["road-signs"]

    def test_a_chapter_scheduled_for_later_is_not_shown_yet(self, api, live_tree, student):
        chapter, _, _ = live_tree
        chapter.publish_from = timezone.now() + timedelta(days=1)
        chapter.save(update_fields=["publish_from"])

        response = sign_in(api, student()).get(TOPICS_URL)

        assert response.data["topics"] == []

    def test_a_chapter_for_another_package_is_not_shown(self, api, live_tree, student, packages):
        chapter, _, _ = live_tree
        chapter.only_for_packages.add(packages["premium"])

        response = sign_in(api, student("starter")).get(TOPICS_URL)

        assert response.data["topics"] == []

    def test_it_is_shown_to_somebody_on_that_package(self, api, live_tree, student, packages):
        chapter, _, _ = live_tree
        chapter.only_for_packages.add(packages["premium"])

        response = sign_in(api, student("premium")).get(TOPICS_URL)

        assert [topic["slug"] for topic in response.data["topics"]] == ["road-signs"]


class TestLesson:
    def test_a_student_reads_the_material(self, api, live_tree, student):
        _, subchapter, content = live_tree

        response = sign_in(api, student()).get(lesson_url(subchapter.slug))

        assert response.status_code == 200
        assert response.data["lesson"]["title"] == subchapter.title
        assert response.data["lesson"]["blocks"][0]["html"] == content.body_html

    def test_it_says_which_topic_the_lesson_belongs_to(self, api, live_tree, student):
        chapter, subchapter, _ = live_tree

        response = sign_in(api, student()).get(lesson_url(subchapter.slug))

        assert response.data["topic"]["slug"] == chapter.slug

    def test_somebody_without_a_plan_is_asked_to_buy_one(self, api, live_tree, db):
        """402 rather than 403: they are signed in, they just have nothing to read with."""
        _, subchapter, _ = live_tree
        browsing = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        response = sign_in(api, browsing).get(lesson_url(subchapter.slug))

        assert response.status_code == 402

    def test_a_lapsed_student_is_asked_to_buy_again(self, api, live_tree, student):
        _, subchapter, _ = live_tree
        lapsed = student(paid_at=timezone.now() - timedelta(days=60))

        response = sign_in(api, lapsed).get(lesson_url(subchapter.slug))

        assert response.status_code == 402

    def test_a_lesson_outside_the_package_answers_the_same_way_as_a_missing_one(
        self, api, live_tree, student, packages
    ):
        """So the endpoint cannot be used to map out what the dearer packages contain."""
        _, subchapter, _ = live_tree
        subchapter.only_for_packages.add(packages["premium"])

        response = sign_in(api, student("starter")).get(lesson_url(subchapter.slug))

        assert response.status_code == 402

    def test_a_draft_lesson_is_not_found(self, api, live_tree, student, subchapter):
        subchapter.status = PublishStatus.DRAFT
        subchapter.save(update_fields=["status"])

        response = sign_in(api, student()).get(lesson_url(subchapter.slug))

        assert response.status_code == 404

    def test_an_unknown_lesson_is_not_found(self, api, student):
        assert sign_in(api, student()).get(lesson_url("no-such-lesson")).status_code == 404

    def test_draft_material_inside_a_live_lesson_is_left_out(self, api, live_tree, student, subchapter):
        LearningContent.objects.create(
            subchapter=subchapter, slug="draft-piece", title="Draft piece", body_html="<p>Later.</p>"
        )

        response = sign_in(api, student()).get(lesson_url(subchapter.slug))

        assert len(response.data["lesson"]["blocks"]) == 1

    def test_material_limited_to_another_package_is_left_out(
        self, api, live_tree, student, packages, subchapter, publisher
    ):
        """The lesson still opens; the part they did not buy simply is not in it."""
        from apps.learning import services

        extra = LearningContent.objects.create(
            subchapter=subchapter, slug="premium-extra", title="Premium extra", body_html="<p>Extra.</p>", order=2
        )
        services.publish(actor=publisher, instance=extra)
        extra.only_for_packages.add(packages["premium"])

        response = sign_in(api, student("starter")).get(lesson_url(subchapter.slug))

        titles = [block["title"] for block in response.data["lesson"]["blocks"]]
        assert "Premium extra" not in titles
        assert len(titles) == 1

    def test_neighbouring_lessons_are_offered(self, api, live_tree, student, chapter, publisher):
        from apps.learning import services

        second = Subchapter.objects.create(
            chapter=chapter, slug="order-signs", title="Signs that give orders", order=2
        )
        LearningContent.objects.create(
            subchapter=second,
            slug="orders",
            title="Orders",
            body_html="<p>Circles.</p>",
            status=PublishStatus.PUBLISHED,
        )
        services.publish(actor=publisher, instance=second)

        response = sign_in(api, student()).get(lesson_url("warning-signs"))

        assert response.data["next"]["slug"] == "order-signs"
        assert response.data["prev"] is None


class TestEbook:
    def test_the_highway_code_reads_from_the_same_hierarchy(self, api, student, publisher):
        """No separate e-book structure: it is a chapter whose subchapters are its sections."""
        from apps.learning import services

        book = Chapter.objects.create(slug="highway-code", title="The Highway Code", order=9)
        section = Subchapter.objects.create(
            chapter=book, slug="hierarchy", title="The hierarchy of road users", order=1
        )
        LearningContent.objects.create(
            subchapter=section,
            slug="who",
            title="Who",
            body_html="<p>Rule H1.</p>",
            status=PublishStatus.PUBLISHED,
        )
        book.status = PublishStatus.PUBLISHED
        book.save(update_fields=["status"])
        services.publish(actor=publisher, instance=section)

        reader = sign_in(api, student())
        listing = reader.get(EBOOK_URL)
        chapter_page = reader.get(reverse("learn-ebook-chapter", args=["hierarchy"]))

        assert [item["title"] for item in listing.data["chapters"]] == ["The hierarchy of road users"]
        assert listing.data["chapters"][0]["number"] == 1
        assert chapter_page.data["chapter"]["blocks"][0]["html"] == "<p>Rule H1.</p>"
        assert [item["slug"] for item in chapter_page.data["toc"]] == ["hierarchy"]

    def test_an_empty_shelf_is_not_an_error(self, api, student):
        response = sign_in(api, student()).get(EBOOK_URL)

        assert response.status_code == 200
        assert response.data["chapters"] == []


class TestSigns:
    def test_a_student_gets_the_sign_library(self, api, student, sign):
        response = sign_in(api, student()).get(SIGNS_URL)

        assert response.status_code == 200
        assert response.data["signs"][0]["code"] == "give-way"
        assert response.data["signs"][0]["spec"]["shape"] == "inverted-triangle"

    def test_somebody_without_a_plan_is_asked_to_buy_one(self, api, sign, db):
        browsing = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        assert sign_in(api, browsing).get(SIGNS_URL).status_code == 402

    def test_signed_out_visitors_are_refused(self, api, sign):
        assert api.get(SIGNS_URL).status_code == 401

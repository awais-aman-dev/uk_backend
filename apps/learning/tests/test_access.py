"""Who may see which material.

Two separate questions: does this person have learning access at all (their subscription), and is
this particular material limited to packages they did not buy. The first already existed; this
covers the second and how they combine.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.billing.models import Order, OrderStatus
from apps.catalog.models import Package
from apps.entitlements import services as entitlements
from apps.learning.models import LearningContent

pytestmark = pytest.mark.django_db


@pytest.fixture
def packages(db):
    return {
        "starter": Package.objects.create(name="Starter", duration_days=7, price=Decimal("5.00")),
        "premium": Package.objects.create(name="Premium", duration_days=30, price=Decimal("15.00")),
    }


@pytest.fixture
def buyer(db):
    def buy(package, paid_at=None):
        user = User.objects.create_user(email=f"{package.slug}@example.com", first_name="Bea")
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


class TestMaterialOpenToEveryone:
    def test_a_customer_with_access_can_see_it(self, content, packages, buyer):
        """Material with no packages listed is part of every package."""
        student = buyer(packages["starter"])

        assert entitlements.can_view(student, content) is True

    def test_someone_who_has_bought_nothing_cannot(self, content, db):
        nobody = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        assert entitlements.can_view(nobody, content) is False

    def test_a_customer_whose_access_ran_out_cannot(self, content, packages, buyer):
        lapsed = buyer(packages["starter"], paid_at=timezone.now() - timedelta(days=60))

        assert entitlements.can_view(lapsed, content) is False


class TestMaterialLimitedToPackages:
    def test_a_customer_on_the_listed_package_can_see_it(self, content, packages, buyer):
        content.only_for_packages.add(packages["premium"])
        student = buyer(packages["premium"])

        assert entitlements.can_view(student, content) is True

    def test_a_customer_on_another_package_cannot(self, content, packages, buyer):
        """The whole point of limiting material: a cheaper package does not include it."""
        content.only_for_packages.add(packages["premium"])
        student = buyer(packages["starter"])

        assert entitlements.can_view(student, content) is False

    def test_any_of_several_listed_packages_will_do(self, content, packages, buyer):
        content.only_for_packages.add(packages["premium"], packages["starter"])
        student = buyer(packages["starter"])

        assert entitlements.can_view(student, content) is True

    def test_a_lapsed_customer_on_the_right_package_still_cannot(self, content, packages, buyer):
        """Owning the right package is not enough; access has to be live."""
        content.only_for_packages.add(packages["premium"])
        lapsed = buyer(packages["premium"], paid_at=timezone.now() - timedelta(days=60))

        assert entitlements.can_view(lapsed, content) is False


class TestFilteringLists:
    def test_a_list_shows_open_material_and_what_the_package_includes(self, subchapter, content, packages, buyer):
        premium_only = LearningContent.objects.create(
            subchapter=subchapter, slug="premium-only", title="Premium only", body_html="<p>Extra.</p>"
        )
        premium_only.only_for_packages.add(packages["premium"])

        student = buyer(packages["premium"])
        visible = entitlements.visible_content(student, LearningContent.objects.all())

        assert set(visible) == {content, premium_only}

    def test_material_for_another_package_is_left_out(self, subchapter, content, packages, buyer):
        premium_only = LearningContent.objects.create(
            subchapter=subchapter, slug="premium-only", title="Premium only", body_html="<p>Extra.</p>"
        )
        premium_only.only_for_packages.add(packages["premium"])

        student = buyer(packages["starter"])
        visible = entitlements.visible_content(student, LearningContent.objects.all())

        assert set(visible) == {content}

    def test_someone_without_access_sees_nothing(self, content, db):
        nobody = User.objects.create_user(email="browsing@example.com", first_name="Bo")

        assert list(entitlements.visible_content(nobody, LearningContent.objects.all())) == []

    def test_each_item_appears_once_however_many_packages_list_it(self, content, packages, buyer):
        """Joining through the package table would otherwise repeat rows."""
        content.only_for_packages.add(packages["premium"], packages["starter"])
        student = buyer(packages["premium"])

        visible = entitlements.visible_content(student, LearningContent.objects.all())

        assert len(list(visible)) == 1

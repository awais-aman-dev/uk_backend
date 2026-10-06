"""The package catalogue: the model, and GET /api/packages/"""

from decimal import Decimal

import pytest
from django.db.models import ProtectedError
from django.urls import reverse

from apps.billing.models import Order
from apps.catalog.models import Package

pytestmark = pytest.mark.django_db

LIST_URL = reverse("package-list")


def make_package(name="30 day access", price="29.99", **fields):
    return Package.objects.create(
        name=name,
        duration_days=fields.pop("duration_days", 30),
        price=Decimal(price),
        **fields,
    )


class TestModel:
    def test_slug_is_made_from_the_name(self):
        assert make_package(name="90 Day Access").slug == "90-day-access"

    def test_a_given_slug_is_kept(self):
        assert make_package(slug="custom-slug").slug == "custom-slug"

    def test_slug_is_not_rewritten_on_later_saves(self):
        package = make_package(name="30 day access")

        package.name = "Renamed"
        package.save()

        assert package.slug == "30-day-access"

    def test_a_sold_package_cannot_be_deleted(self):
        """Deleting it would take the price and duration off existing orders."""
        package = make_package()
        Order.objects.create(
            package=package,
            email="buyer@example.com",
            original_price=package.price,
            final_price=package.price,
        )

        with pytest.raises(ProtectedError):
            package.delete()

    def test_materials_default_to_an_empty_list(self):
        assert make_package().materials == []


class TestList:
    def test_returns_the_documented_fields(self, api):
        make_package(description="Everything you need", materials=["Theory", "Mock tests"])

        response = api.get(LIST_URL)

        assert response.status_code == 200
        assert set(response.data[0]) == {
            "id",
            "name",
            "slug",
            "description",
            "duration_days",
            "price",
            "is_featured",
            "materials",
            "display_order",
        }

    def test_price_keeps_its_pence(self, api):
        make_package(price="29.99")

        assert api.get(LIST_URL).data[0]["price"] == "29.99"

    def test_inactive_packages_are_hidden(self, api):
        make_package(name="On sale")
        make_package(name="Withdrawn", is_active=False)

        names = [package["name"] for package in api.get(LIST_URL).data]

        assert names == ["On sale"]

    def test_ordered_by_display_order_then_price(self, api):
        make_package(name="Third", price="9.99", display_order=2)
        make_package(name="Second", price="19.99", display_order=1)
        make_package(name="First", price="14.99", display_order=1)

        names = [package["name"] for package in api.get(LIST_URL).data]

        assert names == ["First", "Second", "Third"]

    def test_is_not_paginated(self, api):
        make_package()

        assert isinstance(api.get(LIST_URL).data, list)

    def test_needs_no_sign_in(self, api):
        assert api.get(LIST_URL).status_code == 200


class TestDetail:
    def test_returns_the_package(self, api):
        make_package(name="60 day access")

        response = api.get(reverse("package-detail", args=["60-day-access"]))

        assert response.status_code == 200
        assert response.data["name"] == "60 day access"

    def test_unknown_slug_returns_404(self, api):
        response = api.get(reverse("package-detail", args=["does-not-exist"]))

        assert response.status_code == 404
        assert response.data["detail"] == "Package not found."

    def test_inactive_package_returns_404(self, api):
        make_package(name="Withdrawn", is_active=False)

        response = api.get(reverse("package-detail", args=["withdrawn"]))

        assert response.status_code == 404

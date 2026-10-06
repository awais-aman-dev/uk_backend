from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.billing.models import Order, OrderStatus
from apps.catalog.models import Package

PASSWORD = "Riverbank42"


@pytest.fixture(autouse=True)
def clear_cache():
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="student@example.com", password=PASSWORD, first_name="Sam")


@pytest.fixture
def package(db):
    return Package.objects.create(name="30 day access", duration_days=30, price=Decimal("29.99"))


@pytest.fixture
def make_paid_order(package):
    """A paid order, the thing access is granted from."""
    from django.utils import timezone

    def factory(email="student@example.com", paid_at=None, **fields):
        return Order.objects.create(
            package=fields.pop("package", package),
            email=email,
            first_name=fields.pop("first_name", "Sam"),
            status=OrderStatus.PAID,
            paid_at=paid_at or timezone.now(),
            original_price=package.price,
            final_price=package.price,
            **fields,
        )

    return factory

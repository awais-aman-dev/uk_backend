import pytest
from rest_framework.test import APIClient

from apps.accounts.models import AuthMethod, User

PASSWORD = "Riverbank42"


@pytest.fixture(autouse=True)
def clear_cache():
    """Throttle counters and login lockouts live in the cache and would leak between tests."""
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
def google_user(db):
    """An account created by Google sign-in, so it has no usable password."""
    return User.objects.create_user(
        email="google@example.com",
        first_name="Georgie",
        auth_method=AuthMethod.GOOGLE,
        google_id="google-sub-123",
        email_verified=True,
    )


@pytest.fixture
def authenticated_api(api, user):
    api.force_authenticate(user=user)
    return api

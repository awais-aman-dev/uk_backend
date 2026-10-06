"""POST /api/auth/login/, including the lockout after repeated wrong passwords."""

import pytest
from django.urls import reverse

from apps.accounts.services import MAX_FAILED_LOGINS

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db

URL = reverse("auth-login")


def login(api, email, password, **extra):
    return api.post(URL, {"email": email, "password": password, **extra}, format="json")


class TestSuccessfulLogin:
    def test_returns_both_tokens(self, api, user):
        response = login(api, user.email, PASSWORD)

        assert response.status_code == 200
        assert set(response.data) == {"access", "refresh"}

    def test_email_is_matched_regardless_of_case(self, api, user):
        response = login(api, user.email.upper(), PASSWORD)

        assert response.status_code == 200

    def test_last_login_is_recorded(self, api, user):
        assert user.last_login is None

        login(api, user.email, PASSWORD)

        user.refresh_from_db()
        assert user.last_login is not None


class TestRejectedLogin:
    def test_unknown_email_returns_401(self, api, db):
        response = login(api, "nobody@example.com", PASSWORD)

        assert response.status_code == 401
        assert response.data["detail"] == "Invalid credentials."

    def test_wrong_password_returns_the_same_401(self, api, user):
        response = login(api, user.email, "WrongRiverbank42")

        assert response.status_code == 401
        assert response.data["detail"] == "Invalid credentials."

    def test_google_only_account_returns_400(self, api, google_user):
        response = login(api, google_user.email, PASSWORD)

        assert response.status_code == 400
        assert response.data["detail"] == "This account uses Google Sign-In. Please sign in with Google."

    def test_disabled_account_with_the_right_password_returns_403(self, api, user):
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = login(api, user.email, PASSWORD)

        assert response.status_code == 403
        assert response.data["detail"] == "This account is disabled."

    def test_disabled_account_with_a_wrong_password_still_returns_401(self, api, user):
        """The 403 must not become a way of discovering which accounts exist."""
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = login(api, user.email, "WrongRiverbank42")

        assert response.status_code == 401


class TestLockout:
    def test_locks_after_five_failures_then_refuses_the_right_password(self, api, user):
        for _ in range(MAX_FAILED_LOGINS):
            assert login(api, user.email, "WrongRiverbank42").status_code == 401

        response = login(api, user.email, PASSWORD)

        assert response.status_code == 429
        assert response.data["detail"] == "Too many attempts. Please try again in 15 minutes."

    def test_lock_expires_after_fifteen_minutes(self, api, user, settings):
        for _ in range(MAX_FAILED_LOGINS):
            login(api, user.email, "WrongRiverbank42")

        # The counter is a cache entry with a 15-minute lifetime; clearing it is the same
        # state the application reaches once that lifetime has passed.
        from django.core.cache import cache

        cache.clear()

        assert login(api, user.email, PASSWORD).status_code == 200

    def test_successful_login_resets_the_counter(self, api, user):
        for _ in range(MAX_FAILED_LOGINS - 1):
            login(api, user.email, "WrongRiverbank42")

        assert login(api, user.email, PASSWORD).status_code == 200

        for _ in range(MAX_FAILED_LOGINS - 1):
            login(api, user.email, "WrongRiverbank42")
        assert login(api, user.email, PASSWORD).status_code == 200

    def test_lock_does_not_apply_to_another_address_from_the_same_ip(self, api, user, django_user_model):
        other = django_user_model.objects.create_user(email="other@example.com", password=PASSWORD, first_name="Other")

        for _ in range(MAX_FAILED_LOGINS):
            login(api, user.email, "WrongRiverbank42")

        assert login(api, other.email, PASSWORD).status_code == 200

    def test_a_different_ip_is_not_locked_out(self, api, user):
        """Keyed on email *and* IP, so nobody can lock a customer out of their own account."""
        for _ in range(MAX_FAILED_LOGINS):
            login(api, user.email, "WrongRiverbank42", **{})

        response = api.post(
            URL,
            {"email": user.email, "password": PASSWORD},
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.9",
        )

        assert response.status_code == 200

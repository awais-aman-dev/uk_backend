"""GET /api/auth/email/verify/ and POST /api/auth/email/verify/resend/"""

from datetime import timedelta

import pytest
from django.core import mail
from django.urls import reverse

from apps.accounts.models import SecurityToken, TokenPurpose

pytestmark = pytest.mark.django_db

VERIFY_URL = reverse("auth-email-verify")
RESEND_URL = reverse("auth-email-verify-resend")


@pytest.fixture
def verification_token(user):
    return SecurityToken.objects.issue(TokenPurpose.EMAIL_VERIFICATION, user, timedelta(hours=24))


class TestVerify:
    def test_valid_link_marks_the_address_verified(self, api, user, verification_token):
        response = api.get(VERIFY_URL, {"token": verification_token})

        assert response.status_code == 200
        assert response.data["detail"] == "Email confirmed successfully."
        user.refresh_from_db()
        assert user.email_verified is True

    def test_link_cannot_be_used_twice(self, api, verification_token):
        api.get(VERIFY_URL, {"token": verification_token})

        response = api.get(VERIFY_URL, {"token": verification_token})

        assert response.status_code == 400
        assert response.data["detail"] == "Invalid or expired verification link."

    def test_expired_link_is_refused(self, api, user):
        expired = SecurityToken.objects.issue(TokenPurpose.EMAIL_VERIFICATION, user, timedelta(hours=-1))

        response = api.get(VERIFY_URL, {"token": expired})

        assert response.status_code == 400
        user.refresh_from_db()
        assert user.email_verified is False

    def test_unknown_token_is_refused(self, api, db):
        response = api.get(VERIFY_URL, {"token": "made-up"})

        assert response.status_code == 400

    def test_missing_token_returns_400(self, api, db):
        response = api.get(VERIFY_URL)

        assert response.status_code == 400
        assert response.data["detail"] == "Token required."

    def test_a_password_reset_token_cannot_verify_an_email(self, api, user):
        """Tokens are bound to one purpose, so links cannot be swapped between flows."""
        reset_token = SecurityToken.objects.issue(TokenPurpose.PASSWORD_RESET, user, timedelta(hours=1))

        response = api.get(VERIFY_URL, {"token": reset_token})

        assert response.status_code == 400
        user.refresh_from_db()
        assert user.email_verified is False


class TestResend:
    def test_sends_a_new_link(self, authenticated_api, user):
        response = authenticated_api.post(RESEND_URL)

        assert response.status_code == 200
        assert response.data["detail"] == "Verification email sent."
        assert len(mail.outbox) == 1
        assert mail.outbox[0].subject == "Please confirm your email address"

    def test_does_nothing_when_already_verified(self, authenticated_api, user):
        user.email_verified = True
        user.save(update_fields=["email_verified"])

        response = authenticated_api.post(RESEND_URL)

        assert response.status_code == 200
        assert response.data["detail"] == "Email already verified."
        assert mail.outbox == []

    def test_reports_a_mail_failure(self, authenticated_api, monkeypatch):
        def explode(*args, **kwargs):
            raise OSError("mail server down")

        monkeypatch.setattr("apps.core.email.EmailMultiAlternatives.send", explode)

        response = authenticated_api.post(RESEND_URL)

        assert response.status_code == 500
        assert response.data["detail"] == "Failed to send email. Please try again later."

    def test_requires_authentication(self, api):
        response = api.post(RESEND_URL)

        assert response.status_code == 401

    def test_sixth_request_in_an_hour_is_throttled(self, authenticated_api):
        for _ in range(5):
            assert authenticated_api.post(RESEND_URL).status_code == 200

        response = authenticated_api.post(RESEND_URL)

        assert response.status_code == 429

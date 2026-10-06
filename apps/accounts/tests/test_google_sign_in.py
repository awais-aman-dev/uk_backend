"""POST /api/auth/google/ and /api/auth/google/link/

Google's own verification is replaced with a fake, so these tests cover our rules: which account
a verified token signs into, and what cannot be done with one. Verification itself is covered in
test_google_identity.py.
"""

import pytest
from django.urls import reverse

from apps.accounts.models import AuthMethod, User
from apps.integrations.google_identity import GoogleIdentity, InvalidGoogleTokenError

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db

SIGN_IN_URL = reverse("auth-google")
LINK_URL = reverse("auth-google-link")
LOGIN_URL = reverse("auth-login")


def identity(email="new.google@example.com", subject="google-sub-new", first_name="Gina"):
    return GoogleIdentity(subject=subject, email=email, first_name=first_name)


@pytest.fixture
def google_token(monkeypatch):
    """Make `verify` return whatever identity a test asks for, as a real token would."""

    def set_identity(value):
        def fake_verify(raw_id_token):
            if isinstance(value, Exception):
                raise value
            return value

        monkeypatch.setattr("apps.integrations.google_identity.verify", fake_verify)

    return set_identity


def sign_in(api, **payload):
    return api.post(SIGN_IN_URL, {"id_token": "a-google-id-token", **payload}, format="json")


class TestNewAccount:
    def test_creates_a_verified_google_account(self, api, google_token):
        google_token(identity())

        response = sign_in(api)

        assert response.status_code == 201
        assert response.data["created"] is True
        assert set(response.data) == {"access", "refresh", "created"}
        user = User.objects.get(email="new.google@example.com")
        assert user.auth_method == AuthMethod.GOOGLE
        assert user.email_verified is True
        assert user.google_id == "google-sub-new"
        assert user.has_usable_password() is False

    def test_takes_the_first_name_from_google(self, api, google_token):
        google_token(identity(first_name="Gina"))

        sign_in(api)

        assert User.objects.get(email="new.google@example.com").first_name == "Gina"


class TestReturningAccount:
    def test_recognised_by_google_account_id(self, api, google_token, google_user):
        google_token(identity(email=google_user.email, subject=google_user.google_id))

        response = sign_in(api)

        assert response.status_code == 200
        assert response.data["created"] is False

    def test_recognised_even_if_the_google_email_changed(self, api, google_token, google_user):
        """The account id is permanent; the address on the Google account is not."""
        google_token(identity(email="renamed@example.com", subject=google_user.google_id))

        response = sign_in(api)

        assert response.status_code == 200
        google_user.refresh_from_db()
        assert google_user.email == "google@example.com"

    def test_email_is_matched_regardless_of_case(self, api, google_token, google_user):
        google_token(identity(email=google_user.email.upper(), subject=google_user.google_id))

        assert sign_in(api).status_code == 200

    def test_disabled_account_is_refused(self, api, google_token, google_user):
        google_user.is_active = False
        google_user.save(update_fields=["is_active"])
        google_token(identity(email=google_user.email, subject=google_user.google_id))

        response = sign_in(api)

        assert response.status_code == 403
        assert response.data["detail"] == "This account is disabled."


class TestPasswordAccount:
    def test_asks_the_user_to_link_instead_of_signing_them_in(self, api, google_token, user):
        google_token(identity(email=user.email, subject="google-sub-stranger"))

        response = sign_in(api)

        assert response.status_code == 409
        assert response.data["action"] == "link_google"
        assert "access" not in response.data

    def test_does_not_claim_the_account(self, api, google_token, user):
        google_token(identity(email=user.email, subject="google-sub-stranger"))

        sign_in(api)

        user.refresh_from_db()
        assert user.google_id is None

    def test_account_linked_to_a_different_google_account_is_refused(self, api, google_token, google_user):
        google_token(identity(email=google_user.email, subject="google-sub-someone-else"))

        response = sign_in(api)

        assert response.status_code == 409
        google_user.refresh_from_db()
        assert google_user.google_id == "google-sub-123"

    def test_account_with_no_password_is_adopted(self, api, google_token):
        """An account created by a purchase has no password, so Google sign-in is its only way in."""
        provisioned = User.objects.create_user(email="buyer@example.com", first_name="")

        google_token(identity(email=provisioned.email, subject="google-sub-buyer"))
        response = sign_in(api)

        assert response.status_code == 200
        provisioned.refresh_from_db()
        assert provisioned.google_id == "google-sub-buyer"
        assert provisioned.email_verified is True


class TestTokenRejected:
    def test_unusable_token_returns_401(self, api, google_token):
        google_token(InvalidGoogleTokenError("bad signature"))

        response = sign_in(api)

        assert response.status_code == 401
        assert response.data["detail"] == "Invalid Google token."
        assert User.objects.count() == 0

    def test_id_token_is_required(self, api):
        response = api.post(SIGN_IN_URL, {}, format="json")

        assert response.status_code == 400
        assert "id_token" in response.data


class TestOrderEmailCannotTakeOverAnAccount:
    """Regression tests for the account-takeover defect in the current product.

    It trusted an `order_email` sent by the client and signed that account in, so anyone holding
    any valid Google token could obtain tokens for another person's account.
    """

    def test_google_account_cannot_be_claimed_through_order_email(self, api, google_token, google_user):
        google_token(identity(email="attacker@example.com", subject="google-sub-attacker"))

        response = sign_in(api, order_email=google_user.email)

        # A new account for the attacker's own verified address, never the victim's.
        assert response.status_code == 201
        assert User.objects.get(google_id="google-sub-attacker").email == "attacker@example.com"
        google_user.refresh_from_db()
        assert google_user.google_id == "google-sub-123"

    def test_password_account_cannot_be_claimed_through_order_email(self, api, google_token, user):
        google_token(identity(email="attacker@example.com", subject="google-sub-attacker"))

        sign_in(api, order_email=user.email)

        user.refresh_from_db()
        assert user.google_id is None
        assert user.check_password(PASSWORD)

    def test_no_account_is_pre_claimed_for_someone_else(self, api, google_token):
        """It also must not create an account for an address the caller has not proved they own."""
        google_token(identity(email="attacker@example.com", subject="google-sub-attacker"))

        sign_in(api, order_email="future.customer@example.com")

        assert User.objects.filter(email="future.customer@example.com").exists() is False


class TestLink:
    def test_links_and_then_signs_in_as_the_same_user(self, api, authenticated_api, google_token, user):
        google_token(identity(email=user.email, subject="google-sub-linked"))

        response = authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 200
        assert response.data["detail"] == "Google account linked successfully."
        user.refresh_from_db()
        assert user.google_id == "google-sub-linked"

        signed_in = sign_in(api)
        assert signed_in.status_code == 200
        assert signed_in.data["created"] is False

    def test_second_link_is_refused(self, authenticated_api, google_token, user):
        google_token(identity(email=user.email, subject="google-sub-linked"))
        authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        response = authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 400
        assert response.data["detail"] == "Google account is already linked."

    def test_google_account_owned_by_someone_else_is_refused(self, authenticated_api, google_token, user, google_user):
        google_token(identity(email=user.email, subject=google_user.google_id))

        response = authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 409
        user.refresh_from_db()
        assert user.google_id is None

    def test_a_different_google_address_is_allowed(self, authenticated_api, google_token, user):
        """People commonly have a different address on their Google account; they asked for this."""
        google_token(identity(email="other.address@example.com", subject="google-sub-linked"))

        response = authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 200
        user.refresh_from_db()
        assert user.email == "student@example.com"

    def test_linking_keeps_the_password_working(self, api, authenticated_api, google_token, user):
        google_token(identity(email=user.email, subject="google-sub-linked"))

        authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        response = api.post(LOGIN_URL, {"email": user.email, "password": PASSWORD}, format="json")
        assert response.status_code == 200

    def test_requires_authentication(self, api, google_token):
        google_token(identity())

        response = api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 401

    def test_invalid_token_returns_401(self, authenticated_api, google_token):
        google_token(InvalidGoogleTokenError("expired"))

        response = authenticated_api.post(LINK_URL, {"id_token": "a-google-id-token"}, format="json")

        assert response.status_code == 401

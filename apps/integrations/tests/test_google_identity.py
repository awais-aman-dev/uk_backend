"""Verifying Google ID tokens.

Google's cryptographic check is replaced with a fake that returns a decoded payload, so these
tests cover the decisions made about that payload: which tokens are accepted, and what is read
out of them. The signature, expiry, audience and issuer checks belong to google-auth itself and
are exercised by asserting it is called with the right arguments.
"""

import pytest

from apps.integrations import google_identity
from apps.integrations.google_identity import InvalidGoogleTokenError, verify

CLIENT_IDS = ["web-client.apps.googleusercontent.com", "mobile-client.apps.googleusercontent.com"]

VALID_PAYLOAD = {
    "sub": "117000000000000000000",
    "email": "Person@Example.com",
    "email_verified": True,
    "given_name": "Pat",
    "aud": CLIENT_IDS[0],
    "iss": "https://accounts.google.com",
}


@pytest.fixture(autouse=True)
def client_ids(settings):
    settings.GOOGLE_CLIENT_IDS = CLIENT_IDS


@pytest.fixture
def google_payload(monkeypatch):
    """Stand in for google-auth, recording how it was called."""
    calls: dict[str, object] = {}

    def set_payload(payload):
        def fake_verify_oauth2_token(raw_token, request, audience=None, clock_skew_in_seconds=0):
            calls.update(raw_token=raw_token, audience=audience, clock_skew=clock_skew_in_seconds)
            if isinstance(payload, Exception):
                raise payload
            return payload

        monkeypatch.setattr(google_identity.id_token, "verify_oauth2_token", fake_verify_oauth2_token)
        return calls

    return set_payload


class TestAcceptedToken:
    def test_returns_the_identity_from_the_token(self, google_payload):
        google_payload(VALID_PAYLOAD)

        identity = verify("an-id-token")

        assert identity.subject == "117000000000000000000"
        assert identity.email == "person@example.com"
        assert identity.first_name == "Pat"

    def test_missing_given_name_is_allowed(self, google_payload):
        google_payload({**VALID_PAYLOAD, "given_name": None})

        assert verify("an-id-token").first_name == ""

    def test_a_token_for_any_configured_client_is_accepted(self, google_payload):
        google_payload({**VALID_PAYLOAD, "aud": CLIENT_IDS[1]})

        assert verify("an-id-token").email == "person@example.com"


class TestVerificationArguments:
    def test_checks_the_token_against_every_configured_client_id(self, google_payload):
        calls = google_payload(VALID_PAYLOAD)

        verify("an-id-token")

        # Without this, a token issued for someone else's Google app would be accepted here.
        assert calls["audience"] == CLIENT_IDS
        assert calls["raw_token"] == "an-id-token"

    def test_allows_a_small_clock_difference(self, google_payload):
        calls = google_payload(VALID_PAYLOAD)

        verify("an-id-token")

        assert calls["clock_skew"] == google_identity.CLOCK_SKEW_SECONDS


class TestRefusedToken:
    def test_unverified_email_is_refused(self, google_payload):
        """Google only vouches for addresses it has confirmed."""
        google_payload({**VALID_PAYLOAD, "email_verified": False})

        with pytest.raises(InvalidGoogleTokenError):
            verify("an-id-token")

    def test_missing_email_is_refused(self, google_payload):
        google_payload({**VALID_PAYLOAD, "email": ""})

        with pytest.raises(InvalidGoogleTokenError):
            verify("an-id-token")

    def test_missing_account_id_is_refused(self, google_payload):
        google_payload({**VALID_PAYLOAD, "sub": None})

        with pytest.raises(InvalidGoogleTokenError):
            verify("an-id-token")

    @pytest.mark.parametrize("error", [ValueError("Token expired"), ValueError("Wrong audience")])
    def test_failures_from_google_auth_become_invalid_token(self, google_payload, error):
        google_payload(error)

        with pytest.raises(InvalidGoogleTokenError):
            verify("an-id-token")

    def test_refused_when_no_client_ids_are_configured(self, settings, google_payload):
        """Fail closed rather than verifying against an empty allowlist."""
        settings.GOOGLE_CLIENT_IDS = []
        google_payload(VALID_PAYLOAD)

        with pytest.raises(InvalidGoogleTokenError):
            verify("an-id-token")

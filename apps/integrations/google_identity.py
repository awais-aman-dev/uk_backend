"""Checking Google ID tokens.

The browser signs the user in with Google and sends us the resulting ID token. The token is a
JWT signed by Google, so it can be verified here without calling Google's API on every sign-in.

Everything we trust about the user comes out of the verified token. Nothing the client sends
alongside it is used to decide who is signing in.
"""

import logging
from dataclasses import dataclass

from django.conf import settings
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

logger = logging.getLogger(__name__)

# Google's clocks and ours can differ by a second or two.
CLOCK_SKEW_SECONDS = 10


class InvalidGoogleTokenError(Exception):
    """The token was missing, malformed, expired, for another app, or not usable for sign-in."""


@dataclass(frozen=True)
class GoogleIdentity:
    """The parts of a verified Google token this product uses."""

    subject: str  # Google's permanent id for the account ("sub"); stable even if the email changes
    email: str
    first_name: str


def verify(raw_id_token: str) -> GoogleIdentity:
    """Verify a Google ID token and return who it belongs to.

    Checks the signature, expiry, issuer and that the token was issued for one of our own client
    ids; without the audience check, a token issued for any other Google app would be accepted.
    """
    if not settings.GOOGLE_CLIENT_IDS:
        raise InvalidGoogleTokenError("Google sign-in is not configured.")

    try:
        payload = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            audience=settings.GOOGLE_CLIENT_IDS,
            clock_skew_in_seconds=CLOCK_SKEW_SECONDS,
        )
    except (GoogleAuthError, ValueError) as error:
        # Covers a bad signature, an expired token and a wrong audience or issuer.
        raise InvalidGoogleTokenError(str(error)) from error

    # Google only vouches for addresses it has confirmed. Accepting an unconfirmed one would let
    # someone sign in as the owner of an address they do not control.
    if not payload.get("email_verified"):
        raise InvalidGoogleTokenError("Google has not verified this email address.")

    email = (payload.get("email") or "").lower()
    if not email or not payload.get("sub"):
        raise InvalidGoogleTokenError("Token is missing the email address or account id.")

    return GoogleIdentity(
        subject=payload["sub"],
        email=email,
        # `or ""` rather than a default: Google sends the key with no value for some accounts,
        # and first_name cannot be null.
        first_name=payload.get("given_name") or "",
    )

"""Signing in with Google, and linking Google to an existing password account.

The rule that matters here: the account is chosen from the verified token alone, by Google's
permanent account id first and then by the email address Google itself confirmed. Any other
email the client happens to send is ignored, because trusting one let a caller with any valid
Google token obtain tokens for somebody else's account.
"""

import logging

from django.db import transaction

from apps.accounts.models import AuthMethod, User
from apps.integrations.google_identity import GoogleIdentity

logger = logging.getLogger(__name__)


class GoogleLinkRequiredError(Exception):
    """The email belongs to a password account that has not linked Google yet.

    Linking is done from inside the account, so whoever asks has to sign in with the password
    first. That is what stops a Google token being used to take over a password account.
    """


class GoogleAccountMismatchError(Exception):
    """The email belongs to an account already linked to a different Google account."""


class GoogleAlreadyLinkedError(Exception):
    """This account has already been linked to Google."""


class GoogleIdentityInUseError(Exception):
    """Another account has already claimed this Google account."""


@transaction.atomic
def sign_in(identity: GoogleIdentity) -> tuple[User, bool]:
    """Sign in or sign up with a verified Google identity.

    Returns the user and whether the account was just created.
    """
    by_google_id = User.objects.filter(google_id=identity.subject).first()
    if by_google_id is not None:
        _fill_in_missing_first_name(by_google_id, identity)
        return by_google_id, False

    existing = User.objects.filter(email__iexact=identity.email).first()
    if existing is None:
        return _create_google_user(identity), True

    if existing.google_id:
        # Two different Google accounts claiming one email address. Replacing the stored id
        # would hand this account to whoever signed in most recently.
        logger.warning("Google sign-in refused: %s is linked to a different Google account", existing.email)
        raise GoogleAccountMismatchError

    if existing.has_usable_password():
        raise GoogleLinkRequiredError

    # No password and no Google account: this account cannot be signed into any other way, and
    # Google has confirmed the address belongs to this person, so adopt it.
    existing.google_id = identity.subject
    existing.email_verified = True
    _fill_in_missing_first_name(existing, identity, extra_fields=["google_id", "email_verified"])
    return existing, False


def link(user: User, identity: GoogleIdentity) -> None:
    """Attach a Google account to the signed-in user's account."""
    if user.google_id:
        raise GoogleAlreadyLinkedError

    if User.objects.filter(google_id=identity.subject).exclude(pk=user.pk).exists():
        raise GoogleIdentityInUseError

    if identity.email != user.email:
        # Allowed on purpose: people often have a different Google address. The signed-in user
        # asked for this, so it is their decision, but it is worth a log line.
        logger.info("Linking Google account %s to a different account email", identity.email)

    user.google_id = identity.subject
    user.save(update_fields=["google_id", "updated_at"])


def _create_google_user(identity: GoogleIdentity) -> User:
    """Google has confirmed the address, so the new account starts out verified."""
    return User.objects.create_user(
        email=identity.email,
        first_name=identity.first_name,
        auth_method=AuthMethod.GOOGLE,
        google_id=identity.subject,
        email_verified=True,
    )


def _fill_in_missing_first_name(user: User, identity: GoogleIdentity, extra_fields: list[str] | None = None) -> None:
    """Take the first name from Google when the account has none, for example after a purchase."""
    fields = list(extra_fields or [])
    if not user.first_name and identity.first_name:
        user.first_name = identity.first_name
        fields.append("first_name")
    if fields:
        user.save(update_fields=[*fields, "updated_at"])

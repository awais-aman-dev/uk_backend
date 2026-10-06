"""The emails the authentication flows send. Subjects are part of the product and must not drift."""

import logging

from django.conf import settings

from apps.core import email

logger = logging.getLogger(__name__)


def send_email_verification(user, token: str) -> None:
    email.send(
        template="email_verification",
        subject="Please confirm your email address",
        to=user.email,
        context={
            "first_name": user.first_name,
            "verification_url": f"{settings.FRONTEND_BASE_URL}auth/verify-email?token={token}",
        },
    )


def send_password_reset(user, token: str) -> None:
    email.send(
        template="password_reset",
        subject="Reset your password",
        to=user.email,
        context={
            "first_name": user.first_name,
            "reset_url": f"{settings.FRONTEND_BASE_URL}auth/reset-password?token={token}",
        },
    )


def send_password_changed(user) -> None:
    email.send(
        template="password_changed",
        subject="Your password has been changed",
        to=user.email,
        context={"first_name": user.first_name},
    )


def send_quietly(send_email, *args) -> bool:
    """Send an email, logging failures instead of raising.

    Used where a mail outage must not break the action itself: a registration still succeeds,
    and a password is still reset, even when the confirmation email cannot be sent.
    """
    try:
        send_email(*args)
    except Exception:
        logger.exception("Could not send %s email", send_email.__name__)
        return False
    return True

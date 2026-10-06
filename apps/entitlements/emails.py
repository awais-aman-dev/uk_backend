"""Emails about access running out."""

from django.conf import settings

from apps.core import email


def send_expiry_reminder(subscription) -> None:
    email.send(
        template="expiry_reminder",
        subject="Your access expires in 3 days",
        to=subscription.user.email,
        context={
            "first_name": subscription.user.first_name,
            "package_name": subscription.package.name,
            "expiry_date": f"{subscription.package_expires_at:%d %B %Y}",
            "renewal_url": settings.FRONTEND_BASE_URL,
        },
    )

"""Sending transactional email.

Templates live in ``templates/emails/``. Each message has an HTML template and a matching
``.txt`` template, because mail clients that cannot show HTML should still get readable text.
"""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send(template: str, subject: str, to: str, context: dict) -> None:
    """Render ``emails/<template>.html`` and ``.txt`` and send them to one recipient.

    Raises whatever the mail backend raises; the caller decides whether a failure should fail
    the request. Registration, for example, succeeds even if its email cannot be sent.
    """
    message = EmailMultiAlternatives(
        subject=subject,
        body=render_to_string(f"emails/{template}.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to],
    )
    message.attach_alternative(render_to_string(f"emails/{template}.html", context), "text/html")
    message.send()

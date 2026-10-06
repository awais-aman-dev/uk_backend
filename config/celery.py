"""Celery, which runs work outside the request/response cycle.

Two kinds of work need it: finishing a purchase after Stripe's webhook (creating the account,
granting access, sending emails) and the scheduled jobs that expire access over time. Both would
be wrong to do inside a web request — the webhook has to answer Stripe quickly, and nobody is
making a request at midnight.
"""

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("uk_backend")

# Reads every CELERY_* setting from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Picks up tasks.py in each installed app.
app.autodiscover_tasks()

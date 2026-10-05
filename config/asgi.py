"""ASGI entry point. Not used by the current deployment, which serves WSGI through gunicorn."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

application = get_asgi_application()

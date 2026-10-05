"""Settings for every deployed environment (develop, staging, production).

Values that are unsafe to default are read without a default, so a missing variable stops the
process at startup instead of running with an insecure fallback. ``manage.py check --deploy`` must
report no issues with these settings.
"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403
from .base import database, env, with_trailing_slash

SECRET_KEY = env.str("SECRET_KEY")
if not SECRET_KEY.strip():
    raise ImproperlyConfigured("SECRET_KEY must not be empty.")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must list at least one host.")

DATABASES = {"default": database(env.str("DATABASE_URL"))}

FRONTEND_BASE_URL = with_trailing_slash(env.str("FRONTEND_BASE_URL"))

STORAGES = {
    **STORAGES,  # noqa: F405
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# --- HTTPS ---------------------------------------------------------------------------------------
# TLS terminates at the load balancer, which forwards the original scheme in X-Forwarded-Proto.

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)
# The load balancer health check calls over plain HTTP and must not be redirected.
SECURE_REDIRECT_EXEMPT = [r"^api/healthcheck/$"]

SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=60 * 60 * 24 * 365)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=True)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=True)

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

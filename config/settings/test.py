"""Settings for the automated test suite (pytest and CI)."""

from .base import *  # noqa: F403
from .base import database, env

SECRET_KEY = "test-only-not-a-secret"

DATABASES = {
    "default": database(env.str("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/uk_backend"))
}

# Tests must not depend on hosts or origins configured on the developer's machine.
ALLOWED_HOSTS = ["testserver"]
CORS_ALLOWED_ORIGINS = []
CSRF_TRUSTED_ORIGINS = []
FRONTEND_BASE_URL = "http://frontend.test/"

# Tests never run collectstatic; let WhiteNoise find files on demand instead of from STATIC_ROOT.
WHITENOISE_AUTOREFRESH = True

# Hashing cost is irrelevant to what tests verify, and dominates their runtime.
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

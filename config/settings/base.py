"""Settings shared by every environment.

Environment modules (local, test, production) star-import this module and then define what must
differ per environment: ``SECRET_KEY``, ``DATABASES`` and any security hardening. Nothing here reads
a ``.env`` file; ``manage.py`` loads one for local convenience, deployed environments inject real
environment variables.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parents[2]

env = environ.Env()


def with_trailing_slash(url: str) -> str:
    """Normalise a base URL so call sites can append a path directly (``f"{base}auth/..."``)."""
    return url.rstrip("/") + "/"


def database(url: str) -> dict:
    """Build the default database config from a ``postgres://`` URL."""
    config = env.db_url_config(url)
    config["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
    config["CONN_HEALTH_CHECKS"] = True
    return config


# --- Core ----------------------------------------------------------------------------------------

DEBUG = False
ENVIRONMENT = env.str("ENVIRONMENT", default="local")

ALLOWED_HOSTS: list[str] = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "constance",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    # Local
    "apps.core",
    "apps.accounts",
]

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- REST API ------------------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Clients authenticate with `Authorization: Bearer <access token>`.
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    # Endpoints require a logged-in user unless they set permission_classes = [AllowAny].
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Views pick a scope by name, e.g. throttle_scope / a throttle class with scope = "auth_anon".
    "DEFAULT_THROTTLE_RATES": {
        "auth_anon": "10/minute",
        "auth_user": "30/minute",
        "password_reset": "5/hour",
        "email_resend": "5/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    # The lifetime for "remember me" logins. Without it, login issues a 24-hour token instead.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    # Refreshing returns a new refresh token and blacklists the old one, so a stolen
    # refresh token stops working as soon as the real user refreshes.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "1Theory UK API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- Cache ---------------------------------------------------------------------------------------
# Used for API throttling and login lockouts, so the counters must be shared by all web processes.

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env.str("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# --- Email ---------------------------------------------------------------------------------------

DEFAULT_FROM_EMAIL = env.str("DEFAULT_FROM_EMAIL", default="1Theory <info@1theory.co.uk>")

# --- Internationalisation ------------------------------------------------------------------------

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

# --- Static files --------------------------------------------------------------------------------

STATIC_URL = "/api/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # WhiteNoise serves static files from the app itself and stores a gzipped copy of each file
    # next to it during `collectstatic`. The same backend is used in every environment, so the
    # files collected when the Docker image is built are exactly what a deployed container serves.
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

# --- URLs ----------------------------------------------------------------------------------------

# Path the Django admin is mounted on, without a leading slash.
ADMIN_URL = with_trailing_slash(env.str("ADMIN_URL", default="api/admin/"))

# Storefront/cabinet frontend. Used to build links in emails and Stripe redirect URLs.
FRONTEND_BASE_URL = with_trailing_slash(env.str("FRONTEND_BASE_URL", default="http://localhost:3000/"))

# --- Security ------------------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS: list[str] = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_URLS_REGEX = r"^/api/.*$"
CSRF_TRUSTED_ORIGINS: list[str] = env.list("CSRF_TRUSTED_ORIGINS", default=[])

X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True

# --- Runtime configuration (editable by superusers in admin) -------------------------------------

CONSTANCE_BACKEND = "constance.backends.database.DatabaseBackend"
CONSTANCE_CONFIG = {
    "ACCOUNT_LIFETIME_COEFFICIENT": (
        1.5,
        "Account lifetime as a multiple of the package duration (1.5 = account stays open 50% longer "
        "than learning access). Applies to purchases made after the change.",
        float,
    ),
}

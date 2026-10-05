"""Settings shared by every environment.

Environment modules (local, test, production) star-import this module and then define what must
differ per environment: ``SECRET_KEY``, ``DATABASES`` and any security hardening. Nothing here reads
a ``.env`` file; ``manage.py`` loads one for local convenience, deployed environments inject real
environment variables.
"""

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
    # Local
    "apps.core",
]

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
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
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

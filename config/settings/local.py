"""Developer machine / docker compose settings. Never used in a deployed environment."""

from .base import *  # noqa: F403
from .base import database, env

DEBUG = env.bool("DEBUG", default=True)

SECRET_KEY = env.str("SECRET_KEY", default="local-development-only-not-a-secret")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])

DATABASES = {
    "default": database(env.str("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/uk_backend"))
}

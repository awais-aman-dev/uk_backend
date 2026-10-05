# UK Backend

Backend for the UK platform.

## Stack

- Python
- Django
- Django REST Framework
- PostgreSQL
- uv
- Docker
- Django Admin / Jazzmin

## Architecture

The backend is implemented as a Django monolith containing:

- Authentication and identity
- Customer cabinet APIs
- Packages, orders and subscriptions
- CRM
- Package entitlements and permissions
- Online Learning Platform
- Learning Admin
- Background processing
- Media/storage integrations

## Development

Requirements: [uv](https://docs.astral.sh/uv/) and a PostgreSQL 16 database. Docker Compose
setup will follow.

```bash
uv sync                      # create .venv with runtime + dev dependencies
cp .env.example .env         # then adjust DATABASE_URL etc.
uv run python manage.py migrate
uv run python manage.py runserver
```

### Settings

| Module | Used by |
|---|---|
| `config.settings.local` | `manage.py` (default) |
| `config.settings.test` | pytest |
| `config.settings.production` | `wsgi.py` / `asgi.py` (default); every deployed environment |

`manage.py` is the only entry point that reads `.env`. The production settings refuse to start
without `SECRET_KEY`, `ALLOWED_HOSTS`, `DATABASE_URL` and `FRONTEND_BASE_URL`. See
`.env.example` for the full variable catalogue.

### Checks

```bash
uv run ruff check . && uv run ruff format --check .
uv run mypy .
uv run pytest                # needs PostgreSQL; set DATABASE_URL if not on localhost:5432
```

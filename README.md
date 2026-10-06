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

Requirements: [uv](https://docs.astral.sh/uv/) and Docker.

### Running with Docker

```bash
docker compose up                                        # Postgres + dev server on :8000
docker compose run --rm web python manage.py migrate     # run migrations
docker compose run --rm web python manage.py createsuperuser
```

The source code is mounted into the container, so edits apply without rebuilding. Run
`docker compose build` after changing dependencies.

The `Dockerfile` installs runtime dependencies only (`uv sync --frozen --no-dev`) and runs
gunicorn by default; compose overrides that with `runserver`. Migrations are never run on
container start, so scaling out can't run them concurrently.

### Running without Docker

Point `DATABASE_URL` at any PostgreSQL 16 database, then:

```bash
uv sync
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
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest                # needs PostgreSQL; set DATABASE_URL if not on localhost:5432
```

CI (`.github/workflows/ci.yml`) runs exactly these four commands on every pull request and on
pushes to `develop`, `stage` and `main`.

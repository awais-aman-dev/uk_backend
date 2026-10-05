#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys
from pathlib import Path


def load_dotenv() -> None:
    """Load ``.env`` for local development. Real environment variables always win.

    Only ``manage.py`` reads the file: the test suite and deployed processes never do, so a
    developer's ``.env`` cannot leak into tests or production.
    """
    dotenv = Path(__file__).resolve().parent / ".env"
    if dotenv.is_file():
        import environ

        environ.Env.read_env(dotenv)


def main() -> None:
    """Run administrative tasks."""
    load_dotenv()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()

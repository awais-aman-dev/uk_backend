from config.celery import app as celery_app

# Imported here so `shared_task` finds the app however Django is started.
__all__ = ["celery_app"]

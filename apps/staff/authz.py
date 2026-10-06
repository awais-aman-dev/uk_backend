"""Checking permissions in the service layer.

Admin classes check permissions before showing a button, but that only hides the button. The
service that does the work checks too, so a hand-written request cannot reach it, and so any
future API shares one rule with the admin.
"""

from apps.staff.access import granted_permissions


class PermissionDeniedError(Exception):
    """The actor does not hold the permission this action needs."""


def require_permission(actor, permission: str) -> None:
    """Raise unless ``actor`` was explicitly granted ``permission``."""
    if permission not in granted_permissions(actor):
        raise PermissionDeniedError(f"{permission} is required for this action.")

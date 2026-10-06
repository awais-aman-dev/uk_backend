"""What a staff member was actually granted.

``user.has_perm()`` answers True for everything when the user is a superuser. That is right for
Django's own admin, but the back office holds customers' personal details, so access to it is
granted on purpose rather than inherited from being a superuser.

This reads the permissions actually recorded against the account, directly or through a group.
A superuser can still grant themselves the permission — this is least privilege by default, not
a wall against someone who administers the system.
"""

from django.contrib.auth.models import Permission
from django.db.models import Q


def granted_permissions(user) -> frozenset[str]:
    """The ``app_label.codename`` permissions this user holds. Empty for anonymous or disabled."""
    if user is None or not user.is_authenticated or not user.is_active:
        return frozenset()

    rows = (
        Permission.objects.filter(Q(user=user) | Q(group__user=user))
        .values_list("content_type__app_label", "codename")
        .distinct()
    )
    return frozenset(f"{app_label}.{codename}" for app_label, codename in rows)

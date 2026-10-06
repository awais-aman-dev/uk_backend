"""Staff roles, declared in code rather than clicked together in the admin.

A role is a name and the exact set of permissions it carries. Declaring them here means the
permissions a job needs are reviewed in a pull request, are the same in every environment, and
cannot quietly drift as people are added and removed.

Each app that owns an area of the back office declares its own roles in ``<app>/roles.py`` as a
``ROLES`` tuple, and a data migration calls :func:`sync_roles`.
"""

from dataclasses import dataclass

from django.apps import apps as global_apps
from django.contrib.auth.management import create_permissions


@dataclass(frozen=True)
class StaffRole:
    name: str
    permissions: tuple[str, ...]

    def __post_init__(self):
        for permission in self.permissions:
            if permission.count(".") != 1:
                raise ValueError(f"Role {self.name!r}: {permission!r} must read 'app_label.codename'")


def sync_roles(roles, apps=global_apps) -> None:
    """Create each role's group and set its permissions to exactly what is declared.

    Permissions added to a role group by hand are removed the next time this runs, which is the
    point: the code is the record of what a role may do. Safe to run repeatedly.
    """
    group_model = apps.get_model("auth", "Group")

    for role in roles:
        group, _ = group_model.objects.get_or_create(name=role.name)
        group.permissions.set(_permissions_for(role, apps))


def delete_roles(roles, apps=global_apps) -> None:
    """Remove these role groups, for reversing the migration that created them."""
    group_model = apps.get_model("auth", "Group")
    group_model.objects.filter(name__in=[role.name for role in roles]).delete()


def _permissions_for(role: StaffRole, apps) -> list:
    permission_model = apps.get_model("auth", "Permission")
    permissions = []

    for permission in role.permissions:
        app_label, codename = permission.split(".")
        # In a fresh database the permission rows may not exist yet, because migrations run
        # before Django creates them.
        create_permissions(global_apps.get_app_config(app_label), apps=apps, verbosity=0)
        permissions += permission_model.objects.filter(content_type__app_label=app_label, codename=codename)

    return permissions


def declared_roles() -> list[StaffRole]:
    """Every role declared by any installed app, for the sync_roles command."""
    from importlib import import_module

    roles: list[StaffRole] = []
    for app_config in global_apps.get_app_configs():
        try:
            module = import_module(f"{app_config.name}.roles")
        except ModuleNotFoundError:
            continue
        roles.extend(getattr(module, "ROLES", ()))

    return roles

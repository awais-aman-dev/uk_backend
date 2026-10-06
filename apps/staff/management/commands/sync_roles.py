from django.core.management.base import BaseCommand

from apps.staff.roles import declared_roles, sync_roles


class Command(BaseCommand):
    help = "Create the staff role groups and set their permissions to exactly what the code declares."

    def handle(self, *args, **options) -> None:
        roles = declared_roles()
        sync_roles(roles)

        for role in roles:
            self.stdout.write(f"{role.name}: {', '.join(role.permissions)}")
        self.stdout.write(self.style.SUCCESS(f"Synced {len(roles)} role(s)."))

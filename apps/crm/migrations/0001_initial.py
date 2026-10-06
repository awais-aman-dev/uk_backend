import django.db.models.manager
from django.db import migrations

from apps.crm.roles import ROLES
from apps.staff.roles import delete_roles, sync_roles


def create_roles(apps, schema_editor):
    sync_roles(ROLES, apps=apps)


def remove_roles(apps, schema_editor):
    delete_roles(ROLES, apps=apps)


class Migration(migrations.Migration):
    """Creates the Candidate proxy and its role group.

    The proxy adds no table; it exists so the CRM has its own permissions, separate from the Users
    admin. The role is created here so a fresh database comes up with it already in place.
    """

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="Candidate",
            fields=[],
            options={
                "verbose_name": "Candidate",
                "verbose_name_plural": "Candidates",
                "ordering": ["-date_joined"],
                "proxy": True,
                "indexes": [],
                "constraints": [],
            },
            bases=("accounts.user",),
            managers=[("objects", django.db.models.manager.Manager())],
        ),
        migrations.RunPython(create_roles, remove_roles),
    ]

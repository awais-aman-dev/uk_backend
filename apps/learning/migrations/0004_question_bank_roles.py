from django.db import migrations

from apps.learning.roles import ROLES
from apps.staff.roles import sync_roles


def resync_roles(apps, schema_editor):
    sync_roles(ROLES, apps=apps)


class Migration(migrations.Migration):
    """Gives the content roles the question bank's permissions.

    The roles were last set in 0002, before these models existed, so their groups would otherwise
    still carry only the hierarchy's permissions. Re-running the sync is how any later change to
    ``roles.py`` reaches existing databases; it sets each group to exactly what the code declares,
    so there is nothing to reverse beyond 0002 running again.
    """

    dependencies = [
        ("learning", "0003_question_bank"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(resync_roles, migrations.RunPython.noop),
    ]

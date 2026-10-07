from django.db import migrations

from apps.learning.roles import ROLES
from apps.staff.roles import sync_roles


def resync_roles(apps, schema_editor):
    sync_roles(ROLES, apps=apps)


class Migration(migrations.Migration):
    """Lets the content roles see the new progress records.

    The roles were last set before these models existed, so re-running the sync is how a change
    to ``roles.py`` reaches databases that already have the groups.
    """

    dependencies = [
        ("learning", "0005_student_progress"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [migrations.RunPython(resync_roles, migrations.RunPython.noop)]

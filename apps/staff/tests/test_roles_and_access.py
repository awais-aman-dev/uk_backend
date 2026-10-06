"""The staff authorization framework: declared roles, granted permissions, service checks."""

import pytest
from django.contrib.auth.models import AnonymousUser, Group, Permission
from django.core.management import call_command

from apps.accounts.models import User
from apps.crm.roles import CRM_MANAGER, VIEW_CANDIDATES
from apps.staff.access import granted_permissions
from apps.staff.authz import PermissionDeniedError, require_permission
from apps.staff.roles import StaffRole, declared_roles, delete_roles, sync_roles

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff():
    return User.objects.create_user(email="staff@example.com", first_name="Stan", is_staff=True)


@pytest.fixture
def superuser():
    return User.objects.create_superuser(email="root@example.com", first_name="Root", password="Riverbank42")


def permission(codename: str) -> Permission:
    return Permission.objects.get(codename=codename)


class TestStaffRole:
    def test_a_permission_must_name_its_app(self):
        """Catches a typo at import time rather than silently granting nothing."""
        with pytest.raises(ValueError, match="app_label.codename"):
            StaffRole(name="Broken", permissions=("view_candidate",))

    @pytest.mark.parametrize("bad", ["crm.view.candidate", "candidate", ""])
    def test_malformed_permissions_are_refused(self, bad):
        with pytest.raises(ValueError):
            StaffRole(name="Broken", permissions=(bad,))


class TestSyncRoles:
    def test_the_role_exists_after_migrating(self):
        """The migration creates it, so a fresh database comes up ready to use."""
        group = Group.objects.get(name="CRM Manager")

        assert list(group.permissions.values_list("codename", flat=True)) == ["view_candidate"]

    def test_running_it_again_changes_nothing(self):
        sync_roles([CRM_MANAGER])
        sync_roles([CRM_MANAGER])

        assert Group.objects.filter(name="CRM Manager").count() == 1

    def test_permissions_added_by_hand_are_taken_back(self):
        """The code is the record of what a role may do, so drift is undone on the next sync."""
        group = Group.objects.get(name="CRM Manager")
        group.permissions.add(permission("change_candidate"))

        sync_roles([CRM_MANAGER])

        assert list(group.permissions.values_list("codename", flat=True)) == ["view_candidate"]

    def test_a_removed_permission_is_withdrawn(self):
        sync_roles([StaffRole(name="CRM Manager", permissions=())])

        assert Group.objects.get(name="CRM Manager").permissions.count() == 0

    def test_deleting_roles_removes_the_groups(self):
        delete_roles([CRM_MANAGER])

        assert Group.objects.filter(name="CRM Manager").exists() is False

    def test_roles_are_discovered_from_every_app(self):
        assert CRM_MANAGER in declared_roles()

    def test_the_management_command_syncs_them(self):
        Group.objects.all().delete()

        call_command("sync_roles")

        assert Group.objects.filter(name="CRM Manager").exists()


class TestGrantedPermissions:
    def test_nothing_for_anonymous_visitors(self):
        assert granted_permissions(AnonymousUser()) == frozenset()

    def test_nothing_for_none(self):
        assert granted_permissions(None) == frozenset()

    def test_nothing_for_a_disabled_account(self, staff):
        """Suspending an account has to take its access away immediately."""
        staff.user_permissions.add(permission("view_candidate"))
        staff.is_active = False
        staff.save(update_fields=["is_active"])

        assert granted_permissions(staff) == frozenset()

    def test_a_direct_grant_counts(self, staff):
        staff.user_permissions.add(permission("view_candidate"))

        assert VIEW_CANDIDATES in granted_permissions(staff)

    def test_a_grant_through_a_group_counts(self, staff):
        staff.groups.add(Group.objects.get(name="CRM Manager"))

        assert VIEW_CANDIDATES in granted_permissions(staff)

    def test_a_superuser_is_granted_nothing_implicitly(self, superuser):
        """Being a superuser is not by itself a way into the customer records."""
        assert granted_permissions(superuser) == frozenset()

    def test_a_superuser_with_a_grant_has_it(self, superuser):
        superuser.user_permissions.add(permission("view_candidate"))

        assert VIEW_CANDIDATES in granted_permissions(superuser)

    def test_duplicates_from_several_sources_collapse(self, staff):
        staff.user_permissions.add(permission("view_candidate"))
        staff.groups.add(Group.objects.get(name="CRM Manager"))

        assert len([p for p in granted_permissions(staff) if p == VIEW_CANDIDATES]) == 1


class TestRequirePermission:
    def test_passes_when_granted(self, staff):
        staff.user_permissions.add(permission("view_candidate"))

        require_permission(staff, VIEW_CANDIDATES)

    def test_raises_without_the_grant(self, staff):
        with pytest.raises(PermissionDeniedError):
            require_permission(staff, VIEW_CANDIDATES)

    def test_raises_for_a_superuser_without_the_grant(self, superuser):
        """Services apply the same rule as the admin, so neither can be the soft way round."""
        with pytest.raises(PermissionDeniedError):
            require_permission(superuser, VIEW_CANDIDATES)

    def test_raises_for_anonymous(self):
        with pytest.raises(PermissionDeniedError):
            require_permission(AnonymousUser(), VIEW_CANDIDATES)

"""The Users admin, in particular that staff cannot promote themselves.

In the current product any staff member holding "change user" can tick is_superuser and take
over the system. These tests pin the fix.
"""

import pytest
from django.conf import settings
from django.contrib.auth.models import Permission
from django.urls import reverse

from apps.accounts.models import User

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff_user(db):
    """Staff who may edit users, but is not a superuser."""
    user = User.objects.create_user(email="staff@example.com", password=PASSWORD, first_name="Stan", is_staff=True)
    user.user_permissions.add(*Permission.objects.filter(codename__in=["view_user", "change_user"]))
    return user


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(email="root@example.com", password=PASSWORD, first_name="Root")


def change_url(user):
    return reverse("admin:accounts_user_change", args=[user.pk])


def post_change_form(client, target, **overrides):
    """Submit the change form for ``target``, as a hand-crafted POST would."""
    payload = {
        "email": target.email,
        "first_name": target.first_name,
        "last_name": target.last_name,
        "phone": target.phone,
        "auth_method": target.auth_method,
        "is_active": "on",
        "date_joined_0": "2026-01-01",
        "date_joined_1": "00:00:00",
        **overrides,
    }
    return client.post(change_url(target), payload)


class TestPrivilegeEscalation:
    def test_staff_cannot_make_themselves_a_superuser(self, client, staff_user):
        client.force_login(staff_user)

        post_change_form(client, staff_user, is_superuser="on", is_staff="on")

        staff_user.refresh_from_db()
        assert staff_user.is_superuser is False

    def test_staff_cannot_grant_themselves_permissions(self, client, staff_user):
        extra = Permission.objects.get(codename="delete_user")
        client.force_login(staff_user)

        post_change_form(client, staff_user, user_permissions=[extra.pk])

        assert staff_user.user_permissions.filter(pk=extra.pk).exists() is False

    def test_staff_cannot_promote_another_account(self, client, staff_user, user):
        client.force_login(staff_user)

        post_change_form(client, user, is_superuser="on", is_staff="on")

        user.refresh_from_db()
        assert user.is_superuser is False
        assert user.is_staff is False

    def test_permission_fields_are_hidden_from_staff(self, client, staff_user, user):
        client.force_login(staff_user)

        response = client.get(change_url(user))

        assert response.status_code == 200
        assert b'name="is_superuser"' not in response.content

    def test_staff_can_still_edit_ordinary_details(self, client, staff_user, user):
        client.force_login(staff_user)

        post_change_form(client, user, first_name="Renamed")

        user.refresh_from_db()
        assert user.first_name == "Renamed"


class TestSuperuserCanManagePermissions:
    def test_superuser_sees_the_permission_fields(self, client, superuser, user):
        client.force_login(superuser)

        response = client.get(change_url(user))

        assert b'name="is_superuser"' in response.content

    def test_superuser_can_promote_an_account(self, client, superuser, user):
        client.force_login(superuser)

        post_change_form(client, user, is_superuser="on", is_staff="on")

        user.refresh_from_db()
        assert user.is_superuser is True


class TestAdminConfiguration:
    def test_changelist_shows_the_documented_columns(self, client, superuser):
        client.force_login(superuser)

        response = client.get(reverse("admin:accounts_user_changelist"))

        assert response.status_code == 200
        columns = response.context["cl"].list_display
        for column in ["email", "auth_method", "email_verified", "is_active", "account_expires_at"]:
            assert column in columns

    def test_security_tokens_are_read_only(self, client, superuser):
        client.force_login(superuser)

        response = client.get(reverse("admin:accounts_securitytoken_changelist"))

        assert response.status_code == 200
        assert b"Add security token" not in response.content

    def test_admin_login_page_is_reachable(self, client):
        response = client.get(f"/{settings.ADMIN_URL}login/")

        assert response.status_code == 200

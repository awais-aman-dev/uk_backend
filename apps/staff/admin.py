from django.db.models.options import Options
from django.http import HttpRequest
from django.utils.html import format_html
from django.utils.safestring import SafeString, mark_safe

from apps.staff.access import granted_permissions

ADMIN_ACTIONS = ("view", "add", "change", "delete")


class PermissionRequiredAdminMixin:
    """Gate an admin area on explicitly granted permissions.

    Applied to admin classes holding customer data, so being a superuser is not by itself a way
    in. Every check, including whether the section appears in the menu, goes through the
    permissions actually recorded against the account.
    """

    opts: Options

    def has_view_permission(self, request: HttpRequest, obj=None) -> bool:
        return self.permission_for("view") in self._granted(request)

    def has_add_permission(self, request: HttpRequest) -> bool:
        return self.permission_for("add") in self._granted(request)

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return self.permission_for("change") in self._granted(request)

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return self.permission_for("delete") in self._granted(request)

    def has_module_permission(self, request: HttpRequest) -> bool:
        """Whether the section shows in the sidebar at all."""
        granted = self._granted(request)
        return any(self.permission_for(action) in granted for action in ADMIN_ACTIONS)

    def permission_for(self, action: str) -> str:
        return f"{self.opts.app_label}.{action}_{self.opts.model_name}"

    def _granted(self, request: HttpRequest) -> frozenset[str]:
        # Worked out once per request: the admin asks these questions many times per page.
        cached = getattr(request, "_granted_permissions", None)
        if cached is None:
            cached = granted_permissions(request.user)
            request._granted_permissions = cached  # type: ignore[attr-defined]
        return cached


class ReadOnlyAdminMixin:
    """Show records but allow no changes through the admin forms."""

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return False


# --- Display helpers, shared by every admin area -------------------------------------------------


def identity_cell(initials: str, name: str, meta: str) -> SafeString:
    """An avatar of initials beside a name and a second line, as used in people lists."""
    return format_html(
        '<span class="adm-identity">'
        '<span class="adm-avatar">{}</span>'
        '<span class="adm-identity-text">'
        '<span class="adm-identity-name">{}</span>'
        '<span class="adm-identity-meta">{}</span>'
        "</span></span>",
        initials,
        name,
        meta,
    )


def badge(label: str, tone: str = "neutral") -> SafeString:
    """A small coloured label. Tones: success, neutral."""
    return format_html('<span class="adm-badge adm-badge--{}">{}</span>', tone, label)


def placeholder() -> SafeString:
    """A dash, for a column with nothing to show."""
    return mark_safe('<span class="adm-muted">&mdash;</span>')  # noqa: S308 - fixed markup, no input

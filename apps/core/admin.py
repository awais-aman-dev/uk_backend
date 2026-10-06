from django.contrib import admin
from django.utils.safestring import SafeString

from apps.core.models import AuditEvent
from apps.staff.admin import ReadOnlyAdminMixin, placeholder


@admin.register(AuditEvent)
class AuditEventAdmin(ReadOnlyAdminMixin, admin.ModelAdmin):
    """The audit trail. Read-only by definition: an editable audit trail records nothing."""

    list_display = ["created_at", "actor_email", "action", "target_label", "summary"]
    list_filter = ["action", "created_at"]
    search_fields = ["actor_email", "action", "target_label", "target_id", "reason"]
    date_hierarchy = "created_at"
    fields = [
        "created_at",
        "actor",
        "actor_email",
        "action",
        "target_type",
        "target_id",
        "target_label",
        "changes",
        "reason",
    ]

    @admin.display(description="Changes")
    def summary(self, event: AuditEvent) -> str | SafeString:
        if not event.changes:
            return placeholder()
        return ", ".join(
            f"{field}: {change.get('from') or '—'} → {change.get('to') or '—'}"
            for field, change in event.changes.items()
        )

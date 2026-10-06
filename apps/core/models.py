from django.db import models


class TimestampedModel(models.Model):
    """Abstract base adding creation and last-modification timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditEvent(models.Model):
    """A record of one change a staff member made to somebody else's data.

    Kept even if the staff account or the record it describes is later deleted, because the point
    of an audit trail is to answer questions about the past. That is why the actor's email and the
    target's description are copied in as text rather than only referenced.
    """

    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    actor_email = models.EmailField(blank=True, help_text="Copied in, so it survives the account.")

    action = models.CharField(max_length=100, help_text="For example crm.candidate.updated")

    target_type = models.ForeignKey("contenttypes.ContentType", on_delete=models.SET_NULL, null=True)
    target_id = models.CharField(max_length=64)
    target_label = models.CharField(max_length=255, blank=True)

    changes = models.JSONField(default=dict, blank=True, help_text='{"field": {"from": …, "to": …}}')
    reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.actor_email or 'system'} {self.action} {self.target_label}"

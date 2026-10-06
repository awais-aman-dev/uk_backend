from django.db import models


class TimestampedModel(models.Model):
    """Abstract base adding creation and last-modification timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PublishStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class PublishableModel(models.Model):
    """Abstract base for anything students only see once staff say so.

    Saving is not publishing: content stays a draft until somebody with the publish permission
    says otherwise, so a half-written lesson cannot reach students because an editor pressed save.
    Publishing goes through a service that checks the permission, validates the content and
    records who did it.
    """

    status = models.CharField(max_length=10, choices=PublishStatus.choices, default=PublishStatus.DRAFT)
    publish_from = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Leave empty to go live as soon as it is published. Otherwise students see it from this time.",
    )
    published_at = models.DateTimeField(null=True, blank=True, editable=False)
    published_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        editable=False,
        related_name="+",
    )

    class Meta:
        abstract = True

    @property
    def is_published(self) -> bool:
        """Whether staff have released it. Not the same as students being able to see it."""
        return self.status == PublishStatus.PUBLISHED

    def is_live(self, at=None) -> bool:
        """Whether students can see it now: published, and past its scheduled time."""
        if not self.is_published:
            return False
        if self.publish_from is None:
            return True

        from django.utils import timezone

        return self.publish_from <= (at or timezone.now())


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

"""Recording what staff did.

Django's own admin log records that a row changed. This records *why*, by whom, and what the
values were before and after — the questions actually asked when a customer disputes a change.

Every service that changes somebody else's data writes one of these.
"""

from django.contrib.contenttypes.models import ContentType

from apps.core.models import AuditEvent


def record(*, actor, action: str, target, changes: dict | None = None, reason: str = "") -> AuditEvent:
    """Write an audit entry.

    ``changes`` maps each field to ``{"from": old, "to": new}``. Values are stored as text, so a
    later change to a model cannot make an old entry unreadable.
    """
    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "pk", None) else None,
        actor_email=getattr(actor, "email", "") or "",
        action=action,
        target_type=ContentType.objects.get_for_model(target),
        target_id=str(target.pk),
        target_label=str(target),
        changes=changes or {},
        reason=reason,
    )


def diff(before: dict, after: dict) -> dict:
    """Describe what changed between two field dictionaries, leaving out what did not."""
    return {
        field: {"from": _as_text(before.get(field)), "to": _as_text(value)}
        for field, value in after.items()
        if before.get(field) != value
    }


def _as_text(value) -> str:
    return "" if value is None else str(value)

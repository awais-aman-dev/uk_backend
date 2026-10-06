"""Changes staff make to a customer's record.

Every change goes through here rather than straight from an admin form, so that one place checks
the permission, applies the change and records who did it. The admin is then only a way of calling
this, and a hand-written request cannot skip the checks.
"""

import logging

from django.db import transaction

from apps.accounts.models import User
from apps.core import audit
from apps.crm.models import Candidate
from apps.crm.roles import CHANGE_CANDIDATES
from apps.staff.authz import require_permission

logger = logging.getLogger(__name__)

# What support staff may change. Deliberately short: it holds no field that decides access or
# staff privileges, so this form can never be used to grant anybody anything.
EDITABLE_FIELDS = ("first_name", "last_name", "phone", "email", "email_verified", "is_active")


class EmailAlreadyTakenError(Exception):
    """Another account already uses that address."""


@transaction.atomic
def update_candidate(*, actor, candidate: Candidate, changes: dict, reason: str = "") -> Candidate:
    """Apply staff edits to a candidate and record them.

    Raises ``PermissionDeniedError`` without the CRM change permission, and
    ``EmailAlreadyTakenError`` if the new address belongs to someone else.
    """
    require_permission(actor, CHANGE_CANDIDATES)

    applied = {field: value for field, value in changes.items() if field in EDITABLE_FIELDS}
    if not applied:
        return candidate

    # Read the stored values rather than the ones on the object: an admin form has already copied
    # the new values onto the instance by the time this runs, so comparing against it would find
    # no difference and record nothing.
    before = User.objects.filter(pk=candidate.pk).values(*applied).first() or {}

    new_email = applied.get("email")
    if new_email:
        applied["email"] = new_email = new_email.lower()
        if User.objects.filter(email__iexact=new_email).exclude(pk=candidate.pk).exists():
            raise EmailAlreadyTakenError

    difference = audit.diff(before, applied)
    if not difference:
        return candidate

    for field, value in applied.items():
        setattr(candidate, field, value)
    candidate.save(update_fields=[*applied, "updated_at"])

    audit.record(
        actor=actor,
        action="crm.candidate.updated",
        target=candidate,
        changes=difference,
        reason=reason,
    )
    logger.info("%s updated candidate %s", getattr(actor, "email", "system"), candidate.pk)
    return candidate

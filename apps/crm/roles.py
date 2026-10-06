"""CRM roles.

Reaching the CRM is granted on purpose: holding one of these permissions, through this group or
directly on the account. Being a Django superuser is not enough on its own, because the CRM holds
customers' personal details.
"""

from apps.staff.roles import StaffRole

VIEW_CANDIDATES = "crm.view_candidate"
CHANGE_CANDIDATES = "crm.change_candidate"

# Support staff who look customers up. Read-only: changing a customer's details is a separate
# permission, which no role carries yet (see the note in README on CRM roles).
CRM_MANAGER = StaffRole(name="CRM Manager", permissions=(VIEW_CANDIDATES,))

ROLES = (CRM_MANAGER,)

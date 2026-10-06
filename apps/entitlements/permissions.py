from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.entitlements import services

NO_SUBSCRIPTION = "No active subscription."
EXPIRED = "Your subscription has expired. Please purchase a new package."


class HasLearningAccess(BasePermission):
    """Lets a student through only while their access is live.

    Used by every learning endpoint, so access is checked in one place rather than re-implemented
    per view. Staff get no access here: previewing content is a separate permission, so nobody
    sees learning material by accident of being staff.
    """

    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False

        if services.has_access(user):
            return True

        # Tell the customer which of the two it is: they have never bought, or their access ran out.
        self.message = EXPIRED if services.current_subscription(user) else NO_SUBSCRIPTION
        return False

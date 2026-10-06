from django.contrib import admin
from django.http import HttpRequest

from apps.entitlements.models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Read-only on purpose.

    Editing an expiry date here would change what a customer paid for, with no record of who did
    it or why. Extending access belongs in a service-backed action with a reason and an audit
    entry, which comes with the back-office work.
    """

    list_display = ["user", "package", "status", "starts_at", "package_expires_at", "account_expires_at"]
    list_filter = ["package"]
    search_fields = ["user__email", "package__name", "order__id"]
    date_hierarchy = "package_expires_at"
    list_select_related = ["user", "package"]

    @admin.display(description="Status")
    def status(self, subscription: Subscription) -> str:
        return subscription.status_display

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

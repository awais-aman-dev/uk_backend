from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import SafeString

from apps.entitlements.models import Subscription
from apps.staff.admin import ReadOnlyAdminMixin, placeholder


@admin.register(Subscription)
class SubscriptionAdmin(ReadOnlyAdminMixin, admin.ModelAdmin):
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

    readonly_fields = ["candidate"]

    @admin.display(description="Status")
    def status(self, subscription: Subscription) -> str:
        return subscription.status_display

    @admin.display(description="Candidate")
    def candidate(self, subscription: Subscription) -> SafeString:
        """Back to the customer's CRM record."""
        customer = subscription.user
        if customer is None:
            return placeholder()
        url = reverse("admin:crm_candidate_change", args=[customer.pk])
        return format_html('<a href="{}">{}</a>', url, customer.email)

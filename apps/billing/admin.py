from django.contrib import admin
from django.http import HttpRequest

from apps.billing.models import Order, PromoCode, StripeEvent


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_type", "discount_value", "uses_count", "max_uses", "valid_until", "is_active"]
    list_editable = ["is_active"]
    list_filter = ["discount_type", "is_active"]
    search_fields = ["code"]
    readonly_fields = ["uses_count", "created_at", "updated_at"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Read-only on purpose.

    An order records what somebody was charged. Editing a status or a price here would change the
    record without taking or refunding any money, and without granting or removing access, so
    those changes belong in service-backed actions instead.
    """

    list_display = ["email", "package", "status", "final_price", "paid_at", "created_at"]
    list_filter = ["status", "package"]
    search_fields = ["email", "id", "stripe_session_id", "transaction_id"]
    date_hierarchy = "created_at"
    list_select_related = ["package", "user"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj=None) -> bool:
        return False


@admin.register(StripeEvent)
class StripeEventAdmin(admin.ModelAdmin):
    """The log of webhooks Stripe has delivered, for tracing a payment that went wrong."""

    list_display = ["event_type", "event_id", "received_at"]
    list_filter = ["event_type"]
    search_fields = ["event_id"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj=None) -> bool:
        return False

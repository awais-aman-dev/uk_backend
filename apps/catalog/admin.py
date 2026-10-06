from django.contrib import admin

from apps.catalog.models import Package


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ["name", "duration_days", "price", "is_featured", "is_active", "display_order"]
    list_editable = ["is_featured", "is_active", "display_order"]
    list_filter = ["is_active", "is_featured"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]

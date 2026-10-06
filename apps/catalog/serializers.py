from rest_framework import serializers

from apps.catalog.models import Package


class PackageSerializer(serializers.ModelSerializer):
    """The storefront's view of a package. Prices are strings, so no decimal places are lost."""

    class Meta:
        model = Package
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "duration_days",
            "price",
            "is_featured",
            "materials",
            "display_order",
        ]

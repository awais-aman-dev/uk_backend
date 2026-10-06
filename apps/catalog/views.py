from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Package
from apps.catalog.serializers import PackageSerializer


@extend_schema(summary="List the packages on sale")
class PackageListView(ListAPIView):
    """Every package on sale, cheapest-first within each display position. Not paginated: there
    are only a handful, and the storefront shows them all at once."""

    permission_classes = [AllowAny]
    serializer_class = PackageSerializer
    pagination_class = None
    queryset = Package.objects.filter(is_active=True)


class PackageDetailView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={200: PackageSerializer}, summary="Look up one package by slug")
    def get(self, request: Request, slug: str) -> Response:
        package = Package.objects.filter(slug=slug, is_active=True).first()
        if package is None:
            return Response({"detail": "Package not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PackageSerializer(package).data)

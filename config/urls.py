from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

from apps.core.views import healthcheck

admin.site.site_header = "CRM Administration"
admin.site.site_title = "CRM Administration"
admin.site.index_title = "CRM"

urlpatterns = [
    path("api/healthcheck/", healthcheck, name="healthcheck"),
    path(settings.ADMIN_URL, admin.site.urls),
    # API documentation. /api/schema/ serves the OpenAPI file the two UIs read.
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.catalog.urls")),
    path("api/", include("apps.billing.urls")),
]

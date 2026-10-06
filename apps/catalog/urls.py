from django.urls import path

from apps.catalog import views

urlpatterns = [
    path("packages/", views.PackageListView.as_view(), name="package-list"),
    path("packages/<slug:slug>/", views.PackageDetailView.as_view(), name="package-detail"),
]

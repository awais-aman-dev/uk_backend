"""The shared API behaviour every endpoint relies on: health, docs and default permissions."""

import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_healthcheck_returns_empty_object_without_touching_the_database(client, django_assert_num_queries):
    """Marked django_db only so queries can be counted; the assertion is that there are none."""
    with django_assert_num_queries(0):
        response = client.get(reverse("healthcheck"))

    assert response.status_code == 200
    assert response.json() == {}


@pytest.mark.django_db
def test_protected_endpoint_returns_401_with_a_detail_key(client):
    """The frontend reads `detail` on every error, so DRF's default shape must be kept."""
    response = client.post(reverse("auth-logout"), {})

    assert response.status_code == 401
    assert "detail" in response.json()


@pytest.mark.django_db
class TestOpenApiSchema:
    def test_schema_generates_without_errors(self, client):
        response = client.get(reverse("schema"))

        assert response.status_code == 200

    def test_schema_lists_the_auth_endpoints(self, client):
        paths = client.get(reverse("schema"), headers={"accept": "application/json"}).json()["paths"]

        assert "/api/auth/login/" in paths
        assert "/api/auth/password/reset/confirm/" in paths

    @pytest.mark.parametrize("name", ["swagger-ui", "redoc"])
    def test_documentation_pages_render(self, client, name):
        response = client.get(reverse(name))

        assert response.status_code == 200

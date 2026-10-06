from django.http import HttpRequest, JsonResponse


def healthcheck(request: HttpRequest) -> JsonResponse:
    """Confirm the web process is up, for the load balancer.

    Deliberately touches no database or cache: it answers "can this container serve traffic",
    not "is every dependency healthy", so a database blip cannot take every container out of
    the load balancer at once.
    """
    return JsonResponse({})

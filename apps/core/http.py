from django.http import HttpRequest


def client_ip(request: HttpRequest) -> str:
    """The caller's IP address.

    In a deployed environment requests arrive through a load balancer, so REMOTE_ADDR is the
    balancer and the real address is the first entry of X-Forwarded-For. A client can put
    anything in that header, so treat the result as a hint for spreading out rate limits,
    never as proof of identity.
    """
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")

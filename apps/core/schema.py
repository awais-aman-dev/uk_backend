"""How Swagger decides which endpoints to draw a padlock on.

drf-spectacular reads a view's authenticators and permissions to work out its security. For an
endpoint that allows anonymous access it *appends* an empty requirement to the ones it found, so
a public endpoint came out as::

    security: [{jwtAuth: []}, {}]       # "a token, or nothing"

That is true, but Swagger UI draws a padlock for any non-empty requirement in the list, so every
public endpoint looked as though it needed signing in and the padlock stopped meaning anything.

Here an endpoint is one or the other, read from the permissions the view actually declares:

``security: [{jwtAuth: []}]``
    A token is required. Padlock.

``security: []``
    Anonymous access is allowed. No padlock. Written out as an empty list rather than left off,
    because that is what overrides a document-wide requirement if one is ever added.

Nothing about authentication itself changes — the scheme is still simplejwt's ``jwtAuth`` bearer
token, and the permission classes are the ones deciding.
"""

from typing import Any

from drf_spectacular.openapi import AutoSchema
from rest_framework import permissions


class SecurityAwareAutoSchema(AutoSchema):
    """Describes each endpoint's security from its own permission classes."""

    def get_operation(self, *args: Any, **kwargs: Any) -> dict | None:
        operation = super().get_operation(*args, **kwargs)
        if operation is not None and self.allows_anonymous():
            # Set rather than left out: an explicit empty list is what overrides a global
            # requirement, and it says "public" out loud instead of by omission.
            operation["security"] = []
        return operation

    def get_auth(self) -> list[dict]:
        if self.allows_anonymous():
            # Still call up, so the scheme is registered in components.securitySchemes.
            super().get_auth()
            return []
        # Drop the "or nothing" alternative, which is what put a padlock on public endpoints.
        return [requirement for requirement in super().get_auth() if requirement]

    def allows_anonymous(self) -> bool:
        """Whether a signed-out caller can use this endpoint.

        DRF requires *every* permission class to pass, so the endpoint is public only if they all
        let an anonymous request through. Anything unrecognised — a custom permission, a composed
        ``A & B`` — counts as requiring a user, so an endpoint is never shown as public by mistake.
        """
        declared = self.view.get_permissions()
        if not declared:
            # No permission class at all: nothing is checked, so nobody is turned away.
            return True
        return all(self.permits_anonymous(permission) for permission in declared)

    def permits_anonymous(self, permission: Any) -> bool:
        if isinstance(permission, permissions.AllowAny):
            return True
        if isinstance(permission, permissions.IsAuthenticatedOrReadOnly):
            return self.method in permissions.SAFE_METHODS
        return False

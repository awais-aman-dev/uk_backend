import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


def validate_password_policy(value: str) -> str:
    """At least 8 characters, one uppercase letter and one digit, plus Django's own checks.

    Django's validators are run last, so the specific messages above are the ones people see most.
    """
    if not re.search(r"[A-Z]", value):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r"\d", value):
        raise serializers.ValidationError("Password must contain at least one digit.")
    validate_password(value)
    return value


class PasswordField(serializers.CharField):
    def __init__(self, **kwargs):
        kwargs.setdefault("write_only", True)
        kwargs.setdefault("min_length", 8)
        kwargs.setdefault("validators", [validate_password_policy])
        kwargs.setdefault("style", {"input_type": "password"})
        super().__init__(**kwargs)


class ConfirmedPasswordSerializer(serializers.Serializer):
    """Base for the forms that ask for the new password twice: `password` and `confirm_password`."""

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class RegisterSerializer(ConfirmedPasswordSerializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    password = PasswordField()
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        return value.lower()


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    # Chooses the session length: 30 days when true, 24 hours when false.
    remember_me = serializers.BooleanField(default=False)

    def validate_email(self, value: str) -> str:
        return value.lower()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.lower()


class PasswordResetConfirmSerializer(ConfirmedPasswordSerializer):
    token = serializers.CharField()
    password = PasswordField()
    confirm_password = serializers.CharField(write_only=True)


# --- Response shapes, declared so the OpenAPI schema documents them ------------------------------


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class RegisterResponseSerializer(TokenPairSerializer):
    message = serializers.CharField()


class DetailSerializer(serializers.Serializer):
    detail = serializers.CharField()

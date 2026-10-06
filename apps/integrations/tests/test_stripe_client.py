"""Reading Stripe webhooks, using the real Stripe library.

Every other webhook test replaces this function, so this is the one place the actual signature
check runs. Payloads are signed here the same way Stripe signs them.
"""

import hashlib
import hmac
import json
import time

import pytest

from apps.integrations.stripe_client import InvalidWebhookSignatureError, read_webhook_event

SECRET = "whsec_test_secret"  # noqa: S105 - a fixed value for signing test payloads

EVENT = {
    "id": "evt_test",
    "type": "checkout.session.completed",
    "data": {"object": {"metadata": {"order_id": "abc"}, "payment_status": "paid"}},
}


@pytest.fixture(autouse=True)
def webhook_secret(settings):
    settings.STRIPE_WEBHOOK_SECRET = SECRET


def sign(payload: bytes, secret: str = SECRET, timestamp: int | None = None) -> str:
    timestamp = timestamp or int(time.time())
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


class TestAcceptedWebhook:
    def test_returns_the_event_as_plain_data(self):
        payload = json.dumps(EVENT).encode()

        event = read_webhook_event(payload, sign(payload))

        assert event["id"] == "evt_test"
        assert event["type"] == "checkout.session.completed"
        # Nested values have to be readable with .get() the way the handler reads them.
        assert event["data"]["object"]["metadata"]["order_id"] == "abc"
        assert event["data"]["object"].get("payment_status") == "paid"


class TestRefusedWebhook:
    def test_a_payload_signed_with_the_wrong_secret_is_refused(self):
        payload = json.dumps(EVENT).encode()

        with pytest.raises(InvalidWebhookSignatureError):
            read_webhook_event(payload, sign(payload, secret="whsec_not_ours"))

    def test_a_tampered_payload_is_refused(self):
        """The signature covers the body, so changing the amount after signing is detected."""
        signature = sign(json.dumps(EVENT).encode())
        tampered = json.dumps({**EVENT, "id": "evt_someone_elses"}).encode()

        with pytest.raises(InvalidWebhookSignatureError):
            read_webhook_event(tampered, signature)

    def test_an_old_signature_is_refused(self):
        """Stripe's check includes a timestamp, so a captured webhook cannot be replayed later."""
        payload = json.dumps(EVENT).encode()
        two_hours_ago = int(time.time()) - 7200

        with pytest.raises(InvalidWebhookSignatureError):
            read_webhook_event(payload, sign(payload, timestamp=two_hours_ago))

    def test_a_missing_signature_is_refused(self):
        payload = json.dumps(EVENT).encode()

        with pytest.raises(InvalidWebhookSignatureError):
            read_webhook_event(payload, "")

    def test_a_malformed_payload_is_refused(self):
        payload = b"not json"

        with pytest.raises(InvalidWebhookSignatureError):
            read_webhook_event(payload, sign(payload))

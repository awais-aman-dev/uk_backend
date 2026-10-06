"""Starting a purchase.

Customers buy as guests: an order records what was bought and at what price, then Stripe's hosted
page takes the money. Nothing is granted here. Access follows from the webhook, once Stripe
confirms the payment, because anything decided in this request could be faked by the caller.
"""

import logging

from django.conf import settings
from django.db import transaction

from apps.billing.models import Order
from apps.billing.pricing import quote
from apps.catalog.models import Package
from apps.integrations import stripe_client

logger = logging.getLogger(__name__)


class FreeOrderNotSupportedError(Exception):
    """The discount covers the whole price, and Stripe cannot take a payment of nothing."""


def start_checkout(
    *,
    package: Package,
    email: str,
    first_name: str = "",
    last_name: str = "",
    promo_code: str = "",
) -> tuple[Order, str]:
    """Create a pending order and a Stripe payment page. Returns the order and where to send the
    customer.

    Raises ``stripe_client.StripeError`` if Stripe cannot be reached; the order is then left
    pending and the customer can try again.
    """
    priced = quote(package, promo_code)
    if priced.is_free:
        # Needs a product decision: either skip Stripe and grant access directly, or stop
        # promo codes from ever reaching 100%. Refusing is the safe default meanwhile.
        raise FreeOrderNotSupportedError

    with transaction.atomic():
        order = Order.objects.create(
            package=package,
            email=email.lower(),
            first_name=first_name,
            last_name=last_name,
            original_price=priced.original_price,
            discount_amount=priced.discount_amount,
            final_price=priced.final_price,
            promo_code=priced.promo_code,
        )

    session = stripe_client.create_checkout_session(
        name=package.name,
        description=f"{package.duration_days}-day access",
        amount=priced.final_price,
        customer_email=order.email,
        reference=str(order.id),
        success_url=f"{settings.FRONTEND_BASE_URL}payment/success?order_id={order.id}",
        cancel_url=f"{settings.FRONTEND_BASE_URL}checkout?order_id={order.id}&cancelled=1",
    )

    order.stripe_session_id = session.id
    order.save(update_fields=["stripe_session_id", "updated_at"])
    logger.info("Started checkout for order %s", order.id)

    return order, session.url

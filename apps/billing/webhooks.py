"""Acting on what Stripe tells us.

This is the only place an order becomes paid: the customer's browser is never trusted for that,
because anyone can call our API and claim to have paid.

Stripe may deliver the same event several times, and two deliveries can arrive at once, so the
handling here has to be safe to repeat. Two things make that true: the event id is recorded, and
the order row is locked while it is read and written.
"""

import logging

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.billing.models import Order, OrderStatus, StripeEvent

logger = logging.getLogger(__name__)

PAID_EVENT = "checkout.session.completed"
FAILED_EVENTS = {
    "checkout.session.expired",
    "checkout.session.async_payment_failed",
}


def handle_event(event: dict) -> None:
    """Process one verified Stripe event. Does nothing if it has been handled already."""
    event_id = event.get("id") or ""
    event_type = event.get("type") or ""

    try:
        with transaction.atomic():
            StripeEvent.objects.create(event_id=event_id, event_type=event_type)
    except IntegrityError:
        # Already recorded, so this is a repeat delivery.
        logger.info("Ignoring Stripe event %s, already handled", event_id)
        return

    session = event.get("data", {}).get("object", {})

    if event_type == PAID_EVENT:
        _mark_paid(session)
    elif event_type in FAILED_EVENTS:
        _mark_failed(session)
    else:
        logger.info("No action needed for Stripe event type %s", event_type)


def _order_id_from(session: dict) -> str:
    """Stripe carries our order id in metadata, with client_reference_id as a fallback."""
    return (session.get("metadata") or {}).get("order_id") or session.get("client_reference_id") or ""


def _mark_paid(session: dict) -> None:
    order_id = _order_id_from(session)
    if not order_id:
        logger.error("Stripe reported a completed payment with no order id")
        return

    # A completed checkout is not necessarily a *paid* one: some payment methods settle later.
    if session.get("payment_status") != "paid":
        logger.info("Checkout for order %s completed but is not paid yet", order_id)
        return

    payment_intent = session.get("payment_intent") or ""

    with transaction.atomic():
        order = Order.objects.select_for_update().filter(pk=order_id).first()
        if order is None:
            logger.error("Stripe reported a payment for unknown order %s", order_id)
            return

        if order.status == OrderStatus.PAID:
            logger.info("Order %s is already paid", order_id)
            return

        if payment_intent and Order.objects.filter(transaction_id=payment_intent).exclude(pk=order.pk).exists():
            logger.error("Payment %s is already credited to another order", payment_intent)
            return

        order.status = OrderStatus.PAID
        order.stripe_payment_intent_id = payment_intent
        # Left as None when Stripe sends no payment id: the column is unique, so storing a blank
        # string would clash with the next such order.
        order.transaction_id = payment_intent or None
        order.paid_at = timezone.now()
        order.save(
            update_fields=[
                "status",
                "stripe_payment_intent_id",
                "transaction_id",
                "paid_at",
                "updated_at",
            ]
        )

    logger.info("Order %s is paid", order_id)

    # Queued only once the transaction has committed, so the worker cannot read the order before
    # the paid status is visible to it.
    transaction.on_commit(lambda: _queue_fulfilment(str(order_id)))


def _queue_fulfilment(order_id: str) -> None:
    """Hand the paid order to a worker, falling back to doing it here if the queue is down.

    The customer has paid, so the work has to happen either way; a slow webhook response is a far
    smaller problem than a purchase that grants nothing.
    """
    from apps.billing.tasks import fulfil_order

    try:
        fulfil_order.delay(order_id)
    except Exception:
        logger.exception("Could not queue fulfilment for order %s, doing it now instead", order_id)
        fulfil_order.apply(args=(order_id,))


def _mark_failed(session: dict) -> None:
    order_id = _order_id_from(session)
    if not order_id:
        return

    # Only a pending order can fail. A paid order is never downgraded, in case events arrive out
    # of order.
    updated = Order.objects.filter(pk=order_id, status=OrderStatus.PENDING).update(
        status=OrderStatus.FAILED, updated_at=timezone.now()
    )
    if updated:
        logger.info("Order %s failed", order_id)

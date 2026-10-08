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

    # The event is recorded before the work, so two deliveries arriving at once cannot both act on
    # it. That leaves the record claiming an event was handled if the work then fails, and Stripe's
    # retry would be discarded as a duplicate — so a failure gives the claim back.
    try:
        if event_type == PAID_EVENT:
            _mark_paid(session)
        elif event_type in FAILED_EVENTS:
            _mark_failed(session)
        else:
            logger.info("No action needed for Stripe event type %s", event_type)
    except Exception:
        logger.exception("Handling Stripe event %s failed; releasing it so Stripe can retry", event_id)
        StripeEvent.objects.filter(event_id=event_id).delete()
        raise


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

    # Run only once the transaction has committed, so fulfilment cannot read the order before the
    # paid status is visible.
    transaction.on_commit(lambda: _fulfil(str(order_id)))


def _fulfil(order_id: str) -> None:
    """Grant the access here, in the webhook, rather than queueing it.

    This used to hand the order to a worker, because fulfilment waited on a mail server. It no
    longer does: the emails are themselves queued, so what is left is a handful of database
    writes. Queueing them bought nothing and cost a great deal — one solo-pool worker drains the
    whole queue in order on the free plan, so granting access sat behind every registration and
    welcome email ahead of it, each able to hold the queue for the length of an SMTP timeout. The
    customer watched a spinner while the thing they had paid for waited its turn behind a mailshot.

    Doing it here makes access live before Stripe is answered, so the storefront's first poll
    after the redirect already sees it.

    Both fallbacks remain, because the customer has paid and the work has to happen: the worker is
    tried if this fails, and the sweeper finds the order either way.
    """
    from apps.billing import fulfilment
    from apps.billing.tasks import fulfil_order

    order = Order.objects.select_related("package").filter(pk=order_id).first()
    if order is None:
        logger.error("Cannot fulfil order %s, which no longer exists", order_id)
        return

    try:
        fulfilment.fulfil(order)
        return
    except Exception:
        logger.exception("Could not fulfil order %s in the webhook, handing it to the worker", order_id)

    try:
        fulfil_order.delay(order_id)
    except Exception:
        # Never silent: without this the purchase would wait for the sweeper with nothing said.
        logger.exception("Could not queue fulfilment for order %s either; it is left to the sweeper", order_id)


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

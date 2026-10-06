"""Background work for payments."""

import logging

from celery import shared_task

from apps.billing import fulfilment
from apps.billing.models import Order

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    # Retry on anything: the customer has paid, so giving up quietly is the worst outcome.
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def fulfil_order(self, order_id: str) -> None:
    """Create the account, grant the access and send the emails for a paid order."""
    order = Order.objects.select_related("package").filter(pk=order_id).first()
    if order is None:
        # Nothing to retry: the order will not appear later.
        logger.error("Cannot fulfil unknown order %s", order_id)
        return

    fulfilment.fulfil(order)

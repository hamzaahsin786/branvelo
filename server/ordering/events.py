"""Realtime order events (Django Channels).

Published from the (sync) HTTP layer after an order is placed or moves.
Two audiences: the tenant's admin feed (group per schema) and the single
order's tracking page (group per order id — the UUID is the capability,
same trust model as the public tracking endpoint).
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

log = logging.getLogger(__name__)


def publish_order_event(schema_name: str, event: str, order_data: dict) -> None:
    layer = get_channel_layer()
    if layer is None:
        return
    message = {"type": "order.event", "event": event, "order": order_data}
    try:
        async_to_sync(layer.group_send)(f"tenant_{schema_name}_orders", message)
        async_to_sync(layer.group_send)(f"order_{order_data['id']}", message)
    except Exception:  # realtime must never break checkout
        log.exception("failed to publish order event %s", event)

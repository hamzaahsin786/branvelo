# Websocket routes (wired into config/asgi.py).
from django.urls import re_path

from ordering.consumers import AdminOrdersConsumer, OrderTrackConsumer

websocket_urlpatterns = [
    re_path(r"ws/admin/orders$", AdminOrdersConsumer.as_asgi()),
    re_path(r"ws/track/(?P<order_id>[0-9a-f-]{36})$", OrderTrackConsumer.as_asgi()),
]

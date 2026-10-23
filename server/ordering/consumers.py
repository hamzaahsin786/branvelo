"""Websocket consumers: the live admin order feed and the live customer
tracking page.

Tenant resolution mirrors the HTTP middleware (hostname -> Domain row),
done by hand here because django-tenants ships no websocket middleware.
Staff auth reuses the same DRF tokens as the REST API, passed as a
`?token=` query parameter (browsers cannot set headers on websockets).
"""
import json

from django.core.serializers.json import DjangoJSONEncoder
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


@database_sync_to_async
def _resolve_tenant(host: str):
    from django.apps import apps
    from django.conf import settings

    Domain = apps.get_model(*settings.TENANT_DOMAIN_MODEL.split("."))
    try:
        domain = Domain.objects.select_related("tenant").get(domain=host)
    except Domain.DoesNotExist:
        return None
    return domain.tenant


@database_sync_to_async
def _staff_schema_for_token(schema_name: str, token: str):
    """Return the schema name if the token belongs to active staff there."""
    from django_tenants.utils import schema_context
    from rest_framework.authtoken.models import Token

    with schema_context(schema_name):
        try:
            tok = Token.objects.select_related("user").get(key=token)
        except Token.DoesNotExist:
            return None
        profile = getattr(tok.user, "staff_profile", None)
        if profile is None or not profile.is_active_staff:
            return None
        return schema_name


@database_sync_to_async
def _order_exists(schema_name: str, order_id: str) -> bool:
    from django_tenants.utils import schema_context

    from ordering.models import Order

    with schema_context(schema_name):
        return Order.objects.filter(pk=order_id).exists()


class AdminOrdersConsumer(AsyncWebsocketConsumer):
    """ws/admin/orders?token=... — every order event for this tenant."""

    async def connect(self):
        headers = dict(self.scope.get("headers") or [])
        host = headers.get(b"host", b"").decode().split(":")[0]
        query = parse_qs(self.scope.get("query_string", b"").decode())
        token = (query.get("token") or [""])[0]
        tenant = await _resolve_tenant(host)
        schema = None
        if tenant is not None and token:
            schema = await _staff_schema_for_token(tenant.schema_name, token)
        if not schema:
            await self.close(code=4401)
            return
        self.group = f"tenant_{schema}_orders"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "group", None):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def order_event(self, event):
        await self.send(text_data=json.dumps({"event": event["event"], "order": event["order"]}, cls=DjangoJSONEncoder))


class OrderTrackConsumer(AsyncWebsocketConsumer):
    """ws/track/<order-uuid> — status changes for one order (public)."""

    async def connect(self):
        headers = dict(self.scope.get("headers") or [])
        host = headers.get(b"host", b"").decode().split(":")[0]
        order_id = self.scope["url_route"]["kwargs"]["order_id"]
        tenant = await _resolve_tenant(host)
        ok = False
        if tenant is not None:
            ok = await _order_exists(tenant.schema_name, order_id)
        if not ok:
            await self.close(code=4404)
            return
        self.group = f"order_{order_id}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "group", None):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def order_event(self, event):
        await self.send(text_data=json.dumps({"event": event["event"], "order": event["order"]}, cls=DjangoJSONEncoder))

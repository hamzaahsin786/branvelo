"""Checkout: the one place orders are created.

Every price is recomputed from the database - client-sent totals are
never trusted. Rules (ported from v1, per docs/04): zone minimums and
free-delivery thresholds, coupon validity window + usage caps, modifier
min/max selection rules.
"""
import re

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from catalog.models import Coupon, Deal, DeliveryZone, MenuItem, ModifierOption
from ordering.events import publish_order_event
from ordering.models import (
    Customer,
    Notification,
    Order,
    OrderCounter,
    OrderStatusHistory,
)
from ordering.serializers import OrderDetailSerializer


class CheckoutError(Exception):
    """A customer-facing checkout problem (HTTP 400)."""


def _normalize_phone(raw: str) -> str:
    phone = re.sub(r"[\s\-()]", "", raw or "")
    if len(re.sub(r"\D", "", phone)) < 10:
        raise CheckoutError("Please enter a valid phone number.")
    return phone


def _price_lines(raw_items):
    """Validate lines against the live menu; return snapshot dicts + subtotal."""
    lines = []
    subtotal = 0
    for raw in raw_items:
        if raw.get("deal_id") is not None:
            # Deal line: priced from the Deal row, contents snapshotted
            # so later deal edits never change a placed order.
            try:
                deal = Deal.objects.get(pk=raw["deal_id"], is_active=True)
            except Deal.DoesNotExist:
                raise CheckoutError("One of the deals is no longer available.")
            qty = raw["qty"]
            lines.append(
                {
                    "deal_id": deal.id,
                    "name": deal.title,
                    "contents": deal.contents,
                    "qty": qty,
                    "unit_price_pkr": deal.price_pkr,
                    "line_total_pkr": deal.price_pkr * qty,
                    "modifiers": [],
                }
            )
            subtotal += deal.price_pkr * qty
            continue
        try:
            item = MenuItem.objects.select_related("category").get(
                pk=raw["item_id"], is_available=True
            )
        except MenuItem.DoesNotExist:
            raise CheckoutError("One of the items is no longer available.")
        groups = list(item.modifier_groups.all()) + list(
            item.category.modifier_groups.all()
        )
        group_by_id = {g.id: g for g in groups}
        chosen_ids = raw.get("modifier_option_ids") or []
        options = []
        if chosen_ids:
            options = list(
                ModifierOption.objects.filter(
                    pk__in=chosen_ids, group__in=groups, is_available=True
                ).select_related("group")
            )
            if len(options) != len(set(chosen_ids)):
                raise CheckoutError(
                    f"Some options for {item.name} are not valid for this item."
                )
        counts: dict[int, int] = {}
        for opt in options:
            counts[opt.group_id] = counts.get(opt.group_id, 0) + 1
        for group in groups:
            n = counts.get(group.id, 0)
            minimum = max(group.min_select, 1 if group.required else 0)
            if n < minimum:
                raise CheckoutError(
                    f"{item.name}: please choose at least {minimum} for {group.name}."
                )
            if n > group.max_select:
                raise CheckoutError(
                    f"{item.name}: you can choose at most {group.max_select} for {group.name}."
                )
        unit_price = item.price_pkr + sum(o.price_delta_pkr for o in options)
        qty = raw["qty"]
        lines.append(
            {
                "item_id": item.id,
                "name": item.name,
                "qty": qty,
                "unit_price_pkr": unit_price,
                "line_total_pkr": unit_price * qty,
                "modifiers": [
                    {
                        "group": o.group.name,
                        "name": o.name,
                        "price_delta_pkr": o.price_delta_pkr,
                    }
                    for o in options
                ],
            }
        )
        subtotal += unit_price * qty
    return lines, subtotal


def _delivery_fee(order_type, zone_id, subtotal):
    if order_type == Order.Type.PICKUP:
        return 0, None
    if not zone_id:
        raise CheckoutError("Please choose a delivery zone.")
    try:
        zone = DeliveryZone.objects.get(pk=zone_id, is_active=True)
    except DeliveryZone.DoesNotExist:
        raise CheckoutError("That delivery zone is not available.")
    if subtotal < zone.min_order_pkr:
        raise CheckoutError(
            f"Minimum order for {zone.name} is Rs {zone.min_order_pkr}."
        )
    if zone.free_above_pkr is not None and subtotal >= zone.free_above_pkr:
        return 0, zone
    return zone.fee_pkr, zone


def _apply_coupon(code, subtotal):
    if not code:
        return 0, None
    try:
        coupon = Coupon.objects.get(code=code.strip().upper(), is_active=True)
    except Coupon.DoesNotExist:
        raise CheckoutError("That coupon code is not valid.")
    now = timezone.now()
    if coupon.valid_from and now < coupon.valid_from:
        raise CheckoutError("That coupon is not active yet.")
    if coupon.valid_to and now > coupon.valid_to:
        raise CheckoutError("That coupon has expired.")
    if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
        raise CheckoutError("That coupon has reached its usage limit.")
    if subtotal < coupon.min_order_pkr:
        raise CheckoutError(
            f"This coupon needs a minimum order of Rs {coupon.min_order_pkr}."
        )
    if coupon.type == Coupon.Type.PERCENT:
        discount = subtotal * coupon.value // 100
    else:
        discount = min(coupon.value, subtotal)
    return discount, coupon


@transaction.atomic
def place_order(data: dict, *, schema_name: str) -> Order:
    phone = _normalize_phone(data["customer_phone"])
    lines, subtotal = _price_lines(data["items"])
    delivery_fee, _zone = _delivery_fee(data["type"], data.get("zone_id"), subtotal)
    discount, coupon = _apply_coupon(data.get("coupon_code") or "", subtotal)
    total = subtotal - discount + delivery_fee

    customer, _created = Customer.objects.get_or_create(phone=phone)
    customer.name = data["customer_name"]
    address = (data.get("customer_address") or "").strip()
    if address and address not in customer.addresses:
        customer.addresses = [*customer.addresses, address][-5:]
    customer.last_order_at = timezone.now()
    customer.save()

    counter, _c = OrderCounter.objects.select_for_update().get_or_create(
        name="order"
    )
    counter.value += 1
    counter.save(update_fields=["value"])

    order = Order.objects.create(
        order_no=counter.value,
        customer=customer,
        customer_name=data["customer_name"],
        customer_phone=phone,
        customer_address=address,
        type=data["type"],
        items=lines,
        subtotal_pkr=subtotal,
        delivery_fee_pkr=delivery_fee,
        discount_pkr=discount,
        total_pkr=total,
        coupon_code=coupon.code if coupon else None,
        payment_method=data["payment_method"],
        scheduled_for=data.get("scheduled_for"),
    )
    if coupon is not None:
        Coupon.objects.filter(pk=coupon.pk).update(used_count=F("used_count") + 1)
    OrderStatusHistory.objects.create(
        order=order, from_status=None, to_status=Order.Status.PLACED,
        actor="customer",
    )
    Notification.objects.create(
        channel=Notification.Channel.DASHBOARD,
        payload={
            "kind": "order.placed",
            "order_id": str(order.id),
            "order_no": order.order_no,
            "customer_name": order.customer_name,
            "total_pkr": order.total_pkr,
        },
    )
    payload = OrderDetailSerializer(order).data
    transaction.on_commit(
        lambda: publish_order_event(schema_name, "order.created", payload)
    )
    return order


# --- Status machine ------------------------------------------------------------
# Who may move an order, and to where. Kitchen never delivers; riders never
# cancel; cancellation closes once the food has left.
TRANSITIONS: dict[str, dict[str, set[str]]] = {
    Order.Status.PLACED: {
        Order.Status.CONFIRMED: {"owner", "manager", "cashier"},
        Order.Status.CANCELLED: {"owner", "manager"},
    },
    Order.Status.CONFIRMED: {
        Order.Status.PREPARING: {"owner", "manager", "kitchen"},
        Order.Status.CANCELLED: {"owner", "manager"},
    },
    Order.Status.PREPARING: {
        Order.Status.READY: {"owner", "manager", "kitchen"},
        Order.Status.CANCELLED: {"owner", "manager"},
    },
    Order.Status.READY: {
        Order.Status.DISPATCHED: {"owner", "manager", "cashier", "rider"},
        Order.Status.DELIVERED: {"owner", "manager", "cashier"},
        Order.Status.CANCELLED: {"owner", "manager"},
    },
    Order.Status.DISPATCHED: {
        Order.Status.DELIVERED: {"owner", "manager", "rider"},
    },
    Order.Status.DELIVERED: {},
    Order.Status.CANCELLED: {},
}


class TransitionError(Exception):
    """Invalid or forbidden status move (HTTP 400/403 by message)."""


def transition_order(order: Order, to_status: str, *, role: str, actor: str,
                     schema_name: str) -> Order:
    allowed = TRANSITIONS.get(order.status, {})
    roles = allowed.get(to_status)
    if roles is None:
        raise TransitionError(
            f"An order that is {order.status} cannot move to {to_status}."
        )
    if role not in roles:
        raise TransitionError(
            f"Your role ({role}) cannot move an order to {to_status}."
        )
    with transaction.atomic():
        previous = order.status
        order.status = to_status
        order.save(update_fields=["status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order, from_status=previous, to_status=to_status, actor=actor,
        )
        payload = OrderDetailSerializer(order).data
        transaction.on_commit(
            lambda: publish_order_event(schema_name, "order.updated", payload)
        )
    return order

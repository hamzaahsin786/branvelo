"""Ordering models, per tenant schema (docs/04 section 2).

Orders keep full line-item SNAPSHOTS as JSONB: a menu edit tomorrow must
never rewrite what a customer actually ordered yesterday.
"""
import uuid

from django.conf import settings
from django.db import models


class Customer(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120, blank=True)
    addresses = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_order_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "customers"

    def __str__(self):
        return f"{self.name or 'Customer'} ({self.phone})"


class OrderCounter(models.Model):
    """Single-row counter for human-friendly per-tenant order numbers.
    Incremented inside the placement transaction with select_for_update,
    so concurrent checkouts can never share a number."""

    name = models.CharField(max_length=16, primary_key=True, default="order")
    value = models.IntegerField(default=0)

    class Meta:
        db_table = "order_counter"


class Order(models.Model):
    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        CONFIRMED = "confirmed", "Confirmed"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        DISPATCHED = "dispatched", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class Type(models.TextChoices):
        DELIVERY = "delivery", "Delivery"
        PICKUP = "pickup", "Pickup"

    class Payment(models.TextChoices):
        COD = "cod", "Cash on delivery"
        JAZZCASH = "jazzcash", "JazzCash"
        EASYPAISA = "easypaisa", "EasyPaisa"

    class Source(models.TextChoices):
        WEB = "web", "Web"
        POS = "pos", "POS"
        KIOSK = "kiosk", "Kiosk"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_no = models.IntegerField(unique=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="orders",
    )
    # Snapshots: kept even if the customer record changes or is deleted.
    customer_name = models.CharField(max_length=120)
    customer_phone = models.CharField(max_length=20)
    customer_address = models.TextField(blank=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.DELIVERY)
    items = models.JSONField(default=list)
    subtotal_pkr = models.IntegerField(default=0)
    delivery_fee_pkr = models.IntegerField(default=0)
    discount_pkr = models.IntegerField(default=0)
    total_pkr = models.IntegerField(default=0)
    coupon_code = models.CharField(max_length=32, null=True, blank=True)
    payment_method = models.CharField(
        max_length=16, choices=Payment.choices, default=Payment.COD,
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PLACED,
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.WEB)
    # Rider assignment: the staff user (role "rider") taking this delivery,
    # plus a name snapshot so history survives account changes.
    assigned_rider = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_orders",
    )
    rider_name = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.order_no} ({self.status}) Rs {self.total_pkr}"


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="history",
    )
    from_status = models.CharField(max_length=16, null=True, blank=True)
    to_status = models.CharField(max_length=16)
    actor = models.CharField(
        max_length=120, help_text="Staff username, or 'customer' / 'system'.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_status_history"
        ordering = ["created_at"]


class Feedback(models.Model):
    class Type(models.TextChoices):
        COMPLAINT = "complaint", "Complaint"
        PRAISE = "praise", "Praise"
        SUGGESTION = "suggestion", "Suggestion"

    class Status(models.TextChoices):
        NEW = "new", "New"
        SEEN = "seen", "Seen"
        RESOLVED = "resolved", "Resolved"

    order = models.ForeignKey(
        Order, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="feedback",
    )
    type = models.CharField(max_length=12, choices=Type.choices, default=Type.SUGGESTION)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback"
        ordering = ["-created_at"]


class Notification(models.Model):
    """Queued outbound notifications. Written by the ordering flow;
    dispatched by the Phase 6 worker (dashboard rows are visible in the
    admin instantly; external channels plug in behind the dispatcher)."""

    class Channel(models.TextChoices):
        DASHBOARD = "dashboard", "Dashboard"
        WHATSAPP = "whatsapp", "WhatsApp"
        SMS = "sms", "SMS"
        EMAIL = "email", "Email"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    channel = models.CharField(max_length=10, choices=Channel.choices)
    payload = models.JSONField(default=dict)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.QUEUED)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

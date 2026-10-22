"""Control-layer models (public schema only).

One row in `tenants` = one restaurant = one PostgreSQL schema, created by
django-tenants. Everything here is Branvelo-the-platform's data; restaurant
data lives in the per-tenant apps (accounts, catalog, ordering).
Spec: docs/04-db-design-v2.md section 1.
"""
import uuid

from django.db import models
from django_tenants.models import DomainMixin, TenantMixin


class Plan(models.Model):
    """A subscription plan. v1 of the product sells exactly one flat plan;
    the table exists so pricing never needs a schema change."""

    code = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=60)
    price_monthly_pkr = models.IntegerField(default=0, help_text="0 = custom")
    max_branches = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "plans"

    def __str__(self):
        return f"{self.name} ({self.code})"


class Tenant(TenantMixin):
    """The tenant control record. `schema_name` is the PostgreSQL schema;
    `slug` is the subdomain label. Both are immutable after creation."""

    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.CharField(max_length=63, unique=True)
    owner_name = models.CharField(max_length=120)
    owner_email = models.EmailField(max_length=254, unique=True)
    owner_phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=80, blank=True)
    plan = models.ForeignKey(
        Plan, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="tenants",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.TRIAL,
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # django-tenants: create (and migrate) the schema automatically when a
    # tenant row is saved; never drop a schema implicitly.
    auto_create_schema = True
    auto_drop_schema = False

    class Meta:
        db_table = "tenants"

    def __str__(self):
        return f"{self.name} [{self.schema_name}]"


class Domain(DomainMixin):
    """A hostname that routes to a tenant (subdomain or custom domain)."""

    class Meta:
        db_table = "domains"

    def __str__(self):
        return self.domain


class Subscription(models.Model):
    """Billing state for a tenant. The tenant's current plan also sits on
    the Tenant row for fast reads; this table is the history + periods."""

    class Status(models.TextChoices):
        TRIALING = "trialing", "Trialing"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELLED = "cancelled", "Cancelled"

    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="subscriptions",
    )
    plan = models.ForeignKey(
        Plan, on_delete=models.PROTECT, related_name="subscriptions",
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.TRIALING,
    )
    current_period_start = models.DateField(null=True, blank=True)
    current_period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.tenant.slug} -> {self.plan.code} ({self.status})"


class AuditLog(models.Model):
    """Append-only platform audit trail. `tenant_id` is a plain UUID (not
    an FK) so the log survives tenant deletion."""

    actor = models.CharField(max_length=120, help_text="Staff email or 'system'")
    action = models.CharField(max_length=80)
    tenant_id = models.UUIDField(null=True, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "platform_audit_log"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.actor} {self.action}"

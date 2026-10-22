"""Tenant provisioning: the one code path that creates a restaurant.

Used by the Phase 2 management command now, and by the public signup API
in Phase 3. Keeping it here means signup can never drift from the manual
path. Flow per docs/04-db-design-v2.md section 4.
"""
import re

from django.conf import settings
from django.db import transaction
from django_tenants.utils import tenant_context

from tenants_app.models import AuditLog, Domain, Plan, Tenant

_SLUG_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")


def schema_name_for_slug(slug: str) -> str:
    """Postgres schema names: lowercase, underscores, max 63 chars."""
    return slug.replace("-", "_")[:63]


def create_tenant(
    *,
    name: str,
    slug: str,
    owner_name: str,
    owner_email: str,
    owner_phone: str = "",
    city: str = "",
    plan: Plan | None = None,
    domain_suffix: str | None = None,
) -> Tenant:
    """Create the control row (+schema, +primary domain, +profile seed).

    Saving the Tenant triggers django-tenants to create the schema and run
    all TENANT_APPS migrations into it. The restaurant profile seed runs
    inside that tenant's context immediately after.
    """
    slug = slug.strip().lower()
    if not _SLUG_RE.match(slug) or len(slug) > 63:
        raise ValueError(
            f"Invalid slug {slug!r}: lowercase letters, digits and hyphens, "
            "starting and ending with a letter or digit."
        )
    if Tenant.objects.filter(slug=slug).exists():
        raise ValueError(f"Slug {slug!r} is already taken.")
    suffix = domain_suffix or getattr(
        settings, "PLATFORM_DOMAIN_SUFFIX", "branvelo.com"
    )

    with transaction.atomic():
        tenant = Tenant(
            schema_name=schema_name_for_slug(slug),
            name=name,
            slug=slug,
            owner_name=owner_name,
            owner_email=owner_email,
            owner_phone=owner_phone,
            city=city,
            plan=plan,
            status=Tenant.Status.TRIAL,
        )
        tenant.save()  # schema is created + tenant apps migrated here

        Domain.objects.create(
            tenant=tenant, domain=f"{slug}.{suffix}", is_primary=True,
        )
        AuditLog.objects.create(
            actor="system",
            action="tenant.created",
            tenant_id=tenant.id,
            detail={"slug": slug, "domain": f"{slug}.{suffix}"},
        )

    # Seed the single-row restaurant profile inside the new schema.
    from catalog.models import RestaurantProfile

    with tenant_context(tenant):
        RestaurantProfile.objects.get_or_create(
            defaults={
                "name": name,
                "phone": owner_phone,
                "city": city,
            }
        )
    return tenant

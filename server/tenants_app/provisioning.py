"""Tenant provisioning: the one code path that creates a restaurant.

Used by the signup API (Phase 3) and the `provision_tenant` CLI alike, so
the two can never drift. Flow per docs/04-db-design-v2.md section 4:
control row -> schema (auto) -> domain -> subscription -> seed
(profile + theme, opening hours, owner staff account).
"""
import datetime
import re

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django_tenants.utils import tenant_context

from tenants_app.models import AuditLog, Domain, Plan, Subscription, Tenant

_SLUG_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")

# Subdomains the platform keeps for itself; a restaurant can never take one.
RESERVED_SLUGS = {
    "platform", "admin", "api", "www", "app", "support", "help", "blog",
    "mail", "status", "billing", "login", "signup", "localhost", "branvelo",
}

TRIAL_DAYS = 14

# Sensible Lahore defaults (11:00-23:00 every day); owners edit them later.
DEFAULT_HOURS = [(day, datetime.time(11, 0), datetime.time(23, 0)) for day in range(7)]


def schema_name_for_slug(slug: str) -> str:
    """Postgres schema names: lowercase, underscores, max 63 chars."""
    return slug.replace("-", "_")[:63]


def validate_slug(slug: str) -> str:
    """Return the normalized slug or raise ValueError with a user-facing
    message. Single source of truth: the signup API's availability check
    uses this too."""
    slug = (slug or "").strip().lower()
    if not _SLUG_RE.match(slug) or len(slug) > 63:
        raise ValueError(
            "Web address can only use lowercase letters, digits and hyphens, "
            "and must start and end with a letter or digit."
        )
    if slug in RESERVED_SLUGS:
        raise ValueError("That web address is reserved by Branvelo.")
    return slug


def slug_available(slug: str) -> bool:
    try:
        slug = validate_slug(slug)
    except ValueError:
        return False
    return not Tenant.objects.filter(slug=slug).exists()


def create_tenant(
    *,
    name: str,
    slug: str,
    owner_name: str,
    owner_email: str,
    owner_password: str | None = None,
    owner_phone: str = "",
    city: str = "",
    plan: Plan | None = None,
    theme: dict | None = None,
    domain_suffix: str | None = None,
) -> Tenant:
    """Create the control row (+schema, +domain, +subscription, +seed).

    Saving the Tenant triggers django-tenants to create the schema and run
    all TENANT_APPS migrations into it. Seeds then run inside that tenant's
    context: restaurant profile (with theme), default opening hours, and
    the owner staff account the owner signs in with.
    """
    slug = validate_slug(slug)
    if Tenant.objects.filter(slug=slug).exists():
        raise ValueError("That web address is already taken.")
    if Tenant.objects.filter(owner_email__iexact=owner_email).exists():
        raise ValueError("An account with this email already exists.")
    suffix = domain_suffix or getattr(
        settings, "PLATFORM_DOMAIN_SUFFIX", "branvelo.com"
    )
    if plan is None:
        plan = Plan.objects.filter(code="starter", is_active=True).first()

    now = timezone.now()
    trial_end = now + datetime.timedelta(days=TRIAL_DAYS)

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
            trial_ends_at=trial_end,
        )
        tenant.save()  # schema is created + tenant apps migrated here

        Domain.objects.create(
            tenant=tenant, domain=f"{slug}.{suffix}", is_primary=True,
        )
        if plan is not None:
            Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=Subscription.Status.TRIALING,
                current_period_start=now.date(),
                current_period_end=trial_end.date(),
            )
        AuditLog.objects.create(
            actor="system",
            action="tenant.created",
            tenant_id=tenant.id,
            detail={
                "slug": slug,
                "domain": f"{slug}.{suffix}",
                "trial_ends_at": trial_end.isoformat(),
            },
        )

    _seed_tenant(
        tenant, owner_name=owner_name, owner_email=owner_email,
        owner_password=owner_password, owner_phone=owner_phone,
        city=city, name=name, theme=theme,
    )
    return tenant


def _seed_tenant(tenant, *, owner_name, owner_email, owner_password,
                 owner_phone, city, name, theme):
    from django.contrib.auth import get_user_model

    from accounts.models import StaffUser
    from catalog.models import OpeningHours, RestaurantProfile

    with tenant_context(tenant):
        profile_theme = dict(theme) if theme else None
        if profile_theme is None:
            RestaurantProfile.objects.get_or_create(
                defaults={"name": name, "phone": owner_phone, "city": city}
            )
        else:
            RestaurantProfile.objects.get_or_create(
                defaults={
                    "name": name, "phone": owner_phone, "city": city,
                    "theme": profile_theme,
                }
            )
        for weekday, opens, closes in DEFAULT_HOURS:
            OpeningHours.objects.get_or_create(
                weekday=weekday,
                defaults={"open_time": opens, "close_time": closes},
            )
        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=owner_email,
            defaults={"email": owner_email, "first_name": owner_name},
        )
        if created:
            if owner_password:
                user.set_password(owner_password)
            else:
                user.set_unusable_password()
            user.save()
        StaffUser.objects.get_or_create(
            user=user,
            defaults={
                "role": StaffUser.Role.OWNER,
                "phone": owner_phone,
            },
        )

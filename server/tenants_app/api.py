"""Public platform API (served from the public schema): restaurant signup
and slug availability. These endpoints are how the marketing site's signup
form creates a tenant - they call the same provisioning function as the
`provision_tenant` CLI.
"""
import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django_tenants.utils import schema_context
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from catalog.models import DEFAULT_THEME
from tenants_app import provisioning
from tenants_app.models import Tenant

HANDOFF_SALT = "branvelo.platform-handoff"
HANDOFF_MAX_AGE = 120  # seconds; the browser redirect is immediate

_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
_FONTS = {"nunito", "poppins", "inter"}
_LAYOUTS = {"classic", "grid", "minimal"}


def _clean_theme(raw) -> dict:
    """Merge a user-supplied theme over the platform defaults, keeping only
    the bounded token set (docs/01 guardrail 1). Unknown or invalid values
    fall back to defaults instead of failing the signup."""
    theme = {**DEFAULT_THEME, "sections": dict(DEFAULT_THEME["sections"])}
    if not isinstance(raw, dict):
        return theme
    if isinstance(raw.get("primary"), str) and _HEX.match(raw["primary"]):
        theme["primary"] = raw["primary"]
    if isinstance(raw.get("accent"), str) and _HEX.match(raw["accent"]):
        theme["accent"] = raw["accent"]
    if raw.get("font") in _FONTS:
        theme["font"] = raw["font"]
    if raw.get("layout") in _LAYOUTS:
        theme["layout"] = raw["layout"]
    sections = raw.get("sections")
    if isinstance(sections, dict):
        for key in theme["sections"]:
            if isinstance(sections.get(key), bool):
                theme["sections"][key] = sections[key]
    return theme


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    slug = serializers.CharField(max_length=63)
    owner_name = serializers.CharField(max_length=120)
    owner_email = serializers.EmailField()
    owner_phone = serializers.CharField(max_length=20, required=False, default="")
    city = serializers.CharField(max_length=80, required=False, default="")
    password = serializers.CharField(min_length=8, max_length=128, write_only=True)
    theme = serializers.DictField(required=False)


class SignupView(APIView):
    """POST /api/platform/signup - create a restaurant (tenant + schema +
    domain + trial subscription + owner account + seeded profile)."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "signup"

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            tenant = provisioning.create_tenant(
                name=data["name"],
                slug=data["slug"],
                owner_name=data["owner_name"],
                owner_email=data["owner_email"],
                owner_password=data["password"],
                owner_phone=data["owner_phone"],
                city=data["city"],
                theme=_clean_theme(data.get("theme")),
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        domain = tenant.domains.get(is_primary=True).domain
        suffix = getattr(settings, "PLATFORM_DOMAIN_SUFFIX", "branvelo.com")
        storefront = (
            f"http://{domain}:3000"
            if suffix == "localhost"
            else f"https://{domain}"
        )
        return Response(
            {
                "slug": tenant.slug,
                "domain": domain,
                "storefront_url": storefront,
                "status": tenant.status,
                "trial_ends_at": tenant.trial_ends_at,
            },
            status=status.HTTP_201_CREATED,
        )


class SlugCheckView(APIView):
    """GET /api/platform/slug-check?slug=foo - live availability for the
    signup form. Always 200; the payload carries the verdict."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "slug_check"

    def get(self, request):
        slug = request.query_params.get("slug", "")
        try:
            normalized = provisioning.validate_slug(slug)
        except ValueError as exc:
            return Response(
                {"slug": slug, "available": False, "reason": str(exc)}
            )
        if not provisioning.slug_available(normalized):
            return Response(
                {
                    "slug": normalized,
                    "available": False,
                    "reason": "That web address is already taken.",
                }
            )
        return Response({"slug": normalized, "available": True})


class PlatformLoginView(APIView):
    """POST /api/platform/login {email, password} -> {slug, handoff}.

    Central sign-in for restaurant OWNERS on the platform site. The email
    identifies the tenant (owner_email is unique platform-wide); the
    password is checked against the owner account inside that tenant's
    schema. On success the browser is sent to the tenant subdomain with a
    short-lived signed handoff, which /api/staff/exchange swaps for the
    normal staff token. Every failure returns the same generic message so
    the endpoint cannot be used to probe which emails have accounts.
    Staff (manager/cashier/kitchen/rider) sign in on the restaurant's own
    address as before: the platform cannot know their tenant from an
    email alone.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "platform_login"

    def post(self, request):
        failure = Response(
            {"detail": "Invalid email or password."},
            status=status.HTTP_400_BAD_REQUEST,
        )
        email = request.data.get("email")
        password = request.data.get("password")
        if not isinstance(email, str) or not isinstance(password, str):
            return failure
        email = email.strip().lower()
        if not email or not password:
            return failure
        tenant = Tenant.objects.filter(owner_email__iexact=email).first()
        if tenant is None:
            return failure
        with schema_context(tenant.schema_name):
            user = (
                get_user_model()
                .objects.filter(username__iexact=email)
                .first()
            )
            if (
                user is None
                or not user.is_active
                or not user.check_password(password)
            ):
                return failure
            profile = getattr(user, "staff_profile", None)
            if (
                profile is None
                or not profile.is_active_staff
                or profile.role != "owner"
            ):
                return failure
            handoff = signing.dumps(
                {"t": tenant.schema_name, "u": user.pk},
                salt=HANDOFF_SALT,
            )
        return Response({"slug": tenant.slug, "handoff": handoff})

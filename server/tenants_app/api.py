"""Public platform API (served from the public schema): restaurant signup
and slug availability. These endpoints are how the marketing site's signup
form creates a tenant — they call the same provisioning function as the
`provision_tenant` CLI.
"""
import re

from django.conf import settings
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from catalog.models import DEFAULT_THEME
from tenants_app import provisioning

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
    """POST /api/platform/signup — create a restaurant (tenant + schema +
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
    """GET /api/platform/slug-check?slug=foo — live availability for the
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

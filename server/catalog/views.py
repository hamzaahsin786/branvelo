"""Catalog API views.

Staff side (token auth, role-gated writes): full CRUD for everything in
the tenant's catalog + menu photo upload. Public side: the single payload
the storefront renders from (profile, theme, hours, menu, zones).
"""
import uuid
from datetime import time
from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.db.models import ProtectedError
from rest_framework import status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffWriter
from catalog.models import (
    Branch,
    Category,
    Coupon,
    Deal,
    DeliveryZone,
    MenuItem,
    ModifierGroup,
    ModifierOption,
    OpeningHours,
    RestaurantProfile,
)
from catalog.serializers import (
    BranchSerializer,
    CategorySerializer,
    CouponSerializer,
    DealSerializer,
    DeliveryZoneSerializer,
    MenuItemSerializer,
    ModifierGroupSerializer,
    ModifierOptionSerializer,
)


class _StaffViewSet(viewsets.ModelViewSet):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffWriter]


class CategoryViewSet(_StaffViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "This category still has items. Move or delete them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class MenuItemViewSet(_StaffViewSet):
    queryset = MenuItem.objects.select_related("category").prefetch_related(
        "modifier_groups__options"
    )
    serializer_class = MenuItemSerializer


class ModifierGroupViewSet(_StaffViewSet):
    queryset = ModifierGroup.objects.prefetch_related("options")
    serializer_class = ModifierGroupSerializer


class ModifierOptionViewSet(_StaffViewSet):
    queryset = ModifierOption.objects.all()
    serializer_class = ModifierOptionSerializer


class DeliveryZoneViewSet(_StaffViewSet):
    queryset = DeliveryZone.objects.all()
    serializer_class = DeliveryZoneSerializer


class BranchViewSet(_StaffViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer


class CouponViewSet(_StaffViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer


class DealViewSet(_StaffViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer


_ALLOWED_PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
_MAX_PHOTO_BYTES = 5 * 1024 * 1024


class PhotoUploadView(APIView):
    """POST /api/staff/catalog/upload-photo (multipart, field: file).
    Stores under MEDIA_ROOT/menu/ and returns the public URL."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffWriter]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response(
                {"error": "No file received (field name: file)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = Path(upload.name).suffix.lower()
        if ext not in _ALLOWED_PHOTO_EXTS:
            return Response(
                {"error": "Photo must be a JPG, PNG, WEBP or GIF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > _MAX_PHOTO_BYTES:
            return Response(
                {"error": "Photo is larger than 5 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        name = f"menu/{uuid.uuid4().hex}{ext}"
        saved = default_storage.save(name, upload)
        url = request.build_absolute_uri(settings.MEDIA_URL + saved)
        return Response({"url": url}, status=status.HTTP_201_CREATED)


def _cover_slides(profile):
    """Effective banner slides: the saved list, or the single legacy
    cover_url when no list was ever saved."""
    slides = [
        s.strip()
        for s in (profile.cover_photos or [])
        if isinstance(s, str) and s.strip()
    ]
    if not slides and profile.cover_url:
        slides = [profile.cover_url]
    return slides


def _clean_cover_photos(raw):
    """Validate an incoming slides list: strings only, trimmed, capped."""
    cleaned = []
    for entry in raw:
        if not isinstance(entry, str):
            continue
        value = entry.strip()[:500]
        if value and value not in cleaned:
            cleaned.append(value)
        if len(cleaned) >= 6:
            break
    return cleaned


class StaffProfileView(APIView):
    """GET/PATCH /api/staff/catalog/profile - the settings page's data:
    restaurant profile, opening hours and theme in one payload. The
    profile row is created at signup, one per tenant. Theme updates go
    through the platform's single theme cleaner (tenants_app.api), so
    the bounded token set is enforced here exactly as at signup."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffWriter]

    def _payload(self, profile):
        return {
            "name": profile.name,
            "logo_url": profile.logo_url,
            "cover_url": profile.cover_url,
            "cover_photos": _cover_slides(profile),
            "phone": profile.phone,
            "address": profile.address,
            "city": profile.city,
            "announcement": profile.announcement,
            "is_open": profile.is_open,
            "theme": profile.theme,
            "tax_country": profile.tax_country,
            "tax_rate_percent": profile.tax_rate_percent,
            "tax_digital_rate_percent": profile.tax_digital_rate_percent,
            "tax_name": profile.tax_name,
            "tax_on_delivery": profile.tax_on_delivery,
            "seo_text": profile.seo_text,
            "hours": [
                {
                    "weekday": row.weekday,
                    "open_time": row.open_time.strftime("%H:%M"),
                    "close_time": row.close_time.strftime("%H:%M"),
                    "is_closed": row.is_closed,
                }
                for row in OpeningHours.objects.all()
            ],
        }

    def _profile_or_none(self):
        return RestaurantProfile.objects.first()

    def get(self, request):
        profile = self._profile_or_none()
        if profile is None:
            return Response(
                {"error": "Restaurant profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self._payload(profile))

    def patch(self, request):
        profile = self._profile_or_none()
        if profile is None:
            return Response(
                {"error": "Restaurant profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = request.data
        limits = {
            "name": 120,
            "phone": 20,
            "city": 80,
            "address": None,
            "announcement": None,
            "logo_url": 200,
            "cover_url": 500,
            "tax_country": 2,
            "tax_name": 20,
            "seo_text": None,
        }
        if "tax_rate_percent" in data:
            try:
                profile.tax_rate_percent = (
                    None if data["tax_rate_percent"] in (None, "")
                    else max(0, min(100, float(data["tax_rate_percent"])))
                )
            except (TypeError, ValueError):
                pass
        if "tax_digital_rate_percent" in data:
            try:
                profile.tax_digital_rate_percent = (
                    None if data["tax_digital_rate_percent"] in (None, "")
                    else max(0, min(100, float(data["tax_digital_rate_percent"])))
                )
            except (TypeError, ValueError):
                pass
        if "tax_on_delivery" in data and isinstance(data["tax_on_delivery"], bool):
            profile.tax_on_delivery = data["tax_on_delivery"]
        for field, limit in limits.items():
            if field in data and isinstance(data[field], str):
                value = data[field].strip()
                if field == "name" and not value:
                    continue
                setattr(profile, field, value[:limit] if limit else value)
        if "is_open" in data and isinstance(data["is_open"], bool):
            profile.is_open = data["is_open"]
        if "cover_photos" in data and isinstance(data["cover_photos"], list):
            # Runs after the plain cover_url handling above on purpose:
            # the slides list wins, and cover_url mirrors its first slide.
            profile.cover_photos = _clean_cover_photos(data["cover_photos"])
            profile.cover_url = (
                profile.cover_photos[0] if profile.cover_photos else ""
            )
        if "theme" in data:
            from tenants_app.api import _clean_theme

            profile.theme = _clean_theme(data["theme"])
        profile.save()
        hours = data.get("hours")
        if isinstance(hours, list):
            for row in hours:
                if not isinstance(row, dict):
                    continue
                weekday = row.get("weekday")
                if not isinstance(weekday, int) or not 0 <= weekday <= 6:
                    continue
                defaults = {"is_closed": bool(row.get("is_closed", False))}
                for key in ("open_time", "close_time"):
                    raw = row.get(key)
                    if isinstance(raw, str):
                        try:
                            defaults[key] = time.fromisoformat(raw)
                        except ValueError:
                            pass
                OpeningHours.objects.update_or_create(
                    weekday=weekday, defaults=defaults
                )
        return Response(self._payload(profile))


class StorefrontView(APIView):
    """GET /api/storefront/ - everything the storefront page renders, in
    one payload. The tenant comes from the request hostname; the public
    schema has no storefront."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None or tenant.schema_name == "public":
            return Response(
                {"detail": "No restaurant at this address."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile = RestaurantProfile.objects.first()
        if profile is None:
            return Response(
                {"detail": "This restaurant has not finished setup."},
                status=status.HTTP_404_NOT_FOUND,
            )
        hours = [
            {
                "weekday": h.weekday,
                "open": h.open_time.strftime("%H:%M") if h.open_time else None,
                "close": h.close_time.strftime("%H:%M") if h.close_time else None,
                "is_closed": h.is_closed,
            }
            for h in OpeningHours.objects.all()
        ]
        categories = Category.objects.filter(is_active=True).prefetch_related(
            "items", "items__modifier_groups__options", "modifier_groups__options"
        )
        cat_payload = []
        for cat in categories:
            entry = CategorySerializer(cat).data
            items = []
            for item in cat.items.all():
                if not item.is_available:
                    continue
                data = MenuItemSerializer(item).data
                # Category-level modifier groups apply to every item too.
                seen = {g["id"] for g in data["modifier_groups"]}
                for group in cat.modifier_groups.all():
                    if group.id not in seen:
                        data["modifier_groups"].append(
                            ModifierGroupSerializer(group).data
                        )
                items.append(data)
            entry["items"] = items
            cat_payload.append(entry)
        zones = DeliveryZoneSerializer(
            DeliveryZone.objects.filter(is_active=True), many=True
        ).data
        branches = BranchSerializer(
            Branch.objects.filter(is_active=True), many=True
        ).data
        # Most ordered right now: count item quantities across recent
        # orders (the line snapshots carry item_id), top 4 with photos.
        from collections import Counter
        from datetime import timedelta

        from django.utils import timezone

        from ordering.models import Order

        counts: Counter = Counter()
        recent = Order.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=90),
            status__in=[
                Order.Status.PLACED, Order.Status.CONFIRMED,
                Order.Status.PREPARING, Order.Status.READY,
                Order.Status.DISPATCHED, Order.Status.DELIVERED,
            ],
        ).values_list("items", flat=True)[:200]
        recent_items = list(recent)
        for lines in recent_items:
            for line in lines or []:
                if line.get("item_id") is not None:
                    counts[line["item_id"]] += line.get("qty", 1)
        # Bought-together map: for each item, the items most often
        # ordered in the SAME order as it. One vote per order per pair
        # (quantities ignored, so a bulk order cannot skew it), and
        # cancelled orders are excluded by the status filter above.
        # This is what the cart's "Frequently bought with this" rail
        # ranks by - real buying behaviour, not staff-set badges.
        pairs: dict[int, Counter] = {}
        for lines in recent_items:
            ids = {
                line["item_id"]
                for line in (lines or [])
                if line.get("item_id") is not None
            }
            for i in ids:
                for j in ids:
                    if i != j:
                        pairs.setdefault(i, Counter())[j] += 1
        bought_together = {
            str(item_id): [
                {"id": partner, "count": c}
                for partner, c in pairs_counter.most_common(4)
            ]
            for item_id, pairs_counter in pairs.items()
        }
        popular_items = []
        if counts:
            top = MenuItem.objects.filter(
                pk__in=[pk for pk, _ in counts.most_common(4)],
                is_available=True,
            )
            by_id = {item.pk: item for item in top}
            for pk, qty in counts.most_common(4):
                item = by_id.get(pk)
                if item is not None:
                    popular_items.append(
                        {
                            "id": item.id,
                            "name": item.name,
                            "price_pkr": item.price_pkr,
                            "photo_url": item.photo_url,
                            "ordered_qty": qty,
                        }
                    )
        from catalog.tax_rules import COUNTRY_TAX_RULES

        rule = COUNTRY_TAX_RULES.get(
            (profile.tax_country or "PK").upper(), COUNTRY_TAX_RULES["PK"]
        )
        return Response(
            {
                "profile": {
                    "name": profile.name,
                    "logo_url": profile.logo_url,
                    "cover_url": profile.cover_url,
                    "cover_photos": _cover_slides(profile),
                    "phone": profile.phone,
                    "address": profile.address,
                    "city": profile.city,
                    "announcement": profile.announcement,
                    "is_open": profile.is_open,
                    "theme": profile.theme,
                    "seo_text": profile.seo_text,
                    "tax": {
                        "country": (profile.tax_country or "PK").upper(),
                        "name": profile.tax_name or rule[0],
                        "standard_rate": (
                            profile.tax_rate_percent
                            if profile.tax_rate_percent is not None
                            else rule[1]
                        ),
                        "digital_rate": (
                            profile.tax_digital_rate_percent
                            if profile.tax_digital_rate_percent is not None
                            else rule[2]
                        ),
                        "on_delivery": profile.tax_on_delivery,
                    },
                },
                "hours": hours,
                "categories": cat_payload,
                "deals": DealSerializer(
                    Deal.objects.filter(is_active=True), many=True
                ).data,
                "zones": zones,
                "branches": branches,
                "popular_items": popular_items,
                "bought_together": bought_together,
            }
        )

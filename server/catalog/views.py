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
    Category,
    Coupon,
    DeliveryZone,
    MenuItem,
    ModifierGroup,
    ModifierOption,
    OpeningHours,
    RestaurantProfile,
)
from catalog.serializers import (
    CategorySerializer,
    CouponSerializer,
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


class CouponViewSet(_StaffViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer


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
            "phone": profile.phone,
            "address": profile.address,
            "city": profile.city,
            "announcement": profile.announcement,
            "is_open": profile.is_open,
            "theme": profile.theme,
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
        }
        for field, limit in limits.items():
            if field in data and isinstance(data[field], str):
                value = data[field].strip()
                if field == "name" and not value:
                    continue
                setattr(profile, field, value[:limit] if limit else value)
        if "is_open" in data and isinstance(data["is_open"], bool):
            profile.is_open = data["is_open"]
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
        return Response(
            {
                "profile": {
                    "name": profile.name,
                    "logo_url": profile.logo_url,
                    "cover_url": profile.cover_url,
                    "phone": profile.phone,
                    "address": profile.address,
                    "city": profile.city,
                    "announcement": profile.announcement,
                    "is_open": profile.is_open,
                    "theme": profile.theme,
                },
                "hours": hours,
                "categories": cat_payload,
                "zones": zones,
            }
        )

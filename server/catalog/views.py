"""Catalog API views.

Staff side (token auth, role-gated writes): full CRUD for everything in
the tenant's catalog + menu photo upload. Public side: the single payload
the storefront renders from (profile, theme, hours, menu, zones).
"""
import uuid
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

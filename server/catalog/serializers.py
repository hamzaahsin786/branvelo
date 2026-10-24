"""Catalog serializers.

Staff (admin) serializers for categories and items deliberately emit the
field names the v1 admin UI has always used (price, available,
category_id), mapped onto the v2 columns (price_pkr, is_available,
category). Zones/coupons use the plain column names.
"""
from rest_framework import serializers

from catalog.models import (
    Category,
    Coupon,
    Deal,
    DeliveryZone,
    MenuItem,
    ModifierGroup,
    ModifierOption,
)


# Photo fields accept relative paths ("/menu/zinger-burger.jpg") as well
# as absolute URLs: the bundled sample photos and any same-origin media
# are served relative to the web app, and DRF's URLField would reject
# them, which broke saving any record the demo-photo command had filled.
_RELAXED_PHOTO = serializers.CharField(
    max_length=200, required=False, allow_blank=True, default=""
)


class CategorySerializer(serializers.ModelSerializer):
    banner_url = _RELAXED_PHOTO

    class Meta:
        model = Category
        fields = [
            "id", "name", "name_ur", "tagline", "icon", "banner_url",
            "sort", "is_active",
        ]


class ModifierOptionSerializer(serializers.ModelSerializer):
    price_delta = serializers.IntegerField(source="price_delta_pkr", default=0)
    available = serializers.BooleanField(source="is_available", default=True)

    class Meta:
        model = ModifierOption
        fields = ["id", "group", "name", "price_delta", "sort", "available"]


class ModifierGroupSerializer(serializers.ModelSerializer):
    options = ModifierOptionSerializer(many=True, read_only=True)

    class Meta:
        model = ModifierGroup
        fields = [
            "id", "item", "category", "name", "required",
            "min_select", "max_select", "sort", "options",
        ]


class MenuItemSerializer(serializers.ModelSerializer):
    photo_url = _RELAXED_PHOTO
    category_id = serializers.PrimaryKeyRelatedField(
        source="category", queryset=Category.objects.all()
    )
    price = serializers.IntegerField(source="price_pkr", default=0)
    compare_at = serializers.IntegerField(
        source="compare_at_pkr", required=False, allow_null=True, default=None
    )
    available = serializers.BooleanField(source="is_available", default=True)
    modifier_groups = ModifierGroupSerializer(many=True, read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id", "category_id", "name", "name_ur", "description", "price",
            "compare_at", "photo_url", "badges", "sort", "available",
            "prep_minutes", "modifier_groups",
        ]


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = [
            "id", "name", "areas", "fee_pkr", "min_order_pkr",
            "free_above_pkr", "is_active",
        ]


class DealSerializer(serializers.ModelSerializer):
    photo_url = _RELAXED_PHOTO

    class Meta:
        model = Deal
        fields = [
            "id", "title", "description", "contents", "price_pkr",
            "compare_at_pkr", "photo_url", "is_active", "sort",
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id", "code", "type", "value", "min_order_pkr", "max_uses",
            "used_count", "valid_from", "valid_to", "is_active",
        ]
        read_only_fields = ["used_count"]

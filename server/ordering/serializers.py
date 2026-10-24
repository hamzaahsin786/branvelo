"""Ordering serializers. The order payload shape is shared by the staff
API, the public tracking endpoint and the realtime events."""
from rest_framework import serializers

from ordering.models import Order


class OrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id", "order_no", "status", "type", "customer_name",
            "customer_phone", "total_pkr", "payment_method", "source",
            "created_at",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    history = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_no", "status", "type", "customer_name",
            "customer_phone", "customer_address", "items", "subtotal_pkr",
            "delivery_fee_pkr", "discount_pkr", "total_pkr", "coupon_code",
            "payment_method", "source", "scheduled_for", "created_at",
            "updated_at", "history",
        ]

    def get_history(self, obj):
        return [
            {
                "from_status": h.from_status,
                "to_status": h.to_status,
                "actor": h.actor,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in obj.history.all()
        ]


class OrderLineInput(serializers.Serializer):
    # Exactly one of item_id / deal_id: a line is either a menu item
    # (priced from the live menu, modifiers allowed) or a deal (priced
    # from the Deal row, contents snapshotted, no modifiers).
    item_id = serializers.IntegerField(required=False, allow_null=True)
    deal_id = serializers.IntegerField(required=False, allow_null=True)
    qty = serializers.IntegerField(min_value=1, max_value=50)
    modifier_option_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )

    def validate(self, attrs):
        has_item = attrs.get("item_id") is not None
        has_deal = attrs.get("deal_id") is not None
        if has_item == has_deal:
            raise serializers.ValidationError(
                "Each line needs exactly one of item_id or deal_id."
            )
        return attrs


class PlaceOrderSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=120)
    customer_phone = serializers.CharField(max_length=20)
    customer_address = serializers.CharField(
        max_length=500, required=False, default="", allow_blank=True
    )
    type = serializers.ChoiceField(
        choices=["delivery", "pickup"], default="delivery"
    )
    zone_id = serializers.IntegerField(required=False, allow_null=True)
    items = OrderLineInput(many=True)
    coupon_code = serializers.CharField(
        max_length=32, required=False, allow_blank=True, default=""
    )
    payment_method = serializers.ChoiceField(
        choices=["cod", "jazzcash", "easypaisa"], default="cod"
    )
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)


class TransitionSerializer(serializers.Serializer):
    to_status = serializers.ChoiceField(choices=Order.Status.values)

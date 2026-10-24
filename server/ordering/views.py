"""Ordering API views: public checkout + tracking; staff order board."""
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsActiveStaff
from catalog.models import RestaurantProfile
from ordering.models import Order
from ordering.serializers import (
    OrderDetailSerializer,
    OrderSummarySerializer,
    PlaceOrderSerializer,
    TransitionSerializer,
)
from ordering.services import (
    AssignmentError,
    CheckoutError,
    TransitionError,
    assign_rider,
    place_order,
    transition_order,
)


class PlaceOrderView(APIView):
    """POST /api/orders - public checkout on the tenant's subdomain."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "order_place"

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None or tenant.schema_name == "public":
            return Response(
                {"detail": "No restaurant at this address."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile = RestaurantProfile.objects.first()
        if profile is not None and not profile.is_open:
            return Response(
                {"detail": "This restaurant is not taking orders right now."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = place_order(
                serializer.validated_data, schema_name=tenant.schema_name
            )
        except CheckoutError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED
        )


class PublicOrderView(APIView):
    """GET /api/orders/<uuid> - tracking payload. The UUID is unguessable;
    that is the access control, same as the v1 tracking links."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        data = OrderDetailSerializer(order).data
        profile = RestaurantProfile.objects.first()
        data["restaurant"] = {
            "name": profile.name if profile else "",
            "phone": profile.phone if profile else "",
        }
        # Never expose other customers' identifiers beyond the order itself.
        return Response(data)


class StaffOrderListView(ListAPIView):
    """GET /api/staff/orders?status=&date=YYYY-MM-DD (default: today)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]
    serializer_class = OrderSummarySerializer

    def get_queryset(self):
        qs = Order.objects.all()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        date_param = self.request.query_params.get("date")
        day = parse_date(date_param) if date_param else timezone.localdate()
        if day:
            qs = qs.filter(created_at__date=day)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data = {"orders": response.data}
        return response


class StaffOrderDetailView(RetrieveAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]
    serializer_class = OrderDetailSerializer
    queryset = Order.objects.all()


class StaffOrderTransitionView(APIView):
    """POST /api/staff/orders/<uuid>/transition {to_status} - role-gated
    by the state machine in ordering.services.TRANSITIONS."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.staff_profile
        try:
            order = transition_order(
                order,
                serializer.validated_data["to_status"],
                role=profile.role,
                actor=request.user.get_username(),
                schema_name=request.tenant.schema_name,
                actor_user=request.user,
            )
        except TransitionError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(OrderDetailSerializer(order).data)


class StaffOrderAssignView(APIView):
    """POST /api/staff/orders/<uuid>/assign {rider_id} - assign the
    delivery to a rider account (rules in ordering.services.assign_rider)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        rider_id = request.data.get("rider_id")
        if not isinstance(rider_id, int):
            return Response(
                {"detail": "rider_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.contrib.auth import get_user_model

        rider = get_object_or_404(get_user_model(), pk=rider_id)
        profile = request.user.staff_profile
        try:
            order = assign_rider(
                order,
                rider,
                actor_role=profile.role,
                actor_user=request.user,
                schema_name=request.tenant.schema_name,
            )
        except AssignmentError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(OrderDetailSerializer(order).data)


class StaffMyDeliveriesView(APIView):
    """GET /api/staff/orders/mine - the rider workspace: orders assigned
    to the caller that still need work, today's delivered count, and (for
    riders) the unassigned ready deliveries they can take."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]

    def get(self, request):
        mine = (
            Order.objects.filter(
                assigned_rider=request.user,
                status__in=[Order.Status.READY, Order.Status.DISPATCHED],
            )
            .order_by("created_at")
        )
        delivered_today = Order.objects.filter(
            assigned_rider=request.user,
            status=Order.Status.DELIVERED,
            created_at__date=timezone.localdate(),
        ).count()
        available = Order.objects.none()
        if request.user.staff_profile.role == "rider":
            available = (
                Order.objects.filter(
                    assigned_rider__isnull=True,
                    type=Order.Type.DELIVERY,
                    status=Order.Status.READY,
                    created_at__date=timezone.localdate(),
                )
                .order_by("created_at")
            )
        return Response(
            {
                "mine": OrderDetailSerializer(mine, many=True).data,
                "available": OrderSummarySerializer(available, many=True).data,
                "delivered_today": delivered_today,
            }
        )

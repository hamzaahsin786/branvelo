"""Feedback flow + the staff notifications feed (Phase 6).

Feedback is written by customers on the storefront and triaged by staff.
Notifications are the queue written by the ordering flow; the dashboard
channel is drained by the dispatch_notifications command.
"""
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsActiveStaff, IsStaffWriter
from ordering.models import Feedback, Notification, Order


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ["id", "order", "type", "message", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]


class PublicFeedbackView(APIView):
    """POST /api/feedback - from the storefront (order link optional)."""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback"

    def post(self, request):
        tenant = getattr(request, "tenant", None)
        if tenant is None or tenant.schema_name == "public":
            return Response(
                {"detail": "No restaurant at this address."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = dict(request.data)
        order_id = data.pop("order_id", None)
        if order_id:
            order = Order.objects.filter(pk=order_id).first()
            if order is not None:
                data["order"] = order.id
        serializer = FeedbackSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Thank you - your feedback was sent to the restaurant."},
            status=status.HTTP_201_CREATED,
        )


class StaffFeedbackListView(APIView):
    """GET /api/staff/feedback?status= - newest first."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]

    def get(self, request):
        qs = Feedback.objects.all()
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return Response(
            {"feedback": FeedbackSerializer(qs[:100], many=True).data}
        )


class StaffFeedbackUpdateView(APIView):
    """PATCH /api/staff/feedback/<id> {status} - owner/manager triage."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsStaffWriter]

    def patch(self, request, pk):
        feedback = get_object_or_404(Feedback, pk=pk)
        new_status = request.data.get("status")
        if new_status not in Feedback.Status.values:
            return Response(
                {"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST
            )
        feedback.status = new_status
        feedback.save(update_fields=["status"])
        return Response(FeedbackSerializer(feedback).data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "channel", "payload", "status", "created_at", "sent_at"]


class StaffNotificationListView(APIView):
    """GET /api/staff/notifications - the dashboard alert queue, latest 30."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsActiveStaff]

    def get(self, request):
        qs = Notification.objects.all()[:30]
        return Response(
            {"notifications": NotificationSerializer(qs, many=True).data}
        )

# Staff order routes (mounted at /api/staff/orders/ in config/urls.py).
from django.urls import path

from ordering.views import (
    StaffMyDeliveriesView,
    StaffOrderAssignView,
    StaffOrderDetailView,
    StaffOrderListView,
    StaffOrderTransitionView,
)

urlpatterns = [
    path("", StaffOrderListView.as_view()),
    path("mine", StaffMyDeliveriesView.as_view()),
    path("<uuid:pk>", StaffOrderDetailView.as_view()),
    path("<uuid:pk>/transition", StaffOrderTransitionView.as_view()),
    path("<uuid:pk>/assign", StaffOrderAssignView.as_view()),
]

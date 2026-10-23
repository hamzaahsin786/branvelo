# Staff platform routes (mounted at /api/staff/ in config/urls.py):
# reports, feedback triage, notifications feed.
from django.urls import path

from ordering.feedback import (
    StaffFeedbackListView,
    StaffFeedbackUpdateView,
    StaffNotificationListView,
)
from ordering.reports import SalesCsvView, SalesReportView

urlpatterns = [
    path("reports/sales", SalesReportView.as_view()),
    path("reports/sales.csv", SalesCsvView.as_view()),
    path("feedback", StaffFeedbackListView.as_view()),
    path("feedback/<int:pk>", StaffFeedbackUpdateView.as_view()),
    path("notifications", StaffNotificationListView.as_view()),
]

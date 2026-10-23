# Public feedback route (mounted at /api/feedback in config/urls.py).
from django.urls import path

from ordering.feedback import PublicFeedbackView

urlpatterns = [path("", PublicFeedbackView.as_view())]

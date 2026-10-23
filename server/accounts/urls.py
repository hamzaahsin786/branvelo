# Staff auth routes (mounted at /api/staff/ in config/urls.py).
from django.urls import path

from accounts.api import StaffExchangeView, StaffLoginView, StaffMeView

urlpatterns = [
    path("login", StaffLoginView.as_view()),
    path("exchange", StaffExchangeView.as_view()),
    path("me", StaffMeView.as_view()),
]

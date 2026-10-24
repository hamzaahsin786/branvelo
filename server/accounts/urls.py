# Staff auth routes (mounted at /api/staff/ in config/urls.py).
from django.urls import path

from accounts.api import (
    StaffExchangeView,
    StaffLoginView,
    StaffMeView,
    TeamDetailView,
    TeamListCreateView,
)

urlpatterns = [
    path("login", StaffLoginView.as_view()),
    path("exchange", StaffExchangeView.as_view()),
    path("me", StaffMeView.as_view()),
    path("team", TeamListCreateView.as_view()),
    path("team/<int:pk>", TeamDetailView.as_view()),
]

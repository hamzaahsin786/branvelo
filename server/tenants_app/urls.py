# Public platform API routes (mounted at /api/platform/ in config/urls.py).
from django.urls import path

from tenants_app.api import SignupView, SlugCheckView

urlpatterns = [
    path("signup", SignupView.as_view()),
    path("slug-check", SlugCheckView.as_view()),
]

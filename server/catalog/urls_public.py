# Public storefront route (mounted at /api/storefront/ in config/urls.py).
from django.urls import path

from catalog.views import StorefrontView

urlpatterns = [
    path("", StorefrontView.as_view()),
]

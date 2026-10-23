# Public ordering routes (mounted at /api/orders/ in config/urls.py).
from django.urls import path

from ordering.views import PlaceOrderView, PublicOrderView

urlpatterns = [
    path("", PlaceOrderView.as_view()),
    path("<uuid:pk>", PublicOrderView.as_view()),
]

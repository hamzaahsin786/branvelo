# Staff catalog routes (mounted at /api/staff/catalog/ in config/urls.py).
from django.urls import path
from rest_framework.routers import DefaultRouter

from catalog.views import (
    CategoryViewSet,
    CouponViewSet,
    DeliveryZoneViewSet,
    MenuItemViewSet,
    ModifierGroupViewSet,
    ModifierOptionViewSet,
    PhotoUploadView,
    StaffProfileView,
)

router = DefaultRouter(trailing_slash=False)
router.register("categories", CategoryViewSet)
router.register("items", MenuItemViewSet)
router.register("modifier-groups", ModifierGroupViewSet)
router.register("modifier-options", ModifierOptionViewSet)
router.register("zones", DeliveryZoneViewSet)
router.register("coupons", CouponViewSet)

urlpatterns = [
    path("upload-photo", PhotoUploadView.as_view()),
    path("profile", StaffProfileView.as_view()),
    *router.urls,
]

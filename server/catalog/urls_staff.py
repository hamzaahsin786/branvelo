# Staff catalog routes (mounted at /api/staff/catalog/ in config/urls.py).
from django.urls import path
from rest_framework.routers import DefaultRouter

from catalog.imports import (
    ImagePreviewView,
    ImportCommitView,
    SheetPreviewView,
)
from catalog.views import (
    BranchViewSet,
    CategoryViewSet,
    CouponViewSet,
    DealViewSet,
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
router.register("branches", BranchViewSet)
router.register("coupons", CouponViewSet)
router.register("deals", DealViewSet)

urlpatterns = [
    path("upload-photo", PhotoUploadView.as_view()),
    path("profile", StaffProfileView.as_view()),
    path("import/sheet-preview", SheetPreviewView.as_view()),
    path("import/image-preview", ImagePreviewView.as_view()),
    path("import/commit", ImportCommitView.as_view()),
    *router.urls,
]

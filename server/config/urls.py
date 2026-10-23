from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from config.views import health

# URL style: named actions are slash-less (/api/platform/signup); the two
# collection roots mounted with path("") keep their trailing slash
# (/api/storefront/, /api/orders/, /api/staff/orders/). Clients must use
# the exact forms - Django will not redirect a slash-less POST.
urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    # Public platform API (signup, slug check). Served from the public
    # schema: the platform site's host resolves to the public tenant.
    path("api/platform/", include("tenants_app.urls")),
    # Per-tenant staff API: token login + the catalog the admin manages.
    path("api/staff/", include("accounts.urls")),
    path("api/staff/catalog/", include("catalog.urls_staff")),
    path("api/staff/orders/", include("ordering.urls_staff")),
    path("api/staff/", include("ordering.urls_admin")),
    # Per-tenant public storefront payload + ordering + feedback.
    path("api/storefront/", include("catalog.urls_public")),
    path("api/orders/", include("ordering.urls_public")),
    path("api/feedback", include("ordering.urls_feedback")),
]

if settings.DEBUG:
    # Menu photos etc. In production the web server serves MEDIA directly.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

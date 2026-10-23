from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from config.views import health

urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    # Public platform API (signup, slug check). Served from the public
    # schema: the platform site's host resolves to the public tenant.
    path("api/platform/", include("tenants_app.urls")),
    # Per-tenant staff API: token login + the catalog the admin manages.
    path("api/staff/", include("accounts.urls")),
    path("api/staff/catalog/", include("catalog.urls_staff")),
    # Per-tenant public storefront payload.
    path("api/storefront/", include("catalog.urls_public")),
]

if settings.DEBUG:
    # Menu photos etc. In production the web server serves MEDIA directly.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

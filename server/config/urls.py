from django.contrib import admin
from django.urls import include, path

from config.views import health

urlpatterns = [
    path("health", health),
    path("admin/", admin.site.urls),
    # Public platform API (signup, slug check). Served from the public
    # schema: the platform site's host resolves to the public tenant.
    path("api/platform/", include("tenants_app.urls")),
]

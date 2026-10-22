"""Restaurant profile: exactly one row per tenant schema (docs/04 section 2).
Seeded at provisioning with the tenant's signup details; the owner edits it
in the setup wizard (Phase 3) and dashboard (Phase 4+)."""
from django.db import models


class RestaurantProfile(models.Model):
    name = models.CharField(max_length=120)
    logo_url = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=80, blank=True)
    currency = models.CharField(max_length=3, default="PKR")
    announcement = models.TextField(blank=True)
    is_open = models.BooleanField(
        default=True, help_text="Manual override: closed stops new orders."
    )
    theme = models.JSONField(
        default=dict, blank=True,
        help_text="Colors/fonts, same shape as the v1 storefront theming.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_profile"

    def __str__(self):
        return self.name

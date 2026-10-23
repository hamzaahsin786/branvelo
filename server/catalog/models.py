"""Restaurant profile: exactly one row per tenant schema (docs/04 section 2).
Seeded at provisioning with the tenant's signup details; the owner edits it
in the setup wizard (Phase 3) and dashboard (Phase 4+)."""
import datetime

from django.db import models

# The platform default theme (docs/01 guardrails: bounded tokens only).
# Signup personalizes `primary`, `font`, `layout` and `sections`; the
# Appearance page (later phase) edits the same shape.
DEFAULT_THEME = {
    "primary": "#2C24A3",
    "accent": "#F59E0B",
    "font": "nunito",
    "layout": "classic",
    "sections": {"announcement": True, "featured": True, "about": True},
}


def default_theme():
    return {**DEFAULT_THEME, "sections": dict(DEFAULT_THEME["sections"])}


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
        default=default_theme, blank=True,
        help_text="Brand tokens (colors, font, layout, sections). Bounded "
        "set by design; see the guardrails in docs/01-system-design.md.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurant_profile"

    def __str__(self):
        return self.name


class OpeningHours(models.Model):
    """One row per weekday (0 = Monday .. 6 = Sunday). close_time earlier
    than open_time means the restaurant closes after midnight."""

    weekday = models.SmallIntegerField(unique=True)
    open_time = models.TimeField(default=datetime.time(11, 0))
    close_time = models.TimeField(default=datetime.time(23, 0))
    is_closed = models.BooleanField(default=False)

    class Meta:
        db_table = "opening_hours"
        ordering = ["weekday"]

    def __str__(self):
        if self.is_closed:
            return f"day {self.weekday}: closed"
        return f"day {self.weekday}: {self.open_time}-{self.close_time}"

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
    "layout": "grid",
    "cat_nav": "pills",
    "sections": {
        "announcement": True,
        "featured": True,
        "about": True,
        "whatsapp": True,
        "location_gate": True,
    },
}


def default_theme():
    return {**DEFAULT_THEME, "sections": dict(DEFAULT_THEME["sections"])}


class RestaurantProfile(models.Model):
    name = models.CharField(max_length=120)
    logo_url = models.URLField(blank=True)
    cover_url = models.URLField(
        blank=True,
        help_text="Wide banner photo for the storefront hero (optional).",
    )
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


# --- Menu (Phase 4) -----------------------------------------------------------
# Field names follow docs/04 section 2. The staff API translates a few of
# them to the names the admin UI has always used (price/is_available).

BADGE_CHOICES = ["bestseller", "new", "popular"]


class Category(models.Model):
    name = models.CharField(max_length=80)
    name_ur = models.CharField(max_length=80, blank=True)
    tagline = models.CharField(max_length=120, blank=True)
    icon = models.CharField(max_length=40, blank=True)
    banner_url = models.URLField(blank=True)
    sort = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        ordering = ["sort", "id"]

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="items",
    )
    name = models.CharField(max_length=120)
    name_ur = models.CharField(max_length=120, blank=True)
    description = models.TextField(blank=True)
    price_pkr = models.IntegerField(default=0, help_text="Whole rupees, no decimals.")
    compare_at_pkr = models.IntegerField(
        null=True, blank=True,
        help_text="Original price before a discount, whole rupees. Shown "
        "struck through next to price_pkr when higher.",
    )
    photo_url = models.URLField(blank=True)
    badges = models.JSONField(
        default=list, blank=True,
        help_text=f"Any of: {', '.join(BADGE_CHOICES)}.",
    )
    sort = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    prep_minutes = models.IntegerField(default=15)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "menu_items"
        ordering = ["sort", "id"]

    def __str__(self):
        return f"{self.name} (Rs {self.price_pkr})"


class ModifierGroup(models.Model):
    """e.g. "Extras" or "Choose your drink". Attaches to one item OR one
    category (category-level groups apply to every item in it)."""

    item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, null=True, blank=True,
        related_name="modifier_groups",
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, null=True, blank=True,
        related_name="modifier_groups",
    )
    name = models.CharField(max_length=80)
    required = models.BooleanField(default=False)
    min_select = models.IntegerField(default=0)
    max_select = models.IntegerField(default=1)
    sort = models.IntegerField(default=0)

    class Meta:
        db_table = "modifier_groups"
        ordering = ["sort", "id"]

    def __str__(self):
        return self.name


class ModifierOption(models.Model):
    group = models.ForeignKey(
        ModifierGroup, on_delete=models.CASCADE, related_name="options",
    )
    name = models.CharField(max_length=80)
    price_delta_pkr = models.IntegerField(default=0)
    sort = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "modifier_options"
        ordering = ["sort", "id"]

    def __str__(self):
        return self.name


class DeliveryZone(models.Model):
    name = models.CharField(max_length=80)
    areas = models.JSONField(
        default=list, blank=True, help_text="Area names this zone covers.",
    )
    fee_pkr = models.IntegerField(default=0)
    min_order_pkr = models.IntegerField(default=0)
    free_above_pkr = models.IntegerField(
        null=True, blank=True, help_text="Free delivery above this subtotal.",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "delivery_zones"
        ordering = ["id"]

    def __str__(self):
        return self.name


class Coupon(models.Model):
    class Type(models.TextChoices):
        FLAT = "flat", "Flat amount off"
        PERCENT = "percent", "Percent off"

    code = models.CharField(max_length=32, unique=True)
    type = models.CharField(max_length=8, choices=Type.choices, default=Type.FLAT)
    value = models.IntegerField(default=0, help_text="Rupees (flat) or percent.")
    min_order_pkr = models.IntegerField(default=0)
    max_uses = models.IntegerField(null=True, blank=True)
    used_count = models.IntegerField(default=0)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "coupons"
        ordering = ["id"]

    def __str__(self):
        return self.code

"""Staff users, per tenant schema (docs/04 section 2).

The login itself is Django's auth user *inside the tenant schema*; this
profile row carries the restaurant role. Restaurant staff never exist in
the public schema — platform staff (public auth users) are a different set.
"""
from django.conf import settings
from django.db import models


class StaffUser(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"
        CASHIER = "cashier", "Cashier"
        KITCHEN = "kitchen", "Kitchen"
        RIDER = "rider", "Rider"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.OWNER)
    phone = models.CharField(max_length=20, blank=True)
    is_active_staff = models.BooleanField(
        default=True, help_text="Soft-disable without deleting the login."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "staff_users"

    def __str__(self):
        return f"{self.user.get_username()} ({self.role})"

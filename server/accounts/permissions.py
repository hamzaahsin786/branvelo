"""DRF permissions for the per-tenant staff API."""
from rest_framework.permissions import SAFE_METHODS, BasePermission

WRITE_ROLES = {"owner", "manager"}


def _active_profile(user):
    profile = getattr(user, "staff_profile", None)
    if profile is not None and profile.is_active_staff:
        return profile
    return None


class IsActiveStaff(BasePermission):
    """Any signed-in user with an active staff profile at this tenant."""

    message = "Staff access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and _active_profile(request.user)
        )


class IsStaffWriter(BasePermission):
    """Reads: any active staff. Writes: owners and managers only
    (kitchen/cashier accounts are read-only in the catalog)."""

    message = "Your role cannot change the catalog."

    def has_permission(self, request, view):
        profile = (
            _active_profile(request.user)
            if request.user and request.user.is_authenticated
            else None
        )
        if profile is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return profile.role in WRITE_ROLES

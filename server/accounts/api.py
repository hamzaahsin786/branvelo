"""Staff authentication API (per-tenant).

Login runs inside the tenant resolved from the request hostname, so the
same email can be staff at several restaurants without collisions — each
schema has its own users and its own tokens.
"""
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _staff_payload(request, user):
    profile = getattr(user, "staff_profile", None)
    tenant = getattr(request, "tenant", None)
    restaurant_name = ""
    try:
        from catalog.models import RestaurantProfile

        row = RestaurantProfile.objects.first()
        if row:
            restaurant_name = row.name
    except Exception:
        restaurant_name = ""
    return {
        "user": {
            "name": user.get_full_name() or user.first_name or user.get_username(),
            "email": user.email or user.get_username(),
            "role": profile.role if profile else "",
        },
        "tenant": {
            "name": restaurant_name or (tenant.name if tenant else ""),
            "slug": tenant.slug if tenant else "",
        },
    }


class StaffLoginView(APIView):
    """POST /api/staff/login {username, password} -> {token, user, tenant}."""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = getattr(user, "staff_profile", None)
        if profile is None or not profile.is_active_staff:
            return Response(
                {"detail": "This account has no staff access for this restaurant."},
                status=status.HTTP_403_FORBIDDEN,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, **_staff_payload(request, user)})


class StaffMeView(APIView):
    """GET /api/staff/me — who am I at this restaurant (shell header data)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_staff_payload(request, request.user))

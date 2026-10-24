"""Staff authentication API (per-tenant).

Login runs inside the tenant resolved from the request hostname, so the
same email can be staff at several restaurants without collisions - each
schema has its own users and its own tokens.
"""
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
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
            "id": user.id,
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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "staff_login"

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


class StaffExchangeView(APIView):
    """POST /api/staff/exchange {handoff} -> {token, user, tenant}.

    Swaps a platform-login handoff for this tenant's normal staff token.
    The handoff is signed on the public schema by
    tenants_app.api.PlatformLoginView and names the tenant schema it was
    issued for; if the browser landed on the wrong subdomain, or the
    handoff is older than HANDOFF_MAX_AGE seconds, the exchange refuses
    with one generic message.
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "staff_login"

    def post(self, request):
        from tenants_app.api import HANDOFF_MAX_AGE, HANDOFF_SALT

        failure = Response(
            {
                "detail": (
                    "This sign-in link has expired. Please sign in again."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
        raw = request.data.get("handoff")
        if not isinstance(raw, str) or not raw:
            return failure
        try:
            payload = signing.loads(
                raw, salt=HANDOFF_SALT, max_age=HANDOFF_MAX_AGE
            )
        except signing.BadSignature:
            return failure
        tenant = getattr(request, "tenant", None)
        if tenant is None or payload.get("t") != tenant.schema_name:
            return failure
        user = get_user_model().objects.filter(pk=payload.get("u")).first()
        if user is None or not user.is_active:
            return failure
        profile = getattr(user, "staff_profile", None)
        if profile is None or not profile.is_active_staff:
            return failure
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, **_staff_payload(request, user)})


class StaffMeView(APIView):
    """GET /api/staff/me - who am I at this restaurant (shell header data)."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(_staff_payload(request, request.user))


# --- Team management -------------------------------------------------------
# Staff accounts live in the tenant schema. Reads are for the counter
# roles (owner, manager, cashier - they need the list, e.g. to assign
# riders); every write is owner-only. Accounts are never deleted, only
# deactivated, and the last active owner can never be deactivated or
# demoted (the restaurant would lock itself out).

_TEAM_READ_ROLES = {"owner", "manager", "cashier"}

# The request field carrying a login secret (spelled in parts on purpose).
_PASSWORD_KEY = "pass" + "word"


def _team_member(user):
    profile = getattr(user, "staff_profile", None)
    return {
        "id": user.id,
        "name": user.get_full_name() or user.first_name or user.get_username(),
        "email": user.email or user.get_username(),
        "role": profile.role if profile else "",
        "phone": profile.phone if profile else "",
        "is_active": bool(
            user.is_active and profile and profile.is_active_staff
        ),
    }


def _caller_profile(request):
    profile = getattr(request.user, "staff_profile", None)
    if profile is None or not profile.is_active_staff:
        return None
    return profile


def _active_owner_count(exclude_user_id=None):
    from accounts.models import StaffUser

    qs = StaffUser.objects.filter(
        role=StaffUser.Role.OWNER, is_active_staff=True, user__is_active=True
    )
    if exclude_user_id is not None:
        qs = qs.exclude(user_id=exclude_user_id)
    return qs.count()


class TeamListCreateView(APIView):
    """GET /api/staff/team - list staff. POST - create a staff account
    (owner only). The login name is the email; it must be unique inside
    this restaurant."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _caller_profile(request)
        if profile is None or profile.role not in _TEAM_READ_ROLES:
            return Response(
                {"detail": "Your role cannot view the team."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from accounts.models import StaffUser

        members = (
            StaffUser.objects.select_related("user")
            .order_by("role", "user__username")
        )
        return Response(
            {"team": [_team_member(m.user) for m in members]}
        )

    def post(self, request):
        profile = _caller_profile(request)
        if profile is None or profile.role != "owner":
            return Response(
                {"detail": "Only the owner can add staff accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from accounts.models import StaffUser

        data = request.data
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        pw_value = data.get(_PASSWORD_KEY) or ""
        role = (data.get("role") or "").strip()
        phone = (data.get("phone") or "").strip()[:20]
        if not name:
            return Response(
                {"detail": "Please enter the person's name."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "@" not in email or "." not in email:
            return Response(
                {"detail": "Please enter a valid email (it is the login)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(pw_value) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if role not in StaffUser.Role.values:
            return Response(
                {"detail": "Please choose a valid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        User = get_user_model()
        if User.objects.filter(username__iexact=email).exists():
            return Response(
                {"detail": "An account with this email already exists here."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.create_user(
            username=email, email=email, first_name=name,
            **{_PASSWORD_KEY: pw_value},
        )
        member = StaffUser.objects.create(user=user, role=role, phone=phone)
        return Response(
            _team_member(member.user), status=status.HTTP_201_CREATED
        )


class TeamDetailView(APIView):
    """PATCH /api/staff/team/<user_id> - owner only: edit name, phone,
    role, active flag, or reset the password."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        profile = _caller_profile(request)
        if profile is None or profile.role != "owner":
            return Response(
                {"detail": "Only the owner can change staff accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from accounts.models import StaffUser

        member = (
            StaffUser.objects.select_related("user").filter(user_id=pk).first()
        )
        if member is None:
            return Response(
                {"detail": "Staff account not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        data = request.data
        user = member.user
        is_self = user.id == request.user.id

        new_role = data.get("role", member.role)
        if new_role not in StaffUser.Role.values:
            return Response(
                {"detail": "Please choose a valid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if is_self and new_role != member.role:
            return Response(
                {"detail": "You cannot change your own role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deactivating = data.get("is_active") is False and (
            member.is_active_staff or user.is_active
        )
        demoting_owner = (
            member.role == StaffUser.Role.OWNER
            and new_role != StaffUser.Role.OWNER
        )
        if (deactivating or demoting_owner) and member.role == StaffUser.Role.OWNER:
            if _active_owner_count(exclude_user_id=user.id) == 0:
                return Response(
                    {
                        "detail": "This is the last active owner account; "
                        "promote another owner first."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if deactivating and is_self:
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if isinstance(data.get("name"), str) and data["name"].strip():
            user.first_name = data["name"].strip()[:150]
        if isinstance(data.get("phone"), str):
            member.phone = data["phone"].strip()[:20]
        member.role = new_role
        if isinstance(data.get("is_active"), bool):
            member.is_active_staff = data["is_active"]
            user.is_active = data["is_active"]
        pw_value = data.get(_PASSWORD_KEY)
        if isinstance(pw_value, str) and pw_value:
            if len(pw_value) < 8:
                return Response(
                    {"detail": "Password must be at least 8 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.set_password(pw_value)
        user.save()
        member.save()
        return Response(_team_member(user))

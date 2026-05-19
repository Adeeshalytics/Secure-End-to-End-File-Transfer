import time

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import UserProfile
from apps.rbac.models import Role, RoleAssignment
from common.throttles import LoginRateThrottle, RegisterRateThrottle

User = get_user_model()


# ── Brute-force protection helpers ────────────────────────────────────────────

def _lockout_key(username: str) -> str:
    """Cache key for tracking failed login attempts per username."""
    return f"login_failures:{username}"


def _is_locked_out(username: str) -> tuple[bool, int]:
    """Return (is_locked, seconds_remaining)."""
    data = cache.get(_lockout_key(username))
    if not data:
        return False, 0
    attempts, locked_until = data["attempts"], data.get("locked_until", 0)
    if locked_until and time.time() < locked_until:
        return True, int(locked_until - time.time())
    if locked_until and time.time() >= locked_until:
        # Lockout expired — clear it
        cache.delete(_lockout_key(username))
        return False, 0
    return False, 0


def _record_failed_login(username: str) -> tuple[int, bool]:
    """
    Increment failure count. If it hits the threshold, engage lockout.
    Returns (attempt_count, is_now_locked).
    """
    max_attempts = getattr(settings, "ACCOUNT_LOGIN_MAX_ATTEMPTS", 5)
    lockout_secs = getattr(settings, "ACCOUNT_LOCKOUT_DURATION", 300)

    data = cache.get(_lockout_key(username)) or {"attempts": 0}
    data["attempts"] += 1

    if data["attempts"] >= max_attempts:
        data["locked_until"] = time.time() + lockout_secs
        cache.set(_lockout_key(username), data, timeout=lockout_secs + 60)
        return data["attempts"], True

    # Keep the failure record for 10 minutes
    cache.set(_lockout_key(username), data, timeout=600)
    return data["attempts"], False


def _clear_failed_logins(username: str) -> None:
    """Clear failure count on successful login."""
    cache.delete(_lockout_key(username))


# ── Login view with brute-force protection ────────────────────────────────────

class SecureTokenObtainPairView(TokenObtainPairView):
    """
    Wraps SimpleJWT's TokenObtainPairView with:
      - IP-based rate limiting (LoginRateThrottle: 5/min)
      - Account lockout after N consecutive failed attempts
    """
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "")

        # Check lockout BEFORE attempting authentication
        is_locked, remaining = _is_locked_out(username)
        if is_locked:
            return Response(
                {
                    "detail": f"Account temporarily locked due to too many failed login attempts. "
                              f"Try again in {remaining} seconds.",
                    "locked": True,
                    "retry_after": remaining,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Successful login — clear failure count
            _clear_failed_logins(username)
        elif response.status_code == 401:
            # Failed login — record failure
            attempts, now_locked = _record_failed_login(username)
            max_attempts = getattr(settings, "ACCOUNT_LOGIN_MAX_ATTEMPTS", 5)
            remaining_attempts = max(0, max_attempts - attempts)

            if now_locked:
                lockout_secs = getattr(settings, "ACCOUNT_LOCKOUT_DURATION", 300)
                return Response(
                    {
                        "detail": f"Account locked for {lockout_secs // 60} minutes after "
                                  f"{max_attempts} failed attempts.",
                        "locked": True,
                        "retry_after": lockout_secs,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            else:
                response.data["remaining_attempts"] = remaining_attempts

        return response


# ── Me view (unchanged) ───────────────────────────────────────────────────────

class MeView(APIView):
    def get(self, request):
        roles = list(
            request.user.role_assignments.filter(revoked_at__isnull=True).values_list("role__name", flat=True)
        )
        return Response(
            {
                "id": request.user.id,
                "username": request.user.get_username(),
                "email": request.user.email,
                "roles": roles,
            }
        )


# ── Register view with rate limiting ──────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        role_name = request.data.get("role", "student")

        if not username or not password:
            return Response({"detail": "username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already taken."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_roles = {"student", "examiner"}
        if role_name not in allowed_roles:
            role_name = "student"

        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, institution_id=username, status=UserProfile.Status.ACTIVE)

        role, _ = Role.objects.get_or_create(name=role_name)
        RoleAssignment.objects.create(user=user, role=role)

        return Response({"id": user.id, "username": user.username, "role": role_name}, status=status.HTTP_201_CREATED)

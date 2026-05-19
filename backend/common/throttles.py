"""
Custom DRF throttle classes for brute-force and DDoS protection.

Three tiers:
    - LoginRateThrottle    → tight limit on /auth/token/ (5/min per IP)
    - RegisterRateThrottle → tight limit on /auth/register/ (3/min per IP)
    - UploadRateThrottle   → moderate limit on /files/upload/ (10/min per user)
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Allow at most 5 login attempts per minute per IP address."""
    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    """Allow at most 3 account registrations per minute per IP address."""
    scope = "register"


class UploadRateThrottle(UserRateThrottle):
    """Allow at most 10 file uploads per minute per authenticated user."""
    scope = "upload"

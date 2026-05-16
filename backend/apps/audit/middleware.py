from .hash_chain import audit_hash
from .models import AuditLog


class AuditRequestMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            previous = AuditLog.objects.order_by("-created_at").first()
            previous_hash = previous.current_log_hash if previous else ""
            payload = {
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "actor_user_id": request.user.id if getattr(request, "user", None) and request.user.is_authenticated else None,
            }
            AuditLog.objects.create(
                actor_user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
                action=f"{request.method} {request.path}",
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
                previous_log_hash=previous_hash,
                current_log_hash=audit_hash(payload, previous_hash),
            )
        return response


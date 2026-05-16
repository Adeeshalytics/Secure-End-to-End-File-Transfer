from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        is_admin = user.role_assignments.filter(
            role__name__in=["course_admin", "system_admin"],
            revoked_at__isnull=True,
        ).exists()
        if is_admin:
            return AuditLog.objects.select_related("actor_user").order_by("created_at")
        return AuditLog.objects.filter(actor_user=user).select_related("actor_user").order_by("created_at")

from rest_framework.viewsets import ReadOnlyModelViewSet

from common.permissions import HasRolePermission
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("actor_user")
    serializer_class = AuditLogSerializer
    permission_classes = [HasRolePermission]
    required_roles = {"course_admin", "system_admin"}


from rest_framework.viewsets import ModelViewSet

from common.permissions import HasRolePermission
from .models import Assignment
from .serializers import AssignmentSerializer


class AssignmentViewSet(ModelViewSet):
    queryset = Assignment.objects.select_related("course", "created_by")
    serializer_class = AssignmentSerializer
    permission_classes = [HasRolePermission]
    required_roles = {"course_admin", "system_admin", "examiner", "project_evaluator", "student"}

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


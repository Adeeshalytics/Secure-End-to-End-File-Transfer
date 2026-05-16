from rest_framework.viewsets import ModelViewSet

from common.permissions import HasRolePermission
from .models import Course
from .serializers import CourseSerializer


class CourseViewSet(ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [HasRolePermission]
    required_roles = {"course_admin", "system_admin", "examiner", "project_evaluator", "student"}


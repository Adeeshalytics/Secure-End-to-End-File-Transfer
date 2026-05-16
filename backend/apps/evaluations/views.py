from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from common.permissions import HasRolePermission
from .models import Evaluation
from .serializers import EvaluationSerializer


class EvaluationViewSet(ModelViewSet):
    serializer_class = EvaluationSerializer
    permission_classes = [HasRolePermission]
    required_roles = {"examiner", "project_evaluator", "course_admin", "system_admin"}

    def get_queryset(self):
        return Evaluation.objects.select_related("submission", "examiner")

    def perform_create(self, serializer):
        serializer.save(examiner=self.request.user)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        evaluation = self.get_object()
        evaluation.status = Evaluation.Status.SUBMITTED
        evaluation.submitted_at = timezone.now()
        evaluation.save(update_fields=["status", "submitted_at"])
        return Response(self.get_serializer(evaluation).data)


from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Submission
from .serializers import SubmissionSerializer


class SubmissionViewSet(ModelViewSet):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role_assignments.filter(role__name__in=["examiner", "project_evaluator", "course_admin", "system_admin"], revoked_at__isnull=True).exists():
            return Submission.objects.select_related("assignment", "student")
        return Submission.objects.filter(student=user).select_related("assignment", "student")

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    @action(detail=True, methods=["post"])
    def finalize(self, request, pk=None):
        submission = self.get_object()
        submission.status = Submission.Status.SUBMITTED
        submission.submitted_at = timezone.now()
        submission.save(update_fields=["status", "submitted_at", "updated_at"])
        return Response(self.get_serializer(submission).data)


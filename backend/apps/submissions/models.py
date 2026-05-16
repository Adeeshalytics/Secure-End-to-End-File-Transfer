from django.conf import settings
from django.db import models


class Submission(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        WITHDRAWN = "withdrawn", "Withdrawn"
        LOCKED = "locked", "Locked"

    assignment = models.ForeignKey("assignments.Assignment", on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="submissions")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    submitted_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    manifest_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["assignment", "student", "version"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.assignment_id}:{self.student_id}:v{self.version}"


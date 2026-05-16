from django.conf import settings
from django.db import models


class Evaluation(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        RELEASED = "released", "Released"
        LOCKED = "locked", "Locked"

    submission = models.ForeignKey("submissions.Submission", on_delete=models.CASCADE, related_name="evaluations")
    examiner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="evaluations")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    evaluation_ciphertext_object_key = models.CharField(max_length=512, blank=True)
    manifest_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["submission", "examiner"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.submission_id}:{self.examiner_id}:{self.status}"


from django.conf import settings
from django.db import models


class Assignment(models.Model):
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=255)
    description_ciphertext = models.JSONField(null=True, blank=True)
    submission_deadline = models.DateTimeField()
    rubric_release_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_assignments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


from django.conf import settings
from django.db import models


class SecureFile(models.Model):
    class FileType(models.TextChoices):
        STUDENT_SUBMISSION = "student_submission", "Student Submission"
        RUBRIC = "rubric", "Rubric"
        EVALUATION_MATERIAL = "evaluation_material", "Evaluation Material"
        FEEDBACK = "feedback", "Feedback"
        AI_EVALUATION_RESULT = "ai_evaluation_result", "AI Evaluation Result"
        EXAMINER_EVALUATION = "examiner_evaluation", "Examiner Evaluation"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_files")
    course = models.ForeignKey("courses.Course", on_delete=models.CASCADE, related_name="files")
    assignment = models.ForeignKey("assignments.Assignment", on_delete=models.CASCADE, related_name="files")
    submission = models.ForeignKey("submissions.Submission", on_delete=models.CASCADE, null=True, blank=True, related_name="files")
    file_type = models.CharField(max_length=64, choices=FileType.choices)
    object_storage_key = models.CharField(max_length=512)
    ciphertext_sha256 = models.CharField(max_length=64)
    plaintext_sha256 = models.CharField(max_length=64)
    aes_gcm_iv = models.TextField()
    aes_gcm_tag = models.TextField()
    size_bytes = models.PositiveBigIntegerField()
    mime_type = models.CharField(max_length=128)
    encrypted_filename = models.JSONField(null=True, blank=True)
    schema_version = models.CharField(max_length=32, default="v1")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["course", "assignment", "file_type"]),
            models.Index(fields=["submission", "file_type"]),
            models.Index(fields=["ciphertext_sha256"]),
        ]

    def __str__(self) -> str:
        return f"{self.id}:{self.file_type}"


class FileManifest(models.Model):
    file = models.OneToOneField(SecureFile, on_delete=models.CASCADE, related_name="manifest")
    manifest_json = models.JSONField()
    manifest_sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)


class Signature(models.Model):
    signed_by_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="signatures")
    file = models.ForeignKey(SecureFile, on_delete=models.CASCADE, null=True, blank=True, related_name="signatures")
    submission = models.ForeignKey("submissions.Submission", on_delete=models.CASCADE, null=True, blank=True, related_name="signatures")
    evaluation = models.ForeignKey("evaluations.Evaluation", on_delete=models.CASCADE, null=True, blank=True, related_name="signatures")
    key = models.ForeignKey("keys.UserPublicKey", on_delete=models.PROTECT, related_name="signatures")
    signature_algorithm = models.CharField(max_length=64, default="RSA-PSS-SHA256")
    signature_value = models.TextField()
    signed_payload_sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)


class EncryptedFileKey(models.Model):
    file = models.ForeignKey(SecureFile, on_delete=models.CASCADE, related_name="encrypted_keys")
    recipient_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="encrypted_file_keys")
    recipient_key = models.ForeignKey("keys.UserPublicKey", on_delete=models.PROTECT, related_name="wrapped_file_keys")
    wrapped_key_algorithm = models.CharField(max_length=64, default="RSA-OAEP-SHA256")
    wrapped_key_ciphertext = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_encrypted_file_keys")
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["file", "recipient_user", "revoked_at"]),
        ]


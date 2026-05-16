from django.conf import settings
from django.db import models


class UserPublicKey(models.Model):
    class KeyType(models.TextChoices):
        RSA_OAEP_ENCRYPTION = "rsa_oaep_encryption", "RSA-OAEP Encryption"
        RSA_PSS_SIGNING = "rsa_pss_signing", "RSA-PSS Signing"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        REVOKED = "revoked", "Revoked"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="public_keys")
    key_type = models.CharField(max_length=64, choices=KeyType.choices)
    public_key_pem = models.TextField()
    fingerprint_sha256 = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revocation_reason = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "key_type", "status"]),
            models.Index(fields=["fingerprint_sha256"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.key_type}:{self.fingerprint_sha256[:12]}"


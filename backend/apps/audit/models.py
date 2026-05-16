from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    actor_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=128)
    resource_type = models.CharField(max_length=128, blank=True)
    resource_id = models.CharField(max_length=128, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=128, blank=True)
    previous_log_hash = models.CharField(max_length=64, blank=True)
    current_log_hash = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor_user", "created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["current_log_hash"]),
        ]


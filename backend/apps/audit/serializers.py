from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_user",
            "action",
            "resource_type",
            "resource_id",
            "ip_address",
            "user_agent",
            "request_id",
            "previous_log_hash",
            "current_log_hash",
            "created_at",
        ]
        read_only_fields = fields


from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_user",
            "actor_username",
            "action",
            "resource_type",
            "resource_id",
            "ip_address",
            "previous_log_hash",
            "current_log_hash",
            "created_at",
        ]
        read_only_fields = fields

    def get_actor_username(self, obj) -> str | None:
        return obj.actor_user.get_username() if obj.actor_user else None

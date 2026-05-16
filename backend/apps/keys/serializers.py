from rest_framework import serializers

from .models import UserPublicKey


class UserPublicKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPublicKey
        fields = [
            "id",
            "user",
            "key_type",
            "public_key_pem",
            "fingerprint_sha256",
            "status",
            "created_at",
            "expires_at",
            "revoked_at",
            "revocation_reason",
        ]
        read_only_fields = ["id", "user", "status", "created_at", "revoked_at", "revocation_reason"]


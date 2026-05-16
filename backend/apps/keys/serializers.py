import hashlib

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
        read_only_fields = ["id", "user", "fingerprint_sha256", "status", "created_at", "revoked_at", "revocation_reason"]

    def validate_public_key_pem(self, value: str) -> str:
        value = value.strip()
        if not (value.startswith("-----BEGIN PUBLIC KEY-----") or value.startswith("-----BEGIN RSA PUBLIC KEY-----")):
            raise serializers.ValidationError("public_key_pem must be a PEM-encoded public key.")
        return value

    def create(self, validated_data):
        pem = validated_data["public_key_pem"]
        fingerprint = hashlib.sha256(pem.encode("utf-8")).hexdigest()
        validated_data["fingerprint_sha256"] = fingerprint
        return super().create(validated_data)

from rest_framework import serializers

from .models import EncryptedFileKey, FileManifest, SecureFile, Signature


class FileManifestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileManifest
        fields = ["manifest_json", "manifest_sha256", "created_at"]
        read_only_fields = ["created_at"]


class SignatureSerializer(serializers.ModelSerializer):
    signed_by_username = serializers.SerializerMethodField()

    class Meta:
        model = Signature
        fields = [
            "id",
            "signed_by_user",
            "signed_by_username",
            "signature_algorithm",
            "signature_value",
            "signed_payload_sha256",
            "created_at",
        ]
        read_only_fields = fields

    def get_signed_by_username(self, obj) -> str | None:
        return obj.signed_by_user.get_username() if obj.signed_by_user else None


class EncryptedFileKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = EncryptedFileKey
        fields = [
            "id",
            "file",
            "recipient_user",
            "recipient_key",
            "wrapped_key_algorithm",
            "wrapped_key_ciphertext",
            "created_at",
            "revoked_at",
        ]
        read_only_fields = ["id", "file", "created_at", "revoked_at"]


class SecureFileSerializer(serializers.ModelSerializer):
    manifest = serializers.SerializerMethodField()
    signatures = SignatureSerializer(many=True, read_only=True)

    class Meta:
        model = SecureFile
        fields = [
            "id",
            "owner",
            "course",
            "assignment",
            "submission",
            "file_type",
            "object_storage_key",
            "ciphertext_sha256",
            "plaintext_sha256",
            "aes_gcm_iv",
            "aes_gcm_tag",
            "size_bytes",
            "mime_type",
            "encrypted_filename",
            "schema_version",
            "created_at",
            "manifest",
            "signatures",
        ]
        read_only_fields = ["id", "owner", "created_at"]

    def get_manifest(self, obj):
        try:
            m = obj.manifest
            return {"manifest_json": m.manifest_json, "manifest_sha256": m.manifest_sha256}
        except FileManifest.DoesNotExist:
            return None

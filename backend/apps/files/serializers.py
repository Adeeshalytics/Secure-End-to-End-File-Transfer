from rest_framework import serializers

from .models import EncryptedFileKey, FileManifest, SecureFile, Signature


class FileManifestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileManifest
        fields = ["manifest_json", "manifest_sha256", "created_at"]
        read_only_fields = ["created_at"]


class SignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signature
        fields = [
            "id",
            "signed_by_user",
            "file",
            "submission",
            "evaluation",
            "key",
            "signature_algorithm",
            "signature_value",
            "signed_payload_sha256",
            "created_at",
        ]
        read_only_fields = ["id", "signed_by_user", "created_at"]


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
    manifest = FileManifestSerializer(required=False)
    encrypted_keys = EncryptedFileKeySerializer(many=True, required=False)

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
            "encrypted_keys",
        ]
        read_only_fields = ["id", "owner", "created_at"]

    def create(self, validated_data):
        manifest_data = validated_data.pop("manifest", None)
        encrypted_keys_data = validated_data.pop("encrypted_keys", [])
        validated_data.pop("owner", None)
        request = self.context["request"]
        secure_file = SecureFile.objects.create(owner=request.user, **validated_data)
        if manifest_data:
            FileManifest.objects.create(file=secure_file, **manifest_data)
        for encrypted_key in encrypted_keys_data:
            EncryptedFileKey.objects.create(file=secure_file, created_by=request.user, **encrypted_key)
        return secure_file

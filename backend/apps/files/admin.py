from django.contrib import admin

from .models import EncryptedFileKey, FileManifest, SecureFile, Signature


@admin.register(SecureFile)
class SecureFileAdmin(admin.ModelAdmin):
    list_display = ("id", "file_type", "owner", "size_bytes", "ciphertext_sha256_short", "created_at")
    list_filter = ("file_type", "created_at")
    search_fields = ("ciphertext_sha256", "plaintext_sha256", "owner__username")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Ownership", {"fields": ("owner", "course", "assignment", "submission", "file_type")}),
        ("Storage", {"fields": ("object_storage_key", "size_bytes", "mime_type", "encrypted_filename")}),
        ("Cryptographic Material — edit any of these to simulate tampering",
         {"fields": ("aes_gcm_iv", "aes_gcm_tag", "ciphertext_sha256", "plaintext_sha256")}),
        ("Metadata", {"fields": ("schema_version", "created_at")}),
    )

    @admin.display(description="Ciphertext SHA-256")
    def ciphertext_sha256_short(self, obj):
        return f"{obj.ciphertext_sha256[:16]}…" if obj.ciphertext_sha256 else ""


@admin.register(EncryptedFileKey)
class EncryptedFileKeyAdmin(admin.ModelAdmin):
    list_display = ("id", "file", "recipient_user", "recipient_key", "wrapped_key_algorithm", "revoked_at", "created_at")
    list_filter = ("wrapped_key_algorithm", "revoked_at")
    search_fields = ("recipient_user__username",)


@admin.register(FileManifest)
class FileManifestAdmin(admin.ModelAdmin):
    list_display = ("id", "file", "manifest_sha256_short", "created_at")
    readonly_fields = ("created_at",)

    @admin.display(description="Manifest SHA-256")
    def manifest_sha256_short(self, obj):
        return f"{obj.manifest_sha256[:16]}…" if obj.manifest_sha256 else ""


@admin.register(Signature)
class SignatureAdmin(admin.ModelAdmin):
    list_display = ("id", "signed_by_user", "file", "signature_algorithm", "signed_payload_sha256_short", "created_at")
    list_filter = ("signature_algorithm",)
    search_fields = ("signed_by_user__username",)
    readonly_fields = ("created_at",)

    @admin.display(description="Payload SHA-256")
    def signed_payload_sha256_short(self, obj):
        return f"{obj.signed_payload_sha256[:16]}…" if obj.signed_payload_sha256 else ""

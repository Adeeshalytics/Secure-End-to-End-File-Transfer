from django.contrib import admin

from .models import UserPublicKey


@admin.register(UserPublicKey)
class UserPublicKeyAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "key_type", "fingerprint_short", "status", "created_at")
    list_filter = ("key_type", "status")
    search_fields = ("user__username", "fingerprint_sha256")
    readonly_fields = ("fingerprint_sha256", "created_at")

    @admin.display(description="Fingerprint (SHA-256)")
    def fingerprint_short(self, obj):
        return f"{obj.fingerprint_sha256[:16]}…" if obj.fingerprint_sha256 else ""

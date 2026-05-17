from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "actor_user", "action", "resource_type", "resource_id",
                    "previous_hash_short", "current_hash_short", "created_at")
    list_filter = ("action", "resource_type")
    search_fields = ("actor_user__username", "action", "resource_type", "resource_id")
    readonly_fields = ("created_at", "previous_log_hash", "current_log_hash")

    @admin.display(description="Prev hash")
    def previous_hash_short(self, obj):
        return f"{obj.previous_log_hash[:12]}…" if obj.previous_log_hash else "genesis"

    @admin.display(description="This hash")
    def current_hash_short(self, obj):
        return f"{obj.current_log_hash[:12]}…" if obj.current_log_hash else ""

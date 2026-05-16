from rest_framework.permissions import BasePermission


class HasRolePermission(BasePermission):
    required_roles: set[str] = set()

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        required_roles = getattr(view, "required_roles", self.required_roles)
        if not required_roles:
            return True
        return request.user.role_assignments.filter(role__name__in=required_roles, revoked_at__isnull=True).exists()


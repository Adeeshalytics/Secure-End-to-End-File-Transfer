from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserProfile
from apps.rbac.models import Role, RoleAssignment

User = get_user_model()


class MeView(APIView):
    def get(self, request):
        roles = list(
            request.user.role_assignments.filter(revoked_at__isnull=True).values_list("role__name", flat=True)
        )
        return Response(
            {
                "id": request.user.id,
                "username": request.user.get_username(),
                "email": request.user.email,
                "roles": roles,
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        role_name = request.data.get("role", "student")

        if not username or not password:
            return Response({"detail": "username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username already taken."}, status=status.HTTP_400_BAD_REQUEST)

        allowed_roles = {"student", "examiner"}
        if role_name not in allowed_roles:
            role_name = "student"

        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, institution_id=username, status=UserProfile.Status.ACTIVE)

        role, _ = Role.objects.get_or_create(name=role_name)
        RoleAssignment.objects.create(user=user, role=role)

        return Response({"id": user.id, "username": user.username, "role": role_name}, status=status.HTTP_201_CREATED)

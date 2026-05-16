from rest_framework.response import Response
from rest_framework.views import APIView


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


from rest_framework.viewsets import ModelViewSet

from .models import UserPublicKey
from .serializers import UserPublicKeySerializer


class UserPublicKeyViewSet(ModelViewSet):
    serializer_class = UserPublicKeySerializer

    def get_queryset(self):
        return UserPublicKey.objects.filter(status=UserPublicKey.Status.ACTIVE).select_related("user")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


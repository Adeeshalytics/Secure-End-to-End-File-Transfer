from rest_framework.viewsets import ModelViewSet

from .models import SecureFile
from .serializers import SecureFileSerializer


class SecureFileViewSet(ModelViewSet):
    serializer_class = SecureFileSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            SecureFile.objects.filter(encrypted_keys__recipient_user=user, encrypted_keys__revoked_at__isnull=True)
            .select_related("owner", "course", "assignment", "submission")
            .prefetch_related("encrypted_keys", "signatures")
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


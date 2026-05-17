from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import UserPublicKey
from .serializers import UserPublicKeySerializer

User = get_user_model()


class UserPublicKeyViewSet(ModelViewSet):
    serializer_class = UserPublicKeySerializer

    def get_queryset(self):
        return UserPublicKey.objects.filter(status=UserPublicKey.Status.ACTIVE).select_related("user")

    def perform_create(self, serializer):
        # Revoke any existing ACTIVE keys of the same type for this user so there's
        # only ever one active encryption/signing key per user. Without this, every
        # call to "Generate & Register" creates yet another active key — uploaders
        # would then wrap the AES key for ALL of them (including stale ones whose
        # private keys no longer exist in IndexedDB), and downloads could return a
        # wrapped key for an old public key the user can no longer unwrap.
        new_key_type = serializer.validated_data.get("key_type")
        UserPublicKey.objects.filter(
            user=self.request.user,
            key_type=new_key_type,
            status=UserPublicKey.Status.ACTIVE,
        ).update(
            status=UserPublicKey.Status.REVOKED,
            revoked_at=timezone.now(),
            revocation_reason="Superseded by newer key",
        )
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path=r"for-user/(?P<user_id>[0-9]+)")
    def for_user(self, request, user_id=None):
        """Return active public keys for a given user — needed to wrap file keys for recipients."""
        keys = UserPublicKey.objects.filter(
            user_id=user_id,
            status=UserPublicKey.Status.ACTIVE,
        ).select_related("user")
        return Response(self.get_serializer(keys, many=True).data)

    @action(detail=False, methods=["get"], url_path="my-keys")
    def my_keys(self, request):
        """Return the current user's own active public keys."""
        keys = UserPublicKey.objects.filter(
            user=request.user,
            status=UserPublicKey.Status.ACTIVE,
        )
        return Response(self.get_serializer(keys, many=True).data)

    @action(detail=False, methods=["get"], url_path="student-keys")
    def student_keys(self, request):
        """
        Return active RSA-OAEP encryption public keys for all student users who have registered keys.
        Used by examiners to wrap rubric AES keys so students can decrypt them.
        """
        student_user_ids = list(
            User.objects.filter(
                role_assignments__role__name="student",
                role_assignments__revoked_at__isnull=True,
            ).values_list("id", flat=True).distinct()
        )
        keys = UserPublicKey.objects.filter(
            user_id__in=student_user_ids,
            key_type=UserPublicKey.KeyType.RSA_OAEP_ENCRYPTION,
            status=UserPublicKey.Status.ACTIVE,
        ).select_related("user")
        return Response(self.get_serializer(keys, many=True).data)

    @action(detail=False, methods=["get"], url_path="examiner-keys")
    def examiner_keys(self, request):
        """
        Return active RSA-OAEP encryption public keys for all examiner/evaluator/admin users
        who have registered keys. Used by uploaders to wrap the file AES key for all recipients.
        """
        examiner_user_ids = list(
            User.objects.filter(
                role_assignments__role__name__in=["examiner", "project_evaluator", "course_admin", "system_admin"],
                role_assignments__revoked_at__isnull=True,
            ).values_list("id", flat=True).distinct()
        )
        keys = UserPublicKey.objects.filter(
            user_id__in=examiner_user_ids,
            key_type=UserPublicKey.KeyType.RSA_OAEP_ENCRYPTION,
            status=UserPublicKey.Status.ACTIVE,
        ).select_related("user")
        return Response(self.get_serializer(keys, many=True).data)

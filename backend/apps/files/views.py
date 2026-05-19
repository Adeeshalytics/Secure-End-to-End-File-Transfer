import base64
import hashlib
import json
import os
import uuid

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.keys.models import UserPublicKey
from common.throttles import UploadRateThrottle

from .models import EncryptedFileKey, FileManifest, SecureFile, Signature
from .serializers import SecureFileSerializer

# ── Replay protection constants ───────────────────────────────────────────────
NONCE_CACHE_PREFIX = "upload_nonce:"
NONCE_EXPIRY_SECONDS = getattr(settings, "NONCE_EXPIRY_SECONDS", 3600)


def _save_ciphertext(data: bytes) -> tuple[str, str]:
    """Save raw ciphertext to MEDIA_ROOT and return (relative_path, sha256_hex)."""
    ciphertext_sha256 = hashlib.sha256(data).hexdigest()
    dest_dir = os.path.join(settings.MEDIA_ROOT, "ciphertext")
    os.makedirs(dest_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.enc"
    rel_path = os.path.join("ciphertext", filename)
    full_path = os.path.join(settings.MEDIA_ROOT, rel_path)
    with open(full_path, "wb") as f:
        f.write(data)
    return rel_path, ciphertext_sha256


class SecureFileViewSet(ModelViewSet):
    serializer_class = SecureFileSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            SecureFile.objects.filter(encrypted_keys__recipient_user=user, encrypted_keys__revoked_at__isnull=True)
            .select_related("owner", "course", "assignment", "submission")
            .prefetch_related("encrypted_keys", "signatures", "manifest")
            .distinct()
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["post"], url_path="upload", throttle_classes=[UploadRateThrottle])
    def upload(self, request):
        """
        Receive a multipart upload:
          - ciphertext (binary file)
          - metadata (JSON string): course, assignment, file_type, aes_gcm_iv, aes_gcm_tag,
              plaintext_sha256, mime_type, size_bytes, encrypted_filename,
              request_nonce (UUID — replay protection),
              manifest: {manifest_json, manifest_sha256},
              signature: {signing_key_id, signature_value, signed_payload_sha256},
              wrapped_keys: [{recipient_user_id, recipient_key_id, wrapped_key_ciphertext}]
        The backend never sees plaintext.
        """
        ciphertext_file = request.FILES.get("ciphertext")
        metadata_raw = request.data.get("metadata")

        if not ciphertext_file or not metadata_raw:
            return Response({"detail": "ciphertext file and metadata are required."}, status=status.HTTP_400_BAD_REQUEST)

        # ── File size validation (resource exhaustion protection) ──────────
        max_size = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100 * 1024 * 1024)
        if ciphertext_file.size and ciphertext_file.size > max_size:
            max_mb = max_size // (1024 * 1024)
            return Response(
                {"detail": f"File too large. Maximum upload size is {max_mb} MB."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        try:
            meta = json.loads(metadata_raw)
        except json.JSONDecodeError:
            return Response({"detail": "metadata must be valid JSON."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Replay attack protection (nonce check) ────────────────────────
        request_nonce = meta.get("request_nonce", "")
        if not request_nonce:
            return Response(
                {"detail": "request_nonce is required to prevent replay attacks."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nonce_cache_key = f"{NONCE_CACHE_PREFIX}{request_nonce}"
        if cache.get(nonce_cache_key):
            return Response(
                {"detail": "Replay detected — this request_nonce has already been used."},
                status=status.HTTP_409_CONFLICT,
            )
        # Mark this nonce as used (expires after 1 hour)
        cache.set(nonce_cache_key, True, timeout=NONCE_EXPIRY_SECONDS)

        ciphertext_bytes = ciphertext_file.read()
        rel_path, computed_sha256 = _save_ciphertext(ciphertext_bytes)

        if meta.get("ciphertext_sha256") and meta["ciphertext_sha256"] != computed_sha256:
            os.remove(os.path.join(settings.MEDIA_ROOT, rel_path))
            return Response({"detail": "ciphertext_sha256 mismatch — upload rejected."}, status=status.HTTP_400_BAD_REQUEST)

        manifest_data = meta.get("manifest", {})
        signature_data = meta.get("signature", {})
        wrapped_keys_data = meta.get("wrapped_keys", [])

        with transaction.atomic():
            secure_file = SecureFile.objects.create(
                owner=request.user,
                course_id=meta["course"],
                assignment_id=meta["assignment"],
                submission_id=meta.get("submission"),
                file_type=meta["file_type"],
                object_storage_key=rel_path,
                ciphertext_sha256=computed_sha256,
                plaintext_sha256=meta.get("plaintext_sha256", ""),
                aes_gcm_iv=meta["aes_gcm_iv"],
                aes_gcm_tag=meta.get("aes_gcm_tag", ""),
                size_bytes=len(ciphertext_bytes),
                mime_type=meta.get("mime_type", "application/octet-stream"),
                encrypted_filename=meta.get("encrypted_filename"),
            )

            if manifest_data:
                FileManifest.objects.create(
                    file=secure_file,
                    manifest_json=manifest_data.get("manifest_json", {}),
                    manifest_sha256=manifest_data.get("manifest_sha256", ""),
                )

            if signature_data:
                from apps.keys.models import UserPublicKey
                signing_key = UserPublicKey.objects.filter(id=signature_data.get("signing_key_id"), user=request.user).first()
                if signing_key:
                    Signature.objects.create(
                        signed_by_user=request.user,
                        file=secure_file,
                        key=signing_key,
                        signature_algorithm="RSA-PSS-SHA256",
                        signature_value=signature_data.get("signature_value", ""),
                        signed_payload_sha256=signature_data.get("signed_payload_sha256", ""),
                    )

            for wk in wrapped_keys_data:
                from apps.keys.models import UserPublicKey
                recipient_key = UserPublicKey.objects.filter(id=wk.get("recipient_key_id")).first()
                if recipient_key:
                    EncryptedFileKey.objects.create(
                        file=secure_file,
                        recipient_user_id=wk["recipient_user_id"],
                        recipient_key=recipient_key,
                        wrapped_key_algorithm="RSA-OAEP-SHA256",
                        wrapped_key_ciphertext=wk["wrapped_key_ciphertext"],
                        created_by=request.user,
                    )

        return Response({"id": secure_file.id, "ciphertext_sha256": computed_sha256}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        """
        Return the ciphertext (base64) and the requesting user's wrapped AES key.
        Only users with a non-revoked EncryptedFileKey for this file can download.
        """
        secure_file = self.get_object()

        # Prefer the most recently created wrapped key — it's the one wrapped for
        # the user's current active public key (older ones may have been superseded).
        encrypted_key = (
            EncryptedFileKey.objects
            .filter(
                file=secure_file,
                recipient_user=request.user,
                revoked_at__isnull=True,
                recipient_key__status=UserPublicKey.Status.ACTIVE,
            )
            .select_related("recipient_key")
            .order_by("-created_at")
            .first()
        )

        if not encrypted_key:
            return Response({"detail": "You are not a recipient of this file."}, status=status.HTTP_403_FORBIDDEN)

        full_path = os.path.join(settings.MEDIA_ROOT, secure_file.object_storage_key)
        if not os.path.exists(full_path):
            return Response({"detail": "Ciphertext not found in storage."}, status=status.HTTP_404_NOT_FOUND)

        with open(full_path, "rb") as f:
            ciphertext_b64 = base64.b64encode(f.read()).decode("utf-8")

        signature = secure_file.signatures.select_related("signed_by_user", "key").first()
        manifest = getattr(secure_file, "manifest", None)

        payload = {
            "file_id": secure_file.id,
            "file_type": secure_file.file_type,
            "mime_type": secure_file.mime_type,
            "size_bytes": secure_file.size_bytes,
            "ciphertext_sha256": secure_file.ciphertext_sha256,
            "plaintext_sha256": secure_file.plaintext_sha256,
            "aes_gcm_iv": secure_file.aes_gcm_iv,
            "aes_gcm_tag": secure_file.aes_gcm_tag,
            "encrypted_filename": secure_file.encrypted_filename,
            "ciphertext_b64": ciphertext_b64,
            "wrapped_key": {
                "id": encrypted_key.id,
                "wrapped_key_algorithm": encrypted_key.wrapped_key_algorithm,
                "wrapped_key_ciphertext": encrypted_key.wrapped_key_ciphertext,
                "recipient_key_fingerprint": encrypted_key.recipient_key.fingerprint_sha256,
            },
            "signature": {
                "signature_algorithm": signature.signature_algorithm,
                "signature_value": signature.signature_value,
                "signed_payload_sha256": signature.signed_payload_sha256,
                "signed_by": signature.signed_by_user.username,
                "signing_key_fingerprint": signature.key.fingerprint_sha256,
            } if signature else None,
            "manifest": {
                "manifest_json": manifest.manifest_json,
                "manifest_sha256": manifest.manifest_sha256,
            } if manifest else None,
        }

        return Response(payload)

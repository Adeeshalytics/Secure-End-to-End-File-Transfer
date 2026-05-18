from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.audit.models import AuditLog
from apps.keys.models import UserPublicKey
from apps.rbac.models import Role, RoleAssignment


PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwIBAAwIBAgIDAQAB
-----END PUBLIC KEY-----"""


PRIVATE_KEY_PEM = """-----BEGIN PRIVATE KEY-----
private-key-material
-----END PRIVATE KEY-----"""


class PublicKeyRegistrationTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="student", password="Student123!")
        role = Role.objects.create(name="student")
        RoleAssignment.objects.create(user=self.user, role=role)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_register_public_key(self):
        response = self.client.post(
            "/api/v1/keys/register/",
            {
                "key_type": "rsa_oaep_encryption",
                "algorithm": "RSA-OAEP-SHA256-4096",
                "public_key_pem": PUBLIC_KEY_PEM,
                "fingerprint_sha256": "a" * 64,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(UserPublicKey.objects.count(), 1)
        self.assertEqual(AuditLog.objects.filter(action="key.register").count(), 1)

    def test_register_rejects_private_key_material(self):
        response = self.client.post(
            "/api/v1/keys/register/",
            {
                "key_type": "rsa_pss_signing",
                "algorithm": "RSA-PSS-SHA256-4096",
                "public_key_pem": PRIVATE_KEY_PEM,
                "fingerprint_sha256": "b" * 64,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(UserPublicKey.objects.count(), 0)

    def test_me_returns_only_current_user_keys(self):
        User = get_user_model()
        other_user = User.objects.create_user(username="other", password="Other123!")
        UserPublicKey.objects.create(
            user=self.user,
            key_type="rsa_pss_signing",
            algorithm="RSA-PSS-SHA256-4096",
            public_key_pem=PUBLIC_KEY_PEM,
            fingerprint_sha256="c" * 64,
        )
        UserPublicKey.objects.create(
            user=other_user,
            key_type="rsa_oaep_encryption",
            algorithm="RSA-OAEP-SHA256-4096",
            public_key_pem=PUBLIC_KEY_PEM,
            fingerprint_sha256="d" * 64,
        )

        response = self.client.get("/api/v1/keys/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["fingerprint_sha256"], "c" * 64)


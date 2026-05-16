from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.rbac.models import Role, RoleAssignment


class JwtRbacTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.student_role = Role.objects.create(name="student")
        self.examiner_role = Role.objects.create(name="examiner")
        self.student = User.objects.create_user(username="student", password="Student123!")
        self.examiner = User.objects.create_user(username="examiner", password="Examiner123!")
        RoleAssignment.objects.create(user=self.student, role=self.student_role)
        RoleAssignment.objects.create(user=self.examiner, role=self.examiner_role)
        self.client = APIClient()

    def test_login_returns_tokens_and_roles(self):
        response = self.client.post(
            "/api/v1/auth/token/",
            {"username": "student", "password": "Student123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["roles"], ["student"])

    def test_me_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")

        self.assertEqual(response.status_code, 401)

    def test_student_cannot_create_evaluation(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post("/api/v1/evaluations/", {}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_examiner_passes_evaluation_role_gate(self):
        self.client.force_authenticate(user=self.examiner)
        response = self.client.post("/api/v1/evaluations/", {}, format="json")

        self.assertEqual(response.status_code, 400)


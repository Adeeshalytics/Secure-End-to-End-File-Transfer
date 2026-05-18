import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import UserProfile
from apps.rbac.models import Role, RoleAssignment


DEMO_IDENTITIES = [
    {
        "username": "student_demo",
        "email": "student.demo@example.edu",
        "role": "student",
        "password_env": "DEMO_STUDENT_PASSWORD",
        "default_password": "StudentDemo123!",
    },
    {
        "username": "examiner_demo",
        "email": "examiner.demo@example.edu",
        "role": "examiner",
        "password_env": "DEMO_EXAMINER_PASSWORD",
        "default_password": "ExaminerDemo123!",
    },
]


class Command(BaseCommand):
    help = "Seed local demo users for JWT login and student/examiner RBAC separation."

    def handle(self, *args, **options):
        User = get_user_model()
        created_count = 0

        for identity in DEMO_IDENTITIES:
            password = os.environ.get(identity["password_env"], identity["default_password"])
            user, created = User.objects.get_or_create(
                username=identity["username"],
                defaults={"email": identity["email"], "is_active": True},
            )
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])
                created_count += 1

            UserProfile.objects.update_or_create(
                user=user,
                defaults={
                    "institution_id": identity["username"],
                    "status": UserProfile.Status.ACTIVE,
                },
            )

            role = Role.objects.get(name=identity["role"])
            RoleAssignment.objects.get_or_create(user=user, role=role)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(DEMO_IDENTITIES)} demo identities ({created_count} created). "
                "Override default passwords with DEMO_STUDENT_PASSWORD and DEMO_EXAMINER_PASSWORD."
            )
        )


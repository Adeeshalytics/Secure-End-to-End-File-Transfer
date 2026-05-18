from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import UserProfile
from apps.assignments.models import Assignment
from apps.courses.models import Course
from apps.rbac.models import Role, RoleAssignment

User = get_user_model()

ROLES = [
    ("student", "Can submit encrypted files and view own submissions"),
    ("examiner", "Can view and evaluate all submissions in assigned courses"),
    ("project_evaluator", "Can evaluate final year projects"),
    ("course_admin", "Can manage course members, assignments, and view audit logs"),
    ("system_admin", "Full system access including audit logs and user management"),
]

DEMO_USERS = [
    ("alice", "alice@university.edu", "DemoPassword1!", "student"),
    ("bob", "bob@university.edu", "DemoPassword1!", "examiner"),
    ("admin", "admin@university.edu", "DemoPassword1!", "course_admin"),
]


class Command(BaseCommand):
    help = "Seed the database with demo roles, users, course, and assignment."

    def handle(self, *args, **options):
        self._seed_roles()
        self._seed_users()
        course = self._seed_course()
        self._seed_assignment(course)
        self.stdout.write(self.style.SUCCESS("\nDemo seed complete."))
        self.stdout.write("\nDemo accounts (username / password / role):")
        for username, _, password, role in DEMO_USERS:
            self.stdout.write(f"  {username:10s}  {password}  ({role})")

    def _seed_roles(self):
        for name, description in ROLES:
            Role.objects.get_or_create(name=name, defaults={"description": description})
        self.stdout.write(f"  Roles ensured: {[r[0] for r in ROLES]}")

    def _seed_users(self):
        for username, email, password, role_name in DEMO_USERS:
            user, created = User.objects.get_or_create(username=username, defaults={"email": email})
            # Always reset the password so re-running seed_demo is idempotent
            user.set_password(password)
            # Promote the demo "admin" account to a Django superuser so /admin/ is usable
            # straight after seeding — no separate createsuperuser step needed.
            if username == "admin":
                user.is_staff = True
                user.is_superuser = True
            user.save()
            UserProfile.objects.get_or_create(
                user=user,
                defaults={"institution_id": f"DEMO-{username.upper()}", "status": UserProfile.Status.ACTIVE},
            )
            role = Role.objects.get(name=role_name)
            RoleAssignment.objects.get_or_create(user=user, role=role, course=None, assignment=None)
        self.stdout.write(f"  Users ensured: {[u[0] for u in DEMO_USERS]}")
        self.stdout.write("  Django admin: 'admin' is now a superuser (use DemoPassword1! at /admin/)")

    def _seed_course(self):
        course, _ = Course.objects.get_or_create(
            code="IS-501",
            defaults={
                "name": "Information Security",
                "department": "Computer Science",
                "academic_year": "2025-2026",
            },
        )
        self.stdout.write(f"  Course ensured: {course.code} — {course.name}")
        return course

    def _seed_assignment(self, course):
        admin_user = User.objects.filter(username="admin").first()
        assignment, _ = Assignment.objects.get_or_create(
            course=course,
            title="Secure File Sharing System",
            defaults={
                "description": "Design and implement a secure end-to-end encrypted file sharing system demonstrating AES-256-GCM, RSA-OAEP, RSA-PSS, and tamper-evident audit logging.",
                "is_active": True,
                "created_by": admin_user,
            },
        )
        self.stdout.write(f"  Assignment ensured: {assignment.title}")

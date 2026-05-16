from django.core.management.base import BaseCommand

from apps.rbac.models import Role


DEFAULT_ROLES = [
    ("student", "Can submit encrypted academic work and manage own cryptographic keys."),
    ("examiner", "Can access assigned encrypted submissions, upload rubrics, and submit signed evaluations."),
    ("project_evaluator", "Can review assigned encrypted submissions and submit signed project evaluations."),
    ("course_admin", "Can manage course-scoped users, assignments, access grants, and audit review."),
    ("system_admin", "Can manage system configuration, RBAC bootstrap, and operational security controls."),
    ("ai_examiner_service", "Service identity for explicitly authorized AI Viva Examiner workflows."),
]


class Command(BaseCommand):
    help = "Seed default RBAC roles for the secure academic evaluation system."

    def handle(self, *args, **options):
        created_count = 0
        for name, description in DEFAULT_ROLES:
            _, created = Role.objects.update_or_create(
                name=name,
                defaults={"description": description},
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(DEFAULT_ROLES)} roles ({created_count} created)."))


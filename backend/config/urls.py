from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.assignments.views import AssignmentViewSet
from apps.audit.views import AuditLogViewSet
from apps.authn.views import MeView, RegisterView, SecureTokenObtainPairView
from apps.courses.views import CourseViewSet
from apps.evaluations.views import EvaluationViewSet
from apps.files.views import SecureFileViewSet
from apps.keys.views import UserPublicKeyViewSet
from apps.submissions.views import SubmissionViewSet


router = DefaultRouter()
router.register("courses", CourseViewSet, basename="course")
router.register("assignments", AssignmentViewSet, basename="assignment")
router.register("submissions", SubmissionViewSet, basename="submission")
router.register("files", SecureFileViewSet, basename="file")
router.register("keys", UserPublicKeyViewSet, basename="key")
router.register("evaluations", EvaluationViewSet, basename="evaluation")
router.register("audit", AuditLogViewSet, basename="audit")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/token/", SecureTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", MeView.as_view(), name="me"),
    path("api/v1/auth/register/", RegisterView.as_view(), name="register"),
    path("api/v1/", include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

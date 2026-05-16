from rest_framework import serializers

from .models import Submission


class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = [
            "id",
            "assignment",
            "student",
            "status",
            "submitted_at",
            "version",
            "manifest_hash",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "submitted_at", "created_at", "updated_at"]


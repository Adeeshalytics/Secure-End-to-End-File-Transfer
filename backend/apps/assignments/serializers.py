from rest_framework import serializers

from .models import Assignment


class AssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            "id",
            "course",
            "title",
            "description_ciphertext",
            "submission_deadline",
            "rubric_release_at",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]


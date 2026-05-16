from rest_framework import serializers

from .models import Evaluation


class EvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation
        fields = [
            "id",
            "submission",
            "examiner",
            "status",
            "evaluation_ciphertext_object_key",
            "manifest_hash",
            "created_at",
            "submitted_at",
        ]
        read_only_fields = ["id", "examiner", "created_at", "submitted_at"]


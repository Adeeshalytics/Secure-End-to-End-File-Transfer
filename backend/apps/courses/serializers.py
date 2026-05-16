from rest_framework import serializers

from .models import Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "code", "name", "department", "academic_year", "created_at"]
        read_only_fields = ["id", "created_at"]


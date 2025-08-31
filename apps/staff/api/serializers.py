from django.contrib.auth import get_user_model
from rest_framework import serializers
from apps.profiles.coach_profile.models import CoachProfile, Certification

User = get_user_model()


class StaffUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'is_active', 'is_enabled', 'is_whitelisted',
            'date_joined', 'last_login'
        ]


class CoachProfileListSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)

    class Meta:
        model = CoachProfile
        fields = [
            'id', 'user_id', 'username', 'email', 'is_active',
            'approval_status', 'years_of_experience'
        ]


class CertificationSerializer(serializers.ModelSerializer):
    coach_username = serializers.CharField(source='coach_profile.user.username', read_only=True)
    verified_by_username = serializers.CharField(source='verified_by.username', read_only=True, default=None)

    class Meta:
        model = Certification
        fields = [
            'id', 'coach_profile', 'coach_username', 'file', 'description',
            'status', 'verified_at', 'verified_by', 'verified_by_username', 'notes'
        ]

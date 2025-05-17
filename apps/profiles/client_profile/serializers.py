from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from .models import (
    ClientProfile, ClientMeasurement, ClientDietRequest, 
    CoachOffer, ClientSubscription, ProgressReport
)
from apps.profiles.coach_profile.serializers import CoachProfileMinimalSerializer

User = get_user_model()


class ClientProfileSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientProfile
        fields = [
            'id', 'username', 'email', 'age', 'gender', 'height', 'weight', 'bmi', 
            'body_fat_percentage', 'health_conditions', 'fitness_goals', 
            'dietary_preferences', 'allergies', 'avatar', 'cover_image',
            'instagram', 'facebook', 'twitter', 'activity_level',
            'last_measurement_date', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'username', 'email', 'bmi', 'last_measurement_date', 'created_at', 'updated_at']
        extra_kwargs = {
            'avatar': {'required': False},  # Make the avatar field optional
            'cover_image': {'required': False},  # Make the cover image field optional
        }

    def get_username(self, obj):
        return obj.user.username
    
    def get_email(self, obj):
        return obj.user.email

    def update(self, instance, validated_data):
        # Check if avatar is in the validated data
        if 'avatar' in validated_data and validated_data['avatar'] is None:
            validated_data.pop('avatar')
        
        # Check if cover_image is in the validated data
        if 'cover_image' in validated_data and validated_data['cover_image'] is None:
            validated_data.pop('cover_image')
        
        # Update instance
        instance = super().update(instance, validated_data)
        
        # Calculate BMI if height and weight are provided
        if instance.height and instance.weight:
            instance.calculate_bmi()
        
        return instance


class ClientMeasurementSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = ClientMeasurement
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'client_name']
    
    def get_client_name(self, obj):
        return obj.client.user.username
    
    def create(self, validated_data):
        measurement = super().create(validated_data)
        # Update the client's last measurement date
        client = measurement.client
        client.update_last_measurement_date()
        return measurement


class ClientMeasurementMinimalSerializer(serializers.ModelSerializer):
    """A simplified version of the measurement serializer for use in request sharing"""
    class Meta:
        model = ClientMeasurement
        fields = ['date', 'weight', 'body_fat_percentage', 'chest', 'waist', 'hips', 'arms', 'thighs']


class ClientDietRequestSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    offer_count = serializers.SerializerMethodField()
    latest_measurements = serializers.SerializerMethodField()

    class Meta:
        model = ClientDietRequest
        fields = [
            'id', 'client', 'client_name', 'title', 'description', 'goals', 
            'dietary_restrictions', 'budget', 'duration_weeks', 'share_measurements', 
            'latest_measurements', 'status', 'created_at', 'updated_at', 'offer_count'
        ]
        read_only_fields = ['id', 'client_name', 'created_at', 'updated_at', 'offer_count', 'latest_measurements']
    
    def get_client_name(self, obj):
        return obj.client.user.username
    
    def get_offer_count(self, obj):
        return obj.offers.count()
    
    def get_latest_measurements(self, obj):
        # Only return measurements if share_measurements is True
        if not obj.share_measurements:
            return None
            
        try:
            latest_measurement = obj.client.measurements.latest('date')
            return ClientMeasurementMinimalSerializer(latest_measurement).data
        except ClientMeasurement.DoesNotExist:
            return None


class CoachOfferSerializer(serializers.ModelSerializer):
    coach_name = serializers.SerializerMethodField()
    coach_details = serializers.SerializerMethodField()
    request_title = serializers.SerializerMethodField()

    class Meta:
        model = CoachOffer
        fields = [
            'id', 'request', 'coach', 'coach_name', 'coach_details', 'request_title',
            'title', 'description', 'price', 'duration_weeks', 
            'includes_meal_plan', 'includes_workout_plan', 'includes_video_consultations',
            'num_consultations', 'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'coach_name', 'coach_details', 'request_title', 'created_at', 'updated_at']
    
    def get_coach_name(self, obj):
        return obj.coach.user.username
    
    def get_coach_details(self, obj):
        return CoachProfileMinimalSerializer(obj.coach).data
    
    def get_request_title(self, obj):
        return obj.request.title


class ClientSubscriptionSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    coach_name = serializers.SerializerMethodField()
    offer_details = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()

    class Meta:
        model = ClientSubscription
        fields = [
            'id', 'client', 'client_name', 'coach', 'coach_name', 
            'offer', 'offer_details', 'start_date', 'end_date', 
            'price_paid', 'payment_reference', 'status', 
            'remaining_days', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'client_name', 'coach_name', 'offer_details', 'remaining_days', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        return obj.client.user.username
    
    def get_coach_name(self, obj):
        return obj.coach.user.username
    
    def get_offer_details(self, obj):
        if obj.offer:
            return CoachOfferSerializer(obj.offer).data
        return None
    
    def get_remaining_days(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        if obj.end_date < today:
            return 0
        return (obj.end_date - today).days


class ProgressReportSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    coach_name = serializers.SerializerMethodField()
    measurement_details = serializers.SerializerMethodField()

    class Meta:
        model = ProgressReport
        fields = [
            'id', 'subscription', 'client_name', 'coach_name', 
            'measurement', 'measurement_details', 'report_date',
            'weight_change', 'body_fat_change', 'client_notes',
            'coach_feedback', 'satisfaction_rating', 'progress_photo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'client_name', 'coach_name', 'measurement_details', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        return obj.subscription.client.user.username
    
    def get_coach_name(self, obj):
        return obj.subscription.coach.user.username
    
    def get_measurement_details(self, obj):
        if obj.measurement:
            return ClientMeasurementMinimalSerializer(obj.measurement).data
        return None

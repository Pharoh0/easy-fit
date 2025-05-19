from rest_framework import serializers
from apps.profiles.client_profile.models import (
    ClientProfile, 
    ClientMeasurement, 
    ClientDietRequest, 
    ClientSubscription,
    ProgressReport
)
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.coach_profile.serializers import CoachProfileMinimalSerializer
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta

User = get_user_model()

class ClientProfileMinimalSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientProfile
        fields = ['id', 'user', 'username', 'full_name', 'profile_pic']
    
    def get_username(self, obj):
        return obj.user.username
    
    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"

class ClientMeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientMeasurement
        fields = [
            'id', 'client', 'date', 'weight', 'height', 'bmi', 
            'body_fat_percentage', 'muscle_mass', 'notes'
        ]
        read_only_fields = ['client']
    
    def create(self, validated_data):
        # Calculate BMI if not provided
        if not validated_data.get('bmi') and validated_data.get('weight') and validated_data.get('height'):
            # Height in meters, weight in kg
            height_m = float(validated_data['height']) / 100
            weight_kg = float(validated_data['weight'])
            validated_data['bmi'] = round(weight_kg / (height_m * height_m), 2)
        
        return super().create(validated_data)

class ProgressReportSerializer(serializers.ModelSerializer):
    measurement = ClientMeasurementSerializer(read_only=True)
    measurement_id = serializers.PrimaryKeyRelatedField(
        queryset=ClientMeasurement.objects.all(),
        source='measurement',
        required=False,
        allow_null=True
    )
    coach_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ProgressReport
        fields = [
            'id', 'subscription', 'report_date', 'week_number', 'overall_progress',
            'workout_adherence', 'diet_adherence', 'coach_comment', 'measurement',
            'measurement_id', 'client_comment', 'coach_name'
        ]
        read_only_fields = ['subscription']
    
    def get_coach_name(self, obj):
        if obj.subscription and obj.subscription.coach:
            return f"{obj.subscription.coach.user.first_name} {obj.subscription.coach.user.last_name}"
        return None

class ClientDietRequestSerializer(serializers.ModelSerializer):
    coach_details = CoachProfileMinimalSerializer(source='coach', read_only=True)
    client_details = ClientProfileMinimalSerializer(source='client', read_only=True)
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientDietRequest
        fields = [
            'id', 'client', 'coach', 'request_date', 'status', 'status_display',
            'goals', 'dietary_restrictions', 'allergies', 'additional_notes',
            'coach_details', 'client_details', 'price', 'is_offer'
        ]
        read_only_fields = ['client', 'status', 'is_offer']
    
    def get_status_display(self, obj):
        return obj.get_status_display()

class ClientSubscriptionSerializer(serializers.ModelSerializer):
    coach_details = CoachProfileMinimalSerializer(source='coach', read_only=True)
    client_details = ClientProfileMinimalSerializer(source='client', read_only=True)
    status_display = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    progress_reports_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientSubscription
        fields = [
            'id', 'client', 'coach', 'start_date', 'end_date', 'status', 'status_display',
            'plan_details', 'coach_details', 'client_details', 'price',
            'days_remaining', 'progress_reports_count', 'name'
        ]
        read_only_fields = ['client', 'coach', 'start_date', 'end_date', 'status', 'price']
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_days_remaining(self, obj):
        if obj.status != 'active' or not obj.end_date:
            return 0
        
        today = datetime.now().date()
        remaining = (obj.end_date - today).days
        return max(0, remaining)
    
    def get_progress_reports_count(self, obj):
        return ProgressReport.objects.filter(subscription=obj).count()

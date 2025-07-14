from rest_framework import serializers
from apps.profiles.client_profile.models import (
    ClientProfile, 
    ClientMeasurement, 
    ClientDietRequest, 
    ClientSubscription,
    ProgressReport,
    BodyPart,
    BodyPartMeasurement
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
    # Add BMI as a calculated field since it's not in the model
    bmi = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientMeasurement
        fields = [
            'id', 'client', 'date', 'weight', 'height', 'bmi', 
            'body_fat_percentage', 'muscle_mass', 'notes'
        ]
        read_only_fields = ['client']
    
    def get_bmi(self, obj):
        # Calculate BMI if height and weight are available
        if obj.weight and obj.height and obj.height > 0:
            height_m = float(obj.height) / 100  # Convert cm to meters
            weight_kg = float(obj.weight)
            return round(weight_kg / (height_m * height_m), 2)
        return None
    
    def create(self, validated_data):
        # BMI is now calculated via get_bmi method, not stored in the model
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


class BodyPartSerializer(serializers.ModelSerializer):
    """Serializer for BodyPart model"""
    category_display = serializers.SerializerMethodField()
    
    class Meta:
        model = BodyPart
        fields = [
            'id', 'name', 'display_name', 'description', 'image_coordinates',
            'category', 'category_display', 'sort_order', 'is_default',
            'created_at', 'updated_at'
        ]
    
    def get_category_display(self, obj):
        return dict(BodyPart._meta.get_field('category').choices).get(obj.category) if obj.category else None


class BodyPartMeasurementSerializer(serializers.ModelSerializer):
    """Serializer for BodyPartMeasurement model"""
    body_part_details = BodyPartSerializer(source='body_part', read_only=True)
    body_part_id = serializers.PrimaryKeyRelatedField(
        queryset=BodyPart.objects.all(),
        source='body_part',
        write_only=True
    )
    unit_display = serializers.SerializerMethodField()
    
    class Meta:
        model = BodyPartMeasurement
        fields = [
            'id', 'measurement', 'body_part', 'body_part_details', 'body_part_id',
            'value', 'unit', 'unit_display', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['body_part']
    
    def get_unit_display(self, obj):
        return dict(BodyPartMeasurement._meta.get_field('unit').choices).get(obj.unit)


class EnhancedClientMeasurementSerializer(ClientMeasurementSerializer):
    """Enhanced Client Measurement serializer with body parts"""
    body_part_measurements = BodyPartMeasurementSerializer(many=True, read_only=True)
    body_parts_data = serializers.ListField(child=serializers.JSONField(), write_only=True, required=False)
    
    class Meta(ClientMeasurementSerializer.Meta):
        fields = ClientMeasurementSerializer.Meta.fields + ['body_part_measurements', 'body_parts_data']
    
    def create(self, validated_data):
        body_parts_data = validated_data.pop('body_parts_data', [])
        measurement = super().create(validated_data)
        
        # Create body part measurements
        for part_data in body_parts_data:
            body_part_id = part_data.get('body_part_id')
            value = part_data.get('value')
            unit = part_data.get('unit', 'cm')
            notes = part_data.get('notes', '')
            
            if body_part_id and value:
                try:
                    body_part = BodyPart.objects.get(id=body_part_id)
                    BodyPartMeasurement.objects.create(
                        measurement=measurement,
                        body_part=body_part,
                        value=value,
                        unit=unit,
                        notes=notes
                    )
                except BodyPart.DoesNotExist:
                    pass  # Skip invalid body part IDs
        
        return measurement
    
    def update(self, instance, validated_data):
        body_parts_data = validated_data.pop('body_parts_data', [])
        measurement = super().update(instance, validated_data)
        
        # Update body part measurements
        for part_data in body_parts_data:
            body_part_id = part_data.get('body_part_id')
            value = part_data.get('value')
            unit = part_data.get('unit', 'cm')
            notes = part_data.get('notes', '')
            
            if body_part_id and value:
                try:
                    body_part = BodyPart.objects.get(id=body_part_id)
                    measurement_obj, created = BodyPartMeasurement.objects.update_or_create(
                        measurement=measurement,
                        body_part=body_part,
                        defaults={
                            'value': value,
                            'unit': unit,
                            'notes': notes
                        }
                    )
                except BodyPart.DoesNotExist:
                    pass  # Skip invalid body part IDs
        
        return measurement

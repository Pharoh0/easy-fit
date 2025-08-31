from rest_framework import serializers
from .models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate

class PlanTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Plan Templates"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = PlanTemplate
        fields = [
            'id', 'name', 'description', 'structure', 'tags', 
            'category', 'difficulty', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Workout Templates"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkoutTemplate
        fields = [
            'id', 'name', 'description', 'structure', 'tags', 
            'category', 'difficulty', 'created_by', 'created_by_name',
            'duration', 'equipment_needed', 'target_muscle_groups',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ExerciseTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Exercise Templates"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = ExerciseTemplate
        fields = [
            'id', 'name', 'description', 'instructions', 'tags',
            'category', 'difficulty', 'created_by', 'created_by_name',
            'equipment_required', 'target_muscles', 'video_url', 'image',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class MealTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Meal Templates"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = MealTemplate
        fields = [
            'id', 'name', 'description', 'ingredients', 'instructions',
            'tags', 'category', 'difficulty', 'created_by', 'created_by_name',
            'nutritional_info', 'preparation_time', 'meal_type',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

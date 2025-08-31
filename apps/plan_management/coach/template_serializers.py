from rest_framework import serializers
from .models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.utils import get_avatar_url

class CoachProfileMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for CoachProfile to avoid circular imports"""
    coach_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachProfile
        fields = ['id', 'coach_name', 'avatar', 'avatar_url']
        
    def get_coach_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
        
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        return get_avatar_url(obj, request)


class PlanTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Plan Templates"""
    coach_name = serializers.SerializerMethodField()
    coach_avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanTemplate
        fields = [
            'id', 'name', 'description', 'template_type', 
            'coach', 'coach_name', 'coach_avatar_url', 'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'coach_name', 'coach_avatar_url']
    
    def get_coach_name(self, obj):
        if obj.coach and obj.coach.user:
            return obj.coach.user.get_full_name() or obj.coach.user.username
        return 'Unknown'
        
    def get_coach_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.coach:
            return get_avatar_url(obj.coach, request)
        return None


class ExerciseTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Exercise Templates"""
    workout_template_name = serializers.CharField(source='workout_template.name', read_only=True)
    
    class Meta:
        model = ExerciseTemplate
        fields = [
            'id', 'workout_template', 'workout_template_name', 
            'exercise_name', 'exercise_category', 
            'sets', 'reps', 'rest_seconds', 'order', 
            'instructions', 'demonstration_video', 'demonstration_image'
        ]
        read_only_fields = ['id', 'workout_template_name']


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Workout Templates"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    exercises = ExerciseTemplateSerializer(source='exercise_templates', many=True, read_only=True)
    
    class Meta:
        model = WorkoutTemplate
        fields = [
            'id', 'template', 'template_name', 'name', 'workout_type',
            'duration_minutes', 'intensity_level', 'instructions',
            'equipment_needed', 'exercises'
        ]
        read_only_fields = ['id', 'template_name', 'exercises']


class MealTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Meal Templates"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    
    class Meta:
        model = MealTemplate
        fields = [
            'id', 'template', 'template_name', 'meal_name', 'meal_type',
            'calories', 'protein_grams', 'carbs_grams', 'fats_grams',
            'preparation_time_minutes', 'cooking_time_minutes',
            'recipe', 'meal_image'
        ]
        read_only_fields = ['id', 'template_name']

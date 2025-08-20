from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PlanDay, NutritionPlan, MealPlan, MealIngredient, 
    WorkoutPlan, ExerciseBlock, Exercise
)

User = get_user_model()


class MealIngredientSerializer(serializers.ModelSerializer):
    """Serializer for meal ingredients"""
    
    class Meta:
        model = MealIngredient
        fields = [
            'id', 'ingredient_name', 'quantity', 'unit',
            'calories_contribution', 'protein_contribution',
            'brand_preference', 'substitution_options', 'is_optional'
        ]


class MealPlanSerializer(serializers.ModelSerializer):
    """Serializer for meal plans"""
    ingredients = MealIngredientSerializer(many=True, read_only=True)
    meal_image_url = serializers.SerializerMethodField()
    total_prep_time = serializers.SerializerMethodField()
    completion_status = serializers.SerializerMethodField()
    
    class Meta:
        model = MealPlan
        fields = [
            'id', 'meal_type', 'meal_order', 'meal_name', 'meal_description',
            'recipe_instructions', 'preparation_time_minutes', 'cooking_time_minutes',
            'calories_per_serving', 'protein_grams', 'carbs_grams', 'fats_grams', 'fiber_grams',
            'servings_count', 'serving_size_description', 'meal_image', 'meal_image_url',
            'recipe_video_url', 'is_completed', 'completed_at', 'client_rating',
            'client_notes', 'alternative_options', 'ingredients', 'total_prep_time',
            'completion_status'
        ]
        read_only_fields = ['id', 'completed_at']
    
    def get_meal_image_url(self, obj):
        """Get full URL for meal image"""
        if obj.meal_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.meal_image.url)
        return None
    
    def get_total_prep_time(self, obj):
        """Calculate total preparation time"""
        return obj.preparation_time_minutes + obj.cooking_time_minutes
    
    def get_completion_status(self, obj):
        """Get completion status with timestamp"""
        return {
            'is_completed': obj.is_completed,
            'completed_at': obj.completed_at,
            'client_rating': obj.client_rating
        }


class NutritionPlanSerializer(serializers.ModelSerializer):
    """Serializer for nutrition plans"""
    meals = MealPlanSerializer(many=True, read_only=True)
    adherence_percentage = serializers.SerializerMethodField()
    nutritional_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = NutritionPlan
        fields = [
            'id', 'target_calories', 'target_protein_grams', 'target_carbs_grams',
            'target_fats_grams', 'target_fiber_grams', 'target_water_liters',
            'actual_calories', 'actual_protein_grams', 'actual_carbs_grams',
            'actual_fats_grams', 'actual_fiber_grams', 'actual_water_liters',
            'dietary_restrictions', 'special_notes', 'meals', 'adherence_percentage',
            'nutritional_summary'
        ]
    
    def get_adherence_percentage(self, obj):
        """Calculate nutritional adherence percentage"""
        return obj.calorie_adherence_percentage
    
    def get_nutritional_summary(self, obj):
        """Get nutritional targets vs actual summary"""
        return {
            'targets': {
                'calories': obj.target_calories,
                'protein': float(obj.target_protein_grams),
                'carbs': float(obj.target_carbs_grams),
                'fats': float(obj.target_fats_grams),
                'water': float(obj.target_water_liters)
            },
            'actual': {
                'calories': obj.actual_calories,
                'protein': float(obj.actual_protein_grams) if obj.actual_protein_grams else 0,
                'carbs': float(obj.actual_carbs_grams) if obj.actual_carbs_grams else 0,
                'fats': float(obj.actual_fats_grams) if obj.actual_fats_grams else 0,
                'water': float(obj.actual_water_liters) if obj.actual_water_liters else 0
            }
        }


class ExerciseSerializer(serializers.ModelSerializer):
    """Serializer for exercises"""
    demonstration_image_url = serializers.SerializerMethodField()
    completion_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercise
        fields = [
            'id', 'exercise_name', 'exercise_category', 'exercise_order',
            'sets_count', 'reps_per_set', 'duration_seconds', 'weight_kg', 'distance_meters',
            'rest_between_sets_seconds', 'tempo_description', 'form_instructions',
            'common_mistakes', 'modifications', 'demonstration_video_url',
            'demonstration_image', 'demonstration_image_url', 'is_completed',
            'actual_sets_completed', 'actual_reps_completed', 'actual_weight_used',
            'completion_status'
        ]
    
    def get_demonstration_image_url(self, obj):
        """Get full URL for demonstration image"""
        if obj.demonstration_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.demonstration_image.url)
        return None
    
    def get_completion_status(self, obj):
        """Get exercise completion details"""
        return {
            'is_completed': obj.is_completed,
            'sets_completed': obj.actual_sets_completed,
            'reps_completed': obj.actual_reps_completed,
            'weight_used': float(obj.actual_weight_used) if obj.actual_weight_used else None
        }


class ExerciseBlockSerializer(serializers.ModelSerializer):
    """Serializer for exercise blocks"""
    exercises = ExerciseSerializer(many=True, read_only=True)
    completion_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = ExerciseBlock
        fields = [
            'id', 'block_name', 'block_type', 'block_order', 'duration_minutes',
            'rest_between_exercises_seconds', 'instructions', 'is_completed',
            'exercises', 'completion_summary'
        ]
    
    def get_completion_summary(self, obj):
        """Get completion summary for the block"""
        exercises = obj.exercises.all()
        total_exercises = exercises.count()
        completed_exercises = exercises.filter(is_completed=True).count()
        
        return {
            'total_exercises': total_exercises,
            'completed_exercises': completed_exercises,
            'completion_percentage': (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
        }


class WorkoutPlanSerializer(serializers.ModelSerializer):
    """Serializer for workout plans"""
    exercise_blocks = ExerciseBlockSerializer(many=True, read_only=True)
    workout_image_url = serializers.SerializerMethodField()
    completion_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkoutPlan
        fields = [
            'id', 'workout_name', 'workout_type', 'warm_up_duration_minutes',
            'main_workout_duration_minutes', 'cool_down_duration_minutes', 'total_duration_minutes',
            'intensity_level', 'target_calories_burn', 'target_heart_rate_zone',
            'required_equipment', 'location_type', 'workout_video_url',
            'workout_image', 'workout_image_url', 'special_instructions',
            'is_completed', 'completed_at', 'actual_duration_minutes',
            'actual_calories_burned', 'client_effort_rating', 'client_notes',
            'exercise_blocks', 'completion_summary'
        ]
        read_only_fields = ['id', 'completed_at']
    
    def get_workout_image_url(self, obj):
        """Get full URL for workout image"""
        if obj.workout_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.workout_image.url)
        return None
    
    def get_completion_summary(self, obj):
        """Get workout completion summary"""
        blocks = obj.exercise_blocks.all()
        total_blocks = blocks.count()
        completed_blocks = blocks.filter(is_completed=True).count()
        
        # Count total exercises
        total_exercises = sum(block.exercises.count() for block in blocks)
        completed_exercises = sum(block.exercises.filter(is_completed=True).count() for block in blocks)
        
        return {
            'total_blocks': total_blocks,
            'completed_blocks': completed_blocks,
            'total_exercises': total_exercises,
            'completed_exercises': completed_exercises,
            'overall_completion_percentage': (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
        }


class PlanDaySerializer(serializers.ModelSerializer):
    """Serializer for plan days"""
    nutrition_plan = NutritionPlanSerializer(read_only=True)
    workout_plan = WorkoutPlanSerializer(read_only=True)
    day_summary = serializers.SerializerMethodField()
    is_overdue = serializers.ReadOnlyField()
    
    class Meta:
        model = PlanDay
        fields = [
            'id', 'day_number', 'scheduled_date', 'actual_date', 'day_title',
            'day_description', 'day_theme', 'completion_status', 'completion_percentage',
            'started_at', 'completed_at', 'coach_instructions', 'coach_notes',
            'client_feedback', 'client_rating', 'planned_difficulty', 'actual_difficulty',
            'estimated_duration_minutes', 'actual_duration_minutes', 'nutrition_plan',
            'workout_plan', 'day_summary', 'is_overdue'
        ]
        read_only_fields = ['id', 'started_at', 'completed_at', 'is_overdue']
    
    def get_day_summary(self, obj):
        """Get comprehensive day summary"""
        summary = {
            'has_nutrition': hasattr(obj, 'nutrition_plan'),
            'has_workout': hasattr(obj, 'workout_plan'),
            'completion_status': obj.completion_status,
            'completion_percentage': float(obj.completion_percentage),
            'is_overdue': obj.is_overdue
        }
        
        # Add nutrition summary if exists
        if hasattr(obj, 'nutrition_plan'):
            meals = obj.nutrition_plan.meals.all()
            summary['nutrition_summary'] = {
                'total_meals': meals.count(),
                'completed_meals': meals.filter(is_completed=True).count(),
                'target_calories': obj.nutrition_plan.target_calories,
                'actual_calories': obj.nutrition_plan.actual_calories
            }
        
        # Add workout summary if exists
        if hasattr(obj, 'workout_plan'):
            blocks = obj.workout_plan.exercise_blocks.all()
            total_exercises = sum(block.exercises.count() for block in blocks)
            completed_exercises = sum(block.exercises.filter(is_completed=True).count() for block in blocks)
            
            summary['workout_summary'] = {
                'total_exercises': total_exercises,
                'completed_exercises': completed_exercises,
                'target_duration': obj.workout_plan.total_duration_minutes,
                'actual_duration': obj.workout_plan.actual_duration_minutes,
                'target_calories': obj.workout_plan.target_calories_burn,
                'actual_calories': obj.workout_plan.actual_calories_burned
            }
        
        return summary


class PlanDayCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating plan days with nested data"""
    nutrition_plan_data = serializers.JSONField(write_only=True, required=False)
    workout_plan_data = serializers.JSONField(write_only=True, required=False)
    
    class Meta:
        model = PlanDay
        fields = [
            'day_number', 'scheduled_date', 'day_title', 'day_description',
            'day_theme', 'coach_instructions', 'planned_difficulty',
            'estimated_duration_minutes', 'nutrition_plan_data', 'workout_plan_data'
        ]
    
    def create(self, validated_data):
        """Create plan day with nested nutrition and workout plans"""
        nutrition_data = validated_data.pop('nutrition_plan_data', None)
        workout_data = validated_data.pop('workout_plan_data', None)
        
        plan_day = super().create(validated_data)
        
        # Create nutrition plan if data provided
        if nutrition_data:
            nutrition_plan = NutritionPlan.objects.create(
                plan_day=plan_day,
                **nutrition_data.get('plan_data', {})
            )
            
            # Create meals
            for meal_data in nutrition_data.get('meals', []):
                ingredients_data = meal_data.pop('ingredients', [])
                meal = MealPlan.objects.create(
                    nutrition_plan=nutrition_plan,
                    **meal_data
                )
                
                # Create ingredients
                for ingredient_data in ingredients_data:
                    MealIngredient.objects.create(
                        meal=meal,
                        **ingredient_data
                    )
        
        # Create workout plan if data provided
        if workout_data:
            workout_plan = WorkoutPlan.objects.create(
                plan_day=plan_day,
                **workout_data.get('plan_data', {})
            )
            
            # Create exercise blocks
            for block_data in workout_data.get('blocks', []):
                exercises_data = block_data.pop('exercises', [])
                block = ExerciseBlock.objects.create(
                    workout_plan=workout_plan,
                    **block_data
                )
                
                # Create exercises
                for exercise_data in exercises_data:
                    Exercise.objects.create(
                        exercise_block=block,
                        **exercise_data
                    )
        
        return plan_day


class PlanDayUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating plan day completion status"""
    
    class Meta:
        model = PlanDay
        fields = [
            'completion_status', 'completion_percentage', 'actual_date',
            'client_feedback', 'client_rating', 'actual_difficulty',
            'actual_duration_minutes'
        ]
    
    def update(self, instance, validated_data):
        """Update plan day and handle completion logic"""
        if validated_data.get('completion_status') == 'completed' and not instance.completed_at:
            instance.mark_completed()
        
        return super().update(instance, validated_data)

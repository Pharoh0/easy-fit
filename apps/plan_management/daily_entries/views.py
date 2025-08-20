from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from django.utils import timezone
from .models import (
    PlanDay, NutritionPlan, MealPlan, MealIngredient, 
    WorkoutPlan, ExerciseBlock, Exercise
)
from .serializers import (
    PlanDaySerializer, PlanDayCreateSerializer, PlanDayUpdateSerializer,
    NutritionPlanSerializer, MealPlanSerializer, MealIngredientSerializer,
    WorkoutPlanSerializer, ExerciseBlockSerializer, ExerciseSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanDayViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan days"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PlanDayCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PlanDayUpdateSerializer
        return PlanDaySerializer
    
    def get_queryset(self):
        """Get plan days for user's subscriptions"""
        return PlanDay.objects.filter(
            subscription__client=self.request.user
        ).select_related(
            'subscription__product_plan__coach',
            'nutrition_plan',
            'workout_plan'
        ).prefetch_related(
            'nutrition_plan__meals__ingredients',
            'workout_plan__exercise_blocks__exercises'
        ).order_by('day_number')
    
    def list(self, request, *args, **kwargs):
        """List plan days with filtering options"""
        queryset = self.get_queryset()
        
        # Filter by subscription
        subscription_id = request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)
        
        # Filter by completion status
        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter == 'pending':
                queryset = queryset.filter(completion_status__in=['not_started', 'in_progress'])
            elif status_filter == 'overdue':
                today = timezone.now().date()
                queryset = queryset.exclude(completion_status__in=['completed', 'skipped']).filter(scheduled_date__lt=today)
            else:
                queryset = queryset.filter(completion_status=status_filter)
        
        # Filter for today's plan
        if request.query_params.get('today') == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(scheduled_date=today)
        
        # Filter for upcoming days
        if request.query_params.get('upcoming') == 'true':
            today = timezone.now().date()
            queryset = queryset.filter(scheduled_date__gte=today)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def start_day(self, request, pk=None):
        """Mark day as started"""
        plan_day = self.get_object()
        
        if plan_day.completion_status == 'not_started':
            plan_day.completion_status = 'in_progress'
            plan_day.started_at = timezone.now()
            plan_day.save()
        
        serializer = self.get_serializer(plan_day)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_day(self, request, pk=None):
        """Mark day as completed"""
        plan_day = self.get_object()
        plan_day.mark_completed()
        
        # Update progress tracking
        if hasattr(plan_day.subscription, 'progress'):
            plan_day.subscription.progress.update_progress()
        
        serializer = self.get_serializer(plan_day)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def skip_day(self, request, pk=None):
        """Mark day as skipped"""
        plan_day = self.get_object()
        reason = request.data.get('reason', '')
        
        plan_day.completion_status = 'skipped'
        plan_day.client_feedback = f"Skipped - {reason}"
        plan_day.save()
        
        serializer = self.get_serializer(plan_day)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reschedule_day(self, request, pk=None):
        """Reschedule a day"""
        plan_day = self.get_object()
        new_date = request.data.get('new_date')
        
        if not new_date:
            return Response(
                {'error': 'new_date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        plan_day.scheduled_date = new_date
        plan_day.completion_status = 'rescheduled'
        plan_day.save()
        
        serializer = self.get_serializer(plan_day)
        return Response(serializer.data)


class MealPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for managing meal plans"""
    serializer_class = MealPlanSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get meal plans for user's nutrition plans"""
        return MealPlan.objects.filter(
            nutrition_plan__plan_day__subscription__client=self.request.user
        ).select_related(
            'nutrition_plan__plan_day'
        ).prefetch_related('ingredients').order_by('meal_order')
    
    @action(detail=True, methods=['post'])
    def complete_meal(self, request, pk=None):
        """Mark meal as completed"""
        meal = self.get_object()
        meal.mark_completed()
        
        # Update nutrition plan actual values if provided
        actual_data = request.data.get('actual_nutrition', {})
        if actual_data:
            nutrition_plan = meal.nutrition_plan
            nutrition_plan.actual_calories = (nutrition_plan.actual_calories or 0) + actual_data.get('calories', 0)
            nutrition_plan.actual_protein_grams = (nutrition_plan.actual_protein_grams or 0) + actual_data.get('protein', 0)
            nutrition_plan.actual_carbs_grams = (nutrition_plan.actual_carbs_grams or 0) + actual_data.get('carbs', 0)
            nutrition_plan.actual_fats_grams = (nutrition_plan.actual_fats_grams or 0) + actual_data.get('fats', 0)
            nutrition_plan.save()
        
        serializer = self.get_serializer(meal)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def rate_meal(self, request, pk=None):
        """Rate a meal"""
        meal = self.get_object()
        rating = request.data.get('rating')
        notes = request.data.get('notes', '')
        
        if not rating or rating < 1 or rating > 5:
            return Response(
                {'error': 'Rating must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        meal.client_rating = rating
        meal.client_notes = notes
        meal.save()
        
        serializer = self.get_serializer(meal)
        return Response(serializer.data)


class WorkoutPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for managing workout plans"""
    serializer_class = WorkoutPlanSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get workout plans for user's plan days"""
        return WorkoutPlan.objects.filter(
            plan_day__subscription__client=self.request.user
        ).select_related(
            'plan_day__subscription'
        ).prefetch_related(
            'exercise_blocks__exercises'
        )
    
    @action(detail=True, methods=['post'])
    def start_workout(self, request, pk=None):
        """Start a workout session"""
        workout = self.get_object()
        
        # Update plan day status if not started
        if workout.plan_day.completion_status == 'not_started':
            workout.plan_day.completion_status = 'in_progress'
            workout.plan_day.started_at = timezone.now()
            workout.plan_day.save()
        
        serializer = self.get_serializer(workout)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_workout(self, request, pk=None):
        """Complete a workout session"""
        workout = self.get_object()
        
        # Update workout completion data
        workout.mark_completed()
        workout.actual_duration_minutes = request.data.get('duration_minutes')
        workout.actual_calories_burned = request.data.get('calories_burned')
        workout.client_effort_rating = request.data.get('effort_rating')
        workout.client_notes = request.data.get('notes', '')
        workout.save()
        
        serializer = self.get_serializer(workout)
        return Response(serializer.data)


class ExerciseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing exercises"""
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get exercises for user's workout plans"""
        return Exercise.objects.filter(
            exercise_block__workout_plan__plan_day__subscription__client=self.request.user
        ).select_related(
            'exercise_block__workout_plan__plan_day'
        ).order_by('exercise_order')
    
    @action(detail=True, methods=['post'])
    def complete_exercise(self, request, pk=None):
        """Mark exercise as completed with performance data"""
        exercise = self.get_object()
        
        exercise.is_completed = True
        exercise.actual_sets_completed = request.data.get('sets_completed', exercise.sets_count)
        exercise.actual_reps_completed = request.data.get('reps_completed')
        exercise.actual_weight_used = request.data.get('weight_used')
        exercise.save()
        
        # Check if all exercises in block are completed
        block = exercise.exercise_block
        if not block.exercises.filter(is_completed=False).exists():
            block.is_completed = True
            block.save()
            
            # Check if all blocks in workout are completed
            workout = block.workout_plan
            if not workout.exercise_blocks.filter(is_completed=False).exists():
                workout.mark_completed()
        
        serializer = self.get_serializer(exercise)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def log_performance(self, request, pk=None):
        """Log exercise performance without marking as completed"""
        exercise = self.get_object()
        
        # This could be used for tracking partial completion or rest between sets
        performance_data = request.data.get('performance', {})
        
        # Store performance data in a related model or update exercise notes
        # For now, we'll just return the exercise data
        
        serializer = self.get_serializer(exercise)
        return Response(serializer.data)

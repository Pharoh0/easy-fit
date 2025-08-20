from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PlanRequest, PlanCancellation
from .client.models import PlanSubscription
from .coach.models import ProductPlan

User = get_user_model()


class PlanRequestSerializer(serializers.ModelSerializer):
    """Serializer for PlanRequest model"""
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_email = serializers.CharField(source='client.email', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_type = serializers.CharField(source='plan.plan_type', read_only=True)
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    coach_name = serializers.CharField(source='plan.coach.user.get_full_name', read_only=True)
    
    class Meta:
        model = PlanRequest
        fields = [
            'id', 'client', 'plan', 'status', 'message', 'goals',
            'health_conditions', 'dietary_preferences', 'fitness_level',
            'preferred_schedule', 'budget_range', 'customization_notes',
            'rejection_reason', 'created_at', 'updated_at',
            # Read-only fields
            'client_name', 'client_email', 'plan_name', 'plan_type',
            'plan_price', 'coach_name'
        ]
        read_only_fields = ['id', 'client', 'plan', 'status', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate plan request data"""
        if not data.get('message') and not data.get('goals'):
            raise serializers.ValidationError(
                "Either message or goals must be provided"
            )
        
        return data


class PlanCancellationSerializer(serializers.ModelSerializer):
    """Serializer for PlanCancellation model"""
    client_name = serializers.CharField(source='subscription.client.get_full_name', read_only=True)
    plan_name = serializers.CharField(source='subscription.product_plan.name', read_only=True)
    coach_name = serializers.CharField(source='subscription.product_plan.coach.user.get_full_name', read_only=True)
    subscription_start_date = serializers.DateTimeField(source='subscription.subscribed_at', read_only=True)
    subscription_duration = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = PlanCancellation
        fields = [
            'id', 'subscription', 'cancellation_reason', 'detailed_feedback',
            'satisfaction_rating', 'would_recommend', 'improvement_suggestions',
            'refund_requested', 'refund_amount', 'refund_status', 'refund_notes',
            'processed_at', 'created_at',
            # Read-only fields
            'client_name', 'plan_name', 'coach_name', 'subscription_start_date',
            'subscription_duration'
        ]
        read_only_fields = [
            'id', 'subscription', 'refund_amount', 'refund_status', 
            'refund_notes', 'processed_at', 'created_at'
        ]
    
    def get_subscription_duration(self, obj):
        """Compute duration in days from product plan start and end dates."""
        try:
            plan = obj.subscription.product_plan
            start = getattr(plan, 'start_date', None)
            end = getattr(plan, 'end_date', None)
            if start and end:
                # Ensure we handle both date and datetime fields
                delta = (end - start)
                return delta.days
        except Exception:
            pass
        return None

    def validate_satisfaction_rating(self, value):
        """Validate satisfaction rating"""
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
    
    def validate(self, data):
        """Validate cancellation data"""
        if not data.get('cancellation_reason'):
            raise serializers.ValidationError(
                "Cancellation reason is required"
            )
        
        if data.get('refund_requested') and not data.get('detailed_feedback'):
            raise serializers.ValidationError(
                "Detailed feedback is required when requesting a refund"
            )
        
        return data


class PlanRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating plan requests"""
    plan_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = PlanRequest
        fields = [
            'plan_id', 'message', 'goals', 'health_conditions',
            'dietary_preferences', 'fitness_level', 'preferred_schedule',
            'budget_range'
        ]
    
    def validate_plan_id(self, value):
        """Validate that plan exists"""
        try:
            ProductPlan.objects.get(id=value)
        except ProductPlan.DoesNotExist:
            raise serializers.ValidationError("Plan not found")
        return value


class PlanCancellationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating plan cancellations"""
    subscription_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = PlanCancellation
        fields = [
            'subscription_id', 'cancellation_reason', 'detailed_feedback',
            'satisfaction_rating', 'would_recommend', 'improvement_suggestions',
            'refund_requested'
        ]
    
    def validate_subscription_id(self, value):
        """Validate that subscription exists and is active"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context required")
        
        try:
            subscription = PlanSubscription.objects.get(
                id=value,
                client=request.user,
                status='active'
            )
        except PlanSubscription.DoesNotExist:
            raise serializers.ValidationError("Active subscription not found")
        
        return value


# Import and re-export serializers from submodules for easy access
from .daily_entries.serializers import (
    PlanDaySerializer, NutritionPlanSerializer, MealPlanSerializer,
    WorkoutPlanSerializer, ExerciseSerializer
)
from .ratings.serializers import (
    PlanRatingSerializer, CoachRatingStatsSerializer
)
from .dashboard.serializers import (
    PlanProgressSerializer, DailyProgressLogSerializer, GoalTrackingSerializer
)
from .notifications.serializers import (
    PlanNotificationSerializer, NotificationPreferenceSerializer
)

__all__ = [
    'PlanRequestSerializer', 'PlanCancellationSerializer',
    'PlanRequestCreateSerializer', 'PlanCancellationCreateSerializer',
    # Daily entries
    'PlanDaySerializer', 'NutritionPlanSerializer', 'MealPlanSerializer',
    'WorkoutPlanSerializer', 'ExerciseSerializer',
    # Ratings
    'PlanRatingSerializer', 'CoachRatingStatsSerializer',
    # Dashboard
    'PlanProgressSerializer', 'DailyProgressLogSerializer', 'GoalTrackingSerializer',
    # Notifications
    'PlanNotificationSerializer', 'NotificationPreferenceSerializer',
]

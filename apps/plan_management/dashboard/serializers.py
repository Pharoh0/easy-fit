from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PlanProgress, DailyProgressLog, PlanMilestone, 
    WeeklyProgressSummary, GoalTracking
)

User = get_user_model()


class DailyProgressLogSerializer(serializers.ModelSerializer):
    """Serializer for daily progress logs"""
    overall_day_rating = serializers.ReadOnlyField()
    day_completion_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyProgressLog
        fields = [
            'id', 'date', 'meals_completed', 'workouts_completed', 'calories_burned',
            'time_spent_minutes', 'energy_level', 'mood_rating', 'sleep_hours',
            'water_intake_liters', 'stress_level', 'daily_notes', 'achievements',
            'challenges', 'day_completed', 'completion_time', 'overall_day_rating',
            'day_completion_summary'
        ]
        read_only_fields = ['id', 'overall_day_rating', 'completion_time']
    
    def get_day_completion_summary(self, obj):
        """Get summary of day completion"""
        return {
            'completion_status': 'completed' if obj.day_completed else 'in_progress',
            'wellness_score': self._calculate_wellness_score(obj),
            'activity_score': self._calculate_activity_score(obj)
        }
    
    def _calculate_wellness_score(self, obj):
        """Calculate wellness score based on mood, energy, sleep"""
        scores = []
        if obj.energy_level:
            scores.append(obj.energy_level)
        if obj.mood_rating:
            scores.append(obj.mood_rating)
        if obj.sleep_hours:
            # Convert sleep hours to 1-5 scale (6-8 hours = 5, less/more = lower)
            if 7 <= obj.sleep_hours <= 8:
                scores.append(5)
            elif 6 <= obj.sleep_hours <= 9:
                scores.append(4)
            else:
                scores.append(3)
        
        return sum(scores) / len(scores) if scores else 0
    
    def _calculate_activity_score(self, obj):
        """Calculate activity score based on completed activities"""
        total_activities = obj.meals_completed + obj.workouts_completed
        if total_activities >= 5:
            return 5
        elif total_activities >= 3:
            return 4
        elif total_activities >= 2:
            return 3
        elif total_activities >= 1:
            return 2
        else:
            return 1


class PlanMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for plan milestones"""
    subscription_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanMilestone
        fields = [
            'id', 'milestone_type', 'title', 'description', 'achieved_at',
            'badge_icon', 'milestone_value', 'is_shared', 'subscription_info'
        ]
        read_only_fields = ['id', 'achieved_at']
    
    def get_subscription_info(self, obj):
        """Get basic subscription info"""
        return {
            'plan_name': obj.subscription.product_plan.name,
            'coach_name': obj.subscription.product_plan.coach.user.get_full_name()
        }


class WeeklyProgressSummarySerializer(serializers.ModelSerializer):
    """Serializer for weekly progress summaries"""
    week_performance = serializers.SerializerMethodField()
    comparison_with_previous = serializers.SerializerMethodField()
    
    class Meta:
        model = WeeklyProgressSummary
        fields = [
            'id', 'week_start_date', 'week_end_date', 'days_completed',
            'total_days_scheduled', 'weekly_completion_rate', 'total_meals_completed',
            'total_workouts_completed', 'total_calories_burned', 'total_time_spent_minutes',
            'average_energy_level', 'average_mood_rating', 'average_sleep_hours',
            'consistency_score', 'improvement_from_previous_week', 'created_at',
            'week_performance', 'comparison_with_previous'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_week_performance(self, obj):
        """Get week performance analysis"""
        performance_level = 'excellent'
        if obj.weekly_completion_rate < 50:
            performance_level = 'needs_improvement'
        elif obj.weekly_completion_rate < 75:
            performance_level = 'good'
        elif obj.weekly_completion_rate < 90:
            performance_level = 'very_good'
        
        return {
            'performance_level': performance_level,
            'completion_rate': float(obj.weekly_completion_rate),
            'consistency_score': float(obj.consistency_score),
            'wellness_average': float(obj.average_mood_rating) if obj.average_mood_rating else 0
        }
    
    def get_comparison_with_previous(self, obj):
        """Compare with previous week"""
        previous_week = WeeklyProgressSummary.objects.filter(
            progress=obj.progress,
            week_start_date__lt=obj.week_start_date
        ).order_by('-week_start_date').first()
        
        if not previous_week:
            return None
        
        return {
            'completion_rate_change': float(obj.weekly_completion_rate - previous_week.weekly_completion_rate),
            'activity_change': obj.total_workouts_completed - previous_week.total_workouts_completed,
            'mood_change': float(obj.average_mood_rating - previous_week.average_mood_rating) if obj.average_mood_rating and previous_week.average_mood_rating else 0
        }


class GoalTrackingSerializer(serializers.ModelSerializer):
    """Serializer for goal tracking"""
    progress_analysis = serializers.SerializerMethodField()
    days_remaining = serializers.ReadOnlyField()
    
    class Meta:
        model = GoalTracking
        fields = [
            'id', 'goal_type', 'title', 'description', 'target_value',
            'current_value', 'unit', 'start_date', 'target_date',
            'achieved_date', 'is_achieved', 'is_active', 'progress_percentage',
            'created_at', 'updated_at', 'progress_analysis', 'days_remaining'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'achieved_date', 'days_remaining']
    
    def get_progress_analysis(self, obj):
        """Get progress analysis and predictions"""
        days_elapsed = (obj.updated_at.date() - obj.start_date).days
        total_days = (obj.target_date - obj.start_date).days
        
        if total_days <= 0:
            return None
        
        expected_progress = (days_elapsed / total_days) * 100
        actual_progress = float(obj.progress_percentage)
        
        # Calculate if on track
        on_track = actual_progress >= (expected_progress * 0.8)  # 80% of expected is considered on track
        
        return {
            'expected_progress': round(expected_progress, 2),
            'actual_progress': actual_progress,
            'progress_difference': round(actual_progress - expected_progress, 2),
            'on_track': on_track,
            'days_elapsed': days_elapsed,
            'total_days': total_days,
            'completion_prediction': self._predict_completion_date(obj, days_elapsed, actual_progress)
        }
    
    def _predict_completion_date(self, obj, days_elapsed, actual_progress):
        """Predict completion date based on current progress"""
        if actual_progress <= 0 or days_elapsed <= 0:
            return None
        
        daily_progress_rate = actual_progress / days_elapsed
        remaining_progress = 100 - actual_progress
        
        if daily_progress_rate <= 0:
            return None
        
        predicted_days_remaining = remaining_progress / daily_progress_rate
        predicted_completion = obj.updated_at.date() + timezone.timedelta(days=int(predicted_days_remaining))
        
        return {
            'predicted_date': predicted_completion,
            'days_ahead_behind': (obj.target_date - predicted_completion).days
        }


class PlanProgressSerializer(serializers.ModelSerializer):
    """Serializer for plan progress"""
    daily_logs = DailyProgressLogSerializer(many=True, read_only=True)
    weekly_summaries = WeeklyProgressSummarySerializer(many=True, read_only=True)
    milestones = PlanMilestoneSerializer(many=True, read_only=True, source='subscription.milestones')
    goals = GoalTrackingSerializer(many=True, read_only=True, source='subscription.goals')
    progress_insights = serializers.SerializerMethodField()
    subscription_info = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanProgress
        fields = [
            'id', 'total_days', 'completed_days', 'completion_percentage',
            'current_streak', 'longest_streak', 'total_meals_completed',
            'total_workouts_completed', 'total_calories_burned', 'average_daily_time_minutes',
            'total_time_spent_minutes', 'adherence_rate', 'improvement_score',
            'last_updated', 'daily_logs', 'weekly_summaries', 'milestones',
            'goals', 'progress_insights', 'subscription_info'
        ]
        read_only_fields = ['id', 'last_updated']
    
    def get_progress_insights(self, obj):
        """Get comprehensive progress insights"""
        recent_logs = obj.daily_logs.order_by('-date')[:7]  # Last 7 days
        
        # Calculate trends
        mood_trend = self._calculate_trend([log.mood_rating for log in recent_logs if log.mood_rating])
        energy_trend = self._calculate_trend([log.energy_level for log in recent_logs if log.energy_level])
        
        # Performance analysis
        performance_level = 'excellent'
        if obj.adherence_rate < 60:
            performance_level = 'needs_improvement'
        elif obj.adherence_rate < 75:
            performance_level = 'good'
        elif obj.adherence_rate < 85:
            performance_level = 'very_good'
        
        return {
            'performance_level': performance_level,
            'adherence_rate': float(obj.adherence_rate),
            'streak_status': {
                'current': obj.current_streak,
                'longest': obj.longest_streak,
                'is_improving': obj.current_streak >= (obj.longest_streak * 0.8)
            },
            'wellness_trends': {
                'mood_trend': mood_trend,
                'energy_trend': energy_trend
            },
            'activity_summary': {
                'total_meals': obj.total_meals_completed,
                'total_workouts': obj.total_workouts_completed,
                'total_calories': obj.total_calories_burned,
                'avg_daily_time': obj.average_daily_time_minutes
            }
        }
    
    def get_subscription_info(self, obj):
        """Get basic subscription information"""
        return {
            'plan_name': obj.subscription.product_plan.name,
            'coach_name': obj.subscription.product_plan.coach.user.get_full_name(),
            'plan_type': obj.subscription.product_plan.get_plan_type_display(),
            'start_date': obj.subscription.product_plan.start_date,
            'end_date': obj.subscription.product_plan.end_date
        }
    
    def _calculate_trend(self, values):
        """Calculate trend direction for a list of values"""
        if len(values) < 2:
            return 'stable'
        
        # Simple trend calculation
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        if not first_half or not second_half:
            return 'stable'
        
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        
        difference = second_avg - first_avg
        
        if difference > 0.5:
            return 'improving'
        elif difference < -0.5:
            return 'declining'
        else:
            return 'stable'


class PlanProgressSummarySerializer(serializers.ModelSerializer):
    """Simplified serializer for progress summaries"""
    subscription_name = serializers.SerializerMethodField()
    recent_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanProgress
        fields = [
            'id', 'subscription_name', 'completion_percentage', 'current_streak',
            'adherence_rate', 'total_workouts_completed', 'total_meals_completed',
            'last_updated', 'recent_activity'
        ]
    
    def get_subscription_name(self, obj):
        """Get subscription plan name"""
        return obj.subscription.product_plan.name
    
    def get_recent_activity(self, obj):
        """Get recent activity summary"""
        recent_log = obj.daily_logs.order_by('-date').first()
        if recent_log:
            return {
                'last_activity_date': recent_log.date,
                'last_day_completed': recent_log.day_completed,
                'recent_mood': recent_log.mood_rating,
                'recent_energy': recent_log.energy_level
            }
        return None

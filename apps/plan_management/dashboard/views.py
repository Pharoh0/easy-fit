from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg, Sum, Count
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    PlanProgress, DailyProgressLog, PlanMilestone, 
    WeeklyProgressSummary, GoalTracking
)
from .serializers import (
    PlanProgressSerializer, PlanProgressSummarySerializer,
    DailyProgressLogSerializer, PlanMilestoneSerializer,
    WeeklyProgressSummarySerializer, GoalTrackingSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanProgressViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan progress"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PlanProgressSummarySerializer
        return PlanProgressSerializer
    
    def get_queryset(self):
        """Get progress for user's subscriptions"""
        return PlanProgress.objects.filter(
            subscription__client=self.request.user
        ).select_related(
            'subscription__product_plan__coach'
        ).prefetch_related(
            'daily_logs',
            'weekly_summaries',
            'subscription__milestones',
            'subscription__goals'
        ).order_by('-subscription__subscribed_at')
    
    def list(self, request, *args, **kwargs):
        """List progress with filtering options"""
        queryset = self.get_queryset()
        
        # Filter by subscription
        subscription_id = request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        # Filter by completion status
        min_completion = request.query_params.get('min_completion')
        if min_completion:
            queryset = queryset.filter(completion_percentage__gte=min_completion)
        
        # Filter active plans only
        if request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(subscription__status='active')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Manually trigger progress update"""
        progress = self.get_object()
        progress.update_progress()
        
        serializer = self.get_serializer(progress)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get detailed analytics for progress"""
        progress = self.get_object()
        
        # Get recent daily logs for trend analysis
        recent_logs = progress.daily_logs.order_by('-date')[:30]
        
        # Calculate trends
        completion_trend = self._calculate_completion_trend(recent_logs)
        wellness_trend = self._calculate_wellness_trend(recent_logs)
        consistency_analysis = self._analyze_consistency(progress)
        
        analytics_data = {
            'completion_trend': completion_trend,
            'wellness_trend': wellness_trend,
            'consistency_analysis': consistency_analysis,
            'milestone_progress': self._get_milestone_progress(progress),
            'goal_progress': self._get_goal_progress(progress),
            'weekly_performance': self._get_weekly_performance(progress)
        }
        
        return Response(analytics_data)
    
    def _calculate_completion_trend(self, logs):
        """Calculate completion rate trend over time"""
        if not logs:
            return {'trend': 'stable', 'data': []}
        
        # Group by week and calculate completion rates
        weekly_data = {}
        for log in logs:
            week_start = log.date - timedelta(days=log.date.weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {'completed': 0, 'total': 0}
            
            weekly_data[week_key]['total'] += 1
            if log.day_completed:
                weekly_data[week_key]['completed'] += 1
        
        # Calculate trend
        completion_rates = []
        for week, data in sorted(weekly_data.items()):
            rate = (data['completed'] / data['total']) * 100 if data['total'] > 0 else 0
            completion_rates.append({'week': week, 'rate': rate})
        
        # Determine trend direction
        if len(completion_rates) >= 2:
            recent_avg = sum(r['rate'] for r in completion_rates[-2:]) / 2
            older_avg = sum(r['rate'] for r in completion_rates[:-2]) / max(1, len(completion_rates) - 2)
            
            if recent_avg > older_avg + 10:
                trend = 'improving'
            elif recent_avg < older_avg - 10:
                trend = 'declining'
            else:
                trend = 'stable'
        else:
            trend = 'stable'
        
        return {'trend': trend, 'data': completion_rates}
    
    def _calculate_wellness_trend(self, logs):
        """Calculate wellness metrics trend"""
        wellness_data = []
        for log in logs:
            if log.mood_rating and log.energy_level:
                wellness_score = (log.mood_rating + log.energy_level) / 2
                wellness_data.append({
                    'date': log.date.strftime('%Y-%m-%d'),
                    'wellness_score': wellness_score,
                    'mood': log.mood_rating,
                    'energy': log.energy_level
                })
        
        return {'data': wellness_data[::-1]}  # Reverse to show chronological order
    
    def _analyze_consistency(self, progress):
        """Analyze consistency patterns"""
        logs = progress.daily_logs.order_by('-date')[:30]
        
        # Calculate consistency metrics
        total_days = logs.count()
        completed_days = logs.filter(day_completed=True).count()
        
        # Find patterns (e.g., which days of week are most consistent)
        day_patterns = {}
        for log in logs:
            day_name = log.date.strftime('%A')
            if day_name not in day_patterns:
                day_patterns[day_name] = {'completed': 0, 'total': 0}
            
            day_patterns[day_name]['total'] += 1
            if log.day_completed:
                day_patterns[day_name]['completed'] += 1
        
        # Calculate completion rate by day of week
        day_completion_rates = {}
        for day, data in day_patterns.items():
            rate = (data['completed'] / data['total']) * 100 if data['total'] > 0 else 0
            day_completion_rates[day] = rate
        
        return {
            'overall_consistency': (completed_days / total_days * 100) if total_days > 0 else 0,
            'current_streak': progress.current_streak,
            'longest_streak': progress.longest_streak,
            'day_patterns': day_completion_rates
        }
    
    def _get_milestone_progress(self, progress):
        """Get milestone achievement progress"""
        milestones = progress.subscription.milestones.all()
        
        return {
            'total_milestones': milestones.count(),
            'recent_milestones': PlanMilestoneSerializer(
                milestones.order_by('-achieved_at')[:5], many=True
            ).data
        }
    
    def _get_goal_progress(self, progress):
        """Get goal tracking progress"""
        goals = progress.subscription.goals.filter(is_active=True)
        
        return {
            'active_goals': goals.count(),
            'achieved_goals': goals.filter(is_achieved=True).count(),
            'goals_summary': GoalTrackingSerializer(goals, many=True).data
        }
    
    def _get_weekly_performance(self, progress):
        """Get recent weekly performance"""
        recent_weeks = progress.weekly_summaries.order_by('-week_start_date')[:4]
        
        return WeeklyProgressSummarySerializer(recent_weeks, many=True).data


class DailyProgressLogViewSet(viewsets.ModelViewSet):
    """ViewSet for managing daily progress logs"""
    serializer_class = DailyProgressLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get daily logs for user's progress"""
        return DailyProgressLog.objects.filter(
            progress__subscription__client=self.request.user
        ).select_related('progress__subscription').order_by('-date')
    
    def list(self, request, *args, **kwargs):
        """List daily logs with filtering"""
        queryset = self.get_queryset()
        
        # Filter by progress/subscription
        progress_id = request.query_params.get('progress')
        if progress_id:
            queryset = queryset.filter(progress_id=progress_id)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Get current week logs
        if request.query_params.get('current_week') == 'true':
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            queryset = queryset.filter(date__gte=week_start)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def log_today(self, request):
        """Log today's progress"""
        progress_id = request.data.get('progress_id')
        
        if not progress_id:
            return Response(
                {'error': 'progress_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            progress = PlanProgress.objects.get(
                id=progress_id,
                subscription__client=request.user
            )
        except PlanProgress.DoesNotExist:
            return Response(
                {'error': 'Progress not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        today = timezone.now().date()
        
        # Get or create today's log
        daily_log, created = DailyProgressLog.objects.get_or_create(
            progress=progress,
            date=today,
            defaults=request.data
        )
        
        if not created:
            # Update existing log
            serializer = self.get_serializer(daily_log, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update progress metrics
        progress.update_progress()
        
        serializer = self.get_serializer(daily_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class GoalTrackingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing goal tracking"""
    serializer_class = GoalTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get goals for user's subscriptions"""
        return GoalTracking.objects.filter(
            subscription__client=self.request.user
        ).select_related('subscription__product_plan').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List goals with filtering"""
        queryset = self.get_queryset()
        
        # Filter by subscription
        subscription_id = request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        # Filter by goal type
        goal_type = request.query_params.get('goal_type')
        if goal_type:
            queryset = queryset.filter(goal_type=goal_type)
        
        # Filter by status
        if request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(is_active=True)
        
        if request.query_params.get('achieved_only') == 'true':
            queryset = queryset.filter(is_achieved=True)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update goal progress"""
        goal = self.get_object()
        new_value = request.data.get('current_value')
        
        if new_value is None:
            return Response(
                {'error': 'current_value is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        goal.update_progress(new_value)
        
        # Check if goal was just achieved and create milestone
        if goal.is_achieved and not goal.subscription.milestones.filter(
            milestone_type='weight_goal',  # or other goal-related milestone
            achieved_at__date=timezone.now().date()
        ).exists():
            PlanMilestone.objects.create(
                subscription=goal.subscription,
                milestone_type='improvement_milestone',
                title=f'Goal Achieved: {goal.title}',
                description=f'Successfully achieved the goal: {goal.description}',
                achieved_at=timezone.now(),
                badge_icon='fas fa-trophy'
            )
        
        serializer = self.get_serializer(goal)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a goal"""
        goal = self.get_object()
        goal.is_active = False
        goal.save()
        
        serializer = self.get_serializer(goal)
        return Response(serializer.data)

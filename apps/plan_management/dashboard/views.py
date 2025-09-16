from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg, Sum, Count
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta
from io import BytesIO
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
from ..client.models import PlanSubscription
from ..daily_entries.models import PlanDay, WorkoutPlan, NutritionPlan, MealPlan

# Optional deps for export
try:
    from openpyxl import Workbook
except Exception:
    Workbook = None

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
except Exception:
    canvas = None
    A4 = None

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
    
    def _parse_date_range(self, request):
        """Parse date range from query params; default last 30 days."""
        today = timezone.now().date()
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date() if date_from_str else (today - timedelta(days=30))
        except Exception:
            date_from = today - timedelta(days=30)
        try:
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date() if date_to_str else today
        except Exception:
            date_to = today
        if date_from > date_to:
            date_from, date_to = date_to, date_from
        return date_from, date_to

    def _apply_progress_filters(self, request, qs):
        """Apply filters common to dashboard summary to a PlanProgress queryset."""
        subscription_id = request.query_params.get('subscription_id') or request.query_params.get('subscription')
        if subscription_id:
            qs = qs.filter(subscription_id=subscription_id)
        plan_type = (request.query_params.get('plan_type') or '').strip().lower()
        # Normalize UI values to backend
        if plan_type in ('', 'all', None):
            plan_type = None
        elif plan_type == 'nutrition':
            plan_type = 'diet'
        elif plan_type == 'hybrid':
            plan_type = 'combined'
        if plan_type:
            qs = qs.filter(subscription__product_plan__plan_type=plan_type)
        active_only = request.query_params.get('active_only')
        if active_only and active_only.lower() in ('true', '1', 'yes'):
            qs = qs.filter(subscription__status='active')
        return qs

    def _apply_log_filters(self, request, qs, date_from=None, date_to=None):
        """Apply filters to DailyProgressLog queryset based on query params."""
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        subscription_id = request.query_params.get('subscription_id') or request.query_params.get('subscription')
        if subscription_id:
            qs = qs.filter(progress__subscription_id=subscription_id)
        plan_type = (request.query_params.get('plan_type') or '').strip().lower()
        if plan_type in ('', 'all', None):
            plan_type = None
        elif plan_type == 'nutrition':
            plan_type = 'diet'
        elif plan_type == 'hybrid':
            plan_type = 'combined'
        if plan_type:
            qs = qs.filter(progress__subscription__product_plan__plan_type=plan_type)
        active_only = request.query_params.get('active_only')
        if active_only and active_only.lower() in ('true', '1', 'yes'):
            qs = qs.filter(progress__subscription__status='active')
        return qs

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """Client dashboard summary with KPIs, charts, and options."""
        user = request.user
        date_from, date_to = self._parse_date_range(request)

        # Ensure progress objects exist for user's filtered subscriptions
        subs_qs = PlanSubscription.objects.filter(client=user)
        # Apply filters to subscriptions similarly to progress filters
        subscription_id = request.query_params.get('subscription_id') or request.query_params.get('subscription')
        if subscription_id:
            subs_qs = subs_qs.filter(id=subscription_id)
        plan_type = (request.query_params.get('plan_type') or '').strip().lower()
        if plan_type in ('', 'all', None):
            plan_type = None
        elif plan_type == 'nutrition':
            plan_type = 'diet'
        elif plan_type == 'hybrid':
            plan_type = 'combined'
        if plan_type:
            subs_qs = subs_qs.filter(product_plan__plan_type=plan_type)
        active_only = request.query_params.get('active_only')
        if active_only and active_only.lower() in ('true', '1', 'yes'):
            subs_qs = subs_qs.filter(status='active')

        # Prefetch to minimize queries
        subs_qs = subs_qs.select_related('product_plan', 'product_plan__coach')

        # Map existing progress by subscription id
        existing_progress = {
            p.subscription_id: p
            for p in PlanProgress.objects.filter(subscription__in=subs_qs).select_related('subscription__product_plan__coach')
        }
        # Create missing progress entries (light-weight, no heavy recomputation)
        to_create = []
        for s in subs_qs:
            if s.id not in existing_progress:
                # Ensure required fields are populated on creation
                days_count = 0
                try:
                    # Prefer existing generated plan days if available
                    days_count = s.plan_days.count()
                except Exception:
                    days_count = 0
                if not days_count:
                    # Fallback to compute from product plan date range
                    plan = getattr(s, 'product_plan', None)
                    start = getattr(plan, 'start_date', None)
                    end = getattr(plan, 'end_date', None)
                    if start and end and end >= start:
                        days_count = (end - start).days + 1
                # As a last resort, default to 0 (valid for PositiveIntegerField)
                to_create.append(PlanProgress(subscription=s, total_days=days_count or 0))
        if to_create:
            PlanProgress.objects.bulk_create(to_create, ignore_conflicts=True)

        # Compute final progress queryset (includes any newly created)
        progress_qs = PlanProgress.objects.filter(subscription__in=subs_qs).select_related('subscription__product_plan__coach')

        logs_qs = DailyProgressLog.objects.filter(
            progress__subscription__client=user
        ).select_related('progress__subscription__product_plan')
        logs_qs = self._apply_log_filters(request, logs_qs, date_from, date_to)

        # KPIs
        active_subs = PlanSubscription.objects.filter(client=user, status='active').count()
        completion_avg = progress_qs.aggregate(v=Avg('completion_percentage'))['v'] or 0
        adherence_avg = progress_qs.aggregate(v=Avg('adherence_rate'))['v'] or 0
        streak_avg = progress_qs.aggregate(v=Avg('current_streak'))['v'] or 0

        meals_sum = logs_qs.aggregate(v=Sum('meals_completed'))['v'] or 0
        workouts_sum = logs_qs.aggregate(v=Sum('workouts_completed'))['v'] or 0
        calories_sum = logs_qs.aggregate(v=Sum('calories_burned'))['v'] or 0

        goals_qs = GoalTracking.objects.filter(subscription__client=user)
        goals_active = goals_qs.filter(is_active=True).count()
        goals_achieved = goals_qs.filter(is_achieved=True).count()

        # Charts: timeseries completion (per-day completion rate%)
        # Prepare a baseline series with zeros to make charts informative even with no logs
        daily_stats = {}
        cur = date_from
        while cur <= date_to:
            daily_stats[cur] = {'total': 0, 'completed': 0, 'mood': [], 'energy': []}
            cur += timedelta(days=1)
        # Accumulate log stats on top of baseline
        for log in logs_qs.order_by('date').values('date', 'day_completed'):
            d = log['date']
            if d not in daily_stats:
                daily_stats[d] = {'total': 0, 'completed': 0, 'mood': [], 'energy': []}
            daily_stats[d]['total'] += 1
            if log['day_completed']:
                daily_stats[d]['completed'] += 1

        # For wellness series we need mood/energy; fetch with values
        for item in logs_qs.exclude(mood_rating=None, energy_level=None).values('date', 'mood_rating', 'energy_level'):
            d = item['date']
            if d not in daily_stats:
                daily_stats[d] = {'total': 0, 'completed': 0, 'mood': [], 'energy': []}
            daily_stats[d]['mood'].append(item['mood_rating'])
            daily_stats[d]['energy'].append(item['energy_level'])

        progress_timeseries = []
        wellness_series = []
        completed_count = 0
        incomplete_count = 0

        for d in sorted(daily_stats.keys()):
            tot = daily_stats[d]['total']
            comp = daily_stats[d]['completed']
            rate = float(comp) * 100.0 / float(tot) if tot else 0.0
            progress_timeseries.append({'date': d.strftime('%Y-%m-%d'), 'completion_rate': round(rate, 2)})
            # Distribution
            completed_count += comp
            incomplete_count += max(0, tot - comp)
            # Wellness
            moods = daily_stats[d]['mood']
            energ = daily_stats[d]['energy']
            if moods or energ:
                mood_avg = sum(moods) / len(moods) if moods else None
                energy_avg = sum(energ) / len(energ) if energ else None
                wellness_series.append({'date': d.strftime('%Y-%m-%d'), 'mood': mood_avg, 'energy': energy_avg})

        completion_distribution = {
            'completed': completed_count,
            'incomplete': incomplete_count,
        }

        # Subscription status counts (using filtered subscriptions)
        status_counts_raw = PlanSubscription.objects.filter(id__in=subs_qs.values('id')).values('status').annotate(c=Count('id'))
        status_defaults = {'active': 0, 'completed': 0, 'pending': 0, 'cancelled': 0, 'expired': 0}
        subscription_counts = {**status_defaults}
        for row in status_counts_raw:
            subscription_counts[row['status']] = int(row['c'] or 0)

        # Per-plan progress compact list for table rendering on the frontend
        per_plan_progress = [
            {
                'subscription_id': p.subscription_id,
                'plan_name': getattr(p.subscription.product_plan, 'name', ''),
                'status': getattr(p.subscription, 'status', ''),
                'completion_percentage': float(p.completion_percentage or 0.0),
                'adherence_rate': float(p.adherence_rate or 0.0),
                'subscribed_at': getattr(p.subscription, 'subscribed_at', None),
                'plan_type': getattr(p.subscription.product_plan, 'plan_type', ''),
                'coach_name': getattr(getattr(p.subscription.product_plan, 'coach', None), 'user', None).get_full_name() if getattr(p.subscription.product_plan, 'coach', None) else ''
            }
            for p in progress_qs.select_related('subscription__product_plan__coach')[:200]
        ]

        # Today at a glance (aggregated across filtered subscriptions)
        today = timezone.now().date()
        today_days = PlanDay.objects.filter(subscription__in=subs_qs, scheduled_date=today)
        # Prefetch related plans/meals to avoid N+1
        today_days = today_days.prefetch_related('workout_plans', 'nutrition_plans__meals', 'subscription__product_plan')

        todays_workouts_scheduled = 0
        todays_workouts_completed = 0
        todays_meals_scheduled = 0
        todays_meals_completed = 0
        todays_target_cal = 0
        todays_actual_cal = 0
        todays_target_water = 0
        todays_actual_water = 0
        next_actions = []

        for day in today_days:
            # Workouts
            wos = list(day.workout_plans.all())
            todays_workouts_scheduled += len(wos)
            todays_workouts_completed += sum(1 for w in wos if getattr(w, 'is_completed', False))
            for w in wos:
                if not getattr(w, 'is_completed', False):
                    next_actions.append({'type': 'workout', 'name': w.workout_name, 'plan': day.subscription.product_plan.name})
            # Nutrition
            nps = list(day.nutrition_plans.all())
            for n in nps:
                todays_target_cal += int(n.target_calories or 0)
                todays_actual_cal += int(n.actual_calories or 0) if n.actual_calories is not None else 0
                try:
                    todays_target_water += float(n.target_water_liters or 0)
                except Exception:
                    pass
                try:
                    todays_actual_water += float(n.actual_water_liters or 0) if n.actual_water_liters is not None else 0.0
                except Exception:
                    pass
                meals = list(n.meals.all())
                todays_meals_scheduled += len(meals)
                todays_meals_completed += sum(1 for m in meals if getattr(m, 'is_completed', False))
                for m in meals:
                    if not getattr(m, 'is_completed', False):
                        next_actions.append({'type': 'meal', 'name': m.meal_name, 'plan': day.subscription.product_plan.name})

        # Today wellness from logs
        today_logs = DailyProgressLog.objects.filter(progress__subscription__in=subs_qs, date=today)
        avg_mood = today_logs.aggregate(v=Avg('mood_rating'))['v'] or None
        avg_energy = today_logs.aggregate(v=Avg('energy_level'))['v'] or None
        today_water_log = today_logs.aggregate(v=Avg('water_intake_liters'))['v']
        today_sleep_log = today_logs.aggregate(v=Avg('sleep_hours'))['v']

        # Last 7 days summary
        last7_from = today - timedelta(days=6)
        last7_to = today
        logs_7d = DailyProgressLog.objects.filter(progress__subscription__in=subs_qs, date__gte=last7_from, date__lte=last7_to)
        # Completion per day
        by_date = {}
        for item in logs_7d.values('date', 'day_completed', 'meals_completed', 'workouts_completed'):
            d = item['date']
            if d not in by_date:
                by_date[d] = {'any_completed': False, 'meals': 0, 'workouts': 0, 'total': 0, 'completed': 0}
            by_date[d]['total'] += 1
            by_date[d]['meals'] += int(item['meals_completed'] or 0)
            by_date[d]['workouts'] += int(item['workouts_completed'] or 0)
            if item['day_completed']:
                by_date[d]['completed'] += 1
                by_date[d]['any_completed'] = True

        days_completed = sum(1 for d in by_date.values() if d['any_completed'])
        total_days_in_window = 7
        missed_days = max(0, total_days_in_window - days_completed)
        # Adherence average in last 7 days
        day_rates = []
        curd = last7_from
        while curd <= last7_to:
            stats = by_date.get(curd)
            rate = (stats['completed'] / stats['total'] * 100.0) if stats and stats['total'] else 0.0
            day_rates.append(rate)
            curd += timedelta(days=1)
        adherence_7d = round(sum(day_rates) / len(day_rates), 2) if day_rates else 0.0
        # Best streak in 7d
        cur_streak = 0
        best_streak = 0
        curd = last7_from
        while curd <= last7_to:
            if by_date.get(curd, {}).get('any_completed'):
                cur_streak += 1
                best_streak = max(best_streak, cur_streak)
            else:
                cur_streak = 0
            curd += timedelta(days=1)

        # Options for selectors
        progress_options = [
            {
                'progress_id': p.id,
                'subscription_id': p.subscription_id,
                'plan_name': p.subscription.product_plan.name,
                'plan_type': p.subscription.product_plan.plan_type,
            }
            for p in progress_qs[:100]
        ]
        subs_options = [
            {
                'id': s.id,
                'name': s.product_plan.name,
                'plan_type': s.product_plan.plan_type,
            }
            for s in PlanSubscription.objects.filter(client=user).select_related('product_plan')[:100]
        ]

        data = {
            'success': True,
            'kpis': {
                'active_subscriptions': active_subs,
                'completion_avg': float(completion_avg) if completion_avg else 0.0,
                'adherence_rate': float(adherence_avg) if adherence_avg else 0.0,
                'current_streak_avg': float(streak_avg) if streak_avg else 0.0,
                'total_meals': int(meals_sum),
                'total_workouts': int(workouts_sum),
                'calories_burned': int(calories_sum),
                'goals_active': goals_active,
                'goals_achieved': goals_achieved,
            },
            'charts': {
                'progress_timeseries': progress_timeseries,
                'completion_distribution': completion_distribution,
                'wellness_series': wellness_series,
            },
            'stats': {
                'subscription_counts': subscription_counts,
                'per_plan_progress': per_plan_progress,
            },
            'today': {
                'workouts': {'completed': int(todays_workouts_completed), 'scheduled': int(todays_workouts_scheduled)},
                'meals': {'completed': int(todays_meals_completed), 'scheduled': int(todays_meals_scheduled)},
                'calories': {'actual': int(todays_actual_cal), 'target': int(todays_target_cal)},
                'water_liters': {'actual': float(todays_actual_water) if todays_actual_water else float(today_water_log or 0.0), 'target': float(todays_target_water)},
                'mood': (float(avg_mood) if avg_mood is not None else None),
                'energy': (float(avg_energy) if avg_energy is not None else None),
                'next_actions': next_actions[:6],
            },
            'week_summary': {
                'days_completed': int(days_completed),
                'missed_days': int(missed_days),
                'adherence_avg': float(adherence_7d),
                'total_meals_completed': int(sum(v['meals'] for v in by_date.values())),
                'total_workouts_completed': int(sum(v['workouts'] for v in by_date.values())),
                'best_streak': int(best_streak),
            },
            'options': {
                'progress_options': progress_options,
                'subscriptions': subs_options,
            }
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def progress_timeseries(self, request):
        """Return only the progress timeseries for lightweight chart reloads."""
        user = request.user
        date_from, date_to = self._parse_date_range(request)
        logs_qs = DailyProgressLog.objects.filter(
            progress__subscription__client=user
        )
        logs_qs = self._apply_log_filters(request, logs_qs, date_from, date_to)

        daily_stats = {}
        for log in logs_qs.order_by('date').values('date', 'day_completed'):
            d = log['date']
            if d not in daily_stats:
                daily_stats[d] = {'total': 0, 'completed': 0}
            daily_stats[d]['total'] += 1
            if log['day_completed']:
                daily_stats[d]['completed'] += 1

        series = []
        for d in sorted(daily_stats.keys()):
            tot = daily_stats[d]['total']
            comp = daily_stats[d]['completed']
            rate = float(comp) * 100.0 / float(tot) if tot else 0.0
            series.append({'date': d.strftime('%Y-%m-%d'), 'completion_rate': round(rate, 2)})
        return Response({'success': True, 'progress_timeseries': series})
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
        ).select_related('progress__subscription__product_plan').order_by('-date')
    
    def _apply_filters(self, request, queryset):
        """Apply additional filters for list and export endpoints."""
        # Filter by progress/subscription
        progress_id = request.query_params.get('progress')
        if progress_id:
            queryset = queryset.filter(progress_id=progress_id)

        subscription_id = request.query_params.get('subscription_id') or request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(progress__subscription_id=subscription_id)

        # Filter by date range
        start_date = request.query_params.get('start_date') or request.query_params.get('date_from')
        end_date = request.query_params.get('end_date') or request.query_params.get('date_to')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Current week convenience
        if request.query_params.get('current_week') == 'true':
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            queryset = queryset.filter(date__gte=week_start)

        # Plan type filter (normalize UI values)
        plan_type = (request.query_params.get('plan_type') or '').strip().lower()
        if plan_type in ('', 'all', None):
            plan_type = None
        elif plan_type == 'nutrition':
            plan_type = 'diet'
        elif plan_type == 'hybrid':
            plan_type = 'combined'
        if plan_type:
            queryset = queryset.filter(progress__subscription__product_plan__plan_type=plan_type)

        # Active only
        active_only = request.query_params.get('active_only')
        if active_only and active_only.lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(progress__subscription__status='active')

        return queryset

    def list(self, request, *args, **kwargs):
        """List daily logs with filtering"""
        queryset = self.get_queryset()
        queryset = self._apply_filters(request, queryset)

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

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Export filtered daily logs as Excel (.xlsx)."""
        if Workbook is None:
            return Response({'success': False, 'error': 'Excel export not available (openpyxl missing).'}, status=500)

        queryset = self._apply_filters(request, self.get_queryset())
        wb = Workbook()
        ws = wb.active
        ws.title = 'Daily Logs'
        headers = [
            'Date', 'Plan', 'Completed', 'Meals', 'Workouts', 'Calories',
            'Energy', 'Mood', 'Sleep(h)', 'Water(L)', 'Stress', 'Notes'
        ]
        ws.append(headers)

        # Prefetch related to avoid N+1
        logs = queryset.select_related('progress__subscription__product_plan').order_by('-date')[:5000]
        for log in logs:
            ws.append([
                log.date.strftime('%Y-%m-%d') if log.date else '',
                getattr(getattr(log.progress.subscription, 'product_plan', None), 'name', ''),
                'Yes' if log.day_completed else 'No',
                log.meals_completed,
                log.workouts_completed,
                log.calories_burned,
                log.energy_level or '',
                log.mood_rating or '',
                float(log.sleep_hours) if log.sleep_hours is not None else '',
                float(log.water_intake_liters) if log.water_intake_liters is not None else '',
                log.stress_level or '',
                (log.daily_notes[:200] + '...') if log.daily_notes and len(log.daily_notes) > 200 else (log.daily_notes or ''),
            ])

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="daily_logs.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def export_pdf(self, request):
        """Export filtered daily logs as a simple PDF."""
        if canvas is None or A4 is None:
            return Response({'success': False, 'error': 'PDF export not available (reportlab missing).'}, status=500)

        queryset = self._apply_filters(request, self.get_queryset())
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Branding helpers
        def draw_header_footer():
            header_h = 24
            # Header bar
            p.setFillColorRGB(13/255.0, 110/255.0, 253/255.0)
            p.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
            p.setFillColorRGB(1, 1, 1)
            p.setFont('Helvetica-Bold', 12)
            p.drawString(40, height - 16, 'Easy Fit — Daily Progress Logs')
            # Footer
            p.setFillColorRGB(0, 0, 0)
            p.setFont('Helvetica', 8)
            try:
                from django.utils import timezone
                dt = timezone.now().strftime('%Y-%m-%d %H:%M')
            except Exception:
                from datetime import datetime
                dt = datetime.now().strftime('%Y-%m-%d %H:%M')
            p.drawString(40, 20, f'Generated on {dt}')
            p.drawRightString(width - 40, 20, f'Page {p.getPageNumber()}')

        def new_page(with_columns=True):
            p.showPage()
            draw_header_footer()
            p.setFont('Helvetica', 9)
            y_start = height - 24 - 30  # header height + spacing
            if with_columns:
                headers = ['Date', 'Plan', 'Completed', 'Meals', 'Workouts', 'Calories']
                p.drawString(40, y_start, ' | '.join(headers))
                return y_start - 12
            return y_start

        # First page
        draw_header_footer()
        p.setFont('Helvetica', 9)
        y = height - 24 - 30
        headers = ['Date', 'Plan', 'Completed', 'Meals', 'Workouts', 'Calories']
        p.drawString(40, y, ' | '.join(headers))
        y -= 12

        line_height = 12
        min_y = 40  # bottom margin

        # Optional filters line
        try:
            start = request.query_params.get('start_date') or ''
            end = request.query_params.get('end_date') or ''
            plan_type = request.query_params.get('plan_type') or 'All'
            p.setFont('Helvetica', 8)
            p.drawString(40, y, f'Filters: {start} → {end} • Type: {plan_type}')
            p.setFont('Helvetica', 9)
            y -= line_height
        except Exception:
            pass

        logs = queryset.select_related('progress__subscription__product_plan').order_by('-date')[:1000]
        for log in logs:
            if y < min_y:
                y = new_page(with_columns=True)
            row = [
                log.date.strftime('%Y-%m-%d') if log.date else '',
                getattr(getattr(log.progress.subscription, 'product_plan', None), 'name', '')[:30],
                'Yes' if log.day_completed else 'No',
                str(log.meals_completed),
                str(log.workouts_completed),
                str(log.calories_burned),
            ]
            p.drawString(40, y, ' | '.join(row))
            y -= line_height

        # finalize
        p.showPage()
        p.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="daily_logs.pdf"'
        return response


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

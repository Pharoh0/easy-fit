from apps.profiles.coach_profile.models import CoachProfile
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import ProductPlan, PlanItem
from .serializers import ProductPlanSerializer, PlanItemSerializer
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Count, Avg, F, ExpressionWrapper, DurationField
from django.utils import timezone
from ..client.models import PlanSubscription
from ..client.serializers import PlanSubscriptionSerializer
from ..daily_entries.models import PlanDay, NutritionPlan, WorkoutPlan
from ..daily_entries.serializers import PlanDaySerializer, NutritionPlanSerializer, WorkoutPlanSerializer
from datetime import timedelta


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductPlan.objects.all()
    serializer_class = ProductPlanSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        request = self.request
        params = request.query_params
        user = request.user

        # Base queryset with related coach for performance
        qs = ProductPlan.objects.all().select_related('coach', 'coach__user')

        # Scope by coach or active status
        coach_profile_id = params.get('coach_profile_id')
        if coach_profile_id:
            coach = get_object_or_404(CoachProfile, id=coach_profile_id)
            qs = qs.filter(coach=coach)
        elif hasattr(user, 'coach_profile'):
            qs = qs.filter(coach=user.coach_profile)
        else:
            is_active = params.get('is_active')
            if is_active is not None:
                if is_active.lower() == 'true':
                    qs = qs.filter(is_active=True)
                elif is_active.lower() == 'false':
                    qs = qs.filter(is_active=False)
            else:
                # Default for anonymous/clients: only active plans
                qs = qs.filter(is_active=True)

        # Annotations for ratings and duration
        qs = qs.annotate(
            rating_average=Avg('plan_subscriptions__rating__overall_rating'),
            rating_count=Count('plan_subscriptions__rating', distinct=True),
            duration_delta=ExpressionWrapper(F('end_date') - F('start_date'), output_field=DurationField()),
        )

        # Filters expected from frontend
        plan_type = params.get('plan_type')
        if plan_type:
            qs = qs.filter(plan_type=plan_type)

        price_range = params.get('price_range')
        if price_range:
            try:
                if price_range.endswith('+'):
                    min_price = int(price_range[:-1])
                    qs = qs.filter(price__gte=min_price)
                else:
                    low_str, high_str = price_range.split('-')
                    low, high = int(low_str), int(high_str)
                    qs = qs.filter(price__gte=low, price__lte=high)
            except Exception:
                pass  # Ignore malformed filter

        duration = params.get('duration')
        if duration:
            try:
                days = int(duration)
                # (end - start) is exclusive; <= days-1 approximates inclusive day count
                qs = qs.filter(duration_delta__lte=timedelta(days=days - 1))
            except Exception:
                pass

        min_rating = params.get('min_rating')
        if min_rating:
            try:
                threshold = float(min_rating)
                qs = qs.filter(rating_average__gte=threshold)
            except Exception:
                pass

        return qs



    def perform_create(self, serializer):
        # Automatically set the coach field to the authenticated user's coach profile
        try:
            coach_profile = self.request.user.coach_profile
            print("coach_profile.>>>", self.request.user.coach_profile.id)
            print("self.request.user.>>>", self.request.user.id)
            
        except CoachProfile.DoesNotExist:
            raise PermissionDenied("You must have a coach profile to create a plan.")
        
        # Save the plan with the authenticated coach profile
        serializer.save(coach=coach_profile)




class PlanItemViewSet(viewsets.ModelViewSet):
    queryset = PlanItem.objects.all()
    serializer_class = PlanItemSerializer

    def perform_create(self, serializer):
        plan = serializer.validated_data['plan']
        if plan.coach.user != self.request.user:
            return Response({"detail": "You are not authorized to add items to this plan."}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()


class CoachPlanCustomizationViewSet(viewsets.ViewSet):
    """Coach endpoints for customizing client subscribed plans"""
    permission_classes = [IsAuthenticated]
    
    def get_coach_subscriptions(self):
        """Get subscriptions for coach's plans"""
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return PlanSubscription.objects.none()
        return PlanSubscription.objects.filter(product_plan__coach=coach_profile)
    
    @action(detail=False, methods=['get'])
    def client_subscriptions(self, request):
        """List all client subscriptions for coach's plans"""
        subscriptions = self.get_coach_subscriptions().select_related(
            'client', 'product_plan'
        ).prefetch_related('plan_days')
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            subscriptions = subscriptions.filter(status=status_filter)
        
        # Filter by client
        client_id = request.query_params.get('client_id')
        if client_id:
            subscriptions = subscriptions.filter(client_id=client_id)
        
        serializer = PlanSubscriptionSerializer(subscriptions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subscription_details(self, request, pk=None):
        """Get detailed subscription info with plan days"""
        subscription = get_object_or_404(
            self.get_coach_subscriptions().select_related('client', 'product_plan'),
            pk=pk
        )
        
        # Get plan days with related data
        plan_days = PlanDay.objects.filter(subscription=subscription).select_related(
            'nutrition_plan', 'workout_plan'
        ).prefetch_related(
            'nutrition_plan__meals',
            'workout_plan__exercise_blocks__exercises'
        ).order_by('day_number')
        
        subscription_data = PlanSubscriptionSerializer(subscription, context={'request': request}).data
        plan_days_data = PlanDaySerializer(plan_days, many=True, context={'request': request}).data
        
        return Response({
            'subscription': subscription_data,
            'plan_days': plan_days_data,
            'statistics': {
                'total_days': plan_days.count(),
                'completed_days': plan_days.filter(completion_status='completed').count(),
                'in_progress_days': plan_days.filter(completion_status='in_progress').count(),
                'not_started_days': plan_days.filter(completion_status='not_started').count(),
            }
        })
    
    @action(detail=True, methods=['post'])
    def customize_plan_day(self, request, pk=None):
        """Customize a specific plan day for a client"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        day_id = request.data.get('day_id')
        
        if not day_id:
            return Response({'error': 'day_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan_day = get_object_or_404(PlanDay, id=day_id, subscription=subscription)
        
        # Update plan day fields
        day_data = request.data.get('day_data', {})
        for field in ['day_title', 'day_description', 'day_theme', 'coach_instructions', 
                     'planned_difficulty', 'estimated_duration_minutes']:
            if field in day_data:
                setattr(plan_day, field, day_data[field])
        
        plan_day.save()
        
        # Update nutrition plan if provided
        nutrition_data = request.data.get('nutrition_data')
        if nutrition_data:
            nutrition_plan, created = NutritionPlan.objects.get_or_create(
                plan_day=plan_day,
                defaults=nutrition_data
            )
            if not created:
                for field, value in nutrition_data.items():
                    setattr(nutrition_plan, field, value)
                nutrition_plan.save()
        
        # Update workout plan if provided
        workout_data = request.data.get('workout_data')
        if workout_data:
            workout_plan, created = WorkoutPlan.objects.get_or_create(
                plan_day=plan_day,
                defaults=workout_data
            )
            if not created:
                for field, value in workout_data.items():
                    setattr(workout_plan, field, value)
                workout_plan.save()
        
        serializer = PlanDaySerializer(plan_day, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_coach_notes(self, request, pk=None):
        """Add coach notes to a plan day"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        day_id = request.data.get('day_id')
        notes = request.data.get('notes', '')
        
        if not day_id:
            return Response({'error': 'day_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan_day = get_object_or_404(PlanDay, id=day_id, subscription=subscription)
        plan_day.coach_notes = notes
        plan_day.save()
        
        return Response({'message': 'Notes added successfully'})
    
    @action(detail=True, methods=['post'])
    def regenerate_plan_days(self, request, pk=None):
        """Regenerate plan days for a subscription (coach override)"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        
        try:
            with transaction.atomic():
                days_created = subscription.generate_plan_days(reset=True)
                return Response({
                    'message': f'Successfully regenerated {days_created} plan days',
                    'days_created': days_created
                })
        except Exception as e:
            return Response({
                'error': 'Failed to regenerate plan days',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def client_progress_summary(self, request):
        """Get progress summary for all coach's clients"""
        subscriptions = self.get_coach_subscriptions().filter(status='active')
        
        summary_data = []
        for subscription in subscriptions:
            plan_days = PlanDay.objects.filter(subscription=subscription)
            total_days = plan_days.count()
            completed_days = plan_days.filter(completion_status='completed').count()
            
            summary_data.append({
                'subscription_id': subscription.id,
                'client_name': subscription.client.get_full_name() or subscription.client.username,
                'plan_name': subscription.product_plan.name,
                'total_days': total_days,
                'completed_days': completed_days,
                'completion_percentage': (completed_days / total_days * 100) if total_days > 0 else 0,
                'last_activity': plan_days.filter(completed_at__isnull=False).order_by('-completed_at').first().completed_at if plan_days.filter(completed_at__isnull=False).exists() else None
            })
        
        return Response(summary_data)

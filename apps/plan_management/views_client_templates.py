from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .client.models import PlanSubscription
from .coach.models import ProductPlan
from django.db.models import Avg, Count, F, Sum, Q, Case, When, Value, IntegerField
from django.utils import timezone


@login_required
def client_plan_browser_view(request):
    """
    View for clients to browse available plans and subscribe
    """
    # No special context needed, the JavaScript will load plans via API
    return render(request, 'plan_management/plan_browse.html', {
        'page_title': 'Browse Fitness Plans'
    })


@login_required
def client_dashboard_view(request):
    """
    Client dashboard showing subscribed plans and progress
    """
    # Get client's active subscriptions
    subscriptions = PlanSubscription.objects.filter(
        client=request.user, 
        status='active'
    ).select_related('product_plan', 'product_plan__coach', 'product_plan__coach__user')
    
    return render(request, 'plan_management/client_dashboard.html', {
        'page_title': 'My Plans Dashboard',
        'subscriptions': subscriptions
    })


@login_required
def client_plan_detail_view(request, subscription_id):
    """
    Detailed view of a specific plan subscription for a client
    """
    try:
        # Get the specific subscription
        subscription = PlanSubscription.objects.select_related(
            'product_plan', 'product_plan__coach', 'product_plan__coach__user'
        ).get(id=subscription_id, client=request.user)
        
        return render(request, 'plan_management/client_plan_detail.html', {
            'page_title': f'Plan: {subscription.product_plan.name}',
            'subscription': subscription
        })
        
    except PlanSubscription.DoesNotExist:
        return render(request, 'errors/404.html', {
            'error_message': 'Plan subscription not found.'
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_plan_progress(request, subscription_id):
    """
    API endpoint to get client's progress for a specific plan
    """
    try:
        # Ensure the subscription belongs to the requesting client
        subscription = PlanSubscription.objects.select_related(
            'product_plan'
        ).get(id=subscription_id, client=request.user)
        
        # Calculate plan statistics
        from .daily_entries.models import PlanDay
        
        # Get all plan days for this subscription
        plan_days = PlanDay.objects.filter(subscription=subscription)
        
        # Calculate completion statistics
        total_days = plan_days.count()
        completed_days = plan_days.filter(completion_status='completed').count()
        in_progress_days = plan_days.filter(completion_status='in_progress').count()
        not_started_days = plan_days.filter(completion_status='not_started').count()
        pending_days = not_started_days + in_progress_days
        
        # Calculate completion percentage
        completion_percentage = (completed_days / total_days * 100) if total_days > 0 else 0
        
        # Get recent days (by scheduled date)
        recent_days = plan_days.order_by('-scheduled_date')[:5]
        recent_days_data = [{
            'id': day.id,
            'day_number': day.day_number,
            'scheduled_date': day.scheduled_date,
            'completion_status': day.completion_status,
            'has_workout': hasattr(day, 'workout_plan'),
            'has_nutrition': hasattr(day, 'nutrition_plan')
        } for day in recent_days]
        
        return Response({
            'success': True,
            'plan_name': subscription.product_plan.name,
            'stats': {
                'total_days': total_days,
                'completed_days': completed_days,
                'pending_days': pending_days,
                'completion_percentage': round(completion_percentage, 1),
                'days_remaining': subscription.product_plan.session_count - completed_days
            },
            'recent_days': recent_days_data
        })
        
    except PlanSubscription.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Plan subscription not found.'
        }, status=404)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)


@login_required
def client_ratings_view(request):
    """
    Render the client ratings UI page which is powered by JS calling DRF APIs
    """
    return render(request, 'plan_management/ratings.html', {
        'page_title': 'Plan Ratings'
    })

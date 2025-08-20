from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from apps.profiles.coach_profile.models import CoachProfile
from .coach.models import ProductPlan
from .client.models import PlanSubscription
from .daily_entries.models import PlanDay

User = get_user_model()


@login_required
def coach_client_measurements_view(request):
    """
    Template view for coaches to access client measurements
    """
    # Verify user is a coach
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    context = {
        'coach_profile': coach_profile,
        'page_title': 'Client Measurements',
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': 'Client Measurements', 'url': None}
        ],
        # Ensure Chart.js is included for charts on this page
        'include_charts': True,
    }
    
    return render(request, 'plan_management/coach_client_measurements.html', context)


@login_required
def coach_plan_creation_view(request):
    """
    Enhanced plan creation view with client measurement integration
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    if request.method == 'POST':
        # Handle plan creation
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            # Calculate price per session based on price and duration
            price = float(request.POST.get('price', 0))
            duration = int(request.POST.get('duration', 30))
            
            # Use workout days per week to estimate session count, default to duration/7 if not provided
            workout_days = int(request.POST.get('workout_days_per_week', 3))
            session_count = max(1, (duration * workout_days) // 7)  # At least 1 session
            
            # Calculate price per session (avoid division by zero)
            price_per_session = price / session_count if session_count > 0 else price
            
            # Create the product plan
            plan = ProductPlan.objects.create(
                coach=coach_profile,
                name=request.POST.get('name'),
                description=request.POST.get('description'),
                plan_type=request.POST.get('plan_type'),
                price=float(request.POST.get('price', 0)),
                price_per_session=price_per_session,
                session_count=session_count,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=duration)
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Plan created successfully!',
                'plan_id': plan.id,
                'redirect_url': f'/plan-management/coach/plan-management/'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            }, status=400)
    
    # GET request - show the form
    # Get client ID from query params if creating plan for specific client
    client_id = request.GET.get('client_id')
    client_data = None
    
    if client_id:
        try:
            client_user = User.objects.get(id=client_id)
            # Verify coach has access to this client through subscriptions
            from .client.models import PlanSubscription
            has_access = PlanSubscription.objects.filter(
                client=client_user,
                product_plan__coach=coach_profile
            ).exists()
            
            if has_access:
                client_data = {
                    'id': client_user.id,
                    'full_name': client_user.get_full_name(),
                    'username': client_user.username,
                    'profile': client_user.client_profile
                }
        except (User.DoesNotExist, AttributeError):
            pass
    
    context = {
        'coach_profile': coach_profile,
        'client_data': client_data,
        'page_title': 'Create Plan' + (f' for {client_data["full_name"]}' if client_data else ''),
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': 'Create Plan', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_plan_creation.html', context)


@login_required 
@require_http_methods(["GET"])
def coach_client_quick_stats(request):
    """
    Get quick stats for coach's clients for dashboard widgets
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return JsonResponse({'error': 'Coach profile not found'}, status=404)
    
    from .client.models import PlanSubscription
    from apps.profiles.client_profile.models import ClientMeasurement
    
    # Get total clients
    total_clients = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile
    ).values('client').distinct().count()
    
    # Get active subscriptions
    active_subscriptions = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        status='active'
    ).count()
    
    # Get recent measurements count (last 30 days)
    from django.utils import timezone
    from datetime import timedelta
    
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    
    # Get client IDs for this coach
    client_ids = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile
    ).values_list('client_id', flat=True).distinct()
    
    recent_measurements = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids,
        date__gte=thirty_days_ago
    ).count()
    
    # Get clients with recent activity
    active_clients = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids,
        date__gte=thirty_days_ago
    ).values('client').distinct().count()
    
    stats = {
        'total_clients': total_clients,
        'active_subscriptions': active_subscriptions,
        'recent_measurements': recent_measurements,
        'active_clients': active_clients,
        'engagement_rate': round((active_clients / total_clients * 100) if total_clients > 0 else 0, 1)
    }
    
    return JsonResponse({'success': True, 'stats': stats})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_measurement_insights(request):
    """
    Get measurement insights and analytics for coach dashboard
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    from .client.models import PlanSubscription
    from apps.profiles.client_profile.models import ClientMeasurement
    from django.db.models import Avg, Count, Q
    from django.utils import timezone
    from datetime import timedelta
    
    # Get client IDs for this coach
    client_ids = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile
    ).values_list('client_id', flat=True).distinct()
    
    # Time periods
    thirty_days_ago = timezone.now().date() - timedelta(days=30)
    ninety_days_ago = timezone.now().date() - timedelta(days=90)
    
    # Client progress analytics
    progress_data = []
    
    for client_id in client_ids[:10]:  # Limit to top 10 clients
        try:
            client_user = User.objects.get(id=client_id)
            client_profile = client_user.client_profile
            
            # Get latest and oldest measurements
            measurements = ClientMeasurement.objects.filter(
                client=client_profile
            ).order_by('-date')
            
            if measurements.count() >= 2:
                latest = measurements.first()
                oldest = measurements.last()
                
                # Calculate weight progress
                weight_change = None
                if latest.weight and oldest.weight:
                    weight_change = float(latest.weight) - float(oldest.weight)
                
                progress_data.append({
                    'client_name': client_user.get_full_name(),
                    'client_id': client_id,
                    'measurement_count': measurements.count(),
                    'latest_date': latest.date.strftime('%Y-%m-%d'),
                    'weight_change': weight_change,
                    'duration_days': (latest.date - oldest.date).days
                })
                
        except (User.DoesNotExist, AttributeError):
            continue
    
    # Measurement frequency analysis
    measurement_frequency = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids,
        date__gte=thirty_days_ago
    ).extra(
        select={'day': 'date(date)'}
    ).values('day').annotate(
        count=Count('id')
    ).order_by('day')
    
    # Top performing clients (most measurements)
    top_clients = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids,
        date__gte=ninety_days_ago
    ).values(
        'client__user__first_name',
        'client__user__last_name',
        'client__user_id'
    ).annotate(
        measurement_count=Count('id')
    ).order_by('-measurement_count')[:5]
    
    insights = {
        'client_progress': progress_data,
        'measurement_frequency': list(measurement_frequency),
        'top_clients': list(top_clients),
        'summary': {
            'total_measurements_30d': ClientMeasurement.objects.filter(
                client__user_id__in=client_ids,
                date__gte=thirty_days_ago
            ).count(),
            'avg_measurements_per_client': round(
                ClientMeasurement.objects.filter(
                    client__user_id__in=client_ids
                ).count() / len(client_ids) if client_ids else 0, 1
            ),
            'clients_with_progress': len([p for p in progress_data if p['weight_change'] is not None])
        }
    }
    
    return Response({'success': True, 'insights': insights})


@login_required
def coach_dashboard_measurements_widget(request):
    """
    Render measurements widget for coach dashboard
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return JsonResponse({'error': 'Coach profile not found'}, status=404)
    
    context = {
        'coach_profile': coach_profile
    }
    
    return render(request, 'plan_management/widgets/measurements_widget.html', context)


@login_required
def coach_plan_management_view(request):
    """
    Coach plan management dashboard
    """
    # Ensure user is a coach
    coach_profile = getattr(request.user, 'coach_profile', None)
    if not coach_profile:
        return redirect('dashboard:dashboard')
    
    # Get all product plans created by this coach
    product_plans = ProductPlan.objects.filter(coach=coach_profile)
    
    # Get all active subscriptions
    active_subscriptions = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        status='active'
    ).select_related(
        'client', 'product_plan'
    ).prefetch_related(
        'plan_days'
    )
    
    # Get subscription stats
    subscription_stats = {
        'total_plans': product_plans.count(),
        'active_subscriptions': active_subscriptions.count(),
        'clients_with_plans': active_subscriptions.values('client').distinct().count(),
        'total_plan_days': PlanDay.objects.filter(
            subscription__product_plan__coach=coach_profile
        ).count(),
        'completed_plan_days': PlanDay.objects.filter(
            subscription__product_plan__coach=coach_profile,
            completion_status='completed'
        ).count()
    }
    
    context = {
        'coach_profile': coach_profile,
        'product_plans': product_plans,
        'active_subscriptions': active_subscriptions,
        'subscription_stats': subscription_stats,
        'page_title': 'Plan Management',
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_plan_management.html', context)


@login_required
def coach_plan_customization_view(request):
    """
    Coach plan customization interface
    """
    # Ensure user is a coach
    coach_profile = getattr(request.user, 'coach_profile', None)
    if not coach_profile:
        return redirect('dashboard:dashboard')
    
    return render(request, 'plan_management/coach_plan_customization.html', {
        'page_title': 'Plan Customization'
    })


@login_required
def coach_client_plan_detail_view(request, subscription_id):
    """
    Detailed view for a specific client's plan
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    # Get subscription with security check
    subscription = get_object_or_404(PlanSubscription, id=subscription_id)
    
    # Verify coach has access to this subscription
    if subscription.product_plan.coach != coach_profile:
        return HttpResponseForbidden("You don't have permission to view this plan")
    
    # Get plan days with related data
    plan_days = PlanDay.objects.filter(
        subscription=subscription
    ).select_related(
        'nutrition_plan', 'workout_plan'
    ).prefetch_related(
        'nutrition_plan__meals',
        'workout_plan__exercise_blocks'
    ).order_by('day_number')
    
    # Calculate plan progress
    total_days = plan_days.count()
    completed_days = plan_days.filter(completion_status='completed').count()
    progress_percentage = (completed_days / total_days * 100) if total_days > 0 else 0
    
    # Get client data
    client = subscription.client
    
    # Get client measurements if available
    from apps.profiles.client_profile.models import ClientMeasurement
    try:
        client_profile = client.client_profile
        measurements = ClientMeasurement.objects.filter(
            client=client_profile
        ).order_by('-date')[:5]
    except:
        measurements = []
    
    context = {
        'coach_profile': coach_profile,
        'subscription': subscription,
        'plan_days': plan_days,
        'client': client,
        'measurements': measurements,
        'progress': {
            'total_days': total_days,
            'completed_days': completed_days,
            'progress_percentage': progress_percentage
        },
        'page_title': f'Plan for {client.get_full_name()}',
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': f'Plan for {client.get_full_name()}', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_client_plan_detail.html', context)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_plan_analytics(request):
    """
    Get analytics for coach's plans
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    # Get all plan days for this coach
    plan_days = PlanDay.objects.filter(
        subscription__product_plan__coach=coach_profile
    )
    
    # Calculate completion rates
    total_days = plan_days.count()
    completion_stats = {
        'completed': plan_days.filter(completion_status='completed').count(),
        'in_progress': plan_days.filter(completion_status='in_progress').count(),
        'not_started': plan_days.filter(completion_status='not_started').count(),
        'skipped': plan_days.filter(completion_status='skipped').count(),
        'rescheduled': plan_days.filter(completion_status='rescheduled').count(),
    }
    
    # Calculate completion rates as percentages
    completion_rates = {}
    for status, count in completion_stats.items():
        completion_rates[status] = round((count / total_days * 100) if total_days > 0 else 0, 1)
    
    # Get average client ratings
    from django.db.models import Avg
    avg_rating = plan_days.filter(client_rating__isnull=False).aggregate(
        avg_rating=Avg('client_rating')
    )['avg_rating'] or 0
    
    # Get plan adherence by plan type
    plan_types = ProductPlan.objects.filter(
        coach=coach_profile
    ).values('plan_type').annotate(
        total_days=Count('plan_subscriptions__plan_days'),
        completed_days=Count('plan_subscriptions__plan_days', 
                            filter=Q(plan_subscriptions__plan_days__completion_status='completed'))
    )
    
    # Calculate adherence rates
    for plan_type in plan_types:
        plan_type['adherence_rate'] = round(
            (plan_type['completed_days'] / plan_type['total_days'] * 100) 
            if plan_type['total_days'] > 0 else 0, 1
        )
    
    analytics = {
        'total_days': total_days,
        'completion_stats': completion_stats,
        'completion_rates': completion_rates,
        'avg_client_rating': round(avg_rating, 1),
        'plan_type_adherence': list(plan_types)
    }
    
    return Response({'success': True, 'analytics': analytics})

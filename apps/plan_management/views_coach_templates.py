from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponseForbidden
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import datetime, timedelta, date
from apps.profiles.coach_profile.models import CoachProfile
from .coach.models import ProductPlan
from .client.models import PlanSubscription
from .daily_entries.models import PlanDay
from django.core.cache import cache
import hashlib
import json

User = get_user_model()


# ===== Shared filter helpers for Coach Dashboard =====
def _parse_date(date_str):
    """Parse 'YYYY-MM-DD' to date or return None."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None


def _compute_date_range(preset: str):
    """Compute (start_date, end_date) for a given preset.
    Presets: 7d, 30d, 90d, ytd. Returns (None, None) if unknown.
    """
    today = timezone.now().date()
    end = today
    if not preset:
        return (None, None)
    p = preset.lower()
    if p == '7d':
        return (end - timedelta(days=6), end)
    if p == '30d':
        return (end - timedelta(days=29), end)
    if p == '90d':
        return (end - timedelta(days=89), end)
    if p == 'ytd':
        return (date(end.year, 1, 1), end)  # type: ignore[name-defined]
    return (None, None)


def _plan_type_values(param: str):
    """Map frontend plan_type to backend values.
    - 'nutrition' -> 'diet'
    - 'workout' -> 'workout'
    - 'hybrid' or 'all' or '' -> None (means include both)
    Returns list like ['workout'] or ['diet'] or None.
    """
    if not param:
        return None
    p = param.lower()
    if p == 'nutrition':
        return ['diet']
    if p == 'workout':
        return ['workout']
    if p in ('hybrid', 'all'):
        return None
    # If backend already sends 'diet' we support it as well
    if p in ('diet',):
        return ['diet']
    return None


def _extract_filters(request):
    """Extract and normalize filters from request.GET."""
    preset = (request.GET.get('preset') or '').lower()
    start_date = _parse_date(request.GET.get('start_date'))
    end_date = _parse_date(request.GET.get('end_date'))

    # If no explicit dates but preset provided, compute
    if (not start_date or not end_date) and preset and preset != 'custom':
        s, e = _compute_date_range(preset)
        start_date = start_date or s
        end_date = end_date or e

    plan_type_param = request.GET.get('plan_type') or ''
    plan_type_vals = _plan_type_values(plan_type_param)

    segment = (request.GET.get('segment') or '').lower()
    q = (request.GET.get('q') or '').strip()

    return {
        'preset': preset,
        'start_date': start_date,
        'end_date': end_date,
        'plan_type_values': plan_type_vals,  # None or ['workout'] / ['diet']
        'segment': segment,
        'q': q,
    }


def _filtered_client_ids_for_coach(coach_profile: CoachProfile, filters: dict):
    """Return a queryset of client user IDs for this coach after applying plan_type, search, and segment filters.
    Segment semantics:
    - new: subscribed within window if provided else within last 30 days
    - high_risk: no measurements in window (default 30d if none provided)
    - top_10: top 10 by measurement count within window (default 90d if none provided)
    """
    base = PlanSubscription.objects.filter(product_plan__coach=coach_profile)
    if filters.get('plan_type_values'):
        base = base.filter(product_plan__plan_type__in=filters['plan_type_values'])

    # Apply search across user fields
    q = filters.get('q')
    if q:
        base = base.filter(
            Q(client__username__icontains=q) |
            Q(client__email__icontains=q) |
            Q(client__first_name__icontains=q) |
            Q(client__last_name__icontains=q)
        )

    segment = filters.get('segment')
    start = filters.get('start_date')
    end = filters.get('end_date') or timezone.now().date()

    # Default windows
    if segment == 'new':
        win_start = start or (end - timedelta(days=30))
        base = base.filter(subscribed_at__date__gte=win_start)
    elif segment in ('high_risk', 'top_10'):
        # Measurement-based segments
        from apps.profiles.client_profile.models import ClientMeasurement
        if segment == 'high_risk':
            win_start = start or (end - timedelta(days=30))
        else:  # top_10
            win_start = start or (end - timedelta(days=90))

        # Restrict to clients for this coach
        client_ids_all = base.values_list('client_id', flat=True).distinct()
        meas_qs = ClientMeasurement.objects.filter(
            client__user_id__in=client_ids_all,
            date__gte=win_start,
            date__lte=end,
        )
        if segment == 'high_risk':
            # Clients with zero measurements in window
            active_ids = meas_qs.values_list('client__user_id', flat=True).distinct()
            base = base.exclude(client_id__in=active_ids)
        else:  # top_10
            top_ids = (
                meas_qs.values('client__user_id')
                .annotate(c=Count('id'))
                .order_by('-c')
            )[:10]
            top_ids = [x['client__user_id'] for x in top_ids]
            base = base.filter(client_id__in=top_ids)

    return base.values_list('client_id', flat=True).distinct()


def _apply_plan_day_filters(plan_days_qs, coach_profile: CoachProfile, filters: dict):
    """Apply coach scoping plus filters to a PlanDay queryset."""
    qs = plan_days_qs.filter(subscription__product_plan__coach=coach_profile)
    if filters.get('plan_type_values'):
        qs = qs.filter(subscription__product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('start_date') and filters.get('end_date'):
        qs = qs.filter(scheduled_date__range=(filters['start_date'], filters['end_date']))

    if filters.get('segment') or filters.get('q'):
        client_ids = _filtered_client_ids_for_coach(coach_profile, filters)
        qs = qs.filter(subscription__client_id__in=client_ids)
    return qs

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
    # Optional: deep-link subscription id for auto-loading a client's data on the frontend
    subscription_id = request.GET.get('subscription_id')

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
        # Expose subscription id (if any) to template for potential use
        'subscription_id': subscription_id,
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_client_quick_stats(request):
    """
    Get quick stats for coach's clients for dashboard widgets
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    from apps.profiles.client_profile.models import ClientMeasurement

    filters = _extract_filters(request)

    # Determine client universe after applying search/segment/plan_type
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    # Total clients (after filters)
    total_clients = client_ids_qs.count()

    # Active subscriptions (apply plan_type + date range via related PlanDay if provided)
    active_qs = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        status='active',
        client_id__in=client_ids_qs,
    )
    if filters.get('plan_type_values'):
        active_qs = active_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('start_date') and filters.get('end_date'):
        active_qs = active_qs.filter(plan_days__scheduled_date__range=(filters['start_date'], filters['end_date']))
    active_subscriptions = active_qs.distinct().count()

    # Measurement window
    m_end = filters.get('end_date') or timezone.now().date()
    m_start = filters.get('start_date') or (m_end - timedelta(days=30))

    # Recent measurements and active clients within window
    recent_meas_qs = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids_qs,
        date__gte=m_start,
        date__lte=m_end,
    )
    recent_measurements = recent_meas_qs.count()
    active_clients = recent_meas_qs.values('client').distinct().count()

    stats = {
        'total_clients': total_clients,
        'active_subscriptions': active_subscriptions,
        'recent_measurements': recent_measurements,
        'active_clients': active_clients,
        'engagement_rate': round((active_clients / total_clients * 100) if total_clients > 0 else 0, 1)
    }

    return Response({'success': True, 'stats': stats})


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
    
    from apps.profiles.client_profile.models import ClientMeasurement
    
    filters = _extract_filters(request)

    # Determine client IDs after applying filters (segment/search/plan_type)
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)
    client_ids = list(client_ids_qs)

    # Windows
    end = filters.get('end_date') or timezone.now().date()
    start_30 = filters.get('start_date') or (end - timedelta(days=30))
    start_90 = filters.get('start_date') or (end - timedelta(days=90))

    # Optional pagination parameters for top clients (parse early for cache key)
    try:
        top_limit = int(request.GET.get('top_limit', 5))
    except (TypeError, ValueError):
        top_limit = 5
    try:
        top_offset = int(request.GET.get('top_offset', 0))
    except (TypeError, ValueError):
        top_offset = 0
    # Sanitize limits
    top_limit = max(1, min(50, top_limit))
    top_offset = max(0, top_offset)

    # Build cache key per coach + filters + pagination
    key_payload = {
        'coach_id': coach_profile.id,
        'preset': filters.get('preset') or '',
        'start_date': (filters.get('start_date').isoformat() if filters.get('start_date') else ''),
        'end_date': (filters.get('end_date').isoformat() if filters.get('end_date') else ''),
        'plan_type': (request.GET.get('plan_type') or ''),
        'segment': filters.get('segment') or '',
        'q': filters.get('q') or '',
        'top_limit': top_limit,
        'top_offset': top_offset,
    }
    cache_key = 'coach_insights:' + hashlib.md5(json.dumps(key_payload, sort_keys=True).encode('utf-8')).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return Response({'success': True, 'insights': cached})

    # Client progress analytics (limit to 10 clients to keep response light)
    progress_data = []
    for client_id in client_ids[:10]:
        try:
            # Fetch only required user fields
            client_user = User.objects.only('id', 'first_name', 'last_name').get(id=client_id)
            client_profile = client_user.client_profile

            measurements = ClientMeasurement.objects.filter(
                client=client_profile,
                date__gte=start_90,
                date__lte=end,
            ).only('date', 'weight').order_by('-date')

            if measurements.count() >= 2:
                latest = measurements.first()
                oldest = measurements.last()
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

    # Measurement frequency analysis (window ~30d or provided)
    measurement_frequency = (
        ClientMeasurement.objects.filter(
            client__user_id__in=client_ids,
            date__gte=start_30,
            date__lte=end,
        )
        .annotate(day=TruncDate('date'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('day')
    )

    # Top performing clients (most measurements) within window (~90d or provided)
    base_top_qs = (
        ClientMeasurement.objects.filter(
            client__user_id__in=client_ids,
            date__gte=start_90,
            date__lte=end,
        )
        .values(
            'client__user__first_name',
            'client__user__last_name',
            'client__user_id'
        )
        .annotate(measurement_count=Count('id'))
        .order_by('-measurement_count')
    )
    top_total = base_top_qs.count()
    top_clients = base_top_qs[top_offset: top_offset + top_limit]

    total_meas_window = ClientMeasurement.objects.filter(
        client__user_id__in=client_ids,
        date__gte=start_30,
        date__lte=end,
    ).count()

    total_clients_count = len(client_ids)
    avg_per_client = round(
        (total_meas_window / total_clients_count) if total_clients_count else 0,
        1
    )

    insights = {
        'client_progress': progress_data,
        'measurement_frequency': list(measurement_frequency),
        'top_clients': list(top_clients),
        'top_clients_meta': {
            'total': top_total,
            'limit': top_limit,
            'offset': top_offset,
        },
        'summary': {
            'total_measurements_30d': total_meas_window,
            'avg_measurements_per_client': avg_per_client,
            'clients_with_progress': len([p for p in progress_data if p['weight_change'] is not None])
        }
    }

    # Cache insights briefly (e.g., 60 seconds) to improve responsiveness
    cache.set(cache_key, insights, 60)
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
def coach_dashboard_view(request):
    """
    Coach dashboard template view (JWT-driven via frontend JS)
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })

    context = {
        'coach_profile': coach_profile,
        'page_title': 'Coach Dashboard',
        'include_charts': True,
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': None},
        ]
    }

    return render(request, 'plan_management/coach_dashboard.html', context)


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

    filters = _extract_filters(request)

    # Plan days for this coach with filters applied
    base_qs = PlanDay.objects.all()
    plan_days = _apply_plan_day_filters(base_qs, coach_profile, filters)

    # Calculate completion stats and rates
    total_days = plan_days.count()
    completion_stats = {
        'completed': plan_days.filter(completion_status='completed').count(),
        'in_progress': plan_days.filter(completion_status='in_progress').count(),
        'not_started': plan_days.filter(completion_status='not_started').count(),
        'skipped': plan_days.filter(completion_status='skipped').count(),
        'rescheduled': plan_days.filter(completion_status='rescheduled').count(),
    }
    completion_rates = {
        status: round((cnt / total_days * 100) if total_days > 0 else 0, 1)
        for status, cnt in completion_stats.items()
    }

    # Average client rating within filtered window
    avg_rating = plan_days.filter(client_rating__isnull=False).aggregate(
        avg_rating=Avg('client_rating')
    )['avg_rating'] or 0

    # Plan type adherence with filters (respect plan_type filter, date range, and client filters)
    pt_qs = ProductPlan.objects.filter(coach=coach_profile)
    if filters.get('plan_type_values'):
        pt_qs = pt_qs.filter(plan_type__in=filters['plan_type_values'])

    # Build day filter Q for annotations
    day_filter = Q()
    if filters.get('start_date') and filters.get('end_date'):
        day_filter &= Q(plan_subscriptions__plan_days__scheduled_date__range=(filters['start_date'], filters['end_date']))

    if filters.get('segment') or filters.get('q'):
        client_ids = _filtered_client_ids_for_coach(coach_profile, filters)
        day_filter &= Q(plan_subscriptions__client_id__in=client_ids)

    plan_types = pt_qs.values('plan_type').annotate(
        total_days=Count('plan_subscriptions__plan_days', filter=day_filter),
        completed_days=Count(
            'plan_subscriptions__plan_days',
            filter=(day_filter & Q(plan_subscriptions__plan_days__completion_status='completed'))
        ),
    )

    # Calculate adherence rates
    for pt in plan_types:
        pt['adherence_rate'] = round(
            (pt['completed_days'] / pt['total_days'] * 100) if pt['total_days'] > 0 else 0,
            1,
        )

    analytics = {
        'total_days': total_days,
        'completion_stats': completion_stats,
        'completion_rates': completion_rates,
        'avg_client_rating': round(avg_rating, 1),
        'plan_type_adherence': list(plan_types),
    }

    return Response({'success': True, 'analytics': analytics})

from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.http import HttpResponseForbidden, JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, F, Q, Case, When, Value, IntegerField, Max
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import datetime, timedelta, date
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.utils import get_avatar_url
from .coach.models import ProductPlan
from .client.models import PlanSubscription
from .daily_entries.models import PlanDay
from django.core.cache import cache
import hashlib
import json
import csv
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch

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
    if p == 'hybrid':
        # UI term maps to backend 'combined'
        return ['combined']
    if p == 'combined':
        return ['combined']
    if p in ('all',):
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
    # Normalize UI segments to backend tokens
    if segment in ('at-risk', 'at_risk'):
        segment = 'high_risk'
    q = (request.GET.get('q') or '').strip()

    # Optional: filter to a specific plan id for coach reports
    plan_id = None
    plan_id_param = request.GET.get('plan_id')
    if plan_id_param:
        try:
            plan_id_int = int(plan_id_param)
            if plan_id_int > 0:
                plan_id = plan_id_int
        except (TypeError, ValueError):
            plan_id = None

    # Optional: filter to a specific client id
    client_id = None
    client_id_param = request.GET.get('client_id')
    if client_id_param:
        try:
            cid_int = int(client_id_param)
            if cid_int > 0:
                client_id = cid_int
        except (TypeError, ValueError):
            client_id = None

    return {
        'preset': preset,
        'start_date': start_date,
        'end_date': end_date,
        'plan_type_values': plan_type_vals,  # None or ['workout'] / ['diet']
        'segment': segment,
        'q': q,
        'plan_id': plan_id,
        'client_id': client_id,
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
    elif segment in ('high_risk', 'inactive', 'active', 'top_10'):
        # Measurement-based segments
        from apps.profiles.client_profile.models import ClientMeasurement
        # Windows by segment if not provided explicitly
        if segment == 'high_risk':
            # At-risk: no activity > 14 days
            win_start = start or (end - timedelta(days=14))
        elif segment == 'inactive':
            # Inactive: no activity > 30 days
            win_start = start or (end - timedelta(days=30))
        elif segment == 'active':
            # Active: some activity in last 30 days
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
        if segment in ('high_risk', 'inactive'):
            # Clients with zero measurements in window
            active_ids = meas_qs.values_list('client__user_id', flat=True).distinct()
            base = base.exclude(client_id__in=active_ids)
        elif segment == 'active':
            # Clients with at least one measurement in window
            active_ids = meas_qs.values_list('client__user_id', flat=True).distinct()
            base = base.filter(client_id__in=active_ids)
        else:  # top_10
            top_ids = (
                meas_qs.values('client__user_id')
                .annotate(c=Count('id'))
                .order_by('-c')
            )[:10]
            top_ids = [x['client__user_id'] for x in top_ids]
            base = base.filter(client_id__in=top_ids)

    return base.values_list('client_id', flat=True).distinct()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_clients(request):
    """Lightweight search for coach's clients (scoped by filters).
    Supports query param q and limit (default 20). Respects plan_type/plan_id/date window.
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    filters = _extract_filters(request)

    # Base subscriptions scoped to coach (and optional filters)
    subs = PlanSubscription.objects.filter(product_plan__coach=coach_profile)
    if filters.get('plan_id'):
        subs = subs.filter(product_plan_id=filters['plan_id'])
    if filters.get('plan_type_values'):
        subs = subs.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('start_date') and filters.get('end_date'):
        subs = subs.filter(
            subscribed_at__date__gte=filters['start_date'],
            subscribed_at__date__lte=filters['end_date'],
        )

    client_ids = subs.values_list('client_id', flat=True).distinct()

    q = (request.GET.get('q') or '').strip()
    users = User.objects.filter(id__in=client_ids).values('id', 'first_name', 'last_name', 'username')
    if q:
        users = users.filter(
            Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(username__icontains=q) | Q(id__icontains=q)
        )

    try:
        limit = int(request.GET.get('limit', 20))
    except (TypeError, ValueError):
        limit = 20
    limit = max(1, min(100, limit))

    users = list(users.order_by('first_name', 'last_name')[:limit])
    results = [
        {
            'id': u['id'],
            'name': (f"{u['first_name']} {u['last_name']}").strip() or (u['username'] or f"Client #{u['id']}")
        }
        for u in users
    ]

    return Response({'success': True, 'results': results})


def _apply_plan_day_filters(plan_days_qs, coach_profile: CoachProfile, filters: dict):
    """Apply coach scoping plus filters to a PlanDay queryset."""
    qs = plan_days_qs.filter(subscription__product_plan__coach=coach_profile)
    if filters.get('plan_type_values'):
        qs = qs.filter(subscription__product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('plan_id'):
        qs = qs.filter(subscription__product_plan_id=filters['plan_id'])
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
        # Handle create or edit based on presence of plan_id
        try:
            from django.utils import timezone
            from datetime import timedelta

            plan_id = request.POST.get('plan_id')
            price = float(request.POST.get('price', 0) or 0)
            duration = int(request.POST.get('duration', 30) or 30)
            workout_days = int(request.POST.get('workout_days_per_week', 3) or 3)
            session_count = max(1, (duration * workout_days) // 7)
            price_per_session = price / session_count if session_count > 0 else price

            common_fields = {
                'name': request.POST.get('name'),
                'description': request.POST.get('description'),
                'plan_type': request.POST.get('plan_type'),
                'price': price,
                'price_per_session': price_per_session,
                'session_count': session_count,
                'difficulty_level': request.POST.get('difficulty_level') or 'intermediate',
                'workout_days_per_week': int(request.POST.get('workout_days_per_week') or 0 or 0),
                'rest_days_per_week': int(request.POST.get('rest_days_per_week') or 0 or 0),
                'meals_per_day': int(request.POST.get('meals_per_day') or 3),
                'snacks_per_day': int(request.POST.get('snacks_per_day') or 2),
            }

            if plan_id:
                # Edit mode: ensure plan belongs to coach and has NO subscriptions
                plan = get_object_or_404(ProductPlan, id=int(plan_id))
                if plan.coach != coach_profile:
                    return JsonResponse({'success': False, 'error': "You don't have permission to edit this plan."}, status=403)
                if plan.plan_subscriptions.exists():
                    return JsonResponse({'success': False, 'error': 'This plan has subscribers and cannot be edited.'}, status=400)

                # Update fields
                for k, v in common_fields.items():
                    setattr(plan, k, v)
                # Keep start date; adjust end date based on new duration
                plan.end_date = plan.start_date + timedelta(days=duration)
                plan.duration_days = duration
                # Optional max_clients
                max_clients_val = request.POST.get('max_clients')
                plan.max_clients = int(max_clients_val) if max_clients_val else None
                plan.save()

                return JsonResponse({
                    'success': True,
                    'message': 'Plan updated successfully!',
                    'plan_id': plan.id,
                    'redirect_url': f'/plan-management/coach/plan-management/'
                })
            else:
                # Create mode
                plan = ProductPlan.objects.create(
                    coach=coach_profile,
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timedelta(days=duration),
                    duration_days=duration,
                    **common_fields,
                )
                # Set max clients if provided
                max_clients_val = request.POST.get('max_clients')
                if max_clients_val:
                    plan.max_clients = int(max_clients_val)
                    plan.save()

                return JsonResponse({
                    'success': True,
                    'message': 'Plan created successfully!',
                    'plan_id': plan.id,
                    'redirect_url': f'/plan-management/coach/plan-management/'
                })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
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
    # If editing, load plan and add to context for prefill
    plan_id = request.GET.get('plan_id')
    if plan_id:
        try:
            plan = ProductPlan.objects.get(id=int(plan_id), coach=coach_profile)
            context['plan'] = plan
            context['edit_mode'] = True
            # Convenience: computed duration for display
            context['plan_duration'] = (plan.end_date - plan.start_date).days
            context['page_title'] = f'Edit Plan: {plan.name}'
            context['breadcrumbs'][-1] = {'name': 'Edit Plan', 'url': None}
        except (ProductPlan.DoesNotExist, ValueError):
            pass

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
    # No caching here; quick stats are lightweight and frequently updated

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
    if filters.get('plan_id'):
        active_qs = active_qs.filter(product_plan_id=filters['plan_id'])
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

    # New subscriptions in window (based on subscribed_at)
    new_subs_qs = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        client_id__in=client_ids_qs,
        subscribed_at__date__gte=m_start,
        subscribed_at__date__lte=m_end,
    )
    if filters.get('plan_type_values'):
        new_subs_qs = new_subs_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('plan_id'):
        new_subs_qs = new_subs_qs.filter(product_plan_id=filters['plan_id'])
    new_subscriptions = new_subs_qs.count()

    stats = {
        'total_clients': total_clients,
        'active_subscriptions': active_subscriptions,
        'recent_measurements': recent_measurements,
        'active_clients': active_clients,
        'engagement_rate': round((active_clients / total_clients * 100) if total_clients > 0 else 0, 1),
        'new_subscriptions': new_subscriptions,
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
        .annotate(
            measurement_count=Count('id'),
            last_activity_date=Max('date'),
        )
        .order_by('-measurement_count')
    )
    top_total = base_top_qs.count()
    raw_top = list(base_top_qs[top_offset: top_offset + top_limit])

    # Enrich top clients with plan type, status, and progress percentage
    enriched_top = []
    for item in raw_top:
        cid = item['client__user_id']
        # Subscriptions for this client under this coach (respect plan_type filter and date window)
        subs_qs = PlanSubscription.objects.filter(
            product_plan__coach=coach_profile,
            client_id=cid,
        )
        if filters.get('plan_type_values'):
            subs_qs = subs_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
        if filters.get('plan_id'):
            subs_qs = subs_qs.filter(product_plan_id=filters['plan_id'])
        # Choose predominant plan type
        plan_types = list(subs_qs.values_list('product_plan__plan_type', flat=True).distinct())
        if len(plan_types) > 1:
            plan_type = 'hybrid'
        elif len(plan_types) == 1:
            plan_type = plan_types[0]
        else:
            plan_type = None
        # Determine status preference Active > Pending > Inactive
        status = 'Inactive'
        if subs_qs.filter(status='active').exists():
            status = 'Active'
        elif subs_qs.filter(status='pending').exists():
            status = 'Pending'
        elif subs_qs.filter(status='completed').exists():
            status = 'Completed'

        # Progress percent from PlanDay completion within window
        days_qs = PlanDay.objects.filter(
            subscription__product_plan__coach=coach_profile,
            subscription__client_id=cid,
        )
        if filters.get('plan_id'):
            days_qs = days_qs.filter(subscription__product_plan_id=filters['plan_id'])
        if filters.get('start_date') and filters.get('end_date'):
            days_qs = days_qs.filter(scheduled_date__range=(filters['start_date'], filters['end_date']))
        # Count statuses
        comp_counts = days_qs.values('completion_status').annotate(c=Count('id'))
        counts_map = {x['completion_status']: x['c'] for x in comp_counts}
        denom = (
            counts_map.get('completed', 0)
            + counts_map.get('in_progress', 0)
            + counts_map.get('not_started', 0)
        )
        progress_percent = 0
        if denom > 0:
            progress_percent = int(round((counts_map.get('completed', 0) / denom) * 100))

        # Compose enriched record
        enriched = dict(item)
        enriched['plan_type'] = plan_type
        enriched['status'] = status
        enriched['progress_percent'] = progress_percent
        enriched_top.append(enriched)

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
        'top_clients': enriched_top,
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_top_clients(request):
    """Server-side Top Clients by Activity for DataTables.
    Accepts DataTables params: draw, start, length, order[0][column], order[0][dir], search[value]
    Applies usual filters (plan_type, plan_id, client_id, segment, q, preset/dates).
    Returns fields: index, client_html, plan_type, status, measurement_count, last_activity_date, progress_percent, actions_html.
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    from apps.profiles.client_profile.models import ClientMeasurement

    filters = _extract_filters(request)

    # DataTables params
    draw = int(request.GET.get('draw', 1) or 1)
    try:
        start = int(request.GET.get('start', 0) or 0)
    except (TypeError, ValueError):
        start = 0
    try:
        length = int(request.GET.get('length', 10) or 10)
    except (TypeError, ValueError):
        length = 10
    length = max(1, min(100, length))
    order_col = request.GET.get('order[0][column]')
    order_dir = (request.GET.get('order[0][dir]') or 'desc').lower()
    dt_search = (request.GET.get('search[value]') or '').strip()

    # Window
    end = filters.get('end_date') or timezone.now().date()
    start_90 = filters.get('start_date') or (end - timedelta(days=90))

    # Scope clients
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    # Base queryset: counts per client in window
    base_qs = (
        ClientMeasurement.objects.filter(
            client__user_id__in=client_ids_qs,
            date__gte=start_90,
            date__lte=end,
        )
        .values('client__user__first_name', 'client__user__last_name', 'client__user_id')
        .annotate(measurement_count=Count('id'), last_activity_date=Max('date'))
    )

    total_count = base_qs.count()

    # Apply search across client fields if provided either via dt_search or filters['q']
    search_text = dt_search or (filters.get('q') or '')
    if search_text:
        users_q = User.objects.filter(
            Q(first_name__icontains=search_text) | Q(last_name__icontains=search_text) | Q(username__icontains=search_text) | Q(id__icontains=search_text)
        ).values_list('id', flat=True)
        base_qs = base_qs.filter(client__user_id__in=users_q)

    filtered_count = base_qs.count()

    # Sorting map (fallback to measurement_count desc)
    order_fields = {
        '1': ['client__user__first_name', 'client__user__last_name'], # Client
        '4': ['-measurement_count'],  # Measurements
        '5': ['-last_activity_date'], # Last Activity
    }
    if order_col in order_fields:
        fields = order_fields[order_col]
        if order_dir == 'asc':
            fields = [f.lstrip('-') for f in fields]
        base_qs = base_qs.order_by(*fields)
    else:
        base_qs = base_qs.order_by('-measurement_count')

    # Slice
    page_qs = list(base_qs[start:start + length])

    # Enrich
    data_rows = []
    index = start + 1
    for item in page_qs:
        cid = item['client__user_id']
        fname = item.get('client__user__first_name') or ''
        lname = item.get('client__user__last_name') or ''
        name = (f"{fname} {lname}").strip() or f"Client #{cid}"

        subs_qs = PlanSubscription.objects.filter(product_plan__coach=coach_profile, client_id=cid)
        if filters.get('plan_type_values'):
            subs_qs = subs_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
        if filters.get('plan_id'):
            subs_qs = subs_qs.filter(product_plan_id=filters['plan_id'])

        plan_types = list(subs_qs.values_list('product_plan__plan_type', flat=True).distinct())
        if len(plan_types) > 1:
            plan_type = 'hybrid'
        elif len(plan_types) == 1:
            plan_type = plan_types[0]
        else:
            plan_type = None

        status = 'Inactive'
        if subs_qs.filter(status='active').exists():
            status = 'Active'
        elif subs_qs.filter(status='pending').exists():
            status = 'Pending'
        elif subs_qs.filter(status='completed').exists():
            status = 'Completed'

        days_qs = PlanDay.objects.filter(subscription__product_plan__coach=coach_profile, subscription__client_id=cid)
        if filters.get('plan_id'):
            days_qs = days_qs.filter(subscription__product_plan_id=filters['plan_id'])
        if filters.get('start_date') and filters.get('end_date'):
            days_qs = days_qs.filter(scheduled_date__range=(filters['start_date'], filters['end_date']))
        comp_counts = days_qs.values('completion_status').annotate(c=Count('id'))
        counts_map = {x['completion_status']: x['c'] for x in comp_counts}
        denom = (counts_map.get('completed', 0) + counts_map.get('in_progress', 0) + counts_map.get('not_started', 0))
        progress_percent = int(round((counts_map.get('completed', 0) / denom) * 100)) if denom else 0

        # Presentation helpers (keep formatting at frontend but include raw types)
        view_url = f"/plan-management/coach/client-measurements/?client_id={cid}"
        plan_url = f"/plan-management/coach/plan-creation/?client_id={cid}"
        client_html = f"<div class='d-flex align-items-center'><img class='client-avatar avatar-img rounded-circle me-2' src='' alt='{name}' data-username='{name}' width='32' height='32' loading='lazy' /><div><div class='fw-medium'>{name}</div><div class='small text-muted'>#{cid}</div></div></div>"
        actions_html = (
            f"<div class='btn-group' role='group'>"
            f"<a class='btn btn-sm btn-outline-primary' href='{view_url}' data-clientid='{cid}'><i class='bi bi-eye'></i> View</a>"
            f"<a class='btn btn-sm btn-primary' href='{plan_url}' data-clientid='{cid}'><i class='bi bi-plus-circle'></i> Plan</a>"
            f"</div>"
        )

        data_rows.append({
            'index': index,
            'client': client_html,
            'plan_type': plan_type or '',
            'status': status,
            'measurement_count': item.get('measurement_count') or 0,
            'last_activity_date': (item.get('last_activity_date').strftime('%Y-%m-%d') if item.get('last_activity_date') else ''),
            'progress_percent': progress_percent,
            'actions': actions_html,
        })
        index += 1

    payload = {
        'draw': draw,
        'recordsTotal': total_count,
        'recordsFiltered': filtered_count,
        'data': data_rows,
    }
    return Response(payload)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_export_csv(request):
    """CSV export for coach dashboard using current filters."""
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    from apps.profiles.client_profile.models import ClientMeasurement

    filters = _extract_filters(request)
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    # Quick stats
    total_clients = client_ids_qs.count()
    active_qs = PlanSubscription.objects.filter(product_plan__coach=coach_profile, status='active', client_id__in=client_ids_qs)
    if filters.get('plan_type_values'):
        active_qs = active_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('plan_id'):
        active_qs = active_qs.filter(product_plan_id=filters['plan_id'])
    if filters.get('start_date') and filters.get('end_date'):
        active_qs = active_qs.filter(plan_days__scheduled_date__range=(filters['start_date'], filters['end_date']))
    active_subscriptions = active_qs.distinct().count()

    end = filters.get('end_date') or timezone.now().date()
    start_30 = filters.get('start_date') or (end - timedelta(days=30))
    start_90 = filters.get('start_date') or (end - timedelta(days=90))

    recent_meas_qs = ClientMeasurement.objects.filter(client__user_id__in=client_ids_qs, date__gte=start_30, date__lte=end)
    recent_measurements = recent_meas_qs.count()
    active_clients = recent_meas_qs.values('client').distinct().count()

    # Measurement frequency
    measurement_frequency = (
        ClientMeasurement.objects.filter(client__user_id__in=client_ids_qs, date__gte=start_30, date__lte=end)
        .annotate(day=TruncDate('date')).values('day').annotate(count=Count('id')).order_by('day')
    )

    # Top clients (limit 500)
    base_top_qs = (
        ClientMeasurement.objects.filter(client__user_id__in=client_ids_qs, date__gte=start_90, date__lte=end)
        .values('client__user__first_name', 'client__user__last_name', 'client__user_id')
        .annotate(measurement_count=Count('id'), last_activity_date=Max('date'))
        .order_by('-measurement_count')
    )
    raw_top = list(base_top_qs[:500])

    # Write CSV
    sio = io.StringIO()
    w = csv.writer(sio)
    w.writerow(['Coach Dashboard Report'])
    w.writerow(['Generated', timezone.now().isoformat()])
    w.writerow(['Preset', filters.get('preset') or ''])
    w.writerow(['Start Date', (filters.get('start_date') or '')])
    w.writerow(['End Date', (filters.get('end_date') or '')])
    w.writerow(['Plan Type', (request.GET.get('plan_type') or 'All')])
    w.writerow(['Plan ID', (request.GET.get('plan_id') or 'All')])
    w.writerow(['Client ID', (request.GET.get('client_id') or 'All')])
    w.writerow([])
    w.writerow(['Quick Stats'])
    w.writerow(['Total Clients', total_clients])
    w.writerow(['Active Subscriptions', active_subscriptions])
    w.writerow(['Recent Measurements', recent_measurements])
    w.writerow(['Active Clients', active_clients])
    w.writerow([])
    w.writerow(['Measurement Frequency'])
    w.writerow(['Day', 'Count'])
    for row in measurement_frequency:
        w.writerow([row['day'].isoformat() if row['day'] else '', row['count']])
    w.writerow([])
    w.writerow(['Top Clients'])
    w.writerow(['#', 'Client ID', 'First Name', 'Last Name', 'Measurements', 'Last Activity'])
    for idx, r in enumerate(raw_top, start=1):
        w.writerow([idx, r.get('client__user_id'), r.get('client__user__first_name') or '', r.get('client__user__last_name') or '', r.get('measurement_count') or 0, (r.get('last_activity_date').isoformat() if r.get('last_activity_date') else '')])

    resp = HttpResponse(sio.getvalue(), content_type='text/csv; charset=utf-8')
    resp['Content-Disposition'] = 'attachment; filename="coach_dashboard_report.csv"'
    return resp

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_export_pdf(request):
    """PDF export for coach dashboard using current filters."""
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    from apps.profiles.client_profile.models import ClientMeasurement

    filters = _extract_filters(request)
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    total_clients = client_ids_qs.count()
    end = filters.get('end_date') or timezone.now().date()
    start_90 = filters.get('start_date') or (end - timedelta(days=90))

    base_top_qs = (
        ClientMeasurement.objects.filter(client__user_id__in=client_ids_qs, date__gte=start_90, date__lte=end)
        .values('client__user__first_name', 'client__user__last_name', 'client__user_id')
        .annotate(measurement_count=Count('id'), last_activity_date=Max('date'))
        .order_by('-measurement_count')
    )
    raw_top = list(base_top_qs[:25])

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4
    x = 50
    y = height - 50
    header_h = 24
    def draw_header_footer():
        # Header bar
        c.setFillColorRGB(13/255.0, 110/255.0, 253/255.0)
        c.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont('Helvetica-Bold', 12)
        c.drawString(x, height - 16, 'Easy Fit — Coach Dashboard Report')
        # Footer
        c.setFillColorRGB(0, 0, 0)
        c.setFont('Helvetica', 8)
        c.drawString(x, 20, f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
        c.drawRightString(width - x, 20, f'Page {c.getPageNumber()}')
    def line(txt, dy=16, font=('Helvetica', 10)):
        nonlocal y
        c.setFont(*font)
        c.drawString(x, y, str(txt))
        y -= dy

    draw_header_footer()
    y = height - header_h - 20
    line('Coach Dashboard Report', dy=20, font=('Helvetica-Bold', 14))
    line(f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}")
    line(f"Preset: {filters.get('preset') or ''}")
    line(f"Date Range: {(filters.get('start_date') or '')} to {(filters.get('end_date') or '')}")
    line(f"Plan Type: {request.GET.get('plan_type') or 'All'} | Plan ID: {request.GET.get('plan_id') or 'All'} | Client ID: {request.GET.get('client_id') or 'All'}")
    y -= 8
    line('Quick Summary', dy=18, font=('Helvetica-Bold', 12))
    line(f"Total Clients: {total_clients}")
    y -= 8
    line('Top Clients (first 25)', dy=18, font=('Helvetica-Bold', 12))
    headers = ['#', 'Client', 'Measurements', 'Last Activity']
    cols = [x, x + 40, x + 300, x + 430]
    c.setFont('Helvetica-Bold', 10)
    for i, h in enumerate(headers):
        c.drawString(cols[i], y, h)
    y -= 14
    c.setFont('Helvetica', 10)
    for idx, r in enumerate(raw_top, start=1):
        if y < 60:
            c.showPage(); draw_header_footer(); y = height - header_h - 20
            c.setFont('Helvetica-Bold', 10)
            for i, h in enumerate(headers):
                c.drawString(cols[i], y, h)
            y -= 14
            c.setFont('Helvetica', 10)
        name = (f"{r.get('client__user__first_name') or ''} {r.get('client__user__last_name') or ''}").strip() or f"Client #{r.get('client__user_id')}"
        c.drawString(cols[0], y, str(idx))
        c.drawString(cols[1], y, name[:40])
        c.drawString(cols[2], y, str(r.get('measurement_count') or 0))
        last = r.get('last_activity_date')
        c.drawString(cols[3], y, (last.isoformat() if last else ''))
        y -= 14
    c.showPage(); c.save()
    pdf = buf.getvalue(); buf.close()
    resp = HttpResponse(pdf, content_type='application/pdf')
    resp['Content-Disposition'] = 'attachment; filename="coach_dashboard_report.pdf"'
    return resp
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_insights_export_csv(request):
    """Export coach insights as CSV."""
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    from apps.profiles.client_profile.models import ClientMeasurement

    filters = _extract_filters(request)

    # DataTables params
    draw = int(request.GET.get('draw', 1) or 1)
    try:
        start = int(request.GET.get('start', 0) or 0)
    except (TypeError, ValueError):
        start = 0
    try:
        length = int(request.GET.get('length', 10) or 10)
    except (TypeError, ValueError):
        length = 10
    length = max(1, min(100, length))
    order_col = request.GET.get('order[0][column]')
    order_dir = (request.GET.get('order[0][dir]') or 'desc').lower()
    dt_search = (request.GET.get('search[value]') or '').strip()

    # Window
    end = filters.get('end_date') or timezone.now().date()
    start_90 = filters.get('start_date') or (end - timedelta(days=90))

    # Scope clients
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    # Base queryset: counts per client in window
    base_qs = (
        ClientMeasurement.objects.filter(
            client__user_id__in=client_ids_qs,
            date__gte=start_90,
            date__lte=end,
        )
        .values('client__user__first_name', 'client__user__last_name', 'client__user_id')
        .annotate(measurement_count=Count('id'), last_activity_date=Max('date'))
    )

    total_count = base_qs.count()

    # Apply search across client fields if provided either via dt_search or filters['q']
    search_text = dt_search or (filters.get('q') or '')
    if search_text:
        users_q = User.objects.filter(
            Q(first_name__icontains=search_text) | Q(last_name__icontains=search_text) | Q(username__icontains=search_text) | Q(id__icontains=search_text)
        ).values_list('id', flat=True)
        base_qs = base_qs.filter(client__user_id__in=users_q)

    filtered_count = base_qs.count()

    # Sorting map (fallback to measurement_count desc)
    order_fields = {
        '1': ['client__user__first_name', 'client__user__last_name'], # Client
        '4': ['-measurement_count'],  # Measurements
        '5': ['-last_activity_date'], # Last Activity
    }
    if order_col in order_fields:
        fields = order_fields[order_col]
        if order_dir == 'asc':
            fields = [f.lstrip('-') for f in fields]
        base_qs = base_qs.order_by(*fields)
    else:
        base_qs = base_qs.order_by('-measurement_count')

    # Slice
    page_qs = list(base_qs[start:start + length])

    # Enrich
    data_rows = []
    index = start + 1
    for item in page_qs:
        cid = item['client__user_id']
        fname = item.get('client__user__first_name') or ''
        lname = item.get('client__user__last_name') or ''
        name = (f"{fname} {lname}").strip() or f"Client #{cid}"

        subs_qs = PlanSubscription.objects.filter(product_plan__coach=coach_profile, client_id=cid)
        if filters.get('plan_type_values'):
            subs_qs = subs_qs.filter(product_plan__plan_type__in=filters['plan_type_values'])
        if filters.get('plan_id'):
            subs_qs = subs_qs.filter(product_plan_id=filters['plan_id'])

        plan_types = list(subs_qs.values_list('product_plan__plan_type', flat=True).distinct())
        if len(plan_types) > 1:
            plan_type = 'hybrid'
        elif len(plan_types) == 1:
            plan_type = plan_types[0]
        else:
            plan_type = None

        status = 'Inactive'
        if subs_qs.filter(status='active').exists():
            status = 'Active'
        elif subs_qs.filter(status='pending').exists():
            status = 'Pending'
        elif subs_qs.filter(status='completed').exists():
            status = 'Completed'

        days_qs = PlanDay.objects.filter(subscription__product_plan__coach=coach_profile, subscription__client_id=cid)
        if filters.get('plan_id'):
            days_qs = days_qs.filter(subscription__product_plan_id=filters['plan_id'])
        if filters.get('start_date') and filters.get('end_date'):
            days_qs = days_qs.filter(scheduled_date__range=(filters['start_date'], filters['end_date']))
        comp_counts = days_qs.values('completion_status').annotate(c=Count('id'))
        counts_map = {x['completion_status']: x['c'] for x in comp_counts}
        denom = (counts_map.get('completed', 0) + counts_map.get('in_progress', 0) + counts_map.get('not_started', 0))
        progress_percent = int(round((counts_map.get('completed', 0) / denom) * 100)) if denom else 0

        # Presentation helpers (keep formatting at frontend but include raw types)
        view_url = f"/plan-management/coach/client-measurements/?client_id={cid}"
        plan_url = f"/plan-management/coach/plan-creation/?client_id={cid}"
        client_html = f"<div class='d-flex align-items-center'><img class='client-avatar avatar-img rounded-circle me-2' src='' alt='{name}' data-username='{name}' width='32' height='32' loading='lazy' /><div><div class='fw-medium'>{name}</div><div class='small text-muted'>#{cid}</div></div></div>"
        actions_html = (
            f"<div class='btn-group' role='group'>"
            f"<a class='btn btn-sm btn-outline-primary' href='{view_url}' data-clientid='{cid}'><i class='bi bi-eye'></i> View</a>"
            f"<a class='btn btn-sm btn-primary' href='{plan_url}' data-clientid='{cid}'><i class='bi bi-plus-circle'></i> Plan</a>"
            f"</div>"
        )

        data_rows.append({
            'index': index,
            'client': client_html,
            'plan_type': plan_type or '',
            'status': status,
            'measurement_count': item.get('measurement_count') or 0,
            'last_activity_date': (item.get('last_activity_date').strftime('%Y-%m-%d') if item.get('last_activity_date') else ''),
            'progress_percent': progress_percent,
            'actions': actions_html,
        })
        index += 1

    payload = {
        'draw': draw,
        'recordsTotal': total_count,
        'recordsFiltered': filtered_count,
        'data': data_rows,
    }
    return Response(payload)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_revenue_metrics(request):
    """Compute revenue metrics for the coach based on plan subscriptions.
    - Respects plan_type, date window, segment/search filters via client ids
    - Revenue is computed as sum of ProductPlan.price for subscriptions with
      status in ['active', 'completed'] within window (by subscribed_at)
    - Returns totals and a monthly trend.
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    filters = _extract_filters(request)

    # Client scope based on filters
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    # Base subscriptions: only revenue-bearing statuses
    base = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile
    )
    # Specific plan filter
    if filters.get('plan_id'):
        base = base.filter(product_plan_id=filters['plan_id'])
    # Specific client filter
    if filters.get('client_id'):
        base = base.filter(client_id=filters['client_id'])
    # Status filter
    base = base.filter(
        status__in=['active', 'completed'],
        client_id__in=client_ids_qs,
    )
    if filters.get('plan_type_values'):
        base = base.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('plan_id'):
        base = base.filter(product_plan_id=filters['plan_id'])
    # Date window by subscription time when provided
    if filters.get('start_date') and filters.get('end_date'):
        base = base.filter(
            subscribed_at__date__gte=filters['start_date'],
            subscribed_at__date__lte=filters['end_date'],
        )

    # Totals
    totals = base.aggregate(
        revenue=Sum('product_plan__price'),
        subs=Count('id'),
    )

    # Monthly trend
    trend_qs = (
        base
        .annotate(month=TruncMonth('subscribed_at'))
        .values('month')
        .annotate(revenue=Sum('product_plan__price'), subs=Count('id'))
        .order_by('month')
    )
    monthly = [
        {
            'month': (item['month'].strftime('%Y-%m') if item['month'] else None),
            'revenue': float(item['revenue'] or 0),
            'subscription_count': item['subs'] or 0,
        }
        for item in trend_qs
    ]

    # Breakdown by plan type
    by_type_qs = (
        base
        .values('product_plan__plan_type')
        .annotate(revenue=Sum('product_plan__price'), subs=Count('id'))
        .order_by('product_plan__plan_type')
    )
    by_type = [
        {
            'plan_type': item['product_plan__plan_type'],
            'revenue': float(item['revenue'] or 0),
            'subscription_count': item['subs'] or 0,
        }
        for item in by_type_qs
    ]

    data = {
        'currency': 'EGP',
        'total_revenue': float(totals['revenue'] or 0),
        'subscription_count': totals['subs'] or 0,
        'monthly_trend': monthly,
        'by_plan_type': by_type,
    }

    return Response({'success': True, 'revenue': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_subscription_stats(request):
    """Aggregated subscription stats for the coach.
    Applies the same filters (plan_type, date window, search/segment) used by the dashboard.
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    filters = _extract_filters(request)

    # Scope clients first for consistency with other endpoints
    client_ids_qs = _filtered_client_ids_for_coach(coach_profile, filters)

    base = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        client_id__in=client_ids_qs,
    )
    if filters.get('plan_type_values'):
        base = base.filter(product_plan__plan_type__in=filters['plan_type_values'])
    if filters.get('plan_id'):
        base = base.filter(product_plan_id=filters['plan_id'])
    # Date window by subscription time when provided
    if filters.get('start_date') and filters.get('end_date'):
        base = base.filter(
            subscribed_at__date__gte=filters['start_date'],
            subscribed_at__date__lte=filters['end_date'],
        )

    agg = base.aggregate(
        total=Count('id'),
        active=Count('id', filter=Q(status='active')),
        pending=Count('id', filter=Q(status='pending')),
        completed=Count('id', filter=Q(status='completed')),
        cancelled=Count('id', filter=Q(status='cancelled')),
        revenue=Sum('product_plan__price'),
        avg_price=Avg('product_plan__price'),
    )

    # Distinct plans involved in the filtered base
    total_plans = base.values('product_plan_id').distinct().count()

    # Churn: cancelled over (active + completed + cancelled) within the window
    denom = (agg['active'] or 0) + (agg['completed'] or 0) + (agg['cancelled'] or 0)
    churn_rate = round(((agg['cancelled'] or 0) / denom * 100) if denom > 0 else 0, 1)

    data = {
        'clients_count': client_ids_qs.count(),
        'total_plans': total_plans,
        'total_subscriptions': agg['total'] or 0,
        'active_subscriptions': agg['active'] or 0,
        'pending_subscriptions': agg['pending'] or 0,
        'completed_subscriptions': agg['completed'] or 0,
        'cancelled_subscriptions': agg['cancelled'] or 0,
        'total_revenue': float(agg['revenue'] or 0),
        'avg_price': float(agg['avg_price'] or 0),
        'churn_rate': churn_rate,
    }

    return Response({'success': True, 'subscriptions': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def coach_ratings_summary(request):
    """Ratings distribution and recent ratings across plan days for this coach.
    Respects plan_type/date/segment/search filters via PlanDay scoping.
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return Response({'error': 'Coach profile not found'}, status=404)

    filters = _extract_filters(request)
    # Filter plan days first
    base_days = _apply_plan_day_filters(PlanDay.objects.all(), coach_profile, filters)
    rated_days = base_days.exclude(client_rating__isnull=True)

    # Distribution by star value (assuming 1..5)
    dist_qs = (
        rated_days
        .values('client_rating')
        .annotate(c=Count('id'))
        .order_by('client_rating')
    )
    distribution = {str(item['client_rating']): item['c'] for item in dist_qs}

    total_ratings = sum(distribution.values()) if distribution else 0
    avg_rating = rated_days.aggregate(a=Avg('client_rating'))['a'] or 0

    # Recent ratings list (last 10)
    recent_qs = (
        rated_days
        .select_related('subscription__client')
        .only('id', 'day_number', 'scheduled_date', 'client_rating', 'subscription__client__first_name', 'subscription__client__last_name')
        .order_by('-scheduled_date')[:10]
    )
    recent = []
    for d in recent_qs:
        recent.append({
            'day_id': d.id,
            'day_number': d.day_number,
            'date': d.scheduled_date,
            'rating': d.client_rating,
            'client_name': f"{getattr(d.subscription.client, 'first_name', '')} {getattr(d.subscription.client, 'last_name', '')}".strip(),
        })

    data = {
        'avg_rating': round(float(avg_rating), 2),
        'total_ratings': total_ratings,
        'distribution': distribution,
        'recent': recent,
    }

    return Response({'success': True, 'ratings': data})


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
    
    # Get all product plans created by this coach (paginated)
    product_plans_qs = ProductPlan.objects.filter(coach=coach_profile).order_by('-created_at')
    from django.core.paginator import Paginator
    page = request.GET.get('ppage', 1)
    paginator = Paginator(product_plans_qs, 10)
    product_plans = paginator.get_page(page)
    
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
        'total_plans': paginator.count,
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
    'product_plans_paginator': paginator,
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
def coach_all_plans_view(request):
    """Separate page to browse all coach product plans as cards with pagination."""
    coach_profile = getattr(request.user, 'coach_profile', None)
    if not coach_profile:
        return redirect('dashboard:dashboard')

    qs = ProductPlan.objects.filter(coach=coach_profile).order_by('-created_at')
    from django.core.paginator import Paginator
    page = request.GET.get('page', 1)
    paginator = Paginator(qs, 12)
    page_obj = paginator.get_page(page)

    context = {
        'page_title': 'All Plans',
        'coach_profile': coach_profile,
        'plans': page_obj,
        'paginator': paginator,
        'breadcrumbs': [
            {'name': 'Plan Management', 'url': reverse('plan_management:coach_plan_management')},
            {'name': 'All Plans', 'url': None},
        ],
    }
    return render(request, 'plan_management/coach_all_plans.html', context)


@login_required
def coach_plan_customization_view(request, plan_id=None):
    """
    Coach plan customization interface
    """
    # Ensure user is a coach
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    # Variables to track
    client_id = None
    subscription = None
    
    # Handle subscription_id parameter first (for backward compatibility)
    subscription_id = request.GET.get('subscription_id')
    if subscription_id:
        try:
            subscription = PlanSubscription.objects.get(id=int(subscription_id))
            if subscription.product_plan.coach == coach_profile:
                # Override plan_id with the one from subscription
                plan_id = subscription.product_plan.id
                client_id = subscription.client.id
                print(f"Found subscription {subscription_id}, using plan_id={plan_id}, client_id={client_id}")
            else:
                return HttpResponseForbidden("You don't have permission to customize this subscription's plan")
        except (PlanSubscription.DoesNotExist, ValueError):
            print(f"Subscription not found: {subscription_id}")
    
    # Get the plan ID from URL parameter or query parameter if not set from subscription
    plan_id = plan_id or request.GET.get('plan_id')
    if not client_id:
        client_id = request.GET.get('client_id')
    
    print(f"Final parameters: plan_id={plan_id}, client_id={client_id}")
    
    if not plan_id:
        print("No plan_id found, redirecting to dashboard")
        return redirect('plan_management:coach_dashboard')
    
    try:
        # Get the plan with security check
        plan = get_object_or_404(ProductPlan, id=int(plan_id))
        
        # Verify coach has access to this plan
        if plan.coach != coach_profile:
            print(f"Access denied: plan {plan_id} doesn't belong to coach {coach_profile.id}")
            return HttpResponseForbidden("You don't have permission to customize this plan")
    except (ProductPlan.DoesNotExist, ValueError) as e:
        print(f"Error finding plan: {e}")
        return HttpResponse(f"Plan not found: {e}", status=404)
    
    # Get client information if client_id is provided
    client_data = None
    if client_id:
        try:
            client_user = User.objects.get(id=client_id)
            # Verify coach has access to this client through subscriptions
            has_access = PlanSubscription.objects.filter(
                client=client_user,
                product_plan__coach=coach_profile
            ).exists()
            
            if has_access:
                client_data = {
                    'id': client_user.id,
                    'name': client_user.get_full_name() or client_user.username,
                    'email': client_user.email,
                    'joined_date': client_user.date_joined.strftime('%b %Y'),
                    'avatar_url': get_avatar_url(client_user.client_profile, request) if hasattr(client_user, 'client_profile') else None
                }
        except User.DoesNotExist:
            pass
    
    # Prepare context
    context = {
        'coach_profile': coach_profile,
        'page_title': f'Customize Plan: {plan.name}',
        'plan': plan,
        'client_data': client_data,
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': 'Plan Customization', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_plan_customization.html', context)


@login_required
def coach_workout_templates_view(request):
    """
    Dedicated workout template management view for coaches
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    context = {
        'coach_profile': coach_profile,
        'page_title': 'Workout Templates',
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': 'Workout Templates', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_workout_templates.html', context)


@login_required
def coach_meal_templates_view(request):
    """
    Dedicated meal template management view for coaches
    """
    try:
        coach_profile = request.user.coach_profile
    except CoachProfile.DoesNotExist:
        return render(request, 'errors/403.html', {
            'error_message': 'Access denied. Coach profile required.'
        })
    
    context = {
        'coach_profile': coach_profile,
        'page_title': 'Meal Templates',
        'breadcrumbs': [
            {'name': 'Dashboard', 'url': '/coach/dashboard/'},
            {'name': 'Plan Management', 'url': '/plan-management/'},
            {'name': 'Meal Templates', 'url': None}
        ]
    }
    
    return render(request, 'plan_management/coach_meal_templates.html', context)


@login_required
def coach_client_plan_detail_view(*args, **kwargs):
    """Deprecated: Replaced by coach_client_measurements_view with subscription deep-linking."""
    return redirect('plan_management:coach_client_measurements')


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

    # Cache per coach + filters for a short duration
    key_payload = {
        'coach_id': coach_profile.id,
        'preset': filters.get('preset') or '',
        'start_date': (filters.get('start_date').isoformat() if filters.get('start_date') else ''),
        'end_date': (filters.get('end_date').isoformat() if filters.get('end_date') else ''),
        'plan_type': (request.GET.get('plan_type') or ''),
        'segment': filters.get('segment') or '',
        'q': filters.get('q') or '',
    }
    cache_key = 'coach_plan_analytics:' + hashlib.md5(json.dumps(key_payload, sort_keys=True).encode('utf-8')).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return Response({'success': True, 'analytics': cached})

    # Plan days for this coach with filters applied
    base_qs = PlanDay.objects.all()
    plan_days = _apply_plan_day_filters(base_qs, coach_profile, filters)

    # Calculate completion stats, total days, and average rating in a single aggregate query
    agg = plan_days.aggregate(
        total_days=Count('id'),
        completed=Count('id', filter=Q(completion_status='completed')),
        in_progress=Count('id', filter=Q(completion_status='in_progress')),
        not_started=Count('id', filter=Q(completion_status='not_started')),
        skipped=Count('id', filter=Q(completion_status='skipped')),
        rescheduled=Count('id', filter=Q(completion_status='rescheduled')),
        avg_rating=Avg('client_rating'),
    )
    total_days = agg['total_days'] or 0
    completion_stats = {
        'completed': agg['completed'] or 0,
        'in_progress': agg['in_progress'] or 0,
        'not_started': agg['not_started'] or 0,
        'skipped': agg['skipped'] or 0,
        'rescheduled': agg['rescheduled'] or 0,
    }
    completion_rates = {
        status: round((cnt / total_days * 100) if total_days > 0 else 0, 1)
        for status, cnt in completion_stats.items()
    }
    avg_rating = agg['avg_rating'] or 0

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
    # Cache analytics briefly (e.g., 60 seconds)
    cache.set(cache_key, analytics, 60)
    return Response({'success': True, 'analytics': analytics})

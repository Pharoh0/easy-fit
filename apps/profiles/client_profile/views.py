from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import (
    ClientProfile, ClientMeasurement, ClientDietRequest,
    CoachOffer, ClientSubscription, ProgressReport
)
from .serializers import (
    ClientProfileSerializer, ClientMeasurementSerializer,
    ClientDietRequestSerializer, CoachOfferSerializer
)

@login_required
def view_client_profile(request, pk=None):
    """View a client profile. If pk is not provided, show the current user's profile."""
    # If no pk is provided, show the current user's profile
    if pk is None and hasattr(request.user, 'client_profile'):
        client_profile = request.user.client_profile
        is_own_profile = True
    else:
        # Otherwise, look up the specified profile
        client_profile = get_object_or_404(ClientProfile, pk=pk)
        is_own_profile = request.user.is_authenticated and hasattr(request.user, 'client_profile') and request.user.client_profile == client_profile

    # Get latest measurement and calculate changes
    try:
        latest_measurement = ClientMeasurement.objects.filter(client=client_profile).latest()
        
        # Get measurement from 30 days ago to calculate changes
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        old_measurement = ClientMeasurement.objects.filter(
            client=client_profile,
            date__lte=thirty_days_ago
        ).order_by('-date').first()
        
        weight_change = None
        fat_change = None
        waist_change = None
        
        if old_measurement and latest_measurement:
            if latest_measurement.weight and old_measurement.weight:
                weight_change = latest_measurement.weight - old_measurement.weight
            
            if latest_measurement.body_fat_percentage and old_measurement.body_fat_percentage:
                fat_change = latest_measurement.body_fat_percentage - old_measurement.body_fat_percentage
            
            if latest_measurement.waist and old_measurement.waist:
                waist_change = latest_measurement.waist - old_measurement.waist
    except ClientMeasurement.DoesNotExist:
        latest_measurement = None
        weight_change = None
        fat_change = None
        waist_change = None

    # Get active subscriptions
    active_subscriptions = ClientSubscription.objects.filter(
        client=client_profile,
        status='active'
    ).order_by('-start_date')

    # Get diet requests
    diet_requests = ClientDietRequest.objects.filter(
        client=client_profile
    ).order_by('-created_at')[:5]  # Show only the 5 most recent requests

    # Get progress photos
    progress_photos = ProgressReport.objects.filter(
        subscription__client=client_profile,
        progress_photo__isnull=False
    ).order_by('-report_date')[:6]  # Show only the 6 most recent photos

    context = {
        'client_profile': client_profile,
        'is_own_profile': is_own_profile,
        'latest_measurement': latest_measurement,
        'weight_change': weight_change,
        'fat_change': fat_change,
        'waist_change': waist_change,
        'active_subscriptions': active_subscriptions,
        'diet_requests': diet_requests,
        'progress_photos': progress_photos,
    }

    return render(request, 'profiles/client/client_profile_view.html', context)

@login_required
def edit_client_profile(request):
    """Edit the current user's client profile."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    profile = request.user.client_profile

    if request.method == 'POST':
        serializer = ClientProfileSerializer(profile, data=request.POST, files=request.FILES, partial=True)
        if serializer.is_valid():
            serializer.save()
            messages.success(request, 'Your profile has been updated successfully.')
            return redirect('profiles:client_profile')
        else:
            messages.error(request, 'Please correct the errors below.')
            context = {
                'profile': profile,
                'errors': serializer.errors,
                'form_data': request.POST,
            }
    else:
        context = {
            'profile': profile,
        }

    return render(request, 'profiles/client/client_profile_edit.html', context)

@login_required
def client_measurements(request):
    """View all measurements for the current client."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    measurements = ClientMeasurement.objects.filter(client=client_profile).order_by('-date')

    context = {
        'client_profile': client_profile,
        'measurements': measurements,
    }

    return render(request, 'profiles/client/measurements/measurement_list.html', context)

@login_required
def add_measurement(request):
    """Add a new measurement for the current client."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile

    if request.method == 'POST':
        data = {**request.POST.dict(), **request.FILES.dict(), 'client': client_profile.id}
        serializer = ClientMeasurementSerializer(data=data)
        if serializer.is_valid():
            measurement = serializer.save()
            # Update client profile's BMI if weight and height are provided
            if measurement.weight and client_profile.height:
                client_profile.weight = measurement.weight
                client_profile.calculate_bmi()
            
            messages.success(request, 'Your measurements have been saved successfully.')
            return redirect('profiles:client_measurements')
        else:
            messages.error(request, 'Please correct the errors below.')
            context = {
                'client_profile': client_profile,
                'errors': serializer.errors,
                'form_data': request.POST,
            }
    else:
        context = {
            'client_profile': client_profile,
        }

    return render(request, 'profiles/client/measurements/add_measurement.html', context)

@login_required
def view_measurement(request, pk):
    """View a specific measurement."""
    measurement = get_object_or_404(ClientMeasurement, pk=pk)
    
    # Security check - only allow viewing measurements that belong to the current user or staff
    if not (hasattr(request.user, 'client_profile') and measurement.client == request.user.client_profile) and not request.user.is_staff:
        messages.error(request, "You don't have permission to view this measurement.")
        return redirect('profiles:client_measurements')

    context = {
        'measurement': measurement,
    }

    return render(request, 'profiles/client/measurements/measurement_detail.html', context)

@login_required
def compare_measurements(request):
    """Compare measurements from different dates."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    measurements = ClientMeasurement.objects.filter(client=client_profile).order_by('-date')
    
    start_id = request.GET.get('start')
    end_id = request.GET.get('end')
    
    start_measurement = None
    end_measurement = None
    comparison = None
    
    if start_id and end_id:
        try:
            start_measurement = measurements.get(pk=start_id)
            end_measurement = measurements.get(pk=end_id)
            
            comparison = {
                'weight': end_measurement.weight - start_measurement.weight if (end_measurement.weight and start_measurement.weight) else None,
                'body_fat': end_measurement.body_fat_percentage - start_measurement.body_fat_percentage if (end_measurement.body_fat_percentage and start_measurement.body_fat_percentage) else None,
                'chest': end_measurement.chest - start_measurement.chest if (end_measurement.chest and start_measurement.chest) else None,
                'waist': end_measurement.waist - start_measurement.waist if (end_measurement.waist and start_measurement.waist) else None,
                'hips': end_measurement.hips - start_measurement.hips if (end_measurement.hips and start_measurement.hips) else None,
                'arms': end_measurement.arms - start_measurement.arms if (end_measurement.arms and start_measurement.arms) else None,
                'thighs': end_measurement.thighs - start_measurement.thighs if (end_measurement.thighs and start_measurement.thighs) else None,
            }
        except ClientMeasurement.DoesNotExist:
            messages.error(request, "One or both of the selected measurements doesn't exist.")

    context = {
        'client_profile': client_profile,
        'measurements': measurements,
        'start_measurement': start_measurement,
        'end_measurement': end_measurement,
        'comparison': comparison,
    }

    return render(request, 'profiles/client/measurements/compare_measurements.html', context)

@login_required
def diet_requests(request):
    """View all diet requests for the current client."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    requests = ClientDietRequest.objects.filter(client=client_profile).order_by('-created_at')

    context = {
        'client_profile': client_profile,
        'diet_requests': requests,
    }

    return render(request, 'profiles/client/diet_requests/request_list.html', context)

@login_required
def create_diet_request(request):
    """Create a new diet request."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile

    if request.method == 'POST':
        data = {**request.POST.dict(), 'client': client_profile.id}
        serializer = ClientDietRequestSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            messages.success(request, 'Your diet request has been created successfully.')
            return redirect('profiles:diet_requests')
        else:
            messages.error(request, 'Please correct the errors below.')
            context = {
                'client_profile': client_profile,
                'errors': serializer.errors,
                'form_data': request.POST,
            }
    else:
        context = {
            'client_profile': client_profile,
        }

    return render(request, 'profiles/client/diet_requests/create_request.html', context)

@login_required
def diet_request_detail(request, pk):
    """View a specific diet request and its offers."""
    diet_request = get_object_or_404(ClientDietRequest, pk=pk)
    
    # Security check - only allow viewing requests that belong to the current user or coaches (for open requests) or staff
    is_owner = hasattr(request.user, 'client_profile') and diet_request.client == request.user.client_profile
    is_coach = hasattr(request.user, 'coach_profile') and diet_request.status == 'open'
    
    if not (is_owner or is_coach or request.user.is_staff):
        messages.error(request, "You don't have permission to view this request.")
        return redirect('profiles:diet_requests')

    offers = CoachOffer.objects.filter(request=diet_request).order_by('-created_at')

    context = {
        'diet_request': diet_request,
        'offers': offers,
        'is_owner': is_owner,
    }

    return render(request, 'profiles/client/diet_requests/request_detail.html', context)

@login_required
def view_subscriptions(request):
    """View all subscriptions for the current client."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    subscriptions = ClientSubscription.objects.filter(client=client_profile).order_by('-start_date')

    # Group subscriptions by status
    active_subs = subscriptions.filter(status='active')
    completed_subs = subscriptions.filter(status='completed')
    cancelled_subs = subscriptions.filter(status='cancelled')

    context = {
        'client_profile': client_profile,
        'active_subscriptions': active_subs,
        'completed_subscriptions': completed_subs,
        'cancelled_subscriptions': cancelled_subs,
    }

    return render(request, 'profiles/client/subscriptions/subscription_list.html', context)

@login_required
def subscription_detail(request, pk):
    """View details of a specific subscription including progress reports."""
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only allow viewing subscriptions that belong to the current user or the coach or staff
    is_client_owner = hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile
    is_coach_owner = hasattr(request.user, 'coach_profile') and subscription.coach == request.user.coach_profile
    
    if not (is_client_owner or is_coach_owner or request.user.is_staff):
        messages.error(request, "You don't have permission to view this subscription.")
        return redirect('profiles:view_subscriptions')

    # Get progress reports for this subscription
    progress_reports = ProgressReport.objects.filter(subscription=subscription).order_by('-report_date')

    context = {
        'subscription': subscription,
        'progress_reports': progress_reports,
        'is_client_owner': is_client_owner,
        'is_coach_owner': is_coach_owner,
    }

    return render(request, 'profiles/client/subscriptions/subscription_detail.html', context)

@login_required
def add_progress_report(request):
    """Add a new progress report."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    
    # Get active subscriptions
    subscriptions = ClientSubscription.objects.filter(
        client=client_profile,
        status='active'
    ).order_by('-start_date')
    
    if not subscriptions:
        messages.error(request, "You don't have any active subscriptions.")
        return redirect('profiles:view_subscriptions')

    if request.method == 'POST':
        subscription_id = request.POST.get('subscription')
        subscription = get_object_or_404(ClientSubscription, pk=subscription_id, client=client_profile)
        
        # Try to get the latest measurement
        try:
            latest_measurement = ClientMeasurement.objects.filter(client=client_profile).latest()
            
            # Get the previous report to calculate changes
            previous_report = ProgressReport.objects.filter(
                subscription=subscription
            ).order_by('-report_date').first()
            
            weight_change = None
            body_fat_change = None
            
            if previous_report and previous_report.measurement:
                if latest_measurement.weight and previous_report.measurement.weight:
                    weight_change = latest_measurement.weight - previous_report.measurement.weight
                
                if latest_measurement.body_fat_percentage and previous_report.measurement.body_fat_percentage:
                    body_fat_change = latest_measurement.body_fat_percentage - previous_report.measurement.body_fat_percentage
            
            # Create new progress report
            progress_report = ProgressReport(
                subscription=subscription,
                measurement=latest_measurement,
                report_date=timezone.now().date(),
                weight_change=weight_change,
                body_fat_change=body_fat_change,
                client_notes=request.POST.get('client_notes', ''),
            )
            
            # Handle progress photo
            if 'progress_photo' in request.FILES:
                progress_report.progress_photo = request.FILES['progress_photo']
            
            progress_report.save()
            
            messages.success(request, 'Your progress report has been added successfully.')
            return redirect('profiles:subscription_detail', pk=subscription.id)
        
        except ClientMeasurement.DoesNotExist:
            messages.error(request, "You need to record measurements first.")
            return redirect('profiles:add_measurement')
    
    context = {
        'client_profile': client_profile,
        'subscriptions': subscriptions,
    }

    return render(request, 'profiles/client/progress/add_progress_report.html', context)


@login_required
def view_progress_report(request, pk):
    """View a single progress report in detail."""
    report = get_object_or_404(ProgressReport, pk=pk)
    
    # Security check - only allow viewing reports that belong to the current user or the coach or staff
    is_client_owner = hasattr(request.user, 'client_profile') and report.subscription.client == request.user.client_profile
    is_coach_owner = hasattr(request.user, 'coach_profile') and report.subscription.coach == request.user.coach_profile
    
    if not (is_client_owner or is_coach_owner or request.user.is_staff):
        messages.error(request, "You don't have permission to view this report.")
        return redirect('profiles:client_progress')
    
    # Get next and previous reports for navigation
    next_report = ProgressReport.objects.filter(
        subscription=report.subscription, 
        report_date__gt=report.report_date
    ).order_by('report_date').first()
    
    previous_report = ProgressReport.objects.filter(
        subscription=report.subscription, 
        report_date__lt=report.report_date
    ).order_by('-report_date').first()
    
    # Get previous measurement for comparison
    previous_measurement = None
    if report.measurement and previous_report and previous_report.measurement:
        previous_measurement = previous_report.measurement
    
    # Prepare data for charts
    from django.core.serializers.json import DjangoJSONEncoder
    import json
    
    # Get all measurements for this client
    measurements = ClientMeasurement.objects.filter(
        client=report.subscription.client
    ).order_by('date')
    
    progress_data = {
        'dates': [m.date.strftime('%Y-%m-%d') for m in measurements],
        'weights': [float(m.weight) if m.weight else None for m in measurements],
        'bmis': [float(m.bmi) if m.bmi else None for m in measurements],
        'body_fats': [float(m.body_fat_percentage) if m.body_fat_percentage else None for m in measurements]
    }
    
    # Format achievements and goals if they exist
    if report.achievements:
        report.achievements_list = [a.strip() for a in report.achievements.split('\n') if a.strip()]
    else:
        report.achievements_list = []
        
    if report.goals_for_next_week:
        report.goals_list = [g.strip() for g in report.goals_for_next_week.split('\n') if g.strip()]
    else:
        report.goals_list = []
    
    context = {
        'report': report,
        'next_report': next_report,
        'previous_report': previous_report,
        'previous_measurement': previous_measurement,
        'progress_data': json.dumps(progress_data, cls=DjangoJSONEncoder),
        'today': timezone.now().date(),
    }
    
    return render(request, 'profiles/client/progress/progress_report_view.html', context)


@login_required
def add_report_response(request, pk):
    """Add a client response to a progress report."""
    report = get_object_or_404(ProgressReport, pk=pk)
    
    # Security check - only client can add a response to their own report
    if not (hasattr(request.user, 'client_profile') and report.subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to respond to this report.")
        return redirect('profiles:client_progress')
    
    if request.method == 'POST':
        client_comment = request.POST.get('client_comment')
        
        if client_comment:
            report.client_comment = client_comment
            report.client_comment_date = timezone.now()
            report.save()
            
            messages.success(request, "Your response has been saved.")
            return redirect('profiles:view_progress_report', pk=report.id)
        else:
            messages.error(request, "Please enter a comment.")
    
    return redirect('profiles:view_progress_report', pk=report.id)


@login_required
def edit_report_response(request, pk):
    """Edit a client's existing response to a progress report."""
    report = get_object_or_404(ProgressReport, pk=pk)
    
    # Security check - only client can edit their response
    if not (hasattr(request.user, 'client_profile') and report.subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to edit this response.")
        return redirect('profiles:client_progress')
    
    if request.method == 'POST':
        client_comment = request.POST.get('client_comment')
        
        if client_comment:
            report.client_comment = client_comment
            report.client_comment_date = timezone.now()  # Update timestamp
            report.save()
            
            messages.success(request, "Your response has been updated.")
            return redirect('profiles:view_progress_report', pk=report.id)
        else:
            messages.error(request, "Please enter a comment.")
    
    return redirect('profiles:view_progress_report', pk=report.id)


@login_required
def list_progress_reports(request, subscription_id):
    """List all progress reports for a specific subscription."""
    subscription = get_object_or_404(ClientSubscription, pk=subscription_id)
    
    # Security check
    is_client_owner = hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile
    is_coach_owner = hasattr(request.user, 'coach_profile') and subscription.coach == request.user.coach_profile
    
    if not (is_client_owner or is_coach_owner or request.user.is_staff):
        messages.error(request, "You don't have permission to view these reports.")
        return redirect('profiles:view_subscriptions')
    
    progress_reports = ProgressReport.objects.filter(subscription=subscription).order_by('-report_date')
    
    context = {
        'subscription': subscription,
        'progress_reports': progress_reports,
        'is_client_owner': is_client_owner,
        'is_coach_owner': is_coach_owner,
    }
    
    return render(request, 'profiles/client/progress/progress_reports_list.html', context)


@login_required
def accept_offer(request, pk):
    """Accept a coach offer for a diet request."""
    offer = get_object_or_404(CoachOffer, pk=pk)
    
    # Security check - only client can accept an offer for their own request
    if not (hasattr(request.user, 'client_profile') and offer.request.client == request.user.client_profile):
        messages.error(request, "You don't have permission to accept this offer.")
        return redirect('profiles:diet_requests')
    
    # Check if the request is still open
    if offer.request.status != 'open':
        messages.error(request, "This request is no longer open for offers.")
        return redirect('profiles:diet_request_detail', pk=offer.request.id)
    
    # Check if the offer is still pending
    if offer.status != 'pending':
        messages.error(request, "This offer has already been processed.")
        return redirect('profiles:diet_request_detail', pk=offer.request.id)
    
    if request.method == 'POST':
        try:
            # Create a new subscription
            from django.utils import timezone
            
            start_date = timezone.now().date()
            end_date = start_date + timezone.timedelta(days=offer.duration_weeks*7)
            
            subscription = ClientSubscription.objects.create(
                client=offer.request.client,
                coach=offer.coach,
                offer=offer,
                name=f"{offer.title}",
                description=offer.description,
                start_date=start_date,
                end_date=end_date,
                price=offer.price,
                duration_weeks=offer.duration_weeks,
                status='active',
                includes_meal_plan=offer.includes_meal_plan,
                includes_workout_plan=offer.includes_workout_plan,
                includes_video_consultations=offer.includes_video_consultations,
                num_consultations=offer.num_consultations,
                consultations_used=0
            )
            
            # Update the offer status
            offer.status = 'accepted'
            offer.save()
            
            # Update the request status
            offer.request.status = 'in_progress'
            offer.request.save()
            
            # Reject all other offers for this request
            CoachOffer.objects.filter(request=offer.request).exclude(pk=offer.pk).update(status='rejected')
            
            messages.success(request, "Offer accepted successfully! Your subscription has started.")
            return redirect('profiles:subscription_detail', pk=subscription.id)
            
        except Exception as e:
            messages.error(request, f"An error occurred: {str(e)}")
    
    return redirect('profiles:diet_request_detail', pk=offer.request.id)


@login_required
def reject_offer(request, pk):
    """Reject a coach offer for a diet request."""
    offer = get_object_or_404(CoachOffer, pk=pk)
    
    # Security check - only client can reject an offer for their own request
    if not (hasattr(request.user, 'client_profile') and offer.request.client == request.user.client_profile):
        messages.error(request, "You don't have permission to reject this offer.")
        return redirect('profiles:diet_requests')
    
    # Check if the request is still open
    if offer.request.status != 'open':
        messages.error(request, "This request is no longer open for offers.")
        return redirect('profiles:diet_request_detail', pk=offer.request.id)
    
    # Check if the offer is still pending
    if offer.status != 'pending':
        messages.error(request, "This offer has already been processed.")
        return redirect('profiles:diet_request_detail', pk=offer.request.id)
    
    if request.method == 'POST':
        offer.status = 'rejected'
        offer.save()
        
        messages.success(request, "Offer rejected successfully.")
    
    return redirect('profiles:diet_request_detail', pk=offer.request.id)


@login_required
def cancel_diet_request(request, pk):
    """Cancel an open diet request."""
    diet_request = get_object_or_404(ClientDietRequest, pk=pk)
    
    # Security check - only client can cancel their own request
    if not (hasattr(request.user, 'client_profile') and diet_request.client == request.user.client_profile):
        messages.error(request, "You don't have permission to cancel this request.")
        return redirect('profiles:diet_requests')
    
    # Check if the request is still open
    if diet_request.status != 'open':
        messages.error(request, "This request cannot be cancelled because it's no longer open.")
        return redirect('profiles:diet_request_detail', pk=diet_request.id)
    
    if request.method == 'POST':
        diet_request.status = 'cancelled'
        diet_request.save()
        
        # Reject all pending offers
        CoachOffer.objects.filter(request=diet_request, status='pending').update(status='rejected')
        
        messages.success(request, "Diet request cancelled successfully.")
    
    return redirect('profiles:diet_requests')


@login_required
def pause_subscription(request, pk):
    """Pause an active subscription."""
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only client can pause their own subscription
    if not (hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to pause this subscription.")
        return redirect('profiles:subscriptions')
    
    # Check if the subscription is active
    if subscription.status != 'active':
        messages.error(request, "Only active subscriptions can be paused.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    if request.method == 'POST':
        pause_reason = request.POST.get('pause_reason', '')
        
        subscription.status = 'paused'
        subscription.pause_reason = pause_reason
        subscription.pause_date = timezone.now().date()
        subscription.save()
        
        messages.success(request, "Subscription paused successfully.")
    
    return redirect('profiles:subscription_detail', pk=subscription.id)


@login_required
def resume_subscription(request, pk):
    """Resume a paused subscription."""
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only client can resume their own subscription
    if not (hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to resume this subscription.")
        return redirect('profiles:subscriptions')
    
    # Check if the subscription is paused
    if subscription.status != 'paused':
        messages.error(request, "Only paused subscriptions can be resumed.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    if request.method == 'POST':
        # Calculate new end date (extending by the paused duration)
        if subscription.pause_date:
            pause_duration = (timezone.now().date() - subscription.pause_date).days
            subscription.end_date = subscription.end_date + timezone.timedelta(days=pause_duration)
        
        subscription.status = 'active'
        subscription.pause_reason = ''
        subscription.pause_date = None
        subscription.save()
        
        messages.success(request, "Subscription resumed successfully.")
    
    return redirect('profiles:subscription_detail', pk=subscription.id)


@login_required
def cancel_subscription(request, pk):
    """Cancel an active or paused subscription."""
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only client can cancel their own subscription
    if not (hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to cancel this subscription.")
        return redirect('profiles:subscriptions')
    
    # Check if the subscription is active or paused
    if subscription.status not in ['active', 'paused']:
        messages.error(request, "This subscription cannot be cancelled.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    if request.method == 'POST':
        cancel_reason = request.POST.get('cancel_reason', '')
        
        subscription.status = 'cancelled'
        subscription.cancellation_reason = cancel_reason
        subscription.cancellation_date = timezone.now().date()
        subscription.save()
        
        messages.success(request, "Subscription cancelled successfully.")
    
    return redirect('profiles:subscriptions')


@login_required
def schedule_consultation(request, pk):
    """Schedule a video consultation for an active subscription."""
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only client can schedule consultations for their own subscription
    if not (hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile):
        messages.error(request, "You don't have permission to schedule consultations for this subscription.")
        return redirect('profiles:subscriptions')
    
    # Check if the subscription is active
    if subscription.status != 'active':
        messages.error(request, "You can only schedule consultations for active subscriptions.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    # Check if consultations are included and available
    if not subscription.includes_video_consultations:
        messages.error(request, "This subscription does not include video consultations.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    if subscription.consultations_used >= subscription.num_consultations:
        messages.error(request, "You have used all your consultations for this subscription.")
        return redirect('profiles:subscription_detail', pk=subscription.id)
    
    if request.method == 'POST':
        try:
            consultation_date_str = request.POST.get('consultation_date')
            consultation_time_str = request.POST.get('consultation_time')
            consultation_notes = request.POST.get('consultation_notes', '')
            
            if not consultation_date_str or not consultation_time_str:
                messages.error(request, "Please provide both date and time for the consultation.")
                return redirect('profiles:subscription_detail', pk=subscription.id)
            
            from datetime import datetime
            consultation_datetime = datetime.strptime(f"{consultation_date_str} {consultation_time_str}", "%Y-%m-%d %H:%M")
            consultation_datetime = timezone.make_aware(consultation_datetime)
            
            # Check if consultation date is in the future
            if consultation_datetime <= timezone.now():
                messages.error(request, "Consultation date and time must be in the future.")
                return redirect('profiles:subscription_detail', pk=subscription.id)
            
            # Create consultation request (you'll need to implement this model and feature)
            # For now, increment used consultations
            subscription.consultations_used += 1
            subscription.save()
            
            messages.success(request, "Consultation request sent to your coach successfully.")
            
        except Exception as e:
            messages.error(request, f"An error occurred: {str(e)}")
    
    return redirect('profiles:subscription_detail', pk=subscription.id)

@login_required
def client_progress(request):
    """View overall progress for the client."""
    if not hasattr(request.user, 'client_profile'):
        messages.error(request, "You don't have a client profile.")
        return redirect('profiles:view_profile')

    client_profile = request.user.client_profile
    
    # Get all measurements ordered by date
    measurements = ClientMeasurement.objects.filter(client=client_profile).order_by('date')
    
    # Get all progress reports
    progress_reports = ProgressReport.objects.filter(
        subscription__client=client_profile
    ).order_by('report_date')
    
    # Prepare data for charts
    dates = [m.date.strftime('%Y-%m-%d') for m in measurements]
    weights = [float(m.weight) if m.weight else None for m in measurements]
    body_fat = [float(m.body_fat_percentage) if m.body_fat_percentage else None for m in measurements]
    waist = [float(m.waist) if m.waist else None for m in measurements]
    
    context = {
        'client_profile': client_profile,
        'measurements': measurements,
        'progress_reports': progress_reports,
        'chart_dates': dates,
        'chart_weights': weights,
        'chart_body_fat': body_fat,
        'chart_waist': waist,
    }

    return render(request, 'profiles/client/progress/progress_dashboard.html', context)

"""
API-driven views for client profiles.
These views simply render shell templates which are populated with data via JavaScript and API calls.
"""

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from .models import (
    ClientProfile,
    ClientMeasurement, 
    ClientDietRequest, 
    ClientSubscription, 
    ProgressReport,
    BodyPart,
    BodyPartMeasurement
)
from django.contrib import messages


@login_required
def view_client_profile(request):
    """
    Display the client profile page.
    Data will be loaded via API calls from JavaScript.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/client_profile_view_api.html', {
        'client_id': client.id
    })


@login_required
def edit_client_profile(request):
    """
    Display the edit client profile page.
    Profile data will be loaded and updated via API calls from JavaScript.
    All form submissions should go through the API, not this view.
    """
    # Only allow GET requests - all updates go through API
    if request.method != 'GET':
        messages.error(request, 'Profile updates must be done through the API.')
        return redirect('profiles:client_profile')
    
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/client_profile_edit.html', {
        'client': client
    })


@login_required
def client_measurements(request):
    """
    Display client measurements page.
    Data will be loaded via API calls from JavaScript.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/measurements/client_measurements_api.html', {
        'client': client
    })


@login_required
def body_measurements_full(request):
    """
    Display the enhanced body measurements full page view.
    This page provides detailed visualization, charts, and CRUD operations
    for the client's body measurements.
    Data will be loaded via API calls from JavaScript.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/body_measurements.html', {
        'client': client
    })


@login_required
def list_subscriptions(request):
    """
    Display a list of client's subscriptions.
    Data will be loaded via API calls from JavaScript.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/subscription/subscriptions_list_api.html')


@login_required
def subscription_detail(request, pk):
    """
    Display details of a subscription.
    Data will be loaded via API calls from JavaScript.
    """
    subscription = get_object_or_404(ClientSubscription, pk=pk)
    
    # Security check - only allow the client to view their own subscriptions
    if subscription.client.user != request.user:
        return HttpResponseForbidden("You don't have permission to view this subscription.")
    
    return render(request, 'profiles/client/subscription/subscription_detail_api.html', {
        'subscription': subscription
    })


@login_required
def list_diet_requests(request):
    """
    Display a list of client's diet requests.
    Data will be loaded via API calls from JavaScript.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/diet_request/diet_requests_list_api.html')


@login_required
def diet_request_detail(request, pk):
    """
    Display details of a diet request.
    Data will be loaded via API calls from JavaScript.
    """
    diet_request = get_object_or_404(ClientDietRequest, pk=pk)
    
    # Security check - only allow the client to view their own diet requests
    if diet_request.client.user != request.user:
        return HttpResponseForbidden("You don't have permission to view this diet request.")
    
    return render(request, 'profiles/client/diet_request/diet_request_detail_api.html', {
        'request': diet_request
    })


@login_required
def create_diet_request(request):
    """
    Display form to create a new diet request.
    Form submission will be handled via JavaScript and API calls.
    """
    try:
        client = ClientProfile.objects.get(user=request.user)
    except ClientProfile.DoesNotExist:
        return redirect('profiles:create_client_profile')
    
    return render(request, 'profiles/client/diet_request/create_diet_request_api.html')


@login_required
def list_progress_reports(request, subscription_id):
    """
    Display a list of progress reports for a subscription.
    Data will be loaded via API calls from JavaScript.
    """
    subscription = get_object_or_404(ClientSubscription, pk=subscription_id)
    
    # Security check - only allow the client to view their own progress reports
    if subscription.client.user != request.user:
        return HttpResponseForbidden("You don't have permission to view these progress reports.")
    
    return render(request, 'profiles/client/progress/progress_reports_list_api.html', {
        'subscription': subscription
    })


@login_required
def view_progress_report(request, pk):
    """
    Display a progress report.
    Data will be loaded via API calls from JavaScript.
    """
    report = get_object_or_404(ProgressReport, pk=pk)
    
    # Security check - only allow the client to view their own progress reports
    if report.subscription.client.user != request.user:
        return HttpResponseForbidden("You don't have permission to view this progress report.")
    
    # Prepare data for charts - this will be available for initial page load
    # Additional data can be loaded via API calls from JavaScript
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
    
    return render(request, 'profiles/client/progress/progress_report_view_api.html', {
        'report': report,
        'progress_data': json.dumps(progress_data, cls=DjangoJSONEncoder)
    })

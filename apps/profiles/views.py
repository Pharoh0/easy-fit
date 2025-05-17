from django.shortcuts import redirect, render
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .client_profile.models import ClientProfile
from .client_profile.serializers import ClientProfileSerializer
from django.urls import reverse
from django.contrib import messages


@login_required
def view_profile(request):
    client_profile = get_object_or_404(ClientProfile, user=request.user)
    
    # Get latest measurement
    latest_measurement = client_profile.measurements.order_by('-date_created').first()
    
    # Get previous measurement for comparison
    previous_measurement = client_profile.measurements.order_by('-date_created')[1:2].first()
    
    # Calculate changes if previous measurement exists
    weight_change = None
    fat_change = None
    waist_change = None
    
    if previous_measurement and latest_measurement:
        weight_change = latest_measurement.weight - previous_measurement.weight if latest_measurement.weight and previous_measurement.weight else None
        fat_change = latest_measurement.body_fat_percentage - previous_measurement.body_fat_percentage if latest_measurement.body_fat_percentage and previous_measurement.body_fat_percentage else None
        waist_change = latest_measurement.waist - previous_measurement.waist if latest_measurement.waist and previous_measurement.waist else None
    
    # Get active subscriptions
    active_subscriptions = client_profile.subscriptions.filter(status='active').order_by('-start_date')
    
    # Get diet requests
    diet_requests = client_profile.diet_requests.order_by('-date_created')[:5]
    
    return render(request, 'profiles/client/client_profile_view.html', {
        'client_profile': client_profile,
        'is_own_profile': True,
        'latest_measurement': latest_measurement,
        'weight_change': weight_change,
        'fat_change': fat_change,
        'waist_change': waist_change,
        'active_subscriptions': active_subscriptions,
        'diet_requests': diet_requests,
    })


@login_required
# def edit_profile(request):
#     profile = get_object_or_404(ClientProfile, user=request.user)
#
#     if request.method == 'POST':
#         # Use both POST data and FILES for the serializer
#         serializer = ClientProfileSerializer(profile, data=request.POST, files=request.FILES, partial=True)
#
#         if serializer.is_valid():
#             serializer.save()
#             return redirect('profiles:view_profile')
#     else:
#         serializer = ClientProfileSerializer(profile)
#
#     return render(request, 'profile_edit.html', {
#         'profile': serializer.data,
#         'profile_instance': profile,
#         'api_url': reverse('profiles:client-profile-detail', kwargs={'pk': profile.pk}),
#     })

def edit_profile(request):
    profile = get_object_or_404(ClientProfile, user=request.user)

    if request.method == 'POST':
        # serializer = ClientProfileSerializer(profile, data=request.POST, files=request.FILES, partial=True)
        serializer = ClientProfileSerializer(profile, data={**request.POST.dict(), **request.FILES.dict()}, partial=True)

        if serializer.is_valid():
            serializer.save()
            messages.success(request, 'Your profile has been updated successfully.')
            return redirect('profiles:view_profile')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        serializer = ClientProfileSerializer(profile)

    return render(request, 'profile_edit.html', {
        'profile': serializer.data,
        'profile_instance': profile,
        'api_url': reverse('profiles:client-profile-detail', kwargs={'pk': profile.pk}),
    })

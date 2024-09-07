from django.shortcuts import redirect, render
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .client_profile.models import ClientProfile
from .client_profile.serializers import ClientProfileSerializer
from django.urls import reverse
from django.contrib import messages


@login_required
def view_profile(request):
    profile = get_object_or_404(ClientProfile, user=request.user)
    return render(request, 'profile_view.html', {
        'profile': profile,  # Pass the profile instance directly
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

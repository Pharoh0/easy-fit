from django.shortcuts import render
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .client_profile.models import ClientProfile
from .client_profile.serializers import ClientProfileSerializer

@login_required
def edit_profile(request):
    profile = get_object_or_404(ClientProfile, user=request.user)
    serializer = ClientProfileSerializer(profile)
    return render(request, 'profile_edit.html', {'profile': serializer.data})

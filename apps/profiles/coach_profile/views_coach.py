from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from .models import CoachProfile
from ..forms import CoachProfileForm
from django.contrib import messages

@login_required
def view_coach_profile(request):
    coach_profile = get_object_or_404(CoachProfile, user=request.user)
    return render(request, 'profiles/coach/coach_profile_view.html', {'profile': coach_profile})

# @login_required
# def edit_coach_profile(request):
#     coach_profile = get_object_or_404(CoachProfile, user=request.user)

#     if request.method == 'POST':
#         form = CoachProfileForm(request.POST, request.FILES, instance=coach_profile)
#         if form.is_valid():
#             form.save()
#             messages.success(request, 'Profile updated successfully!')
#             return redirect('profiles:view_coach_profile')
#         else:
#             messages.error(request, 'Please correct the errors below.')
#     else:
#         form = CoachProfileForm(instance=coach_profile)

#     return render(request, 'profiles/coach/coach_profile_edit.html', {'form': form, 'profile': coach_profile})


from django.http import JsonResponse
@login_required
def edit_coach_profile(request):
    # coach_profile = get_object_or_404(CoachProfile, user=request.user)
    coach_profile = CoachProfile.objects.select_related('user', 'country', 'region', 'city').prefetch_related('certifications', 'client_pictures', 'coach_pictures', 'availabilities').get(user=request.user)
    

    if request.method == 'POST':
        # Preserve the existing avatar if not in the request
        form = CoachProfileForm(request.POST, request.FILES, instance=coach_profile)
        
        if form.is_valid():
            if 'avatar' not in request.FILES:
                form.instance.avatar = coach_profile.avatar  # Preserve the existing avatar
            form.save()

            if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
                return JsonResponse({'success': True})
            else:
                messages.success(request, 'Your profile has been updated successfully.')
                return redirect('profiles:view_coach_profile')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
                return JsonResponse({'success': False, 'errors': form.errors}, status=400)
            else:
                messages.error(request, 'Please correct the errors below.')
    else:
        form = CoachProfileForm(instance=coach_profile)

    return render(request, 'profiles/coach/coach_profile_edit.html', {
        'form': form,
        'profile': coach_profile,
        'api_url': reverse('profiles:coach-profile-detail', kwargs={'pk': coach_profile.pk}),
    })

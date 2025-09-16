from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.urls import reverse
from .models import CoachProfile
from ..forms import CoachProfileForm
from django.contrib import messages
from cities_light.models import Country, Region, City
from apps.plan_management.ratings.models import PlanRating
from apps.plan_management.coach.models import ProductPlan
from django.http import Http404
from django.core.exceptions import ValidationError
from django.db import IntegrityError

@login_required
def coach_profile_current(request):
    """View for current logged-in coach's profile"""
    try:
        coach_profile = request.user.coach_profile
        return view_coach_profile(request, coach_profile.pk)
    except CoachProfile.DoesNotExist:
        raise Http404("Coach profile not found")

# @login_required
# def view_coach_profile(request):
#     coach_profile = get_object_or_404(CoachProfile, user=request.user)
#     return render(request, 'profiles/coach/coach_profile_view.html', {'profile': coach_profile})

def view_coach_profile(request, pk):
    coach_profile = get_object_or_404(CoachProfile, pk=pk)
    
    # Get testimonials from plan ratings
    testimonials = PlanRating.objects.filter(
        coach=coach_profile,
        is_public=True
    ).select_related('client').order_by('-created_at')[:6]  # Get 6 most recent public testimonials
    # Safely attach client avatar URL and initial to avoid template errors when client_profile is missing
    testimonials = list(testimonials)
    for t in testimonials:
        avatar_url = ''
        try:
            cp = t.client.client_profile  # May raise if not exists
            if getattr(cp, 'avatar', None):
                try:
                    avatar_url = cp.avatar.url
                except Exception:
                    avatar_url = ''
        except Exception:
            avatar_url = ''
        # Compute client initial
        name_source = (t.client.first_name or t.client.username or '')
        initial = name_source[:1].upper() if name_source else ''
        # Attach for template use
        setattr(t, 'client_avatar_url', avatar_url)
        setattr(t, 'client_initial', initial)
    
    # Get coach's active plans
    plans = ProductPlan.objects.filter(
        coach=coach_profile,
        is_active=True
    ).order_by('-created_at')[:6]  # Get 6 most recent active plans
    
    # Count active client subscriptions for this coach
    from apps.plan_management.client.models import PlanSubscription
    active_clients_count = PlanSubscription.objects.filter(
        product_plan__coach=coach_profile,
        status='active',
        is_active=True
    ).values('client').distinct().count()
    
    # Prepare specialties list safely for template (CSV to list)
    specialties_list = []
    if coach_profile.specialties:
        try:
            specialties_list = [s.strip() for s in coach_profile.specialties.split(',') if s.strip()]
        except Exception:
            specialties_list = []
    
    return render(request, 'profiles/coach/coach_profile_view.html', {
        'profile': coach_profile,
        'testimonials': testimonials,
        'coach_plans': plans,
        'active_clients_count': active_clients_count,
        'specialties_list': specialties_list,
    })

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
# def edit_coach_profile(request):
#     # coach_profile = get_object_or_404(CoachProfile, user=request.user)
#     coach_profile = CoachProfile.objects.select_related('user', 'country', 'region', 'city').prefetch_related('certifications', 'client_pictures', 'coach_pictures', 'availabilities').get(user=request.user)
#
#
#     if request.method == 'POST':
#         # Preserve the existing avatar if not in the request
#         form = CoachProfileForm(request.POST, request.FILES, instance=coach_profile)
#
#         if form.is_valid():
#             if 'avatar' not in request.FILES:
#                 form.instance.avatar = coach_profile.avatar  # Preserve the existing avatar
#             form.save()
#
#             if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
#                 return JsonResponse({'success': True})
#             else:
#                 messages.success(request, 'Your profile has been updated successfully.')
#                 return redirect('profiles:view_coach_profile')
#         else:
#             if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
#                 return JsonResponse({'success': False, 'errors': form.errors}, status=400)
#             else:
#                 messages.error(request, 'Please correct the errors below.')
#     else:
#         form = CoachProfileForm(instance=coach_profile)
#
#     return render(request, 'profiles/coach/coach_profile_edit.html', {
#         'form': form,
#         'profile': coach_profile,
#         'api_url': reverse('profiles:coach-profile-detail', kwargs={'pk': coach_profile.pk}),
#     })

def edit_coach_profile(request):
    coach_profile = CoachProfile.objects.select_related('user', 'country', 'region', 'city').prefetch_related(
        'certifications', 'client_pictures', 'coach_pictures').get(user=request.user)

    if request.method == 'POST':
        form = CoachProfileForm(request.POST, request.FILES, instance=coach_profile)

        if form.is_valid():
            if 'avatar' not in request.FILES:
                form.instance.avatar = coach_profile.avatar  # Preserve the existing avatar
            try:
                form.save()
            except (ValidationError, IntegrityError) as e:
                # Attach a generic error if not already set
                if not form.errors.get('email') and isinstance(e, IntegrityError):
                    form.add_error('email', 'This email is already in use.')
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'errors': form.errors}, status=400)
                else:
                    messages.error(request, 'Please correct the errors below.')
            else:
                if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
                    return JsonResponse({'success': True})
                else:
                    messages.success(request, 'Your profile has been updated successfully.')
                    return redirect('profiles:view_coach_profile', pk=coach_profile.pk)
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':  # Check for AJAX request
                return JsonResponse({'success': False, 'errors': form.errors}, status=400)
            else:
                messages.error(request, 'Please correct the errors below.')
    else:
        form = CoachProfileForm(instance=coach_profile)

    # Get all countries
    countries = Country.objects.all()

    # Get regions based on selected country
    regions = Region.objects.filter(country=coach_profile.country) if coach_profile.country else Region.objects.none()

    # Get cities based on selected region
    cities = City.objects.filter(region=coach_profile.region) if coach_profile.region else City.objects.none()

    return render(request, 'profiles/coach/coach_profile_edit.html', {
        'form': form,
        'profile': coach_profile,
        'countries': countries,
        'regions': regions,
        'cities': cities,
        'api_url': reverse('profiles:coach-profile-detail', kwargs={'pk': coach_profile.pk}),
    })
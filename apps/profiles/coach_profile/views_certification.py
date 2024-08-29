from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required
def view_certifications(request):
    return render(request, 'profiles/coach/coach_certifications/certification_list.html', {
        'coach_profile': request.user.coach_profile,
    })

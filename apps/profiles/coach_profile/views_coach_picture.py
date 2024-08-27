from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import CoachPicture
from .models import CoachProfile

@login_required
def view_pictures(request):
    return render(request, 'profiles/coach/coach_images/picture_list.html', {
        'coach_profile': request.user.coach_profile,
    })
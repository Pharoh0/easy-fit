from django.contrib.auth.decorators import login_required
from django.shortcuts import render

@login_required
def view_client_pictures(request):
    return render(request, 'profiles/coach/client_images/picture_list.html', {
        'coach_profile': request.user.coach_profile,
    })

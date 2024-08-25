from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from .models import Availability
from .forms import AvailabilityForm
from django.http import JsonResponse

def add_availability(request):
    if request.method == 'POST':
        form = AvailabilityForm(request.POST)
        if form.is_valid():
            availability = form.save(commit=False)
            availability.coach_profile = request.user.coach_profile
            availability.save()
            messages.success(request, 'Availability added successfully!')
            return redirect('availability-list')  # Update this to your availability list view
    else:
        form = AvailabilityForm()

    return render(request, 'profiles/coach/availability_add.html', {'form': form})

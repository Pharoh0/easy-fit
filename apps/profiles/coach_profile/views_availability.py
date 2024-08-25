# from django.shortcuts import render, get_object_or_404, redirect
# from django.contrib import messages
# from .models import Availability
# from .forms import AvailabilityForm
# from django.http import JsonResponse

# def add_availability(request):
#     if request.method == 'POST':
#         form = AvailabilityForm(request.POST)
#         if form.is_valid():
#             availability = form.save(commit=False)
#             availability.coach_profile = request.user.coach_profile
#             availability.save()
#             messages.success(request, 'Availability added successfully!')
#             return redirect('availability-list')  # Update this to your availability list view
#     else:
#         form = AvailabilityForm()

#     return render(request, 'profiles/coach/availability_add.html', {'form': form})



# def edit_availability(request, pk):
#     availability = get_object_or_404(Availability, pk=pk, coach_profile=request.user.coach_profile)

#     if request.method == 'POST':
#         form = AvailabilityForm(request.POST, instance=availability)
#         if form.is_valid():
#             form.save()
#             messages.success(request, 'Availability updated successfully!')
#             return redirect('availability-list')
#     else:
#         form = AvailabilityForm(instance=availability)

#     return render(request, 'profiles/coach/availability_edit.html', {'form': form, 'availability': availability})


# def delete_availability(request, pk):
#     availability = get_object_or_404(Availability, pk=pk, coach_profile=request.user.coach_profile)
#     availability.delete()
#     messages.success(request, 'Availability deleted successfully!')
#     return redirect('availability-list')


from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from ..choices import DAYS_OF_WEEK
from .models import Availability
from .serializers import AvailabilitySerializer

def view_availabilities(request):
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        availabilities = Availability.objects.filter(coach_profile=request.user.coach_profile)
        serializer = AvailabilitySerializer(availabilities, many=True)
        return JsonResponse(serializer.data, safe=False)
    
    return render(request, 'profiles/coach/availability/availability_list.html', {
        'DAYS_OF_WEEK': DAYS_OF_WEEK,
    })
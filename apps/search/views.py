from django.shortcuts import render
from cities_light.models import Country

def search_coaches(request):
    countries = Country.objects.all()  # Load all countries for the search form
    return render(request, 'pages/search_coaches.html', {'countries': countries})
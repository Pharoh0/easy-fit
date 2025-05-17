from django_filters import rest_framework as filters
from rest_framework import viewsets
from apps.profiles.coach_profile.models import CoachProfile
from cities_light.models import Country, City, Region
from django.db.models import Avg


class CoachProfileFilter(filters.FilterSet):
    country = filters.NumberFilter(field_name='country__id')
    region = filters.NumberFilter(field_name='region__id')
    city = filters.NumberFilter(field_name='city__id')
    specialty = filters.CharFilter(method='filter_specialty')
    min_rate = filters.NumberFilter(field_name='hourly_rate', lookup_expr='gte')
    max_rate = filters.NumberFilter(field_name='hourly_rate', lookup_expr='lte')
    years_of_experience = filters.NumberFilter(field_name='years_of_experience', lookup_expr='gte')
    min_rating = filters.NumberFilter(method='filter_min_rating')
    
    def filter_specialty(self, queryset, name, value):
        if value:
            # Filter by specialty (case-insensitive partial match)
            return queryset.filter(specialties__icontains=value)
        return queryset
    
    def filter_min_rating(self, queryset, name, value):
        if value:
            # Use the rating field directly if it exists, otherwise return all
            try:
                return queryset.filter(rating__gte=float(value))
            except (ValueError, TypeError):
                # Handle case where value is not a valid number
                return queryset
            except Exception:
                # Handle case where rating field doesn't exist
                return queryset
        return queryset
    

    class Meta:
        model = CoachProfile
        fields = ['country', 'region', 'city', 'specialty', 'min_rate', 'max_rate', 'years_of_experience', 'min_rating']
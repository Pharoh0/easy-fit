from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.coach_profile.serializers import CoachProfileSerializer
from .filters import CoachProfileFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import F, Value, CharField
from django.db.models.functions import Concat

class CoachSearchPagination(PageNumberPagination):
    page_size = 6
    page_size_query_param = 'page_size'
    max_page_size = 20
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages
        })

class CoachProfileSearchView(generics.ListAPIView):
    serializer_class = CoachProfileSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CoachProfileFilter
    permission_classes = [AllowAny]  # Allow unauthenticated access
    pagination_class = CoachSearchPagination

    def get_queryset(self):
        # Start with all coach profiles
        queryset = CoachProfile.objects.all().select_related(
            'user', 'country', 'region', 'city'
        )
        
        # Add a dummy rating field for sorting and filtering (since we don't have a real rating field yet)
        # In a real implementation, this would be calculated from reviews
        from django.db import models
        queryset = queryset.annotate(rating=Value(4, output_field=models.FloatField()))
        
        # Log the query parameters for debugging
        print(f"Search parameters: {self.request.query_params}")
        
        # Apply filters directly for debugging purposes
        country = self.request.query_params.get('country')
        region = self.request.query_params.get('region')
        city = self.request.query_params.get('city')
        specialty = self.request.query_params.get('specialty')
        min_rate = self.request.query_params.get('min_rate')
        max_rate = self.request.query_params.get('max_rate')
        years_experience = self.request.query_params.get('years_of_experience')
        
        # Apply filters directly if needed (the filter backend should handle this, but for debugging)
        if country and country != '':
            queryset = queryset.filter(country_id=country)
        if region and region != '':
            queryset = queryset.filter(region_id=region)
        if city and city != '':
            queryset = queryset.filter(city_id=city)
        if specialty and specialty != '':
            queryset = queryset.filter(specialties__icontains=specialty)
        if min_rate and min_rate != '':
            queryset = queryset.filter(hourly_rate__gte=float(min_rate))
        if max_rate and max_rate != '':
            queryset = queryset.filter(hourly_rate__lte=float(max_rate))
        if years_experience and years_experience != '':
            queryset = queryset.filter(years_of_experience__gte=int(years_experience))
        
        # Add sorting functionality
        sort_by = self.request.query_params.get('sort_by', None)
        if sort_by:
            if sort_by == 'rating_high':
                queryset = queryset.order_by('-rating')
            elif sort_by == 'rating_low':
                queryset = queryset.order_by('rating')
            elif sort_by == 'price_high':
                queryset = queryset.order_by('-hourly_rate')
            elif sort_by == 'price_low':
                queryset = queryset.order_by('hourly_rate')
            elif sort_by == 'experience_high':
                queryset = queryset.order_by('-years_of_experience')
            elif sort_by == 'experience_low':
                queryset = queryset.order_by('years_of_experience')
        
        return queryset

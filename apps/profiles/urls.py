from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_profile import apis as client_apis
from .coach_profile import apis as coach_apis
from . import views
from .coach_profile import views_coach
from .coach_profile import views_availability, views_coach_picture, views_client_picture,views_certification

app_name = "profiles"

router = DefaultRouter()
router.register(r'client-profile', client_apis.ClientProfileViewSet, basename='client-profile')
# coach urls

router.register(r'coach-profiles', coach_apis.CoachProfileViewSet, basename='coach-profile')
router.register(r'coach-availabilities', coach_apis.AvailabilityViewSet, basename='availability')
router.register(r'coach-certifications', coach_apis.CertificationViewSet, basename='certification')
router.register(r'coach-client-pictures', coach_apis.ClientPictureViewSet, basename='client-picture')
router.register(r'coach-pictures', coach_apis.CoachPictureViewSet, basename='coach-picture')

router.register(r'regions', coach_apis.RegionViewSet, basename='region')
router.register(r'cities', coach_apis.CityViewSet, basename='city')



urlpatterns = [
    #apis
    path('api/v1/', include(router.urls)),

    # path('regions/', coach_apis.RegionListView.as_view(), name='region-list'),
    # path('cities/', coach_apis.CityListView.as_view(), name='city-list'),


    # client URLs
    path('view-profile/', views.view_profile, name='view_profile'),
    path('edit-profile/', views.edit_profile, name='edit_profile'),
    
    # Coach profile URLs
    path('coach-profile/', views_coach.view_coach_profile, name='view_coach_profile'),
    path('coach-profile/edit/', views_coach.edit_coach_profile, name='edit_coach_profile'),
    
    # coach availabilty
    path('coach-profile/availabilities/', views_availability.view_availabilities, name='view_availabilities'),

    # coach picture
    path('coach-profile/pictures/', views_coach_picture.view_pictures, name='view_pictures'),

    # coach client picture
    path('coach-profile/coach-client-pictures/', views_client_picture.view_client_pictures, name='coach_client_view_pictures'),
    
    # Coach certifications
    path('coach-profile/certifications/', views_certification.view_certifications, name='view_coach_certifications'),
]



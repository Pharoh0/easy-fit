from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_profile import apis as client_apis
from .coach_profile import apis as coach_apis
from . import views
from .coach_profile import views_coach
from .coach_profile import views_coach_picture, views_client_picture, views_certification
from .client_profile import views_api as client_views_api
# Old client views have been removed in favor of API-driven approach

app_name = "profiles"

router = DefaultRouter()

# Client API routes
router.register(r'client-profile', client_apis.ClientProfileViewSet, basename='client-profile')
router.register(r'client-measurements', client_apis.ClientMeasurementViewSet, basename='client-measurement')
router.register(r'client-diet-requests', client_apis.ClientDietRequestViewSet, basename='client-diet-request')
router.register(r'coach-offers', client_apis.CoachOfferViewSet, basename='coach-offer')
router.register(r'client-subscriptions', client_apis.ClientSubscriptionViewSet, basename='client-subscription')
router.register(r'client-progress-reports', client_apis.ProgressReportViewSet, basename='client-progress-report')

# Coach API routes
router.register(r'coach-profiles', coach_apis.CoachProfileViewSet, basename='coach-profile')
router.register(r'coach-certifications', coach_apis.CertificationViewSet, basename='certification')
router.register(r'coach-client-pictures', coach_apis.ClientPictureViewSet, basename='client-picture')
router.register(r'coach-pictures', coach_apis.CoachPictureViewSet, basename='coach-picture')

# General API routes
router.register(r'regions', coach_apis.RegionViewSet, basename='region')
router.register(r'cities', coach_apis.CityViewSet, basename='city')



from .client_profile import views as client_views

urlpatterns = [
    #apis
    path('api/v1/', include(router.urls)),
    path('api/v1/client/', include('apps.profiles.client_profile.api.urls')),

    # path('regions/', coach_apis.RegionListView.as_view(), name='region-list'),
    # path('cities/', coach_apis.CityListView.as_view(), name='city-list'),

    # API-driven Client Profile URLs
    path('client-profile/', client_views_api.view_client_profile, name='client_profile'),
    path('client/edit-profile/', client_views_api.edit_client_profile, name='edit_client_profile'),
    
    # API-driven Client Measurements URLs
    path('client/measurements/', client_views_api.client_measurements, name='client_measurements'),
    path('client/body-measurements/', client_views_api.body_measurements_full, name='body_measurements_full'),
    
    # API-driven Client Diet Request URLs
    path('client/diet-requests/', client_views_api.list_diet_requests, name='list_diet_requests'),
    path('client/diet-requests/create/', client_views_api.create_diet_request, name='create_diet_request'),
    path('client/diet-requests/<int:pk>/', client_views_api.diet_request_detail, name='diet_request_detail'),
    
    # API-driven Client Subscription URLs
    path('client/subscriptions/', client_views_api.list_subscriptions, name='list_subscriptions'),
    path('client/subscriptions/<int:pk>/', client_views_api.subscription_detail, name='subscription_detail'),
    
    # API-driven Progress Report URLs
    path('client/progress-reports/<int:subscription_id>/', client_views_api.list_progress_reports, name='list_progress_reports'),
    path('client/progress-reports/report/<int:pk>/', client_views_api.view_progress_report, name='view_progress_report'),
    
    # Coach profile URLs
    path('coach/', views_coach.coach_profile_current, name='coach_profile'),
    path('coach-profile/<int:pk>/', views_coach.view_coach_profile, name='view_coach_profile'),
    path('coach-profile/edit/', views_coach.edit_coach_profile, name='edit_coach_profile'),

    # coach picture
    path('coach-profile/pictures/', views_coach_picture.view_pictures, name='view_pictures'),

    # coach client picture
    path('coach-profile/coach-client-pictures/', views_client_picture.view_client_pictures, name='coach_client_view_pictures'),
    
    # Coach certifications
    path('coach-profile/certifications/', views_certification.view_certifications, name='view_coach_certifications'),
]



from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientMeasurementViewSet,
    ProgressReportViewSet,
    ClientDietRequestViewSet,
    ClientSubscriptionViewSet
)
from .views_measurements import (
    BodyPartViewSet,
    BodyPartMeasurementViewSet,
    EnhancedClientMeasurementViewSet
)

router = DefaultRouter()
# Original measurement endpoint (will be kept for backwards compatibility)
router.register(r'measurements', ClientMeasurementViewSet, basename='client-measurement')
# Enhanced measurement endpoint with body part support
router.register(r'enhanced-measurements', EnhancedClientMeasurementViewSet, basename='enhanced-measurement')
# Body parts and their measurements
router.register(r'body-parts', BodyPartViewSet, basename='body-part')
router.register(r'body-part-measurements', BodyPartMeasurementViewSet, basename='body-part-measurement')
# Other existing endpoints
router.register(r'progress-reports', ProgressReportViewSet, basename='progress-report')
router.register(r'diet-requests', ClientDietRequestViewSet, basename='client-diet-request')
router.register(r'subscriptions', ClientSubscriptionViewSet, basename='client-subscription')

urlpatterns = [
    path('', include(router.urls)),
]

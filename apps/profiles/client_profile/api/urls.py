from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientMeasurementViewSet,
    ProgressReportViewSet,
    ClientDietRequestViewSet,
    ClientSubscriptionViewSet
)

router = DefaultRouter()
router.register(r'measurements', ClientMeasurementViewSet, basename='client-measurement')
router.register(r'progress-reports', ProgressReportViewSet, basename='progress-report')
router.register(r'diet-requests', ClientDietRequestViewSet, basename='client-diet-request')
router.register(r'subscriptions', ClientSubscriptionViewSet, basename='client-subscription')

urlpatterns = [
    path('', include(router.urls)),
]

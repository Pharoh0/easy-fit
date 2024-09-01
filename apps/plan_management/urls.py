from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .coach import apis as coach_apis
from client import apis as client_apis


router = DefaultRouter()
router.register(r'product-plans', coach_apis.ProductPlanViewSet)
router.register(r'plan-items', coach_apis.PlanItemViewSet)
router.register(r'plan-subscriptions', client_apis.PlanSubscriptionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

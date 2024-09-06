from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .coach import apis as coach_apis
from .client import apis as client_apis
from .coach import views as coach_views


app_name = "plan_management"

router = DefaultRouter()
router.register(r'product-plans', coach_apis.ProductPlanViewSet)
router.register(r'plan-items', coach_apis.PlanItemViewSet)
router.register(r'plan-subscriptions', client_apis.PlanSubscriptionViewSet)

urlpatterns = [
    path('api/v1/', include(router.urls)),
    
    path('coach/product-plans/', coach_views.manage_product_plans, name='manage_product_plans'),

]

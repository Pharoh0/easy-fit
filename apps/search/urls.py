from django.urls import path, include
# from rest_framework.routers import DefaultRouter
from .views import search_coaches
from .apis import search as search_apis
from apps.profiles.coach_profile.apis import CoachProfileViewSet
from .apis.search import CoachProfileSearchView

app_name = "search"

# router = DefaultRouter()
# router.register(r'product-plans', coach_apis.ProductPlanViewSet)
# router.register(r'plan-items', coach_apis.PlanItemViewSet)
# router.register(r'plan-subscriptions', client_apis.PlanSubscriptionViewSet)

urlpatterns = [
    path('api/v1/search-coaches/', CoachProfileSearchView.as_view(), name='search_coaches'),
    
    # path('api/v1/', include(router.urls)),
  # API for searching coaches
    # Page for searching coaches
    path('search-coaches/', search_coaches, name='view_search_coaches'),  # URL for the search page
]

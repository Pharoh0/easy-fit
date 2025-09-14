"""
URL configuration for easy_fit project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf.urls.static import static
from django.conf import settings
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter
from apps.plan_management.coach.template_views import PlanTemplateViewSet, WorkoutTemplateViewSet, ExerciseTemplateViewSet, MealTemplateViewSet

# API router for direct API access
api_router = DefaultRouter()
api_router.register(r'plan-templates', PlanTemplateViewSet)
api_router.register(r'workout-templates', WorkoutTemplateViewSet)
api_router.register(r'exercise-templates', ExerciseTemplateViewSet)
api_router.register(r'meal-templates', MealTemplateViewSet)

urlpatterns = [
    path('', TemplateView.as_view(template_name="landing/index.html"), name="home"),
    path('admin/', admin.site.urls),
    path("auth-users/", include("apps.auth_users.urls", namespace="auth_users")),
    path("profiles/", include("apps.profiles.urls", namespace="profiles")),
    
    path("plan-management/", include("apps.plan_management.urls", namespace="plan_management")),
    # Messaging app (API + UI)
    path("messaging/", include("apps.messaging.urls", namespace="messaging")),
    
    path("search/", include("apps.search.urls", namespace="search")),

    # APIs
    path("api/v1/", include(api_router.urls)),  # Direct API router
    path("api/staff/", include(("apps.staff.api.urls", "staff_api"), namespace="staff_api")),

    # Staff UI
    path("staff/", include(("apps.staff.urls", "staff"), namespace="staff")),

    path("user-friendship/", include("apps.user_friendship.urls", namespace="user_friendship")),
    
    # Test routes for development and testing
    path("test/analytics/", TemplateView.as_view(template_name="test_analytics.html"), name="test_analytics"),
    path("test/navbar/", TemplateView.as_view(template_name="test_navbar.html"), name="test_navbar"),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
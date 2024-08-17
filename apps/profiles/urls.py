
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_profile import apis

app_name = "profiles"


router = DefaultRouter()
router.register(r'client-profile', apis.ClientProfileViewSet, basename='client-profile')

urlpatterns = [
    path('api/v1/', include(router.urls)),
]

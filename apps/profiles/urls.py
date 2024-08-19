
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_profile import apis
from .views import edit_profile


app_name = "profiles"

router = DefaultRouter()
router.register(r'client-profile', apis.ClientProfileViewSet, basename='apis_client-profile')

urlpatterns = [
    #apis
    path('api/v1/', include(router.urls)),

    # views
    path('edit-profile/', edit_profile, name='edit_profile'),

]

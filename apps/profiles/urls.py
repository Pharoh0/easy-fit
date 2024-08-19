
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .client_profile import apis
from . import views

app_name = "profiles"

router = DefaultRouter()
router.register(r'client-profile', apis.ClientProfileViewSet, basename='client-profile')


urlpatterns = [
    #apis
    path('api/v1/', include(router.urls)),

    # views
    path('view-profile/', views.view_profile, name='view_profile'),
    path('edit-profile/', views.edit_profile, name='edit_profile'),

]

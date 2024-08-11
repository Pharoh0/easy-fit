
from django.urls import path, reverse_lazy, include

app_name = "auth_users"

from .api import apis

urlpatterns = [
    path("api/v1/login/", apis.UserLoginAPIView.as_view(), name="user-login"),
    path("api/v1/logout/", apis.UserLogoutAPIView.as_view(), name="user-logout"),
    path("api/v1/register/", apis.UserRegistrationAPIView.as_view(), name="user-register"),
    
    path("api/v1/token/refresh/", apis.CustomTokenRefreshView.as_view(), name="token-refresh"),
]
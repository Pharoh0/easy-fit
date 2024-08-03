
from django.urls import path, reverse_lazy, include

app_name = "auth_users"

from .api import apis

urlpatterns = [
    path("api/v1/login/", apis.UserLoginAPIView.as_view(), name="user-login"),
    path("api/v1/register/", apis.UserRegistrationAPIView.as_view(), name="user-register"),

]
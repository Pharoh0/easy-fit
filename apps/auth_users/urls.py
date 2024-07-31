
from django.urls import path, reverse_lazy, include

app_name = "auth_users"

from .api.apis import UserLoginAPIView

urlpatterns = [
    path("api/v1/login/", UserLoginAPIView.as_view(), name="user-login"),

]
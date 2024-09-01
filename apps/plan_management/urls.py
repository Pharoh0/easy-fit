from django.urls import path, reverse_lazy, include
from .api import apis
from . import views

app_name = "plan_management"

urlpatterns = [
    # API paths
    # path("api/v1/login/", apis.UserLoginAPIView.as_view(), name="api-user-login"),
    # path("api/v1/logout/", apis.UserLogoutAPIView.as_view(), name="api-user-logout"),
    # path("api/v1/register/", apis.UserRegistrationAPIView.as_view(), name="api-user-register"),
    # path("api/v1/token/refresh/", apis.CustomTokenRefreshView.as_view(), name="api-token-refresh"),
    #
    # # Template views
    # path('login/', views.UserLoginView.as_view(), name='user-login'),
    # path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    # path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    # path('logout/', views.UserLogoutView.as_view(), name='user-logout'),
]
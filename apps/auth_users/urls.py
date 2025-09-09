from django.urls import path, reverse_lazy, include
from .api import apis
from . import views

app_name = "auth_users"

urlpatterns = [
    # API paths
    path("api/v1/login/", apis.UserLoginAPIView.as_view(), name="api-user-login"),
    path("api/v1/logout/", apis.UserLogoutAPIView.as_view(), name="api-user-logout"),
    path("api/v1/register/", apis.UserRegistrationAPIView.as_view(), name="api-user-register"),
    path("api/v1/token/refresh/", apis.CustomTokenRefreshView.as_view(), name="api-token-refresh"),
    path("api/v1/verify-email/", apis.VerifyEmailAPIView.as_view(), name="api-verify-email"),
    path("api/v1/resend-verification/", apis.ResendVerificationAPIView.as_view(), name="api-resend-verification"),
    path("api/v1/django-session-logout/", apis.DjangoSessionLogoutView.as_view(), name="api-django-session-logout"),

    # Template views
    path('login/', views.UserLoginView.as_view(), name='user-login'),
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('verify/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('logout/', views.UserLogoutView.as_view(), name='user-logout'),
    path('blocked/', views.BlockedView.as_view(), name='blocked'),
]
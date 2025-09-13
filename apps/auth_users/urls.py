from django.urls import path, reverse_lazy, include
from django.contrib.auth import views as auth_views
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

    # Password reset (Forgot password) flow
    path(
        'password-reset/',
        auth_views.PasswordResetView.as_view(
            template_name='auth_users/password_reset_form.html',
            email_template_name='auth_users/password_reset_email.txt',
            html_email_template_name='auth_users/password_reset_email.html',
            subject_template_name='auth_users/password_reset_subject.txt',
            success_url=reverse_lazy('auth_users:password_reset_done'),
        ),
        name='password_reset',
    ),
    path(
        'password-reset/done/',
        auth_views.PasswordResetDoneView.as_view(
            template_name='auth_users/password_reset_done.html'
        ),
        name='password_reset_done',
    ),
    path(
        'reset/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='auth_users/password_reset_confirm.html',
            success_url=reverse_lazy('auth_users:password_reset_complete'),
        ),
        name='password_reset_confirm',
    ),
    path(
        'reset/done/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='auth_users/password_reset_complete.html'
        ),
        name='password_reset_complete',
    ),
]
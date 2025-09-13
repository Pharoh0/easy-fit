from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from datetime import timedelta
import datetime
import random
from django.contrib.auth import logout
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.response import Response

from rest_framework.exceptions import ValidationError
# from .models import ActiveToken
import json
from django.utils import timezone
from django.http import Http404
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

from django.contrib.auth.tokens import default_token_generator
import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.urls import reverse
from rest_framework import status, generics, serializers
from ezay_fit import settings
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime as dt
from .serializers import (
    CustomUserSerializer,
    UserLoginSerializer,
    UserRegistrationSerializer

)
from django.contrib.auth import login

from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from django.urls import reverse_lazy


User = get_user_model()

# Verification code expiry in minutes
VERIFICATION_CODE_EXPIRY_MINUTES = 15

def _generate_verification_code(length: int = 6) -> str:
    return ''.join(random.choices('0123456789', k=length))

def _build_verification_link(request, user: User) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_path = reverse('auth_users:verify-email')
    # Append as query params; the verify page JS will call the API
    return request.build_absolute_uri(f"{verify_path}?uid={uid}&token={token}")

def _send_verification_email(request, user: User, code: str) -> None:
    """Send verification email with code and verification link."""
    subject = 'Verify your Eazy Fit account'
    link = _build_verification_link(request, user)
    
    # Debug output in development
    if settings.DEBUG:
        try:
            print("\n=== EMAIL VERIFICATION (DEV) ===")
            print(f"To      : {user.email} ({user.username})")
            print(f"Code    : {code}")
            print(f"Link    : {link}")
            print("=== END EMAIL VERIFICATION ===\n")
        except Exception as e:
            print(f"Debug output error: {e}")
    
    # Email context
    context = {
        'user': user,
        'verification_code': code,
        'verification_link': link,
        'expiry_minutes': VERIFICATION_CODE_EXPIRY_MINUTES,
        'site_name': getattr(settings, 'SITE_NAME', 'Eazy Fit'),
        'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
    }
    
    # Render both plain text and HTML versions
    message_plain = render_to_string('emails/verification_email.txt', context)
    message_html = render_to_string('emails/verification_email.html', context)
    
    from_email = settings.DEFAULT_FROM_EMAIL
    recipient_list = [user.email]
    
    try:
        # Send email using EmailMultiAlternatives to support HTML
        msg = EmailMultiAlternatives(
            subject=subject,
            body=message_plain,
            from_email=from_email,
            to=recipient_list,
            reply_to=[from_email],
        )
        msg.attach_alternative(message_html, "text/html")
        msg.send(fail_silently=False)
        
    except Exception as e:
        # Log the error but don't break the flow in production
        logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
        if settings.DEBUG:
            raise  # Re-raise in development for debugging

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data["refresh"]

        # Get refresh token object
        refresh_token = RefreshToken(refresh)
        
        # Get user from token payload
        user_id = refresh_token.get('user_id')
        User = get_user_model()
        
        try:
            user = User.objects.get(id=user_id)
            
            # Preserve custom claims in the new access token
            access_token = refresh_token.access_token
            access_token['user_type'] = user.user_type
            access_token['staff_role'] = user.staff_role
            access_token['is_staff_member'] = user.user_type == 'staff'
            access_token['staff_permission_level'] = user.staff_permission_level
            
            # Debug output
            print(f"Token refreshed for user: {user.username}")
            print(f"User type: {user.user_type}")
            print(f"Staff role: {user.staff_role}")
        except User.DoesNotExist:
            print(f"Failed to find user with ID {user_id} during token refresh")

        # Calculate refresh token expiration time
        refresh_token_expiration = datetime.datetime.now() + refresh_token.lifetime

        return Response(
            {
                "access": str(access_token),
                "refresh": str(refresh_token),
                "refresh_token_expiration": refresh_token_expiration,
            }
        )
        


class UserLoginAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = UserLoginSerializer

    def post(self, request, *args, **kwargs):
        # Print received data for debugging
        print(f"Login request data: {request.data}")
        
        # Store the request in self for use in generate_tokens_response
        self.request = request
        
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.validated_data["user"]
            
            # Generate tokens and construct response
            response_data = self.generate_tokens_response(user)
            return self.add_authorization_header(response_data)
            
        except serializers.ValidationError as e:
            print(f"Validation error: {e.detail}")
            # Preserve the validation error structure
            error_detail = e.detail
            
            # Format the response to match what the frontend expects
            # If this looks like an unverified email case, include redirect info to verification page
            try:
                username = (request.data or {}).get('username')
                candidate = None
                if username:
                    try:
                        candidate = User.objects.get(username=username)
                    except User.DoesNotExist:
                        candidate = None
                if candidate and getattr(candidate, 'user_type', None) in ('client', 'coach') and not getattr(candidate, 'email_verified', False):
                    verify_url = str(reverse_lazy('auth_users:verify-email'))
                    payload = {
                        "status": "error",
                        "errors": error_detail,
                        "requires_email_verification": True,
                        "email": candidate.email,
                        "redirect_url": f"{verify_url}?email={candidate.email}"
                    }
                    return Response(payload, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                pass

            return Response({"status": "error", "errors": error_detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print(f"Login error: {str(e)}")
            # Return a more detailed error response
            return Response(
                {"status": "error", "errors": {"__all__": [str(e)]}},
                status=status.HTTP_400_BAD_REQUEST
            )

    # def generate_tokens_response(self, user):
    #     # Use Django's login function
    #     login(self.request, user)

    #     # Generate tokens
    #     refresh = RefreshToken.for_user(user)
    #     access_token = refresh.access_token

    #     # Save the refresh token to the database
    #     # active_token = ActiveToken.objects.create(user=user, token=str(refresh))
    #     # print("Logged in and created active token: ", active_token)

    #     # Additional logic for the response data
    #     access_token_expiration = timezone.now() + refresh.lifetime - timedelta(
    #         seconds=settings.SIMPLE_JWT["SLIDING_TOKEN_REFRESH_LIFETIME"].total_seconds())
    #     refresh_token_expiration = timezone.now() + refresh.lifetime

    #     data = {
    #         "user": CustomUserSerializer(user).data,
    #         "tokens": {
    #             "access": str(access_token),
    #             "access_token_expiration": access_token_expiration,
    #             "refresh": str(refresh),
    #             "refresh_token_expiration": refresh_token_expiration,
    #         },
    #     }
    #     return data
    
    def generate_tokens_response(self, user):
        # Store request reference to use in login function
        request = self.request
        # Use Django's login function with the saved request
        login(request, user)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Add custom claims to token payload
        # This is critical for staff permission checks
        access_token['user_type'] = user.user_type
        access_token['staff_role'] = user.staff_role
        access_token['is_staff_member'] = user.user_type == 'staff'
        access_token['staff_permission_level'] = user.staff_permission_level

        # Debugging output
        print(f"User authenticated: {user.username}")
        print(f"User type: {user.user_type}")
        print(f"Staff role: {user.staff_role}")
        print(f"Access Token: {str(access_token)[:20]}...")
        print(f"Refresh Token: {str(refresh)[:20]}...")

        # Calculate expiration times
        access_token_expiration = timezone.now() + timedelta(minutes=5)  # Default access token lifetime
        refresh_token_expiration = timezone.now() + refresh.lifetime

        response_data = {
            "user": CustomUserSerializer(user).data,
            "tokens": {
                "access": str(access_token),
                "access_token_expiration": access_token_expiration,
                "refresh": str(refresh),
                "refresh_token_expiration": refresh_token_expiration,
            },
            "redirect_url": reverse_lazy('auth_users:dashboard')  # Dynamically get the dashboard URL
        }

        # Print the response data to ensure it's correct
        print(f"Login successful. Redirect URL: {response_data['redirect_url']}")

        return response_data

    def add_authorization_header(self, response_data):
        response = Response(response_data, status=status.HTTP_200_OK)
        response["Authorization"] = f"Bearer {response_data['tokens']['access']}"
        return response


class UserLogoutAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        try:
            # Blacklist the refresh token
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                raise ValidationError('Refresh token is required.')

            token = RefreshToken(refresh_token)
            token.blacklist()

            # Remove the active token from the ActiveToken model
            # ActiveToken.objects.filter(token=refresh_token).delete()

            # Mark the user as offline and update last activity
            user = request.user
            print("User offline",user)
            user.is_online = False
            user.last_activity = None  # or set to timezone.now() for logout time
            user.request_ip = None
            
            user.save(update_fields=['is_online', 'last_activity', 'request_ip'])
            print("user.last_activity",user.last_activity)
            
            # Log out the user from Django session
            logout(request)

            # Delete JWT token cookies from the response
            response = Response(status=status.HTTP_205_RESET_CONTENT)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')

            return response

        except Exception as e:
            print(e)
            return Response(status=status.HTTP_400_BAD_REQUEST)




class DjangoSessionLogoutView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_200_OK)


class UserRegistrationAPIView(GenericAPIView):
    """
    An endpoint for the client to create a new User.
    """
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        group_id = request.data.get("group_id", None)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_enabled = serializer.validated_data.get('is_enabled', False)
        is_whitelisted = serializer.validated_data.get('is_whitelisted', False)
        user = serializer.save(is_enabled=is_enabled, is_whitelisted=is_whitelisted)

        if group_id:
            try:
                group_obj = Group.objects.get(id=group_id)
            except Group.DoesNotExist as e:
                return Response({"message": str(e)}, status=status.HTTP_404_NOT_FOUND)
            user.groups.add(group_obj)

        # If the new user is a client or coach, require email verification first
        if getattr(user, 'user_type', None) in ('client', 'coach'):
            # Generate and persist a 6-digit code
            code = _generate_verification_code()
            user.email_verification_code = code
            user.email_verified = False
            user.email_verification_sent_at = timezone.now()
            user.save(update_fields=['email_verification_code', 'email_verified', 'email_verification_sent_at'])

            # Send email with code and verification link
            _send_verification_email(request, user, code)

            verify_url = reverse_lazy('auth_users:verify-email')
            # Provide helpful response for frontend to redirect
            return Response({
                "status": "verification_sent",
                "email": user.email,
                "redirect_url": f"{verify_url}?email={user.email}",
            }, status=status.HTTP_201_CREATED)

        # Otherwise (e.g. staff), log in immediately
        login(request, user)
        token = RefreshToken.for_user(user)
        data = serializer.data
        data["tokens"] = {
            "refresh": str(token),
            "access": str(token.access_token)
        }
        data["redirect_url"] = reverse_lazy('auth_users:dashboard')
        return Response(data, status=status.HTTP_201_CREATED)


class VerifyEmailAPIView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        """Verify email using either a code or uid/token pair.
        Body may contain:
          - { email, code }
          - { uid, token }
        """
        email = request.data.get('email')
        code = request.data.get('code')
        uid = request.data.get('uid')
        token = request.data.get('token')

        user = None
        if email and code:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

            # Validate code expiry
            sent_at = getattr(user, 'email_verification_sent_at', None)
            if not user.email_verification_code or not sent_at:
                return Response({"detail": "No verification code found. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if (timezone.now() - sent_at) > timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES):
                return Response({"detail": "Verification code expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)
            if str(code) != str(user.email_verification_code):
                return Response({"detail": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        elif uid and token:
            try:
                uid_int = int(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=uid_int)
            except Exception:
                return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)
            if not default_token_generator.check_token(user, token):
                return Response({"detail": "Verification link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"detail": "Invalid payload. Provide either email+code or uid+token."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark verified
        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_sent_at = None
        user.save(update_fields=['email_verified', 'email_verification_code', 'email_verification_sent_at'])

        # Auto-login: issue tokens to streamline UX
        token_obj = RefreshToken.for_user(user)
        access_token = token_obj.access_token
        # Preserve claims similar to login flow
        access_token['user_type'] = user.user_type
        access_token['staff_role'] = getattr(user, 'staff_role', None)
        access_token['is_staff_member'] = (user.user_type == 'staff')
        access_token['staff_permission_level'] = getattr(user, 'staff_permission_level', 0)

        return Response({
            "status": "verified",
            "user": CustomUserSerializer(user).data,
            "tokens": {
                "access": str(access_token),
                "refresh": str(token_obj)
            },
            "redirect_url": reverse_lazy('auth_users:dashboard')
        }, status=status.HTTP_200_OK)


class ResendVerificationAPIView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "If an account exists with this email, a code has been sent."}, status=status.HTTP_200_OK)

        if user.email_verified:
            return Response({"detail": "Email is already verified."}, status=status.HTTP_200_OK)

        # Simple rate-limit: allow resend after 60 seconds
        if user.email_verification_sent_at and (timezone.now() - user.email_verification_sent_at) < timedelta(seconds=60):
            return Response({"detail": "Please wait before requesting a new code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        code = _generate_verification_code()
        user.email_verification_code = code
        user.email_verification_sent_at = timezone.now()
        user.save(update_fields=['email_verification_code', 'email_verification_sent_at'])
        _send_verification_email(request, user, code)
        return Response({"status": "sent"}, status=status.HTTP_200_OK)


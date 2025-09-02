from django.contrib.auth import get_user_model
from datetime import timedelta
import datetime
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
from django.core.mail import send_mail
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
            return Response(
                {"status": "error", "errors": error_detail},
                status=status.HTTP_400_BAD_REQUEST
            )
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

        # Log the user in
        login(request, user)

        token = RefreshToken.for_user(user)
        data = serializer.data
        data["tokens"] = {
            "refresh": str(token),
            "access": str(token.access_token)
        }

        # Include the redirect URL in the response
        data["redirect_url"] = reverse_lazy('auth_users:dashboard')

        return Response(data, status=status.HTTP_201_CREATED)


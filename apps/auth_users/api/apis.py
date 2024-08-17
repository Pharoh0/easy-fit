from django.contrib.auth import get_user_model
from datetime import timedelta
import datetime
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



User = get_user_model()

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh = serializer.validated_data["refresh"]

        # Get refresh token object
        refresh_token = RefreshToken(refresh)

        # Calculate refresh token expiration time
        refresh_token_expiration = datetime.datetime.now() + refresh_token.lifetime

        # Generate new access token
        access_token = refresh_token.access_token

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
        # Initialize the middleware with the get_response argument
        # ip_middleware = UpdateUserIpMiddleware(get_response=None)

        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Update user's IP address using middleware logic
        # user.request_ip = ip_middleware.get_client_ip(request)
        # user.save(update_fields=['request_ip'])

        # Generate tokens and construct response
        response_data = self.generate_tokens_response(user)
        return self.add_authorization_header(response_data)

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
        # Use Django's login function
        login(self.request, user)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Debugging output
        print(f"Access Token: {access_token}")
        print(f"Refresh Token: {refresh}")

        # Calculate expiration times
        access_token_expiration = timezone.now() + refresh.lifetime - timedelta(
            seconds=settings.SIMPLE_JWT["SLIDING_TOKEN_REFRESH_LIFETIME"].total_seconds())
        refresh_token_expiration = timezone.now() + refresh.lifetime

        response_data = {
            "user": CustomUserSerializer(user).data,
            "tokens": {
                "access": str(access_token),
                "access_token_expiration": access_token_expiration,
                "refresh": str(refresh),
                "refresh_token_expiration": refresh_token_expiration,
            },
            "redirect_url": "/dashboard/"  # Set this to your desired dashboard URL
        }

        # Print the response data to ensure it's correct
        print(f"Response Data: {response_data}")

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

            # Delete JWT token cookies from the response
            response = Response(status=status.HTTP_205_RESET_CONTENT)
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')

            return response

        except Exception as e:
            print(e)
            return Response(status=status.HTTP_400_BAD_REQUEST)




class UserRegistrationAPIView(GenericAPIView):
    """
    An endpoint for the client to create a new User.
    """
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        group_id = request.data.get("group_id",None)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_enabled = serializer.validated_data.get('is_enabled', False)
        is_whitelisted = serializer.validated_data.get('is_whitelisted', False)
        user = serializer.save(is_enabled=is_enabled, is_whitelisted=is_whitelisted)

        if group_id:
            try:
                group_obj=Group.objects.get(id=group_id)
            except Group.DoesNotExist as e:
                return Response({"message":str(e)}, status=status.HTTP_404_NOT_FOUND)
            user.groups.add(group_obj)
        
        token = RefreshToken.for_user(user)
        data = serializer.data
        data["tokens"] = {"refresh": str(token), "access": str(token.access_token)}
        return Response(data, status=status.HTTP_201_CREATED)


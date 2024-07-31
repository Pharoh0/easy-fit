from django.contrib.auth import get_user_model
from datetime import timedelta
import datetime
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

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
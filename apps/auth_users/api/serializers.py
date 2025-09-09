
from rest_framework import serializers # type: ignore
from django.contrib.auth.password_validation import validate_password
from rest_framework.validators import UniqueValidator # type: ignore
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import  Group, Permission
from django.contrib.auth import get_user_model

# profiles import
from apps.profiles.client_profile.models import ClientProfile
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.staff_profile.models import StaffProfile

User = get_user_model()



class GroupSerializer(serializers.ModelSerializer):
      class Meta:
        model = Group
        fields=["id", "name"]
        
        
class CustomUserSerializer(serializers.ModelSerializer):
    groups=GroupSerializer(many=True,read_only=True)
    class Meta:
        model = User
        fields = [
            "id","username","first_name","last_name","email",
            "is_superuser","is_enabled","is_whitelisted","groups",
            "is_online","user_type","last_activity","email_verified"
        ]
        # fields = ["id","username" ,"first_name","user_type", "last_name", "email","is_superuser", "is_enabled","is_whitelisted","groups", "is_online", "last_activity"]



class UserLoginSerializer(serializers.Serializer):
    """
    Serializer class to authenticate users with username and password.
    """

    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        username = data.get("username")
        password = data.get("password")
        
        # Print received credentials for debugging (not for production)
        print(f"Login attempt for username: {username}")
        
        # For debugging - check the request format
        print(f"Login data received: {data}")
        
        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
            
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
            
        # Check if the user exists first
        User = get_user_model()
        try:
            existing_user = User.objects.get(username=username)
            
            # Check if user is blocked before checking password
            if not existing_user.is_active:
                # Check if the user was blocked with a reason
                if hasattr(existing_user, 'block_reason') and existing_user.block_reason:
                    # Format non-field errors with __all__ key for proper error handling
                    raise serializers.ValidationError(
                        {"__all__": [f"Your account has been blocked. Reason: {existing_user.block_reason}"]}
                    )
                else:
                    # Format non-field errors with __all__ key for proper error handling
                    raise serializers.ValidationError(
                        {"__all__": ["Your account has been disabled. Please contact an administrator."]}
                    )
            
            # Require email verification for client and coach accounts
            if getattr(existing_user, 'user_type', None) in ('client', 'coach') and not getattr(existing_user, 'email_verified', False):
                # Provide guidance to verify email
                raise serializers.ValidationError(
                    {"__all__": [
                        "Please verify your email to continue. We have sent a verification code to your email. "
                        "If you didn't receive it, you can request a new code from the verification page."
                    ]}
                )

            # Now try to authenticate with the correct password
            user = authenticate(username=username, password=password)
            if not user:
                # Password is wrong
                raise serializers.ValidationError({"__all__": ["Invalid password. Please try again."]})
        except User.DoesNotExist:
            # User doesn't exist
            raise serializers.ValidationError({"__all__": ["User not found. Please check your username."]})
        
        # We already checked for blocked users above, so no need to check again
        print(f"User authenticated successfully: {user.username}")
        # Print validation success for debugging
        print("Validation completed successfully")
        data["user"] = user
        return data
    
    
class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer class to serialize registration requests and create a new user.
    """

    email = serializers.EmailField(
        required=True, validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password",  "is_enabled", "is_whitelisted","user_type", "first_name", "last_name")

    def create(self, validated_data):
        # Create the user
        user = User.objects.create_user(**validated_data)
        
        # Create the appropriate profile based on user_type
        if validated_data['user_type'] == 'client':
            ClientProfile.objects.create(user=user)
        elif validated_data['user_type'] == 'coach':
            CoachProfile.objects.create(user=user)
        elif validated_data['user_type'] == 'staff':
            StaffProfile.objects.create(user=user)
        
        return user
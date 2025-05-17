
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
        fields = ["id","username" ,"first_name", "last_name", "email","is_superuser", "is_enabled","is_whitelisted","groups", "is_online","user_type", "last_activity"]
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
        
        if not username:
            raise serializers.ValidationError({"username": "Username is required."})
            
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
            
        # Try to authenticate the user
        user = authenticate(username=username, password=password)
        
        if not user:
            # Check if the user exists
            User = get_user_model()
            try:
                existing_user = User.objects.get(username=username)
                # User exists but password is wrong
                raise serializers.ValidationError({"detail": "Invalid password. Please try again."})
            except User.DoesNotExist:
                # User doesn't exist
                raise serializers.ValidationError({"detail": "User not found. Please check your username."})
        
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account is inactive. Please contact an administrator."})
            
        print(f"User authenticated successfully: {user.username}")
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
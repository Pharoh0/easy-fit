
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
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Incorrect credentials.")

        else:
            raise serializers.ValidationError(
                "Must include 'username' and 'password' fields."
            )
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
        # user = User.objects.create_user(**validated_data)
        # return user
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
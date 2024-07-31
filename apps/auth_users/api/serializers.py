from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import  Group, Permission
from django.contrib.auth import get_user_model

User = get_user_model()


class GroupSerializer(serializers.ModelSerializer):
      class Meta:
        model = Group
        fields=["id", "name"]
        
        
class CustomUserSerializer(serializers.ModelSerializer):
    groups=GroupSerializer(many=True,read_only=True)
    class Meta:
        model = User
        fields = ["id","username" ,"first_name", "last_name", "email","is_superuser", "is_enabled","is_whitelisted","groups", "is_online", "last_activity"]
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
    
    
    
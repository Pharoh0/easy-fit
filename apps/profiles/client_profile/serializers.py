from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework.validators import UniqueValidator
from .models import ClientProfile


User = get_user_model()

class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ['gender','age', 'height', 'weight', 'bmi', 'body_fat_percentage', 'waist_size', 'chest_size', 
                  'health_conditions', 'fitness_goals', 'dietary_preferences', 'avatar']
        
        extra_kwargs = {
                'avatar': {'required': False},  # Make the avatar field optional
            }

    def update(self, instance, validated_data):
        # Check if avatar is in the validated data
        if 'avatar' in validated_data:
            # If avatar is empty, do not update it
            if validated_data['avatar'] is None:
                validated_data.pop('avatar')
        
        # Proceed with the update of other fields
        return super().update(instance, validated_data)

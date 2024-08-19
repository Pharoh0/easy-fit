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
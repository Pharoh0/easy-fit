from rest_framework import serializers
from cities_light.models import Country, City, Region
from .models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'file', 'description']

class ClientPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPicture
        fields = ['id', 'image', 'description']

class CoachPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachPicture
        fields = ['id', 'image', 'description']

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['id', 'day_of_week', 'start_time', 'end_time']

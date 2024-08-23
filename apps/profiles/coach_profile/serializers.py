from rest_framework import serializers
from cities_light.models import Country, City, Region
from .models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture


class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = ['id', 'file', 'description']

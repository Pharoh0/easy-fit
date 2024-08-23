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

class CoachProfileSerializer(serializers.ModelSerializer):
    certifications = CertificationSerializer(many=True, read_only=True)
    client_pictures = ClientPictureSerializer(many=True, read_only=True)
    coach_pictures = CoachPictureSerializer(many=True, read_only=True)
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    country = serializers.PrimaryKeyRelatedField(queryset=Country.objects.all(), required=False)
    region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), required=False)
    city = serializers.PrimaryKeyRelatedField(queryset=City.objects.all(), required=False)



    class Meta:
        model = CoachProfile
        fields = [
            'id', 'user', 'avatar', 'bio', 'years_of_experience', 'country', 'region', 'city', 
            'locations', 'specialties', 'hourly_rate', 
            'facebook_profile_url', 'instagram_profile_url', 'twitter_profile_url', 
            'youtube_profile_url', 'tiktok_profilel_url', 'linkedin_profile_url', 
            'certifications', 'client_pictures', 'coach_pictures', 'availabilities'
        ]
        read_only_fields = ['user']

    # def get_country(self, obj):
    #     print(f"Country field raw value: {obj.country}")
    #     return {
    #         'code': obj.country.code if obj.country else None,
    #         'name': obj.country.name if obj.country else ""
    #     }
    

    def create(self, validated_data):
        certifications_data = self.initial_data.get('certifications')
        client_pictures_data = self.initial_data.get('client_pictures')
        coach_pictures_data = self.initial_data.get('coach_pictures')
        availabilities_data = self.initial_data.get('availabilities')

        coach_profile = CoachProfile.objects.create(**validated_data)

        if certifications_data:
            for cert_data in certifications_data:
                Certification.objects.create(coach_profile=coach_profile, **cert_data)

        if client_pictures_data:
            for pic_data in client_pictures_data:
                ClientPicture.objects.create(coach_profile=coach_profile, **pic_data)

        if coach_pictures_data:
            for pic_data in coach_pictures_data:
                CoachPicture.objects.create(coach_profile=coach_profile, **pic_data)

        if availabilities_data:
            for avail_data in availabilities_data:
                Availability.objects.create(coach=coach_profile, **avail_data)

        return coach_profile

    def update(self, instance, validated_data):
        certifications_data = self.initial_data.get('certifications')
        client_pictures_data = self.initial_data.get('client_pictures')
        coach_pictures_data = self.initial_data.get('coach_pictures')
        availabilities_data = self.initial_data.get('availabilities')

        instance = super().update(instance, validated_data)

        if certifications_data:
            instance.certifications.all().delete()
            for cert_data in certifications_data:
                Certification.objects.create(coach_profile=instance, **cert_data)

        if client_pictures_data:
            instance.client_pictures.all().delete()
            for pic_data in client_pictures_data:
                ClientPicture.objects.create(coach_profile=instance, **pic_data)

        if coach_pictures_data:
            instance.coach_pictures.all().delete()
            for pic_data in coach_pictures_data:
                CoachPicture.objects.create(coach_profile=instance, **pic_data)

        if availabilities_data:
            instance.availabilities.all().delete()
            for avail_data in availabilities_data:
                Availability.objects.create(coach=instance, **avail_data)

        return instance

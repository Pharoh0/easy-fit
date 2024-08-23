from rest_framework import serializers
from .models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture


class CertificationSerializer(serializers.ModelSerializer):
    # coach_profile = serializers.PrimaryKeyRelatedField(queryset=CoachProfile.objects.all())

    class Meta:
        model = Certification
        fields = ['id', 'coach_profile', 'file', 'description']


class ClientPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPicture
        fields = ['id', 'coach_profile','image', 'description']

class CoachPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachPicture
        fields = ['id', 'coach_profile','image', 'description']

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['id', 'coach_profile','day_of_week', 'start_time', 'end_time']


# class CoachProfileSerializer(serializers.ModelSerializer):
#     certifications = CertificationSerializer(many=True, read_only=True)
#     client_pictures = ClientPictureSerializer(many=True, read_only=True)
#     coach_pictures = CoachPictureSerializer(many=True, read_only=True)
#     availabilities = AvailabilitySerializer(many=True, read_only=True)
#     country = serializers.SerializerMethodField()
#     region = serializers.SerializerMethodField()
#     city = serializers.SerializerMethodField()

#     class Meta:
#         model = CoachProfile
#         fields = [
#             'id', 'user', 'avatar', 'bio', 'years_of_experience', 'country', 'region', 'city', 
#             'locations', 'specialties', 'hourly_rate', 
#             'facebook_profile_url', 'instagram_profile_url', 'twitter_profile_url', 
#             'youtube_profile_url', 'tiktok_profilel_url', 'linkedin_profile_url', 
#             'certifications', 'client_pictures', 'coach_pictures', 'availabilities'
#         ]
#         read_only_fields = ['user']

#     # def get_country(self, obj):
#     #     print(f"Country field raw value: {obj.country}")
#     #     return {
#     #         'code': obj.country.code if obj.country else None,
#     #         'name': obj.country.name if obj.country else ""
#     #     }
    
    
#     def get_country(self, obj):
#         if obj.country:
#             return {
#                 'id': obj.country.id,
#                 'name': obj.country.name
#             }
#         return None

#     def get_region(self, obj):
#         if obj.region:
#             return {
#                 'id': obj.region.id,
#                 'name': obj.region.name
#             }
#         return None

#     def get_city(self, obj):
#         if obj.city:
#             return {
#                 'id': obj.city.id,
#                 'name': obj.city.name
#             }
    

#     def create(self, validated_data):
#         certifications_data = self.initial_data.get('certifications')
#         client_pictures_data = self.initial_data.get('client_pictures')
#         coach_pictures_data = self.initial_data.get('coach_pictures')
#         availabilities_data = self.initial_data.get('availabilities')

#         coach_profile = CoachProfile.objects.create(**validated_data)

#         if certifications_data:
#             for cert_data in certifications_data:
#                 Certification.objects.create(coach_profile=coach_profile, **cert_data)

#         if client_pictures_data:
#             for pic_data in client_pictures_data:
#                 ClientPicture.objects.create(coach_profile=coach_profile, **pic_data)

#         if coach_pictures_data:
#             for pic_data in coach_pictures_data:
#                 CoachPicture.objects.create(coach_profile=coach_profile, **pic_data)

#         if availabilities_data:
#             for avail_data in availabilities_data:
#                 Availability.objects.create(coach=coach_profile, **avail_data)

#         return coach_profile

#     def update(self, instance, validated_data):
#         certifications_data = self.initial_data.get('certifications')
#         client_pictures_data = self.initial_data.get('client_pictures')
#         coach_pictures_data = self.initial_data.get('coach_pictures')
#         availabilities_data = self.initial_data.get('availabilities')

#         instance = super().update(instance, validated_data)

#         if certifications_data:
#             instance.certifications.all().delete()
#             for cert_data in certifications_data:
#                 Certification.objects.create(coach_profile=instance, **cert_data)

#         if client_pictures_data:
#             instance.client_pictures.all().delete()
#             for pic_data in client_pictures_data:
#                 ClientPicture.objects.create(coach_profile=instance, **pic_data)

#         if coach_pictures_data:
#             instance.coach_pictures.all().delete()
#             for pic_data in coach_pictures_data:
#                 CoachPicture.objects.create(coach_profile=instance, **pic_data)

#         if availabilities_data:
#             instance.availabilities.all().delete()
#             for avail_data in availabilities_data:
#                 Availability.objects.create(coach=instance, **avail_data)

#         return instance



class CoachProfileSerializer(serializers.ModelSerializer):
    certifications = CertificationSerializer(many=True, required=False)
    client_pictures = ClientPictureSerializer(many=True, required=False)
    coach_pictures = CoachPictureSerializer(many=True, required=False)
    availabilities = AvailabilitySerializer(many=True, required=False)
    country = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()

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

    def get_country(self, obj):
        if obj.country:
            return {'id': obj.country.id, 'name': obj.country.name}
        return None

    def get_region(self, obj):
        if obj.region:
            return {'id': obj.region.id, 'name': obj.region.name}
        return None

    def get_city(self, obj):
        if obj.city:
            return {'id': obj.city.id, 'name': obj.city.name}
        return None

    def create(self, validated_data):
        certifications_data = validated_data.pop('certifications', None)
        client_pictures_data = validated_data.pop('client_pictures', None)
        coach_pictures_data = validated_data.pop('coach_pictures', None)
        availabilities_data = validated_data.pop('availabilities', None)

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
                Availability.objects.create(coach_profile=coach_profile, **avail_data)

        return coach_profile

    def update(self, instance, validated_data):
        certifications_data = validated_data.pop('certifications', None)
        client_pictures_data = validated_data.pop('client_pictures', None)
        coach_pictures_data = validated_data.pop('coach_pictures', None)
        availabilities_data = validated_data.pop('availabilities', None)

        instance = super().update(instance, validated_data)

        if certifications_data is not None:
            instance.certifications.all().delete()
            for cert_data in certifications_data:
                Certification.objects.create(coach_profile=instance, **cert_data)

        if client_pictures_data is not None:
            instance.client_pictures.all().delete()
            for pic_data in client_pictures_data:
                ClientPicture.objects.create(coach_profile=instance, **pic_data)

        if coach_pictures_data is not None:
            instance.coach_pictures.all().delete()
            for pic_data in coach_pictures_data:
                CoachPicture.objects.create(coach_profile=instance, **pic_data)

        if availabilities_data is not None:
            instance.availabilities.all().delete()
            for avail_data in availabilities_data:
                Availability.objects.create(coach_profile=instance, **avail_data)

        return instance

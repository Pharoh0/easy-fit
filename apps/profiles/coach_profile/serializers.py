from rest_framework import serializers
from .models import CoachProfile, Certification, ClientPicture, CoachPicture
from cities_light.models import Country, Region, City

from django.contrib.auth import get_user_model

CustomUser = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser  # Assuming you have a custom user model
        fields = ['id', 'username']
        
        
class CertificationSerializer(serializers.ModelSerializer):
    # coach_profile = serializers.PrimaryKeyRelatedField(queryset=CoachProfile.objects.all())

    class Meta:
        model = Certification
        # fields = ['id', 'coach_profile', 'file', 'description']
        fields = ['id', 'file', 'description']

    def __init__(self, *args, **kwargs):
        super(CertificationSerializer, self).__init__(*args, **kwargs)
        if self.instance:
            # If the instance exists (we're updating), make the image field not required
            self.fields['file'].required = False


class ClientPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPicture
        # fields = ['id', 'coach_profile','image', 'description']
        fields = ['id', 'image', 'description']
        
    
    def __init__(self, *args, **kwargs):
        super(ClientPictureSerializer, self).__init__(*args, **kwargs)
        if self.instance:
            # If the instance exists (we're updating), make the image field not required
            self.fields['image'].required = False
        
    
        

class CoachPictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachPicture
        # fields = ['id', 'coach_profile','image', 'description']
        fields = ['id', 'image', 'description']
        
    def __init__(self, *args, **kwargs):
        super(CoachPictureSerializer, self).__init__(*args, **kwargs)
        if self.instance:
            # If the instance exists (we're updating), make the image field not required
            self.fields['image'].required = False



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
    country = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    user = UserSerializer(read_only=True)  # Include the user serializer
    # Expose rating fields with fallback to rating_stats when not annotated
    rating = serializers.SerializerMethodField()
    total_ratings = serializers.SerializerMethodField()
    

    class Meta:
        model = CoachProfile
        fields = [
            'id', 'user', 'avatar', 'bio', 'years_of_experience', 'country', 'region', 'city', 
            'locations', 'specialties', 'hourly_rate', 
            'facebook_profile_url', 'instagram_profile_url', 'twitter_profile_url', 
            'youtube_profile_url', 'tiktok_profilel_url', 'linkedin_profile_url', 
            'certifications', 'client_pictures', 'coach_pictures',
            # annotated fields
            'rating', 'total_ratings'
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

        return coach_profile

    def update(self, instance, validated_data):
        certifications_data = validated_data.pop('certifications', None)
        client_pictures_data = validated_data.pop('client_pictures', None)
        coach_pictures_data = validated_data.pop('coach_pictures', None)

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

        return instance

    # ----- Rating helpers -----
    def get_rating(self, obj):
        try:
            if hasattr(obj, 'rating') and obj.rating is not None:
                return float(obj.rating)
            stats = getattr(obj, 'rating_stats', None)
            if stats and getattr(stats, 'average_overall_rating', None) is not None:
                return float(stats.average_overall_rating)
        except Exception:
            pass
        return 0.0

    def get_total_ratings(self, obj):
        try:
            if hasattr(obj, 'total_ratings') and obj.total_ratings is not None:
                return int(obj.total_ratings)
            stats = getattr(obj, 'rating_stats', None)
            if stats and getattr(stats, 'total_ratings', None) is not None:
                return int(stats.total_ratings)
        except Exception:
            pass
        return 0


# country ,city and regions

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['id', 'name']

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'name', 'country']

class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'name', 'region']


class CoachProfileMinimalSerializer(serializers.ModelSerializer):
    """A simplified version of the CoachProfile serializer for use in client modules"""
    username = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachProfile
        fields = [
            'id', 'username', 'full_name', 'avatar', 'specialties', 
            'years_of_experience', 'hourly_rate'
        ]
    
    def get_username(self, obj):
        return obj.user.username
    
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

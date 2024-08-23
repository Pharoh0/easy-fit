from django.db import models
from apps.auth_users.models import CustomUser
from ..choices  import DAYS_OF_WEEK, GENDER_CHOICES
from cities_light.models import Country, City, Region
from django.contrib.auth import get_user_model

User = get_user_model()

class CoachProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='coach_profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    # country = CountryField(null=True, blank=True)
    # city = models.CharField(max_length=255, null=True, blank=True)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True)
    locations = models.TextField(null=True, blank=True)
    # reviews = models.TextField(null=True, blank=True)
    specialties = models.TextField(null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    facebook_profile_url = models.TextField(null=True, blank=True)
    instagram_profile_url = models.TextField(null=True, blank=True)
    twitter_profile_url = models.TextField(null=True, blank=True)
    youtube_profile_url = models.TextField(null=True, blank=True)
    tiktok_profilel_url = models.TextField(null=True, blank=True)
    linkedin_profile_url = models.TextField(null=True, blank=True)



class Availability(models.Model):
    coach_profile = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"{self.day_of_week}: {self.start_time} - {self.end_time}"


class Certification(models.Model):
    coach_profile = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='certifications')
    file = models.FileField(upload_to='certifications/')
    description = models.CharField(max_length=255, null=True, blank=True)


class ClientPicture(models.Model):
    coach_profile = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='client_pictures')
    image = models.ImageField(upload_to='client_pictures/')
    description = models.CharField(max_length=255, null=True, blank=True)


class CoachPicture(models.Model):
    coach_profile = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='coach_pictures')
    image = models.ImageField(upload_to='coach_pictures/')
    description = models.CharField(max_length=255, null=True, blank=True)

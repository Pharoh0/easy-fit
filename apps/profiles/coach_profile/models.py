from django.db import models
from apps.auth_users.models import CustomUser
from ..choices  import DAYS_OF_WEEK, GENDER_CHOICES
from django_countries.fields import CountryField

class CoachProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='coach_profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    country = CountryField(null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    locations = models.TextField(null=True, blank=True)
    availability = models.ManyToManyField('Availability', related_name='coach_profiles', blank=True)
    reviews = models.TextField(null=True, blank=True)
    specialties = models.TextField(null=True, blank=True)
    expertise = models.CharField(max_length=255, null=True, blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)


class Availability(models.Model):
    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.CharField(max_length=10, choices=DAYS_OF_WEEK)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"{self.day_of_week}: {self.start_time} - {self.end_time}"

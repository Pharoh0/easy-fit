from django.db import models
from apps.auth_users.models import CustomUser
from ..choices import GENDER_CHOICES


class ClientProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='client_profile')
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_fat_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    waist_size = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    chest_size = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    health_conditions = models.TextField(null=True, blank=True)
    fitness_goals = models.TextField(null=True, blank=True)
    dietary_preferences = models.TextField(null=True, blank=True)

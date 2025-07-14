from django.db import models
from django.utils import timezone
from django.urls import reverse
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.auth_users.models import CustomUser
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import GENDER_CHOICES
import uuid


class ClientProfile(models.Model):
    """Enhanced Client Profile model with additional fields for better user experience"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='client_profile')
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Height in cm')
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Weight in kg')
    bmi = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_fat_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Health information
    health_conditions = models.TextField(null=True, blank=True)
    fitness_goals = models.TextField(null=True, blank=True)
    dietary_preferences = models.TextField(null=True, blank=True)
    allergies = models.TextField(null=True, blank=True, help_text='List any food allergies or intolerances')
    
    # Media and social
    avatar = models.ImageField(upload_to='clients/avatars/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='clients/covers/', null=True, blank=True)
    instagram = models.CharField(max_length=100, blank=True, null=True)
    facebook = models.CharField(max_length=100, blank=True, null=True)
    twitter = models.CharField(max_length=100, blank=True, null=True)
    
    # Activity tracking
    activity_level = models.CharField(max_length=20, blank=True, null=True, choices=[
        ('sedentary', 'Sedentary'),
        ('lightly_active', 'Lightly Active'),
        ('moderately_active', 'Moderately Active'),
        ('very_active', 'Very Active'),
        ('extremely_active', 'Extremely Active'),
    ])
    last_measurement_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def get_absolute_url(self):
        return reverse('client-profile-detail', kwargs={'pk': self.pk})
    
    def calculate_bmi(self):
        """Calculate BMI based on height and weight"""
        if self.height and self.weight and self.height > 0:
            height_in_meters = float(self.height) / 100
            bmi_value = float(self.weight) / (height_in_meters ** 2)
            self.bmi = round(bmi_value, 2)
            self.save(update_fields=['bmi'])
        return self.bmi
    
    def update_last_measurement_date(self):
        """Update the date when measurements were last recorded"""
        self.last_measurement_date = timezone.now().date()
        self.save(update_fields=['last_measurement_date'])


class ClientMeasurement(models.Model):
    """Track detailed body measurements for clients over time"""
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='measurements')
    date = models.DateField(default=timezone.now)
    
    # Basic measurements
    weight = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Weight in kg')
    height = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Height in cm')
    body_fat_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, 
                                        validators=[MinValueValidator(2), MaxValueValidator(60)])
    
    # Body measurements in cm
    chest = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    waist = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    hips = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    shoulders = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    arms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    forearms = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    thighs = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    calves = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    neck = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Additional health metrics
    body_water_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    bone_mass = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Bone mass in kg')
    muscle_mass = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text='Muscle mass in kg')
    visceral_fat = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    metabolic_age = models.PositiveIntegerField(null=True, blank=True)
    
    # Before/after photos
    front_photo = models.ImageField(upload_to='clients/measurements/front/', null=True, blank=True)
    side_photo = models.ImageField(upload_to='clients/measurements/side/', null=True, blank=True)
    back_photo = models.ImageField(upload_to='clients/measurements/back/', null=True, blank=True)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.client.user.username}'s Measurements on {self.date}"
    
    class Meta:
        ordering = ['-date']
        get_latest_by = 'date'


class ClientDietRequest(models.Model):
    """Client requests for diet plans that coaches can respond to"""
    STATUS_CHOICES = [
        ('open', 'Open for Offers'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='diet_requests')
    title = models.CharField(max_length=100)
    description = models.TextField()
    goals = models.TextField(help_text='What are your fitness and diet goals?')
    dietary_restrictions = models.TextField(blank=True, null=True, help_text='Any allergies or foods to avoid')
    budget = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Your budget for this plan')
    duration_weeks = models.PositiveIntegerField(default=4, help_text='Desired duration of the plan in weeks')
    
    # Allow client to share their measurements
    share_measurements = models.BooleanField(default=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} by {self.client.user.username}"
    
    class Meta:
        ordering = ['-created_at']


class CoachOffer(models.Model):
    """Offers from coaches in response to client diet requests"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    request = models.ForeignKey(ClientDietRequest, on_delete=models.CASCADE, related_name='offers')
    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='offers')
    title = models.CharField(max_length=100)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration_weeks = models.PositiveIntegerField(help_text='Duration of the plan in weeks')
    
    # What's included
    includes_meal_plan = models.BooleanField(default=True)
    includes_workout_plan = models.BooleanField(default=False)
    includes_video_consultations = models.BooleanField(default=False)
    num_consultations = models.PositiveIntegerField(default=0)
    
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Offer by {self.coach.user.username} for {self.request.title}"
    
    class Meta:
        ordering = ['-created_at']


class ClientSubscription(models.Model):
    """Track client subscriptions to coach plans"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='subscriptions')
    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='client_subscriptions')
    offer = models.OneToOneField(CoachOffer, on_delete=models.SET_NULL, null=True, related_name='subscription')
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    price_paid = models.DecimalField(max_digits=8, decimal_places=2)
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.client.user.username}'s subscription with {self.coach.user.username}"
    
    class Meta:
        ordering = ['-start_date']


class ProgressReport(models.Model):
    """Track client progress in their fitness journey"""
    subscription = models.ForeignKey(ClientSubscription, on_delete=models.CASCADE, related_name='progress_reports')
    measurement = models.ForeignKey(ClientMeasurement, on_delete=models.SET_NULL, null=True, blank=True)
    report_date = models.DateField(default=timezone.now)
    
    # Weight changes
    weight_change = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    body_fat_change = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Progress assessment
    client_notes = models.TextField(blank=True, null=True, help_text='Client\'s assessment of their progress')
    coach_feedback = models.TextField(blank=True, null=True, help_text='Coach\'s feedback on client progress')
    satisfaction_rating = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Media
    progress_photo = models.ImageField(upload_to='clients/progress/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Progress Report for {self.subscription.client.user.username} on {self.report_date}"
    
    class Meta:
        ordering = ['-report_date']


class BodyPart(models.Model):
    """Define body parts that can be measured"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100, blank=True, null=True, help_text='User-friendly display name')
    description = models.TextField(null=True, blank=True)
    image_coordinates = models.JSONField(null=True, blank=True, 
                                        help_text="Coordinates for display on body diagram [x, y] as percentage of image size")
    category = models.CharField(max_length=50, blank=True, null=True, 
                             choices=[('upper_body', 'Upper Body'), 
                                     ('lower_body', 'Lower Body'),
                                     ('core', 'Core'),
                                     ('other', 'Other')])
    sort_order = models.PositiveIntegerField(default=0, help_text='Order for display in UI')
    is_default = models.BooleanField(default=False, help_text='Whether this is a default body part')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

    class Meta:
        ordering = ['category', 'sort_order', 'name']


class BodyPartMeasurement(models.Model):
    """Individual body part measurement linked to client measurement"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    measurement = models.ForeignKey(ClientMeasurement, on_delete=models.CASCADE, related_name='body_part_measurements')
    body_part = models.ForeignKey(BodyPart, on_delete=models.CASCADE, related_name='measurements')
    value = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.CharField(max_length=10, default='cm', 
                          choices=[('cm', 'Centimeters'),
                                  ('in', 'Inches'),
                                  ('kg', 'Kilograms'),
                                  ('lb', 'Pounds'),
                                  ('%', 'Percentage')])
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.body_part.name}: {self.value} {self.unit}"
        
    class Meta:
        ordering = ['body_part__category', 'body_part__sort_order']
        unique_together = ['measurement', 'body_part']
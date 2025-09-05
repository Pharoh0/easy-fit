from django.utils import timezone
from django.db import models
from django.core.exceptions import ValidationError
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import PLAN_TYPE_CHOICES, DIFFICULTY_CHOICES
from django.contrib.auth import get_user_model
from datetime import timedelta

User = get_user_model()

class ProductPlan(models.Model):
    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='plans')
    name = models.CharField(max_length=255)
    description = models.TextField()
    plan_type = models.CharField(max_length=10, choices=PLAN_TYPE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='plans/', null=True, blank=True)
    
    # Plan duration settings
    duration_days = models.PositiveIntegerField(default=30, help_text="Total duration of the plan in days")
    start_date = models.DateField()
    end_date = models.DateField()
    renewal_period = models.CharField(max_length=10, choices=[('weekly', 'Weekly'), ('monthly', 'Monthly')], default='monthly')
    
    # Plan structure settings
    difficulty_level = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='intermediate')
    workout_days_per_week = models.PositiveIntegerField(default=5, help_text="Number of workout days per week")
    rest_days_per_week = models.PositiveIntegerField(default=2, help_text="Number of rest days per week")
    meals_per_day = models.PositiveIntegerField(default=3, help_text="Number of main meals per day")
    snacks_per_day = models.PositiveIntegerField(default=2, help_text="Number of snacks per day")
    
    # Client capacity and pricing
    max_clients = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum number of clients for this plan (leave empty for unlimited)")
    price_per_session = models.DecimalField(max_digits=8, decimal_places=2)
    session_count = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True, help_text='Whether this plan is available for clients to browse and subscribe to')
    
    # Plan metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_price(self):
        return self.price_per_session * self.session_count
    
    def clean(self):
        # Ensure start_date is before end_date
        if self.start_date >= self.end_date:
            raise ValidationError("End date must be after the start date.")

        # Ensure start_date is not in the past
        if self.start_date < timezone.now().date():
            raise ValidationError("Start date cannot be in the past.")

    def save(self, *args, **kwargs):
        self.clean()  # Perform the validations before saving
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.name} by {self.coach.user.username}"


class PlanTemplate(models.Model):
    """Templates for quickly creating workouts or meal plans"""
    TEMPLATE_TYPE_CHOICES = [
        ('workout', 'Workout Template'),
        ('meal', 'Meal Template'),
        ('day', 'Full Day Template'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='templates')
    is_public = models.BooleanField(default=False, help_text="If true, other coaches can use this template")
    
    # Template metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"

class WorkoutTemplate(models.Model):
    """Workout template that can be applied to multiple days"""
    template = models.ForeignKey(PlanTemplate, on_delete=models.CASCADE, related_name='workout_templates')
    name = models.CharField(max_length=255)
    workout_type = models.CharField(max_length=30, choices=[
        ('strength_training', 'Strength Training'),
        ('cardio', 'Cardiovascular'),
        ('hiit', 'High-Intensity Interval Training'),
        ('yoga', 'Yoga'),
        ('pilates', 'Pilates'),
        ('stretching', 'Stretching'),
        ('sports', 'Sports Activity'),
        ('mixed', 'Mixed Training'),
    ])
    duration_minutes = models.PositiveIntegerField()
    intensity_level = models.CharField(max_length=20, choices=[
        ('low', 'Low Intensity'),
        ('moderate', 'Moderate Intensity'),
        ('high', 'High Intensity'),
        ('very_high', 'Very High Intensity'),
    ])
    instructions = models.TextField(blank=True)
    equipment_needed = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} - {self.template.name}"

class ExerciseTemplate(models.Model):
    """Exercise template that can be used in workout templates"""
    workout_template = models.ForeignKey(WorkoutTemplate, on_delete=models.CASCADE, related_name='exercise_templates')
    exercise_name = models.CharField(max_length=255)
    exercise_category = models.CharField(max_length=30, choices=[
        ('chest', 'Chest'),
        ('back', 'Back'),
        ('shoulders', 'Shoulders'),
        ('arms', 'Arms'),
        ('legs', 'Legs'),
        ('core', 'Core'),
        ('cardio', 'Cardio'),
        ('full_body', 'Full Body'),
        ('flexibility', 'Flexibility'),
    ])
    sets = models.PositiveIntegerField(default=3)
    reps = models.CharField(max_length=50, help_text="e.g., '8-12' or '30 seconds'")
    rest_seconds = models.PositiveIntegerField(default=60)
    order = models.PositiveIntegerField()
    instructions = models.TextField(blank=True)
    demonstration_video = models.FileField(upload_to='exercise_templates/videos/', null=True, blank=True)
    demonstration_image = models.ImageField(upload_to='exercise_templates/images/', null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if self.order is None:
            last_exercise = ExerciseTemplate.objects.filter(workout_template=self.workout_template).order_by('-order').first()
            self.order = last_exercise.order + 1 if last_exercise else 1
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.exercise_name} - {self.workout_template.name}"
    
    class Meta:
        ordering = ['order']

class MealTemplate(models.Model):
    """Meal template model for creating meal plans"""
    template = models.ForeignKey(PlanTemplate, on_delete=models.CASCADE, related_name='meal_templates')
    meal_name = models.CharField(max_length=255)
    meal_type = models.CharField(max_length=20, choices=[
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
        ('pre_workout', 'Pre-Workout'),
        ('post_workout', 'Post-Workout'),
    ])
    # Added category field
    category = models.CharField(max_length=100, blank=True, help_text="Category such as High Protein, Vegetarian, etc.")
    calories = models.PositiveIntegerField()
    protein_grams = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_grams = models.DecimalField(max_digits=6, decimal_places=2)
    fats_grams = models.DecimalField(max_digits=6, decimal_places=2)
    preparation_time_minutes = models.PositiveIntegerField(default=15)
    cooking_time_minutes = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True, help_text="Detailed description of the meal")
    recipe = models.TextField(blank=True)
    # Keep for backwards compatibility but mark as deprecated
    meal_image = models.ImageField(upload_to='meal_templates/', null=True, blank=True)
    meal_videos = models.ManyToManyField('MealTemplateVideo', blank=True)
    meal_images = models.ManyToManyField('MealTemplateImage', blank=True)
    
    def __str__(self):
        return f"{self.meal_name} - {self.template.name}"

class MealTemplateVideo(models.Model):
    video = models.FileField(upload_to='meal_templates/videos/')

class MealTemplateImage(models.Model):
    image = models.ImageField(upload_to='meal_templates/images/')

class MealTemplateIngredient(models.Model):
    """Ingredients for meal templates"""
    meal_template = models.ForeignKey(MealTemplate, on_delete=models.CASCADE, related_name='ingredients')
    name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=50)  # grams, cups, tablespoons, etc.
    category = models.CharField(max_length=100, blank=True, help_text="Food category like Protein, Carbs, etc.")
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.quantity} {self.unit} {self.name}"
    
    class Meta:
        ordering = ['id']


class PlanItem(models.Model):
    """Individual items within a product plan"""
    plan = models.ForeignKey(ProductPlan, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField()
    media = models.FileField(upload_to='plan_items_media/', blank=True, null=True)  # For video demonstrations or images
    
    def save(self, *args, **kwargs):
        if self.order is None:
            # Assign the next order value if it's not provided
            last_item = PlanItem.objects.filter(plan=self.plan).order_by('-order').first()
            self.order = last_item.order + 1 if last_item else 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.plan.name})'

    class Meta:
        ordering = ['order']
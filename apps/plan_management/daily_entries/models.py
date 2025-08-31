from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


class PlanDay(models.Model):
    """Represents a single day in a plan with enhanced structure"""
    subscription = models.ForeignKey('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='plan_days')
    
    # Day identification
    day_number = models.PositiveIntegerField()  # Day 1, 2, 3... of the plan
    scheduled_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)  # When actually completed
    
    # Day structure
    day_title = models.CharField(max_length=255)
    day_description = models.TextField(blank=True)
    day_theme = models.CharField(max_length=100, blank=True)  # e.g., "Upper Body Focus", "Cardio Day"
    
    # Completion tracking
    completion_status = models.CharField(max_length=20, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
        ('rescheduled', 'Rescheduled'),
    ], default='not_started')
    
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Coach and client interaction
    coach_instructions = models.TextField(blank=True, help_text="Special instructions from coach")
    coach_notes = models.TextField(blank=True, help_text="Coach's private notes")
    client_feedback = models.TextField(blank=True, help_text="Client's feedback after completion")
    client_rating = models.PositiveSmallIntegerField(null=True, blank=True, 
                                                   validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Difficulty and intensity
    planned_difficulty = models.CharField(max_length=20, choices=[
        ('very_easy', 'Very Easy'),
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('hard', 'Hard'),
        ('very_hard', 'Very Hard'),
    ], default='moderate')
    
    actual_difficulty = models.CharField(max_length=20, choices=[
        ('very_easy', 'Very Easy'),
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('hard', 'Hard'),
        ('very_hard', 'Very Hard'),
    ], null=True, blank=True)
    
    # Time tracking
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    actual_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"Day {self.day_number}: {self.day_title} ({self.subscription.product_plan.name})"
    
    @property
    def is_overdue(self):
        """Check if the day is overdue"""
        if self.completion_status in ['completed', 'skipped']:
            return False
        return timezone.now().date() > self.scheduled_date
    
    def mark_completed(self):
        """Mark the day as completed"""
        self.completion_status = 'completed'
        self.completed_at = timezone.now()
        self.actual_date = timezone.now().date()
        self.completion_percentage = 100.00
        self.save()
    
    class Meta:
        unique_together = ['subscription', 'day_number']
        ordering = ['day_number']


class NutritionPlan(models.Model):
    """Daily nutrition plan with comprehensive tracking"""
    plan_day = models.OneToOneField(PlanDay, on_delete=models.CASCADE, related_name='nutrition_plan')
    
    # Daily nutrition targets
    target_calories = models.PositiveIntegerField()
    target_protein_grams = models.DecimalField(max_digits=6, decimal_places=2)
    target_carbs_grams = models.DecimalField(max_digits=6, decimal_places=2)
    target_fats_grams = models.DecimalField(max_digits=6, decimal_places=2)
    target_fiber_grams = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    target_water_liters = models.DecimalField(max_digits=4, decimal_places=2, default=2.5)
    
    # Actual consumption (filled by client)
    actual_calories = models.PositiveIntegerField(null=True, blank=True)
    actual_protein_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_carbs_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_fats_grams = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_fiber_grams = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    actual_water_liters = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    # Special dietary considerations
    dietary_restrictions = models.TextField(blank=True)
    special_notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"Nutrition Plan for {self.plan_day}"
    
    @property
    def calorie_adherence_percentage(self):
        """Calculate calorie adherence percentage"""
        if not self.actual_calories:
            return 0
        return min(100, (self.actual_calories / self.target_calories) * 100)


class MealPlan(models.Model):
    """Individual meal within a nutrition plan"""
    nutrition_plan = models.ForeignKey(NutritionPlan, on_delete=models.CASCADE, related_name='meals')
    
    # Meal identification
    meal_type = models.CharField(max_length=20, choices=[
        ('breakfast', 'Breakfast'),
        ('mid_morning_snack', 'Mid-Morning Snack'),
        ('lunch', 'Lunch'),
        ('afternoon_snack', 'Afternoon Snack'),
        ('dinner', 'Dinner'),
        ('evening_snack', 'Evening Snack'),
        ('pre_workout', 'Pre-Workout'),
        ('post_workout', 'Post-Workout'),
    ])
    meal_order = models.PositiveSmallIntegerField()
    
    # Meal details
    meal_name = models.CharField(max_length=255)
    meal_description = models.TextField()
    recipe_instructions = models.TextField(blank=True)
    preparation_time_minutes = models.PositiveIntegerField()
    cooking_time_minutes = models.PositiveIntegerField(default=0)
    
    # Nutritional information
    calories_per_serving = models.PositiveIntegerField()
    protein_grams = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_grams = models.DecimalField(max_digits=6, decimal_places=2)
    fats_grams = models.DecimalField(max_digits=6, decimal_places=2)
    fiber_grams = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sugar_grams = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sodium_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    # Serving information
    servings_count = models.PositiveSmallIntegerField(default=1)
    serving_size_description = models.CharField(max_length=100, blank=True)
    
    # Enhanced media content
    meal_image = models.ImageField(upload_to='meal_plans/images/', null=True, blank=True, 
                                help_text="Main image of the prepared meal")
    additional_images = models.JSONField(null=True, blank=True, 
                                      help_text="Additional images of preparation steps or plating")
    recipe_video = models.FileField(upload_to='meal_plans/videos/', null=True, blank=True, 
                                 help_text="Video showing meal preparation")
    recipe_video_url = models.URLField(blank=True, help_text="External video URL for recipe")
    
    # Dietary information
    dietary_tags = models.JSONField(null=True, blank=True, 
                                 help_text="Tags like 'vegan', 'gluten-free', 'keto-friendly', etc.")
    allergens = models.CharField(max_length=255, blank=True, 
                             help_text="Common allergens present in this meal")
    
    # Nutrition timing
    recommended_timing = models.CharField(max_length=100, blank=True, 
                                      help_text="Best time to consume this meal, e.g., '1 hour before workout'")
    
    # Shopping and preparation
    grocery_list = models.TextField(blank=True, help_text="Ingredients to buy for this meal")
    meal_prep_tips = models.TextField(blank=True, help_text="Tips for meal prepping or batch cooking")
    
    # Completion tracking
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    client_rating = models.PositiveSmallIntegerField(null=True, blank=True,
                                                   validators=[MinValueValidator(1), MaxValueValidator(5)])
    client_notes = models.TextField(blank=True)
    client_photo = models.ImageField(upload_to='meal_plans/client_photos/', null=True, blank=True, 
                                  help_text="Client can upload a photo of their prepared meal")
    
    # Alternatives and substitutions
    alternative_options = models.TextField(blank=True, help_text="Alternative meal options")
    ingredient_substitutions = models.JSONField(null=True, blank=True, 
                                           help_text="Possible substitutions for specific ingredients")
    
    def __str__(self):
        return f"{self.meal_name} ({self.meal_type}) - {self.nutrition_plan.plan_day}"
    
    def mark_completed(self):
        """Mark meal as completed"""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save()
    
    class Meta:
        ordering = ['meal_order']


class MealIngredient(models.Model):
    """Individual ingredients for meals"""
    meal = models.ForeignKey(MealPlan, on_delete=models.CASCADE, related_name='ingredients')
    
    ingredient_name = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=8, decimal_places=2)
    unit = models.CharField(max_length=50)  # grams, cups, tablespoons, etc.
    
    # Nutritional contribution
    calories_contribution = models.PositiveIntegerField(null=True, blank=True)
    protein_contribution = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    # Optional details
    brand_preference = models.CharField(max_length=100, blank=True)
    substitution_options = models.TextField(blank=True)
    is_optional = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.quantity} {self.unit} {self.ingredient_name}"
    
    class Meta:
        ordering = ['id']


class WorkoutPlan(models.Model):
    """Daily workout plan with comprehensive structure"""
    plan_day = models.OneToOneField(PlanDay, on_delete=models.CASCADE, related_name='workout_plan')
    
    # Workout overview
    workout_name = models.CharField(max_length=255)
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
    
    # Workout structure
    warm_up_duration_minutes = models.PositiveIntegerField(default=10)
    main_workout_duration_minutes = models.PositiveIntegerField()
    cool_down_duration_minutes = models.PositiveIntegerField(default=10)
    total_duration_minutes = models.PositiveIntegerField()
    
    # Intensity and targets
    intensity_level = models.CharField(max_length=20, choices=[
        ('low', 'Low Intensity'),
        ('moderate', 'Moderate Intensity'),
        ('high', 'High Intensity'),
        ('very_high', 'Very High Intensity'),
    ])
    
    target_calories_burn = models.PositiveIntegerField(null=True, blank=True)
    target_heart_rate_zone = models.CharField(max_length=50, blank=True)
    
    # Equipment and location
    required_equipment = models.TextField(blank=True)
    location_type = models.CharField(max_length=20, choices=[
        ('gym', 'Gym'),
        ('home', 'Home'),
        ('outdoor', 'Outdoor'),
        ('anywhere', 'Anywhere'),
    ], default='anywhere')
    
    # Media and guidance
    workout_video_url = models.URLField(blank=True)
    workout_image = models.ImageField(upload_to='workout_plans/', null=True, blank=True)
    special_instructions = models.TextField(blank=True)
    
    # Completion tracking
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    actual_calories_burned = models.PositiveIntegerField(null=True, blank=True)
    client_effort_rating = models.PositiveSmallIntegerField(null=True, blank=True,
                                                          validators=[MinValueValidator(1), MaxValueValidator(10)])
    client_notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.workout_name} - {self.plan_day}"
    
    def mark_completed(self):
        """Mark workout as completed"""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.save()


class ExerciseBlock(models.Model):
    """Exercise blocks within a workout (e.g., warm-up, main sets, cool-down)"""
    workout_plan = models.ForeignKey(WorkoutPlan, on_delete=models.CASCADE, related_name='exercise_blocks')
    
    block_name = models.CharField(max_length=255)
    block_type = models.CharField(max_length=20, choices=[
        ('warm_up', 'Warm-up'),
        ('main_set', 'Main Set'),
        ('superset', 'Superset'),
        ('circuit', 'Circuit'),
        ('cool_down', 'Cool-down'),
        ('stretching', 'Stretching'),
    ])
    
    block_order = models.PositiveSmallIntegerField()
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    rest_between_exercises_seconds = models.PositiveIntegerField(default=60)
    
    # Block-specific instructions
    instructions = models.TextField(blank=True)
    is_completed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.block_name} ({self.block_type}) - {self.workout_plan}"
    
    class Meta:
        ordering = ['block_order']


class Exercise(models.Model):
    """Individual exercises within exercise blocks"""
    exercise_block = models.ForeignKey(ExerciseBlock, on_delete=models.CASCADE, related_name='exercises')
    
    # Exercise identification
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
    
    exercise_order = models.PositiveSmallIntegerField()
    
    # Exercise parameters
    sets_count = models.PositiveIntegerField()
    reps_per_set = models.PositiveIntegerField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)  # For time-based exercises
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    distance_meters = models.PositiveIntegerField(null=True, blank=True)  # For cardio
    
    # Rest and tempo
    rest_between_sets_seconds = models.PositiveIntegerField(default=60)
    tempo_description = models.CharField(max_length=50, blank=True)  # e.g., "2-1-2-1"
    
    # Exercise guidance
    form_instructions = models.TextField(blank=True)
    common_mistakes = models.TextField(blank=True)
    modifications = models.TextField(blank=True)
    
    # Media content - enhanced to support multiple formats
    demonstration_video = models.FileField(upload_to='exercise_demos/videos/', null=True, blank=True, 
                                        help_text="Upload demonstration video for this exercise")
    demonstration_video_url = models.URLField(blank=True, help_text="External video URL (YouTube, Vimeo, etc.)")
    demonstration_image = models.ImageField(upload_to='exercise_demos/images/', null=True, blank=True, 
                                         help_text="Upload image showing proper form")
    secondary_images = models.JSONField(null=True, blank=True, 
                                     help_text="Additional images showing different angles or steps")
    
    # Additional guidance resources
    animation_url = models.URLField(blank=True, help_text="Link to animated demonstration if available")
    detailed_instructions_url = models.URLField(blank=True, help_text="Link to detailed instructions or article")
    
    # Equipment details
    equipment_needed = models.TextField(blank=True, help_text="Specific equipment needed for this exercise")
    equipment_alternatives = models.TextField(blank=True, help_text="Alternative equipment options that can be used")
    
    # Muscle targeting
    primary_muscles = models.CharField(max_length=255, blank=True, help_text="Primary muscles targeted")
    secondary_muscles = models.CharField(max_length=255, blank=True, help_text="Secondary muscles engaged")
    
    # Completion tracking
    is_completed = models.BooleanField(default=False)
    actual_sets_completed = models.PositiveIntegerField(null=True, blank=True)
    actual_reps_completed = models.PositiveIntegerField(null=True, blank=True)
    actual_weight_used = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    perceived_difficulty = models.PositiveSmallIntegerField(null=True, blank=True, 
                                                       help_text="Client's perceived difficulty (1-10)")
    
    def __str__(self):
        return f"{self.exercise_name} - {self.exercise_block}"
    
    class Meta:
        ordering = ['exercise_order']

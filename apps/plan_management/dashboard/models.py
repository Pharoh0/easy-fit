from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class PlanProgress(models.Model):
    """Track overall plan progress"""
    subscription = models.OneToOneField('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='progress')
    
    # Completion metrics
    total_days = models.PositiveIntegerField()
    completed_days = models.PositiveIntegerField(default=0)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Consistency metrics
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    
    # Engagement metrics
    total_meals_completed = models.PositiveIntegerField(default=0)
    total_workouts_completed = models.PositiveIntegerField(default=0)
    total_calories_burned = models.PositiveIntegerField(default=0)
    
    # Time tracking
    average_daily_time_minutes = models.PositiveIntegerField(default=0)
    total_time_spent_minutes = models.PositiveIntegerField(default=0)
    
    # Performance metrics
    adherence_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)  # Percentage
    improvement_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    last_updated = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Progress for {self.subscription.product_plan.name} - {self.completion_percentage}%"
    
    def update_progress(self):
        """Recalculate progress metrics"""
        from ..daily_entries.models import PlanDay
        
        plan_days = PlanDay.objects.filter(subscription=self.subscription)
        completed_days = plan_days.filter(completion_status='completed')
        
        self.total_days = plan_days.count()
        self.completed_days = completed_days.count()
        self.completion_percentage = (self.completed_days / self.total_days * 100) if self.total_days > 0 else 0
        
        # Calculate streaks
        self._calculate_streaks()
        
        # Update engagement metrics
        self._update_engagement_metrics()
        
        # Calculate adherence rate
        scheduled_days = plan_days.filter(scheduled_date__lte=timezone.now().date()).count()
        self.adherence_rate = (self.completed_days / scheduled_days * 100) if scheduled_days > 0 else 0
        
        self.save()
    
    def _calculate_streaks(self):
        """Calculate current and longest streaks"""
        from ..daily_entries.models import PlanDay
        
        plan_days = PlanDay.objects.filter(
            subscription=self.subscription,
            scheduled_date__lte=timezone.now().date()
        ).order_by('-scheduled_date')
        
        current_streak = 0
        longest_streak = 0
        temp_streak = 0
        
        for day in plan_days:
            if day.completion_status == 'completed':
                temp_streak += 1
                if current_streak == 0:  # First completed day from recent
                    current_streak = temp_streak
            else:
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
                temp_streak = 0
                if current_streak == 0:  # Break in recent streak
                    break
        
        # Check if temp_streak is the longest
        if temp_streak > longest_streak:
            longest_streak = temp_streak
        
        self.current_streak = current_streak
        self.longest_streak = longest_streak
    
    def _update_engagement_metrics(self):
        """Update meal and workout completion counts"""
        from ..daily_entries.models import MealPlan, WorkoutPlan
        
        # Count completed meals
        self.total_meals_completed = MealPlan.objects.filter(
            nutrition_plan__plan_day__subscription=self.subscription,
            is_completed=True
        ).count()
        
        # Count completed workouts and calories burned
        completed_workouts = WorkoutPlan.objects.filter(
            plan_day__subscription=self.subscription,
            is_completed=True
        )
        
        self.total_workouts_completed = completed_workouts.count()
        self.total_calories_burned = completed_workouts.aggregate(
            total=models.Sum('actual_calories_burned')
        )['total'] or 0
    
    class Meta:
        verbose_name = "Plan Progress"
        verbose_name_plural = "Plan Progress"


class DailyProgressLog(models.Model):
    """Daily progress snapshots"""
    progress = models.ForeignKey(PlanProgress, on_delete=models.CASCADE, related_name='daily_logs')
    date = models.DateField()
    
    # Daily metrics
    meals_completed = models.PositiveIntegerField(default=0)
    workouts_completed = models.PositiveIntegerField(default=0)
    calories_burned = models.PositiveIntegerField(default=0)
    time_spent_minutes = models.PositiveIntegerField(default=0)
    
    # Mood and energy (1-5 scale)
    energy_level = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    mood_rating = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Wellness tracking
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    water_intake_liters = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    stress_level = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)])
    
    # Notes
    daily_notes = models.TextField(blank=True)
    achievements = models.TextField(blank=True)
    challenges = models.TextField(blank=True)
    
    # Completion status
    day_completed = models.BooleanField(default=False)
    completion_time = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Daily Log - {self.date} ({self.progress.subscription.product_plan.name})"
    
    @property
    def overall_day_rating(self):
        """Calculate overall day rating based on energy and mood"""
        if self.energy_level and self.mood_rating:
            return (self.energy_level + self.mood_rating) / 2
        return None
    
    class Meta:
        unique_together = ['progress', 'date']
        ordering = ['-date']


class PlanMilestone(models.Model):
    """Achievement milestones"""
    subscription = models.ForeignKey('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='milestones')
    milestone_type = models.CharField(max_length=30, choices=[
        ('first_week', 'First Week Complete'),
        ('halfway_point', 'Halfway Point'),
        ('consistency_streak', 'Consistency Streak'),
        ('weight_goal', 'Weight Goal Achieved'),
        ('plan_completion', 'Plan Completed'),
        ('perfect_week', 'Perfect Week'),
        ('month_milestone', 'One Month Complete'),
        ('improvement_milestone', 'Significant Improvement'),
    ])
    title = models.CharField(max_length=255)
    description = models.TextField()
    achieved_at = models.DateTimeField()
    badge_icon = models.CharField(max_length=50, blank=True)  # Font Awesome icon class
    
    # Milestone metadata
    milestone_value = models.PositiveIntegerField(null=True, blank=True)  # e.g., streak length, weight lost
    is_shared = models.BooleanField(default=False)  # Whether client shared this milestone
    
    def __str__(self):
        return f"{self.title} - {self.subscription.client.username}"
    
    class Meta:
        ordering = ['-achieved_at']


class WeeklyProgressSummary(models.Model):
    """Weekly aggregated progress summaries"""
    progress = models.ForeignKey(PlanProgress, on_delete=models.CASCADE, related_name='weekly_summaries')
    week_start_date = models.DateField()
    week_end_date = models.DateField()
    
    # Weekly metrics
    days_completed = models.PositiveIntegerField(default=0)
    total_days_scheduled = models.PositiveIntegerField(default=0)
    weekly_completion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Engagement metrics
    total_meals_completed = models.PositiveIntegerField(default=0)
    total_workouts_completed = models.PositiveIntegerField(default=0)
    total_calories_burned = models.PositiveIntegerField(default=0)
    total_time_spent_minutes = models.PositiveIntegerField(default=0)
    
    # Wellness averages
    average_energy_level = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    average_mood_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    average_sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    # Performance indicators
    consistency_score = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    improvement_from_previous_week = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Week {self.week_start_date} - {self.progress.subscription.product_plan.name}"
    
    def calculate_weekly_metrics(self):
        """Calculate all weekly metrics from daily logs"""
        daily_logs = self.progress.daily_logs.filter(
            date__range=[self.week_start_date, self.week_end_date]
        )
        
        if not daily_logs.exists():
            return
        
        # Basic completion metrics
        self.days_completed = daily_logs.filter(day_completed=True).count()
        self.total_days_scheduled = daily_logs.count()
        self.weekly_completion_rate = (self.days_completed / self.total_days_scheduled * 100) if self.total_days_scheduled > 0 else 0
        
        # Engagement metrics
        self.total_meals_completed = daily_logs.aggregate(total=models.Sum('meals_completed'))['total'] or 0
        self.total_workouts_completed = daily_logs.aggregate(total=models.Sum('workouts_completed'))['total'] or 0
        self.total_calories_burned = daily_logs.aggregate(total=models.Sum('calories_burned'))['total'] or 0
        self.total_time_spent_minutes = daily_logs.aggregate(total=models.Sum('time_spent_minutes'))['total'] or 0
        
        # Wellness averages
        self.average_energy_level = daily_logs.aggregate(avg=models.Avg('energy_level'))['avg']
        self.average_mood_rating = daily_logs.aggregate(avg=models.Avg('mood_rating'))['avg']
        self.average_sleep_hours = daily_logs.aggregate(avg=models.Avg('sleep_hours'))['avg']
        
        # Consistency score (based on completion rate and regularity)
        self.consistency_score = self.weekly_completion_rate
        
        self.save()
    
    class Meta:
        unique_together = ['progress', 'week_start_date']
        ordering = ['-week_start_date']


class GoalTracking(models.Model):
    """Track specific goals within plans"""
    subscription = models.ForeignKey('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='goals')
    
    GOAL_TYPES = [
        ('weight_loss', 'Weight Loss'),
        ('weight_gain', 'Weight Gain'),
        ('muscle_gain', 'Muscle Gain'),
        ('endurance', 'Endurance Improvement'),
        ('strength', 'Strength Improvement'),
        ('flexibility', 'Flexibility Improvement'),
        ('habit_formation', 'Habit Formation'),
        ('custom', 'Custom Goal'),
    ]
    
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # Goal parameters
    target_value = models.DecimalField(max_digits=10, decimal_places=2)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    unit = models.CharField(max_length=50)  # kg, lbs, minutes, reps, etc.
    
    # Timeline
    start_date = models.DateField()
    target_date = models.DateField()
    achieved_date = models.DateField(null=True, blank=True)
    
    # Status
    is_achieved = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Progress tracking
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.progress_percentage}%"
    
    def update_progress(self, new_value):
        """Update goal progress"""
        self.current_value = new_value
        
        # Calculate progress percentage
        if self.target_value > 0:
            self.progress_percentage = min(100, (self.current_value / self.target_value) * 100)
        
        # Check if goal is achieved
        if self.current_value >= self.target_value and not self.is_achieved:
            self.is_achieved = True
            self.achieved_date = timezone.now().date()
        
        self.save()
    
    @property
    def days_remaining(self):
        """Calculate days remaining to achieve goal"""
        if self.is_achieved:
            return 0
        return (self.target_date - timezone.now().date()).days
    
    class Meta:
        ordering = ['-created_at']

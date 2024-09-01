from django.db import models
from apps.auth_users.models import CustomUser
from apps.profiles.coach_profile.models import CoachProfile
from django.contrib.auth import get_user_model

User = get_user_model()

class ProductPlan(models.Model):
    PLAN_TYPE_CHOICES = (
        ('workout', 'Workout Plan'),
        ('diet', 'Diet Plan'),
    )

    coach = models.ForeignKey(CoachProfile, on_delete=models.CASCADE, related_name='plans')
    name = models.CharField(max_length=255)
    description = models.TextField()
    plan_type = models.CharField(max_length=10, choices=PLAN_TYPE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    # duration_weeks = models.PositiveIntegerField()  # Duration of the plan in weeks
    image = models.ImageField(upload_to='plans/', null=True, blank=True)
    price_per_session = models.DecimalField(max_digits=8, decimal_places=2)
    session_count = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    renewal_period = models.CharField(max_length=10, choices=[('weekly', 'Weekly'), ('monthly', 'Monthly')],default='monthly')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_price(self):
        return self.price_per_session * self.session_count

    def __str__(self):
        return f"{self.name} by {self.coach.user.username}"

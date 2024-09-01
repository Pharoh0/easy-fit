from django.utils import timezone
from django.db import models
from django.core.exceptions import ValidationError
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import PLAN_TYPE_CHOICES
from django.contrib.auth import get_user_model

User = get_user_model()

class ProductPlan(models.Model):
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


class PlanItem(models.Model):
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
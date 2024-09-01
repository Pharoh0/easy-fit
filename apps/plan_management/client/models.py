from django.db import models
from ..coach.models import ProductPlan
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import PLAN_TYPE_CHOICES, PLAN_SUBSCRIPTION_CHOICES
from django.contrib.auth import get_user_model
from django.utils import timezone


User = get_user_model()


class PlanSubscription(models.Model):
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='client_subscriptions')
    product_plan = models.ForeignKey(ProductPlan, on_delete=models.CASCADE, related_name='plan_subscriptions')
    subscribed_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    # status = models.CharField(max_length=20, default='active')  # active, cancelled, etc.
    status = models.CharField(max_length=20, choices=PLAN_SUBSCRIPTION_CHOICES, default='pending', null=True, blank=True )

    def activate(self):
        if self.status == 'pending':
            self.status = 'active'
            self.save()

    def cancel(self):
        if self.status in ['pending', 'active']:
            self.status = 'cancelled'
            self.save()

    def complete(self):
        if self.status == 'active':
            self.status = 'completed'
            self.save()
            
    @property
    def is_expired(self):
        return timezone.now().date() > self.product_plan.end_date

    def save(self, *args, **kwargs):
        if self.is_expired:
            self.status = 'completed'
        super().save(*args, **kwargs)
        

    def __str__(self):
        return f"{self.client.username} subscribed to {self.product_plan.name}"

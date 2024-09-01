from django.db import models
from ..coach.models import ProductPlan
from apps.auth_users.models import CustomUser
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import PLAN_TYPE_CHOICES
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanSubscription(models.Model):
    client = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='client_subscriptions')
    plan = models.ForeignKey(ProductPlan, on_delete=models.CASCADE, related_name='plan_subscriptions')
    subscribed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='active')  # active, cancelled, etc.

    def __str__(self):
        return f"{self.client.username} subscribed to {self.plan.name}"

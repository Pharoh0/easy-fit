from django.db import models
from ..coach.models import ProductPlan
from apps.profiles.coach_profile.models import CoachProfile
from ..choices import PLAN_TYPE_CHOICES, PLAN_SUBSCRIPTION_CHOICES
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta


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
            self.is_active = True
            self.save()
            # Auto-generate plan days once upon activation (idempotent)
            self.generate_plan_days()

    def cancel(self):
        if self.status in ['pending', 'active']:
            self.status = 'cancelled'
            self.is_active = False
            self.save()

    def complete(self):
        if self.status == 'active':
            self.status = 'completed'
            self.is_active = False
            self.save()
            
    def generate_plan_days(self, reset: bool = False) -> int:
        """Create PlanDay entries for this subscription based on the product plan's date range.
        - If reset is False and plan_days already exist, do nothing (idempotent) and return 0
        - If reset is True, delete existing days then regenerate
        Returns number of days created
        """
        from ..daily_entries.models import PlanDay  # Local import to avoid circular dependency
        from ..dashboard.models import PlanProgress  # Ensure progress exists/updated

        if not reset and self.plan_days.exists():
            return 0
        if reset:
            self.plan_days.all().delete()

        plan = self.product_plan
        start_date = plan.start_date
        end_date = plan.end_date
        if start_date > end_date:
            return 0

        total_days = (end_date - start_date).days + 1
        days_to_create = []
        for i in range(total_days):
            scheduled_date = start_date + timedelta(days=i)
            days_to_create.append(
                PlanDay(
                    subscription=self,
                    day_number=i + 1,
                    scheduled_date=scheduled_date,
                    day_title=f"Day {i + 1}",
                    day_description=f"Auto-generated for {plan.name}",
                )
            )
        PlanDay.objects.bulk_create(days_to_create)

        # Ensure a PlanProgress record exists and is up-to-date
        progress, _ = PlanProgress.objects.get_or_create(
            subscription=self,
            defaults={'total_days': total_days},
        )
        # Recompute metrics based on current PlanDays
        progress.update_progress()

        return len(days_to_create)

    @property
    def is_expired(self):
        return timezone.now().date() > self.product_plan.end_date

    def save(self, *args, **kwargs):
        if self.is_expired:
            self.status = 'completed'
        # keep is_active in sync with status
        if self.status in ['cancelled', 'completed']:
            self.is_active = False
        super().save(*args, **kwargs)
        

    def __str__(self):
        return f"{self.client.username} subscribed to {self.product_plan.name}"

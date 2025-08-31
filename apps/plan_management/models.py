from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from .choices import PLAN_TYPE_CHOICES

User = get_user_model()


class PlanRequest(models.Model):
    """Client requests a plan from coach"""
    REQUEST_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('customizing', 'Being Customized'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Core relations
    client = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plan_requests')
    # Coach is inferred from the plan; do not duplicate
    plan = models.ForeignKey('plan_management.ProductPlan', on_delete=models.CASCADE, related_name='plan_requests')

    # Request details (API-aligned)
    message = models.TextField(blank=True, help_text="Client's initial message/requirements")
    goals = models.TextField(blank=True)
    health_conditions = models.TextField(blank=True)
    dietary_preferences = models.TextField(blank=True)
    fitness_level = models.CharField(max_length=50, blank=True)
    preferred_schedule = models.CharField(max_length=100, blank=True)
    budget_range = models.CharField(max_length=100, blank=True)

    # Status tracking
    status = models.CharField(max_length=20, choices=REQUEST_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Coach customization/response
    customization_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    custom_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    custom_duration = models.PositiveIntegerField(null=True, blank=True, help_text="Custom duration in days")

    def __str__(self):
        return f"Plan request from {self.client.username} for {self.plan.name}"

    def approve(self, customization_notes='', custom_price=None, custom_duration=None):
        """Approve the request: activate existing pending subscription or create one, then update status."""
        with transaction.atomic():
            # Save customization details
            self.customization_notes = customization_notes or ''
            if custom_price is not None:
                self.custom_price = custom_price
            if custom_duration is not None:
                self.custom_duration = custom_duration
            self.status = 'accepted'
            self.save()

            # Activate existing pending subscription if exists, otherwise create a new one
            from .client.models import PlanSubscription  # local import to avoid circulars
            subscription = PlanSubscription.objects.select_for_update().filter(
                client=self.client,
                product_plan=self.plan,
                status='pending'
            ).first()
            if subscription is None:
                subscription = PlanSubscription.objects.create(
                    client=self.client,
                    product_plan=self.plan,
                )
            subscription.activate()
            return subscription

    def reject(self, reason=""):
        """Reject the plan request with a reason."""
        self.status = 'rejected'
        self.rejection_reason = reason or ''
        self.save()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'plan', 'status']),
            models.Index(fields=['status']),
        ]


class PlanCancellation(models.Model):
    """Track plan cancellations with reasons and refund processing"""
    CANCELLATION_REASONS = [
        ('too_expensive', 'Too Expensive'),
        ('not_effective', 'Not Effective'),
        ('time_constraints', 'Time Constraints'),
        ('coach_issues', 'Issues with Coach'),
        ('personal_reasons', 'Personal Reasons'),
        ('health_issues', 'Health Issues'),
        ('schedule_conflict', 'Schedule Conflict'),
        ('other', 'Other'),
    ]

    REFUND_STATUS_CHOICES = [
        ('not_applicable', 'Not Applicable'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    subscription = models.OneToOneField('plan_management.PlanSubscription', on_delete=models.CASCADE, related_name='cancellation')
    
    # Cancellation details
    cancellation_reason = models.CharField(max_length=50, choices=CANCELLATION_REASONS)
    detailed_feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Refund information
    refund_requested = models.BooleanField(default=False)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refund_status = models.CharField(max_length=20, choices=REFUND_STATUS_CHOICES, default='not_applicable')
    refund_notes = models.TextField(blank=True)
    
    # Satisfaction survey
    satisfaction_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="1-5 scale")
    would_recommend = models.BooleanField(null=True, blank=True)
    improvement_suggestions = models.TextField(blank=True)
    
    def __str__(self):
        return f"Cancellation: {self.subscription.product_plan.name} - {self.get_cancellation_reason_display()}"
    
    def process_cancellation(self):
        """Cancel the subscription and set refund status appropriately."""
        # Cancel subscription
        self.subscription.cancel()
        # Determine refund status baseline
        self.refund_status = 'pending' if self.refund_requested else 'not_applicable'
        self.processed_at = timezone.now()
        self.save()
    
    def process_refund(self, refund_amount, refund_notes=''):
        """Process refund for cancelled plan."""
        self.refund_amount = refund_amount
        self.refund_notes = refund_notes or ''
        self.refund_status = 'approved'
        self.processed_at = timezone.now()
        self.save()
    
    class Meta:
        ordering = ['-created_at']

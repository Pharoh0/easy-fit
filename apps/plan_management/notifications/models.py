from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class PlanNotification(models.Model):
    """Track notifications (email + in-app) for plan events"""
    NOTIFICATION_TYPES = [
        ('plan_created', 'Plan Created'),
        ('plan_updated', 'Plan Updated'),
        ('plan_customized', 'Plan Customized'),
        ('daily_reminder', 'Daily Reminder'),
        ('milestone_achieved', 'Milestone Achieved'),
        ('plan_completed', 'Plan Completed'),
        ('plan_cancelled', 'Plan Cancelled'),
        ('coach_message', 'Coach Message'),
        # Additional types used by views
        ('plan_request_received', 'Plan Request Received'),
        ('plan_approved', 'Plan Approved'),
        ('plan_rejected', 'Plan Rejected'),
        ('refund_processed', 'Refund Processed'),
    ]

    subscription = models.ForeignKey(
        'plan_management.PlanSubscription',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,  # Allow notifications without a subscription
        blank=True
    )
    # The user who should receive the notification (usually subscription.client)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='plan_notifications', null=True, blank=True)
    notification_type = models.CharField(max_length=25, choices=NOTIFICATION_TYPES)

    # Email details
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=255)
    email_content = models.TextField()

    # Tracking (email delivery)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_sent = models.BooleanField(default=False)
    delivery_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('sent', 'Sent'),
            ('delivered', 'Delivered'),
            ('failed', 'Failed'),
            ('bounced', 'Bounced'),
        ],
        default='pending',
    )

    # In-app read tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Plan access link
    plan_access_token = models.CharField(max_length=100, unique=True)
    link_expires_at = models.DateTimeField()

    # Additional context
    additional_data = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.notification_type} notification to {self.recipient_email}"

    def generate_access_token(self):
        """Generate unique access token for plan link"""
        self.plan_access_token = str(uuid.uuid4())
        self.link_expires_at = timezone.now() + timezone.timedelta(days=30)
        self.save()
        return self.plan_access_token

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
        return self

    @property
    def is_link_expired(self):
        """Check if the plan access link is expired"""
        return timezone.now() > self.link_expires_at

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['subscription', 'sent_at']),
            models.Index(fields=['created_at']),
        ]


class NotificationTemplate(models.Model):
    """Email templates for different notification types"""
    notification_type = models.CharField(max_length=25, choices=PlanNotification.NOTIFICATION_TYPES, unique=True)
    
    # Template content
    subject_template = models.CharField(max_length=255)
    html_template = models.TextField()
    text_template = models.TextField(blank=True)
    
    # Template metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Template for {self.get_notification_type_display()}"
    
    class Meta:
        ordering = ['notification_type']


class NotificationPreference(models.Model):
    """User preferences for notifications"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email notification preferences
    plan_created_email = models.BooleanField(default=True)
    plan_updated_email = models.BooleanField(default=True)
    daily_reminder_email = models.BooleanField(default=True)
    milestone_email = models.BooleanField(default=True)
    coach_message_email = models.BooleanField(default=True)
    
    # Frequency settings
    daily_reminder_time = models.TimeField(default='08:00:00')
    weekly_summary_email = models.BooleanField(default=True)
    weekly_summary_day = models.CharField(max_length=10, choices=[
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ], default='sunday')
    
    # General settings
    email_frequency = models.CharField(max_length=20, choices=[
        ('immediate', 'Immediate'),
        ('daily_digest', 'Daily Digest'),
        ('weekly_digest', 'Weekly Digest'),
    ], default='immediate')
    
    # Opt-out settings
    marketing_emails = models.BooleanField(default=True)
    promotional_emails = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user.username}"
    
    class Meta:
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"


class EmailQueue(models.Model):
    """Queue for managing email sending"""
    notification = models.OneToOneField(PlanNotification, on_delete=models.CASCADE, related_name='queue_item')
    
    # Queue management
    priority = models.PositiveSmallIntegerField(default=5)  # 1 = highest, 10 = lowest
    scheduled_send_time = models.DateTimeField(default=timezone.now)
    max_retry_attempts = models.PositiveSmallIntegerField(default=3)
    current_retry_count = models.PositiveSmallIntegerField(default=0)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('queued', 'Queued'),
        ('processing', 'Processing'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ], default='queued')
    
    # Error handling
    last_error = models.TextField(blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Email queue item for {self.notification}"
    
    def mark_as_failed(self, error_message):
        """Mark email as failed and schedule retry if attempts remain"""
        self.current_retry_count += 1
        self.last_error = error_message
        
        if self.current_retry_count < self.max_retry_attempts:
            # Schedule retry with exponential backoff
            retry_delay = 2 ** self.current_retry_count  # 2, 4, 8 minutes
            self.next_retry_at = timezone.now() + timezone.timedelta(minutes=retry_delay)
            self.status = 'queued'
        else:
            self.status = 'failed'
        
        self.save()
    
    def mark_as_sent(self):
        """Mark email as successfully sent"""
        self.status = 'sent'
        self.processed_at = timezone.now()
        self.save()
        
        # Update the notification status
        self.notification.is_sent = True
        self.notification.delivery_status = 'sent'
        self.notification.save()
    
    class Meta:
        ordering = ['priority', 'scheduled_send_time']

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


class Conversation(models.Model):
    """General conversation model - can be extended for different contexts"""
    CONVERSATION_TYPES = [
        ('plan_related', 'Plan Related'),
        ('general_support', 'General Support'),
        ('consultation', 'Consultation'),
    ]
    
    participants = models.ManyToManyField(User, related_name='conversations')
    conversation_type = models.CharField(max_length=20, choices=CONVERSATION_TYPES, default='plan_related')
    subject = models.CharField(max_length=255, blank=True)
    
    # Plan-specific fields (nullable for non-plan conversations)
    related_subscription = models.ForeignKey('plan_management.PlanSubscription', 
                                           on_delete=models.CASCADE, 
                                           null=True, blank=True,
                                           related_name='conversations')
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    
    def __str__(self):
        participants_names = ', '.join([user.username for user in self.participants.all()[:2]])
        return f"Conversation: {participants_names} - {self.subject or 'No Subject'}"
    
    @property
    def unread_count_for_user(self, user):
        """Get unread message count for a specific user"""
        return self.messages.exclude(read_by=user).count()
    
    class Meta:
        ordering = ['-last_message_at']


class Message(models.Model):
    """Enhanced message model"""
    MESSAGE_TYPES = [
        ('text', 'Text Message'),
        ('image', 'Image'),
        ('file', 'File Attachment'),
        ('voice', 'Voice Message'),
        ('system', 'System Notification'),
        ('plan_update', 'Plan Update Notification'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    
    # Message content
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    
    # Attachments
    attachment = models.FileField(upload_to='message_attachments/', null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    attachment_size = models.PositiveIntegerField(null=True, blank=True)  # in bytes
    
    # Message metadata
    sent_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    
    # Read receipts
    read_by = models.ManyToManyField(User, through='MessageReadReceipt', related_name='read_messages')
    
    # Reply functionality
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}..."
    
    def mark_as_read(self, user):
        """Mark message as read by a user"""
        receipt, created = MessageReadReceipt.objects.get_or_create(
            message=self,
            user=user,
            defaults={'read_at': timezone.now()}
        )
        return receipt
    
    def is_read_by(self, user):
        """Check if message is read by a user"""
        return self.read_by.filter(id=user.id).exists()
    
    class Meta:
        ordering = ['-sent_at']


class MessageReadReceipt(models.Model):
    """Track when messages are read by each participant"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} read message at {self.read_at}"
    
    class Meta:
        unique_together = ['message', 'user']
        ordering = ['-read_at']


class ConversationParticipant(models.Model):
    """Track participant-specific conversation settings"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='participant_settings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Notification settings
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    
    # Conversation management
    is_muted = models.BooleanField(default=False)
    muted_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} in {self.conversation}"
    
    class Meta:
        unique_together = ['conversation', 'user']

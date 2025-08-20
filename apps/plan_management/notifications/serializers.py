from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PlanNotification, NotificationTemplate, NotificationPreference, EmailQueue
)

User = get_user_model()


class PlanNotificationSerializer(serializers.ModelSerializer):
    """Serializer for plan notifications"""
    subscription_info = serializers.SerializerMethodField()
    is_link_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = PlanNotification
        fields = [
            'id', 'notification_type', 'recipient_email', 'subject',
            'sent_at', 'is_sent', 'delivery_status', 'plan_access_token',
            'link_expires_at', 'is_link_expired', 'additional_data',
            'subscription_info'
        ]
        read_only_fields = [
            'id', 'sent_at', 'plan_access_token', 'link_expires_at', 'is_link_expired'
        ]
    
    def get_subscription_info(self, obj):
        """Get basic subscription information"""
        return {
            'plan_name': obj.subscription.product_plan.name,
            'coach_name': obj.subscription.product_plan.coach.user.get_full_name(),
            'client_name': obj.subscription.client.get_full_name()
        }


class NotificationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for notification templates"""
    
    class Meta:
        model = NotificationTemplate
        fields = [
            'id', 'notification_type', 'subject_template', 'html_template',
            'text_template', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences"""
    user_info = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'plan_created_email', 'plan_updated_email', 'daily_reminder_email',
            'milestone_email', 'coach_message_email', 'daily_reminder_time',
            'weekly_summary_email', 'weekly_summary_day', 'email_frequency',
            'marketing_emails', 'promotional_emails', 'created_at', 'updated_at',
            'user_info'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_info']
    
    def get_user_info(self, obj):
        """Get basic user information"""
        return {
            'username': obj.user.username,
            'email': obj.user.email,
            'full_name': obj.user.get_full_name()
        }


class EmailQueueSerializer(serializers.ModelSerializer):
    """Serializer for email queue items"""
    notification_info = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailQueue
        fields = [
            'id', 'priority', 'scheduled_send_time', 'max_retry_attempts',
            'current_retry_count', 'status', 'last_error', 'next_retry_at',
            'created_at', 'processed_at', 'notification_info'
        ]
        read_only_fields = [
            'id', 'current_retry_count', 'last_error', 'next_retry_at',
            'created_at', 'processed_at'
        ]
    
    def get_notification_info(self, obj):
        """Get basic notification information"""
        return {
            'notification_type': obj.notification.notification_type,
            'recipient_email': obj.notification.recipient_email,
            'subject': obj.notification.subject
        }


class NotificationPreferenceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating notification preferences"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'plan_created_email', 'plan_updated_email', 'daily_reminder_email',
            'milestone_email', 'coach_message_email', 'daily_reminder_time',
            'weekly_summary_email', 'weekly_summary_day', 'email_frequency',
            'marketing_emails', 'promotional_emails'
        ]
    
    def validate_daily_reminder_time(self, value):
        """Validate daily reminder time"""
        if value.hour < 6 or value.hour > 22:
            raise serializers.ValidationError("Daily reminder time should be between 6 AM and 10 PM")
        return value


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    total_sent = serializers.IntegerField()
    total_failed = serializers.IntegerField()
    delivery_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    notifications_by_type = serializers.DictField()
    recent_notifications = PlanNotificationSerializer(many=True)
    
    def to_representation(self, instance):
        """Custom representation for notification stats"""
        # This would be populated by the view
        return super().to_representation(instance)

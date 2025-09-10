import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json

from .models import PlanNotification
from .serializers import PlanNotificationSerializer

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()

@receiver(post_save, sender=PlanNotification)
def notification_created(sender, instance, created, **kwargs):
    """
    Signal handler to send real-time notifications when a new notification is created
    """
    if created and instance.user:
        try:
            # Serialize the notification
            serializer = PlanNotificationSerializer(instance)
            notification_data = serializer.data
            
            # Get the user's notification group
            group_name = f'notifications_{instance.user.id}'
            
            # Send to the user's notification group
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'notification': notification_data
                }
            )
            
            logger.info(f"Real-time notification sent to user {instance.user.id}, type: {instance.notification_type}")
        except Exception as e:
            logger.error(f"Error sending real-time notification: {e}")

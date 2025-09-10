import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    
    This consumer:
    1. Authenticates users via JWT token
    2. Adds them to a user-specific notification group
    3. Sends notifications to connected clients when new notifications are created
    """
    
    async def connect(self):
        """
        Connect to WebSocket and join user-specific notification group
        """
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            logger.warning("Unauthenticated WebSocket connection attempt")
            await self.close()
            return
        
        # Create a user-specific group name
        self.notification_group_name = f'notifications_{self.user.id}'
        
        # Join the group
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        logger.info(f"User {self.user.id} connected to notification WebSocket")
        await self.accept()
        
        # Send initial unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))

    async def disconnect(self, close_code):
        """
        Leave the notification group when disconnecting
        """
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
            logger.info(f"User {self.user.id} disconnected from notification WebSocket")

    async def receive(self, text_data):
        """
        Handle messages from WebSocket clients
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_read':
                notification_id = data.get('id')
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    await self.send(text_data=json.dumps({
                        'type': 'notification_marked_read',
                        'id': notification_id,
                        'success': True
                    }))
            
            elif message_type == 'mark_all_read':
                await self.mark_all_notifications_read()
                await self.send(text_data=json.dumps({
                    'type': 'all_notifications_marked_read',
                    'success': True
                }))
                
            elif message_type == 'get_unread_count':
                unread_count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    'type': 'unread_count',
                    'count': unread_count
                }))
                
        except Exception as e:
            logger.error(f"Error in notification WebSocket receive: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'An error occurred processing your request'
            }))

    async def notification_message(self, event):
        """
        Receive notification from notification group and forward to WebSocket
        """
        # Send notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
        
        # Also send updated unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))

    @database_sync_to_async
    def get_unread_count(self):
        """Get count of unread notifications for the current user"""
        from .models import PlanNotification
        return PlanNotification.objects.filter(
            user=self.user,
            is_read=False
        ).count()

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read"""
        from .models import PlanNotification
        try:
            notification = PlanNotification.objects.get(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
            return True
        except Exception as e:
            logger.error(f"Error marking notification {notification_id} as read: {e}")
            return False

    @database_sync_to_async
    def mark_all_notifications_read(self):
        """Mark all notifications as read for the current user"""
        from .models import PlanNotification
        try:
            PlanNotification.objects.filter(
                user=self.user,
                is_read=False
            ).update(
                is_read=True,
                read_at=timezone.now()
            )
            return True
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            return False

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import logging

from .models import Conversation

logger = logging.getLogger("apps.messaging.consumers")

class MessagingConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for messaging events per conversation.

    URL pattern: ws/messaging/conversations/<conversation_id>/?token=<JWT>
    The JWT is validated by apps.messaging.auth.JWTAuthMiddleware.
    """

    async def connect(self):
        user = self.scope.get("user")
        try:
            logger.debug("[WS] connect attempt user_id=%s is_auth=%s", getattr(user, "id", None), getattr(user, "is_authenticated", False))
        except Exception:
            pass
        if not user or isinstance(user, AnonymousUser) or not getattr(user, "is_authenticated", False):
            logger.debug("[WS] connect reject: unauthenticated user")
            await self.close(code=4001)
            return

        self.user = user
        self.conversation_id = self.scope.get("url_route", {}).get("kwargs", {}).get("conversation_id")
        logger.debug("[WS] route kwargs conversation_id=%s", self.conversation_id)
        if not self.conversation_id:
            logger.debug("[WS] connect reject: missing conversation_id")
            await self.close(code=4002)
            return

        # Validate user is a participant of the conversation
        is_participant = await self._is_participant(self.conversation_id, self.user.id)
        logger.debug("[WS] participant check conv=%s user=%s -> %s", self.conversation_id, self.user.id, is_participant)
        if not is_participant:
            logger.debug("[WS] connect reject: user not participant of conversation")
            await self.close(code=4003)
            return

        self.group_name = f"conversation_{self.conversation_id}"
        logger.debug("[WS] accepting connection, joining group=%s", self.group_name)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        logger.debug("[WS] disconnect close_code=%s group=%s", close_code, getattr(self, "group_name", None))
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        # Basic ping/pong and future extensibility
        action = content.get("action")
        if action == "ping":
            await self.send_json({"event": "pong"})
        else:
            # Unknown actions can be ignored safely
            pass

    # Event handlers for group_send 'type' values
    async def message_created(self, event):
        await self.send_json({"event": "message.created", "message": event.get("message")})

    async def message_updated(self, event):
        await self.send_json({"event": "message.updated", "message": event.get("message")})

    async def message_deleted(self, event):
        await self.send_json({"event": "message.deleted", "message_id": event.get("message_id")})

    async def conversation_updated(self, event):
        await self.send_json({"event": "conversation.updated", "conversation": event.get("conversation")})

    async def conversation_archived(self, event):
        await self.send_json({"event": "conversation.archived", "conversation_id": event.get("conversation_id")})

    async def conversation_unarchived(self, event):
        await self.send_json({"event": "conversation.unarchived", "conversation_id": event.get("conversation_id")})

    async def conversation_read(self, event):
        await self.send_json({
            "event": "conversation.read",
            "by_user_id": event.get("by_user_id"),
            "timestamp": event.get("timestamp"),
            "last_read_message_id": event.get("last_read_message_id"),
        })

    @database_sync_to_async
    def _is_participant(self, conversation_id, user_id) -> bool:
        return Conversation.objects.filter(id=conversation_id, participants__id=user_id).exists()

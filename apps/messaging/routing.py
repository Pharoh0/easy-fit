from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Conversation-specific WebSocket endpoint
    re_path(r"^ws/messaging/conversations/(?P<conversation_id>\d+)/$", consumers.MessagingConsumer.as_asgi()),
]

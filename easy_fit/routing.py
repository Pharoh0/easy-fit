from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.messaging import routing as messaging_routing
from apps.plan_management.notifications import routing as notification_routing
from apps.plan_management.notifications.middleware import JWTAuthMiddlewareStack

# Project-level websocket URL patterns aggregated from apps
websocket_urlpatterns = [
    *messaging_routing.websocket_urlpatterns,
    *notification_routing.websocket_urlpatterns,
]

# Apply JWT authentication to WebSocket connections
application = ProtocolTypeRouter({
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})

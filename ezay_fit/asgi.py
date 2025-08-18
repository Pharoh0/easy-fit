"""
ASGI config for ezay_fit project with Django Channels.

Provides HTTP handling via Django ASGI application and WebSocket handling
via Channels with JWT-authenticated middleware.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

from apps.messaging.auth import JWTAuthMiddlewareStack
import ezay_fit.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ezay_fit.settings')

# Standard Django ASGI application to handle traditional HTTP requests
django_asgi_app = get_asgi_application()

# Channels application routing HTTP and WebSocket protocols
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            ezay_fit.routing.websocket_urlpatterns
        )
    ),
})

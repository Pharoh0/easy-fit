from django.urls import re_path
from apps.messaging import routing as messaging_routing

# Project-level websocket URL patterns aggregated from apps
websocket_urlpatterns = [
    *messaging_routing.websocket_urlpatterns,
]

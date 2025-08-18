import urllib.parse
import logging
from typing import Optional
import traceback

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from channels.db import database_sync_to_async

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger("apps.messaging.auth")


class JWTAuthMiddleware:
    """
    Simple JWT authentication for Channels/WebSocket connections.

    Expects the access token in the query string as ?token=<JWT>.
    On success, sets scope['user'] to the authenticated user; otherwise AnonymousUser.
    """

    def __init__(self, inner):
        self.inner = inner
        self.User = get_user_model()

    async def __call__(self, scope, receive, send):
        # Default to anonymous
        scope["user"] = AnonymousUser()

        # Parse token from querystring
        try:
            query_string = scope.get("query_string", b"")
            if isinstance(query_string, bytes):
                query_string = query_string.decode("utf-8")
            params = urllib.parse.parse_qs(query_string)
            token = params.get("token", [None])[0]
        except Exception as e:
            token = None
            logger.debug("[WS JWT] Query string parse error: %s", str(e))

        # Safe debug info without exposing token contents
        try:
            raw_qs = scope.get("query_string", b"")
            qs_len = len(raw_qs) if isinstance(raw_qs, (bytes, bytearray)) else len(raw_qs or "")
            logger.debug("[WS JWT] qs_len=%s token_present=%s", qs_len, "yes" if token else "no")
            if token:
                logger.debug("[WS JWT] Token length=%s, starts_with=%s", len(token), token[:5] if token else "n/a")
        except Exception:
            pass

        if token:
            user = await self._get_user_from_token(token)
            if user is not None:
                scope["user"] = user
                try:
                    logger.debug("[WS JWT] Authenticated user_id=%s", getattr(user, "id", None))
                except Exception:
                    pass
            else:
                logger.debug("[WS JWT] Invalid or expired token")
        else:
            logger.debug("[WS JWT] No token provided in query string")

        return await self.inner(scope, receive, send)

    async def _get_user_from_token(self, token: str) -> Optional[object]:
        try:
            # Normalize token (strip accidental prefixes/whitespace)
            token = (token or "").strip()
            low = token.lower()
            if low.startswith("bearer "):
                token = token[7:].strip()
            elif low.startswith("jwt "):
                token = token[4:].strip()

            access = AccessToken(token)
            user_id = access.get(settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id"))
            if not user_id:
                logger.debug("[WS JWT] No user_id claim in token")
                return None

            user = await self._get_active_user(user_id)
            if not user:
                logger.debug("[WS JWT] User not found or inactive: id=%s", user_id)
            return user
        except TokenError as e:
            logger.debug("[WS JWT] Token validation failed: %s", str(e))
            return None
        except Exception as e:
            logger.debug("[WS JWT] Unexpected error in token validation: %s", str(e))
            logger.debug(traceback.format_exc())
            return None

    @database_sync_to_async
    def _get_active_user(self, user_id):
        return self.User.objects.filter(id=user_id, is_active=True).first()


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

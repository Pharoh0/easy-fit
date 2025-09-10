import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    """
    Get user from JWT token
    """
    try:
        # Verify the token
        token = AccessToken(token_key)
        user_id = token.get('user_id')
        
        if not user_id:
            logger.warning(f"No user_id in token payload")
            return AnonymousUser()
        
        # Get the user
        user = User.objects.get(id=user_id)
        logger.info(f"Authenticated WebSocket user: {user.username} (ID: {user.id})")
        return user
    except User.DoesNotExist:
        logger.warning(f"User with ID {user_id} not found")
        return AnonymousUser()
    except (InvalidToken, TokenError) as e:
        logger.warning(f"Invalid token: {e}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Error authenticating WebSocket: {e}")
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    JWT authentication middleware for WebSockets
    """
    
    def __init__(self, app):
        self.app = app
        
    async def __call__(self, scope, receive, send):
        # Get query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        # Try to get token from query params
        token = None
        if 'token' in query_params:
            token = query_params['token'][0]
        
        # If no token in query params, try headers
        if not token and 'headers' in scope:
            headers = dict(scope['headers'])
            if b'authorization' in headers:
                auth = headers[b'authorization'].decode()
                if auth.startswith('Bearer '):
                    token = auth[7:]
                elif auth.startswith('JWT '):
                    token = auth[4:]
        
        # If token found, authenticate user
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()
            
        return await self.app(scope, receive, send)


# Convenience function to wrap the middleware
def JWTAuthMiddlewareStack(app):
    return JWTAuthMiddleware(app)

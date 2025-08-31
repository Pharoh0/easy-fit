"""Utility functions for profiles app"""

def get_avatar_url(profile, request=None):
    """Get the avatar URL for a profile.
    
    Args:
        profile: The profile object (CoachProfile or ClientProfile)
        request: The request object for building absolute URLs
        
    Returns:
        The avatar URL or None if no avatar is set
    """
    avatar_url = None
    try:
        if getattr(profile, 'avatar', None) and getattr(profile.avatar, 'url', None):
            avatar_url = profile.avatar.url
            # Convert to absolute URL if request is available and URL is not already absolute
            if request is not None and not avatar_url.startswith(('http://', 'https://')):
                avatar_url = request.build_absolute_uri(avatar_url)
    except Exception:
        avatar_url = None
        
    return avatar_url

from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseForbidden
from django.conf import settings
from django.contrib import messages

class StaffAuthenticationMiddleware:
    """
    Middleware to ensure that only staff users can access staff-specific URLs.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Check if URL path starts with /staff/
        is_staff_url = request.path.startswith('/staff/') or request.path.startswith('/api/staff/')
        
        if is_staff_url:
            # Allow authenticated staff users and superusers
            if request.user.is_authenticated:
                is_staff = request.user.user_type == 'staff' if hasattr(request.user, 'user_type') else False
                is_superuser = request.user.is_superuser if hasattr(request.user, 'is_superuser') else False
                
                if not (is_staff or is_superuser):
                    # Non-staff user trying to access staff page - Forbidden
                    if request.path.startswith('/api/'):
                        # For API requests, return 403 Forbidden
                        return HttpResponseForbidden('Staff access required')
                    else:
                        # For web pages, redirect to dashboard with message
                        messages.error(request, 'You do not have permission to access that page.')
                        return redirect('auth_users:dashboard')
            else:
                # Not authenticated - redirect to login
                if request.path.startswith('/api/'):
                    # For API requests, return 403 Forbidden
                    return HttpResponseForbidden('Authentication required')
                else:
                    # For web pages, redirect to login
                    return redirect(f"{reverse('auth_users:user-login')}?next={request.path}")
                    
        # Continue processing the request
        return self.get_response(request)

from django.shortcuts import render
from django.http import HttpResponseForbidden
from django.urls import resolve

class UserBlockMiddleware:
    """
    Middleware to handle blocked users and display block reasons
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        if user.is_authenticated and not user.is_active:
            # Check if this is an API request
            if request.path.startswith('/api/'):
                return HttpResponseForbidden({"detail": "Your account has been blocked.", "code": "account_blocked"})
            
            # For regular pages, show the blocked page template
            if not request.path.startswith('/auth-users/blocked/'):
                context = {
                    'reason': getattr(user, 'block_reason', 'Your account has been blocked by an administrator.'),
                    'user': user
                }
                return render(request, 'auth_users/blocked.html', context)
        
        return self.get_response(request)

class StaffPageAccessMiddleware:
    """
    Middleware to ensure that only staff users can access staff pages
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # Staff URL patterns to be restricted
        self.staff_url_prefixes = [
            '/staff/',
            '/api/staff/'
        ]

    def __call__(self, request):
        path = request.path
        
        # Check if the path matches a staff URL pattern
        if any(path.startswith(prefix) for prefix in self.staff_url_prefixes):
            user = request.user
            
            # First verify user is authenticated
            if not user.is_authenticated:
                # For API requests, return a JSON response
                if path.startswith('/api/'):
                    return HttpResponseForbidden({"detail": "Authentication required", "code": "authentication_required"})
                # For regular pages, redirect to login
                from django.shortcuts import redirect
                from django.urls import reverse
                return redirect(f"{reverse('auth_users:user-login')}?next={request.path}")
            
            # IMPORTANT: Check user_type is exactly 'staff' (strict string comparison) or superuser
            is_staff = user.user_type == 'staff' if hasattr(user, 'user_type') else False
            is_superuser = user.is_superuser if hasattr(user, 'is_superuser') else False
            
            # If not staff or superuser, deny access
            if not (is_staff or is_superuser):
                # If API request, return a JSON response
                if path.startswith('/api/'):
                    return HttpResponseForbidden({"detail": "Staff access required", "code": "staff_required"})
                
                # For regular pages, show the forbidden template
                return render(request, 'errors/403.html', {
                    'message': 'You do not have permission to access this page. Staff access only.'
                }, status=403)
                
        # Continue processing for non-staff URLs or authorized staff users
        return self.get_response(request)

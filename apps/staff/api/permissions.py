from rest_framework.permissions import BasePermission
from django.utils.translation import gettext_lazy as _

class IsStaffPermission(BasePermission):
    """Allow only staff users or superusers."""
    message = _('Staff access required.')
    
    def has_permission(self, request, view):
        user = request.user
        # Explicitly check for staff user type or superuser status
        if not user or not user.is_authenticated:
            return False
            
        # Direct attribute access is more reliable than getattr for core attributes
        is_staff = user.user_type == 'staff' if hasattr(user, 'user_type') else False
        is_superuser = user.is_superuser if hasattr(user, 'is_superuser') else False
        
        # Also check JWT token claims if available
        # This helps when the user object might not have been fully loaded with all attributes
        if hasattr(request, 'auth') and request.auth:
            try:
                raw = request.auth
                payload = getattr(raw, 'payload', raw)  # SimpleJWT Token has .payload
                token_user_type = None
                token_is_staff_member = None
                # Try dict-style first
                if isinstance(payload, dict):
                    token_user_type = payload.get('user_type')
                    token_is_staff_member = payload.get('is_staff_member')
                else:
                    # Fallback to mapping-like access (Token supports __getitem__)
                    try:
                        token_user_type = payload['user_type']
                    except Exception:
                        pass
                    try:
                        token_is_staff_member = payload['is_staff_member']
                    except Exception:
                        pass

                if token_user_type:
                    is_staff = is_staff or (token_user_type == 'staff')
                if token_is_staff_member is not None:
                    is_staff = is_staff or bool(token_is_staff_member)
            except Exception as e:
                # Don't fail if token access fails, just log it
                print(f"[IsStaffPermission] Error checking JWT token claims: {str(e)}")
        
        return is_staff or is_superuser

class StaffRolePermission(BasePermission):
    """Base permission class for checking specific staff roles"""
    message = _('Insufficient staff permissions.')
    required_role = None  # Subclasses must define this
    
    def has_permission(self, request, view):
        user = request.user
        
        if not user or not user.is_authenticated:
            return False
        
        # First check if user is staff or superuser
        is_staff = user.user_type == 'staff' if hasattr(user, 'user_type') else False
        is_superuser = user.is_superuser if hasattr(user, 'is_superuser') else False
        
        # Check JWT token claims if available
        token_user_type = None
        token_staff_role = None
        token_permission_level = 0
        
        if hasattr(request, 'auth') and request.auth:
            try:
                raw = request.auth
                payload = getattr(raw, 'payload', raw)
                # Dict-style first
                if isinstance(payload, dict):
                    token_user_type = payload.get('user_type')
                    token_staff_role = payload.get('staff_role')
                    token_permission_level = payload.get('staff_permission_level', 0)
                else:
                    # Fallback to mapping-like access
                    try:
                        token_user_type = payload['user_type']
                    except Exception:
                        pass
                    try:
                        token_staff_role = payload['staff_role']
                    except Exception:
                        pass
                    try:
                        token_permission_level = payload['staff_permission_level']
                    except Exception:
                        pass

                if token_user_type == 'staff':
                    is_staff = True
            except Exception as e:
                print(f"[StaffRolePermission] Error checking JWT token claims: {str(e)}")
        
        # Non-staff users should never have access
        if not is_staff and not is_superuser:
            return False
            
        # Super users always have all permissions
        if is_superuser:
            return True
            
        # For staff users, check their role level
        role_levels = {
            'admin': 90,
            'moderator': 70, 
            'support': 50,
            'viewer': 10,
            None: 5,  # Default minimal level for staff without specific role
        }
        
        # Get user's role and map to level
        user_role = getattr(user, 'staff_role', None)
        user_level = role_levels.get(user_role, 5)  # Default to minimal level
        
        # If token has staff role, check that level too
        if token_staff_role:
            token_level = role_levels.get(token_staff_role, 5)
            # Use the higher of the two permission levels
            user_level = max(user_level, token_level)
        
        # If we have a direct permission level in the token, use that if it's higher
        if token_permission_level > 0:
            user_level = max(user_level, token_permission_level)
        
        # Get the required permission level based on role
        required_level = role_levels.get(self.required_role, 100)
        
        # Required level is the minimum level needed, so user's level must be higher
        return user_level >= required_level

class AdminRolePermission(StaffRolePermission):
    """Allows only staff with admin role or superusers"""
    required_role = 'admin'
    message = _('Administrator access required.')
    
    
class ModeratorRolePermission(StaffRolePermission):
    """Allows staff with moderator role or higher"""
    required_role = 'moderator'
    message = _('Moderator access required.')
    

class SupportRolePermission(StaffRolePermission):
    """Allows staff with support role or higher"""
    required_role = 'support'
    message = _('Support access required.')


class ViewerRolePermission(StaffRolePermission):
    """Allows staff with viewer role or higher (all staff)"""
    required_role = 'viewer'
    message = _('Staff access required.')

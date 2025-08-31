from rest_framework.permissions import BasePermission


class IsStaffPermission(BasePermission):
    """Allow only staff users or superusers."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            getattr(user, 'user_type', None) == 'staff' or getattr(user, 'is_superuser', False)
        ))

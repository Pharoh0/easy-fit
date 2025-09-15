from django.http import HttpResponseForbidden
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin


class StaffOnlyMixin:
    """Ensure the user is authenticated and has staff permissions for the UI.
    Mirrors API permission: user.user_type == 'staff' or is_superuser.
    """
    def dispatch(self, request, *args, **kwargs):
        user = request.user
        
        # First check if user is authenticated
        if not user.is_authenticated:
            return HttpResponseForbidden("Authentication required")
            
        # Prefer model property for staff detection
        is_staff = bool(getattr(user, 'is_staff_member', False))
        if not is_staff and hasattr(user, 'user_type'):
            is_staff = (user.user_type == 'staff')
        is_superuser = user.is_superuser if hasattr(user, 'is_superuser') else False
        
        if not (is_staff or is_superuser):
            return HttpResponseForbidden("Forbidden: Staff access only")
            
        return super().dispatch(request, *args, **kwargs)


class StaffDashboardView(LoginRequiredMixin, StaffOnlyMixin, TemplateView):
    template_name = "staff/dashboard.html"


class StaffUsersView(LoginRequiredMixin, StaffOnlyMixin, TemplateView):
    template_name = "staff/users.html"


class StaffCoachesView(LoginRequiredMixin, StaffOnlyMixin, TemplateView):
    template_name = "staff/coaches.html"


class StaffCertificationsView(LoginRequiredMixin, StaffOnlyMixin, TemplateView):
    template_name = "staff/certifications.html"

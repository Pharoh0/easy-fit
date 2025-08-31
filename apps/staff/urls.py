from django.urls import path
from .views import (
    StaffDashboardView,
    StaffUsersView,
    StaffCoachesView,
    StaffCertificationsView,
)

app_name = "staff"

urlpatterns = [
    path("dashboard/", StaffDashboardView.as_view(), name="dashboard"),
    path("users/", StaffUsersView.as_view(), name="users"),
    path("coaches/", StaffCoachesView.as_view(), name="coaches"),
    path("certifications/", StaffCertificationsView.as_view(), name="certifications"),
]

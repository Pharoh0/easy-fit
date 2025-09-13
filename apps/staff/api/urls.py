from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    UsersViewSet,
    CoachesViewSet,
    CertificationsViewSet,
    DashboardMetricsView,
    DashboardReportView,
    DashboardExportCSVView,
    DashboardExportPDFView,
)

app_name = 'staff_api'

router = DefaultRouter()
router.register(r'users', UsersViewSet, basename='staff-users')
router.register(r'coaches', CoachesViewSet, basename='staff-coaches')
router.register(r'certifications', CertificationsViewSet, basename='staff-certifications')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/metrics/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
    path('dashboard/report/', DashboardReportView.as_view(), name='dashboard-report'),
    path('dashboard/export/csv/', DashboardExportCSVView.as_view(), name='dashboard-export-csv'),
    path('dashboard/export/pdf/', DashboardExportPDFView.as_view(), name='dashboard-export-pdf'),
]

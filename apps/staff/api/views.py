from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from apps.profiles.coach_profile.models import CoachProfile, Certification
from apps.plan_management.models import PlanRequest
from apps.plan_management.client.models import PlanSubscription
from .permissions import IsStaffPermission
from .serializers import (
    StaffUserSerializer,
    CoachProfileListSerializer,
    CertificationSerializer,
)

User = get_user_model()


class DefaultPaginationMixin:
    pagination_class = None  # use global DRF PAGE_SIZE unless overridden


class UsersViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = StaffUserSerializer
    permission_classes = [IsAuthenticated, IsStaffPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_type', 'is_active', 'is_enabled', 'is_whitelisted']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username', 'last_login']

    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        user = self.get_object()
        if user.is_superuser:
            return Response({'detail': 'Cannot block superuser.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response({'status': 'blocked'})

    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response({'status': 'unblocked'})

    @action(detail=True, methods=['post'])
    def set_user_type(self, request, pk=None):
        user = self.get_object()
        new_type = request.data.get('user_type')
        if new_type not in ['client', 'coach', 'staff']:
            return Response({'detail': 'Invalid user_type.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_superuser:
            return Response({'detail': 'Cannot change superuser type.'}, status=status.HTTP_400_BAD_REQUEST)
        user.user_type = new_type
        user.save(update_fields=['user_type'])
        return Response({'status': 'updated', 'user_type': new_type})


class CoachesViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = CoachProfile.objects.select_related('user').all().order_by('id')
    serializer_class = CoachProfileListSerializer
    permission_classes = [IsAuthenticated, IsStaffPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['approval_status', 'user__is_active']
    search_fields = ['user__username', 'user__email']
    ordering_fields = ['id', 'years_of_experience']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        profile = self.get_object()
        notes = request.data.get('notes', '')
        enable_user = str(request.data.get('enable_user', 'false')).lower() in ['1', 'true', 'yes']
        profile.approval_status = 'approved'
        profile.approved_at = timezone.now()
        profile.approved_by = request.user
        profile.approval_notes = notes
        profile.save(update_fields=['approval_status', 'approved_at', 'approved_by', 'approval_notes'])
        if enable_user:
            profile.user.is_enabled = True
            profile.user.save(update_fields=['is_enabled'])
        return Response({'status': 'approved', 'enable_user': enable_user})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        profile = self.get_object()
        notes = request.data.get('notes', '')
        profile.approval_status = 'rejected'
        profile.approval_notes = notes
        profile.save(update_fields=['approval_status', 'approval_notes'])
        return Response({'status': 'rejected'})


class CertificationsViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Certification.objects.select_related('coach_profile', 'coach_profile__user').all().order_by('-id')
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated, IsStaffPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['coach_profile__user__username', 'description']
    ordering_fields = ['id', 'verified_at']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        cert = self.get_object()
        notes = request.data.get('notes', '')
        cert.status = 'approved'
        cert.verified_at = timezone.now()
        cert.verified_by = request.user
        cert.notes = notes
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        cert = self.get_object()
        notes = request.data.get('notes', '')
        cert.status = 'rejected'
        cert.verified_at = timezone.now()
        cert.verified_by = request.user
        cert.notes = notes
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        return Response({'status': 'rejected'})


from rest_framework.views import APIView


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsStaffPermission]

    def get(self, request):
        data = {}
        # Users
        data['users'] = {
            'total': User.objects.count(),
            'clients': User.objects.filter(user_type='client').count(),
            'coaches': User.objects.filter(user_type='coach').count(),
            'staff': User.objects.filter(user_type='staff').count(),
        }
        # Approvals
        data['approvals'] = {
            'coaches_pending': CoachProfile.objects.filter(approval_status='pending').count(),
            'certifications_pending': Certification.objects.filter(status='pending').count(),
        }
        # Plans
        requests_qs = PlanRequest.objects.values('status').annotate(c=Count('id'))
        subs_qs = PlanSubscription.objects.values('status').annotate(c=Count('id'))
        data['plans'] = {
            'requests': {row['status'] or 'unknown': row['c'] for row in requests_qs},
            'subscriptions': {row['status'] or 'unknown': row['c'] for row in subs_qs},
        }
        return Response(data)

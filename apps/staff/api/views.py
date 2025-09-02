from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils.translation import gettext_lazy as _

from apps.profiles.coach_profile.models import CoachProfile, Certification
from apps.plan_management.models import PlanRequest
from apps.plan_management.client.models import PlanSubscription
from .permissions import (
    IsStaffPermission,
    AdminRolePermission,
    ModeratorRolePermission,
    SupportRolePermission,
    ViewerRolePermission
)
from .serializers import (
    StaffUserSerializer,
    CoachProfileListSerializer,
    CertificationSerializer,
)

User = get_user_model()


class DefaultPaginationMixin:
    pagination_class = None  # use global DRF PAGE_SIZE unless overridden


# Strict staff permission class with detailed logging
class IsAnyStaffPermission(BasePermission):
    message = _('Staff access required. Only staff members are allowed to access this resource.')
    
    def has_permission(self, request, view):
        user = request.user
        # Check authentication first
        if not user or not user.is_authenticated:
            print(f"IsAnyStaffPermission: User not authenticated")
            return False
        
        # Check DB directly - super reliable approach
        try:
            # Use direct ORM access for the strict check
            user_obj = User.objects.filter(pk=user.pk).values('user_type', 'is_superuser', 'username').first()
            if not user_obj:
                print(f"IsAnyStaffPermission: User {user.pk} not found in database")
                return False
            
            # Strict check - only staff user_type or superuser allowed
            is_authorized = user_obj['user_type'] == 'staff' or user_obj['is_superuser']
            
            # Log detailed permission info for debugging
            print(f"IsAnyStaffPermission check for {user_obj['username']}: user_type={user_obj['user_type']}, is_superuser={user_obj['is_superuser']}, authorized={is_authorized}")
            
            return is_authorized
        except Exception as e:
            print(f"Error in IsAnyStaffPermission: {e}")
            # Fall back to object attribute check but be strict
            is_staff = getattr(user, 'user_type', '') == 'staff'
            is_superuser = getattr(user, 'is_superuser', False)
            return is_staff or is_superuser


class UsersViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = StaffUserSerializer
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]  # Use simplified staff check
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user_type', 'is_active', 'is_enabled', 'is_whitelisted']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username', 'last_login']

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def block(self, request, pk=None):
        user = self.get_object()
        requesting_user = request.user
        
        # Allow superusers and admin-level staff to block other superusers
        if user.is_superuser and not (requesting_user.is_superuser or 
                                      (hasattr(requesting_user, 'staff_role') and 
                                       requesting_user.staff_role == 'admin')):
            return Response({'detail': 'Cannot block superuser. Only admins can block superuser accounts.'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        # Debug permission levels
        requester_level = getattr(request.user, 'staff_permission_level', 0)
        target_level = getattr(user, 'staff_permission_level', 0)
        print(f"DEBUG PERMISSIONS - Block: {request.user.username} (level {requester_level}) -> {user.username} (level {target_level})")
        
        # Allow superusers to do anything
        if request.user.is_superuser:
            pass  # Superuser can block anyone
        # Modified check: staff can block regular users, only higher level can block other staff
        elif user.user_type == 'staff' and target_level >= requester_level:
            return Response(
                {'detail': 'You do not have permission to block this staff user.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        reason = request.data.get('reason', '')
        if not reason.strip():
            return Response(
                {'detail': 'Block reason is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.is_active = False
        user.block_reason = reason
        user.blocked_at = timezone.now()
        user.blocked_by = request.user
        user.save(update_fields=['is_active', 'block_reason', 'blocked_at', 'blocked_by'])
        
        return Response({
            'status': 'blocked',
            'reason': reason,
            'blocked_at': user.blocked_at
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def unblock(self, request, pk=None):
        user = self.get_object()
        requesting_user = request.user
        
        # Debug permission levels
        requester_level = getattr(request.user, 'staff_permission_level', 0)
        target_level = getattr(user, 'staff_permission_level', 0)
        print(f"DEBUG PERMISSIONS - Unblock: {request.user.username} (level {requester_level}) -> {user.username} (level {target_level})")
        
        # Allow superusers to do anything
        if request.user.is_superuser:
            pass  # Superuser can unblock anyone
        # Modified check: staff can unblock regular users, only higher level can unblock other staff
        elif user.user_type == 'staff' and target_level >= requester_level:
            return Response(
                {'detail': 'You do not have permission to unblock this staff user.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        user.is_active = True
        user.block_reason = None
        user.blocked_at = None
        user.blocked_by = None
        user.save(update_fields=['is_active', 'block_reason', 'blocked_at', 'blocked_by'])
        return Response({'status': 'unblocked'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def set_user_type(self, request, pk=None):
        user = self.get_object()
        requesting_user = request.user
        new_type = request.data.get('user_type')
        new_role = request.data.get('staff_role')
        
        # Validate user type
        if new_type not in ['client', 'coach', 'staff']:
            return Response({'detail': 'Invalid user_type.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Allow superusers and admin-level staff to change other superusers' types
        if user.is_superuser and not (requesting_user.is_superuser or 
                                     (hasattr(requesting_user, 'staff_role') and 
                                      requesting_user.staff_role == 'admin')):
            return Response({'detail': 'Cannot change superuser type. Only admins can modify superuser accounts.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Debug permission levels
        requester_level = getattr(request.user, 'staff_permission_level', 0)
        target_level = getattr(user, 'staff_permission_level', 0)
        print(f"DEBUG PERMISSIONS - Type change: {request.user.username} (level {requester_level}) -> {user.username} (level {target_level})")
        
        # Allow superusers to do anything
        if request.user.is_superuser:
            pass  # Superuser can change user type of anyone
        # Modified check: staff can change regular users, only higher level can change other staff
        elif user.user_type == 'staff' and target_level >= requester_level:
            return Response(
                {'detail': 'You do not have permission to modify this staff user.'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Update user type
        user.user_type = new_type
        update_fields = ['user_type']
        
        # If type is staff and role is specified, update role too
        if new_type == 'staff' and new_role:
            if new_role in dict(User.STAFF_ROLE_CHOICES).keys():
                user.staff_role = new_role
                update_fields.append('staff_role')
            else:
                return Response({'detail': 'Invalid staff_role.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.save(update_fields=update_fields)
        return Response({
            'status': 'updated', 
            'user_type': new_type,
            'staff_role': user.staff_role if new_type == 'staff' else None
        })


class CoachesViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = CoachProfile.objects.select_related('user').all().order_by('id')
    serializer_class = CoachProfileListSerializer
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['approval_status', 'user__is_active']
    search_fields = ['user__username', 'user__email']
    ordering_fields = ['id', 'years_of_experience']

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
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

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def reject(self, request, pk=None):
        profile = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes.strip():
            return Response({'detail': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        profile.approval_status = 'rejected'
        profile.approval_notes = notes
        profile.save(update_fields=['approval_status', 'approval_notes'])
        return Response({'status': 'rejected'})


class CertificationsViewSet(DefaultPaginationMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Certification.objects.select_related('coach_profile', 'coach_profile__user').all().order_by('-id')
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['coach_profile__user__username', 'description']
    ordering_fields = ['id', 'verified_at']

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def approve(self, request, pk=None):
        cert = self.get_object()
        notes = request.data.get('notes', '')
        cert.status = 'approved'
        cert.verified_at = timezone.now()
        cert.verified_by = request.user
        cert.notes = notes
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def reject(self, request, pk=None):
        cert = self.get_object()
        notes = request.data.get('notes', '')
        
        if not notes.strip():
            return Response({'detail': 'Rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        cert.status = 'rejected'
        cert.verified_at = timezone.now()
        cert.verified_by = request.user
        cert.notes = notes
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        return Response({'status': 'rejected'})


from rest_framework.views import APIView


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]

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

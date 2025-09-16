from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import viewsets, mixins, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.utils.translation import gettext_lazy as _
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

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
        # Notify coach via email (best-effort; uses console backend in dev)
        try:
            subject = 'Your coach profile has been approved'
            ctx = {
                'user': profile.user,
                'profile': profile,
                'notes': notes,
            }
            text = render_to_string('emails/coach_profile_approved.txt', ctx)
            html = render_to_string('emails/coach_profile_approved.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'approved', 'enable_user': enable_user})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def reject(self, request, pk=None):
        profile = self.get_object()
        # Accept optional notes/reason when rejecting a coach
        notes = request.data.get('notes', '') or request.data.get('reason', '')
        
        profile.approval_status = 'rejected'
        profile.approval_notes = notes
        profile.save(update_fields=['approval_status', 'approval_notes'])
        # Notify coach with reason if provided
        try:
            subject = 'Your coach profile has been rejected'
            ctx = {
                'user': profile.user,
                'profile': profile,
                'reason': notes or '(no reason provided)'
            }
            text = render_to_string('emails/coach_profile_rejected.txt', ctx)
            html = render_to_string('emails/coach_profile_rejected.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def revert(self, request, pk=None):
        """Revert coach approval status back to pending (undo approve/reject)."""
        profile = self.get_object()
        notes = request.data.get('notes', '')
        profile.approval_status = 'pending'
        # Do not clear approved_at/approved_by to preserve audit trail; keep approval_notes as history
        profile.save(update_fields=['approval_status'])
        # Notify coach about revert
        try:
            subject = 'Your coach profile status was reverted to pending'
            ctx = {
                'user': profile.user,
                'profile': profile,
                'notes': notes,
            }
            text = render_to_string('emails/coach_profile_reverted.txt', ctx)
            html = render_to_string('emails/coach_profile_reverted.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'pending'})


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
        # Notify coach via email (best-effort)
        try:
            subject = 'Your certification has been approved'
            ctx = {
                'user': cert.coach_profile.user,
                'certification': cert,
                'notes': notes,
            }
            text = render_to_string('emails/certification_approved.txt', ctx)
            html = render_to_string('emails/certification_approved.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [cert.coach_profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def reject(self, request, pk=None):
        cert = self.get_object()
        # Accept optional notes/reason when rejecting a certification
        notes = request.data.get('notes', '') or request.data.get('reason', '')
        
        cert.status = 'rejected'
        cert.verified_at = timezone.now()
        cert.verified_by = request.user
        cert.notes = notes
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        # Notify coach with reason if provided
        try:
            subject = 'Your certification has been rejected'
            ctx = {
                'user': cert.coach_profile.user,
                'certification': cert,
                'reason': notes or '(no reason provided)'
            }
            text = render_to_string('emails/certification_rejected.txt', ctx)
            html = render_to_string('emails/certification_rejected.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [cert.coach_profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAnyStaffPermission])
    def revert(self, request, pk=None):
        """Revert certification status back to pending (undo approve/reject)."""
        cert = self.get_object()
        notes = request.data.get('notes', '')
        cert.status = 'pending'
        # Clear verification details when reverting a certification
        cert.verified_at = None
        cert.verified_by = None
        # Keep notes as an audit trail; optionally append revert note
        if notes:
            existing = (cert.notes or '').strip()
            prefix = (existing + "\n") if existing else ""
            cert.notes = f"{prefix}Reverted to pending: {notes}"
        cert.save(update_fields=['status', 'verified_at', 'verified_by', 'notes'])
        # Notify coach about revert
        try:
            subject = 'Your certification status was reverted to pending'
            ctx = {
                'user': cert.coach_profile.user,
                'certification': cert,
                'notes': notes,
            }
            text = render_to_string('emails/certification_reverted.txt', ctx)
            html = render_to_string('emails/certification_reverted.html', ctx)
            msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [cert.coach_profile.user.email])
            msg.attach_alternative(html, 'text/html')
            msg.send(fail_silently=True)
        except Exception:
            pass
        return Response({'status': 'pending'})


from rest_framework.views import APIView
from django.http import HttpResponse
import csv
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


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


class DashboardReportView(APIView):
    """Return richer, filterable metrics for charts/tables on staff dashboard."""
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]

    def get(self, request):
        # Filters
        start = request.GET.get('start')
        end = request.GET.get('end')
        role = request.GET.get('role')  # client|coach|staff
        plan_status = request.GET.get('plan_status')  # pending|active|expired|cancelled|completed

        # Build base queries respecting date range
        users_qs = User.objects.all()
        if start:
            try:
                dt = datetime.fromisoformat(start)
                users_qs = users_qs.filter(date_joined__date__gte=dt.date())
            except Exception:
                pass
        if end:
            try:
                dt = datetime.fromisoformat(end)
                users_qs = users_qs.filter(date_joined__date__lte=dt.date())
            except Exception:
                pass

        if role in ['client', 'coach', 'staff']:
            users_qs = users_qs.filter(user_type=role)

        # Subscriptions filter
        subs_qs = PlanSubscription.objects.all()
        if plan_status:
            subs_qs = subs_qs.filter(status=plan_status)
        if start:
            try:
                dt = datetime.fromisoformat(start)
                subs_qs = subs_qs.filter(subscribed_at__date__gte=dt.date())
            except Exception:
                pass
        if end:
            try:
                dt = datetime.fromisoformat(end)
                subs_qs = subs_qs.filter(subscribed_at__date__lte=dt.date())
            except Exception:
                pass

        # Plan requests filter
        req_qs = PlanRequest.objects.all()
        if start:
            try:
                dt = datetime.fromisoformat(start)
                req_qs = req_qs.filter(created_at__date__gte=dt.date())
            except Exception:
                pass
        if end:
            try:
                dt = datetime.fromisoformat(end)
                req_qs = req_qs.filter(created_at__date__lte=dt.date())
            except Exception:
                pass

        # Aggregations
        users_by_role = {
            'client': users_qs.filter(user_type='client').count(),
            'coach': users_qs.filter(user_type='coach').count(),
            'staff': users_qs.filter(user_type='staff').count(),
        }
        subs_by_status = {row['status'] or 'unknown': row['c'] for row in subs_qs.values('status').annotate(c=Count('id'))}
        req_by_status = {row['status'] or 'unknown': row['c'] for row in req_qs.values('status').annotate(c=Count('id'))}

        # Approvals (pending overall + activity within range)
        approvals = {
            'coaches_pending': CoachProfile.objects.filter(approval_status='pending').count(),
            'certifications_pending': Certification.objects.filter(status='pending').count(),
        }
        # Activity constrained by date range
        def _in_range(qs, field):
            if start:
                try:
                    dt = datetime.fromisoformat(start)
                    qs = qs.filter(**{f"{field}__date__gte": dt.date()})
                except Exception:
                    pass
            if end:
                try:
                    dt = datetime.fromisoformat(end)
                    qs = qs.filter(**{f"{field}__date__lte": dt.date()})
                except Exception:
                    pass
            return qs

        approvals_activity = {
            'coaches_approved': _in_range(CoachProfile.objects.filter(approval_status='approved'), 'approved_at').count(),
            # Coach rejections don't have a timestamp field; omitted intentionally
            'certs_approved': _in_range(Certification.objects.filter(status='approved'), 'verified_at').count(),
            'certs_rejected': _in_range(Certification.objects.filter(status='rejected'), 'verified_at').count(),
        }

        # Timeseries (by month) for users and subscriptions
        def month_key(dt):
            return dt.strftime('%Y-%m')

        users_series = {}
        for u in users_qs.values_list('date_joined', flat=True):
            k = month_key(u)
            users_series[k] = users_series.get(k, 0) + 1

        subs_series = {}
        for d in subs_qs.values_list('subscribed_at', flat=True):
            k = month_key(d)
            subs_series[k] = subs_series.get(k, 0) + 1

        data = {
            'filters': {
                'start': start,
                'end': end,
                'role': role,
                'plan_status': plan_status,
            },
            'users_by_role': users_by_role,
            'subscriptions_by_status': subs_by_status,
            'requests_by_status': req_by_status,
            'approvals': approvals,
            'approvals_activity': approvals_activity,
            'series': {
                'users_per_month': users_series,
                'subs_per_month': subs_series,
            }
        }
        return Response(data)


class DashboardExportCSVView(APIView):
    """Export filtered dashboard data as CSV (users and subscriptions summary)."""
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]

    def get(self, request):
        # Reuse filters like DashboardReportView
        start = request.GET.get('start')
        end = request.GET.get('end')
        role = request.GET.get('role')
        plan_status = request.GET.get('plan_status')

        users_qs = User.objects.all()
        if role in ['client', 'coach', 'staff']:
            users_qs = users_qs.filter(user_type=role)
        if start:
            try:
                dt = datetime.fromisoformat(start)
                users_qs = users_qs.filter(date_joined__date__gte=dt.date())
            except Exception:
                pass
        if end:
            try:
                dt = datetime.fromisoformat(end)
                users_qs = users_qs.filter(date_joined__date__lte=dt.date())
            except Exception:
                pass

        subs_qs = PlanSubscription.objects.all()
        if plan_status:
            subs_qs = subs_qs.filter(status=plan_status)
        if start:
            try:
                dt = datetime.fromisoformat(start)
                subs_qs = subs_qs.filter(subscribed_at__date__gte=dt.date())
            except Exception:
                pass
        if end:
            try:
                dt = datetime.fromisoformat(end)
                subs_qs = subs_qs.filter(subscribed_at__date__lte=dt.date())
            except Exception:
                pass

        # Build CSV
        response = HttpResponse(content_type='text/csv')
        filename = f"dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        writer = csv.writer(response)

        writer.writerow(['Section', 'Metric', 'Value'])
        writer.writerow(['Users', 'Total', users_qs.count()])
        writer.writerow(['Users', 'Clients', users_qs.filter(user_type='client').count()])
        writer.writerow(['Users', 'Coaches', users_qs.filter(user_type='coach').count()])
        writer.writerow(['Users', 'Staff', users_qs.filter(user_type='staff').count()])
        writer.writerow([])
        writer.writerow(['Subscriptions by status'])
        for row in subs_qs.values('status').annotate(c=Count('id')):
            writer.writerow(['Subscriptions', row['status'] or 'unknown', row['c']])
        writer.writerow([])
        writer.writerow(['Plan Requests by status'])
        for row in PlanRequest.objects.values('status').annotate(c=Count('id')):
            writer.writerow(['Plan Requests', row['status'] or 'unknown', row['c']])

        return response


class DashboardExportPDFView(APIView):
    """Simple PDF export of the same summary metrics using ReportLab."""
    permission_classes = [IsAuthenticated, IsAnyStaffPermission]

    def get(self, request):
        # Gather quick metrics
        users_total = User.objects.count()
        users_clients = User.objects.filter(user_type='client').count()
        users_coaches = User.objects.filter(user_type='coach').count()
        users_staff = User.objects.filter(user_type='staff').count()
        reqs = {row['status'] or 'unknown': row['c'] for row in PlanRequest.objects.values('status').annotate(c=Count('id'))}
        subs = {row['status'] or 'unknown': row['c'] for row in PlanSubscription.objects.values('status').annotate(c=Count('id'))}

        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        header_h = 24
        margin_x = 40
        def draw_header_footer():
            # Header bar
            p.setFillColorRGB(13/255.0, 110/255.0, 253/255.0)
            p.rect(0, height - header_h, width, header_h, fill=1, stroke=0)
            p.setFillColorRGB(1, 1, 1)
            p.setFont('Helvetica-Bold', 12)
            p.drawString(margin_x, height - 16, 'Easy Fit — Staff Dashboard Report')
            # Footer
            p.setFillColorRGB(0, 0, 0)
            p.setFont('Helvetica', 8)
            p.drawString(margin_x, 20, f"Generated at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
            p.drawRightString(width - margin_x, 20, f'Page {p.getPageNumber()}')

        def new_page():
            p.showPage(); draw_header_footer(); return height - header_h - 30

        draw_header_footer()
        y = height - header_h - 30

        def write_section(title, items):
            nonlocal y
            if y < 80:
                y = new_page()
            p.setFont("Helvetica-Bold", 12)
            p.drawString(margin_x, y, title)
            y -= 18
            p.setFont("Helvetica", 10)
            for k, v in items.items():
                if y < 60:
                    y = new_page()
                    p.setFont("Helvetica-Bold", 12)
                    p.drawString(margin_x, y, title + ' (cont.)')
                    y -= 18
                    p.setFont("Helvetica", 10)
                p.drawString(margin_x + 20, y, f"- {k}: {v}")
                y -= 14
            y -= 10

        write_section('Users', {'Total': users_total, 'Clients': users_clients, 'Coaches': users_coaches, 'Staff': users_staff})
        write_section('Plan Requests by Status', reqs)
        write_section('Subscriptions by Status', subs)

        # finalize
        p.showPage()
        p.save()
        buffer.seek(0)

        filename = f"dashboard_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        resp = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{filename}"'
        return resp

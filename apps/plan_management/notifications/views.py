from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import PlanNotification, NotificationTemplate, NotificationPreference, EmailQueue
from .serializers import (
    PlanNotificationSerializer, NotificationTemplateSerializer,
    NotificationPreferenceSerializer, EmailQueueSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
import logging
import uuid

User = get_user_model()
logger = logging.getLogger(__name__)


class PlanNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan notifications"""
    serializer_class = PlanNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='test-notification')
    def test_notification(self, request):
        """Create a test notification for the current user"""
        try:
            # Create a test notification
            notification = PlanNotification.objects.create(
                user=request.user,
                subscription=None,  # No subscription for test
                notification_type='plan_approved',  # Use any type
                recipient_email=request.user.email,
                subject='Test Notification',
                email_content='This is a test notification',
                plan_access_token=str(uuid.uuid4()),
                link_expires_at=timezone.now() + timezone.timedelta(days=30),
                additional_data={'test': True}
            )
            
            logger.info(f"Test notification created: {notification.id}")
            return Response({'success': True, 'notification_id': notification.id})
        except Exception as e:
            logger.error(f"Error creating test notification: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_queryset(self):
        """Get notifications for current user"""
        return (
            PlanNotification.objects.filter(user=self.request.user)
            .select_related(
                'subscription__product_plan',
                'subscription__product_plan__coach__user',
                'subscription__client',
            )
            .order_by('-created_at')
        )
    
    def list(self, request, *args, **kwargs):
        """List notifications with filtering"""
        queryset = self.get_queryset()
        
        # Filter by read status
        if request.query_params.get('unread_only') == 'true':
            queryset = queryset.filter(is_read=False)
        
        # Filter by notification type
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        # Exclude a single type
        exclude_type = request.query_params.get('exclude_type')
        if exclude_type:
            queryset = queryset.exclude(notification_type=exclude_type)
        # Exclude multiple types (comma-separated)
        exclude_types = request.query_params.get('exclude_types')
        if exclude_types:
            types_list = [t.strip() for t in exclude_types.split(',') if t.strip()]
            if types_list:
                queryset = queryset.exclude(notification_type__in=types_list)
        
        # Filter by subscription
        subscription_id = request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        queryset = self.get_queryset().filter(is_read=False)
        # Optional include/exclude filters like list()
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        exclude_type = request.query_params.get('exclude_type')
        if exclude_type:
            queryset = queryset.exclude(notification_type=exclude_type)
        exclude_types = request.query_params.get('exclude_types')
        if exclude_types:
            types_list = [t.strip() for t in exclude_types.split(',') if t.strip()]
            if types_list:
                queryset = queryset.exclude(notification_type__in=types_list)

        updated_count = queryset.update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'Marked {updated_count} notifications as read'
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        queryset = self.get_queryset().filter(is_read=False)
        # Optional include/exclude filters
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        exclude_type = request.query_params.get('exclude_type')
        if exclude_type:
            queryset = queryset.exclude(notification_type=exclude_type)
        exclude_types = request.query_params.get('exclude_types')
        if exclude_types:
            types_list = [t.strip() for t in exclude_types.split(',') if t.strip()]
            if types_list:
                queryset = queryset.exclude(notification_type__in=types_list)
        count = queryset.count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get notification summary by type"""
        queryset = self.get_queryset()

        summary = {}
        notification_types = [t[0] for t in PlanNotification.NOTIFICATION_TYPES]

        for ntype in notification_types:
            summary[ntype] = {
                'total': queryset.filter(notification_type=ntype).count(),
                'unread': queryset.filter(notification_type=ntype, is_read=False).count(),
            }

        return Response(summary)


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing notification preferences"""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'put', 'patch']  # Only allow viewing and updating
    
    def get_queryset(self):
        """Get preferences for current user"""
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create notification preferences for user"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return preferences
    
    @action(detail=False, methods=['get'])
    def my_preferences(self, request):
        """Get current user's notification preferences"""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_preferences(self, request):
        """Update notification preferences"""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing email queue (admin/coach only)"""
    serializer_class = EmailQueueSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get email queue based on user permissions"""
        user = self.request.user

        # Only allow admins and coaches to view broader email queue
        if user.is_staff or hasattr(user, 'coach_profile'):
            queryset = EmailQueue.objects.all().order_by('-created_at')

            # If coach, only show emails related to their clients
            if hasattr(user, 'coach_profile') and not user.is_staff:
                queryset = queryset.filter(
                    notification__subscription__product_plan__coach=user.coach_profile
                )

            return queryset

        # Regular users can only see their own email queue entries
        return EmailQueue.objects.filter(
            notification__subscription__client=user
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List email queue with filtering"""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by notification type
        email_type = request.query_params.get('email_type')
        if email_type:
            queryset = queryset.filter(notification__notification_type=email_type)
        
        # Filter by date range
        start_date = request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        
        # Filter failed emails only
        if request.query_params.get('failed_only') == 'true':
            queryset = queryset.filter(status='failed')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get email queue statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_emails': queryset.count(),
            'queued': queryset.filter(status='queued').count(),
            'processing': queryset.filter(status='processing').count(),
            'sent': queryset.filter(status='sent').count(),
            'failed': queryset.filter(status='failed').count(),
            'recent_failures': queryset.filter(
                status='failed',
                created_at__gte=timezone.now() - timezone.timedelta(hours=24)
            ).count(),
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry failed email (admin/coach only)"""
        if not (request.user.is_staff or hasattr(request.user, 'coach_profile')):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        email_queue = self.get_object()
        
        if email_queue.status != 'failed':
            return Response(
                {'error': 'Can only retry failed emails'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset email for retry: re-queue the existing notification
        email_queue.status = 'queued'
        email_queue.scheduled_send_time = timezone.now()
        email_queue.last_error = ''
        email_queue.next_retry_at = None
        email_queue.save(update_fields=['status', 'scheduled_send_time', 'last_error', 'next_retry_at'])

        return Response({'message': 'Email re-queued for retry'})


class NotificationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification templates (admin only)"""
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow staff to view templates"""
        if self.request.user.is_staff:
            return NotificationTemplate.objects.all().order_by('notification_type')

        return NotificationTemplate.objects.none()
    
    def list(self, request, *args, **kwargs):
        """List templates with filtering"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = self.get_queryset()
        
        # Filter by template type
        template_type = request.query_params.get('type')
        if template_type:
            queryset = queryset.filter(notification_type=template_type)
        
        # Filter active templates only
        if request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(is_active=True)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

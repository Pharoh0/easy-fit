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

User = get_user_model()


class PlanNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan notifications"""
    serializer_class = PlanNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get notifications for current user"""
        return PlanNotification.objects.filter(
            user=self.request.user
        ).select_related('subscription__product_plan').order_by('-created_at')
    
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
        updated_count = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'Marked {updated_count} notifications as read'
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get notification summary by type"""
        queryset = self.get_queryset()
        
        summary = {}
        notification_types = [
            'plan_created', 'plan_updated', 'plan_completed',
            'milestone_achieved', 'goal_achieved', 'reminder',
            'coach_message', 'plan_expiring'
        ]
        
        for ntype in notification_types:
            summary[ntype] = {
                'total': queryset.filter(notification_type=ntype).count(),
                'unread': queryset.filter(notification_type=ntype, is_read=False).count()
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
        
        # Only allow admins and coaches to view email queue
        if user.is_staff or hasattr(user, 'coach_profile'):
            queryset = EmailQueue.objects.all().order_by('-created_at')
            
            # If coach, only show emails related to their clients
            if hasattr(user, 'coach_profile') and not user.is_staff:
                queryset = queryset.filter(
                    subscription__product_plan__coach=user.coach_profile
                )
            
            return queryset
        
        # Regular users can only see their own email queue entries
        return EmailQueue.objects.filter(
            subscription__client=user
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List email queue with filtering"""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by email type
        email_type = request.query_params.get('email_type')
        if email_type:
            queryset = queryset.filter(email_type=email_type)
        
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
            'pending': queryset.filter(status='pending').count(),
            'sent': queryset.filter(status='sent').count(),
            'failed': queryset.filter(status='failed').count(),
            'recent_failures': queryset.filter(
                status='failed',
                created_at__gte=timezone.now() - timezone.timedelta(hours=24)
            ).count()
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
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset email for retry
        email_queue.status = 'pending'
        email_queue.retry_count += 1
        email_queue.error_message = None
        email_queue.save()
        
        # Trigger email sending (this would typically be handled by a background task)
        from .utils import send_plan_notification_email
        try:
            send_plan_notification_email(
                email_queue.subscription,
                email_queue.email_type,
                email_queue.context_data
            )
            return Response({'message': 'Email queued for retry'})
        except Exception as e:
            return Response(
                {'error': f'Failed to queue email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing notification templates (admin only)"""
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Only allow staff to view templates"""
        if self.request.user.is_staff:
            return NotificationTemplate.objects.all().order_by('template_type')
        
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
            queryset = queryset.filter(template_type=template_type)
        
        # Filter active templates only
        if request.query_params.get('active_only') == 'true':
            queryset = queryset.filter(is_active=True)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

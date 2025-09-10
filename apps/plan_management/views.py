from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from .models import PlanRequest, PlanCancellation
from .serializers import (
    PlanRequestSerializer, PlanCancellationSerializer,
    PlanRequestCreateSerializer, PlanCancellationCreateSerializer,
)
from .client.models import PlanSubscription
from .coach.models import ProductPlan
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
import logging
import uuid

User = get_user_model()
logger = logging.getLogger(__name__)


class PlanRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan requests"""
    serializer_class = PlanRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PlanRequestCreateSerializer
        return PlanRequestSerializer
    
    def get_queryset(self):
        """Get requests based on user role"""
        user = self.request.user
        
        # If user is a coach, show requests for their plans
        if hasattr(user, 'coach_profile'):
            return PlanRequest.objects.filter(
                plan__coach=user.coach_profile
            ).select_related('client', 'plan').order_by('-created_at')
        
        # If user is a client, show their requests
        return PlanRequest.objects.filter(
            client=user
        ).select_related('plan__coach__user').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List requests with filtering options"""
        queryset = self.get_queryset()
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by plan
        plan_id = request.query_params.get('plan')
        if plan_id:
            queryset = queryset.filter(plan_id=plan_id)
        
        # Filter by client (for coaches)
        client_id = request.query_params.get('client')
        if client_id and hasattr(request.user, 'coach_profile'):
            queryset = queryset.filter(client_id=client_id)
        
        # Filter pending requests only
        if request.query_params.get('pending_only') == 'true':
            queryset = queryset.filter(status='pending')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new plan request"""
        logger.info("PlanRequest create initiated", extra={'user_id': request.user.id})
        plan_id = request.data.get('plan_id')
        
        if not plan_id:
            logger.warning("PlanRequest create missing plan_id", extra={'user_id': request.user.id})
            return Response(
                {'error': 'plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            plan = ProductPlan.objects.get(id=plan_id)
        except ProductPlan.DoesNotExist:
            logger.warning("PlanRequest create plan not found", extra={'plan_id': plan_id})
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Ensure plan is available (active and not finished)
        if not plan.is_active:
            return Response({'error': 'This plan is not available.'}, status=status.HTTP_400_BAD_REQUEST)
        if plan.end_date < timezone.now().date():
            return Response({'error': 'This plan has already ended.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already has an active or pending subscription to this plan
        existing_subscription = PlanSubscription.objects.filter(
            client=request.user,
            product_plan=plan,
            status__in=['active', 'pending']
        ).first()
        
        if existing_subscription:
            logger.info("PlanRequest blocked due to existing subscription", extra={'user_id': request.user.id, 'plan_id': plan_id})
            return Response(
                {'error': 'You already have an active or pending subscription to this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending request
        existing_request = PlanRequest.objects.filter(
            client=request.user,
            plan=plan,
            status='pending'
        ).first()
        
        if existing_request:
            logger.info("PlanRequest blocked due to existing pending request", extra={'user_id': request.user.id, 'plan_id': plan_id})
            return Response(
                {'error': 'You already have a pending request for this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the request and a pending subscription atomically
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                plan_request = serializer.save(
                    client=request.user,
                    plan=plan
                )
                # Create a pending subscription so the client can see it immediately
                pending_subscription = PlanSubscription.objects.create(
                    client=request.user,
                    product_plan=plan,
                )

            # Send notification to coach (non-blocking): email + in-app (WS)
            from .notifications.utils import send_plan_notification_email
            try:
                send_plan_notification_email(
                    None,  # We created a pending subscription but email template for request doesn't require it
                    'plan_request_received',
                    {
                        'plan_request': plan_request,
                        'client': request.user,
                        'coach': plan.coach.user,
                        'plan': plan
                    }
                )
                # Also create an in-app notification for the coach so WebSocket delivers it
                try:
                    from .notifications.models import PlanNotification
                    notif = PlanNotification.objects.create(
                        subscription=pending_subscription,  # may be pending
                        user=plan.coach.user,
                        notification_type='plan_request_received',
                        recipient_email=getattr(plan.coach.user, 'email', '') or '',
                        subject=f"New Plan Request from {request.user.get_full_name() or request.user.username}",
                        email_content=f"Client {request.user.get_full_name() or request.user.username} requested plan {plan.name}",
                        plan_access_token=str(uuid.uuid4()),
                        link_expires_at=timezone.now() + timezone.timedelta(days=30),
                        additional_data={
                            'plan_id': plan.id,
                            'plan_request_id': plan_request.id,
                            'client_id': request.user.id,
                        }
                    )
                    logger.info(f"Coach in-app notification created for plan request: {notif.id}")
                except Exception as ne:
                    logger.warning(f"Failed to create coach in-app plan_request_received notification: {ne}")
            except Exception as e:
                # Don't fail the request if email fails
                logger.exception("Failed to send plan request email notification", exc_info=e)

            display_serializer = PlanRequestSerializer(plan_request, context={'request': request})
            return Response(display_serializer.data, status=status.HTTP_201_CREATED)
        
        logger.warning("PlanRequest create validation failed", extra={'errors': serializer.errors})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a plan request (coach only)"""
        plan_request = self.get_object()
        
        # Only the coach can approve
        if not hasattr(request.user, 'coach_profile') or plan_request.plan.coach != request.user.coach_profile:
            return Response(
                {'error': 'Only the coach can approve this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if plan_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure plan is still available (active and not finished)
        plan = plan_request.plan
        if not plan.is_active:
            return Response({'error': 'This plan is no longer active.'}, status=status.HTTP_400_BAD_REQUEST)
        if plan.end_date < timezone.now().date():
            return Response({'error': 'This plan has already ended.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get customization data from request
        customization_notes = request.data.get('customization_notes', '')
        custom_price = request.data.get('custom_price')
        custom_duration = request.data.get('custom_duration')
        
        # Approve the request
        subscription = plan_request.approve(
            customization_notes=customization_notes,
            custom_price=custom_price,
            custom_duration=custom_duration
        )
        
        # Send notification to client
        from .notifications.utils import send_plan_notification_email
        try:
            logger.info(f"Sending plan_approved notification for subscription {subscription.id} to client {plan_request.client.id}")
            notification = send_plan_notification_email(
                subscription,
                'plan_approved',
                {
                    'subscription': subscription,
                    'client': plan_request.client,
                    'coach': request.user,
                    'plan': plan_request.plan,
                    'customization_notes': customization_notes,
                    'plan_request': plan_request
                }
            )
            logger.info(f"Plan approved notification created: {notification.id if notification else 'None'}")
            # Also notify the coach that the client subscription is now active
            try:
                from .notifications.models import PlanNotification
                coach_user = plan.coach.user
                coach_notif = PlanNotification.objects.create(
                    subscription=subscription,
                    user=coach_user,
                    notification_type='plan_approved',
                    recipient_email=getattr(coach_user, 'email', '') or '',
                    subject=f"Subscription approved for {plan_request.client.get_full_name() or plan_request.client.username}",
                    email_content=f"Client subscribed to {plan.name} has been approved.",
                    plan_access_token=str(uuid.uuid4()),
                    link_expires_at=timezone.now() + timezone.timedelta(days=30),
                    additional_data={
                        'plan_id': plan.id,
                        'subscription_id': subscription.id,
                        'client_id': plan_request.client.id,
                    }
                )
                logger.info(f"Coach in-app notification created for plan approval: {coach_notif.id}")
            except Exception as ne:
                logger.warning(f"Failed to create coach in-app plan_approved notification: {ne}")
        except Exception as e:
            logger.error(f"Error sending plan_approved notification: {e}")
        
        serializer = self.get_serializer(plan_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a plan request (coach only)"""
        plan_request = self.get_object()
        
        # Only the coach can reject
        if not hasattr(request.user, 'coach_profile') or plan_request.plan.coach != request.user.coach_profile:
            return Response(
                {'error': 'Only the coach can reject this request'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if plan_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('rejection_reason', '')
        with transaction.atomic():
            plan_request.reject(rejection_reason)
            # Also cancel any pending subscription created for this request
            pending_sub = PlanSubscription.objects.filter(
                client=plan_request.client,
                product_plan=plan_request.plan,
                status='pending'
            ).first()
            if pending_sub:
                pending_sub.cancel()
        
        # Send notification to client
        from .notifications.utils import send_plan_notification_email
        try:
            logger.info(f"Sending plan_rejected notification to client {plan_request.client.id}")
            notification = send_plan_notification_email(
                pending_sub,
                'plan_rejected',
                {
                    'plan_request': plan_request,
                    'client': plan_request.client,
                    'coach': request.user,
                    'plan': plan_request.plan,
                    'rejection_reason': rejection_reason
                }
            )
            logger.info(f"Plan rejected notification created: {notification.id if notification else 'None'}")
        except Exception as e:
            logger.error(f"Error sending plan_rejected notification: {e}")
        
        serializer = self.get_serializer(plan_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a plan request (client only)"""
        plan_request = self.get_object()
        
        # Only the client can cancel their own request
        if plan_request.client != request.user:
            return Response(
                {'error': 'You can only cancel your own requests'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if plan_request.status != 'pending':
            return Response(
                {'error': 'Only pending requests can be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            plan_request.status = 'cancelled'
            plan_request.save()
            # Also cancel any pending subscription created for this request
            pending_sub = PlanSubscription.objects.filter(
                client=plan_request.client,
                product_plan=plan_request.plan,
                status='pending'
            ).first()
            if pending_sub:
                pending_sub.cancel()
        
        serializer = self.get_serializer(plan_request)
        return Response(serializer.data)


class PlanCancellationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan cancellations"""
    serializer_class = PlanCancellationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PlanCancellationCreateSerializer
        return PlanCancellationSerializer
    
    def get_queryset(self):
        """Get cancellations based on user role"""
        user = self.request.user
        
        # If user is a coach, show cancellations for their plans
        if hasattr(user, 'coach_profile'):
            return PlanCancellation.objects.filter(
                subscription__product_plan__coach=user.coach_profile
            ).select_related('subscription__client', 'subscription__product_plan').order_by('-created_at')
        
        # If user is a client, show their cancellations
        return PlanCancellation.objects.filter(
            subscription__client=user
        ).select_related('subscription__product_plan__coach__user').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List cancellations with filtering"""
        queryset = self.get_queryset()
        
        # Filter by cancellation reason
        reason = request.query_params.get('reason')
        if reason:
            queryset = queryset.filter(cancellation_reason=reason)
        
        # Filter by refund status
        refund_status = request.query_params.get('refund_status')
        if refund_status:
            queryset = queryset.filter(refund_status=refund_status)
        
        # Filter by subscription
        subscription_id = request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a cancellation request"""
        logger.info("PlanCancellation create initiated", extra={'user_id': request.user.id})
        subscription_id = request.data.get('subscription_id')
        
        if not subscription_id:
            logger.warning("PlanCancellation missing subscription_id", extra={'user_id': request.user.id})
            return Response(
                {'error': 'subscription_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscription = PlanSubscription.objects.get(
                id=subscription_id,
                client=request.user,
                status='active'
            )
        except PlanSubscription.DoesNotExist:
            logger.warning("Active subscription not found for cancellation", extra={'subscription_id': subscription_id, 'user_id': request.user.id})
            return Response(
                {'error': 'Active subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if cancellation already exists
        if hasattr(subscription, 'cancellation'):
            logger.info("Cancellation already exists", extra={'subscription_id': subscription.id})
            return Response(
                {'error': 'Cancellation request already exists for this subscription'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            cancellation = serializer.save(subscription=subscription)
            
            # Process the cancellation
            cancellation.process_cancellation()
            
            # Send notification to coach: email + in-app (WS)
            from .notifications.utils import send_plan_notification_email
            try:
                send_plan_notification_email(
                    subscription,
                    'plan_cancelled',
                    {
                        'cancellation': cancellation,
                        'subscription': subscription,
                        'client': request.user,
                        'coach': subscription.product_plan.coach.user
                    }
                )
                # In-app notification for coach as well
                try:
                    coach_user = subscription.product_plan.coach.user
                    notif = PlanNotification.objects.create(
                        subscription=subscription,
                        user=coach_user,
                        notification_type='plan_cancelled',
                        recipient_email=getattr(coach_user, 'email', '') or '',
                        subject=f"Cancellation requested by {request.user.get_full_name() or request.user.username}",
                        email_content=f"Client requested cancellation for {subscription.product_plan.name}.",
                        plan_access_token=str(uuid.uuid4()),
                        link_expires_at=timezone.now() + timezone.timedelta(days=30),
                        additional_data={
                            'cancellation_id': cancellation.id,
                            'subscription_id': subscription.id,
                            'client_id': request.user.id,
                        }
                    )
                    logger.info(f"Coach in-app notification created for cancellation: {notif.id}")
                except Exception as ne:
                    logger.warning(f"Failed to create coach in-app plan_cancelled notification: {ne}")
            except Exception as e:
                logger.exception("Failed to send plan cancelled email notification", exc_info=e)
            
            display_serializer = PlanCancellationSerializer(cancellation, context={'request': request})
            return Response(display_serializer.data, status=status.HTTP_201_CREATED)
        
        logger.warning("PlanCancellation create validation failed", extra={'errors': serializer.errors})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def process_refund(self, request, pk=None):
        """Process refund for cancellation (coach/admin only)"""
        cancellation = self.get_object()
        
        # Only coach or admin can process refunds
        if not (request.user.is_staff or (
            hasattr(request.user, 'coach_profile') and 
            cancellation.subscription.product_plan.coach == request.user.coach_profile
        )):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        refund_amount = request.data.get('refund_amount')
        refund_notes = request.data.get('refund_notes', '')
        
        if refund_amount is None:
            return Response(
                {'error': 'refund_amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cancellation.process_refund(refund_amount, refund_notes)
        
        # Send notification to client
        from .notifications.utils import send_plan_notification_email
        try:
            send_plan_notification_email(
                cancellation.subscription,
                'refund_processed',
                {
                    'cancellation': cancellation,
                    'refund_amount': refund_amount,
                    'client': cancellation.subscription.client
                }
            )
        except Exception as e:
            pass
        
        serializer = self.get_serializer(cancellation)
        return Response(serializer.data)

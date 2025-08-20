from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import PlanRequest, PlanCancellation
from .serializers import PlanRequestSerializer, PlanCancellationSerializer
from .client.models import PlanSubscription
from .coach.models import ProductPlan
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan requests"""
    serializer_class = PlanRequestSerializer
    permission_classes = [IsAuthenticated]
    
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
        plan_id = request.data.get('plan_id')
        
        if not plan_id:
            return Response(
                {'error': 'plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            plan = ProductPlan.objects.get(id=plan_id)
        except ProductPlan.DoesNotExist:
            return Response(
                {'error': 'Plan not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already has an active subscription to this plan
        existing_subscription = PlanSubscription.objects.filter(
            client=request.user,
            product_plan=plan,
            status__in=['active', 'pending']
        ).first()
        
        if existing_subscription:
            return Response(
                {'error': 'You already have an active subscription to this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending request
        existing_request = PlanRequest.objects.filter(
            client=request.user,
            plan=plan,
            status='pending'
        ).first()
        
        if existing_request:
            return Response(
                {'error': 'You already have a pending request for this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the request
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            plan_request = serializer.save(
                client=request.user,
                plan=plan
            )
            
            # Send notification to coach
            from .notifications.utils import send_plan_notification_email
            try:
                send_plan_notification_email(
                    None,  # No subscription yet
                    'plan_request_received',
                    {
                        'plan_request': plan_request,
                        'client': request.user,
                        'coach': plan.coach.user,
                        'plan': plan
                    }
                )
            except Exception as e:
                # Don't fail the request if email fails
                pass
            
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        
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
            send_plan_notification_email(
                subscription,
                'plan_approved',
                {
                    'subscription': subscription,
                    'client': plan_request.client,
                    'coach': request.user,
                    'plan': plan_request.plan,
                    'customization_notes': customization_notes
                }
            )
        except Exception as e:
            pass
        
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
        plan_request.reject(rejection_reason)
        
        # Send notification to client
        from .notifications.utils import send_plan_notification_email
        try:
            send_plan_notification_email(
                None,
                'plan_rejected',
                {
                    'plan_request': plan_request,
                    'client': plan_request.client,
                    'coach': request.user,
                    'plan': plan_request.plan,
                    'rejection_reason': rejection_reason
                }
            )
        except Exception as e:
            pass
        
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
        
        plan_request.status = 'cancelled'
        plan_request.save()
        
        serializer = self.get_serializer(plan_request)
        return Response(serializer.data)


class PlanCancellationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan cancellations"""
    serializer_class = PlanCancellationSerializer
    permission_classes = [IsAuthenticated]
    
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
        subscription_id = request.data.get('subscription_id')
        
        if not subscription_id:
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
            return Response(
                {'error': 'Active subscription not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if cancellation already exists
        if hasattr(subscription, 'cancellation'):
            return Response(
                {'error': 'Cancellation request already exists for this subscription'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            cancellation = serializer.save(subscription=subscription)
            
            # Process the cancellation
            cancellation.process_cancellation()
            
            # Send notification to coach
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
            except Exception as e:
                pass
            
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        
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

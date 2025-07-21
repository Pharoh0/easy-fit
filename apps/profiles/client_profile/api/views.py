from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from ..models import (
    ClientProfile, 
    ClientMeasurement, 
    ClientDietRequest, 
    ClientSubscription,
    ProgressReport
)
from .serializers import (
    ClientProfileMinimalSerializer,
    ClientMeasurementSerializer,
    ProgressReportSerializer,
    ClientDietRequestSerializer,
    ClientSubscriptionSerializer
)
from datetime import datetime, timedelta
from django.db.models import Q


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # For client-related objects
        if hasattr(obj, 'client'):
            return obj.client.user == request.user
        
        # For client profile itself
        return obj.user == request.user


class ProgressReportViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['report_date', 'week_number']
    ordering = ['-report_date']
    
    def get_queryset(self):
        """
        Return progress reports for the authenticated client user only.
        """
        user = self.request.user
        try:
            client = ClientProfile.objects.get(user=user)
            return ProgressReport.objects.filter(subscription__client=client)
        except ClientProfile.DoesNotExist:
            return ProgressReport.objects.none()
    
    @action(detail=True, methods=['patch'])
    def add_comment(self, request, pk=None):
        """
        API endpoint to add a client comment to a progress report
        """
        report = self.get_object()
        client_comment = request.data.get('client_comment', '')
        
        # Security check - only the client of this subscription can add comments
        if request.user != report.subscription.client.user:
            return Response(
                {"error": "You do not have permission to add comments to this report."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report.client_comment = client_comment
        report.save()
        serializer = self.get_serializer(report)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_subscription(self, request):
        """
        Filter progress reports by subscription ID
        """
        subscription_id = request.query_params.get('subscription_id')
        if not subscription_id:
            return Response(
                {"error": "Subscription ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Security check - ensure the subscription belongs to the requesting client
        try:
            client = ClientProfile.objects.get(user=request.user)
            subscription = ClientSubscription.objects.get(
                id=subscription_id, 
                client=client
            )
        except (ClientProfile.DoesNotExist, ClientSubscription.DoesNotExist):
            return Response(
                {"error": "Subscription not found or access denied"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        reports = ProgressReport.objects.filter(subscription=subscription).order_by('-report_date')
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)


class ClientDietRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ClientDietRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """
        Return diet requests for the authenticated client user only.
        """
        user = self.request.user
        try:
            client = ClientProfile.objects.get(user=user)
            return ClientDietRequest.objects.filter(client=client)
        except ClientProfile.DoesNotExist:
            return ClientDietRequest.objects.none()
    
    def perform_create(self, serializer):
        client = ClientProfile.objects.get(user=self.request.user)
        serializer.save(client=client, status='pending')
    
    @action(detail=True, methods=['post'])
    def accept_offer(self, request, pk=None):
        """
        API endpoint to accept a diet request offer from a coach
        """
        diet_request = self.get_object()
        
        # Check if the diet request is actually an offer and is pending
        if not diet_request.is_offer or diet_request.status != 'pending':
            return Response(
                {"error": "This request is not a valid offer or is no longer pending."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this diet request
        if request.user != diet_request.client.user:
            return Response(
                {"error": "You do not have permission to accept this offer."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to accepted
        diet_request.status = 'accepted'
        diet_request.save()
        
        serializer = self.get_serializer(diet_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject_offer(self, request, pk=None):
        """
        API endpoint to reject a diet request offer from a coach
        """
        diet_request = self.get_object()
        
        # Check if the diet request is actually an offer and is pending
        if not diet_request.is_offer or diet_request.status != 'pending':
            return Response(
                {"error": "This request is not a valid offer or is no longer pending."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this diet request
        if request.user != diet_request.client.user:
            return Response(
                {"error": "You do not have permission to reject this offer."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to rejected
        diet_request.status = 'rejected'
        diet_request.save()
        
        serializer = self.get_serializer(diet_request)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        API endpoint to cancel a diet request
        """
        diet_request = self.get_object()
        
        # Check if the diet request is in a cancellable state
        if diet_request.status not in ['pending', 'accepted']:
            return Response(
                {"error": "This request cannot be cancelled in its current state."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this diet request
        if request.user != diet_request.client.user:
            return Response(
                {"error": "You do not have permission to cancel this request."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to cancelled
        diet_request.status = 'cancelled'
        diet_request.save()
        
        serializer = self.get_serializer(diet_request)
        return Response(serializer.data)


class ClientSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return subscriptions for the authenticated client user only.
        """
        user = self.request.user
        try:
            client = ClientProfile.objects.get(user=user)
            return ClientSubscription.objects.filter(client=client)
        except ClientProfile.DoesNotExist:
            return ClientSubscription.objects.none()
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """
        API endpoint to pause a subscription
        """
        subscription = self.get_object()
        
        # Check if the subscription is active
        if subscription.status != 'active':
            return Response(
                {"error": "Only active subscriptions can be paused."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this subscription
        if request.user != subscription.client.user:
            return Response(
                {"error": "You do not have permission to pause this subscription."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to paused
        subscription.status = 'paused'
        
        # Extend the end date by the duration of the pause
        # This functionality would vary based on your business logic
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """
        API endpoint to resume a paused subscription
        """
        subscription = self.get_object()
        
        # Check if the subscription is paused
        if subscription.status != 'paused':
            return Response(
                {"error": "Only paused subscriptions can be resumed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this subscription
        if request.user != subscription.client.user:
            return Response(
                {"error": "You do not have permission to resume this subscription."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to active
        subscription.status = 'active'
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        API endpoint to cancel a subscription
        """
        subscription = self.get_object()
        
        # Check if the subscription is in a cancellable state
        if subscription.status not in ['active', 'paused']:
            return Response(
                {"error": "This subscription cannot be cancelled in its current state."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user is the client of this subscription
        if request.user != subscription.client.user:
            return Response(
                {"error": "You do not have permission to cancel this subscription."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the status to cancelled
        subscription.status = 'cancelled'
        subscription.save()
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

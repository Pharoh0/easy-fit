from rest_framework import viewsets, permissions, status, filters, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone

from .models import (
    ClientProfile, ClientMeasurement, ClientDietRequest,
    CoachOffer, ClientSubscription, ProgressReport
)
from .serializers import (
    ClientProfileSerializer, ClientMeasurementSerializer,
    ClientDietRequestSerializer, CoachOfferSerializer,
    ClientSubscriptionSerializer, ProgressReportSerializer,
    ClientMeasurementMinimalSerializer
)
from apps.profiles.coach_profile.models import CoachProfile


class ClientProfileViewSet(viewsets.ModelViewSet):
    """API endpoint for viewing and editing client profiles"""
    queryset = ClientProfile.objects.all()
    serializer_class = ClientProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter the queryset to only include the profile of the authenticated user
        # If the user is staff, allow them to see all profiles
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return self.queryset
        return self.queryset.filter(user=user)

    def perform_update(self, serializer):
        # Ensure that the user field is not updated to another user
        serializer.save(user=self.request.user)
        
    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        """Get the profile of the currently authenticated client"""
        try:
            profile = ClientProfile.objects.get(user=request.user)
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except ClientProfile.DoesNotExist:
            return Response({"detail": "Client profile not found"}, status=status.HTTP_404_NOT_FOUND)


class ClientMeasurementViewSet(viewsets.ModelViewSet):
    """API endpoint for managing client body measurements"""
    queryset = ClientMeasurement.objects.all()
    serializer_class = ClientMeasurementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'weight', 'body_fat_percentage']
    ordering = ['-date']

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all measurements
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        # Clients can only see their own measurements
        if hasattr(user, 'client_profile'):
            return self.queryset.filter(client=user.client_profile)
        
        # Coaches can see measurements of their subscribed clients
        if hasattr(user, 'coach_profile'):
            coach_profile = user.coach_profile
            client_subscriptions = ClientSubscription.objects.filter(
                coach=coach_profile, 
                status='active'
            ).values_list('client', flat=True)
            return self.queryset.filter(client__in=client_subscriptions)
        
        return ClientMeasurement.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the client to the current user's client profile
        client_profile = self.request.user.client_profile
        serializer.save(client=client_profile)
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get the latest measurement for the current user"""
        try:
            measurement = ClientMeasurement.objects.filter(
                client=request.user.client_profile
            ).latest()
            serializer = self.get_serializer(measurement)
            return Response(serializer.data)
        except ClientMeasurement.DoesNotExist:
            return Response({"detail": "No measurements found"}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def compare(self, request):
        """Compare measurements between two dates"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response({"detail": "Both start_date and end_date are required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            start_measurement = ClientMeasurement.objects.filter(
                client=request.user.client_profile, 
                date__lte=start_date
            ).latest('date')
            
            end_measurement = ClientMeasurement.objects.filter(
                client=request.user.client_profile, 
                date__lte=end_date
            ).latest('date')
            
            comparison = {
                'start': ClientMeasurementSerializer(start_measurement).data,
                'end': ClientMeasurementSerializer(end_measurement).data,
                'differences': {
                    'weight': (end_measurement.weight - start_measurement.weight) 
                              if (end_measurement.weight and start_measurement.weight) else None,
                    'body_fat': (end_measurement.body_fat_percentage - start_measurement.body_fat_percentage)
                               if (end_measurement.body_fat_percentage and start_measurement.body_fat_percentage) else None,
                    # Add more comparisons as needed
                }
            }
            return Response(comparison)
        except ClientMeasurement.DoesNotExist:
            return Response({"detail": "Measurements not found for the specified dates"}, 
                          status=status.HTTP_404_NOT_FOUND)


class ClientDietRequestViewSet(viewsets.ModelViewSet):
    """API endpoint for managing client diet requests"""
    queryset = ClientDietRequest.objects.all()
    serializer_class = ClientDietRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']
    search_fields = ['title', 'description', 'goals']

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all requests
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        # Clients can only see their own requests
        if hasattr(user, 'client_profile'):
            return self.queryset.filter(client=user.client_profile)
        
        # Coaches can see all open requests
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(status='open')
        
        return ClientDietRequest.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the client to the current user's client profile
        client_profile = self.request.user.client_profile
        serializer.save(client=client_profile)
    
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """Get all diet requests created by the current user"""
        queryset = self.get_queryset().filter(client=request.user.client_profile)
        
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CoachOfferViewSet(viewsets.ModelViewSet):
    """API endpoint for managing coach offers in response to diet requests"""
    queryset = CoachOffer.objects.all()
    serializer_class = CoachOfferSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'price']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all offers
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        # Clients can only see offers for their requests
        if hasattr(user, 'client_profile'):
            client_requests = ClientDietRequest.objects.filter(client=user.client_profile)
            return self.queryset.filter(request__in=client_requests)
        
        # Coaches can see their own offers
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(coach=user.coach_profile)
        
        return CoachOffer.objects.none()
    
    def perform_create(self, serializer):
        # Automatically set the coach to the current user's coach profile
        coach_profile = self.request.user.coach_profile
        serializer.save(coach=coach_profile)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a coach's offer"""
        offer = self.get_object()
        
        # Verify the user is the client who made the request
        if not hasattr(request.user, 'client_profile') or offer.request.client != request.user.client_profile:
            return Response({"detail": "You are not authorized to accept this offer"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if the offer is still pending
        if offer.status != 'pending':
            return Response({"detail": "This offer is no longer pending"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark this offer as accepted and all others as rejected
        CoachOffer.objects.filter(request=offer.request).exclude(id=offer.id).update(status='rejected')
        offer.status = 'accepted'
        offer.save()
        
        # Update the request status
        request_obj = offer.request
        request_obj.status = 'in_progress'
        request_obj.save()
        
        # Create a subscription
        end_date = timezone.now().date() + timezone.timedelta(days=offer.duration_weeks * 7)
        subscription = ClientSubscription.objects.create(
            client=request.user.client_profile,
            coach=offer.coach,
            offer=offer,
            start_date=timezone.now().date(),
            end_date=end_date,
            price_paid=offer.price,
            status='active'
        )
        
        return Response({
            "offer": CoachOfferSerializer(offer).data,
            "subscription": ClientSubscriptionSerializer(subscription).data
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a coach's offer"""
        offer = self.get_object()
        
        # Verify the user is the client who made the request
        if not hasattr(request.user, 'client_profile') or offer.request.client != request.user.client_profile:
            return Response({"detail": "You are not authorized to reject this offer"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if the offer is still pending
        if offer.status != 'pending':
            return Response({"detail": "This offer is no longer pending"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark this offer as rejected
        offer.status = 'rejected'
        offer.save()
        
        return Response(CoachOfferSerializer(offer).data)


class ClientSubscriptionViewSet(viewsets.ModelViewSet):
    """API endpoint for managing client subscriptions to coach plans"""
    queryset = ClientSubscription.objects.all()
    serializer_class = ClientSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['start_date', 'end_date', 'status']
    ordering = ['-start_date']

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all subscriptions
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        # Clients can only see their own subscriptions
        if hasattr(user, 'client_profile'):
            return self.queryset.filter(client=user.client_profile)
        
        # Coaches can see subscriptions of their clients
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(coach=user.coach_profile)
        
        return ClientSubscription.objects.none()
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active subscriptions for the current user"""
        queryset = self.get_queryset().filter(status='active')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a subscription"""
        subscription = self.get_object()
        
        # Verify the user is the client or coach associated with this subscription
        is_client_owner = hasattr(request.user, 'client_profile') and subscription.client == request.user.client_profile
        is_coach_owner = hasattr(request.user, 'coach_profile') and subscription.coach == request.user.coach_profile
        
        if not (is_client_owner or is_coach_owner or request.user.is_staff):
            return Response({"detail": "You are not authorized to cancel this subscription"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check if the subscription is already cancelled
        if subscription.status == 'cancelled':
            return Response({"detail": "This subscription is already cancelled"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Mark the subscription as cancelled
        subscription.status = 'cancelled'
        subscription.save()
        
        return Response(ClientSubscriptionSerializer(subscription).data)


class ProgressReportViewSet(viewsets.ModelViewSet):
    """API endpoint for tracking client progress reports"""
    queryset = ProgressReport.objects.all()
    serializer_class = ProgressReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['report_date']
    ordering = ['-report_date']

    def get_queryset(self):
        user = self.request.user
        
        # Staff can see all progress reports
        if user.is_staff or user.is_superuser:
            return self.queryset
        
        # Clients can see reports for their subscriptions
        if hasattr(user, 'client_profile'):
            client_subscriptions = ClientSubscription.objects.filter(client=user.client_profile)
            return self.queryset.filter(subscription__in=client_subscriptions)
        
        # Coaches can see reports for subscriptions they're coaching
        if hasattr(user, 'coach_profile'):
            coach_subscriptions = ClientSubscription.objects.filter(coach=user.coach_profile)
            return self.queryset.filter(subscription__in=coach_subscriptions)
        
        return ProgressReport.objects.none()
    
    @action(detail=False, methods=['get'])
    def by_subscription(self, request):
        """Get progress reports filtered by subscription ID"""
        subscription_id = request.query_params.get('subscription_id')
        
        if not subscription_id:
            return Response({"detail": "subscription_id parameter is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        queryset = self.get_queryset().filter(subscription_id=subscription_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404
from apps.profiles.client_profile.models import ClientProfile, ClientMeasurement
from apps.profiles.client_profile.serializers import (
    ClientMeasurementSerializer, 
    ClientProfileSerializer
)
from .client.models import PlanSubscription
from .coach.models import ProductPlan
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class CoachClientAccessViewSet(viewsets.ViewSet):
    """ViewSet for coaches to access their clients' data for plan creation"""
    permission_classes = [IsAuthenticated]
    
    def get_coach_profile(self):
        """Get the coach profile for the current user"""
        if not hasattr(self.request.user, 'coach_profile'):
            return None
        return self.request.user.coach_profile
    
    def get_coach_clients(self):
        """Get all clients who have active or completed subscriptions with this coach"""
        coach_profile = self.get_coach_profile()
        if not coach_profile:
            return User.objects.none()
        
        # Get clients through plan subscriptions
        client_ids = PlanSubscription.objects.filter(
            product_plan__coach=coach_profile
        ).values_list('client_id', flat=True).distinct()
        
        return User.objects.filter(id__in=client_ids)
    
    @action(detail=False, methods=['get'])
    def my_clients(self, request):
        """Get list of clients for this coach"""
        coach_profile = self.get_coach_profile()
        if not coach_profile:
            return Response(
                {'error': 'Coach profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        clients = self.get_coach_clients()
        
        # Get client profiles with basic info
        client_data = []
        for client in clients:
            try:
                client_profile = client.client_profile
                
                # Get latest measurement
                latest_measurement = None
                try:
                    latest_measurement = ClientMeasurement.objects.filter(
                        client=client_profile
                    ).latest('date')
                except ClientMeasurement.DoesNotExist:
                    pass
                
                # Get active subscriptions
                active_subscriptions = PlanSubscription.objects.filter(
                    client=client,
                    product_plan__coach=coach_profile,
                    status='active'
                ).count()
                
                client_info = {
                    'id': client.id,
                    'username': client.username,
                    'full_name': client.get_full_name(),
                    'email': client.email,
                    'profile': {
                        'age': client_profile.age,
                        'gender': client_profile.gender,
                        'height': client_profile.height,
                        'weight': client_profile.weight,
                        'fitness_goals': client_profile.fitness_goals,
                        'health_conditions': client_profile.health_conditions,
                        'dietary_preferences': client_profile.dietary_preferences,
                        'activity_level': client_profile.activity_level,
                        'avatar': client_profile.avatar.url if client_profile.avatar else None,
                    },
                    'latest_measurement': ClientMeasurementSerializer(latest_measurement).data if latest_measurement else None,
                    'active_subscriptions': active_subscriptions,
                    'joined_date': client.date_joined.strftime('%Y-%m-%d')
                }
                client_data.append(client_info)
                
            except ClientProfile.DoesNotExist:
                continue
        
        return Response({
            'clients': client_data,
            'total_clients': len(client_data)
        })
    
    @action(detail=False, methods=['get'])
    def client_measurements(self, request):
        """Get measurements for a specific client"""
        client_id = request.query_params.get('client_id')
        
        if not client_id:
            return Response(
                {'error': 'client_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify coach has access to this client
        coach_profile = self.get_coach_profile()
        if not coach_profile:
            return Response(
                {'error': 'Coach profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if client is associated with this coach
        client_subscriptions = PlanSubscription.objects.filter(
            client_id=client_id,
            product_plan__coach=coach_profile
        )
        
        if not client_subscriptions.exists():
            return Response(
                {'error': 'You do not have access to this client\'s data'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            client = User.objects.get(id=client_id)
            client_profile = client.client_profile
        except (User.DoesNotExist, ClientProfile.DoesNotExist):
            return Response(
                {'error': 'Client not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get measurements with optional date filtering
        measurements_queryset = ClientMeasurement.objects.filter(
            client=client_profile
        ).order_by('-date')
        
        # Date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            measurements_queryset = measurements_queryset.filter(date__gte=start_date)
        if end_date:
            measurements_queryset = measurements_queryset.filter(date__lte=end_date)
        
        # Limit results
        limit = int(request.query_params.get('limit', 10))
        measurements = measurements_queryset[:limit]
        
        # Get measurement analytics
        analytics = self.get_measurement_analytics(measurements_queryset)
        
        return Response({
            'client_info': {
                'id': client.id,
                'full_name': client.get_full_name(),
                'profile': ClientProfileSerializer(client_profile).data
            },
            'measurements': ClientMeasurementSerializer(measurements, many=True).data,
            'analytics': analytics,
            'total_measurements': measurements_queryset.count()
        })
    
    def get_measurement_analytics(self, measurements_queryset):
        """Calculate measurement analytics for the client"""
        if not measurements_queryset.exists():
            return {}
        
        latest = measurements_queryset.first()
        oldest = measurements_queryset.last()
        
        if not latest or not oldest or latest == oldest:
            return {
                'latest_measurement': ClientMeasurementSerializer(latest).data if latest else None,
                'progress': {}
            }
        
        # Calculate progress
        progress = {}
        
        measurement_fields = [
            'weight', 'body_fat_percentage', 'chest', 'waist', 'hips', 
            'shoulders', 'arms', 'forearms', 'thighs', 'calves', 'neck',
            'muscle_mass', 'visceral_fat'
        ]
        
        for field in measurement_fields:
            latest_value = getattr(latest, field, None)
            oldest_value = getattr(oldest, field, None)
            
            if latest_value is not None and oldest_value is not None:
                change = float(latest_value) - float(oldest_value)
                percentage_change = (change / float(oldest_value)) * 100 if oldest_value != 0 else 0
                
                progress[field] = {
                    'latest': float(latest_value),
                    'oldest': float(oldest_value),
                    'change': round(change, 2),
                    'percentage_change': round(percentage_change, 2)
                }
        
        return {
            'latest_measurement': ClientMeasurementSerializer(latest).data,
            'oldest_measurement': ClientMeasurementSerializer(oldest).data,
            'progress': progress,
            'measurement_period': {
                'start_date': oldest.date.strftime('%Y-%m-%d'),
                'end_date': latest.date.strftime('%Y-%m-%d'),
                'duration_days': (latest.date - oldest.date).days
            }
        }
    
    @action(detail=False, methods=['get'])
    def client_profile(self, request):
        """Get detailed profile information for a specific client"""
        client_id = request.query_params.get('client_id')
        
        if not client_id:
            return Response(
                {'error': 'client_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify coach has access to this client
        coach_profile = self.get_coach_profile()
        if not coach_profile:
            return Response(
                {'error': 'Coach profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if client is associated with this coach
        client_subscriptions = PlanSubscription.objects.filter(
            client_id=client_id,
            product_plan__coach=coach_profile
        )
        
        if not client_subscriptions.exists():
            return Response(
                {'error': 'You do not have access to this client\'s data'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            client = User.objects.get(id=client_id)
            client_profile = client.client_profile
        except (User.DoesNotExist, ClientProfile.DoesNotExist):
            return Response(
                {'error': 'Client not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get subscription history
        subscriptions = PlanSubscription.objects.filter(
            client=client,
            product_plan__coach=coach_profile
        ).select_related('product_plan').order_by('-subscribed_at')
        
        subscription_data = []
        for sub in subscriptions:
            subscription_data.append({
                'id': sub.id,
                'plan_name': sub.product_plan.name,
                'plan_type': sub.product_plan.plan_type,
                'status': sub.status,
                'subscribed_at': sub.subscribed_at.strftime('%Y-%m-%d'),
                'duration_days': (sub.product_plan.end_date - sub.product_plan.start_date).days if (getattr(sub.product_plan, 'start_date', None) and getattr(sub.product_plan, 'end_date', None)) else None,
                'price': float(sub.product_plan.price)
            })
        
        return Response({
            'client_info': {
                'id': client.id,
                'username': client.username,
                'full_name': client.get_full_name(),
                'email': client.email,
                'date_joined': client.date_joined.strftime('%Y-%m-%d')
            },
            'profile': ClientProfileSerializer(client_profile).data,
            'subscriptions': subscription_data,
            'subscription_summary': {
                'total_subscriptions': subscriptions.count(),
                'active_subscriptions': subscriptions.filter(status='active').count(),
                'completed_subscriptions': subscriptions.filter(status='completed').count()
            }
        })
    
    @action(detail=False, methods=['get'])
    def client_search(self, request):
        """Search for clients by name or email"""
        query = request.query_params.get('q', '').strip()
        
        if len(query) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        coach_profile = self.get_coach_profile()
        if not coach_profile:
            return Response(
                {'error': 'Coach profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Search within coach's clients
        clients = self.get_coach_clients().filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        )[:10]  # Limit to 10 results
        
        client_data = []
        for client in clients:
            try:
                client_profile = client.client_profile
                client_data.append({
                    'id': client.id,
                    'username': client.username,
                    'full_name': client.get_full_name(),
                    'email': client.email,
                    'avatar': client_profile.avatar.url if client_profile.avatar else None,
                    'fitness_goals': client_profile.fitness_goals
                })
            except ClientProfile.DoesNotExist:
                continue
        
        return Response({
            'clients': client_data,
            'query': query,
            'total_results': len(client_data)
        })

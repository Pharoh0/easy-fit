from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg
from django.utils import timezone
from .models import PlanRating, RatingHelpfulness, CoachRatingStats
from .serializers import (
    PlanRatingSerializer, PlanRatingCreateSerializer, CoachResponseSerializer,
    CoachRatingStatsSerializer, RatingHelpfulnessCreateSerializer, RatingListSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanRatingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing plan ratings"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PlanRatingCreateSerializer
        elif self.action == 'list':
            # When requesting public reviews, return full serializer so review_content is included
            try:
                if self.request and self.request.query_params.get('public_only') == 'true':
                    return PlanRatingSerializer
                # Allow forcing full serializer via ?full=true
                if self.request and self.request.query_params.get('full') == 'true':
                    return PlanRatingSerializer
            except Exception:
                pass
            return RatingListSerializer
        return PlanRatingSerializer
    
    def get_queryset(self):
        """Get ratings based on user role"""
        user = self.request.user
        
        # If user is a coach, show ratings for their plans
        if hasattr(user, 'coach_profile'):
            return PlanRating.objects.filter(
                coach=user.coach_profile
            ).select_related('client', 'subscription__product_plan').order_by('-created_at')
        
        # If user is a client, show their ratings
        return PlanRating.objects.filter(
            client=user
        ).select_related('coach__user', 'subscription__product_plan').order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """List ratings with filtering options. If public_only=true, show public ratings across plans/coaches."""
        public_only = request.query_params.get('public_only') == 'true'
        if public_only:
            # Bypass user scoping to allow browsing public ratings
            queryset = PlanRating.objects.filter(is_public=True).select_related(
                'client', 'coach__user', 'subscription__product_plan'
            ).order_by('-created_at')
        else:
            queryset = self.get_queryset()
        
        # Filter by coach
        coach_id = request.query_params.get('coach')
        if coach_id:
            queryset = queryset.filter(coach_id=coach_id)
        
        # Filter by plan type
        plan_type = request.query_params.get('plan_type')
        if plan_type:
            queryset = queryset.filter(subscription__product_plan__plan_type=plan_type)
        
        # Filter by rating range
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            queryset = queryset.filter(overall_rating__gte=min_rating)

        # Filter by specific plan
        plan_id = request.query_params.get('plan_id') or request.query_params.get('plan')
        if plan_id:
            queryset = queryset.filter(subscription__product_plan_id=plan_id)

        # Filter by specific subscription
        subscription_id = request.query_params.get('subscription_id') or request.query_params.get('subscription')
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)

        # Filter by specific client
        client_id = request.query_params.get('client_id') or request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        # Filter public ratings only (for non-public list paths that still request it)
        if not public_only and request.query_params.get('public_only') == 'true':
            queryset = queryset.filter(is_public=True)
        
        # Filter verified ratings only
        if request.query_params.get('verified_only') == 'true':
            queryset = queryset.filter(is_verified=True)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new rating"""
        subscription_id = request.data.get('subscription_id')
        
        if not subscription_id:
            return Response(
                {'error': 'subscription_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already rated this subscription
        from ..client.models import PlanSubscription
        try:
            subscription = PlanSubscription.objects.get(
                id=subscription_id,
                client=request.user,
                status='completed'  # Only allow rating completed plans
            )
        except PlanSubscription.DoesNotExist:
            return Response(
                {'error': 'Subscription not found or not completed'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if rating already exists
        if hasattr(subscription, 'rating'):
            return Response(
                {'error': 'You have already rated this plan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'subscription': subscription}
        )
        
        if serializer.is_valid():
            rating = serializer.save()
            
            # Update coach rating stats
            coach_stats, created = CoachRatingStats.objects.get_or_create(
                coach=subscription.product_plan.coach
            )
            coach_stats.update_stats()
            
            return Response(
                PlanRatingSerializer(rating, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Allow coach to respond to rating"""
        rating = self.get_object()
        
        # Only the coach can respond
        if not hasattr(request.user, 'coach_profile') or rating.coach != request.user.coach_profile:
            return Response(
                {'error': 'Only the coach can respond to this rating'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CoachResponseSerializer(data=request.data)
        if serializer.is_valid():
            rating.respond_as_coach(serializer.validated_data['response'])
            
            return Response(
                PlanRatingSerializer(rating, context={'request': request}).data
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_helpful(self, request, pk=None):
        """Mark rating as helpful or not helpful"""
        rating = self.get_object()
        
        serializer = RatingHelpfulnessCreateSerializer(
            data=request.data,
            context={'request': request, 'rating': rating}
        )
        
        if serializer.is_valid():
            serializer.save()
            
            # Return updated rating with new helpfulness data
            return Response(
                PlanRatingSerializer(rating, context={'request': request}).data
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def coach_stats(self, request):
        """Get rating statistics for a coach"""
        coach_id = request.query_params.get('coach_id')
        
        if not coach_id:
            return Response(
                {'error': 'coach_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.profiles.coach_profile.models import CoachProfile
            coach = CoachProfile.objects.get(id=coach_id)
            stats, created = CoachRatingStats.objects.get_or_create(coach=coach)
            
            if created or not stats.last_updated or (timezone.now() - stats.last_updated).days > 1:
                stats.update_stats()
            
            serializer = CoachRatingStatsSerializer(stats, context={'request': request})
            return Response(serializer.data)
            
        except CoachProfile.DoesNotExist:
            return Response(
                {'error': 'Coach not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def top_rated_coaches(self, request):
        """Get top rated coaches"""
        limit = int(request.query_params.get('limit', 10))
        
        top_coaches = CoachRatingStats.objects.filter(
            total_ratings__gte=5  # At least 5 ratings
        ).order_by('-average_overall_rating')[:limit]
        
        serializer = CoachRatingStatsSerializer(top_coaches, many=True, context={'request': request})
        return Response(serializer.data)


class RatingHelpfulnessViewSet(viewsets.ModelViewSet):
    """ViewSet for managing rating helpfulness votes"""
    serializer_class = RatingHelpfulnessCreateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['post', 'delete']  # Only allow creating and deleting votes
    
    def get_queryset(self):
        """Get helpfulness votes for current user"""
        return RatingHelpfulness.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create or update helpfulness vote"""
        rating_id = request.data.get('rating_id')
        
        if not rating_id:
            return Response(
                {'error': 'rating_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rating = PlanRating.objects.get(id=rating_id)
        except PlanRating.DoesNotExist:
            return Response(
                {'error': 'Rating not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Don't allow voting on own ratings
        if rating.client == request.user:
            return Response(
                {'error': 'You cannot vote on your own rating'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request, 'rating': rating}
        )
        
        if serializer.is_valid():
            vote = serializer.save()
            return Response(
                {'message': 'Vote recorded successfully', 'is_helpful': vote.is_helpful},
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

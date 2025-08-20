from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from .models import PlanSubscription
from ..coach.models import ProductPlan
from .serializers import PlanSubscriptionSerializer


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PlanSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = PlanSubscriptionSerializer
    queryset = PlanSubscription.objects.all()
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Scope subscriptions to the authenticated user.
        - Clients see their own subscriptions
        - Coaches see subscriptions to their own plans
        """
        user = self.request.user
        qs = PlanSubscription.objects.select_related(
            'product_plan__coach__user', 'product_plan', 'client'
        )
        # Coach context
        coach_profile = getattr(user, 'coach_profile', None)
        if coach_profile is not None:
            qs = qs.filter(product_plan__coach=coach_profile)
        else:
            # Client context
            qs = qs.filter(client=user)

        # Optional filtering by query params
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            if is_active_param.lower() in ('true', '1', 'yes'):
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ('false', '0', 'no'):
                qs = qs.filter(is_active=False)

        return qs

    def create(self, request, *args, **kwargs):
        product_plan_id = request.data.get('product_plan_id')
        if not product_plan_id:
            return Response({"detail": "product_plan_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure plan exists and is active
        product_plan = get_object_or_404(ProductPlan, pk=product_plan_id)
        if not product_plan.is_active:
            return Response({"detail": "This plan is not available for subscription."}, status=status.HTTP_400_BAD_REQUEST)
        if product_plan.end_date < timezone.now().date():
            return Response({"detail": "This plan has already ended."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate subscription only if existing one is pending or active
        if PlanSubscription.objects.filter(client=request.user, product_plan=product_plan, status__in=['pending', 'active']).exists():
            return Response({"detail": "You already have an active or pending subscription to this plan."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                subscription = PlanSubscription.objects.create(
                    client=request.user,
                    product_plan=product_plan,
                )
                # Immediately activate: triggers PlanDay generation and PlanProgress update inside model
                subscription.activate()
        except Exception as e:
            return Response({"detail": "Failed to create subscription", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = self.get_serializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        subscription = self.get_object()  # Scoped by get_queryset()
        subscription.activate()
        return Response({"detail": "Subscription activated."})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        subscription = self.get_object()  # Scoped by get_queryset()
        subscription.cancel()
        return Response({"detail": "Subscription cancelled."})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        subscription = self.get_object()  # Scoped by get_queryset()
        subscription.complete()
        return Response({"detail": "Subscription completed."})

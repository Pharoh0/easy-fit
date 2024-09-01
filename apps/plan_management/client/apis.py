from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import ProductPlan, PlanSubscription
from .serializers import PlanSubscriptionSerializer


class PlanSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = PlanSubscription.objects.all()
    serializer_class = PlanSubscriptionSerializer

    def create(self, request, *args, **kwargs):
        product_plan = ProductPlan.objects.get(pk=request.data.get('product_plan_id'))
        subscription, created = PlanSubscription.objects.get_or_create(client=request.user, product_plan=product_plan)
        if not created:
            return Response({"detail": "You are already subscribed to this plan."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        subscription = self.get_object()
        subscription.activate()
        return Response({"detail": "Subscription activated."})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        subscription = self.get_object()
        subscription.cancel()
        return Response({"detail": "Subscription cancelled."})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        subscription = self.get_object()
        subscription.complete()
        return Response({"detail": "Subscription completed."})

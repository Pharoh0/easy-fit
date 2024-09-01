from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import ProductPlan, PlanItem
from .serializers import ProductPlanSerializer, PlanItemSerializer

class ProductPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductPlan.objects.all()
    serializer_class = ProductPlanSerializer

    def perform_create(self, serializer):
        serializer.save(coach=self.request.user.coach_profile)


class PlanItemViewSet(viewsets.ModelViewSet):
    queryset = PlanItem.objects.all()
    serializer_class = PlanItemSerializer

    def perform_create(self, serializer):
        plan = serializer.validated_data['plan']
        if plan.coach.user != self.request.user:
            return Response({"detail": "You are not authorized to add items to this plan."}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()

from .models import CoachProfile
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import ProductPlan, PlanItem
from .serializers import ProductPlanSerializer, PlanItemSerializer
from rest_framework.exceptions import PermissionDenied


class ProductPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductPlan.objects.all()
    serializer_class = ProductPlanSerializer
    
    def get_queryset(self):
        coach = self.request.user.coach_profile
        return ProductPlan.objects.filter(coach=coach)

    def perform_create(self, serializer):
        # Automatically set the coach field to the authenticated user's coach profile
        try:
            coach_profile = self.request.user.coach_profile
            print("coach_profile.>>>", self.request.user.coach_profile.id)
            print("self.request.user.>>>", self.request.user.id)
            
        except CoachProfile.DoesNotExist:
            raise PermissionDenied("You must have a coach profile to create a plan.")
        
        # Save the plan with the authenticated coach profile
        serializer.save(coach=coach_profile)




class PlanItemViewSet(viewsets.ModelViewSet):
    queryset = PlanItem.objects.all()
    serializer_class = PlanItemSerializer

    def perform_create(self, serializer):
        plan = serializer.validated_data['plan']
        if plan.coach.user != self.request.user:
            return Response({"detail": "You are not authorized to add items to this plan."}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()

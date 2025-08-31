from rest_framework import viewsets, permissions
from .models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate
from .template_serializers import PlanTemplateSerializer, WorkoutTemplateSerializer, ExerciseTemplateSerializer, MealTemplateSerializer

class PlanTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Plan Templates"""
    queryset = PlanTemplate.objects.all()
    serializer_class = PlanTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user's coach profile"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(coach=user.coach_profile)
        return PlanTemplate.objects.none()
    
    def perform_create(self, serializer):
        """Set the coach to the authenticated user's coach profile"""
        serializer.save(coach=self.request.user.coach_profile)

class WorkoutTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Workout Templates"""
    queryset = WorkoutTemplate.objects.all()
    serializer_class = WorkoutTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter workout templates by the template's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(template__coach=user.coach_profile)
        return WorkoutTemplate.objects.none()

class ExerciseTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Exercise Templates"""
    queryset = ExerciseTemplate.objects.all()
    serializer_class = ExerciseTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter exercise templates by the workout's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(workout_template__template__coach=user.coach_profile)
        return ExerciseTemplate.objects.none()

class MealTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Meal Templates"""
    queryset = MealTemplate.objects.all()
    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter meal templates by the template's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(template__coach=user.coach_profile)
        return MealTemplate.objects.none()

from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .templates_models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate
from .template_serializers import (
    PlanTemplateSerializer, WorkoutTemplateSerializer, 
    ExerciseTemplateSerializer, MealTemplateSerializer
)

class PlanTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Plan Templates"""
    queryset = PlanTemplate.objects.all()
    serializer_class = PlanTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user (coach)"""
        return self.queryset.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user"""
        serializer.save(created_by=self.request.user)

class WorkoutTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Workout Templates"""
    queryset = WorkoutTemplate.objects.all()
    serializer_class = WorkoutTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user (coach)"""
        return self.queryset.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user"""
        serializer.save(created_by=self.request.user)

class ExerciseTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Exercise Templates"""
    queryset = ExerciseTemplate.objects.all()
    serializer_class = ExerciseTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user (coach)"""
        return self.queryset.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user"""
        serializer.save(created_by=self.request.user)

class MealTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Meal Templates"""
    queryset = MealTemplate.objects.all()
    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user (coach)"""
        return self.queryset.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Set the created_by field to the authenticated user"""
        serializer.save(created_by=self.request.user)

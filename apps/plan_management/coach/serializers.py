from rest_framework import serializers
from .models import ProductPlan, PlanItem
from rest_framework.exceptions import PermissionDenied


class PlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanItem
        fields = ['id', 'name', 'description', 'order', 'media']
        
    def validate(self, data):
        request = self.context.get('request')
        if request and request.user != data['plan'].coach.user:
            raise PermissionDenied("You do not have permission to add items to this plan.")
        return data


class ProductPlanSerializer(serializers.ModelSerializer):
    items = PlanItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = ProductPlan
        fields = [
            'id', 'coach', 'name', 'description', 'plan_type', 'price', 
            'price_per_session', 'session_count', 'start_date', 'end_date', 
            'renewal_period', 'created_at', 'updated_at', 'total_price', 'items', 'image'
        ]
        
    def validate(self, data):
        request = self.context.get('request')
        if request and request.user != data['coach'].user:
            raise PermissionDenied("You do not have permission to create or modify this plan.")
        return data

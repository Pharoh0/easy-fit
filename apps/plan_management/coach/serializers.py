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
    coach_info = serializers.SerializerMethodField()

    class Meta:
        model = ProductPlan
        fields = [
            'id', 'coach', 'coach_info', 'name', 'description', 'plan_type', 'price', 
            'price_per_session', 'session_count', 'start_date', 'end_date', 
            'renewal_period', 'created_at', 'updated_at', 'total_price', 'items', 'image'
        ]
        # Mark the 'coach' field as read-only
        read_only_fields = ['coach']
        
    def get_coach_info(self, obj):
        try:
            user = obj.coach.user
            display_name = (user.get_full_name() or '').strip() or user.username
        except Exception:
            display_name = 'Unknown Coach'
        avatar_url = None
        try:
            if getattr(obj.coach, 'avatar', None) and getattr(obj.coach.avatar, 'url', None):
                avatar_url = obj.coach.avatar.url
                request = self.context.get('request')
                if request is not None and not avatar_url.startswith('http'):
                    avatar_url = request.build_absolute_uri(avatar_url)
        except Exception:
            avatar_url = None
        return {
            'id': getattr(obj.coach, 'id', None),
            'display_name': display_name,
            'avatar_url': avatar_url,
        }


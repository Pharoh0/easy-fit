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
    # Alias expected by some frontend code
    plan_items = PlanItemSerializer(source='items', many=True, read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    coach_info = serializers.SerializerMethodField()
    coach_name = serializers.SerializerMethodField()
    duration_days = serializers.SerializerMethodField()
    rating_average = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    class Meta:
        model = ProductPlan
        fields = [
            'id', 'coach', 'coach_info', 'coach_name', 'name', 'description', 'plan_type', 'price',
            'price_per_session', 'session_count', 'start_date', 'end_date',
            'renewal_period', 'created_at', 'updated_at', 'total_price', 'items', 'plan_items', 'image',
            'duration_days', 'rating_average', 'rating_count'
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

    def get_coach_name(self, obj):
        """Flat coach name for frontend compatibility."""
        try:
            user = obj.coach.user
            return (user.get_full_name() or '').strip() or user.username
        except Exception:
            return 'Unknown Coach'

    def get_duration_days(self, obj):
        """Compute plan duration in days (inclusive)."""
        try:
            if obj.start_date and obj.end_date:
                return (obj.end_date - obj.start_date).days + 1
        except Exception:
            pass
        return None

    def get_rating_average(self, obj):
        """Expose annotated rating average if present."""
        avg = getattr(obj, 'rating_average', None)
        if avg is None:
            return None
        try:
            # Round to one decimal place for display
            return round(float(avg), 1)
        except Exception:
            return float(avg) if avg is not None else None

    def get_rating_count(self, obj):
        count = getattr(obj, 'rating_count', None)
        if count is None:
            return 0
        try:
            return int(count)
        except Exception:
            return 0


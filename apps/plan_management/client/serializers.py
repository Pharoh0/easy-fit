from rest_framework import serializers
from .models import PlanSubscription
from ..coach.serializers import ProductPlanSerializer


class PlanSubscriptionSerializer(serializers.ModelSerializer):
    product_plan = ProductPlanSerializer(read_only=True)
    client = serializers.StringRelatedField(read_only=True)
    # Expose the client foreign key as an integer for frontend deep linking
    client_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = PlanSubscription
        fields = ['id', 'client', 'client_id', 'product_plan', 'subscribed_at', 'is_active', 'status']

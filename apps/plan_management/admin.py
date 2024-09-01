from django.contrib import admin
from .coach.models import ProductPlan, PlanItem
from .client.models import PlanSubscription

@admin.register(ProductPlan)
class ProductPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'coach', 'plan_type', 'price', 'start_date', 'end_date', 'renewal_period', 'created_at')
    list_filter = ('plan_type', 'renewal_period', 'created_at')
    search_fields = ('name', 'description')

@admin.register(PlanItem)
class PlanItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan', 'order')
    list_filter = ('plan',)
    search_fields = ('name', 'description')

@admin.register(PlanSubscription)
class PlanSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('client', 'product_plan', 'subscribed_at', 'status', 'is_active')
    list_filter = ('status', 'is_active')
    search_fields = ('client__username', 'product_plan__name')

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .coach import apis as coach_apis
from .client import apis as client_apis
from .coach import views as coach_views
from .coach.template_views import PlanTemplateViewSet, WorkoutTemplateViewSet, ExerciseTemplateViewSet, MealTemplateViewSet
from . import views
from .daily_entries import views as daily_views
from .ratings import views as rating_views
from .dashboard import views as dashboard_views
from .notifications import views as notification_views
from . import views_coach
from . import views_coach_templates
from . import views_client_templates


app_name = "plan_management"

router = DefaultRouter()
# Existing endpoints
router.register(r'product-plans', coach_apis.ProductPlanViewSet)
router.register(r'plan-items', coach_apis.PlanItemViewSet)
router.register(r'plan-subscriptions', client_apis.PlanSubscriptionViewSet)

# Coach plan customization endpoints
router.register(r'coach-plan-customization', coach_apis.CoachPlanCustomizationViewSet, basename='coachplancustomization')

# New plan management endpoints
router.register(r'plan-requests', views.PlanRequestViewSet, basename='planrequest')
router.register(r'plan-cancellations', views.PlanCancellationViewSet, basename='plancancellation')

# Daily entries endpoints
router.register(r'plan-days', daily_views.PlanDayViewSet, basename='planday')
router.register(r'meal-plans', daily_views.MealPlanViewSet, basename='mealplan')
router.register(r'workout-plans', daily_views.WorkoutPlanViewSet, basename='workoutplan')
router.register(r'exercises', daily_views.ExerciseViewSet, basename='exercises')

# Rating endpoints
router.register(r'plan-ratings', rating_views.PlanRatingViewSet, basename='planrating')
router.register(r'rating-helpfulness', rating_views.RatingHelpfulnessViewSet, basename='ratinghelpfulness')

# Dashboard endpoints
router.register(r'plan-progress', dashboard_views.PlanProgressViewSet, basename='planprogress')
router.register(r'daily-progress', dashboard_views.DailyProgressLogViewSet, basename='dailyprogresslog')
router.register(r'goal-tracking', dashboard_views.GoalTrackingViewSet, basename='goaltracking')

# Notification endpoints
router.register(r'notifications', notification_views.PlanNotificationViewSet, basename='plannotification')
router.register(r'notification-preferences', notification_views.NotificationPreferenceViewSet, basename='notificationpreference')
router.register(r'email-queue', notification_views.EmailQueueViewSet, basename='emailqueue')
router.register(r'notification-templates', notification_views.NotificationTemplateViewSet, basename='notificationtemplate')

# Coach client access endpoints
router.register(r'coach-client-access', views_coach.CoachClientAccessViewSet, basename='coachclientaccess')

# Coach Template endpoints
router.register(r'plan-templates', PlanTemplateViewSet)
router.register(r'workout-templates', WorkoutTemplateViewSet)
router.register(r'exercise-templates', ExerciseTemplateViewSet)
router.register(r'meal-templates', MealTemplateViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    path('coach/product-plans/', coach_views.manage_product_plans, name='manage_product_plans'),
    
    # Coach measurement access templates
    path('coach/client-measurements/', views_coach_templates.coach_client_measurements_view, name='coach_client_measurements'),
    path('coach/plan-creation/', views_coach_templates.coach_plan_creation_view, name='coach_plan_creation'),
    path('coach/client-stats/', views_coach_templates.coach_client_quick_stats, name='coach_client_stats'),
    path('coach/client-stats-api/', views_coach_templates.coach_client_quick_stats, name='coach_client_stats_api'),
    path('coach/measurement-insights/', views_coach_templates.coach_measurement_insights, name='coach_measurement_insights'),
    path('coach/measurements-widget/', views_coach_templates.coach_dashboard_measurements_widget, name='coach_measurements_widget'),
    path('coach/dashboard/', views_coach_templates.coach_dashboard_view, name='coach_dashboard'),
    
    # New coach plan management views
    path('coach/plan-management/', views_coach_templates.coach_plan_management_view, name='coach_plan_management'),
    path('coach/client-plan/<int:subscription_id>/', views_coach_templates.coach_client_plan_detail_view, name='coach_client_plan_detail'),
    path('coach/plan-customization/', views_coach_templates.coach_plan_customization_view, name='coach_plan_customization'),
    path('coach/plan-analytics/', views_coach_templates.coach_plan_analytics, name='coach_plan_analytics'),
    
    # Client plan management views
    path('client/browse-plans/', views_client_templates.client_plan_browser_view, name='client_plan_browser'),
    path('client/dashboard/', views_client_templates.client_dashboard_view, name='client_dashboard'),
    path('client/plan-detail/<int:subscription_id>/', views_client_templates.client_plan_detail_view, name='client_plan_detail'),
    path('client/plan-progress/<int:subscription_id>/', views_client_templates.client_plan_progress, name='client_plan_progress'),
    path('client/ratings/', views_client_templates.client_ratings_view, name='client_ratings'),

]

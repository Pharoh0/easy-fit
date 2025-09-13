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
from . import views_coach_api


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
router.register(r'exercises', daily_views.ExerciseViewSet, basename='exercise')

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
    path('api/v1/', include(router.urls)),
    
    # Coach analytics API endpoints (for JS BASE_PATH = '/plan-management/api/v1/coach')
    path('api/v1/coach/plan-analytics/', views_coach_templates.coach_plan_analytics, name='coach_plan_analytics_api'),
    path('api/v1/coach/measurement-insights/', views_coach_templates.coach_measurement_insights, name='coach_measurement_insights_api'),
    path('api/v1/coach/client-stats/', views_coach_templates.coach_client_quick_stats, name='coach_client_stats_api_v1'),
    path('api/v1/coach/revenue-metrics/', views_coach_templates.coach_revenue_metrics, name='coach_revenue_metrics_api_v1'),
    path('api/v1/coach/subscription-stats/', views_coach_templates.coach_subscription_stats, name='coach_subscription_stats_api_v1'),
    path('api/v1/coach/ratings-summary/', views_coach_templates.coach_ratings_summary, name='coach_ratings_summary_api_v1'),
    path('api/v1/coach/top-clients/', views_coach_templates.coach_top_clients, name='coach_top_clients_api_v1'),
    path('api/v1/coach/clients/', views_coach_templates.coach_clients, name='coach_clients_api_v1'),
    path('api/v1/coach/export/csv/', views_coach_templates.coach_export_csv, name='coach_export_csv_api_v1'),
    path('api/v1/coach/export/pdf/', views_coach_templates.coach_export_pdf, name='coach_export_pdf_api_v1'),
    
    # Coach plan customization API endpoints
    path('api/v1/coach-plan-customization/<int:subscription_id>/subscription_details/', views_coach_api.get_subscription_details, name='subscription_details_api'),
    path('api/v1/coach-plan-customization/plan_days/', views_coach_api.get_plan_days, name='plan_days_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/', views_coach_api.get_plan_day_details, name='plan_day_details_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/overview/', views_coach_api.save_day_overview, name='save_day_overview_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/apply_template/', views_coach_api.apply_template_to_day, name='apply_template_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/remove_workout/', views_coach_api.remove_workout_from_day, name='remove_workout_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/remove_nutrition/', views_coach_api.remove_nutrition_from_day, name='remove_nutrition_api'),
    path('api/v1/coach-plan-customization/plan_days/<int:day_id>/notes/', views_coach_api.save_day_notes, name='save_notes_api'),
    path('api/v1/coach-plan-customization/subscription_reviews/', views_coach_api.get_subscription_reviews, name='subscription_reviews_api'),
    
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
    path('coach/plan-customization/', views_coach_templates.coach_plan_customization_view, name='coach_plan_customization'),
    path('coach/plan-customization/<int:plan_id>/', views_coach_templates.coach_plan_customization_view, name='coach_plan_customization_with_id'),
    path('coach/plan-analytics/', views_coach_templates.coach_plan_analytics, name='coach_plan_analytics'),
    
    # Template management views
    path('coach/workout-templates/', views_coach_templates.coach_workout_templates_view, name='coach_workout_templates'),
    path('coach/meal-templates/', views_coach_templates.coach_meal_templates_view, name='coach_meal_templates'),
    
    # Client plan management views
    path('client/browse-plans/', views_client_templates.client_plan_browser_view, name='client_plan_browser'),
    path('client/dashboard/', views_client_templates.client_dashboard_view, name='client_dashboard'),
    path('client/plan-detail/<int:subscription_id>/', views_client_templates.client_plan_detail_view, name='client_plan_detail'),
    path('client/plan-progress/<int:subscription_id>/', views_client_templates.client_plan_progress, name='client_plan_progress'),
    path('client/ratings/', views_client_templates.client_ratings_view, name='client_ratings'),

]

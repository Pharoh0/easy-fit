from django.apps import AppConfig


class PlanManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.plan_management'
    
    def ready(self):
        # Import signals to register them
        from .notifications import signals

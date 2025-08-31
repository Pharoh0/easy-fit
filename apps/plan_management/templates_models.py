from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class BaseTemplate(models.Model):
    """Base abstract template model for all template types"""
    name = models.CharField(_("Name"), max_length=100)
    description = models.TextField(_("Description"), blank=True)
    tags = models.JSONField(_("Tags"), default=list, blank=True)
    category = models.CharField(_("Category"), max_length=100, blank=True)
    difficulty = models.IntegerField(_("Difficulty"), default=3, 
                                   help_text=_("1-5 scale where 5 is most difficult"))
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, 
                                  related_name="%(class)s_templates")
    created_at = models.DateTimeField(_("Created At"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated At"), auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_difficulty_display()})"
    
    def get_difficulty_display(self):
        """Returns human-readable difficulty level"""
        levels = {
            1: _("Beginner"),
            2: _("Easy"),
            3: _("Moderate"),
            4: _("Challenging"),
            5: _("Advanced")
        }
        return levels.get(self.difficulty, _("Unknown"))


class PlanTemplate(BaseTemplate):
    """Template for a complete plan structure"""
    structure = models.JSONField(_("Plan Structure"), default=dict)
    
    class Meta:
        verbose_name = _("Plan Template")
        verbose_name_plural = _("Plan Templates")


class WorkoutTemplate(BaseTemplate):
    """Template for workout routines"""
    structure = models.JSONField(_("Workout Structure"), default=dict)
    duration = models.PositiveIntegerField(_("Duration (minutes)"), default=60)
    equipment_needed = models.JSONField(_("Equipment Needed"), default=list, blank=True)
    target_muscle_groups = models.JSONField(_("Target Muscle Groups"), default=list, blank=True)
    
    class Meta:
        verbose_name = _("Workout Template")
        verbose_name_plural = _("Workout Templates")


class ExerciseTemplate(BaseTemplate):
    """Template for individual exercises"""
    instructions = models.TextField(_("Instructions"), blank=True)
    equipment_required = models.JSONField(_("Equipment Required"), default=list, blank=True)
    target_muscles = models.JSONField(_("Target Muscles"), default=list, blank=True)
    video_url = models.URLField(_("Video URL"), blank=True)
    image = models.ImageField(_("Image"), upload_to="exercise_templates/", blank=True, null=True)
    
    class Meta:
        verbose_name = _("Exercise Template")
        verbose_name_plural = _("Exercise Templates")


class MealTemplate(BaseTemplate):
    """Template for meal plans"""
    ingredients = models.JSONField(_("Ingredients"), default=list)
    instructions = models.TextField(_("Instructions"), blank=True)
    nutritional_info = models.JSONField(_("Nutritional Information"), default=dict, blank=True)
    preparation_time = models.PositiveIntegerField(_("Preparation Time (minutes)"), default=30)
    meal_type = models.CharField(_("Meal Type"), max_length=50, 
                               choices=[
                                   ('breakfast', _("Breakfast")),
                                   ('lunch', _("Lunch")),
                                   ('dinner', _("Dinner")),
                                   ('snack', _("Snack")),
                                   ('pre_workout', _("Pre-Workout")),
                                   ('post_workout', _("Post-Workout")),
                               ],
                               default='lunch')
    
    class Meta:
        verbose_name = _("Meal Template")
        verbose_name_plural = _("Meal Templates")

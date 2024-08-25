from django import forms
from .coach_profile.models import CoachProfile

# class ClientProfileForm(forms.ModelForm):
#     class Meta:
#         model = ClientProfile
#         fields = ['avatar', 'age', 'gender', 'height', 'weight', 'bmi', 'body_fat_percentage', 'waist_size', 'chest_size', 'health_conditions', 'fitness_goals', 'dietary_preferences']

class CoachProfileForm(forms.ModelForm):
    class Meta:
        model = CoachProfile
        fields = ['avatar', 'bio', 'years_of_experience', 'country', 'region', 'city', 'specialties', 'hourly_rate']

from django import forms
from .coach_profile.models import CoachProfile, Certification, ClientPicture, CoachPicture
from cities_light.models import Country, Region, City

# class ClientProfileForm(forms.ModelForm):
#     class Meta:
#         model = ClientProfile
#         fields = ['avatar', 'age', 'gender', 'height', 'weight', 'bmi', 'body_fat_percentage', 'waist_size', 'chest_size', 'health_conditions', 'fitness_goals', 'dietary_preferences']

class CoachProfileForm(forms.ModelForm):
    class Meta:
        model = CoachProfile
        fields = [
            'avatar', 'bio', 'years_of_experience', 'country', 'region', 'city', 
            'locations', 'specialties', 'hourly_rate',
            'facebook_profile_url', 'instagram_profile_url', 'twitter_profile_url', 
            'youtube_profile_url', 'tiktok_profilel_url', 'linkedin_profile_url'
        ]
        widgets = {
            'bio': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 4,
                'placeholder': 'Tell clients about yourself, your experience, and your coaching philosophy...'
            }),
            'years_of_experience': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0,
                'max': 50
            }),
            'locations': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Where do you provide your services? (e.g., Online, Gym Name, City areas...)'
            }),
            'specialties': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Your fitness specialties (e.g., Weight Loss, Muscle Building, Yoga, CrossFit...)'
            }),
            'hourly_rate': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': 0,
                'step': '0.01'
            }),
            'facebook_profile_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://facebook.com/your-profile'
            }),
            'instagram_profile_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://instagram.com/your-profile'
            }),
            'twitter_profile_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://twitter.com/your-profile'
            }),
            'youtube_profile_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://youtube.com/your-channel'
            }),
            'tiktok_profilel_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://tiktok.com/@your-profile'
            }),
            'linkedin_profile_url': forms.URLInput(attrs={
                'class': 'form-control',
                'placeholder': 'https://linkedin.com/in/your-profile'
            }),
            'country': forms.Select(attrs={'class': 'form-select'}),
            'region': forms.Select(attrs={'class': 'form-select'}),
            'city': forms.Select(attrs={'class': 'form-select'}),
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Set up location cascading dropdowns
        if 'country' in self.data:
            try:
                country_id = int(self.data.get('country'))
                self.fields['region'].queryset = Region.objects.filter(country_id=country_id)
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.country:
            self.fields['region'].queryset = self.instance.country.region_set.all()
            
        if 'region' in self.data:
            try:
                region_id = int(self.data.get('region'))
                self.fields['city'].queryset = City.objects.filter(region_id=region_id)
            except (ValueError, TypeError):
                pass
        elif self.instance.pk and self.instance.region:
            self.fields['city'].queryset = self.instance.region.city_set.all()


class CertificationForm(forms.ModelForm):
    class Meta:
        model = Certification
        fields = ['file', 'description']
        widgets = {
            'file': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': '.pdf,.jpg,.jpeg,.png,.doc,.docx'
            }),
            'description': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Certification name or description'
            })
        }


class ClientPictureForm(forms.ModelForm):
    class Meta:
        model = ClientPicture
        fields = ['image', 'description']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            }),
            'description': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Description (optional)'
            })
        }


class CoachPictureForm(forms.ModelForm):
    class Meta:
        model = CoachPicture
        fields = ['image', 'description']
        widgets = {
            'image': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*'
            }),
            'description': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Description (optional)'
            })
        }

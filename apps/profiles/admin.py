from django.contrib import admin
from .client_profile.models import ClientProfile
from .coach_profile.models import CoachProfile
from .staff_profile.models import StaffProfile

admin.site.register(ClientProfile)
admin.site.register(CoachProfile)
admin.site.register(StaffProfile)

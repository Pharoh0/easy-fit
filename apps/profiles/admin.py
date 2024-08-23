from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .client_profile.models import ClientProfile
from .coach_profile.models import CoachProfile, Availability, Certification, ClientPicture, CoachPicture
from .staff_profile.models import StaffProfile

admin.site.register(ClientProfile)
admin.site.register(StaffProfile)

# coach
admin.site.register(CoachProfile)
admin.site.register(Availability)
admin.site.register(ClientPicture)
admin.site.register(Certification)
admin.site.register(CoachPicture)


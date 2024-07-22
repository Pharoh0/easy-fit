from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


class CustomUserAdmin(UserAdmin):
    model = CustomUser
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "username",
                    "password",
                    "first_name",
                    "last_name",
                    "is_enabled",
                    "is_whitelisted",
                    "is_superuser",
                    "is_staff",
                    "is_active",
                    "is_online",
                    "groups",
                    "user_permissions",
                    "email",
                    "date_joined",
                    # "user_type"
                )
            },
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "is_enabled",
                    "is_whitelisted",
                    "is_superuser",
                    "is_staff",
                    "is_active",
                    "is_online",
                    "groups",
                    "user_permissions",
                    "email",
                    "date_joined",
                    # "user_type"
                ),
            },
        ),
    )

admin.site.register(CustomUser, CustomUserAdmin)
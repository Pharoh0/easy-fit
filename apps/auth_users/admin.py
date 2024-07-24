from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
from django.contrib.auth.models import Permission

class AdminPermission(admin.ModelAdmin):
    model = Permission
    list_display = ("codename","name")
    search_fields = ["codename", "name"]
    # prepopulated_fields = {"slug": ("name",)}

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
admin.site.register(Permission, AdminPermission)

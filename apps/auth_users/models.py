
# from django.contrib.auth import get_user_model
# from django.contrib.auth.models import AbstractUser, Group, Permission
# from django.db import models
# from django.utils import timezone

# UserModel = get_user_model()
# # from apps.auth_users import choices


# class CustomUser(AbstractUser):
#     username = models.CharField(max_length=150, unique=True)
#     email = models.EmailField(unique=True)
#     is_enabled = models.BooleanField(default=False)
#     is_whitelisted = models.BooleanField(default=False)
#     is_online = models.BooleanField(default=False)
#     last_activity = models.DateTimeField(null=True, blank=True)
#     request_ip = models.CharField(max_length=50, blank=True, null=True)
#     # user_type = models.CharField(
#     #         max_length=50, choices=choices.user_type, default=choices.STAFF
#     #     )

#     # def update_last_activity(self):
#     #     self.last_activity = timezone.now()
#     #     self.save(update_fields=['last_activity'])


#     USERNAME_FIELD = "username"
#     REQUIRED_FIELDS = ["email"]

#     # objects = CustomUserManager()

#     def __str__(self):
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = (
        ('client', 'Client'),
        ('coach', 'Coach'),
        ('staff', 'Staff'),
    )
    
    STAFF_ROLE_CHOICES = (
        ('admin', 'Administrator'),
        ('moderator', 'Moderator'),
        ('support', 'Support Staff'),
        ('viewer', 'Viewer'),
    )
    
    user_type = models.CharField(max_length=10, null=True, choices=USER_TYPE_CHOICES)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    is_enabled = models.BooleanField(default=False)
    is_whitelisted = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)
    request_ip = models.CharField(max_length=50, blank=True, null=True)
    # Email verification fields
    email_verified = models.BooleanField(default=False, db_index=True)
    email_verification_code = models.CharField(max_length=6, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    # New fields for improved staff control
    block_reason = models.TextField(blank=True, null=True)
    blocked_at = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='blocked_users')
    staff_role = models.CharField(max_length=20, choices=STAFF_ROLE_CHOICES, null=True, blank=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username
    
    @property
    def is_client(self):
        return self.user_type == 'client'

    @property
    def is_coach(self):
        return self.user_type == 'coach'

    @property
    def is_staff_member(self):
        return self.user_type == 'staff'
        
    @property
    def has_admin_access(self):
        """Staff members with admin role or superusers have full admin access"""
        return self.is_superuser or (self.is_staff_member and self.staff_role == 'admin')
        
    @property
    def staff_permission_level(self):
        """Return numeric permission level (higher is more access)"""
        if not self.is_staff_member and not self.is_superuser:
            return 0
            
        if self.is_superuser:
            return 100
            
        role_levels = {
            'admin': 90,
            'moderator': 70,
            'support': 50,
            'viewer': 10,
            None: 5
        }
        return role_levels.get(self.staff_role, 5)

# Set the related_name attributes for the groups and user_permissions fields
CustomUser.groups.field.remote_field.related_name = "custom_user_set"
CustomUser.user_permissions.field.remote_field.related_name = "custom_user_set"
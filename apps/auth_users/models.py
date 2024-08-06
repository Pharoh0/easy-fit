
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
#         return self.username
    
# UserModel.groups.field.remote_field.related_name = "custom_user_set"
# UserModel.user_permissions.field.remote_field.related_name = "custom_user_set"


from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    USER_TYPE_CHOICES = (
        ('client', 'Client'),
        ('coach', 'Coach'),
        ('staff', 'Staff'),
    )
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    is_enabled = models.BooleanField(default=False)
    is_whitelisted = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)
    request_ip = models.CharField(max_length=50, blank=True, null=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username

# Set the related_name attributes for the groups and user_permissions fieldss
CustomUser.groups.field.remote_field.related_name = "custom_user_set"
CustomUser.user_permissions.field.remote_field.related_name = "custom_user_set"
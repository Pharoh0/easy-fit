from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from django.views.generic import TemplateView

app_name = "messaging"

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'messages', views.MessageViewSet, basename='message')

urlpatterns = [
    path('api/v1/', include(router.urls)),
    path('chat/', TemplateView.as_view(template_name='messaging/chat.html'), name='chat'),
]

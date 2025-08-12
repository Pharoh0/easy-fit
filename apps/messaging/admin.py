from django.contrib import admin
from .models import Conversation, Message, MessageReadReceipt, ConversationParticipant


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'subject', 'conversation_type', 'created_at', 'last_message_at', 'is_active']
    list_filter = ['conversation_type', 'is_active', 'is_archived', 'created_at']
    search_fields = ['subject', 'participants__username']
    filter_horizontal = ['participants']
    readonly_fields = ['created_at', 'last_message_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('participants')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'sender', 'conversation', 'message_type', 'sent_at', 'is_edited']
    list_filter = ['message_type', 'is_edited', 'sent_at']
    search_fields = ['content', 'sender__username', 'conversation__subject']
    readonly_fields = ['sent_at', 'edited_at']
    raw_id_fields = ['conversation', 'sender', 'reply_to']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('sender', 'conversation')


@admin.register(MessageReadReceipt)
class MessageReadReceiptAdmin(admin.ModelAdmin):
    list_display = ['message', 'user', 'read_at']
    list_filter = ['read_at']
    search_fields = ['user__username', 'message__content']
    readonly_fields = ['read_at']
    raw_id_fields = ['message', 'user']


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ['user', 'conversation', 'notifications_enabled', 'is_muted', 'joined_at']
    list_filter = ['notifications_enabled', 'email_notifications', 'is_muted', 'joined_at']
    search_fields = ['user__username', 'conversation__subject']
    readonly_fields = ['joined_at']
    raw_id_fields = ['conversation', 'user']

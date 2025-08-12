from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, MessageReadReceipt, ConversationParticipant

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for messaging"""
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'avatar_url']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_avatar_url(self, obj):
        # You can implement avatar logic here
        return f"/static/images/default-avatar.png"


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = UserBasicSerializer(read_only=True)
    is_read_by_user = serializers.SerializerMethodField()
    reply_to_message = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 'message_type',
            'attachment', 'attachment_name', 'attachment_size', 'attachment_url',
            'sent_at', 'edited_at', 'is_edited', 'reply_to', 'reply_to_message',
            'is_read_by_user'
        ]
        read_only_fields = ['id', 'sender', 'sent_at', 'edited_at', 'is_edited']
    
    def get_is_read_by_user(self, obj):
        """Check if current user has read this message"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_read_by(request.user)
        return False
    
    def get_reply_to_message(self, obj):
        """Get basic info about the message being replied to"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'sender': obj.reply_to.sender.username
            }
        return None
    
    def get_attachment_url(self, obj):
        """Get full URL for attachment"""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
        return None
    
    def create(self, validated_data):
        """Create message with current user as sender"""
        request = self.context.get('request')
        validated_data['sender'] = request.user
        return super().create(validated_data)


class ConversationParticipantSerializer(serializers.ModelSerializer):
    """Serializer for conversation participants"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = ConversationParticipant
        fields = [
            'user', 'notifications_enabled', 'email_notifications',
            'is_muted', 'muted_until', 'joined_at', 'last_seen_at'
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for conversation list view"""
    participants = UserBasicSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'conversation_type', 'subject', 'participants',
            'created_at', 'last_message_at', 'is_active', 'is_archived',
            'last_message', 'unread_count', 'other_participant'
        ]
    
    def get_last_message(self, obj):
        """Get the last message in conversation"""
        last_message = obj.messages.first()  # Already ordered by -sent_at
        if last_message:
            return {
                'id': last_message.id,
                'content': last_message.content[:100] + '...' if len(last_message.content) > 100 else last_message.content,
                'sender': last_message.sender.username,
                'sent_at': last_message.sent_at,
                'message_type': last_message.message_type
            }
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.exclude(read_by=request.user).count()
        return 0
    
    def get_other_participant(self, obj):
        """Get the other participant in the conversation (for 1-on-1 chats)"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other_participants = obj.participants.exclude(id=request.user.id)
            if other_participants.exists():
                other_user = other_participants.first()
                return UserBasicSerializer(other_user).data
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for conversation with messages"""
    participants = UserBasicSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    participant_settings = ConversationParticipantSerializer(many=True, read_only=True)
    related_subscription_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'conversation_type', 'subject', 'participants',
            'related_subscription', 'related_subscription_info',
            'created_at', 'last_message_at', 'is_active', 'is_archived',
            'messages', 'participant_settings'
        ]
    
    def get_related_subscription_info(self, obj):
        """Get basic info about related subscription if any"""
        if obj.related_subscription:
            return {
                'id': obj.related_subscription.id,
                'plan_name': obj.related_subscription.product_plan.name,
                'coach_name': obj.related_subscription.product_plan.coach.user.get_full_name(),
                'status': obj.related_subscription.status
            }
        return None


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new conversations"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text="List of user IDs to add as participants"
    )
    initial_message = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Conversation
        fields = [
            'conversation_type', 'subject', 'related_subscription',
            'participant_ids', 'initial_message'
        ]
    
    def create(self, validated_data):
        """Create conversation with participants and optional initial message"""
        participant_ids = validated_data.pop('participant_ids', [])
        initial_message = validated_data.pop('initial_message', None)
        
        # Add current user to participants if not already included
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id not in participant_ids:
                participant_ids.append(request.user.id)
        
        # Create conversation
        conversation = super().create(validated_data)
        
        # Add participants
        participants = User.objects.filter(id__in=participant_ids)
        conversation.participants.set(participants)
        
        # Create participant settings for each user
        for participant in participants:
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=participant
            )
        
        # Create initial message if provided
        if initial_message and request:
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=initial_message,
                message_type='text'
            )
        
        return conversation


class MessageReadReceiptSerializer(serializers.ModelSerializer):
    """Serializer for message read receipts"""
    user = UserBasicSerializer(read_only=True)
    
    class Meta:
        model = MessageReadReceipt
        fields = ['user', 'read_at']

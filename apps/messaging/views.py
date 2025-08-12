from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Prefetch
from django.utils import timezone
from .models import Conversation, Message, MessageReadReceipt, ConversationParticipant
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageReadReceiptSerializer, ConversationParticipantSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model

User = get_user_model()


class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing conversations"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        elif self.action == 'create':
            return ConversationCreateSerializer
        return ConversationDetailSerializer
    
    def get_queryset(self):
        """Get conversations for current user"""
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related(
            'participants',
            Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('-sent_at')[:20])
        ).distinct().order_by('-last_message_at')
    
    def retrieve(self, request, *args, **kwargs):
        """Get conversation details and mark messages as read"""
        conversation = self.get_object()
        
        # Mark all messages as read for current user
        unread_messages = conversation.messages.exclude(read_by=request.user)
        for message in unread_messages:
            message.mark_as_read(request.user)
        
        # Update last seen timestamp
        participant_setting, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=request.user,
            defaults={'last_seen_at': timezone.now()}
        )
        if not created:
            participant_setting.last_seen_at = timezone.now()
            participant_setting.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in this conversation"""
        conversation = self.get_object()
        
        # Check if user is participant
        if not conversation.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'You are not a participant in this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = MessageSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            message = serializer.save(conversation=conversation)
            
            # Update conversation last_message_at
            conversation.last_message_at = timezone.now()
            conversation.save()
            
            return Response(MessageSerializer(message, context={'request': request}).data,
                          status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive conversation"""
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save()
        return Response({'status': 'archived'})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive conversation"""
        conversation = self.get_object()
        conversation.is_archived = False
        conversation.save()
        return Response({'status': 'unarchived'})
    
    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        """Mute conversation notifications"""
        conversation = self.get_object()
        participant_setting, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=request.user
        )
        participant_setting.is_muted = True
        participant_setting.save()
        return Response({'status': 'muted'})
    
    @action(detail=True, methods=['post'])
    def unmute(self, request, pk=None):
        """Unmute conversation notifications"""
        conversation = self.get_object()
        participant_setting, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=request.user
        )
        participant_setting.is_muted = False
        participant_setting.save()
        return Response({'status': 'unmuted'})


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing messages"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get messages for conversations user participates in"""
        conversation_id = self.request.query_params.get('conversation')
        queryset = Message.objects.filter(
            conversation__participants=self.request.user
        ).select_related('sender', 'conversation').order_by('-sent_at')
        
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new message"""
        conversation_id = request.data.get('conversation')
        
        # Verify user is participant in conversation
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            if not conversation.participants.filter(id=request.user.id).exists():
                return Response(
                    {'error': 'You are not a participant in this conversation'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            message = serializer.save()
            
            # Update conversation timestamp
            conversation.last_message_at = timezone.now()
            conversation.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        message.mark_as_read(request.user)
        return Response({'status': 'marked as read'})
    
    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        """Edit message content"""
        message = self.get_object()
        
        # Only sender can edit
        if message.sender != request.user:
            return Response(
                {'error': 'You can only edit your own messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_content = request.data.get('content')
        if not new_content:
            return Response(
                {'error': 'Content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message.content = new_content
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count for user"""
        unread_count = Message.objects.filter(
            conversation__participants=request.user
        ).exclude(read_by=request.user).count()
        
        return Response({'unread_count': unread_count})

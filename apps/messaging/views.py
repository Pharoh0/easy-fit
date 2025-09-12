from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Prefetch, Count
from django.utils import timezone
from rest_framework.pagination import PageNumberPagination
from .models import Conversation, Message, MessageReadReceipt, ConversationParticipant
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageReadReceiptSerializer, ConversationParticipantSerializer
)
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from apps.plan_management.notifications.models import PlanNotification
import uuid

User = get_user_model()


def broadcast_to_conversation(conversation_id: int, type_name: str, payload=None) -> None:
    """Send a Channels group event to a conversation group.

    type_name must map to a handler in `apps.messaging.consumers.MessagingConsumer`.
    """
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"conversation_{conversation_id}",
                {"type": type_name, **(payload or {})},
            )
    except Exception:
        # Avoid failing the HTTP request path if WebSocket layer is unavailable
        pass


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
        qs = Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related(
            'participants',
            # Do not slice here; slicing a queryset used in Prefetch causes errors when Django applies filters.
            Prefetch('messages', queryset=Message.objects.select_related('sender').order_by('-sent_at'))
        ).distinct().order_by('-last_message_at')

        # For detail views/actions, always allow accessing the conversation regardless of archived state
        # so users can view, mark_read, archive/unarchive, mute, etc.
        detail_actions = {
            'retrieve', 'archive', 'unarchive', 'mark_read', 'mute', 'unmute', 'send_message'
        }
        if getattr(self, 'action', None) in detail_actions:
            return qs

        include_archived = self.request.query_params.get('include_archived')
        archived_only = self.request.query_params.get('archived_only')

        truthy = {"1", "true", "True", "yes", "on"}
        if archived_only in truthy:
            qs = qs.filter(is_archived=True)
        elif include_archived in truthy:
            # include both archived and non-archived
            pass
        else:
            # default: exclude archived
            qs = qs.filter(is_archived=False)

        return qs
    
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
        # Broadcast read receipt to other participant(s)
        try:
            last_read_msg = (
                conversation.messages.filter(read_by=request.user)
                .order_by('-sent_at', '-id')
                .first()
            )
            broadcast_to_conversation(
                conversation.id,
                "conversation_read",
                {
                    "by_user_id": request.user.id,
                    "timestamp": timezone.now().isoformat(),
                    "last_read_message_id": last_read_msg.id if last_read_msg else None,
                },
            )
        except Exception:
            pass

        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="start_conversation")
    def start_conversation(self, request):
        """Start or fetch a 1:1 conversation between the current user and another participant.

        Accepts:
        - participant_id: int (required) - User ID of the other participant
        - plan_subscription_id: int (optional) - Related subscription context
        - subject: str (optional) - Conversation subject
        - initial_message: str (optional) - First message to send
        """
        participant_id = request.data.get("participant_id")
        subscription_id = request.data.get("plan_subscription_id")
        subject = request.data.get("subject", "")
        initial_message = request.data.get("initial_message", "")

        if not participant_id:
            return Response({"error": "participant_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure target user exists
        try:
            other_user = User.objects.get(id=participant_id)
        except User.DoesNotExist:
            return Response({"error": "Participant not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Validate subscription if provided
        if subscription_id:
            try:
                from apps.plan_management.client.models import PlanSubscription
                subscription = PlanSubscription.objects.get(id=subscription_id)
                
                # Verify the current user is either the client or the coach of this subscription
                is_client = subscription.client_id == request.user.id
                
                # Get coach user ID - handle different possible paths
                coach_user_id = None
                if hasattr(subscription, 'product_plan') and subscription.product_plan:
                    if hasattr(subscription.product_plan, 'coach') and subscription.product_plan.coach:
                        if hasattr(subscription.product_plan.coach, 'user') and subscription.product_plan.coach.user:
                            coach_user_id = subscription.product_plan.coach.user.id
                        else:
                            # Coach might be directly a user
                            coach_user_id = getattr(subscription.product_plan.coach, 'id', None)
                
                is_coach = coach_user_id == request.user.id
                
                # Ensure the other user is the counterpart in this subscription
                if is_client and other_user.id != coach_user_id:
                    return Response({"error": "The participant is not the coach of this subscription"}, 
                                    status=status.HTTP_400_BAD_REQUEST)
                elif is_coach and other_user.id != subscription.client_id:
                    return Response({"error": "The participant is not the client of this subscription"}, 
                                    status=status.HTTP_400_BAD_REQUEST)
                elif not (is_client or is_coach):
                    return Response({"error": "You are not associated with this subscription"}, 
                                    status=status.HTTP_403_FORBIDDEN)
                
            except PlanSubscription.DoesNotExist:
                return Response({"error": "Subscription not found"}, status=status.HTTP_404_NOT_FOUND)

        # Try to find existing 1:1 conversation robustly (participants pair, optional subscription)
        base_qs = (
            Conversation.objects.filter(participants=request.user)
            .filter(participants=other_user)
            .filter(is_active=True)
            .annotate(participant_count=Count('participants', distinct=True))
            .filter(participant_count=2)
        )

        qs = base_qs
        if subscription_id:
            qs = qs.filter(related_subscription_id=subscription_id)

        conversation = qs.order_by('-last_message_at', '-id').first()

        # Fallback: if not found with subscription constraint, reuse any existing pair conversation
        if not conversation:
            conversation = base_qs.order_by('-last_message_at', '-id').first()

        if not conversation:
            # Create new conversation
            conversation = Conversation.objects.create(
                subject=subject or "",
                related_subscription_id=subscription_id if subscription_id else None,
            )
            conversation.participants.set([request.user, other_user])
            # Create ConversationParticipant settings
            for u in [request.user, other_user]:
                ConversationParticipant.objects.get_or_create(conversation=conversation, user=u)

            # Optional initial message
            if initial_message:
                Message.objects.create(
                    conversation=conversation,
                    sender=request.user,
                    content=initial_message,
                    message_type="text",
                )
        else:
            # If an existing conversation is archived, unarchive it so it reappears
            if getattr(conversation, 'is_archived', False):
                conversation.is_archived = False
                conversation.save()
            # Optionally attach subscription context if provided and not set
            if subscription_id and not conversation.related_subscription_id:
                conversation.related_subscription_id = subscription_id
                conversation.save()

        serializer = ConversationDetailSerializer(conversation, context={"request": request})
        conv_data = serializer.data
        # Broadcast conversation state (new or reused/unarchived)
        try:
            broadcast_to_conversation(conversation.id, "conversation_updated", {"conversation": conv_data})
        except Exception:
            pass
        return Response(conv_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="mark_read")
    def mark_read(self, request, pk=None):
        """Mark all messages in this conversation as read for the current user."""
        conversation = self.get_object()
        # Ensure the user is a participant
        if not conversation.participants.filter(id=request.user.id).exists():
            return Response({"error": "Not a participant"}, status=status.HTTP_403_FORBIDDEN)

        unread_messages = conversation.messages.exclude(read_by=request.user)
        for message in unread_messages:
            message.mark_as_read(request.user)

        # Update last seen
        participant_setting, created = ConversationParticipant.objects.get_or_create(
            conversation=conversation,
            user=request.user,
            defaults={"last_seen_at": timezone.now()},
        )
        if not created:
            participant_setting.last_seen_at = timezone.now()
            participant_setting.save()

        # Broadcast read receipt
        try:
            last_read_msg = (
                conversation.messages.filter(read_by=request.user)
                .order_by('-sent_at', '-id')
                .first()
            )
            broadcast_to_conversation(
                conversation.id,
                "conversation_read",
                {
                    "by_user_id": request.user.id,
                    "timestamp": timezone.now().isoformat(),
                    "last_read_message_id": last_read_msg.id if last_read_msg else None,
                },
            )
        except Exception:
            pass

        return Response({"status": "marked_read"}, status=status.HTTP_200_OK)

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
            
            out_data = MessageSerializer(message, context={'request': request}).data
            conv_data = ConversationDetailSerializer(conversation, context={'request': request}).data
            # Broadcast new message and updated conversation state
            try:
                broadcast_to_conversation(conversation.id, "message_created", {"message": out_data})
                broadcast_to_conversation(conversation.id, "conversation_updated", {"conversation": conv_data})
            except Exception:
                pass

            # Create in-app notifications for other participants (coach/client) with deep link to chat
            try:
                recipients = conversation.participants.exclude(id=request.user.id)
                for recipient in recipients:
                    PlanNotification.objects.create(
                        subscription=conversation.related_subscription,
                        user=recipient,
                        notification_type='coach_message',
                        recipient_email=getattr(recipient, 'email', '') or '',
                        subject=f"New message from {request.user.get_full_name() or request.user.username}",
                        email_content=(message.content or '')[:500],
                        plan_access_token=str(uuid.uuid4()),
                        link_expires_at=timezone.now() + timezone.timedelta(days=30),
                        additional_data={
                            'conversation_id': conversation.id,
                            'message_id': message.id,
                        }
                    )
            except Exception:
                # Do not break message sending on notification failure
                pass

            return Response(out_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive conversation"""
        conversation = self.get_object()
        conversation.is_archived = True
        conversation.save()
        # Broadcast archive event and updated conversation state
        try:
            conv_data = ConversationDetailSerializer(conversation, context={'request': request}).data
            broadcast_to_conversation(conversation.id, "conversation_archived", {"conversation_id": conversation.id})
            broadcast_to_conversation(conversation.id, "conversation_updated", {"conversation": conv_data})
        except Exception:
            pass
        return Response({'status': 'archived'})
    
    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        """Unarchive conversation"""
        conversation = self.get_object()
        conversation.is_archived = False
        conversation.save()
        # Broadcast unarchive event and updated conversation state
        try:
            conv_data = ConversationDetailSerializer(conversation, context={'request': request}).data
            broadcast_to_conversation(conversation.id, "conversation_unarchived", {"conversation_id": conversation.id})
            broadcast_to_conversation(conversation.id, "conversation_updated", {"conversation": conv_data})
        except Exception:
            pass
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


class MessagePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing messages"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = MessagePagination
    
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
            
            out_data = MessageSerializer(message, context={'request': request}).data
            conv_data = ConversationDetailSerializer(conversation, context={'request': request}).data
            try:
                broadcast_to_conversation(conversation.id, "message_created", {"message": out_data})
                broadcast_to_conversation(conversation.id, "conversation_updated", {"conversation": conv_data})
            except Exception:
                pass

            # Create in-app notifications for other participants (coach/client) with deep link to chat
            try:
                recipients = conversation.participants.exclude(id=request.user.id)
                for recipient in recipients:
                    PlanNotification.objects.create(
                        subscription=conversation.related_subscription,
                        user=recipient,
                        notification_type='coach_message',
                        recipient_email=getattr(recipient, 'email', '') or '',
                        subject=f"New message from {request.user.get_full_name() or request.user.username}",
                        email_content=(message.content or '')[:500],
                        plan_access_token=str(uuid.uuid4()),
                        link_expires_at=timezone.now() + timezone.timedelta(days=30),
                        additional_data={
                            'conversation_id': conversation.id,
                            'message_id': message.id,
                        }
                    )
            except Exception:
                pass

            return Response(out_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        """Allow editing only by sender; support PATCH on /messages/<id>/"""
        message = self.get_object()
        if message.sender != request.user:
            return Response({"error": "You can only edit your own messages"}, status=status.HTTP_403_FORBIDDEN)

        new_content = request.data.get("content")
        if not new_content:
            return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)

        message.content = new_content
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save()

        serializer = self.get_serializer(message)
        # Broadcast edited message
        try:
            out_data = MessageSerializer(message, context={'request': request}).data
            broadcast_to_conversation(message.conversation_id, "message_updated", {"message": out_data})
        except Exception:
            pass
        return Response(serializer.data, status=status.HTTP_200_OK)
    
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
        # Broadcast edited message
        try:
            out_data = MessageSerializer(message, context={'request': request}).data
            broadcast_to_conversation(message.conversation_id, "message_updated", {"message": out_data})
        except Exception:
            pass
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Only sender can delete their message"""
        message = self.get_object()
        if message.sender != request.user:
            return Response({"error": "You can only delete your own messages"}, status=status.HTTP_403_FORBIDDEN)
        # Capture IDs before deletion for event broadcast
        conversation_id = message.conversation_id
        message_id = message.id
        resp = super().destroy(request, *args, **kwargs)
        try:
            broadcast_to_conversation(conversation_id, "message_deleted", {"message_id": message_id})
        except Exception:
            pass
        return resp
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count for user"""
        unread_count = Message.objects.filter(
            conversation__participants=request.user
        ).exclude(read_by=request.user).count()
        
        return Response({'unread_count': unread_count})

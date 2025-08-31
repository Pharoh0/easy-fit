from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import PlanNotification, EmailQueue
import uuid
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def send_plan_notification(subscription, notification_type, additional_context=None):
    """Send email notification for plan events"""
    
    try:
        # Generate access token
        access_token = str(uuid.uuid4())
        
        # Create notification record
        notification = PlanNotification.objects.create(
            subscription=subscription,
            notification_type=notification_type,
            recipient_email=subscription.client.email,
            plan_access_token=access_token,
            link_expires_at=timezone.now() + timedelta(days=30),
            additional_data=additional_context or {}
        )
        
        # Build context for email template
        context = {
            'client_name': subscription.client.get_full_name() or subscription.client.username,
            'coach_name': subscription.product_plan.coach.user.get_full_name() or subscription.product_plan.coach.user.username,
            'plan_name': subscription.product_plan.name,
            'plan_link': f"{getattr(settings, 'SITE_URL', 'http://localhost:8000')}/plans/view/{access_token}/",
            'subscription': subscription,
            'notification': notification,
            'site_name': getattr(settings, 'SITE_NAME', 'Eazy Fit'),
        }
        
        if additional_context:
            context.update(additional_context)
        
        # Render email content
        try:
            subject = render_to_string(f'plan_management/emails/{notification_type}_subject.txt', context).strip()
            html_content = render_to_string(f'plan_management/emails/{notification_type}.html', context)
        except Exception as template_error:
            logger.error(f"Template rendering error for {notification_type}: {template_error}")
            # Use fallback templates
            subject = f"Plan {notification_type.replace('_', ' ').title()} - {context['plan_name']}"
            html_content = render_to_string('plan_management/emails/default_notification.html', context)
        
        # Update notification with rendered content
        notification.subject = subject
        notification.email_content = html_content
        notification.save()
        
        # Add to email queue
        EmailQueue.objects.create(
            notification=notification,
            priority=get_notification_priority(notification_type),
            scheduled_send_time=timezone.now()
        )
        
        logger.info(f"Notification queued: {notification_type} for {subscription.client.email}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating notification {notification_type}: {e}")
        return None


def send_plan_notification_email(subscription, notification_type, additional_context=None):
    """Backward-compatible wrapper used by various call sites.

    - If `subscription` is provided: delegate to `send_plan_notification` (normal flow).
    - If `subscription` is None and `notification_type` is 'plan_request_received':
      send a direct email to the coach about the new plan request using provided context.
    - Otherwise: log and return gracefully without raising.
    """
    try:
        # Normal path: use the subscription-backed notification system
        if subscription is not None:
            return send_plan_notification(subscription, notification_type, additional_context)

        # Handle plan request notification before a subscription exists
        if notification_type == 'plan_request_received':
            context = additional_context or {}
            plan = context.get('plan')
            coach = context.get('coach')  # expected to be a User
            client = context.get('client')  # expected to be a User
            plan_request = context.get('plan_request')

            # Ensure we have a coach email to send to
            coach_email = getattr(coach, 'email', None)
            if not coach or not coach_email:
                logger.warning("Coach email missing; cannot send plan_request_received email")
                return None

            # Build email subject/body with template fallback
            template_ctx = {
                'plan': plan,
                'coach': coach,
                'client': client,
                'plan_request': plan_request,
                'site_name': getattr(settings, 'SITE_NAME', 'Eazy Fit'),
            }
            try:
                subject = render_to_string('plan_management/emails/plan_request_received_subject.txt', template_ctx).strip()
                html_content = render_to_string('plan_management/emails/plan_request_received.html', template_ctx)
            except Exception as template_error:
                logger.error(f"Template rendering error for plan_request_received: {template_error}")
                # Fallback subject/content
                client_name = None
                try:
                    client_name = client.get_full_name() if client else None
                except Exception:
                    client_name = None
                client_name = client_name or getattr(client, 'username', 'client')
                plan_name = getattr(plan, 'name', 'a plan')
                subject = f"New Plan Request from {client_name}"
                html_content = (
                    f"<p>You have a new plan request for: {plan_name}</p>"
                    f"<p>Client: {client_name}</p>"
                    f"<p>Please review it in your dashboard.</p>"
                )

            send_mail(
                subject=subject,
                message='',
                html_message=html_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@eazyfit.com'),
                recipient_list=[coach_email],
                fail_silently=True,
            )
            logger.info(f"Coach notification email sent for new plan request to {coach_email}")
            return None

        # Unknown scenario without subscription: log and move on
        logger.warning(
            f"send_plan_notification_email called without subscription for type: {notification_type}"
        )
        return None
    except Exception as e:
        logger.exception("Failed in send_plan_notification_email", exc_info=e)
        return None


def get_notification_priority(notification_type):
    """Get priority level for different notification types"""
    priority_map = {
        'plan_created': 1,  # Highest priority
        'plan_customized': 1,
        'coach_message': 2,
        'plan_updated': 3,
        'milestone_achieved': 4,
        'daily_reminder': 5,  # Normal priority
        'plan_completed': 3,
        'plan_cancelled': 2,
    }
    return priority_map.get(notification_type, 5)


def process_email_queue():
    """Process queued emails - to be called by a management command or celery task"""
    from .models import EmailQueue
    
    # Get queued emails ready to be sent
    queued_emails = EmailQueue.objects.filter(
        status='queued',
        scheduled_send_time__lte=timezone.now()
    ).order_by('priority', 'scheduled_send_time')[:10]  # Process 10 at a time
    
    for queue_item in queued_emails:
        try:
            queue_item.status = 'processing'
            queue_item.save()
            
            notification = queue_item.notification
            
            # Check if user has notification preferences
            user_prefs = getattr(notification.subscription.client, 'notification_preferences', None)
            if user_prefs and not should_send_notification(notification.notification_type, user_prefs):
                queue_item.status = 'cancelled'
                queue_item.save()
                continue
            
            # Send the email
            send_mail(
                subject=notification.subject,
                message='',  # Plain text version can be added later
                html_message=notification.email_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@eazyfit.com'),
                recipient_list=[notification.recipient_email],
                fail_silently=False,
            )
            
            # Mark as sent
            queue_item.mark_as_sent()
            logger.info(f"Email sent successfully to {notification.recipient_email}")
            
        except Exception as e:
            logger.error(f"Error sending email to {queue_item.notification.recipient_email}: {e}")
            queue_item.mark_as_failed(str(e))


def should_send_notification(notification_type, user_prefs):
    """Check if user wants to receive this type of notification"""
    preference_map = {
        'plan_created': user_prefs.plan_created_email,
        'plan_updated': user_prefs.plan_updated_email,
        'daily_reminder': user_prefs.daily_reminder_email,
        'milestone_achieved': user_prefs.milestone_email,
        'coach_message': user_prefs.coach_message_email,
    }
    return preference_map.get(notification_type, True)  # Default to True if not specified


def create_plan_access_link(subscription, expires_in_days=30):
    """Create a secure access link for a plan"""
    access_token = str(uuid.uuid4())
    
    # Create or update notification with access token
    notification, created = PlanNotification.objects.get_or_create(
        subscription=subscription,
        notification_type='plan_created',
        defaults={
            'recipient_email': subscription.client.email,
            'plan_access_token': access_token,
            'link_expires_at': timezone.now() + timedelta(days=expires_in_days),
            'subject': f'Access Your Plan: {subscription.product_plan.name}',
            'email_content': 'Plan access link',
        }
    )
    
    if not created:
        notification.plan_access_token = access_token
        notification.link_expires_at = timezone.now() + timedelta(days=expires_in_days)
        notification.save()
    
    return f"{getattr(settings, 'SITE_URL', 'http://localhost:8000')}/plans/view/{access_token}/"


def send_daily_reminders():
    """Send daily reminders to active plan subscribers"""
    from ..client.models import PlanSubscription
    from datetime import date
    
    # Get active subscriptions that should receive reminders today
    active_subscriptions = PlanSubscription.objects.filter(
        status='active',
        product_plan__start_date__lte=date.today(),
        product_plan__end_date__gte=date.today()
    ).select_related('client', 'product_plan__coach')
    
    for subscription in active_subscriptions:
        # Check if user wants daily reminders
        user_prefs = getattr(subscription.client, 'notification_preferences', None)
        if user_prefs and not user_prefs.daily_reminder_email:
            continue
        
        # Check if we already sent a reminder today
        today_reminders = PlanNotification.objects.filter(
            subscription=subscription,
            notification_type='daily_reminder',
            sent_at__date=date.today()
        )
        
        if not today_reminders.exists():
            send_plan_notification(
                subscription=subscription,
                notification_type='daily_reminder',
                additional_context={
                    'today_date': date.today(),
                    'plan_progress': getattr(subscription, 'progress', None),
                }
            )


def send_milestone_notification(subscription, milestone):
    """Send notification when a milestone is achieved"""
    send_plan_notification(
        subscription=subscription,
        notification_type='milestone_achieved',
        additional_context={
            'milestone': milestone,
            'achievement_date': milestone.achieved_at,
        }
    )


def send_plan_completion_notification(subscription):
    """Send notification when a plan is completed"""
    send_plan_notification(
        subscription=subscription,
        notification_type='plan_completed',
        additional_context={
            'completion_date': timezone.now().date(),
            'plan_progress': getattr(subscription, 'progress', None),
        }
    )

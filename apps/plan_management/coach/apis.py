from apps.profiles.coach_profile.models import CoachProfile
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import ProductPlan, PlanItem, PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate
from .serializers import ProductPlanSerializer, PlanItemSerializer
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.exceptions import NotFound
from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Count, Avg, F, ExpressionWrapper, DurationField, Sum
from django.utils import timezone
from ..client.models import PlanSubscription
from ..client.serializers import PlanSubscriptionSerializer
from ..daily_entries.models import PlanDay, NutritionPlan, WorkoutPlan, ExerciseBlock, Exercise, MealPlan, MealIngredient
from ..daily_entries.serializers import PlanDaySerializer, NutritionPlanSerializer, WorkoutPlanSerializer, \
    ExerciseBlockSerializer, ExerciseSerializer, MealPlanSerializer
from ..choices import DIFFICULTY_CHOICES, PLAN_TYPE_CHOICES
from datetime import timedelta, datetime
import json


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductPlanViewSet(viewsets.ModelViewSet):
    queryset = ProductPlan.objects.all()
    serializer_class = ProductPlanSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        request = self.request
        params = request.query_params
        user = request.user

        # Base queryset with related coach for performance
        qs = ProductPlan.objects.all().select_related('coach', 'coach__user')

        # Scope by coach or active status
        coach_profile_id = params.get('coach_profile_id')
        if coach_profile_id:
            coach = get_object_or_404(CoachProfile, id=coach_profile_id)
            qs = qs.filter(coach=coach)
        elif hasattr(user, 'coach_profile'):
            qs = qs.filter(coach=user.coach_profile)
        else:
            is_active = params.get('is_active')
            if is_active is not None:
                if is_active.lower() == 'true':
                    qs = qs.filter(is_active=True)
                elif is_active.lower() == 'false':
                    qs = qs.filter(is_active=False)
            else:
                # Default for anonymous/clients: only active plans
                qs = qs.filter(is_active=True)

        # Annotations for ratings and duration
        qs = qs.annotate(
            rating_average=Avg('plan_subscriptions__rating__overall_rating'),
            rating_count=Count('plan_subscriptions__rating', distinct=True),
            duration_delta=ExpressionWrapper(F('end_date') - F('start_date'), output_field=DurationField()),
            total_subscribers=Count('plan_subscriptions', filter=Q(plan_subscriptions__status='active')),
        )

        # Enhanced filters
        plan_type = params.get('plan_type')
        if plan_type:
            qs = qs.filter(plan_type=plan_type)
            
        difficulty_level = params.get('difficulty_level')
        if difficulty_level:
            qs = qs.filter(difficulty_level=difficulty_level)
            
        has_workouts = params.get('has_workouts')
        if has_workouts:
            if has_workouts.lower() == 'true':
                qs = qs.filter(workout_days_per_week__gt=0)

        has_meals = params.get('has_meals')
        if has_meals:
            if has_meals.lower() == 'true':
                qs = qs.filter(meals_per_day__gt=0)

        price_range = params.get('price_range')
        if price_range:
            try:
                if price_range.endswith('+'):
                    min_price = int(price_range[:-1])
                    qs = qs.filter(price__gte=min_price)
                else:
                    low_str, high_str = price_range.split('-')
                    low, high = int(low_str), int(high_str)
                    qs = qs.filter(price__gte=low, price__lte=high)
            except Exception:
                pass  # Ignore malformed filter

        duration = params.get('duration')
        if duration:
            try:
                days = int(duration)
                # (end - start) is exclusive; <= days-1 approximates inclusive day count
                qs = qs.filter(duration_delta__lte=timedelta(days=days - 1))
            except Exception:
                pass

        min_rating = params.get('min_rating')
        if min_rating:
            try:
                threshold = float(min_rating)
                qs = qs.filter(rating_average__gte=threshold)
            except Exception:
                pass

        # Default ordering: newest first so freshly created plans are visible
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically set the coach field to the authenticated user's coach profile
        try:
            coach_profile = self.request.user.coach_profile
        except CoachProfile.DoesNotExist:
            raise PermissionDenied("You must have a coach profile to create a plan.")
        
        # Save the plan with the authenticated coach profile
        plan = serializer.save(coach=coach_profile)
        
        # Create default structure based on plan settings if specified
        if self.request.data.get('create_structure') == 'true':
            self.create_default_plan_structure(plan)
            
        return plan

    def create(self, request, *args, **kwargs):
        """Create ProductPlan with simple idempotency to prevent accidental duplicates.

        If a plan with the same (coach, name, start_date, end_date, price)
        was created within the last 60 seconds, return that existing plan
        instead of creating a new record. This guards against double-submits
        from rapid button clicks or brief network retries.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Resolve coach profile (permission enforced in perform_create)
        try:
            coach_profile = request.user.coach_profile
        except CoachProfile.DoesNotExist:
            raise PermissionDenied("You must have a coach profile to create a plan.")

        name = serializer.validated_data.get('name')
        start_date = serializer.validated_data.get('start_date')
        end_date = serializer.validated_data.get('end_date')
        price = serializer.validated_data.get('price')

        # Best-effort duplicate detection window
        try:
            window_seconds = 60
            cutoff = timezone.now() - timedelta(seconds=window_seconds)
            existing = ProductPlan.objects.filter(
                coach=coach_profile,
                name=name,
                start_date=start_date,
                end_date=end_date,
                price=price,
                created_at__gte=cutoff,
            ).order_by('-created_at').first()
        except Exception:
            existing = None

        if existing is not None:
            data = self.get_serializer(existing).data
            headers = self.get_success_headers(data)
            # 200 OK to indicate no new resource was created
            return Response(data, status=status.HTTP_200_OK, headers=headers)

        plan = self.perform_create(serializer)
        data = self.get_serializer(plan).data if plan is not None else serializer.data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)
    
    def create_default_plan_structure(self, plan):
        """Create default plan structure based on plan settings"""
        try:
            with transaction.atomic():
                # Calculate the duration in days
                duration_days = (plan.end_date - plan.start_date).days + 1
                
                # Create plan items in order based on plan type
                if plan.plan_type in ['workout', 'combined']:
                    PlanItem.objects.create(
                        plan=plan,
                        name="Workout Schedule",
                        description=f"Weekly workout schedule with {plan.workout_days_per_week} workout days per week",
                        order=1
                    )
                
                if plan.plan_type in ['diet', 'combined']:
                    PlanItem.objects.create(
                        plan=plan,
                        name="Meal Plan",
                        description=f"Daily nutrition plan with {plan.meals_per_day} meals per day",
                        order=2 if plan.plan_type == 'combined' else 1
                    )
                
                # Create any additional standard items
                PlanItem.objects.create(
                    plan=plan,
                    name="Progress Tracking",
                    description="Track your progress throughout the plan duration",
                    order=3 if plan.plan_type == 'combined' else 2
                )
        except Exception as e:
            # Log error but don't fail the plan creation
            print(f"Error creating plan structure: {str(e)}")

    def _ensure_update_allowed(self, instance):
        """Ensure the authenticated coach owns the plan and it has no subscriptions before allowing edits."""
        # Ownership check
        if not hasattr(self.request.user, 'coach_profile') or instance.coach != self.request.user.coach_profile:
            raise PermissionDenied("You don't have permission to modify this plan.")
        # Subscribers check (any status)
        if instance.plan_subscriptions.exists():
            raise ValidationError("Cannot edit a plan that already has subscribers. Create a new plan instead.")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._ensure_update_allowed(instance)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._ensure_update_allowed(instance)
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate an existing plan with a new name"""
        original_plan = self.get_object()
        
        if original_plan.coach.user != request.user:
            return Response({"detail": "You can only duplicate your own plans"}, status=status.HTTP_403_FORBIDDEN)
        
        new_name = request.data.get('name', f"Copy of {original_plan.name}")
        
        try:
            with transaction.atomic():
                # Create a new plan with the same attributes
                new_plan = ProductPlan.objects.create(
                    coach=original_plan.coach,
                    name=new_name,
                    description=original_plan.description,
                    plan_type=original_plan.plan_type,
                    price=original_plan.price,
                    price_per_session=original_plan.price_per_session,
                    session_count=original_plan.session_count,
                    start_date=timezone.now().date(),
                    end_date=timezone.now().date() + timedelta(days=30),  # Default 30 days
                    renewal_period=original_plan.renewal_period,
                    is_active=False,  # Start as inactive
                    # Enhanced fields
                    duration_days=original_plan.duration_days,
                    difficulty_level=original_plan.difficulty_level,
                    workout_days_per_week=original_plan.workout_days_per_week,
                    rest_days_per_week=original_plan.rest_days_per_week,
                    meals_per_day=original_plan.meals_per_day,
                    snacks_per_day=original_plan.snacks_per_day,
                    max_clients=original_plan.max_clients
                )
                
                # Copy plan items
                for item in original_plan.items.all():
                    PlanItem.objects.create(
                        plan=new_plan,
                        name=item.name,
                        description=item.description,
                        order=item.order,
                        media=item.media  # Will copy the file reference
                    )
                
                serializer = self.get_serializer(new_plan)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({"detail": f"Failed to duplicate plan: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def can_delete(self, request, pk=None):
        """
        Check if a plan can be safely deleted.
        A plan can be deleted if it has no active subscriptions.
        """
        plan = self.get_object()
        
        # Ensure the user owns this plan
        if not hasattr(request.user, 'coach_profile') or plan.coach != request.user.coach_profile:
            raise PermissionDenied("You don't have permission to check this plan's deletion status.")
        
        # Check for active subscriptions
        active_subscriptions = plan.plan_subscriptions.filter(status='active').count()
        
        return Response({
            'can_delete': active_subscriptions == 0,
            'active_subscriptions': active_subscriptions,
            'message': 'Plan can be safely deleted' if active_subscriptions == 0 else f'Plan has {active_subscriptions} active subscription(s)'
        })

    def perform_destroy(self, instance):
        """
        Override destroy to add permission checks and subscription validation.
        """
        # Ensure the user owns this plan
        if not hasattr(self.request.user, 'coach_profile') or instance.coach != self.request.user.coach_profile:
            raise PermissionDenied("You don't have permission to delete this plan.")
        
        # Check for active subscriptions
        active_subscriptions = instance.plan_subscriptions.filter(status='active').count()
        if active_subscriptions > 0:
            raise ValidationError(f"Cannot delete plan with {active_subscriptions} active subscription(s). Please deactivate the plan instead.")
        
        super().perform_destroy(instance)


class PlanItemViewSet(viewsets.ModelViewSet):
    queryset = PlanItem.objects.all()
    serializer_class = PlanItemSerializer

    def perform_create(self, serializer):
        plan = serializer.validated_data['plan']
        if plan.coach.user != self.request.user:
            return Response({"detail": "You are not authorized to add items to this plan."}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()


class PlanTemplateViewSet(viewsets.ModelViewSet):
    """Viewset for managing plan templates"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        # Only show templates owned by the coach
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return PlanTemplate.objects.none()
        return PlanTemplate.objects.filter(coach=coach_profile)
    
    def perform_create(self, serializer):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            raise PermissionDenied("You must have a coach profile to create templates.")
        serializer.save(coach=coach_profile)


class WorkoutTemplateViewSet(viewsets.ModelViewSet):
    """Viewset for managing workout templates"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return WorkoutTemplate.objects.none()
        return WorkoutTemplate.objects.filter(coach=coach_profile)
    
    def perform_create(self, serializer):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            raise PermissionDenied("You must have a coach profile to create templates.")
        serializer.save(coach=coach_profile)
        

class ExerciseTemplateViewSet(viewsets.ModelViewSet):
    """Viewset for managing exercise templates"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return ExerciseTemplate.objects.none()
        return ExerciseTemplate.objects.filter(coach=coach_profile)
    
    def perform_create(self, serializer):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            raise PermissionDenied("You must have a coach profile to create templates.")
        serializer.save(coach=coach_profile)


class MealTemplateViewSet(viewsets.ModelViewSet):
    """Viewset for managing meal templates"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return MealTemplate.objects.none()
        return MealTemplate.objects.filter(coach=coach_profile)
    
    def perform_create(self, serializer):
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            raise PermissionDenied("You must have a coach profile to create templates.")
        serializer.save(coach=coach_profile)


class CoachPlanCustomizationViewSet(viewsets.ViewSet):
    """Coach endpoints for customizing client subscribed plans"""
    permission_classes = [IsAuthenticated]
    
    def get_coach_subscriptions(self):
        """Get subscriptions for coach's plans"""
        coach_profile = getattr(self.request.user, 'coach_profile', None)
        if not coach_profile:
            return PlanSubscription.objects.none()
        return PlanSubscription.objects.filter(product_plan__coach=coach_profile)
    
    @action(detail=False, methods=['get'])
    def client_subscriptions(self, request):
        """List all client subscriptions for coach's plans"""
        subscriptions = self.get_coach_subscriptions().select_related(
            'client', 'product_plan'
        ).prefetch_related('plan_days')
        
        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            subscriptions = subscriptions.filter(status=status_filter)
        
        # Filter by client
        client_id = request.query_params.get('client_id')
        if client_id:
            subscriptions = subscriptions.filter(client_id=client_id)
        
        serializer = PlanSubscriptionSerializer(subscriptions, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subscription_details(self, request, pk=None):
        """Get detailed subscription info with plan days"""
        subscription = get_object_or_404(
            self.get_coach_subscriptions().select_related('client', 'product_plan'),
            pk=pk
        )
        
        # Get plan days with related data (plural relations)
        plan_days = PlanDay.objects.filter(subscription=subscription).prefetch_related(
            'nutrition_plans__meals__ingredients',
            'workout_plans__exercise_blocks__exercises'
        ).order_by('day_number')
        
        subscription_data = PlanSubscriptionSerializer(subscription, context={'request': request}).data
        plan_days_data = PlanDaySerializer(plan_days, many=True, context={'request': request}).data
        
        return Response({
            'subscription': subscription_data,
            'plan_days': plan_days_data,
            'statistics': {
                'total_days': plan_days.count(),
                'completed_days': plan_days.filter(completion_status='completed').count(),
                'in_progress_days': plan_days.filter(completion_status='in_progress').count(),
                'not_started_days': plan_days.filter(completion_status='not_started').count(),
            }
        })
    
    @action(detail=True, methods=['post'])
    def customize_plan_day(self, request, pk=None):
        """Customize a specific plan day for a client"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        day_id = request.data.get('day_id')
        
        if not day_id:
            return Response({'error': 'day_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan_day = get_object_or_404(PlanDay, id=day_id, subscription=subscription)
        
        try:
            with transaction.atomic():
                # Update plan day fields
                day_data = request.data.get('day_data', {})
                for field in ['day_title', 'day_description', 'day_theme', 'coach_instructions', 
                            'planned_difficulty', 'estimated_duration_minutes']:
                    if field in day_data:
                        setattr(plan_day, field, day_data[field])
                
                plan_day.save()
                
                # Update nutrition plan if provided
                nutrition_data = request.data.get('nutrition_data', {})
                if nutrition_data.get('plan_data'):
                    nutrition_plan, created = NutritionPlan.objects.get_or_create(
                        plan_day=plan_day,
                        defaults=nutrition_data.get('plan_data', {})
                    )
                    if not created:
                        for field, value in nutrition_data.get('plan_data', {}).items():
                            setattr(nutrition_plan, field, value)
                        nutrition_plan.save()
                    
                    # Handle meal plans
                    meals_data = nutrition_data.get('meals', [])
                    if meals_data:
                        # Delete existing meals if replace_all is true
                        if nutrition_data.get('replace_all_meals', False):
                            nutrition_plan.meals.all().delete()
                            
                        # Create or update meals
                        for meal_data in meals_data:
                            meal_id = meal_data.pop('id', None)
                            ingredients_data = meal_data.pop('ingredients', [])
                            
                            if meal_id and not nutrition_data.get('replace_all_meals', False):
                                # Update existing meal
                                try:
                                    meal = MealPlan.objects.get(id=meal_id, nutrition_plan=nutrition_plan)
                                    for field, value in meal_data.items():
                                        setattr(meal, field, value)
                                    meal.save()
                                except MealPlan.DoesNotExist:
                                    meal = MealPlan.objects.create(nutrition_plan=nutrition_plan, **meal_data)
                            else:
                                # Create new meal
                                meal = MealPlan.objects.create(nutrition_plan=nutrition_plan, **meal_data)
                            
                            # Handle meal ingredients
                            if meal_data.get('replace_all_ingredients', False):
                                meal.ingredients.all().delete()
                                
                            for ingredient_data in ingredients_data:
                                ingredient_id = ingredient_data.pop('id', None)
                                if ingredient_id and not meal_data.get('replace_all_ingredients', False):
                                    try:
                                        ingredient = MealIngredient.objects.get(id=ingredient_id, meal=meal)
                                        for field, value in ingredient_data.items():
                                            setattr(ingredient, field, value)
                                        ingredient.save()
                                    except MealIngredient.DoesNotExist:
                                        MealIngredient.objects.create(meal=meal, **ingredient_data)
                                else:
                                    MealIngredient.objects.create(meal=meal, **ingredient_data)
                
                # Update workout plan if provided
                workout_data = request.data.get('workout_data', {})
                if workout_data.get('plan_data'):
                    workout_plan, created = WorkoutPlan.objects.get_or_create(
                        plan_day=plan_day,
                        defaults=workout_data.get('plan_data', {})
                    )
                    if not created:
                        for field, value in workout_data.get('plan_data', {}).items():
                            setattr(workout_plan, field, value)
                        workout_plan.save()
                    
                    # Handle exercise blocks
                    blocks_data = workout_data.get('blocks', [])
                    if blocks_data:
                        # Delete existing blocks if replace_all is true
                        if workout_data.get('replace_all_blocks', False):
                            workout_plan.exercise_blocks.all().delete()
                            
                        # Create or update blocks
                        for block_data in blocks_data:
                            block_id = block_data.pop('id', None)
                            exercises_data = block_data.pop('exercises', [])
                            
                            if block_id and not workout_data.get('replace_all_blocks', False):
                                # Update existing block
                                try:
                                    block = ExerciseBlock.objects.get(id=block_id, workout_plan=workout_plan)
                                    for field, value in block_data.items():
                                        setattr(block, field, value)
                                    block.save()
                                except ExerciseBlock.DoesNotExist:
                                    block = ExerciseBlock.objects.create(workout_plan=workout_plan, **block_data)
                            else:
                                # Create new block
                                block = ExerciseBlock.objects.create(workout_plan=workout_plan, **block_data)
                            
                            # Handle exercises
                            if block_data.get('replace_all_exercises', False):
                                block.exercises.all().delete()
                                
                            for exercise_data in exercises_data:
                                exercise_id = exercise_data.pop('id', None)
                                if exercise_id and not block_data.get('replace_all_exercises', False):
                                    try:
                                        exercise = Exercise.objects.get(id=exercise_id, exercise_block=block)
                                        for field, value in exercise_data.items():
                                            setattr(exercise, field, value)
                                        exercise.save()
                                    except Exercise.DoesNotExist:
                                        Exercise.objects.create(exercise_block=block, **exercise_data)
                                else:
                                    Exercise.objects.create(exercise_block=block, **exercise_data)
                
                serializer = PlanDaySerializer(plan_day, context={'request': request})
                return Response(serializer.data)
                
        except Exception as e:
            return Response({'error': f'Failed to customize plan day: {str(e)}'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_coach_notes(self, request, pk=None):
        """Add coach notes to a plan day"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        day_id = request.data.get('day_id')
        notes = request.data.get('notes', '')
        
        if not day_id:
            return Response({'error': 'day_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        plan_day = get_object_or_404(PlanDay, id=day_id, subscription=subscription)
        plan_day.coach_notes = notes
        plan_day.save()
        
        return Response({'message': 'Notes added successfully'})
    
    @action(detail=True, methods=['post'])
    def regenerate_plan_days(self, request, pk=None):
        """Regenerate plan days for a subscription (coach override)"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        
        try:
            with transaction.atomic():
                days_created = subscription.generate_plan_days(reset=True)
                return Response({
                    'message': f'Successfully regenerated {days_created} plan days',
                    'days_created': days_created
                })
        except Exception as e:
            return Response({
                'error': 'Failed to regenerate plan days',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def generate_plan_days(self, request, pk=None):
        """Backward-compatible alias that generates plan days if missing (no reset)."""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        try:
            with transaction.atomic():
                days_created = subscription.generate_plan_days(reset=False)
                return Response({
                    'message': f'Successfully generated {days_created} plan days',
                    'days_created': days_created
                })
        except Exception as e:
            return Response({
                'error': 'Failed to generate plan days',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def apply_template(self, request, pk=None):
        """Apply a template to a plan day"""
        subscription = get_object_or_404(self.get_coach_subscriptions(), pk=pk)
        day_id = request.data.get('day_id')
        template_id = request.data.get('template_id')
        template_type = request.data.get('template_type')  # workout, meal, plan
        
        if not all([day_id, template_id, template_type]):
            return Response({'error': 'day_id, template_id, and template_type are required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
            
        plan_day = get_object_or_404(PlanDay, id=day_id, subscription=subscription)
        
        try:
            with transaction.atomic():
                if template_type == 'plan':
                    template = get_object_or_404(PlanTemplate, id=template_id, coach=self.request.user.coach_profile)
                    # Apply both workout and nutrition template data
                    return self._apply_plan_template(template, plan_day, request)
                    
                elif template_type == 'workout':
                    template = get_object_or_404(WorkoutTemplate, id=template_id, coach=self.request.user.coach_profile)
                    return self._apply_workout_template(template, plan_day, request)
                    
                elif template_type == 'meal':
                    template = get_object_or_404(MealTemplate, id=template_id, coach=self.request.user.coach_profile)
                    return self._apply_meal_template(template, plan_day, request)
                    
                else:
                    return Response({'error': 'Invalid template_type'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': f'Failed to apply template: {str(e)}'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    def _apply_plan_template(self, template, plan_day, request):
        """Apply a complete plan template to a day"""
        # Apply the template data to the plan day
        plan_day.day_title = template.title
        plan_day.day_description = template.description
        plan_day.day_theme = template.theme
        plan_day.planned_difficulty = template.difficulty_level
        plan_day.save()
        
        # Apply workout template if exists
        if template.workout_template:
            self._apply_workout_template(template.workout_template, plan_day, request)
            
        # Apply meal template if exists
        if template.meal_template:
            self._apply_meal_template(template.meal_template, plan_day, request)
            
        serializer = PlanDaySerializer(plan_day, context={'request': request})
        return Response(serializer.data)
    
    def _apply_workout_template(self, template, plan_day, request):
        """Apply a workout template to a plan day (multi-session aware)"""
        replace_flag = bool(request.data.get('replace_workout', False))
        target_workout_plan_id = request.data.get('workout_plan_id')

        # Choose target session
        if target_workout_plan_id:
            workout_plan = WorkoutPlan.objects.get(id=target_workout_plan_id, plan_day=plan_day)
        elif replace_flag:
            # Use first session or create
            workout_plan, created = WorkoutPlan.objects.get_or_create(
                plan_day=plan_day,
                session_order=1,
                defaults={
                    'session_name': 'Session 1',
                    'workout_name': template.name,
                    'workout_type': template.workout_type,
                    'warm_up_duration_minutes': template.warm_up_minutes,
                    'main_workout_duration_minutes': template.main_workout_minutes,
                    'cool_down_duration_minutes': template.cool_down_minutes,
                    'total_duration_minutes': (template.warm_up_minutes or 0) + (template.main_workout_minutes or 0) + (template.cool_down_minutes or 0),
                    'intensity_level': template.intensity_level,
                    'special_instructions': template.instructions,
                }
            )
        else:
            # Create a new session
            workout_plan = WorkoutPlan.objects.create(
                plan_day=plan_day,
                workout_name=template.name,
                workout_type=template.workout_type,
                warm_up_duration_minutes=template.warm_up_minutes,
                main_workout_duration_minutes=template.main_workout_minutes,
                cool_down_duration_minutes=template.cool_down_minutes,
                total_duration_minutes=(template.warm_up_minutes or 0) + (template.main_workout_minutes or 0) + (template.cool_down_minutes or 0),
                intensity_level=template.intensity_level,
                special_instructions=template.instructions,
            )

        # Update header from template
        workout_plan.workout_name = template.name
        workout_plan.workout_type = template.workout_type
        workout_plan.warm_up_duration_minutes = template.warm_up_minutes
        workout_plan.main_workout_duration_minutes = template.main_workout_minutes
        workout_plan.cool_down_duration_minutes = template.cool_down_minutes
        workout_plan.total_duration_minutes = (template.warm_up_minutes or 0) + (template.main_workout_minutes or 0) + (template.cool_down_minutes or 0)
        workout_plan.intensity_level = template.intensity_level
        workout_plan.special_instructions = template.instructions
        workout_plan.save()

        # Clear existing blocks if replacing
        if replace_flag:
            workout_plan.exercise_blocks.all().delete()
            
        # Create exercise blocks and exercises from template
        template_structure = template.template_structure
        if isinstance(template_structure, str):
            try:
                template_structure = json.loads(template_structure)
            except:
                template_structure = {}
                
        # Create blocks from template
        for block_idx, block_data in enumerate(template_structure.get('blocks', [])):
            block = ExerciseBlock.objects.create(
                workout_plan=workout_plan,
                block_name=block_data.get('name', f'Block {block_idx + 1}'),
                block_type=block_data.get('type', 'regular'),
                block_order=block_idx + 1,
                duration_minutes=block_data.get('duration_minutes', 15),
                rest_between_exercises_seconds=block_data.get('rest_seconds', 60),
                instructions=block_data.get('instructions', '')
            )
            
            # Create exercises for this block
            for ex_idx, ex_data in enumerate(block_data.get('exercises', [])):
                Exercise.objects.create(
                    exercise_block=block,
                    exercise_name=ex_data.get('name'),
                    exercise_category=ex_data.get('category', 'full_body'),
                    exercise_order=ex_idx + 1,
                    sets_count=ex_data.get('sets', 3),
                    reps_per_set=ex_data.get('reps', 12),
                    duration_seconds=ex_data.get('duration_seconds'),
                    weight_kg=ex_data.get('weight_kg'),
                    rest_between_sets_seconds=ex_data.get('rest_seconds', 60),
                    form_instructions=ex_data.get('instructions', ''),
                    demonstration_video_url=ex_data.get('video_url', ''),
                    demonstration_image=ex_data.get('image'),
                )
                
        serializer = PlanDaySerializer(plan_day, context={'request': request})
        return Response(serializer.data)
    
    def _apply_meal_template(self, template, plan_day, request):
        """Apply a meal template to a plan day (multi-plan aware)"""
        replace_flag = bool(request.data.get('replace_meals', False))
        target_nutrition_plan_id = request.data.get('nutrition_plan_id')

        if target_nutrition_plan_id:
            nutrition_plan = NutritionPlan.objects.get(id=target_nutrition_plan_id, plan_day=plan_day)
        elif replace_flag:
            nutrition_plan, created = NutritionPlan.objects.get_or_create(
                plan_day=plan_day,
                plan_order=1,
                defaults={
                    'plan_name': 'Nutrition Plan 1',
                    'target_calories': template.calories,
                    'target_protein_grams': template.protein_grams,
                    'target_carbs_grams': template.carbs_grams,
                    'target_fats_grams': template.fats_grams,
                    'target_fiber_grams': template.fiber_grams,
                    'target_water_liters': template.water_liters,
                    'dietary_restrictions': template.dietary_restrictions,
                    'special_notes': template.special_notes
                }
            )
        else:
            nutrition_plan = NutritionPlan.objects.create(
                plan_day=plan_day,
                target_calories=template.calories,
                target_protein_grams=template.protein_grams,
                target_carbs_grams=template.carbs_grams,
                target_fats_grams=template.fats_grams,
                target_fiber_grams=template.fiber_grams,
                target_water_liters=template.water_liters,
                dietary_restrictions=template.dietary_restrictions,
                special_notes=template.special_notes
            )

        # Update header targets
        nutrition_plan.target_calories = template.calories
        nutrition_plan.target_protein_grams = template.protein_grams
        nutrition_plan.target_carbs_grams = template.carbs_grams
        nutrition_plan.target_fats_grams = template.fats_grams
        nutrition_plan.target_fiber_grams = template.fiber_grams
        nutrition_plan.target_water_liters = template.water_liters
        nutrition_plan.dietary_restrictions = template.dietary_restrictions
        nutrition_plan.special_notes = template.special_notes
        nutrition_plan.save()

        # Clear existing meals if replacing
        if replace_flag:
            nutrition_plan.meals.all().delete()
            
        # Create meals from template
        template_structure = template.template_structure
        if isinstance(template_structure, str):
            try:
                template_structure = json.loads(template_structure)
            except:
                template_structure = {}
                
        # Create meals from template
        for meal_idx, meal_data in enumerate(template_structure.get('meals', [])):
            meal = MealPlan.objects.create(
                nutrition_plan=nutrition_plan,
                meal_type=meal_data.get('meal_type', 'breakfast'),
                meal_order=meal_idx + 1,
                meal_name=meal_data.get('name', f'Meal {meal_idx + 1}'),
                meal_description=meal_data.get('description', ''),
                recipe_instructions=meal_data.get('instructions', ''),
                preparation_time_minutes=meal_data.get('prep_time', 15),
                cooking_time_minutes=meal_data.get('cooking_time', 15),
                calories_per_serving=meal_data.get('calories', 0),
                protein_grams=meal_data.get('protein', 0),
                carbs_grams=meal_data.get('carbs', 0),
                fats_grams=meal_data.get('fats', 0),
                fiber_grams=meal_data.get('fiber', 0),
                servings_count=meal_data.get('servings', 1),
                serving_size_description=meal_data.get('serving_size', ''),
                recipe_video_url=meal_data.get('video_url', ''),
                dietary_tags=meal_data.get('tags', [])
            )
            
            # Create ingredients for this meal
            for ing_data in meal_data.get('ingredients', []):
                MealIngredient.objects.create(
                    meal=meal,
                    ingredient_name=ing_data.get('name', ''),
                    quantity=ing_data.get('quantity', 0),
                    unit=ing_data.get('unit', 'g'),
                    calories_contribution=ing_data.get('calories', 0),
                    protein_contribution=ing_data.get('protein', 0),
                    brand_preference=ing_data.get('brand', ''),
                    substitution_options=ing_data.get('substitutions', ''),
                    is_optional=ing_data.get('optional', False)
                )
                
        serializer = PlanDaySerializer(plan_day, context={'request': request})
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def client_progress_summary(self, request):
        """Get progress summary for all coach's clients"""
        subscriptions = self.get_coach_subscriptions().filter(status='active')
        
        # Get query params for filtering
        client_id = request.query_params.get('client_id')
        plan_type = request.query_params.get('plan_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        if client_id:
            subscriptions = subscriptions.filter(client_id=client_id)
            
        if plan_type:
            subscriptions = subscriptions.filter(product_plan__plan_type=plan_type)
        
        summary_data = []
        for subscription in subscriptions:
            plan_days_query = PlanDay.objects.filter(subscription=subscription)
            
            # Apply date filters if provided
            if date_from:
                try:
                    date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                    plan_days_query = plan_days_query.filter(scheduled_date__gte=date_from_obj)
                except ValueError:
                    pass
                    
            if date_to:
                try:
                    date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                    plan_days_query = plan_days_query.filter(scheduled_date__lte=date_to_obj)
                except ValueError:
                    pass
            
            plan_days = plan_days_query.all()
            total_days = plan_days.count()
            completed_days = plan_days.filter(completion_status='completed').count()
            in_progress_days = plan_days.filter(completion_status='in_progress').count()
            
            # Calculate nutritional adherence if applicable
            nutrition_adherence = None
            workout_adherence = None
            
            if subscription.product_plan.plan_type in ['diet', 'combined']:
                nutrition_days_with_data = plan_days.filter(nutrition_plan__isnull=False).count()
                if nutrition_days_with_data > 0:
                    nutrition_targets_met = plan_days.filter(
                        nutrition_plan__isnull=False,
                        nutrition_plan__calorie_adherence_percentage__gte=85
                    ).count()
                    nutrition_adherence = (nutrition_targets_met / nutrition_days_with_data * 100) if nutrition_days_with_data > 0 else 0
            
            if subscription.product_plan.plan_type in ['workout', 'combined']:
                workout_days_with_data = plan_days.filter(workout_plan__isnull=False).count()
                if workout_days_with_data > 0:
                    workout_exercises_total = Exercise.objects.filter(
                        exercise_block__workout_plan__plan_day__in=plan_days
                    ).count()
                    workout_exercises_completed = Exercise.objects.filter(
                        exercise_block__workout_plan__plan_day__in=plan_days,
                        is_completed=True
                    ).count()
                    workout_adherence = (workout_exercises_completed / workout_exercises_total * 100) if workout_exercises_total > 0 else 0
            
            # Get last activity timestamp
            last_activity = None
            last_completed_day = plan_days.filter(completed_at__isnull=False).order_by('-completed_at').first()
            if last_completed_day:
                last_activity = last_completed_day.completed_at
            
            client = subscription.client
            summary_data.append({
                'subscription_id': subscription.id,
                'client_id': client.id,
                'client_name': client.get_full_name() or client.username,
                'client_avatar': client.client_profile.avatar.url if client.client_profile.avatar else None,
                'plan_id': subscription.product_plan.id,
                'plan_name': subscription.product_plan.name,
                'plan_type': subscription.product_plan.plan_type,
                'start_date': subscription.start_date,
                'end_date': subscription.end_date,
                'days_elapsed': (timezone.now().date() - subscription.start_date).days + 1 if subscription.start_date else 0,
                'days_remaining': (subscription.end_date - timezone.now().date()).days if subscription.end_date else 0,
                'total_days': total_days,
                'completed_days': completed_days,
                'in_progress_days': in_progress_days,
                'completion_percentage': (completed_days / total_days * 100) if total_days > 0 else 0,
                'nutrition_adherence': nutrition_adherence,
                'workout_adherence': workout_adherence,
                'last_activity': last_activity
            })
        
        return Response(summary_data)

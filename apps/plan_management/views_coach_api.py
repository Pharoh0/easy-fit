# Add these imports if not already present
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
import re
from .coach.models import ProductPlan, WorkoutTemplate, MealTemplate, ExerciseTemplate
from .client.models import PlanSubscription
from .daily_entries.models import PlanDay, WorkoutPlan, NutritionPlan, ExerciseBlock, Exercise, MealPlan, MealIngredient


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_details(request, subscription_id):
    """
    Get subscription details for plan customization
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)

    try:
        subscription = PlanSubscription.objects.get(id=subscription_id)
        
        # Check if coach owns this subscription's plan
        if subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
            
        client = subscription.client
        
        data = {
            'subscription_id': subscription.id,
            'plan_id': subscription.product_plan.id,
            'client_id': client.id,
            'client': {
                'id': client.id,
                'name': client.get_full_name() or client.username,
                'email': client.email,
                'joined_date': client.date_joined.strftime('%b %Y'),
            }
        }
        
        return Response({'success': True, 'data': data})
    except PlanSubscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plan_days(request):
    """
    Get all plan days for a specific plan
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    plan_id = request.GET.get('plan_id')
    client_id = request.GET.get('client_id')
    subscription_id = request.GET.get('subscription_id')
    
    # Support fetching by subscription_id to avoid needing both plan_id and client_id on the frontend
    if subscription_id:
        try:
            subscription = PlanSubscription.objects.select_related('product_plan', 'client').get(id=subscription_id)
        except PlanSubscription.DoesNotExist:
            return Response({'error': 'Subscription not found'}, status=404)
        # Verify coach owns the plan
        if subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
        # Derive plan and client from subscription
        plan_id = str(subscription.product_plan.id)
        client_id = str(subscription.client.id)

    if not plan_id:
        return Response({'error': 'Plan ID is required'}, status=400)
    
    try:
        # Get plan and verify coach ownership
        plan = ProductPlan.objects.get(id=plan_id)
        if plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
        
        # Query to get days
        plan_days_query = PlanDay.objects.filter(subscription__product_plan=plan)
        
        # Filter by client if provided
        if client_id:
            plan_days_query = plan_days_query.filter(subscription__client_id=client_id)
            
        plan_days = plan_days_query.order_by('day_number')
        
        # Format data for frontend
        days_data = []
        for day in plan_days:
            # Check for workout and nutrition availability to determine if it's a rest day
            has_workout = day.workout_plans.exists()
            has_nutrition = day.nutrition_plans.exists()
            
            # If there's no workout plan and the day title contains 'rest' or 'recovery', consider it a rest day
            is_rest_day = not has_workout and (hasattr(day, 'day_title') and 
                                             ('rest' in day.day_title.lower() or 
                                              'recovery' in day.day_title.lower()))
            
            day_data = {
                'id': day.id,
                'day_number': day.day_number,
                'scheduled_date': day.scheduled_date,
                'completion_status': day.completion_status,
                'is_rest_day': is_rest_day,
                'day_title': getattr(day, 'day_title', f'Day {day.day_number}'),
                'workouts': [],
                'meals': [],
            }
            
            # Include workouts summary
            day_data['workouts'] = []
            for wp in day.workout_plans.all().order_by('session_order'):
                workout_blocks = wp.exercise_blocks.all()
                day_data['workouts'].append({
                    'id': wp.id,
                    'name': getattr(wp, 'workout_name', getattr(wp, 'name', 'Workout')),
                    'session_name': getattr(wp, 'session_name', ''),
                    'description': getattr(wp, 'special_instructions', getattr(wp, 'description', '')),
                    'type': getattr(wp, 'workout_type', ''),
                    'duration': getattr(wp, 'total_duration_minutes', None) or getattr(wp, 'main_workout_duration_minutes', None),
                    'intensity': getattr(wp, 'intensity_level', ''),
                    'exercise_count': sum(block.exercises.count() for block in workout_blocks),
                })
            
            # Include meal data if available
            day_data['meals'] = []
            for np in day.nutrition_plans.all().order_by('plan_order'):
                meals = np.meals.all()
                day_data['meals'].append({
                    'id': np.id,
                    'name': getattr(np, 'plan_name', 'Nutrition Plan'),
                    'meal_count': meals.count(),
                })
                
            days_data.append(day_data)
        
        return Response(days_data)
    except ProductPlan.DoesNotExist:
        return Response({'error': 'Plan not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_plan_day_details(request, day_id):
    """
    Get detailed information for a specific plan day
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    client_id = request.GET.get('client_id')
    subscription_id = request.GET.get('subscription_id')
    
    try:
        # If subscription_id is provided, verify access context with it
        if subscription_id:
            try:
                subscription = PlanSubscription.objects.select_related('product_plan', 'client').get(id=subscription_id)
            except PlanSubscription.DoesNotExist:
                return Response({'error': 'Subscription not found'}, status=404)
            if subscription.product_plan.coach != coach_profile:
                return Response({'error': 'Access denied'}, status=403)
            # Set client_id from subscription if not already provided
            if not client_id:
                client_id = str(subscription.client.id)

        # Get day with related data
        plan_day = PlanDay.objects.select_related(
            'subscription__product_plan'
        ).prefetch_related(
            'workout_plans__exercise_blocks',
            'workout_plans__exercise_blocks__exercises',
            'nutrition_plans__meals',
            'nutrition_plans__meals__ingredients'
        ).get(id=day_id)
        
        # Verify coach ownership
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
            
        # Filter by client if provided
        if client_id and str(plan_day.subscription.client.id) != client_id:
            return Response({'error': 'Access denied for this client'}, status=403)
            
        # Check for workout plan and nutrition plan to determine if it's a rest day
        has_workout = plan_day.workout_plans.exists()
        has_nutrition = plan_day.nutrition_plans.exists()
        
        # If there's no workout plan and the day title contains 'rest' or 'recovery', consider it a rest day
        is_rest_day = not has_workout and (hasattr(plan_day, 'day_title') and 
                                         ('rest' in plan_day.day_title.lower() or 
                                          'recovery' in plan_day.day_title.lower()))
        
        # Build day data
        day_data = {
            'id': plan_day.id,
            'day_number': plan_day.day_number,
            'scheduled_date': plan_day.scheduled_date,
            'completion_status': plan_day.completion_status,
            'is_rest_day': is_rest_day,
            'day_title': getattr(plan_day, 'day_title', f'Day {plan_day.day_number}'),
            'day_theme': getattr(plan_day, 'day_theme', ''),
            'planned_difficulty': getattr(plan_day, 'planned_difficulty', 'moderate'),
            'estimated_duration_minutes': getattr(plan_day, 'estimated_duration_minutes', 60),
            'coach_instructions': getattr(plan_day, 'coach_instructions', ''),
            'coach_notes': plan_day.coach_notes,
            # Backward compatibility: expose client_feedback under client_notes if frontend expects it
            'client_notes': getattr(plan_day, 'client_feedback', ''),
            'client_rating': plan_day.client_rating,
            'workouts': [],
            'meals': [],
        }

        # Derive a simple day_type for UI
        if has_workout and has_nutrition:
            day_data['day_type'] = 'both'
        elif has_workout:
            day_data['day_type'] = 'workout'
        elif is_rest_day:
            day_data['day_type'] = 'rest'
        else:
            day_data['day_type'] = 'both'
        
        # Add workouts data (list of sessions)
        for workout in plan_day.workout_plans.all().order_by('session_order'):
            workout_data = {
                'id': workout.id,
                'session_name': getattr(workout, 'session_name', ''),
                'name': getattr(workout, 'workout_name', getattr(workout, 'name', 'Workout')),
                'description': getattr(workout, 'special_instructions', getattr(workout, 'description', '')),
                'type': getattr(workout, 'workout_type', ''),
                'duration': getattr(workout, 'total_duration_minutes', None) or getattr(workout, 'main_workout_duration_minutes', None),
                'intensity': getattr(workout, 'intensity_level', ''),
                'image': (workout.workout_image.url if getattr(workout, 'workout_image', None) else None),
                'video_url': getattr(workout, 'workout_video_url', ''),
                'client_effort_rating': getattr(workout, 'client_effort_rating', None),
                'client_notes': getattr(workout, 'client_notes', ''),
                'exercises': []
            }
            for block in workout.exercise_blocks.all():
                for exercise in block.exercises.all():
                    workout_data['exercises'].append({
                        'id': exercise.id,
                        'name': exercise.exercise_name,
                        'sets': getattr(exercise, 'sets_count', None),
                        'reps': getattr(exercise, 'reps_per_set', None) or (f"{getattr(exercise, 'duration_seconds', 0)}s" if getattr(exercise, 'duration_seconds', None) else None),
                        'rest': f"{getattr(exercise, 'rest_between_sets_seconds', 0)}s" if getattr(exercise, 'rest_between_sets_seconds', None) is not None else None,
                        'weight': getattr(exercise, 'weight_kg', None),
                        'category': exercise.exercise_category,
                        'notes': getattr(exercise, 'form_instructions', ''),
                        'block_name': block.block_name,
                        'block_type': block.block_type,
                        'demo_image': (exercise.demonstration_image.url if getattr(exercise, 'demonstration_image', None) else None),
                        'demo_video': (exercise.demonstration_video.url if getattr(exercise, 'demonstration_video', None) else None),
                        'demo_video_url': getattr(exercise, 'demonstration_video_url', ''),
                    })
            day_data['workouts'].append(workout_data)
        
        # Add meal data
        for nutrition in plan_day.nutrition_plans.all().order_by('plan_order'):
            nutrition_data = {
                'id': nutrition.id,
                'name': getattr(nutrition, 'plan_name', 'Nutrition Plan'),
                'description': '',
                'total_calories': getattr(nutrition, 'target_calories', None),
                'protein_grams': getattr(nutrition, 'target_protein_grams', None),
                'carbs_grams': getattr(nutrition, 'target_carbs_grams', None),
                'fats_grams': getattr(nutrition, 'target_fats_grams', None),
                'items': []
            }
            for meal in nutrition.meals.all():
                meal_data = {
                    'id': meal.id,
                    'name': getattr(meal, 'meal_name', getattr(meal, 'name', 'Meal')),
                    'description': getattr(meal, 'meal_description', getattr(meal, 'description', '')),
                    'meal_time': getattr(meal, 'meal_type', None),
                    'calories': getattr(meal, 'calories_per_serving', None),
                    'nutrition': {
                        'calories': getattr(meal, 'calories_per_serving', None),
                        'protein': getattr(meal, 'protein_grams', None),
                        'carbs': getattr(meal, 'carbs_grams', None),
                        'fats': getattr(meal, 'fats_grams', None),
                    },
                    'image': (meal.meal_image.url if getattr(meal, 'meal_image', None) else None),
                    'additional_images': getattr(meal, 'additional_images', None),
                    'video_url': getattr(meal, 'recipe_video_url', ''),
                    'video': (meal.recipe_video.url if getattr(meal, 'recipe_video', None) else None),
                    'client_rating': getattr(meal, 'client_rating', None),
                    'client_notes': getattr(meal, 'client_notes', ''),
                    'items': []
                }
                for ingredient in meal.ingredients.all():
                    meal_data['items'].append({
                        'id': ingredient.id,
                        'name': getattr(ingredient, 'ingredient_name', getattr(ingredient, 'name', 'Item')),
                        'quantity': ingredient.quantity,
                        'unit': ingredient.unit,
                        'notes': getattr(ingredient, 'substitution_options', '') or getattr(ingredient, 'notes', ''),
                    })
                nutrition_data['items'].append(meal_data)
            day_data['meals'].append(nutrition_data)
        
        return Response(day_data)
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_reviews(request):
    """Return recent client reviews/ratings for a subscription for the coach."""
    try:
        coach_profile = request.user.coach_profile
    except Exception:
        return Response({'error': 'Coach profile not found'}, status=404)

    subscription_id = request.GET.get('subscription_id')
    if not subscription_id:
        return Response({'error': 'subscription_id is required'}, status=400)

    try:
        subscription = PlanSubscription.objects.select_related('product_plan', 'client').get(id=subscription_id)
    except PlanSubscription.DoesNotExist:
        return Response({'error': 'Subscription not found'}, status=404)

    if subscription.product_plan.coach != coach_profile:
        return Response({'error': 'Access denied'}, status=403)

    # Prefetch related to minimize queries
    plan_days = PlanDay.objects.filter(subscription=subscription).prefetch_related(
        'workout_plans', 'workout_plans__exercise_blocks__exercises',
        'nutrition_plans', 'nutrition_plans__meals__ingredients'
    ).order_by('-scheduled_date')

    # Collect reviews
    day_reviews = []
    workout_reviews = []
    meal_reviews = []
    exercise_reviews = []
    for day in plan_days:
        if day.client_rating or (day.client_feedback and day.client_feedback.strip()):
            day_reviews.append({
                'day_id': day.id,
                'day_number': day.day_number,
                'scheduled_date': day.scheduled_date,
                'rating': day.client_rating,
                'feedback': day.client_feedback or ''
            })
        for wp in day.workout_plans.all():
            if wp.client_effort_rating or (wp.client_notes and wp.client_notes.strip()):
                workout_reviews.append({
                    'workout_id': wp.id,
                    'day_id': day.id,
                    'day_number': day.day_number,
                    'session_name': getattr(wp, 'session_name', ''),
                    'workout_name': getattr(wp, 'workout_name', ''),
                    'effort_rating': getattr(wp, 'client_effort_rating', None),
                    'notes': getattr(wp, 'client_notes', '')
                })
            # Collect exercise level difficulty if available
            for block in wp.exercise_blocks.all():
                for ex in block.exercises.all():
                    if getattr(ex, 'perceived_difficulty', None):
                        exercise_reviews.append({
                            'exercise_id': ex.id,
                            'day_id': day.id,
                            'day_number': day.day_number,
                            'session_name': getattr(wp, 'session_name', ''),
                            'workout_name': getattr(wp, 'workout_name', ''),
                            'block_name': getattr(block, 'block_name', ''),
                            'exercise_name': getattr(ex, 'exercise_name', ''),
                            'difficulty': getattr(ex, 'perceived_difficulty', None)
                        })
        for np in day.nutrition_plans.all():
            for meal in np.meals.all():
                if meal.client_rating or (meal.client_notes and meal.client_notes.strip()):
                    meal_reviews.append({
                        'meal_id': meal.id,
                        'day_id': day.id,
                        'day_number': day.day_number,
                        'plan_name': getattr(np, 'plan_name', ''),
                        'meal_name': getattr(meal, 'meal_name', ''),
                        'rating': getattr(meal, 'client_rating', None),
                        'notes': getattr(meal, 'client_notes', '')
                    })

    # Limit to most recent 20 across each
    day_reviews = day_reviews[:20]
    workout_reviews = workout_reviews[:20]
    meal_reviews = meal_reviews[:20]

    return Response({
        'success': True,
        'day_reviews': day_reviews,
        'workout_reviews': workout_reviews,
        'meal_reviews': meal_reviews,
        'exercise_reviews': exercise_reviews,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_day_overview(request, day_id):
    """
    Save per-day overview fields (title, theme, difficulty, type, coach instructions)
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)

    payload = request.data or {}
    day_title = payload.get('day_title')
    day_theme = payload.get('day_theme')
    difficulty_level = payload.get('difficulty_level')  # numeric 1..5 or textual
    estimated_duration = payload.get('estimated_duration_minutes')
    day_type = (payload.get('day_type') or '').lower()  # 'workout' | 'rest' | 'both'
    coach_instructions = payload.get('coach_instructions')

    # Map numeric difficulty to textual model values
    diff_map_num_to_text = {
        1: 'very_easy',
        2: 'easy',
        3: 'moderate',
        4: 'hard',
        5: 'very_hard',
    }

    try:
        plan_day = PlanDay.objects.select_related('subscription__product_plan').get(id=day_id)
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)

        # Assign fields if provided
        if day_title is not None:
            plan_day.day_title = day_title
        if day_theme is not None:
            plan_day.day_theme = day_theme
        if difficulty_level is not None:
            try:
                # Accept string numerics too
                lvl_int = int(difficulty_level)
                plan_day.planned_difficulty = diff_map_num_to_text.get(lvl_int, plan_day.planned_difficulty)
            except (TypeError, ValueError):
                # Accept direct textual values as fallback
                plan_day.planned_difficulty = str(difficulty_level)
        if estimated_duration is not None:
            try:
                plan_day.estimated_duration_minutes = int(estimated_duration)
            except (TypeError, ValueError):
                pass
        if coach_instructions is not None:
            plan_day.coach_instructions = coach_instructions

        plan_day.save()

        # Handle day type operations
        if day_type == 'rest':
            # Remove all workouts if present
            for wp in plan_day.workout_plans.all():
                wp.exercise_blocks.all().delete()
                wp.delete()
        # For 'workout' or 'both' we don't auto-create anything; coach can apply a template

        return Response({'success': True, 'message': 'Day overview saved'})
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_workout_from_day(request, day_id):
    """
    Remove the workout plan (and its exercise blocks) from a plan day
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)

    try:
        plan_day = PlanDay.objects.select_related('subscription__product_plan').get(id=day_id)
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)

        workout_plan_id = request.data.get('workout_plan_id')
        if workout_plan_id:
            try:
                wp = plan_day.workout_plans.get(id=workout_plan_id)
                wp.exercise_blocks.all().delete()
                wp.delete()
            except WorkoutPlan.DoesNotExist:
                return Response({'error': 'Workout plan not found'}, status=404)
        else:
            # Remove all
            for wp in plan_day.workout_plans.all():
                wp.exercise_blocks.all().delete()
                wp.delete()

        return Response({'success': True, 'message': 'Workout removed'})
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_nutrition_from_day(request, day_id):
    """
    Remove the nutrition plan (and its meals/ingredients) from a plan day
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)

    try:
        plan_day = PlanDay.objects.select_related('subscription__product_plan').get(id=day_id)
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)

        nutrition_plan_id = request.data.get('nutrition_plan_id')
        if nutrition_plan_id:
            try:
                np = plan_day.nutrition_plans.get(id=nutrition_plan_id)
                np.meals.all().delete()
                np.delete()
            except NutritionPlan.DoesNotExist:
                return Response({'error': 'Nutrition plan not found'}, status=404)
        else:
            for np in plan_day.nutrition_plans.all():
                np.meals.all().delete()
                np.delete()

        return Response({'success': True, 'message': 'Nutrition plan removed'})
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_template_to_day(request, day_id):
    """
    Apply a template (workout or meal) to a plan day
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    # Get required parameters
    template_type = request.data.get('template_type')
    template_id = request.data.get('template_id')
    create_new = str(request.data.get('create_new', 'false')).lower() in ('1','true','yes')
    
    if not template_type or not template_id:
        return Response({'error': 'Template type and ID are required'}, status=400)
    
    try:
        with transaction.atomic():
            # Get and lock the day row to prevent concurrent creation
            plan_day = PlanDay.objects.select_related('subscription__product_plan').select_for_update().get(id=day_id)
            if plan_day.subscription.product_plan.coach != coach_profile:
                return Response({'error': 'Access denied'}, status=403)

            # Apply template based on type
            if template_type == 'workout':
                # Get workout template and verify coach ownership
                workout_template = get_object_or_404(WorkoutTemplate, id=template_id)
                if getattr(workout_template, 'template', None) is None or workout_template.template.coach != coach_profile:
                    return Response({'error': 'Access denied to template'}, status=403)

                replace_flag = str(request.data.get('replace', 'false')).lower() in ('1', 'true', 'yes')

                # Resolve target session
                target_workout_plan_id = request.data.get('workout_plan_id')
                main_minutes = getattr(workout_template, 'duration_minutes', 45) or 45
                warm = 10
                cool = 10
                if target_workout_plan_id:
                    try:
                        workout_plan = plan_day.workout_plans.select_for_update().get(id=target_workout_plan_id)
                    except WorkoutPlan.DoesNotExist:
                        return Response({'error': 'Workout plan not found'}, status=404)
                elif replace_flag:
                    # Use first session or create if none
                    workout_plan, created = WorkoutPlan.objects.get_or_create(
                        plan_day=plan_day,
                        session_order=1,
                        defaults=dict(
                            session_name='Session 1',
                            workout_name=workout_template.name,
                            workout_type=workout_template.workout_type,
                            main_workout_duration_minutes=main_minutes,
                            warm_up_duration_minutes=warm,
                            cool_down_duration_minutes=cool,
                            total_duration_minutes=warm + main_minutes + cool,
                            intensity_level=workout_template.intensity_level,
                            required_equipment=workout_template.equipment_needed,
                            special_instructions=workout_template.instructions,
                        )
                    )
                else:
                    # Create new session by default for non-replace
                    workout_plan = WorkoutPlan.objects.create(
                        plan_day=plan_day,
                        workout_name=workout_template.name,
                        workout_type=workout_template.workout_type,
                        main_workout_duration_minutes=main_minutes,
                        warm_up_duration_minutes=warm,
                        cool_down_duration_minutes=cool,
                        total_duration_minutes=warm + main_minutes + cool,
                        intensity_level=workout_template.intensity_level,
                        required_equipment=workout_template.equipment_needed,
                        special_instructions=workout_template.instructions,
                    )

                # Update header details from the latest template for both new/existing
                workout_plan.workout_name = workout_template.name
                workout_plan.workout_type = workout_template.workout_type
                workout_plan.main_workout_duration_minutes = main_minutes
                workout_plan.intensity_level = workout_template.intensity_level
                workout_plan.required_equipment = workout_template.equipment_needed
                workout_plan.special_instructions = workout_template.instructions
                # Recalculate total duration from warm-up + main + cool-down
                w = getattr(workout_plan, 'warm_up_duration_minutes', warm) or warm
                c = getattr(workout_plan, 'cool_down_duration_minutes', cool) or cool
                workout_plan.total_duration_minutes = w + workout_plan.main_workout_duration_minutes + c
                workout_plan.save()

                # Clear existing exercise blocks only if replacing
                if replace_flag:
                    workout_plan.exercise_blocks.all().delete()

                # Apply template exercises: copy ExerciseTemplate -> ExerciseBlock/Exercise
                exercise_templates = workout_template.exercise_templates.all().order_by('order')
                # Group by (block_name, block_type)
                blocks = {}
                for et in exercise_templates:
                    key = (getattr(et, 'block_name', 'Main Block') or 'Main Block', getattr(et, 'block_type', 'circuit') or 'circuit')
                    blocks.setdefault(key, []).append(et)

                # Map template block_type to ExerciseBlock.block_type choices
                def map_block_type(t):
                    mapping = {
                        'circuit': 'circuit',
                        'superset': 'superset',
                        'warm_up': 'warm_up',
                        'cool_down': 'cool_down',
                        'stretching': 'stretching',
                    }
                    return mapping.get(t, 'main_set')

                # Continue block order from existing blocks
                existing_last_block = workout_plan.exercise_blocks.order_by('-block_order').first()
                block_order = (existing_last_block.block_order + 1) if existing_last_block else 1
                for (block_name, block_type), exercises in blocks.items():
                    eb = ExerciseBlock.objects.create(
                        workout_plan=workout_plan,
                        block_name=block_name,
                        block_type=map_block_type(block_type),
                        block_order=block_order,
                    )
                    block_order += 1

                    # Add exercises to this block
                    exercise_order = 1
                    for et in exercises:
                        reps_text = getattr(et, 'reps', '') or ''
                        reps_num = None
                        duration_sec = None
                        # Simple parser: if contains 'sec', use duration; else first integer as reps
                        m = re.search(r"(\d+)", str(reps_text))
                        if m:
                            try:
                                reps_num = int(m.group(1))
                            except Exception:
                                reps_num = None
                        if isinstance(reps_text, str) and ('sec' in reps_text.lower() or 'second' in reps_text.lower()):
                            duration_sec = reps_num
                            reps_num = None

                        Exercise.objects.create(
                            exercise_block=eb,
                            exercise_name=et.exercise_name,
                            exercise_category=et.exercise_category,
                            exercise_order=exercise_order,
                            sets_count=getattr(et, 'sets', 3) or 3,
                            reps_per_set=reps_num,
                            duration_seconds=duration_sec,
                            rest_between_sets_seconds=getattr(et, 'rest_seconds', 60) or 60,
                            form_instructions=getattr(et, 'instructions', '') or '',
                        )
                        exercise_order += 1

                return Response({
                    'success': True,
                    'message': 'Workout template applied successfully'
                })

            elif template_type == 'meal':
                # Get meal template and verify coach ownership
                meal_template = get_object_or_404(MealTemplate, id=template_id)
                if getattr(meal_template, 'template', None) is None or meal_template.template.coach != coach_profile:
                    return Response({'error': 'Access denied to template'}, status=403)

                replace_flag = str(request.data.get('replace', 'false')).lower() in ('1', 'true', 'yes')

                target_nutrition_plan_id = request.data.get('nutrition_plan_id')
                if target_nutrition_plan_id:
                    try:
                        nutrition_plan = plan_day.nutrition_plans.select_for_update().get(id=target_nutrition_plan_id)
                    except NutritionPlan.DoesNotExist:
                        return Response({'error': 'Nutrition plan not found'}, status=404)
                elif replace_flag:
                    # Use first plan or create if none
                    nutrition_plan, created = NutritionPlan.objects.get_or_create(
                        plan_day=plan_day,
                        plan_order=1,
                        defaults=dict(
                            plan_name='Nutrition Plan 1',
                            target_calories=meal_template.calories,
                            target_protein_grams=meal_template.protein_grams,
                            target_carbs_grams=meal_template.carbs_grams,
                            target_fats_grams=meal_template.fats_grams,
                        )
                    )
                    if not created:
                        nutrition_plan.target_calories = meal_template.calories
                        nutrition_plan.target_protein_grams = meal_template.protein_grams
                        nutrition_plan.target_carbs_grams = meal_template.carbs_grams
                        nutrition_plan.target_fats_grams = meal_template.fats_grams
                        nutrition_plan.save()
                        if replace_flag:
                            nutrition_plan.meals.all().delete()
                else:
                    nutrition_plan = NutritionPlan.objects.create(
                        plan_day=plan_day,
                        target_calories=meal_template.calories,
                        target_protein_grams=meal_template.protein_grams,
                        target_carbs_grams=meal_template.carbs_grams,
                        target_fats_grams=meal_template.fats_grams,
                    )

                # Apply template meals and ingredients: create a single MealPlan from template
                def map_meal_type(t):
                    mapping = {
                        'breakfast': 'breakfast',
                        'lunch': 'lunch',
                        'dinner': 'dinner',
                        'pre_workout': 'pre_workout',
                        'post_workout': 'post_workout',
                        'snack': 'afternoon_snack',
                    }
                    return mapping.get(t, 'lunch')

                meal = MealPlan.objects.create(
                    nutrition_plan=nutrition_plan,
                    meal_type=map_meal_type(meal_template.meal_type),
                    meal_order=(nutrition_plan.meals.count() + 1),
                    meal_name=meal_template.meal_name,
                    meal_description=meal_template.description or '',
                    recipe_instructions=meal_template.recipe or '',
                    preparation_time_minutes=getattr(meal_template, 'preparation_time_minutes', 15) or 15,
                    cooking_time_minutes=getattr(meal_template, 'cooking_time_minutes', 0) or 0,
                    calories_per_serving=meal_template.calories,
                    protein_grams=meal_template.protein_grams,
                    carbs_grams=meal_template.carbs_grams,
                    fats_grams=meal_template.fats_grams,
                )

                for ing in meal_template.ingredients.all():
                    MealIngredient.objects.create(
                        meal=meal,
                        ingredient_name=ing.name,
                        quantity=ing.quantity,
                        unit=ing.unit,
                        substitution_options=getattr(ing, 'notes', ''),
                    )

                return Response({
                    'success': True,
                    'message': 'Meal template applied successfully'
                })
            else:
                return Response({'error': 'Invalid template type'}, status=400)
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_day_notes(request, day_id):
    """
    Save coach notes for a plan day
    """
    try:
        coach_profile = request.user.coach_profile
    except:
        return Response({'error': 'Coach profile not found'}, status=404)
    
    notes = request.data.get('notes')
    
    try:
        # Get day and verify coach ownership
        plan_day = PlanDay.objects.select_related('subscription__product_plan').get(id=day_id)
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
            
        # Update notes
        plan_day.coach_notes = notes
        plan_day.save()
        
        return Response({
            'success': True,
            'message': 'Notes saved successfully'
        })
    except PlanDay.DoesNotExist:
        return Response({'error': 'Plan day not found'}, status=404)

# Add these imports if not already present
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .coach.models import ProductPlan, WorkoutTemplate, MealTemplate
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
            # Check for workout plan and nutrition plan to determine if it's a rest day
            has_workout = hasattr(day, 'workout_plan') and day.workout_plan is not None
            has_nutrition = hasattr(day, 'nutrition_plan') and day.nutrition_plan is not None
            
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
            
            # Include workout data if available
            workout_plan = getattr(day, 'workout_plan', None)
            if workout_plan:
                workout_blocks = workout_plan.exercise_blocks.all()
                day_data['workouts'] = [
                    {
                        'id': workout_plan.id,
                        'name': getattr(workout_plan, 'workout_name', getattr(workout_plan, 'name', 'Workout')),
                        'description': getattr(workout_plan, 'special_instructions', getattr(workout_plan, 'description', '')),
                        'type': getattr(workout_plan, 'workout_type', ''),
                        'duration': getattr(workout_plan, 'total_duration_minutes', None) or getattr(workout_plan, 'main_workout_duration_minutes', None),
                        'intensity': getattr(workout_plan, 'intensity_level', ''),
                        'exercise_count': sum(block.exercises.count() for block in workout_blocks),
                    }
                ]
            
            # Include meal data if available
            nutrition_plan = getattr(day, 'nutrition_plan', None)
            if nutrition_plan:
                meals = nutrition_plan.meals.all()
                day_data['meals'] = [
                    {
                        'id': nutrition_plan.id,
                        'name': 'Nutrition Plan',
                        'meal_count': meals.count(),
                    }
                ]
                
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
            'subscription__product_plan',
            'workout_plan',
            'nutrition_plan'
        ).prefetch_related(
            'workout_plan__exercise_blocks',
            'workout_plan__exercise_blocks__exercises',
            'nutrition_plan__meals',
            'nutrition_plan__meals__ingredients'
        ).get(id=day_id)
        
        # Verify coach ownership
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
            
        # Filter by client if provided
        if client_id and str(plan_day.subscription.client.id) != client_id:
            return Response({'error': 'Access denied for this client'}, status=403)
            
        # Check for workout plan and nutrition plan to determine if it's a rest day
        has_workout = hasattr(plan_day, 'workout_plan') and plan_day.workout_plan is not None
        has_nutrition = hasattr(plan_day, 'nutrition_plan') and plan_day.nutrition_plan is not None
        
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
            'coach_notes': plan_day.coach_notes,
            # Backward compatibility: expose client_feedback under client_notes if frontend expects it
            'client_notes': getattr(plan_day, 'client_feedback', ''),
            'client_rating': plan_day.client_rating,
            'workouts': [],
            'meals': [],
        }
        
        # Add workout data
        if hasattr(plan_day, 'workout_plan') and plan_day.workout_plan:
            workout = plan_day.workout_plan
            workout_data = {
                'id': workout.id,
                'name': getattr(workout, 'workout_name', getattr(workout, 'name', 'Workout')),
                'description': getattr(workout, 'special_instructions', getattr(workout, 'description', '')),
                'type': getattr(workout, 'workout_type', ''),
                'duration': getattr(workout, 'total_duration_minutes', None) or getattr(workout, 'main_workout_duration_minutes', None),
                'intensity': getattr(workout, 'intensity_level', ''),
                'exercises': []
            }
            
            # Add exercises by block
            for block in workout.exercise_blocks.all():
                for exercise in block.exercises.all():
                    exercise_data = {
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
                    }
                    workout_data['exercises'].append(exercise_data)
                    
            day_data['workouts'].append(workout_data)
        
        # Add meal data
        if hasattr(plan_day, 'nutrition_plan') and plan_day.nutrition_plan:
            nutrition = plan_day.nutrition_plan
            nutrition_data = {
                'id': nutrition.id,
                'name': 'Nutrition Plan',
                'description': '',
                'total_calories': getattr(nutrition, 'target_calories', None),
                'protein_grams': getattr(nutrition, 'target_protein_grams', None),
                'carbs_grams': getattr(nutrition, 'target_carbs_grams', None),
                'fats_grams': getattr(nutrition, 'target_fats_grams', None),
                'items': []
            }
            
            # Add meals
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
                    'items': []
                }
                
                # Add meal ingredients
                for ingredient in meal.ingredients.all():
                    item = {
                        'id': ingredient.id,
                        'name': getattr(ingredient, 'ingredient_name', getattr(ingredient, 'name', 'Item')),
                        'quantity': ingredient.quantity,
                        'unit': ingredient.unit,
                        'notes': getattr(ingredient, 'substitution_options', '') or getattr(ingredient, 'notes', ''),
                    }
                    meal_data['items'].append(item)
                
                nutrition_data['items'].append(meal_data)
                
            day_data['meals'].append(nutrition_data)
        
        return Response(day_data)
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
    
    if not template_type or not template_id:
        return Response({'error': 'Template type and ID are required'}, status=400)
    
    try:
        # Get day and verify coach ownership
        plan_day = PlanDay.objects.select_related('subscription__product_plan').get(id=day_id)
        if plan_day.subscription.product_plan.coach != coach_profile:
            return Response({'error': 'Access denied'}, status=403)
            
        # Apply template based on type
        if template_type == 'workout':
            # Get workout template and verify coach ownership
            workout_template = get_object_or_404(WorkoutTemplate, id=template_id)
            if workout_template.coach != coach_profile:
                return Response({'error': 'Access denied to template'}, status=403)
                
            # Apply template to day
            if hasattr(plan_day, 'workout_plan') and plan_day.workout_plan:
                # Update existing workout plan
                workout_plan = plan_day.workout_plan
                workout_plan.workout_name = workout_template.name
                workout_plan.workout_type = workout_template.workout_type
                workout_plan.main_workout_duration_minutes = getattr(workout_template, 'duration_minutes', 45) or 45
                workout_plan.intensity_level = workout_template.intensity_level
                workout_plan.required_equipment = workout_template.equipment_needed
                workout_plan.special_instructions = workout_template.instructions
                # Recalculate total duration from warm-up + main + cool-down
                warm = getattr(workout_plan, 'warm_up_duration_minutes', 10) or 10
                cool = getattr(workout_plan, 'cool_down_duration_minutes', 10) or 10
                workout_plan.total_duration_minutes = warm + workout_plan.main_workout_duration_minutes + cool
                workout_plan.save()
                
                # Clear existing exercise blocks
                workout_plan.exercise_blocks.all().delete()
            else:
                # Create new workout plan
                main_minutes = getattr(workout_template, 'duration_minutes', 45) or 45
                warm = 10
                cool = 10
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
            
            # Apply template exercises
            # This would need additional code based on your data models
            # to copy exercises from the template to the plan
            
            return Response({
                'success': True,
                'message': 'Workout template applied successfully'
            })
            
        elif template_type == 'meal':
            # Get meal template and verify coach ownership
            meal_template = get_object_or_404(MealTemplate, id=template_id)
            if meal_template.coach != coach_profile:
                return Response({'error': 'Access denied to template'}, status=403)
                
            # Apply template to day
            if hasattr(plan_day, 'nutrition_plan') and plan_day.nutrition_plan:
                # Update existing nutrition plan
                nutrition_plan = plan_day.nutrition_plan
                nutrition_plan.target_calories = meal_template.calories
                nutrition_plan.target_protein_grams = meal_template.protein_grams
                nutrition_plan.target_carbs_grams = meal_template.carbs_grams
                nutrition_plan.target_fats_grams = meal_template.fats_grams
                nutrition_plan.save()
                
                # Clear existing meals
                nutrition_plan.meals.all().delete()
            else:
                # Create new nutrition plan
                nutrition_plan = NutritionPlan.objects.create(
                    plan_day=plan_day,
                    target_calories=meal_template.calories,
                    target_protein_grams=meal_template.protein_grams,
                    target_carbs_grams=meal_template.carbs_grams,
                    target_fats_grams=meal_template.fats_grams,
                )
            
            # Apply template meals and ingredients
            # This would need additional code based on your data models
            # to copy meals from the template to the plan
            
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

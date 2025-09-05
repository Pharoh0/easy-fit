from rest_framework import viewsets, permissions
from .models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate
from .template_serializers import PlanTemplateSerializer, WorkoutTemplateSerializer, ExerciseTemplateSerializer, MealTemplateSerializer

class PlanTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Plan Templates"""
    queryset = PlanTemplate.objects.all()
    serializer_class = PlanTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter templates by the authenticated user's coach profile"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(coach=user.coach_profile)
        return PlanTemplate.objects.none()
    
    def perform_create(self, serializer):
        """Set the coach to the authenticated user's coach profile"""
        serializer.save(coach=self.request.user.coach_profile)

class WorkoutTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Workout Templates"""
    queryset = WorkoutTemplate.objects.all()
    serializer_class = WorkoutTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create method to handle media files"""
        import logging
        import traceback
        import copy
        from django.db import transaction
        from .models import WorkoutTemplate, WorkoutTemplateImage, WorkoutTemplateVideo
        
        logger = logging.getLogger(__name__)
        logger.info(f"Request data for workout template: {request.data}")
        
        # Create a safe version of request.data that doesn't contain file objects
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['workout_image', 'workout_images', 'workout_videos'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default create method with our safe request
        response = super().create(safe_request, *args, **kwargs)
        
        # If successful, handle media files
        if response.status_code in [200, 201]:
            workout_template_id = response.data.get('id')
            if not workout_template_id:
                logger.error("No workout template ID found in response")
                return response
                
            # Get the newly created workout template
            try:
                workout_template = WorkoutTemplate.objects.get(id=workout_template_id)
            except WorkoutTemplate.DoesNotExist:
                logger.error(f"Could not find workout template with ID {workout_template_id}")
                return response
            
            # Process workout images
            if 'workout_images' in request.FILES:
                try:
                    images = request.FILES.getlist('workout_images')
                    logger.info(f"Processing {len(images)} workout images")
                    created_images = []
                    
                    for image in images:
                        logger.info(f"Creating image with file: {image.name}")
                        image_obj = WorkoutTemplateImage.objects.create(image=image)
                        workout_template.workout_images.add(image_obj)
                        created_images.append({
                            'id': image_obj.id,
                            'image': image_obj.image.url if image_obj.image else None
                        })
                    
                    response.data['workout_images'] = created_images
                    logger.info(f"Added {len(created_images)} images to response")
                    
                    # Force save to ensure relationships are persisted
                    workout_template.save()
                except Exception as e:
                    logger.error(f"Error processing workout images: {e}", exc_info=True)
                    
            # Process workout videos
            if 'workout_videos' in request.FILES:
                try:
                    videos = request.FILES.getlist('workout_videos')
                    logger.info(f"Processing {len(videos)} workout videos")
                    created_videos = []
                    
                    for video in videos:
                        logger.info(f"Creating video with file: {video.name}")
                        video_obj = WorkoutTemplateVideo.objects.create(video=video)
                        workout_template.workout_videos.add(video_obj)
                        created_videos.append({
                            'id': video_obj.id,
                            'video': video_obj.video.url if video_obj.video else None
                        })
                    
                    response.data['workout_videos'] = created_videos
                    logger.info(f"Added {len(created_videos)} videos to response")
                    
                    # Force save to ensure relationships are persisted
                    workout_template.save()
                except Exception as e:
                    logger.error(f"Error processing workout videos: {e}", exc_info=True)
        
        logger.info(f"Final response data: {response.data}")
        return response
    
    def update(self, request, *args, **kwargs):
        """Override update method to handle media files"""
        import logging
        import traceback
        import copy
        from django.db import transaction
        from .models import WorkoutTemplate, WorkoutTemplateImage, WorkoutTemplateVideo
        import json
        
        logger = logging.getLogger(__name__)
        logger.info(f"Update request data: {request.data}")
        
        # Get the instance being updated
        instance = self.get_object()
        instance_id = instance.id
        
        # Create a safe version of request.data that doesn't contain file objects
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['workout_image', 'workout_images', 'workout_videos'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default update method with our safe request
        response = super().update(safe_request, *args, **kwargs)
        
        # If successful, handle media files
        if response.status_code == 200:
            # Get the updated workout template
            try:
                workout_template = WorkoutTemplate.objects.get(id=instance_id)
            except WorkoutTemplate.DoesNotExist:
                logger.error(f"Could not find workout template with ID {instance_id}")
                return response
            
            # Process new workout images if provided
            if 'workout_images' in request.FILES:
                try:
                    images = request.FILES.getlist('workout_images')
                    logger.info(f"Processing {len(images)} new workout images")
                    created_images = []
                    
                    for image in images:
                        image_obj = WorkoutTemplateImage.objects.create(image=image)
                        workout_template.workout_images.add(image_obj)
                        created_images.append({
                            'id': image_obj.id,
                            'image': image_obj.image.url if image_obj.image else None
                        })
                    
                    # Get existing images and combine with new ones
                    existing_images = [{
                        'id': img.id,
                        'image': img.image.url if img.image else None
                    } for img in workout_template.workout_images.all()]
                    
                    response.data['workout_images'] = existing_images
                    logger.info(f"Added {len(created_images)} images to response")
                except Exception as e:
                    logger.error(f"Error processing workout images: {e}")
                    
            # Process new workout videos if provided
            if 'workout_videos' in request.FILES:
                try:
                    videos = request.FILES.getlist('workout_videos')
                    logger.info(f"Processing {len(videos)} new workout videos")
                    created_videos = []
                    
                    for video in videos:
                        video_obj = WorkoutTemplateVideo.objects.create(video=video)
                        workout_template.workout_videos.add(video_obj)
                        created_videos.append({
                            'id': video_obj.id,
                            'video': video_obj.video.url if video_obj.video else None
                        })
                    
                    # Get existing videos and combine with new ones
                    existing_videos = [{
                        'id': vid.id,
                        'video': vid.video.url if vid.video else None
                    } for vid in workout_template.workout_videos.all()]
                    
                    response.data['workout_videos'] = existing_videos
                    logger.info(f"Added {len(created_videos)} videos to response")
                except Exception as e:
                    logger.error(f"Error processing workout videos: {e}")
                    
            # Handle media removal requests
            if 'remove_images' in request.data:
                try:
                    # Handle both MultiValueDict and regular dict
                    if hasattr(request.data, 'getlist'):
                        image_ids = request.data.getlist('remove_images')
                    elif isinstance(request.data['remove_images'], str):
                        # Parse JSON string
                        image_ids = json.loads(request.data['remove_images'])
                    else:
                        # If it's already a list or other type
                        image_ids = request.data['remove_images']
                    
                    if image_ids:
                        logger.info(f"Removing images with IDs: {image_ids}")
                        for image_id in image_ids:
                            workout_template.workout_images.remove(image_id)
                except Exception as e:
                    logger.error(f"Error removing images: {e}")
                    
            if 'remove_videos' in request.data:
                try:
                    # Handle both MultiValueDict and regular dict
                    if hasattr(request.data, 'getlist'):
                        video_ids = request.data.getlist('remove_videos')
                    elif isinstance(request.data['remove_videos'], str):
                        # Parse JSON string
                        video_ids = json.loads(request.data['remove_videos'])
                    else:
                        # If it's already a list or other type
                        video_ids = request.data['remove_videos']
                    
                    if video_ids:
                        logger.info(f"Removing videos with IDs: {video_ids}")
                        for video_id in video_ids:
                            workout_template.workout_videos.remove(video_id)
                except Exception as e:
                    logger.error(f"Error removing videos: {e}")
        
        logger.info(f"Final update response data: {response.data}")
        return response
    
    def get_queryset(self):
        """Filter workout templates by the template's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(template__coach=user.coach_profile)
        return WorkoutTemplate.objects.none()

class ExerciseTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Exercise Templates"""
    queryset = ExerciseTemplate.objects.all()
    serializer_class = ExerciseTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create method to handle media files"""
        import logging
        import traceback
        import copy
        
        logger = logging.getLogger(__name__)
        logger.info(f"Request data: {request.data}")
        logger.info(f"Request FILES: {request.FILES}")
        
        # Create a safe version of request.data that doesn't contain file objects
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['demonstration_video', 'demonstration_image'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default create method with our safe request
        response = super().create(safe_request, *args, **kwargs)
        
        # If successful, now handle the media files explicitly
        if response.status_code in [200, 201]:
            exercise_id = response.data.get('id')
            if not exercise_id:
                logger.error("No exercise template ID found in response")
                return response
                
            try:
                # Get the newly created exercise template
                exercise = ExerciseTemplate.objects.get(id=exercise_id)
                
                # Process demonstration image
                if 'demonstration_image' in request.FILES:
                    logger.info(f"Processing demonstration image for exercise {exercise_id}")
                    image_file = request.FILES['demonstration_image']
                    exercise.demonstration_image = image_file
                    exercise.save(update_fields=['demonstration_image'])
                    response.data['demonstration_image'] = exercise.demonstration_image.url if exercise.demonstration_image else None
                    
                # Process demonstration video
                if 'demonstration_video' in request.FILES:
                    logger.info(f"Processing demonstration video for exercise {exercise_id}")
                    video_file = request.FILES['demonstration_video']
                    exercise.demonstration_video = video_file
                    exercise.save(update_fields=['demonstration_video'])
                    response.data['demonstration_video'] = exercise.demonstration_video.url if exercise.demonstration_video else None
                    
                # Process any custom media handling fields
                existing_image = request.data.get('existing_demonstration_image')
                if existing_image and not exercise.demonstration_image:
                    logger.info(f"Handling existing image reference: {existing_image}")
                    # This would typically involve some logic to handle an existing image reference
                    # that couldn't be included directly as a file
                    
                existing_video = request.data.get('existing_demonstration_video')
                if existing_video and not exercise.demonstration_video:
                    logger.info(f"Handling existing video reference: {existing_video}")
                    # Similar handling for existing video references
                
            except Exception as e:
                logger.error(f"Error processing media files: {e}", exc_info=True)
        
        logger.info(f"Final response data: {response.data}")
        return response
    
    def update(self, request, *args, **kwargs):
        """Override update method to handle media files"""
        import logging
        import traceback
        import copy
        
        logger = logging.getLogger(__name__)
        logger.info(f"Update request data: {request.data}")
        logger.info(f"Update request FILES: {request.FILES}")
        
        # Get the instance being updated
        instance = self.get_object()
        instance_id = instance.id
        
        # Create a safe version of request.data that doesn't contain file objects
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['demonstration_video', 'demonstration_image'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default update method with our safe request
        response = super().update(safe_request, *args, **kwargs)
        
        # If successful, now handle the media files explicitly
        if response.status_code == 200:
            try:
                # Get the updated exercise template
                exercise = ExerciseTemplate.objects.get(id=instance_id)
                
                # Process demonstration image
                if 'demonstration_image' in request.FILES:
                    logger.info(f"Processing demonstration image for exercise {instance_id}")
                    image_file = request.FILES['demonstration_image']
                    
                    # If there's an existing image, delete it first (optional)
                    if exercise.demonstration_image:
                        logger.info(f"Removing existing image: {exercise.demonstration_image}")
                    
                    exercise.demonstration_image = image_file
                    exercise.save(update_fields=['demonstration_image'])
                    response.data['demonstration_image'] = exercise.demonstration_image.url if exercise.demonstration_image else None
                    logger.info(f"Updated exercise with new image: {response.data['demonstration_image']}")
                    
                # Process demonstration video
                if 'demonstration_video' in request.FILES:
                    logger.info(f"Processing demonstration video for exercise {instance_id}")
                    video_file = request.FILES['demonstration_video']
                    
                    # If there's an existing video, delete it first (optional)
                    if exercise.demonstration_video:
                        logger.info(f"Removing existing video: {exercise.demonstration_video}")
                    
                    exercise.demonstration_video = video_file
                    exercise.save(update_fields=['demonstration_video'])
                    response.data['demonstration_video'] = exercise.demonstration_video.url if exercise.demonstration_video else None
                    logger.info(f"Updated exercise with new video: {response.data['demonstration_video']}")
                    
                # Process any custom media handling fields
                existing_image = request.data.get('existing_demonstration_image')
                if existing_image and not exercise.demonstration_image:
                    logger.info(f"Handling existing image reference: {existing_image}")
                    # Logic to handle existing image references would go here
                    
                existing_video = request.data.get('existing_demonstration_video')
                if existing_video and not exercise.demonstration_video:
                    logger.info(f"Handling existing video reference: {existing_video}")
                    # Logic to handle existing video references would go here
                
            except Exception as e:
                logger.error(f"Error processing media files during update: {e}", exc_info=True)
        
        logger.info(f"Final update response data: {response.data}")
        return response
    
    def get_queryset(self):
        """Filter exercise templates by the workout's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(workout_template__template__coach=user.coach_profile)
        return ExerciseTemplate.objects.none()

class MealTemplateViewSet(viewsets.ModelViewSet):
    """API viewset for Meal Templates"""
    queryset = MealTemplate.objects.all()
    serializer_class = MealTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        """Override create method to handle ingredients and media files"""
        import logging
        import json
        import traceback
        import copy
        from django.db import transaction
        from .models import MealTemplate, MealTemplateIngredient, MealTemplateImage, MealTemplateVideo
        from rest_framework.request import Request
        
        logger = logging.getLogger(__name__)
        logger.info(f"Request data: {request.data}")
        
        # Extract and process ingredients if present
        ingredients_data = []
        if 'ingredients' in request.data:
            try:
                # Handle different formats of ingredients data
                raw_ingredients = request.data['ingredients']
                logger.info(f"Raw ingredients data: {raw_ingredients}")
                
                if isinstance(raw_ingredients, str):
                    ingredients_data = json.loads(raw_ingredients)
                    logger.info(f"Parsed ingredients from string: {ingredients_data}")
                elif isinstance(raw_ingredients, list):
                    ingredients_data = raw_ingredients
                    logger.info(f"Using ingredients list directly: {ingredients_data}")
            except Exception as e:
                logger.error(f"Error processing ingredients: {e}")
        
        # Create a safe version of request.data that doesn't contain file objects
        # to prevent pickling errors when Django REST Framework tries to copy the request
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['meal_image', 'meal_images', 'meal_videos'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default create method with our safe request
        response = super().create(safe_request, *args, **kwargs)
        
        # If successful, handle ingredients and media creation
        if response.status_code in [200, 201]:
            meal_template_id = response.data.get('id')
            if not meal_template_id:
                logger.error("No meal template ID found in response")
                return response
                
            # Get the newly created meal template
            try:
                meal_template = MealTemplate.objects.get(id=meal_template_id)
            except MealTemplate.DoesNotExist:
                logger.error(f"Could not find meal template with ID {meal_template_id}")
                return response
            
            # Process ingredients if needed
            if ingredients_data and not response.data.get('ingredients'):
                logger.info(f"Creating ingredients manually for meal template {meal_template_id}")
                try:
                    # Create ingredients manually
                    created_ingredients = []
                    for ingredient_data in ingredients_data:
                        if not ingredient_data:
                            continue
                            
                        # Handle notes specifically to ensure they're saved
                        notes = ''
                        if 'notes' in ingredient_data:
                            notes = ingredient_data['notes'] if ingredient_data['notes'] is not None else ''
                        
                        ingredient = MealTemplateIngredient.objects.create(
                            meal_template=meal_template,
                            name=ingredient_data.get('name', 'Unnamed Ingredient'),
                            quantity=ingredient_data.get('quantity', 0),
                            unit=ingredient_data.get('unit', 'g'),
                            category=ingredient_data.get('category', ''),
                            notes=notes
                        )
                        created_ingredients.append({
                            'id': ingredient.id,
                            'name': ingredient.name,
                            'quantity': str(ingredient.quantity),
                            'unit': ingredient.unit,
                            'category': ingredient.category,
                            'notes': ingredient.notes or ''
                        })
                    
                    # Update the response with the created ingredients
                    response.data['ingredients'] = created_ingredients
                    logger.info(f"Added {len(created_ingredients)} ingredients to response")
                except Exception as e:
                    logger.error(f"Error creating ingredients manually: {e}")
            
            # Process meal images
            if 'meal_images' in request.FILES:
                try:
                    images = request.FILES.getlist('meal_images')
                    logger.info(f"Processing {len(images)} meal images")
                    created_images = []
                    
                    for image in images:
                        logger.info(f"Creating image with file: {image.name}")
                        image_obj = MealTemplateImage.objects.create(image=image)
                        meal_template.meal_images.add(image_obj)
                        created_images.append({
                            'id': image_obj.id,
                            'image': image_obj.image.url if image_obj.image else None
                        })
                    
                    response.data['meal_images'] = created_images
                    logger.info(f"Added {len(created_images)} images to response")
                    
                    # Force save to ensure relationships are persisted
                    meal_template.save()
                except Exception as e:
                    logger.error(f"Error processing meal images: {e}", exc_info=True)
                    
            # Process meal videos
            if 'meal_videos' in request.FILES:
                try:
                    videos = request.FILES.getlist('meal_videos')
                    logger.info(f"Processing {len(videos)} meal videos")
                    created_videos = []
                    
                    for video in videos:
                        logger.info(f"Creating video with file: {video.name}")
                        video_obj = MealTemplateVideo.objects.create(video=video)
                        meal_template.meal_videos.add(video_obj)
                        created_videos.append({
                            'id': video_obj.id,
                            'video': video_obj.video.url if video_obj.video else None
                        })
                    
                    response.data['meal_videos'] = created_videos
                    logger.info(f"Added {len(created_videos)} videos to response")
                    
                    # Force save to ensure relationships are persisted
                    meal_template.save()
                except Exception as e:
                    logger.error(f"Error processing meal videos: {e}", exc_info=True)
        
        logger.info(f"Final response data: {response.data}")
        return response
    
    def update(self, request, *args, **kwargs):
        """Override update method to handle ingredients and media files"""
        import logging
        import json
        import traceback
        import copy
        from django.db import transaction
        from .models import MealTemplate, MealTemplateIngredient, MealTemplateImage, MealTemplateVideo
        from rest_framework.request import Request
        
        logger = logging.getLogger(__name__)
        logger.info(f"Update request data: {request.data}")
        
        # Extract and process ingredients if present
        ingredients_data = []
        if 'ingredients' in request.data:
            try:
                # Handle different formats of ingredients data
                raw_ingredients = request.data['ingredients']
                logger.info(f"Raw ingredients data for update: {raw_ingredients}")
                
                if isinstance(raw_ingredients, str):
                    ingredients_data = json.loads(raw_ingredients)
                    logger.info(f"Parsed ingredients from string: {ingredients_data}")
                elif isinstance(raw_ingredients, list):
                    ingredients_data = raw_ingredients
                    logger.info(f"Using ingredients list directly: {ingredients_data}")
            except Exception as e:
                logger.error(f"Error processing ingredients: {e}")
        
        # Get the instance being updated
        instance = self.get_object()
        instance_id = instance.id
        
        # Create a safe version of request.data that doesn't contain file objects
        # to prevent pickling errors when Django REST Framework tries to copy the request
        safe_data = {}
        for key, value in request.data.items():
            # Skip file fields - they'll be handled separately
            if key not in ['meal_image', 'meal_images', 'meal_videos'] and not hasattr(value, 'read'):
                safe_data[key] = value
        
        # We'll create a new request object with the safe data
        safe_request = type('SafeRequest', (), {})()
        safe_request.data = safe_data
        safe_request.FILES = request.FILES  # Files are handled specially by DRF
        safe_request.user = request.user
        safe_request.method = request.method
        
        # Use the default update method with our safe request
        response = super().update(safe_request, *args, **kwargs)
        
        # If successful, handle ingredients and media files
        if response.status_code == 200:
            # Get the updated meal template
            try:
                meal_template = MealTemplate.objects.get(id=instance_id)
            except MealTemplate.DoesNotExist:
                logger.error(f"Could not find meal template with ID {instance_id}")
                return response
            
            # Process ingredients if provided
            if ingredients_data:
                logger.info(f"Updating ingredients manually for meal template {instance_id}")
                try:
                    # Delete existing ingredients
                    MealTemplateIngredient.objects.filter(meal_template_id=instance_id).delete()
                    logger.info(f"Deleted existing ingredients for meal template {instance_id}")
                    
                    # Create ingredients manually
                    created_ingredients = []
                    for ingredient_data in ingredients_data:
                        if not ingredient_data:
                            continue
                            
                        # Handle notes specifically to ensure they're saved
                        notes = ''
                        if 'notes' in ingredient_data:
                            notes = ingredient_data['notes'] if ingredient_data['notes'] is not None else ''
                        
                        ingredient = MealTemplateIngredient.objects.create(
                            meal_template=meal_template,
                            name=ingredient_data.get('name', 'Unnamed Ingredient'),
                            quantity=ingredient_data.get('quantity', 0),
                            unit=ingredient_data.get('unit', 'g'),
                            category=ingredient_data.get('category', ''),
                            notes=notes
                        )
                        created_ingredients.append({
                            'id': ingredient.id,
                            'name': ingredient.name,
                            'quantity': str(ingredient.quantity),
                            'unit': ingredient.unit,
                            'category': ingredient.category,
                            'notes': ingredient.notes or ''
                        })
                    
                    # Update the response with the created ingredients
                    response.data['ingredients'] = created_ingredients
                    logger.info(f"Added {len(created_ingredients)} ingredients to response")
                except Exception as e:
                    logger.error(f"Error updating ingredients manually: {e}")
            
            # Process new meal images if provided
            if 'meal_images' in request.FILES:
                try:
                    images = request.FILES.getlist('meal_images')
                    logger.info(f"Processing {len(images)} new meal images")
                    created_images = []
                    
                    for image in images:
                        image_obj = MealTemplateImage.objects.create(image=image)
                        meal_template.meal_images.add(image_obj)
                        created_images.append({
                            'id': image_obj.id,
                            'image': image_obj.image.url if image_obj.image else None
                        })
                    
                    # Get existing images and combine with new ones
                    existing_images = [{
                        'id': img.id,
                        'image': img.image.url if img.image else None
                    } for img in meal_template.meal_images.all()]
                    
                    response.data['meal_images'] = existing_images
                    logger.info(f"Added {len(created_images)} images to response")
                except Exception as e:
                    logger.error(f"Error processing meal images: {e}")
                    
            # Process new meal videos if provided
            if 'meal_videos' in request.FILES:
                try:
                    videos = request.FILES.getlist('meal_videos')
                    logger.info(f"Processing {len(videos)} new meal videos")
                    created_videos = []
                    
                    for video in videos:
                        video_obj = MealTemplateVideo.objects.create(video=video)
                        meal_template.meal_videos.add(video_obj)
                        created_videos.append({
                            'id': video_obj.id,
                            'video': video_obj.video.url if video_obj.video else None
                        })
                    
                    # Get existing videos and combine with new ones
                    existing_videos = [{
                        'id': vid.id,
                        'video': vid.video.url if vid.video else None
                    } for vid in meal_template.meal_videos.all()]
                    
                    response.data['meal_videos'] = existing_videos
                    logger.info(f"Added {len(created_videos)} videos to response")
                except Exception as e:
                    logger.error(f"Error processing meal videos: {e}")
                    
            # Handle media removal requests
            if 'remove_images' in request.data:
                try:
                    # Handle both MultiValueDict and regular dict
                    if hasattr(request.data, 'getlist'):
                        image_ids = request.data.getlist('remove_images')
                    elif isinstance(request.data['remove_images'], str):
                        # Parse JSON string
                        image_ids = json.loads(request.data['remove_images'])
                    else:
                        # If it's already a list or other type
                        image_ids = request.data['remove_images']
                    
                    if image_ids:
                        logger.info(f"Removing images with IDs: {image_ids}")
                        for image_id in image_ids:
                            meal_template.meal_images.remove(image_id)
                except Exception as e:
                    logger.error(f"Error removing images: {e}")
                    
            if 'remove_videos' in request.data:
                try:
                    # Handle both MultiValueDict and regular dict
                    if hasattr(request.data, 'getlist'):
                        video_ids = request.data.getlist('remove_videos')
                    elif isinstance(request.data['remove_videos'], str):
                        # Parse JSON string
                        video_ids = json.loads(request.data['remove_videos'])
                    else:
                        # If it's already a list or other type
                        video_ids = request.data['remove_videos']
                    
                    if video_ids:
                        logger.info(f"Removing videos with IDs: {video_ids}")
                        for video_id in video_ids:
                            meal_template.meal_videos.remove(video_id)
                except Exception as e:
                    logger.error(f"Error removing videos: {e}")
        
        logger.info(f"Final update response data: {response.data}")
        return response
    
    def get_queryset(self):
        """Filter meal templates by the template's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(template__coach=user.coach_profile)
        return MealTemplate.objects.none()

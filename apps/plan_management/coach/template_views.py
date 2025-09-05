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
        """Override create method to handle ingredients data"""
        import logging
        import json
        from .models import MealTemplate, MealTemplateIngredient
        
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
                    
                # Create a mutable copy of request data if needed
                if hasattr(request.data, 'copy'):
                    mutable_data = request.data.copy()
                    # Store processed ingredients data
                    mutable_data['ingredients_data'] = ingredients_data
                    request._full_data = mutable_data
            except Exception as e:
                logger.error(f"Error processing ingredients: {e}")
        
        # Use the default create method to create the meal template
        response = super().create(request, *args, **kwargs)
        
        # If successful, handle ingredients creation manually if needed
        if response.status_code in [200, 201]:
            meal_template_id = response.data.get('id')
            if meal_template_id and ingredients_data and not response.data.get('ingredients'):
                logger.info(f"Creating ingredients manually for meal template {meal_template_id}")
                try:
                    # Get the newly created meal template
                    meal_template = MealTemplate.objects.get(id=meal_template_id)
                    
                    # Create ingredients manually
                    created_ingredients = []
                    for ingredient_data in ingredients_data:
                        ingredient = MealTemplateIngredient.objects.create(
                            meal_template=meal_template,
                            name=ingredient_data.get('name', 'Unnamed Ingredient'),
                            quantity=ingredient_data.get('quantity', 0),
                            unit=ingredient_data.get('unit', 'g'),
                            category=ingredient_data.get('category', ''),
                            notes=ingredient_data.get('notes', '')
                        )
                        created_ingredients.append({
                            'id': ingredient.id,
                            'name': ingredient.name,
                            'quantity': str(ingredient.quantity),
                            'unit': ingredient.unit,
                            'category': ingredient.category,
                            'notes': ingredient.notes
                        })
                    
                    # Update the response with the created ingredients
                    response.data['ingredients'] = created_ingredients
                    logger.info(f"Added {len(created_ingredients)} ingredients to response")
                except Exception as e:
                    logger.error(f"Error creating ingredients manually: {e}")
        
        logger.info(f"Final response data: {response.data}")
        return response
    
    def update(self, request, *args, **kwargs):
        """Override update method to handle ingredients data"""
        import logging
        import json
        from .models import MealTemplate, MealTemplateIngredient
        
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
                    
                # Create a mutable copy of request data if needed
                if hasattr(request.data, 'copy'):
                    mutable_data = request.data.copy()
                    # Store processed ingredients data
                    mutable_data['ingredients_data'] = ingredients_data
                    request._full_data = mutable_data
            except Exception as e:
                logger.error(f"Error processing ingredients: {e}")
        
        # Get the instance being updated
        instance = self.get_object()
        instance_id = instance.id
        
        # Use the default update method
        response = super().update(request, *args, **kwargs)
        
        # If successful and ingredients were provided, handle them manually if needed
        if response.status_code == 200 and ingredients_data:
            if not response.data.get('ingredients'):
                logger.info(f"Updating ingredients manually for meal template {instance_id}")
                try:
                    # Delete existing ingredients
                    MealTemplateIngredient.objects.filter(meal_template_id=instance_id).delete()
                    logger.info(f"Deleted existing ingredients for meal template {instance_id}")
                    
                    # Get the updated meal template
                    meal_template = MealTemplate.objects.get(id=instance_id)
                    
                    # Create ingredients manually
                    created_ingredients = []
                    for ingredient_data in ingredients_data:
                        ingredient = MealTemplateIngredient.objects.create(
                            meal_template=meal_template,
                            name=ingredient_data.get('name', 'Unnamed Ingredient'),
                            quantity=ingredient_data.get('quantity', 0),
                            unit=ingredient_data.get('unit', 'g'),
                            category=ingredient_data.get('category', ''),
                            notes=ingredient_data.get('notes', '')
                        )
                        created_ingredients.append({
                            'id': ingredient.id,
                            'name': ingredient.name,
                            'quantity': str(ingredient.quantity),
                            'unit': ingredient.unit,
                            'category': ingredient.category,
                            'notes': ingredient.notes
                        })
                    
                    # Update the response with the created ingredients
                    response.data['ingredients'] = created_ingredients
                    logger.info(f"Added {len(created_ingredients)} ingredients to response")
                except Exception as e:
                    logger.error(f"Error updating ingredients manually: {e}")
        
        logger.info(f"Final update response data: {response.data}")
        return response
    
    def get_queryset(self):
        """Filter meal templates by the template's coach"""
        user = self.request.user
        if hasattr(user, 'coach_profile'):
            return self.queryset.filter(template__coach=user.coach_profile)
        return MealTemplate.objects.none()

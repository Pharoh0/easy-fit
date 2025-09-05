from rest_framework import serializers
from .models import PlanTemplate, WorkoutTemplate, ExerciseTemplate, MealTemplate, MealTemplateIngredient, MealTemplateImage, MealTemplateVideo
from apps.profiles.coach_profile.models import CoachProfile
from apps.profiles.utils import get_avatar_url

class CoachProfileMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for CoachProfile to avoid circular imports"""
    coach_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachProfile
        fields = ['id', 'coach_name', 'avatar', 'avatar_url']
        
    def get_coach_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
        
    def get_avatar_url(self, obj):
        request = self.context.get('request')
        return get_avatar_url(obj, request)


class PlanTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Plan Templates"""
    coach_name = serializers.SerializerMethodField()
    coach_avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PlanTemplate
        fields = [
            'id', 'name', 'description', 'template_type', 
            'coach', 'coach_name', 'coach_avatar_url', 'is_public',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'coach_name', 'coach_avatar_url']
    
    def get_coach_name(self, obj):
        if obj.coach and obj.coach.user:
            return obj.coach.user.get_full_name() or obj.coach.user.username
        return 'Unknown'
        
    def get_coach_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.coach:
            return get_avatar_url(obj.coach, request)
        return None


class ExerciseTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Exercise Templates"""
    workout_template_name = serializers.CharField(source='workout_template.name', read_only=True)
    
    class Meta:
        model = ExerciseTemplate
        fields = [
            'id', 'workout_template', 'workout_template_name', 
            'exercise_name', 'exercise_category', 
            'sets', 'reps', 'rest_seconds', 'order', 
            'instructions', 'demonstration_video', 'demonstration_image'
        ]
        read_only_fields = ['id', 'workout_template_name']


class WorkoutTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Workout Templates"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    exercises = ExerciseTemplateSerializer(source='exercise_templates', many=True, read_only=True)
    
    class Meta:
        model = WorkoutTemplate
        fields = [
            'id', 'template', 'template_name', 'name', 'workout_type',
            'duration_minutes', 'intensity_level', 'instructions',
            'equipment_needed', 'exercises'
        ]
        read_only_fields = ['id', 'template_name', 'exercises']


class MealTemplateImageSerializer(serializers.ModelSerializer):
    """Serializer for Meal Template Images"""
    
    class Meta:
        model = MealTemplateImage
        fields = ['id', 'image']


class MealTemplateVideoSerializer(serializers.ModelSerializer):
    """Serializer for Meal Template Videos"""
    
    class Meta:
        model = MealTemplateVideo
        fields = ['id', 'video']


class MealTemplateIngredientSerializer(serializers.ModelSerializer):
    """Serializer for Meal Template Ingredients"""
    
    class Meta:
        model = MealTemplateIngredient
        fields = ['id', 'name', 'quantity', 'unit', 'category', 'notes']


class MealTemplateSerializer(serializers.ModelSerializer):
    """Serializer for Meal Templates"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    ingredients = MealTemplateIngredientSerializer(many=True, read_only=True)
    meal_images = MealTemplateImageSerializer(many=True, read_only=True)
    meal_videos = MealTemplateVideoSerializer(many=True, read_only=True)
    
    class Meta:
        model = MealTemplate
        fields = [
            'id', 'template', 'template_name', 'meal_name', 'meal_type', 'category',
            'calories', 'protein_grams', 'carbs_grams', 'fats_grams',
            'preparation_time_minutes', 'cooking_time_minutes', 'description',
            'recipe', 'meal_image', 'ingredients', 'meal_images', 'meal_videos'
        ]
        read_only_fields = ['id', 'template_name']
        
    def to_internal_value(self, data):
        """Custom method to handle multipart form data"""
        # Import JSON for parsing
        import json
        import logging
        logger = logging.getLogger(__name__)
        
        # Log incoming data for debugging
        logger.info(f"Processing meal template data: {data}")
        
        # Make a mutable copy of the data
        mutable_data = data.copy() if hasattr(data, 'copy') else data
        
        # Handle ingredients if present in the request
        if 'ingredients' in mutable_data:
            try:
                # Try to parse ingredients as JSON string
                ingredients_value = mutable_data['ingredients']
                logger.info(f"Raw ingredients value: {ingredients_value}")
                
                if isinstance(ingredients_value, str):
                    # Parse the JSON string to a Python object
                    logger.info("Parsing ingredients JSON string")
                    mutable_data['ingredients_data'] = json.loads(ingredients_value)
                    logger.info(f"Parsed ingredients: {mutable_data['ingredients_data']}")
                elif hasattr(ingredients_value, 'read'):
                    # Handle case when it's a file object (possible with multipart)
                    ingredients_content = ingredients_value.read().decode('utf-8')
                    logger.info(f"Read ingredients from file: {ingredients_content}")
                    try:
                        mutable_data['ingredients_data'] = json.loads(ingredients_content)
                    except json.JSONDecodeError:
                        mutable_data['ingredients_data'] = []
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing ingredients JSON: {e}")
                # If parsing fails, set to empty list
                mutable_data['ingredients_data'] = []
            except Exception as e:
                logger.error(f"Unexpected error handling ingredients: {e}")
                mutable_data['ingredients_data'] = []
        
        # Continue with standard deserialization
        return super().to_internal_value(mutable_data)
    
    def to_representation(self, instance):
        """Customize the output representation of the MealTemplate"""
        # Get the standard representation
        representation = super().to_representation(instance)
        
        # Explicitly fetch and include ingredients to ensure they're always in the response
        ingredients = instance.ingredients.all()
        representation['ingredients'] = MealTemplateIngredientSerializer(ingredients, many=True).data
        
        return representation
    
    def create(self, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        
        # Extract ingredients data from validated_data if present
        ingredients_data = validated_data.pop('ingredients_data', [])
        
        # Log for debugging
        logger.info(f"Creating meal template with data: {validated_data}")
        
        # Handle ingredients extraction directly from request
        request = self.context.get('request')
        if not ingredients_data and request and hasattr(request, 'data'):
            raw_ingredients = request.data.get('ingredients')
            if raw_ingredients:
                logger.info(f"Found raw ingredients in request: {raw_ingredients}")
                try:
                    import json
                    if isinstance(raw_ingredients, str):
                        ingredients_data = json.loads(raw_ingredients)
                    elif isinstance(raw_ingredients, list):
                        ingredients_data = raw_ingredients
                    logger.info(f"Processed ingredients: {ingredients_data}")
                except Exception as e:
                    logger.error(f"Error processing raw ingredients: {e}")
        
        # Create the meal template
        meal_template = MealTemplate.objects.create(**validated_data)
        
        # Process ingredients
        if ingredients_data:
            self._process_ingredients(meal_template, ingredients_data)
            logger.info(f"Processed {len(ingredients_data)} ingredients for meal template {meal_template.id}")
        else:
            logger.warning("No ingredients data found to process")
        
        return meal_template
        
    def _process_ingredients(self, meal_template, ingredients_data):
        """Helper method to process ingredients data in both create and update"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Handle case when ingredients_data is a string (from FormData)
        if isinstance(ingredients_data, str):
            import json
            try:
                logger.info(f"Parsing ingredients string: {ingredients_data}")
                ingredients_data = json.loads(ingredients_data)
                logger.info(f"Parsed ingredients: {ingredients_data}")
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing ingredients JSON: {e}")
                ingredients_data = []
        
        # Handle case when no ingredients are provided
        if not ingredients_data:
            logger.warning("No ingredients data provided or empty list received")
            return
            
        logger.info(f"Processing {len(ingredients_data)} ingredients")
        ingredients_created = 0
        
        # Create ingredient objects
        for ingredient_data in ingredients_data:
            # Skip if ingredient data is None or empty
            if not ingredient_data:
                logger.warning("Empty ingredient data found, skipping")
                continue
                
            # Make a copy to avoid modifying the original data
            try:
                if hasattr(ingredient_data, 'copy'):
                    ingredient = ingredient_data.copy()
                elif isinstance(ingredient_data, dict):
                    ingredient = dict(ingredient_data)
                else:
                    logger.warning(f"Unexpected ingredient data type: {type(ingredient_data)}")
                    ingredient = {}
                    for k, v in ingredient_data.items():
                        ingredient[k] = v
            except Exception as e:
                logger.error(f"Could not process ingredient data: {ingredient_data}, error: {e}")
                continue
            
            # Convert values to appropriate types if needed
            if 'quantity' in ingredient:
                try:
                    if not isinstance(ingredient['quantity'], (int, float)):
                        ingredient['quantity'] = float(ingredient['quantity'])
                except (ValueError, TypeError):
                    ingredient['quantity'] = 0
            else:
                ingredient['quantity'] = 0
            
            # Remove any id field if present (to avoid conflicts when creating)
            if 'id' in ingredient:
                del ingredient['id']
                
            # Ensure required fields are present
            required_fields = ['name', 'quantity', 'unit']
            for field in required_fields:
                if field not in ingredient or not ingredient[field]:
                    if field == 'name':
                        ingredient[field] = 'Unnamed Ingredient'
                    elif field == 'unit':
                        ingredient[field] = 'g'
            
            logger.info(f"Creating ingredient: {ingredient}")
            try:
                # Get notes value ensuring it's properly handled
                notes_value = ''
                if 'notes' in ingredient:
                    # Ensure notes is not None
                    notes_value = ingredient['notes'] if ingredient['notes'] is not None else ''
                    # Log the notes value for debugging
                    logger.info(f"Notes value for ingredient: '{notes_value}'")
                
                # Create the ingredient object with explicit field mapping
                ingredient_obj = MealTemplateIngredient.objects.create(
                    meal_template=meal_template,
                    name=ingredient.get('name', 'Unnamed Ingredient'),
                    quantity=ingredient.get('quantity', 0),
                    unit=ingredient.get('unit', 'g'),
                    category=ingredient.get('category', ''),
                    notes=notes_value
                )
                
                # Double check the notes field was saved correctly
                logger.info(f"Created ingredient with ID {ingredient_obj.id} and notes: '{ingredient_obj.notes}'")
                ingredients_created += 1
            except Exception as e:
                logger.error(f"Error creating ingredient: {e}")
                # Continue with next ingredient even if this one fails
                continue
        
        logger.info(f"Successfully created {ingredients_created} ingredients for meal template {meal_template.id}")
    
    def update(self, instance, validated_data):
        import logging
        logger = logging.getLogger(__name__)
        
        # Extract ingredients data
        ingredients_data = validated_data.pop('ingredients_data', [])
        logger.info(f"Update with ingredients data: {ingredients_data}")
        
        # If no ingredients in validated data, check request directly
        if not ingredients_data:
            request = self.context.get('request')
            if request and hasattr(request, 'data'):
                raw_ingredients = request.data.get('ingredients')
                if raw_ingredients:
                    logger.info(f"Found raw ingredients in request: {raw_ingredients}")
                    try:
                        import json
                        if isinstance(raw_ingredients, str):
                            ingredients_data = json.loads(raw_ingredients)
                        elif isinstance(raw_ingredients, list):
                            ingredients_data = raw_ingredients
                        logger.info(f"Processed raw ingredients: {ingredients_data}")
                    except Exception as e:
                        logger.error(f"Error processing raw ingredients: {e}")
        
        # Update meal template fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Handle ingredients - first clear existing ones if new ones are provided
        if ingredients_data:
            logger.info(f"Deleting existing ingredients for meal template {instance.id}")
            instance.ingredients.all().delete()
            
            # Process ingredients using the helper method
            self._process_ingredients(instance, ingredients_data)
            logger.info(f"Processed {len(ingredients_data)} ingredients for meal template {instance.id}")
        
        return instance

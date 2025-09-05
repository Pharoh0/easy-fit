# Template Management Testing Guide

## Meal Templates Testing

### Create Workflow
1. Click "Create Meal Template" button
2. Fill in all fields including:
   - Template Name
   - Meal Type (dropdown)
   - Category
   - Preparation Time
   - Cooking Time (newly added)
   - Description
   - Calories, Protein, Carbs, Fat
   - Add at least one ingredient
   - Instructions
3. Click Save
4. Verify the template appears in the template list with correct details

### Update Workflow
1. Click "Edit" on an existing meal template
2. Verify all fields are populated correctly:
   - Template Name should show the meal_name
   - Meal Type dropdown should have the correct option selected
   - Category should be populated
   - Preparation Time should show the correct value
   - Cooking Time should show the correct value
   - Description should be populated
   - All nutritional information should be displayed
   - Ingredients should be loaded correctly
   - Instructions should be populated
3. Modify multiple fields (both text fields and dropdowns)
4. Click Save
5. Verify the changes are reflected in the template list

## Workout Templates Testing

### Create Workflow
1. Click "Create Workout Template" button
2. Fill in all fields including:
   - Template Name
   - Workout Type (dropdown)
   - Duration (minutes)
   - Intensity Level (dropdown)
   - Description
   - Equipment Needed
3. Add at least one exercise block with:
   - Block Name
   - Block Type
   - At least one exercise with all details
4. Click Save
5. Verify the template appears in the template list with correct details

### Update Workflow
1. Click "Edit" on an existing workout template
2. Verify all fields are populated correctly:
   - Template Name should show the name
   - Workout Type dropdown should have the correct option selected
   - Duration should show the correct value
   - Intensity Level dropdown should have the correct option selected
   - Description should be populated
   - Equipment needed should be populated
   - Exercise blocks should be loaded with all exercises
3. Modify multiple fields
4. Add a new exercise block and exercise
5. Click Save
6. Verify the changes are reflected in the template list

## Edge Cases to Test

1. Try creating a template with missing required fields
2. Try adding many ingredients/exercises
3. Test with very long text in description fields
4. Test with special characters in names and descriptions
5. Test with boundary values for numeric fields (0, very large numbers)

## API Response Handling

1. Review API responses in browser console
2. Verify that field mapping works with different field name formats
3. Confirm that error handling displays appropriate toast messages

## Common Issues and Solutions

1. If a field appears empty when editing, check:
   - Browser console for errors
   - Network tab for API response data structure
   - Field mapping in the getPropertyValue function

2. If toast messages don't appear:
   - Check if showToast function is called
   - Verify Bootstrap is properly loaded

3. If saving doesn't work:
   - Check form validation logic
   - Verify API endpoint is correct
   - Check data structure being sent to the API

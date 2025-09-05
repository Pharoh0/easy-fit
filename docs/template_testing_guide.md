# Template Management Testing Guide

This guide provides step-by-step instructions for testing the workout and meal template management functionality after recent fixes.

## Workout Template Testing

### Creating a New Workout Template

1. **Access the Workout Templates Page**
   - Log in as a coach
   - Navigate to the workout template management page

2. **Create a Basic Template**
   - Click "Create New Workout Template"
   - Fill in the basic fields:
     - Template Name: "Test Workout Template"
     - Workout Type: "Strength"
     - Duration (minutes): "45"
     - Intensity Level: "Intermediate" 
     - Instructions: "Follow all exercises with proper form"
     - Equipment Needed: "Dumbbells, Bench"

3. **Add Exercise Blocks**
   - In the first exercise block:
     - Name the block: "Warm-up"
     - Select block type: "Warm-up"
     - Add 2-3 warm-up exercises with names, categories, sets, reps and rest times
   - Add a second exercise block:
     - Click "Add Exercise Block"
     - Name it: "Main Workout"
     - Select block type: "Standard" 
     - Add 3-4 exercises with complete details

4. **Save and Verify**
   - Click "Save Template"
   - Verify success toast appears
   - Confirm the template appears in the list with correct name and details
   - Check that the count of exercise blocks is correct

### Editing an Existing Template

1. **Open Existing Template**
   - Find your recently created template in the list
   - Click the "Edit" button

2. **Verify All Fields Are Populated**
   - Check all basic template fields contain the values you entered
   - Verify exercise blocks are displayed with correct names and types
   - Confirm all exercises appear with complete details in each block

3. **Modify Template**
   - Change template name to "Updated Workout Template"
   - Edit duration to "60" minutes
   - Add a new exercise to an existing block
   - Rename an existing block
   - Delete one exercise

4. **Save and Verify Changes**
   - Save the template
   - Open it again to verify all changes were saved correctly
   - Check that additions, modifications and deletions were persisted

### Test Edge Cases

1. **Empty Form Validation**
   - Try to create a template without a name
   - Try to save with an empty exercise block
   - Attempt to save an exercise without a name
   - Verify appropriate validation errors appear

2. **Exercise Block Management**
   - Create a template with multiple exercise blocks
   - Delete a middle block and verify remaining blocks are still intact
   - Move exercises between blocks
   - Verify block order is maintained after saving

## Meal Template Testing

### Creating a New Meal Template

1. **Access the Meal Templates Page**
   - Navigate to the meal template management page

2. **Create a Basic Template**
   - Click "Create New Meal Template"
   - Fill in the basic fields:
     - Template Name: "Test Meal Template"
     - Meal Type: "Breakfast"
     - Cooking Time (minutes): "20"
     - Calorie Count: "450"
     - Protein (g): "30"
     - Carbs (g): "40"
     - Fat (g): "15"
     - Instructions: "Prepare all ingredients before cooking"

3. **Add Ingredients**
   - Add 4-5 ingredients with names, quantities, and units
   - Include both common and unique ingredients

4. **Save and Verify**
   - Click "Save Template"
   - Verify success toast appears
   - Confirm the template appears in the list with correct name and details
   - Check that the count of ingredients is correct

### Editing an Existing Template

1. **Open Existing Template**
   - Find your recently created meal template
   - Click the "Edit" button

2. **Verify All Fields Are Populated**
   - Check all basic template fields contain the values you entered
   - Verify all ingredients appear with correct quantities and units

3. **Modify Template**
   - Change template name to "Updated Meal Template"
   - Edit cooking time to "25" minutes
   - Add a new ingredient
   - Change quantity of an existing ingredient
   - Remove one ingredient

4. **Save and Verify Changes**
   - Save the template
   - Open it again to verify all changes were saved correctly
   - Check that additions, modifications and deletions were persisted

## Reporting Issues

If you encounter any issues during testing:

1. Check browser console for JavaScript errors
2. Verify network requests in developer tools to see API responses
3. Document steps to reproduce the issue
4. Note any error messages displayed in toasts or console

Record all testing observations and any remaining issues to help with further refinements.

# EazyFit Coach Plan Creation Process Documentation

## Overview

The EazyFit plan creation system allows coaches to create comprehensive fitness and meal plans for their clients. The process is divided into several logical steps with a clean separation between workout and meal template creation.

## Architecture

The system uses:
- Django REST Framework backend
- JavaScript frontend with modular structure
- Bootstrap 5 for UI components
- JWT authentication
- CoachPlanAPI module for unified API access

## Plan Creation Workflow

### 1. Coach Authentication and Profile Identification

- The system first authenticates the coach using JWT tokens
- Coach ID is retrieved using the `/profiles/api/v1/coach-profiles/me/` endpoint
- Multiple fallback mechanisms are in place:
  - User info embedded in page
  - Data attributes on HTML elements
  - Session storage
  - URL path parsing

### 2. Plan Basics Entry

- Coach fills in the basic plan information:
  - Plan name
  - Description
  - Duration
  - Client selection (if applicable)
  - Privacy settings

### 3. Plan Structure Definition

- Coach defines the structure of the plan:
  - Days per week
  - Weeks duration
  - Weekly pattern (which days have workouts/meals)

### 4. Workout Template Selection

#### 4.1 Loading Existing Templates
- The system loads existing workout templates using `CoachPlanAPI.workoutTemplates.getAll()`
- Templates are displayed in a paginated table
- Coach can select existing templates to include in the plan

#### 4.2 Creating New Workout Templates
- Coach can create new workout templates on the fly
- Process is handled by `workout_template_creation.js`:
  1. Define template basics (name, description)
  2. Add exercises from the exercise library
  3. Configure sets, reps, and rest periods
  4. Save the template

### 5. Meal Template Selection

#### 5.1 Loading Existing Templates
- Similar to workout templates, meal templates are loaded with `CoachPlanAPI.mealTemplates.getAll()`
- Templates are displayed in a paginated table
- Coach can select existing templates to include in the plan

#### 5.2 Creating New Meal Templates
- Coach can create new meal templates on the fly
- Process is handled by `meal_template_creation.js`:
  1. Define template basics (name, description)
  2. Add meals by time period (breakfast, lunch, dinner, etc.)
  3. Configure portions, calories, and nutritional information
  4. Save the template

### 6. Plan Assignment and Schedule

- Coach assigns selected templates to specific days in the plan
- The UI allows drag-and-drop functionality to arrange templates
- Each day can have multiple workout and meal templates

### 7. Plan Review and Submission

- Coach reviews the complete plan structure
- Preview functionality shows how the plan will appear to clients
- Coach can make final adjustments before submission

### 8. Plan Saving and API Interactions

1. **Creating the plan container**:
   ```javascript
   CoachPlanAPI.plans.create({
     name: planName,
     description: planDescription,
     coach: coachId,
     duration_weeks: durationWeeks,
     // other fields...
   })
   ```

2. **Adding templates to the plan**:
   ```javascript
   CoachPlanAPI.planItems.create({
     plan: planId,
     template: templateId,
     day_of_week: dayNumber,
     week_number: weekNumber,
     // other fields...
   })
   ```

3. **Finalizing the plan**:
   ```javascript
   CoachPlanAPI.plans.update(planId, {
     status: 'published',
     // other fields...
   })
   ```

## API Endpoints Used

1. **Coach Profile**:
   - GET `/profiles/api/v1/coach-profiles/me/` - Get current coach profile
   - GET `/profiles/api/v1/coach-profiles/` - List all coach profiles

2. **Plan Management**:
   - GET/POST `/plan-management/api/v1/plans/` - List/create plans
   - GET/PUT/DELETE `/plan-management/api/v1/plans/{id}/` - Get/update/delete plan

3. **Template Management**:
   - GET/POST `/plan-management/api/v1/workout-templates/` - List/create workout templates
   - GET/POST `/plan-management/api/v1/meal-templates/` - List/create meal templates
   - GET/POST `/plan-management/api/v1/plan-templates/` - List/create plan templates

4. **Plan Items**:
   - GET/POST `/plan-management/api/v1/plan-items/` - List/create plan items
   - GET/PUT/DELETE `/plan-management/api/v1/plan-items/{id}/` - Get/update/delete plan item

## Error Handling

The system implements robust error handling:

1. **API Error Handling**:
   - All API calls use the `APIBase` module with standardized error handling
   - Errors are parsed and presented as user-friendly toast notifications

2. **Fallback Mechanisms**:
   - Multiple methods to retrieve coach ID if primary method fails
   - Default avatar handling when images are missing
   - Session storage for preserving state during the creation process

3. **Validation**:
   - Client-side validation for all form inputs
   - Server-side validation via DRF serializers

## Future Improvements

1. Implement real-time collaboration features
2. Add preview functionality for workout and meal templates
3. Enhance the drag-and-drop interface for plan assignment
4. Add analytics and recommendation features for template selection

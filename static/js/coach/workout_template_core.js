/**
 * Workout Template Core JavaScript
 * Handles the core functionality for workout template creation and management
 */

// Function to initialize workout template functionality
function initWorkoutTemplateCore() {
    console.log('Initializing workout template core module');
    
    // Set up event listeners for workout template controls
    setupWorkoutTemplateEventListeners();
    
    // Load existing workout templates
    loadWorkoutTemplates();
}

// Set up event listeners for workout template controls
function setupWorkoutTemplateEventListeners() {
    // Buttons for creating, editing, and viewing templates
    document.getElementById('createWorkoutTemplateBtn')?.addEventListener('click', showWorkoutTemplateEditor);
    document.getElementById('cancelWorkoutTemplateBtn')?.addEventListener('click', hideWorkoutTemplateEditor);
    document.getElementById('saveWorkoutTemplateBtn')?.addEventListener('click', saveWorkoutTemplate);
    document.getElementById('emptyStateCreateTemplate')?.addEventListener('click', showWorkoutTemplateEditor);
    document.getElementById('addExerciseBlockBtn')?.addEventListener('click', addExerciseBlock);
    
    // Select all checkbox
    document.getElementById('selectAllWorkoutTemplates')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.workout-template-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateSelectedWorkoutTemplatesCount();
    });
}

// Load workout templates from API
function loadWorkoutTemplates() {
    console.log('Loading workout templates');
    
    // Show loading indicator
    document.getElementById('workoutTemplatesLoading').style.display = 'block';
    document.getElementById('noWorkoutTemplates').style.display = 'none';
    
    // Clear existing table rows
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    tableBody.innerHTML = '';
    
    // Call API to get workout templates
    CoachPlanAPI.workoutTemplates.getAll()
        .then(response => {
            // Hide loading indicator
            document.getElementById('workoutTemplatesLoading').style.display = 'none';
            
            // Process response data
            const templates = response.results || response;
            if (templates && templates.length > 0) {
                // Populate table with templates
                templates.forEach(template => {
                    const row = createWorkoutTemplateRow(template);
                    tableBody.appendChild(row);
                });
            } else {
                // Show empty state
                document.getElementById('noWorkoutTemplates').style.display = 'block';
            }
        })
        .catch(error => {
            // Hide loading indicator
            document.getElementById('workoutTemplatesLoading').style.display = 'none';
            document.getElementById('noWorkoutTemplates').style.display = 'block';
            
            // Show error message
            console.error('Error loading workout templates:', error);
            showToast('error', `Failed to load workout templates: ${error.message || 'Unknown error'}`);
        });
}

// Create a table row for a workout template
function createWorkoutTemplateRow(template) {
    const row = document.createElement('tr');
    
    // Checkbox cell
    const checkboxCell = document.createElement('td');
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'form-check';
    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input workout-template-checkbox';
    checkbox.type = 'checkbox';
    checkbox.setAttribute('data-id', template.id);
    checkbox.addEventListener('change', updateSelectedWorkoutTemplatesCount);
    checkboxDiv.appendChild(checkbox);
    checkboxCell.appendChild(checkboxDiv);
    row.appendChild(checkboxCell);
    
    // Template name cell
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<strong>${template.name || 'Unnamed Template'}</strong>`;
    row.appendChild(nameCell);
    
    // Category cell
    const categoryCell = document.createElement('td');
    categoryCell.textContent = template.category || '-';
    row.appendChild(categoryCell);
    
    // Difficulty cell
    const difficultyCell = document.createElement('td');
    let difficultyText = '';
    switch (parseInt(template.difficulty) || 3) {
        case 1: difficultyText = 'Beginner'; break;
        case 2: difficultyText = 'Easy'; break;
        case 3: difficultyText = 'Moderate'; break;
        case 4: difficultyText = 'Challenging'; break;
        case 5: difficultyText = 'Advanced'; break;
        default: difficultyText = 'Moderate';
    }
    difficultyCell.innerHTML = difficultyText;
    row.appendChild(difficultyCell);
    
    // Blocks cell
    const blocksCell = document.createElement('td');
    const blocks = template.exercise_blocks?.length || 0;
    blocksCell.innerHTML = `<span class="badge bg-secondary">${blocks}</span>`;
    row.appendChild(blocksCell);
    
    // Exercises cell
    const exercisesCell = document.createElement('td');
    let exerciseCount = 0;
    if (template.exercise_blocks) {
        template.exercise_blocks.forEach(block => {
            exerciseCount += block.exercises?.length || 0;
        });
    }
    exercisesCell.innerHTML = `<span class="badge bg-secondary">${exerciseCount}</span>`;
    row.appendChild(exercisesCell);
    
    // Actions cell
    const actionsCell = document.createElement('td');
    actionsCell.className = 'text-end';
    actionsCell.innerHTML = `
        <button class="btn btn-sm btn-outline-primary me-1 view-workout-template-btn" data-id="${template.id}">
            <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1 edit-workout-template-btn" data-id="${template.id}">
            <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-workout-template-btn" data-id="${template.id}">
            <i class="bi bi-trash"></i>
        </button>
    `;
    
    // Add event listeners to action buttons
    actionsCell.querySelector('.view-workout-template-btn').addEventListener('click', () => viewWorkoutTemplate(template.id));
    actionsCell.querySelector('.edit-workout-template-btn').addEventListener('click', () => editWorkoutTemplate(template.id));
    actionsCell.querySelector('.delete-workout-template-btn').addEventListener('click', () => deleteWorkoutTemplate(template.id));
    
    row.appendChild(actionsCell);
    
    return row;
}

// Helper function to update the count of selected workout templates
function updateSelectedWorkoutTemplatesCount() {
    const checkboxes = document.querySelectorAll('.workout-template-checkbox:checked');
    const counter = document.getElementById('selectedWorkoutTemplatesCount');
    counter.textContent = checkboxes.length.toString();
    
    // Show/hide the counter
    const counterContainer = document.getElementById('selectedWorkoutTemplatesCounter');
    counterContainer.style.display = checkboxes.length > 0 ? 'block' : 'none';
}

// Show workout template editor
function showWorkoutTemplateEditor() {
    // Hide templates list
    document.querySelector('.workout-templates-container').style.display = 'none';
    
    // Show editor
    const editor = document.getElementById('workoutTemplateEditor');
    editor.style.display = 'block';
    
    // Reset form
    document.getElementById('workoutTemplateForm')?.reset();
    
    // Clear any existing exercise blocks
    const blocksContainer = document.getElementById('exerciseBlocksContainer');
    blocksContainer.innerHTML = '';
    
    // Add an empty exercise block to start
    addExerciseBlock();
    
    // Set focus on the name field
    document.getElementById('workoutTemplateName').focus();
}

// Hide workout template editor
function hideWorkoutTemplateEditor() {
    // Show templates list
    document.querySelector('.workout-templates-container').style.display = 'block';
    
    // Hide editor
    const editor = document.getElementById('workoutTemplateEditor');
    editor.style.display = 'none';
}

// Add exercise block to the workout template
function addExerciseBlock(blockData = null) {
    const blocksContainer = document.getElementById('exerciseBlocksContainer');
    const blockId = `block-${Date.now()}`;
    
    // Create block container
    const blockContainer = document.createElement('div');
    blockContainer.className = 'exercise-block border rounded mb-3 p-3';
    blockContainer.id = blockId;
    
    // Set block header and controls
    blockContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex align-items-center">
                <span class="badge bg-primary me-2">${document.querySelectorAll('.exercise-block').length + 1}</span>
                <h6 class="mb-0">Exercise Block</h6>
            </div>
            <div>
                <button type="button" class="btn btn-sm btn-outline-danger remove-block-btn" data-block-id="${blockId}">
                    <i class="bi bi-trash"></i> Remove Block
                </button>
            </div>
        </div>
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label class="form-label">Block Name</label>
                <input type="text" class="form-control block-name" value="${blockData?.name || ''}" 
                       placeholder="e.g., Warm-up, Main Set, Cool Down">
            </div>
            <div class="col-md-6">
                <label class="form-label">Instructions</label>
                <input type="text" class="form-control block-instructions" value="${blockData?.instructions || ''}" 
                       placeholder="e.g., Complete 3 rounds with 60s rest">
            </div>
        </div>
        <h6 class="mb-2">Exercises</h6>
        <div class="exercises-container">
            <!-- Exercises will be added here -->
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-exercise-btn" data-block-id="${blockId}">
            <i class="bi bi-plus-circle me-1"></i> Add Exercise
        </button>
    `;
    
    // Add block to container
    blocksContainer.appendChild(blockContainer);
    
    // Add event listeners
    blockContainer.querySelector('.remove-block-btn').addEventListener('click', function() {
        const blockId = this.getAttribute('data-block-id');
        document.getElementById(blockId).remove();
        
        // Renumber remaining blocks
        const blocks = document.querySelectorAll('.exercise-block');
        blocks.forEach((block, index) => {
            block.querySelector('.badge').textContent = index + 1;
        });
    });
    
    blockContainer.querySelector('.add-exercise-btn').addEventListener('click', function() {
        const blockId = this.getAttribute('data-block-id');
        addExerciseToBlock(blockId);
    });
    
    // If block data provided, add existing exercises
    if (blockData && blockData.exercises && blockData.exercises.length > 0) {
        blockData.exercises.forEach(exercise => {
            addExerciseToBlock(blockId, exercise);
        });
    } else {
        // Add one empty exercise by default
        addExerciseToBlock(blockId);
    }
}

// Add exercise to an exercise block
function addExerciseToBlock(blockId, exerciseData = null) {
    const block = document.getElementById(blockId);
    const exercisesContainer = block.querySelector('.exercises-container');
    const exerciseId = `exercise-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create exercise row
    const exerciseRow = document.createElement('div');
    exerciseRow.className = 'exercise-row border-top pt-3 pb-2 mt-2';
    exerciseRow.id = exerciseId;
    
    exerciseRow.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-center">
                <span class="badge bg-secondary me-2">${exercisesContainer.querySelectorAll('.exercise-row').length + 1}</span>
                <h6 class="mb-0">Exercise</h6>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-exercise-btn" data-exercise-id="${exerciseId}">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="row g-3">
            <div class="col-md-6">
                <label class="form-label">Exercise Name</label>
                <input type="text" class="form-control exercise-name" value="${exerciseData?.name || ''}" required 
                       placeholder="e.g., Push-ups, Squats, Bench Press">
            </div>
            <div class="col-md-6">
                <label class="form-label">Target Muscle Group</label>
                <input type="text" class="form-control exercise-muscle-group" value="${exerciseData?.muscle_group || ''}" 
                       placeholder="e.g., Chest, Legs, Back">
            </div>
            <div class="col-md-4">
                <label class="form-label">Sets</label>
                <input type="number" class="form-control exercise-sets" min="1" value="${exerciseData?.sets || 3}">
            </div>
            <div class="col-md-4">
                <label class="form-label">Reps/Duration</label>
                <input type="text" class="form-control exercise-reps" value="${exerciseData?.reps || '12'}" 
                       placeholder="e.g., 12, 45s, To failure">
            </div>
            <div class="col-md-4">
                <label class="form-label">Rest (seconds)</label>
                <input type="number" class="form-control exercise-rest" min="0" value="${exerciseData?.rest || 60}">
            </div>
            <div class="col-12">
                <label class="form-label">Instructions</label>
                <textarea class="form-control exercise-instructions" rows="2">${exerciseData?.instructions || ''}</textarea>
            </div>
        </div>
    `;
    
    // Add exercise to container
    exercisesContainer.appendChild(exerciseRow);
    
    // Add event listener for remove button
    exerciseRow.querySelector('.remove-exercise-btn').addEventListener('click', function() {
        const exerciseId = this.getAttribute('data-exercise-id');
        document.getElementById(exerciseId).remove();
        
        // Renumber remaining exercises in this block
        const exercises = exercisesContainer.querySelectorAll('.exercise-row');
        exercises.forEach((exercise, index) => {
            exercise.querySelector('.badge').textContent = index + 1;
        });
    });
}

// Get all data from the workout template form
function getWorkoutTemplateData() {
    // Basic template info
    const templateData = {
        name: document.getElementById('workoutTemplateName').value,
        category: document.getElementById('workoutTemplateCategory').value,
        difficulty: document.getElementById('workoutTemplateDifficulty').value,
        duration: document.getElementById('workoutTemplateDuration').value,
        description: document.getElementById('workoutTemplateDescription').value,
        instructions: document.getElementById('workoutTemplateInstructions').value,
        exercise_blocks: []
    };
    
    // Get exercise blocks
    const blocks = document.querySelectorAll('.exercise-block');
    blocks.forEach(block => {
        const blockData = {
            name: block.querySelector('.block-name').value,
            instructions: block.querySelector('.block-instructions').value,
            exercises: []
        };
        
        // Get exercises in this block
        const exercises = block.querySelectorAll('.exercise-row');
        exercises.forEach(exercise => {
            blockData.exercises.push({
                name: exercise.querySelector('.exercise-name').value,
                muscle_group: exercise.querySelector('.exercise-muscle-group').value,
                sets: parseInt(exercise.querySelector('.exercise-sets').value) || 1,
                reps: exercise.querySelector('.exercise-reps').value,
                rest: parseInt(exercise.querySelector('.exercise-rest').value) || 0,
                instructions: exercise.querySelector('.exercise-instructions').value
            });
        });
        
        templateData.exercise_blocks.push(blockData);
    });
    
    return templateData;
}

// Save workout template
function saveWorkoutTemplate(event) {
    if (event) event.preventDefault();
    console.log('Save workout template function called');
    
    // Validate form
    const form = document.getElementById('workoutTemplateForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        console.warn('Form validation failed');
        return;
    }
    
    // Get template data
    const templateData = getWorkoutTemplateData();
    console.log('Template data collected:', templateData);
    const currentTemplateId = document.getElementById('workoutTemplateId')?.value;
    console.log('Current template ID:', currentTemplateId || 'Creating new template');
    
    // Show loading overlay
    showLoadingOverlay('Saving workout template...');
    
    // Get or create plan template for workouts if needed
    console.log('Calling getOrCreatePlanTemplate...');
    
    // Use a properly defined variable to store the template ID for debugging purposes
    let planTemplateId;
    
    getOrCreatePlanTemplate()
        .then(templateId => {
            console.log('Plan template ID received:', templateId);
            planTemplateId = templateId;
            
            if (!templateId) {
                throw new Error('Failed to get or create plan template - received empty ID');
            }
            
            // Set template ID in workout template data
            templateData.template = templateId;
            console.log('Updated template data with plan template ID:', templateData);
            
            // Call API to save template
            let apiCall;
            if (currentTemplateId) {
                console.log('Updating existing workout template:', currentTemplateId);
                apiCall = CoachPlanAPI.workoutTemplates.update(currentTemplateId, templateData);
            } else {
                console.log('Creating new workout template');
                apiCall = CoachPlanAPI.workoutTemplates.create(templateData);
            }
            
            return apiCall;
        })
        .then(response => {
            console.log('API call successful:', response);
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Show success message
            showToast('success', `Workout template ${currentTemplateId ? 'updated' : 'created'} successfully!`);
            
            // Hide editor and refresh templates list
            hideWorkoutTemplateEditor();
            loadWorkoutTemplates();
        })
        .catch(error => {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Show error message
            console.error('Error saving workout template:', error);
            console.error('Plan template ID that was used:', planTemplateId);
            console.error('Template data that was used:', templateData);
            
            // More user-friendly error message
            let errorMessage;
            if (error.message && error.message.includes('Failed to get or create plan template')) {
                errorMessage = `Failed to save template: Could not create the container for your workout template. Please try again or contact support.`;
            } else if (error.status === 400) {
                errorMessage = `Failed to save template: The data provided was invalid. Please check all fields and try again.`;
            } else if (error.status === 401 || error.status === 403) {
                errorMessage = `Failed to save template: You are not authorized to perform this action. Please log in again.`;
            } else {
                errorMessage = `Failed to save workout template: ${error.message || 'Unknown error'}`;
            }
            
            showToast('error', errorMessage);
        });
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', initWorkoutTemplateCore);

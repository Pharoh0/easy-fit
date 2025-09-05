/**
 * Workout Template Management JavaScript
 * Handles the creation, editing, and management of workout templates
 */

// Global variables for tracking exercise blocks and templates
let exerciseBlocks = [];
let exerciseBlockCounter = 0;
let currentWorkoutTemplateId = null;

/**
 * Helper function to get a property value from an object with multiple possible field names
 * @param {object} obj - The object to get the property from
 * @param {Array} propertyNames - Array of possible property names
 * @param {*} defaultValue - Default value if property is not found
 * @returns {*} The property value or default value
 */
function getPropertyValue(obj, propertyNames, defaultValue = '') {
    if (!obj) return defaultValue;
    
    // First try direct property access for each possible name
    for (const name of propertyNames) {
        if (obj[name] !== undefined && obj[name] !== null) {
            return obj[name];
        }
    }
    
    // If that fails, try dot notation for nested properties
    for (const path of propertyNames) {
        if (!path.includes('.')) continue;
        
        const value = path.split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : undefined, obj);
        if (value !== undefined && value !== null) {
            return value;
        }
    }
    
    return defaultValue;
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips and popovers
    initTooltips();
    initPopovers();
    
    // Load workout templates
    loadWorkoutTemplates();
    
    // Event listeners for create buttons
    document.getElementById('createWorkoutTemplateBtn').addEventListener('click', function() {
        showWorkoutTemplateEditor();
    });
    
    document.getElementById('workoutTemplateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveWorkoutTemplate();
    });
    
    // Empty state create button
    const emptyStateBtn = document.getElementById('emptyStateCreateWorkoutTemplate');
    if (emptyStateBtn) {
        emptyStateBtn.addEventListener('click', function() {
            showWorkoutTemplateEditor();
        });
    }
    
    // Add exercise block button
    document.getElementById('addExerciseBlockBtn').addEventListener('click', function() {
        addExerciseBlock();
    });
    
    // Save workout template button
    document.getElementById('saveWorkoutTemplateBtn').addEventListener('click', function() {
        saveWorkoutTemplate();
    });
});

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize Bootstrap popovers
 */
function initPopovers() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

/**
 * Load workout templates from the API and display them in the table
 */
function loadWorkoutTemplates() {
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    const loadingIndicator = document.getElementById('workoutTemplatesLoading');
    const emptyState = document.getElementById('noWorkoutTemplates');
    
    // Show loading state
    if (tableBody) tableBody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Fetch templates from API
    CoachPlanAPI.workoutTemplates.getAll()
        .then(response => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Handle paginated responses from API
            const templates = response.results ? response.results : response;
            
            if (!templates || templates.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            // Render templates in table
            renderWorkoutTemplatesTable(templates);
        })
        .catch(error => {
            console.error('Error loading workout templates:', error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-circle-fill me-2"></i>
                        Failed to load workout templates. Please try again.
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="loadWorkoutTemplates()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                    </button>
                `;
            }
        });
}

/**
 * Render workout templates in the table
 * @param {Array} templates - Array of workout template objects
 */
function renderWorkoutTemplatesTable(templates) {
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    templates.forEach(template => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${template.name}</td>
            <td>${formatWorkoutType(template.workout_type)}</td>
            <td>${template.duration_minutes} min</td>
            <td>${formatIntensity(template.intensity_level)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editWorkoutTemplate(${template.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteWorkoutTemplate(${template.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Format workout type for display
 * @param {string} type - The workout type value
 * @returns {string} Formatted workout type
 */
function formatWorkoutType(type) {
    if (!type) return 'Unknown';
    
    const types = {
        'strength_training': 'Strength Training',
        'cardio': 'Cardiovascular',
        'hiit': 'HIIT',
        'yoga': 'Yoga',
        'pilates': 'Pilates',
        'stretching': 'Stretching',
        'sports': 'Sports Activity',
        'mixed': 'Mixed Training'
    };
    
    return types[type] || type;
}

/**
 * Format intensity level for display
 * @param {string} intensity - The intensity level value
 * @returns {string} Formatted intensity level
 */
function formatIntensity(intensity) {
    if (!intensity) return 'Unknown';
    
    const levels = {
        'low': 'Low',
        'moderate': 'Moderate',
        'high': 'High',
        'very_high': 'Very High'
    };
    
    return levels[intensity] || intensity;
}

/**
 * Show the workout template editor modal
 * @param {number} templateId - Optional template ID to edit
 */
function showWorkoutTemplateEditor(templateId = null) {
    // Reset form
    document.getElementById('workoutTemplateForm').reset();
    document.getElementById('exerciseBlocksContainer').innerHTML = '';
    
    // Reset global variables
    currentWorkoutTemplateId = null;
    exerciseBlocks = [];
    exerciseBlockCounter = 0;
    
    const modalTitle = document.getElementById('workoutTemplateModalLabel');
    
    if (templateId) {
        // Edit existing template
        modalTitle.textContent = 'Edit Workout Template';
        currentWorkoutTemplateId = templateId;
        
        // Load template data
        CoachPlanAPI.workoutTemplates.getById(templateId)
            .then(template => {
                if (!template) {
                    showToast('error', 'Template not found');
                    return;
                }
                
                // Debug: Log the template data structure
                console.log('Workout template data received:', template);
                
                // Helper function to safely set form values
                const setFormValue = (elementId, value, defaultValue = '') => {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.value = (value !== undefined && value !== null) ? value : defaultValue;
                    }
                };
                
                // Helper function to safely set select element values
                const setSelectValue = (elementId, value, defaultValue = '') => {
                    const selectElement = document.getElementById(elementId);
                    if (!selectElement) return;
                    
                    const valueToSet = (value !== undefined && value !== null) ? value : defaultValue;
                    
                    // Check if option exists
                    const optionExists = Array.from(selectElement.options).some(option => option.value === valueToSet);
                    if (optionExists) {
                        selectElement.value = valueToSet;
                    } else if (valueToSet && selectElement.options.length > 0) {
                        // Set to first non-disabled option if value doesn't match any option
                        for (let i = 0; i < selectElement.options.length; i++) {
                            if (!selectElement.options[i].disabled) {
                                selectElement.selectedIndex = i;
                                break;
                            }
                        }
                    }
                };
                
                // Robust helper function to get a property value with multiple possible names
                const getPropertyValue = (obj, possibleNames, defaultValue = '') => {
                    if (!obj) return defaultValue;
                    
                    for (const name of possibleNames) {
                        if (obj[name] !== undefined && obj[name] !== null) {
                            return obj[name];
                        }
                    }
                    return defaultValue;
                };
                
                // Populate form fields with robust property getters to handle API variations
                setFormValue('workoutTemplateName', getPropertyValue(template, ['name', 'workout_name', 'title']));
                setSelectValue('workoutType', getPropertyValue(template, ['workout_type', 'type', 'exercise_type']));
                setFormValue('workoutDuration', getPropertyValue(template, ['duration_minutes', 'duration', 'length_minutes'], 0));
                setSelectValue('intensityLevel', getPropertyValue(template, ['intensity_level', 'intensity', 'difficulty']));
                setFormValue('workoutDescription', getPropertyValue(template, ['instructions', 'description', 'notes', 'summary']));
                setFormValue('workoutEquipment', getPropertyValue(template, ['equipment_needed', 'equipment', 'required_equipment']));
                
                // Clear existing exercise blocks first
                document.getElementById('exerciseBlocksContainer').innerHTML = '';
                exerciseBlocks = [];
                exerciseBlockCounter = 0;
                
                // Load exercise blocks if available
                if (template.exercise_templates && template.exercise_templates.length > 0) {
                    console.log('Loading exercise templates:', template.exercise_templates);
                    
                    // Group exercises by order or block_id to reconstruct blocks
                    const exercisesByBlock = {};
                    
                    template.exercise_templates.forEach(exercise => {
                        // Look for block_id in multiple possible locations
                        const blockId = getPropertyValue(exercise, ['block_id', 'block', 'exercise_block_id', 'group_id']) || 1;
                        
                        if (!exercisesByBlock[blockId]) {
                            exercisesByBlock[blockId] = [];
                        }
                        exercisesByBlock[blockId].push(exercise);
                    });
                    
                    console.log('Grouped exercises by block:', exercisesByBlock);
                    
                    // Create exercise blocks
                    Object.keys(exercisesByBlock).forEach(blockId => {
                        const blockExercises = exercisesByBlock[blockId];
                        
                        // Get block name and type using the helper function to handle multiple possible field names
                        const blockName = getPropertyValue(blockExercises[0], ['block_name', 'name', 'group_name']) || `Block ${blockId}`;
                        const blockType = getPropertyValue(blockExercises[0], ['block_type', 'type', 'group_type']) || 'standard';
                        
                        addExerciseBlock(blockName, blockType, blockExercises);
                    });
                } else {
                    // Add an empty exercise block
                    addExerciseBlock();
                }
            })
            .catch(error => {
                console.error('Error loading template:', error);
                const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
                showToast('error', `Failed to load template: ${errorMessage}`);
            });
    } else {
        // Create new template
        modalTitle.textContent = 'Create Workout Template';
        
        // Add an empty exercise block
        addExerciseBlock();
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('workoutTemplateModal'));
    modal.show();
}

/**
 * Add an exercise block to the form
 * @param {string} blockName - Optional block name
 * @param {string} blockType - Optional block type
 * @param {Array} exercises - Optional array of exercises for the block
 */
function addExerciseBlock(blockName = '', blockType = 'standard', exercises = []) {
    exerciseBlockCounter++;
    const blockId = exerciseBlockCounter;
    
    const block = document.createElement('div');
    block.className = 'exercise-block mb-4 p-3 border rounded';
    block.dataset.blockId = blockId;
    
    block.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex align-items-center">
                <h6 class="mb-0">Exercise Block</h6>
                <input type="text" class="form-control form-control-sm ms-2" placeholder="Block Name" 
                       value="${blockName}" style="width: 200px;" data-field="block-name">
            </div>
            <div>
                <select class="form-select form-select-sm" style="width: 150px;" data-field="block-type">
                    <option value="standard" ${blockType === 'standard' ? 'selected' : ''}>Standard</option>
                    <option value="superset" ${blockType === 'superset' ? 'selected' : ''}>Superset</option>
                    <option value="circuit" ${blockType === 'circuit' ? 'selected' : ''}>Circuit</option>
                    <option value="pyramid" ${blockType === 'pyramid' ? 'selected' : ''}>Pyramid</option>
                </select>
                <button type="button" class="btn btn-sm btn-outline-danger ms-2" onclick="removeExerciseBlock(${blockId})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="exercises-container" data-block-id="${blockId}">
            <!-- Exercises will be added here -->
        </div>
        
        <button type="button" class="btn btn-sm btn-outline-secondary mt-2" onclick="addExercise(${blockId})">
            <i class="bi bi-plus-circle me-1"></i> Add Exercise
        </button>
    `;
    
    document.getElementById('exerciseBlocksContainer').appendChild(block);
    
    // Add exercises if provided
    if (exercises && exercises.length > 0) {
        exercises.forEach(exercise => {
            addExercise(blockId, exercise);
        });
    } else {
        // Add an empty exercise
        addExercise(blockId);
    }
    
    // Add block to tracking array
    exerciseBlocks.push({
        id: blockId,
        name: blockName,
        type: blockType,
        exercises: exercises.length > 0 ? exercises : []
    });
}

/**
 * Remove an exercise block from the form
 * @param {number} blockId - ID of the block to remove
 */
function removeExerciseBlock(blockId) {
    const blockElement = document.querySelector(`.exercise-block[data-block-id="${blockId}"]`);
    if (blockElement) {
        blockElement.remove();
        
        // Remove from tracking array
        exerciseBlocks = exerciseBlocks.filter(block => block.id !== blockId);
    }
}

/**
 * Add an exercise to a block
 * @param {number} blockId - ID of the block to add exercise to
 * @param {object} exerciseData - Optional exercise data for editing
 */
function addExercise(blockId, exerciseData = null) {
    const container = document.querySelector(`.exercises-container[data-block-id="${blockId}"]`);
    if (!container) return;
    
    // Generate a unique ID for new exercises or use existing ID
    const exerciseId = getPropertyValue(exerciseData, ['id', 'exercise_id']) || Date.now(); 
    
    console.log('Adding exercise with data:', exerciseData);
    
    // Use the global helper function for property retrieval
    // Handle different API response formats for exercises with comprehensive property name options
    const exerciseName = getPropertyValue(exerciseData, [
        'exercise_name', 'name', 'exercise', 'title', 'movement_name'
    ], '');
    
    const exerciseCategory = getPropertyValue(exerciseData, [
        'exercise_category', 'category', 'muscle_group', 'target_muscle', 'body_part', 'type'
    ], 'chest');
    
    const sets = getPropertyValue(exerciseData, ['sets', 'set_count', 'num_sets'], 3);
    const reps = getPropertyValue(exerciseData, ['reps', 'repetitions', 'rep_range', 'rep_count'], '8-12');
    const restSeconds = getPropertyValue(exerciseData, ['rest_seconds', 'rest', 'rest_time', 'recovery_seconds'], 60);
    const instructions = getPropertyValue(exerciseData, ['instructions', 'notes', 'description', 'technique', 'form_notes'], '');
    
    const exercise = document.createElement('div');
    exercise.className = 'exercise-item p-2 border rounded mb-2';
    exercise.dataset.exerciseId = exerciseId;
    
    exercise.innerHTML = `
        <div class="row g-2">
            <div class="col-md-3">
                <label class="form-label form-label-sm">Exercise Name</label>
                <input type="text" class="form-control form-control-sm" placeholder="e.g. Bench Press" 
                       value="${exerciseName}" data-field="exercise-name" required>
            </div>
            <div class="col-md-3">
                <label class="form-label form-label-sm">Category</label>
                <select class="form-select form-select-sm" data-field="exercise-category">
                    <option value="chest" ${exerciseCategory === 'chest' ? 'selected' : ''}>Chest</option>
                    <option value="back" ${exerciseCategory === 'back' ? 'selected' : ''}>Back</option>
                    <option value="shoulders" ${exerciseCategory === 'shoulders' ? 'selected' : ''}>Shoulders</option>
                    <option value="arms" ${exerciseCategory === 'arms' ? 'selected' : ''}>Arms</option>
                    <option value="legs" ${exerciseCategory === 'legs' ? 'selected' : ''}>Legs</option>
                    <option value="core" ${exerciseCategory === 'core' ? 'selected' : ''}>Core</option>
                    <option value="cardio" ${exerciseCategory === 'cardio' ? 'selected' : ''}>Cardio</option>
                    <option value="full_body" ${exerciseCategory === 'full_body' ? 'selected' : ''}>Full Body</option>
                    <option value="flexibility" ${exerciseCategory === 'flexibility' ? 'selected' : ''}>Flexibility</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Sets</label>
                <input type="number" class="form-control form-control-sm" min="1" value="${sets}" data-field="sets">
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Reps</label>
                <input type="text" class="form-control form-control-sm" placeholder="e.g. 8-12" 
                       value="${reps}" data-field="reps">
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Rest (sec)</label>
                <input type="number" class="form-control form-control-sm" min="0" value="${restSeconds}" data-field="rest">
            </div>
            <div class="col-12">
                <label class="form-label form-label-sm">Instructions</label>
                <textarea class="form-control form-control-sm" rows="2" data-field="instructions">${instructions}</textarea>
            </div>
        </div>
        <div class="d-flex justify-content-end mt-2">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeExercise(${blockId}, ${exerciseId})">
                <i class="bi bi-trash"></i> Remove
            </button>
        </div>
    `;
    
    container.appendChild(exercise);
    
    // Update block in tracking array
    const blockIndex = exerciseBlocks.findIndex(block => block.id === blockId);
    if (blockIndex !== -1) {
        if (!exerciseData) {
            exerciseBlocks[blockIndex].exercises.push({
                id: exerciseId,
                exercise_name: '',
                exercise_category: 'chest',
                sets: 3,
                reps: '8-12',
                rest_seconds: 60,
                instructions: '',
                order: exerciseBlocks[blockIndex].exercises.length + 1
            });
        } else {
            // Store consistent property names in tracking array
            exerciseBlocks[blockIndex].exercises.push({
                id: exerciseId,
                exercise_name: exerciseName,
                exercise_category: exerciseCategory,
                sets: sets,
                reps: reps,
                rest_seconds: restSeconds,
                instructions: instructions,
                order: exerciseBlocks[blockIndex].exercises.length + 1
            });
        }
    }
}

/**
 * Remove an exercise from a block
 * @param {number} blockId - ID of the block containing the exercise
 * @param {number} exerciseId - ID of the exercise to remove
 */
function removeExercise(blockId, exerciseId) {
    const exerciseElement = document.querySelector(`.exercise-item[data-exercise-id="${exerciseId}"]`);
    if (exerciseElement) {
        exerciseElement.remove();
        
        // Update block in tracking array
        const blockIndex = exerciseBlocks.findIndex(block => block.id === blockId);
        if (blockIndex !== -1) {
            exerciseBlocks[blockIndex].exercises = exerciseBlocks[blockIndex].exercises.filter(
                exercise => exercise.id !== exerciseId
            );
        }
    }
}

/**
 * Edit a workout template
 * @param {number} templateId - ID of the template to edit
 */
function editWorkoutTemplate(templateId) {
    showWorkoutTemplateEditor(templateId);
}

/**
 * Delete a workout template
 * @param {number} templateId - ID of the template to delete
 */
function deleteWorkoutTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this workout template? This action cannot be undone.')) {
        return;
    }
    
    CoachPlanAPI.workoutTemplates.delete(templateId)
        .then(() => {
            showToast('success', 'Workout template deleted successfully');
            loadWorkoutTemplates();
        })
        .catch(error => {
            console.error('Error deleting template:', error);
            showToast('error', `Failed to delete template: ${error.message || 'Unknown error'}`);
        });
}

/**
 * Save the workout template
 */
function saveWorkoutTemplate() {
    // Get all form values
    const name = document.getElementById('workoutTemplateName').value.trim();
    const workoutType = document.getElementById('workoutType').value;
    const duration = document.getElementById('workoutDuration').value;
    const intensityLevel = document.getElementById('intensityLevel').value;
    const instructions = document.getElementById('workoutDescription').value.trim();
    const equipment = document.getElementById('workoutEquipment').value.trim();
    
    console.log('Saving workout template with values:', { 
        name, workoutType, duration, intensityLevel, instructions, equipment 
    });

    // Validate form
    if (!name) {
        showToast('error', 'Template name is required');
        return;
    }
    
    if (!workoutType) {
        showToast('error', 'Workout type is required');
        return;
    }
    
    if (!duration) {
        showToast('error', 'Duration is required');
        return;
    }
    
    if (!intensityLevel) {
        showToast('error', 'Intensity level is required');
        return;
    }
    
    // Collect exercise blocks data
    const blocks = [];
    const blockElements = document.querySelectorAll('.exercise-block');
    
    blockElements.forEach((blockElement, blockIndex) => {
        const blockId = parseInt(blockElement.dataset.blockId);
        const blockName = blockElement.querySelector('[data-field="block-name"]').value.trim();
        const blockType = blockElement.querySelector('[data-field="block-type"]').value;
        
        // Add exercises to the collection with validation
        const exercises = [];
        const exerciseElements = blockElement.querySelectorAll('.exercise-item');
        let exerciseError = false;
        
        exerciseElements.forEach((exerciseElement, exerciseIndex) => {
            if (exerciseElement) {
                const nameField = exerciseElement.querySelector('[data-field="exercise-name"]');
                const name = nameField.value.trim();
                
                // Validate exercise name
                if (!name) {
                    nameField.classList.add('is-invalid');
                    exerciseError = true;
                } else {
                    nameField.classList.remove('is-invalid');
                    
                    // Only add valid exercises
                    exercises.push({
                        id: parseInt(exerciseElement.dataset.exerciseId) || undefined,
                        exercise_name: name,
                        exercise_category: exerciseElement.querySelector('[data-field="exercise-category"]').value,
                        sets: parseInt(exerciseElement.querySelector('[data-field="sets"]').value) || 1,
                        reps: exerciseElement.querySelector('[data-field="reps"]').value,
                        rest_seconds: parseInt(exerciseElement.querySelector('[data-field="rest"]').value) || 60,
                        instructions: exerciseElement.querySelector('[data-field="instructions"]').value,
                        order: exerciseIndex + 1,
                        block_id: blockId,
                        block_name: blockName || `Block ${blockIndex + 1}`,
                        block_type: blockType
                    });
                }
            }
        });
        
        // Return early if exercise validation failed
        if (exerciseError) {
            showToast('error', 'All exercise names must be filled');
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
            return;
        }
        
        if (exercises.length > 0) {
            blocks.push({
                id: blockId,
                name: blockName || `Block ${blockIndex + 1}`,
                type: blockType,
                exercises: exercises
            });
        }
    });
    
    if (blocks.length === 0) {
        showToast('error', 'At least one exercise block with exercises is required');
        return;
    }
    
    // Prepare template data with unified field naming for API compatibility
    const templateData = {
        name: name,
        workout_type: workoutType,
        duration_minutes: parseInt(duration) || 0,
        intensity_level: intensityLevel,
        instructions: instructions,
        equipment_needed: equipment,
        // Format exercise templates in the structure expected by the backend
        exercise_templates: [].concat(...blocks.map(block => 
            block.exercises.map((ex, index) => ({
                // Only send existing backend ID, not temporary frontend IDs
                id: (ex.id && ex.id < 1000000) ? ex.id : undefined,
                exercise_name: ex.exercise_name,
                exercise_category: ex.exercise_category,
                sets: parseInt(ex.sets) || 1,
                reps: ex.reps || '8-12',
                rest_seconds: parseInt(ex.rest_seconds) || 60,
                instructions: ex.instructions || '',
                order: index + 1,
                block_id: block.id,
                block_name: block.name || `Block ${block.id}`,
                block_type: block.type || 'standard'
            }))
        ))
    };

    // Create a template first if this is a new workout template
    const saveBtn = document.getElementById('saveWorkoutTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    if (currentWorkoutTemplateId) {
        // Update existing template
        CoachPlanAPI.workoutTemplates.update(currentWorkoutTemplateId, templateData)
            .then(response => {
                showToast('success', 'Workout template updated successfully');
                
                // Hide modal and reload templates
                bootstrap.Modal.getInstance(document.getElementById('workoutTemplateModal')).hide();
                loadWorkoutTemplates();
                
                // Reset button
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error updating workout template:', error);
                const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
                showToast('error', `Failed to update template: ${errorMessage}`);
                
                // Reset button
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            });
    } else {
        // Get coach profile ID and create plan template
        CoachPlanAPI.getCurrentCoachProfile().then(coachId => {
            if (!coachId) {
                throw new Error('Could not determine coach profile ID. Please try again later.');
            }
            
            // Create plan template with coach ID
            return CoachPlanAPI.planTemplates.create({
                name: name,
                description: document.getElementById('workoutDescription').value,
                template_type: 'workout',
                is_public: false,
                coach: coachId
            });
        })
        .then(planTemplate => {
            // Add template ID to workout template data
            templateData.template = planTemplate.id;
            
            // Create workout template
            return CoachPlanAPI.workoutTemplates.create(templateData);
        })
        .then(response => {
            showToast('success', 'Workout template created successfully');
            
            // Hide modal and reload templates
            bootstrap.Modal.getInstance(document.getElementById('workoutTemplateModal')).hide();
            loadWorkoutTemplates();
            
            // Reset button
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error creating workout template:', error);
            const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
            showToast('error', `Failed to create template: ${errorMessage}`);
            
            // Reset button
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        });
    }
}

/**
 * Show a toast notification
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} message - The message to display
 */
function showToast(type, message) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center border-0 ${type === 'error' ? 'bg-danger' : 'bg-success'} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

/**
 * Create or return existing toast container
 * @returns {HTMLElement} Toast container element
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

/**
 * Get current authenticated user ID from the JWT token
 * @returns {number} User ID or null if not available
 */
function getCurrentUserId() {
    try {
        // Get the token from local storage
        const token = localStorage.getItem('access_token');
        if (!token) return null;
        
        // Decode the token (JWT is base64 encoded in 3 parts)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) return null;
        
        // The middle part contains the payload
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // Return the user_id from the payload
        return payload.user_id || null;
    } catch (error) {
        console.error('Error getting user ID from token:', error);
        return null;
    }
}

/**
 * EazyFit Coach Plan Creation JavaScript
 * Handles all the functionality for the coach plan creation interface
 */

// Global variables
let currentPlanId = null;
let workoutTemplates = [];
let mealTemplates = [];
let planTemplates = [];
let exerciseTemplates = [];
let currentTemplates = {
    workouts: [],
    meals: []
};

// CoachPlanAPI is imported from static/js/api/coach_plan_api.js

// Utility functions

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Load workout templates for the current plan
 * Fetches all workout templates, renders them in the table and attaches event listeners
 */
function loadWorkoutTemplates() {
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    const loadingIndicator = document.getElementById('workoutTemplatesLoading');
    const emptyState = document.getElementById('noWorkoutTemplates');
    
    // Show loading state
    if (tableBody) tableBody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Get plan ID from session storage
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    
    // If no current plan ID, go back to basics step
    if (!currentPlanId) {
        showToast('error', 'Please create a plan first');
        setTimeout(() => {
            document.getElementById('plan-basics-tab').click();
        }, 1000);
        return;
    }
    
    // Fetch templates from API
    CoachPlanAPI.workoutTemplates.getAll()
        .then(templates => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Filter templates if needed (e.g., by coach ID or other criteria)
            // This could be implemented later if needed
            
            if (!templates || templates.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            // Save to session storage for plan creation workflow
            sessionStorage.setItem('workoutTemplates', JSON.stringify(templates));
            
            // Render templates in table
            renderWorkoutTemplatesTable(templates);
            
            // Load saved selected templates if they exist
            const selectedTemplates = JSON.parse(sessionStorage.getItem('selectedWorkoutTemplates') || '[]');
            if (selectedTemplates.length > 0) {
                // Mark checkboxes for selected templates
                selectedTemplates.forEach(templateId => {
                    const checkbox = document.querySelector(`#workoutTemplatesTableBody input[data-template-id="${templateId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
                
                // Update selected count display
                updateSelectedWorkoutTemplatesCount();
                
                // Mark step as complete
                updateStepStatus('workout-templates', 'complete');
            }
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

// UI Functions
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

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

function updateWorkoutDaysCalculation() {
    const workoutDays = parseInt(document.getElementById('workoutDaysPerWeek').value) || 0;
    const restDays = 7 - workoutDays;
    document.getElementById('restDaysPerWeek').value = restDays;
}

// Template handling
function loadTemplates() {
    Promise.all([
        CoachPlanAPI.workoutTemplates.getAll().then(data => {
            workoutTemplates = data;
            // Store in session storage for plan creation workflow
            sessionStorage.setItem('workoutTemplates', JSON.stringify(data));
            // Update UI to reflect available templates
            updateWorkoutTemplatesUI(data);
        }),
        CoachPlanAPI.mealTemplates.getAll().then(data => {
            mealTemplates = data;
            // Store in session storage for plan creation workflow
            sessionStorage.setItem('mealTemplates', JSON.stringify(data));
            // Update UI to reflect available templates
            updateMealTemplatesUI(data);
        }),
        CoachPlanAPI.planTemplates.getAll().then(data => {
            planTemplates = data;
            // Only store in session storage, no UI rendering needed
            sessionStorage.setItem('planTemplates', JSON.stringify(data));
        }),
        CoachPlanAPI.exerciseTemplates.getAll().then(data => {
            exerciseTemplates = data;
            // Only store in session storage, no UI rendering needed
            sessionStorage.setItem('exerciseTemplates', JSON.stringify(data));
        })
    ]).catch(error => {
        console.error('Error loading templates:', error);
        showToast('error', 'Failed to load templates. Please refresh the page and try again.');
    });
}

/**
 * Update the workout templates UI to show existing templates instead of embedded template creation
 * @param {Array} templates - The workout templates to display
 */
function updateWorkoutTemplatesUI(templates) {
    const container = document.getElementById('workoutTemplates');
    if (!container) return;
    
    const templatesContainer = container.querySelector('.template-items') || container;
    
    // Clear existing content
    templatesContainer.innerHTML = '';
    
    // Handle paginated responses from API
    if (templates && templates.results) {
        templates = templates.results;
    }
    
    // Check if templates is an array and has elements
    if (!Array.isArray(templates)) {
        templatesContainer.innerHTML = `<div class="text-center text-muted py-3">Error loading workout templates. Please refresh and try again.</div>`;
        return;
    }
    
    if (templates.length === 0) {
        templatesContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <p>No workout templates found.</p>
                <a href="/plan-management/coach/workout-templates/" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-circle me-1"></i>Create Workout Templates
                </a>
            </div>
        `;
        return;
    }
    
    // Add template selection UI
    templates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item template-selectable';
        templateItem.dataset.templateId = template.id;
        templateItem.dataset.templateType = 'workout';
        
        // Count blocks and exercises
        let blockCount = 0;
        let exerciseCount = 0;
        
        if (template.structure && template.structure.blocks) {
            blockCount = template.structure.blocks.length;
            template.structure.blocks.forEach(block => {
                if (block.exercises) {
                    exerciseCount += block.exercises.length;
                }
            });
        }
        
        templateItem.innerHTML = `
            <h6><i class="bi bi-lightning-charge me-2"></i>${template.name}</h6>
            <p class="small text-muted mb-1">${template.description ? template.description.substring(0, 50) + (template.description.length > 50 ? '...' : '') : 'No description'}</p>
            <div class="d-flex justify-content-between align-items-center">
                <div class="difficulty-stars small">
                    ${renderDifficultyStars(template.difficulty || 3)}
                </div>
                <div class="small text-muted">
                    ${blockCount} blocks, ${exerciseCount} exercises
                </div>
            </div>
        `;
        
        // Add click event to select/deselect template
        templateItem.addEventListener('click', () => {
            templateItem.classList.toggle('selected');
            updateSelectedWorkoutTemplatesCount();
        });
        
        templatesContainer.appendChild(templateItem);
    });
    
    // Add link to template management page
    const manageTemplatesLink = document.createElement('div');
    manageTemplatesLink.className = 'template-item create-new';
    manageTemplatesLink.innerHTML = `
        <h6 class="text-primary"><i class="bi bi-gear-fill me-2"></i>Manage Workout Templates</h6>
        <p class="small text-muted mb-0">Create, edit, and delete workout templates</p>
    `;
    
    manageTemplatesLink.addEventListener('click', () => {
        window.location.href = '/plan-management/coach/workout-templates/';
    });
    
    templatesContainer.appendChild(manageTemplatesLink);
}

/**
 * Update the meal templates UI to show existing templates instead of embedded template creation
 * @param {Array} templates - The meal templates to display
 */
function updateMealTemplatesUI(templates) {
    const container = document.getElementById('mealTemplates');
    if (!container) return;
    
    const templatesContainer = container.querySelector('.template-items') || container;
    
    // Clear existing content
    templatesContainer.innerHTML = '';
    
    // Handle paginated responses from API
    if (templates && templates.results) {
        templates = templates.results;
    }
    
    // Check if templates is an array and has elements
    if (!Array.isArray(templates)) {
        templatesContainer.innerHTML = `<div class="text-center text-muted py-3">Error loading meal templates. Please refresh and try again.</div>`;
        return;
    }
    
    if (templates.length === 0) {
        templatesContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <p>No meal templates found.</p>
                <a href="/plan-management/coach/meal-templates/" class="btn btn-primary btn-sm">
                    <i class="bi bi-plus-circle me-1"></i>Create Meal Templates
                </a>
            </div>
        `;
        return;
    }
    
    // Add template selection UI
    templates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item template-selectable';
        templateItem.dataset.templateId = template.id;
        templateItem.dataset.templateType = 'meal';
        
        // Count ingredients if available
        let ingredientCount = 0;
        if (template.structure && template.structure.ingredients) {
            ingredientCount = template.structure.ingredients.length;
        }
        
        templateItem.innerHTML = `
            <h6><i class="bi bi-egg-fried me-2"></i>${template.name}</h6>
            <p class="small text-muted mb-1">${template.description ? template.description.substring(0, 50) + (template.description.length > 50 ? '...' : '') : 'No description'}</p>
            <div class="d-flex justify-content-between align-items-center">
                <div class="small text-muted">
                    ${template.meal_type ? capitalizeFirst(template.meal_type.replace('_', ' ')) : 'General'}
                </div>
                <div class="small text-muted">
                    ${ingredientCount} ingredients
                </div>
            </div>
        `;
        
        // Add click event to select/deselect template
        templateItem.addEventListener('click', () => {
            templateItem.classList.toggle('selected');
            updateSelectedMealTemplatesCount();
        });
        
        templatesContainer.appendChild(templateItem);
    });
    
    // Add link to template management page
    const manageTemplatesLink = document.createElement('div');
    manageTemplatesLink.className = 'template-item create-new';
    manageTemplatesLink.innerHTML = `
        <h6 class="text-primary"><i class="bi bi-gear-fill me-2"></i>Manage Meal Templates</h6>
        <p class="small text-muted mb-0">Create, edit, and delete meal templates</p>
    `;
    
    manageTemplatesLink.addEventListener('click', () => {
        window.location.href = '/plan-management/coach/meal-templates/';
    });
    
    templatesContainer.appendChild(manageTemplatesLink);
}

// Function removed - replaced by updateWorkoutTemplatesUI and updateMealTemplatesUI
// Template rendering now uses a different approach with links to dedicated management pages

// Function removed - template preview functionality now handled differently in the updated UI

/**
 * Redirect to the appropriate template management page
 * @param {string} type - The type of template (workout, meal, plan)
 */
function navigateToTemplateManagement(type) {
    let url = '/plan-management/coach/';
    
    switch (type) {
        case 'workout':
            url += 'workout-templates/';
            break;
        case 'meal':
            url += 'meal-templates/';
            break;
        default:
            url += 'plan-management/';
    }
    
    // Save current plan state before navigating
    savePlanStateToSession();
    
    // Navigate to template management page
    window.location.href = url;
}

/**
 * Save current plan state to session storage for returning after template management
 */
function savePlanStateToSession() {
    // Save any unsaved form data or selection state
    // Will be used when returning from template management page
    const formData = {
        name: document.getElementById('planName')?.value,
        description: document.getElementById('planDescription')?.value,
        plan_type: document.querySelector('input[name="planType"]:checked')?.value,
        price: document.getElementById('planPrice')?.value,
        duration: document.getElementById('planDuration')?.value,
        workout_days_per_week: document.getElementById('workoutDaysPerWeek')?.value
    };
    
    sessionStorage.setItem('planCreationFormData', JSON.stringify(formData));
    
    // Also save selected template IDs
    const selectedWorkoutTemplates = [];
    document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="workout"]').forEach(item => {
        selectedWorkoutTemplates.push(item.dataset.templateId);
    });
    sessionStorage.setItem('selectedWorkoutTemplates', JSON.stringify(selectedWorkoutTemplates));
    
    const selectedMealTemplates = [];
    document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="meal"]').forEach(item => {
        selectedMealTemplates.push(item.dataset.templateId);
    });
    sessionStorage.setItem('selectedMealTemplates', JSON.stringify(selectedMealTemplates));
}

/**
 * Restore saved plan state from session storage when returning from template management
 */
function restorePlanStateFromSession() {
    // Restore any saved form data
    const formData = JSON.parse(sessionStorage.getItem('planCreationFormData') || '{}');
    
    if (formData.name) document.getElementById('planName').value = formData.name;
    if (formData.description) document.getElementById('planDescription').value = formData.description;
    if (formData.plan_type) {
        const radioButton = document.querySelector(`input[name="planType"][value="${formData.plan_type}"]`);
        if (radioButton) radioButton.checked = true;
    }
    if (formData.price) document.getElementById('planPrice').value = formData.price;
    if (formData.duration) document.getElementById('planDuration').value = formData.duration;
    if (formData.workout_days_per_week) document.getElementById('workoutDaysPerWeek').value = formData.workout_days_per_week;
    
    // Update calculated fields
    updateWorkoutDaysCalculation();
}

// Function removed - template creation now handled in dedicated template management pages

// Function removed - meal template creation now handled in dedicated template management pages

// Function removed - plan template creation now handled in dedicated template management pages

// Helper functions
function capitalizeFirst(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Update the count of selected workout templates in the UI
 */
function updateSelectedWorkoutTemplatesCount() {
    const selectedCount = document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="workout"]').length;
    const countDisplay = document.getElementById('selectedWorkoutTemplatesCount');
    
    if (countDisplay) {
        countDisplay.textContent = selectedCount;
        countDisplay.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    
    // Update the next button status
    updateTemplatesNextButtonStatus();
}

/**
 * Update the count of selected meal templates in the UI
 */
function updateSelectedMealTemplatesCount() {
    const selectedCount = document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="meal"]').length;
    const countDisplay = document.getElementById('selectedMealTemplatesCount');
    
    if (countDisplay) {
        countDisplay.textContent = selectedCount;
        countDisplay.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }
    
    // Update the next button status
    updateTemplatesNextButtonStatus();
}

/**
 * Enable/disable the next button based on template selections
 */
function updateTemplatesNextButtonStatus() {
    const workoutTemplatesSelected = document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="workout"]').length > 0;
    const mealTemplatesSelected = document.querySelectorAll('.template-item.template-selectable.selected[data-template-type="meal"]').length > 0;
    
    const nextButton = document.querySelector('#templates-step .next-step-button');
    
    if (nextButton) {
        nextButton.disabled = !(workoutTemplatesSelected && mealTemplatesSelected);
    }
}

// Functions removed - rendering template components now handled in dedicated template management pages

// Workout Templates Functions
let currentWorkoutTemplate = null;
let currentWorkoutTemplateId = null;
let exerciseBlocks = [];

function loadWorkoutTemplates() {
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    tableBody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;
    
    // Use the API service to fetch workout templates
    CoachPlanAPI.workoutTemplates.getAll()
        .then(templates => {
            workoutTemplates = templates;
            renderWorkoutTemplatesTable(templates);
        })
        .catch(error => {
            console.error('Error loading workout templates:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Failed to load workout templates
                        </div>
                    </td>
                </tr>
            `;
        });
}

function renderWorkoutTemplatesTable(templates) {
    const tableBody = document.getElementById('workoutTemplatesTableBody');
    
    // Handle paginated responses from API
    if (templates && templates.results) {
        console.log('Received paginated response for workout templates:', templates);
        templates = templates.results;
    }
    
    // Check if templates is a valid array
    if (!Array.isArray(templates)) {
        console.error('Workout templates is not an array:', templates);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="text-muted mb-0">Error loading workout templates. Please refresh and try again.</p>
                    <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadWorkoutTemplates()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    if (templates.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="text-muted mb-0">No workout templates found. Create your first workout template!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    templates.forEach(template => {
        // Count blocks and exercises
        let blockCount = 0;
        let exerciseCount = 0;
        
        if (template.structure && template.structure.blocks) {
            blockCount = template.structure.blocks.length;
            template.structure.blocks.forEach(block => {
                if (block.exercises) {
                    exerciseCount += block.exercises.length;
                }
            });
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input template-checkbox" type="checkbox" data-template-id="${template.id}">
                </div>
            </td>
            <td>${template.name}</td>
            <td>${template.category || '-'}</td>
            <td>
                <div class="difficulty-stars">
                    ${renderDifficultyStars(template.difficulty || 3)}
                </div>
            </td>
            <td>${blockCount}</td>
            <td>${exerciseCount}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary view-template-btn" data-id="${template.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary edit-template-btn" data-id="${template.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-template-btn" data-id="${template.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Add event listeners to the buttons
        row.querySelector('.view-template-btn').addEventListener('click', () => {
            viewWorkoutTemplate(template.id);
        });
        
        row.querySelector('.edit-template-btn').addEventListener('click', () => {
            editWorkoutTemplate(template.id);
        });
        
        row.querySelector('.delete-template-btn').addEventListener('click', () => {
            deleteWorkoutTemplate(template.id);
        });
        
        // Add event listener for template checkbox selection
        const checkbox = row.querySelector('.template-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateSelectedWorkoutTemplatesCount();
            });
        }
        
        tableBody.appendChild(row);
    });
    
    // Update the selected templates count
    updateSelectedWorkoutTemplatesCount();
}

function renderDifficultyStars(difficulty) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= difficulty) {
            stars += '<i class="bi bi-star-fill text-warning"></i>';
        } else {
            stars += '<i class="bi bi-star text-muted"></i>';
        }
    }
    return stars;
}

function showWorkoutTemplateEditor(templateId = null) {
    // Hide template list and show editor
    document.getElementById('workoutTemplateEditor').style.display = 'block';
    document.querySelector('.workout-templates-container').style.display = 'none';
    
    // Clear previous form data
    document.getElementById('workoutTemplateName').value = '';
    document.getElementById('workoutTemplateCategory').value = '';
    document.getElementById('workoutTemplateDifficulty').value = '3';
    document.getElementById('workoutTemplateDuration').value = '45';
    document.getElementById('workoutTemplateDescription').value = '';
    document.getElementById('workoutTemplateInstructions').value = '';
    document.getElementById('exerciseBlocksContainer').innerHTML = '';
    
    currentWorkoutTemplateId = null;
    exerciseBlocks = [];
    
    // If editing an existing template, load its data
    if (templateId) {
        currentWorkoutTemplateId = templateId;
        
        // Show loading state
        document.getElementById('exerciseBlocksContainer').innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading template...</span>
                </div>
            </div>
        `;
        
        // Fetch the template data
        CoachPlanAPI.workoutTemplates.getById(templateId)
            .then(template => {
                currentWorkoutTemplate = template;
                
                // Fill the form with template data
                document.getElementById('workoutTemplateName').value = template.name;
                document.getElementById('workoutTemplateCategory').value = template.category || '';
                document.getElementById('workoutTemplateDifficulty').value = template.difficulty || '3';
                document.getElementById('workoutTemplateDuration').value = template.duration_minutes || '45';
                document.getElementById('workoutTemplateDescription').value = template.description || '';
                document.getElementById('workoutTemplateInstructions').value = template.instructions || '';
                
                // Load exercise blocks
                document.getElementById('exerciseBlocksContainer').innerHTML = '';
                if (template.structure && template.structure.blocks) {
                    exerciseBlocks = template.structure.blocks;
                    exerciseBlocks.forEach((block, index) => {
                        addExerciseBlockToUI(block, index);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading workout template:', error);
                showToast('error', 'Failed to load workout template');
                hideWorkoutTemplateEditor();
            });
    } else {
        // Add an empty exercise block to start with
        addExerciseBlock();
    }
}

function hideWorkoutTemplateEditor() {
    document.getElementById('workoutTemplateEditor').style.display = 'none';
    document.querySelector('.workout-templates-container').style.display = 'block';
    document.getElementById('workoutTemplatePreview').style.display = 'none';
}

function addExerciseBlock() {
    const block = {
        name: `Block ${exerciseBlocks.length + 1}`,
        type: 'standard',
        exercises: []
    };
    
    exerciseBlocks.push(block);
    addExerciseBlockToUI(block, exerciseBlocks.length - 1);
}

function addExerciseBlockToUI(block, blockIndex) {
    const container = document.getElementById('exerciseBlocksContainer');
    
    const blockElement = document.createElement('div');
    blockElement.className = 'exercise-block border rounded p-3 mb-3';
    blockElement.dataset.blockIndex = blockIndex;
    
    blockElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="input-group" style="max-width: 70%;">
                <span class="input-group-text">Block Name</span>
                <input type="text" class="form-control block-name" value="${block.name}">
            </div>
            <div class="btn-group">
                <button type="button" class="btn btn-sm btn-outline-danger remove-block-btn">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        
        <div class="mb-3">
            <label class="form-label">Block Type</label>
            <select class="form-select block-type">
                <option value="standard" ${block.type === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="superset" ${block.type === 'superset' ? 'selected' : ''}>Superset</option>
                <option value="circuit" ${block.type === 'circuit' ? 'selected' : ''}>Circuit</option>
            </select>
        </div>
        
        <div class="exercises-container">
            <h6 class="mb-2">Exercises</h6>
            <div class="exercise-list">
                <!-- Exercises will be added here -->
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-exercise-btn">
                <i class="bi bi-plus-circle me-1"></i> Add Exercise
            </button>
        </div>
    `;
    
    // Add exercises to the block
    const exerciseList = blockElement.querySelector('.exercise-list');
    if (block.exercises && block.exercises.length > 0) {
        block.exercises.forEach((exercise, exerciseIndex) => {
            addExerciseToBlock(exerciseList, exercise, blockIndex, exerciseIndex);
        });
    }
    
    // Add event listeners
    blockElement.querySelector('.remove-block-btn').addEventListener('click', () => {
        removeExerciseBlock(blockIndex);
    });
    
    blockElement.querySelector('.add-exercise-btn').addEventListener('click', () => {
        addExerciseToBlock(exerciseList, {}, blockIndex, block.exercises.length);
    });
    
    blockElement.querySelector('.block-name').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].name = e.target.value;
    });
    
    blockElement.querySelector('.block-type').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].type = e.target.value;
    });
    
    container.appendChild(blockElement);
}

function addExerciseToBlock(container, exercise = {}, blockIndex, exerciseIndex) {
    // If this is a new exercise, add it to the data structure
    if (Object.keys(exercise).length === 0) {
        exercise = {
            name: '',
            sets: 3,
            reps: 12,
            rest_seconds: 60,
            notes: ''
        };
        
        // Add to the data structure
        if (!exerciseBlocks[blockIndex].exercises) {
            exerciseBlocks[blockIndex].exercises = [];
        }
        exerciseBlocks[blockIndex].exercises.push(exercise);
    }
    
    // Create the exercise element
    const exerciseElement = document.createElement('div');
    exerciseElement.className = 'exercise-item border rounded p-2 mb-2';
    exerciseElement.dataset.exerciseIndex = exerciseIndex;
    
    exerciseElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="input-group" style="max-width: 70%;">
                <span class="input-group-text">Name</span>
                <input type="text" class="form-control exercise-name" value="${exercise.name || ''}">
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-exercise-btn">
                <i class="bi bi-x-circle"></i>
            </button>
        </div>
        
        <div class="row g-2">
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Sets</span>
                    <input type="number" class="form-control exercise-sets" min="1" value="${exercise.sets || 3}">
                </div>
            </div>
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Reps</span>
                    <input type="number" class="form-control exercise-reps" min="1" value="${exercise.reps || 12}">
                </div>
            </div>
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Rest</span>
                    <input type="number" class="form-control exercise-rest" min="0" value="${exercise.rest_seconds || 60}">
                    <span class="input-group-text">sec</span>
                </div>
            </div>
        </div>
        
        <div class="mt-2">
            <textarea class="form-control form-control-sm exercise-notes" placeholder="Notes or instructions">${exercise.notes || ''}</textarea>
        </div>
    `;
    
    // Add event listeners
    exerciseElement.querySelector('.remove-exercise-btn').addEventListener('click', () => {
        removeExercise(blockIndex, exerciseIndex);
    });
    
    // Add change event listeners for all inputs
    exerciseElement.querySelector('.exercise-name').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].exercises[exerciseIndex].name = e.target.value;
    });
    
    exerciseElement.querySelector('.exercise-sets').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].exercises[exerciseIndex].sets = parseInt(e.target.value);
    });
    
    exerciseElement.querySelector('.exercise-reps').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].exercises[exerciseIndex].reps = parseInt(e.target.value);
    });
    
    exerciseElement.querySelector('.exercise-rest').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].exercises[exerciseIndex].rest_seconds = parseInt(e.target.value);
    });
    
    exerciseElement.querySelector('.exercise-notes').addEventListener('change', (e) => {
        exerciseBlocks[blockIndex].exercises[exerciseIndex].notes = e.target.value;
    });
    
    container.appendChild(exerciseElement);
}

function removeExerciseBlock(blockIndex) {
    if (confirm('Are you sure you want to remove this exercise block?')) {
        // Remove from the data structure
        exerciseBlocks.splice(blockIndex, 1);
        
        // Rebuild the UI
        document.getElementById('exerciseBlocksContainer').innerHTML = '';
        exerciseBlocks.forEach((block, index) => {
            addExerciseBlockToUI(block, index);
        });
    }
}

function removeExercise(blockIndex, exerciseIndex) {
    // Remove from the data structure
    exerciseBlocks[blockIndex].exercises.splice(exerciseIndex, 1);
    
    // Rebuild the exercise list for this block
    const blockElement = document.querySelector(`.exercise-block[data-block-index="${blockIndex}"]`);
    const exerciseList = blockElement.querySelector('.exercise-list');
    exerciseList.innerHTML = '';
    
    exerciseBlocks[blockIndex].exercises.forEach((exercise, index) => {
        addExerciseToBlock(exerciseList, exercise, blockIndex, index);
    });
}

/**
 * Gets or creates a plan template to use as a container for workout templates
 * @param {string} templateName - Name for the template
 * @returns {Promise<number>} - Promise that resolves with template ID
 */
function getOrCreatePlanTemplate(templateName = 'Default Plan Template') {
    console.log('Getting or creating plan template for:', templateName);
    
    return new Promise((resolve, reject) => {
        // Track the overlay element for proper cleanup
        let overlay = null;
        
        try {
            // Show loading overlay
            overlay = document.createElement('div');
            overlay.className = 'position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center';
            overlay.style.zIndex = '1050';
            overlay.innerHTML = `
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
            document.body.appendChild(overlay);
        } catch (err) {
            console.warn('Failed to create overlay, continuing without visual feedback:', err);
            // Non-critical error, continue without overlay
        }
        
        const removeOverlay = () => {
            try {
                if (overlay && document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            } catch (err) {
                console.error('Error removing overlay:', err);
                // Non-critical error, continue
            }
        };
        
        // First check if we have a default template for workouts
        console.log('Checking for existing workout plan templates...');
        CoachPlanAPI.planTemplates.getAll({template_type: 'workout'})
            .then(templates => {
                // Look for templates with template_type workout
                const templateData = templates.results || templates;
                console.log('Template data received:', templateData);
                
                if (templateData && templateData.length > 0) {
                    // Use the first available template
                    console.log('Found existing plan template:', templateData[0]);
                    resolve(templateData[0].id);
                    removeOverlay();
                    return;
                }
                
                // No template found, create one
                console.log('No existing templates found, creating new plan template for workouts');
                
                // Get the coach profile ID using multiple fallback methods
                getCoachProfileId()
                    .then(coachId => {
                        console.log('Retrieved coach ID:', coachId);
                        if (!coachId) {
                            throw new Error('Received empty coach ID');
                        }
                        
                        const planTemplateData = {
                            name: `Workout Templates Container - ${new Date().toLocaleDateString()}`,
                            description: 'Auto-generated template container for workout templates',
                            template_type: 'workout',
                            is_public: false,
                            coach: coachId // Include the coach ID
                        };
                        
                        console.log('Creating plan template with data:', planTemplateData);
                        return CoachPlanAPI.planTemplates.create(planTemplateData);
                    })
                    .then(newTemplate => {
                        console.log('Created new plan template successfully:', newTemplate);
                        if (!newTemplate || !newTemplate.id) {
                            throw new Error('Created template has no ID');
                        }
                        resolve(newTemplate.id);
                        removeOverlay();
                    })
                    .catch(error => {
                        console.error('Error in template creation flow:', error);
                        // If template creation failed, try to get templates one more time
                        // and check if any were created in the meantime (concurrent creation)
                        console.log('Retrying to find an existing template after creation failure');
                        return CoachPlanAPI.planTemplates.getAll({template_type: 'workout'})
                            .then(response => {
                                const templates = response.results || response;
                                if (templates && templates.length > 0) {
                                    console.log('Found existing plan template after retry:', templates[0]);
                                    resolve(templates[0].id);
                                } else {
                                    // No templates found even after retry
                                    throw new Error('Failed to create plan template and no existing templates were found');
                                }
                            })
                            .catch(retryError => {
                                console.error('Final template retrieval error:', retryError);
                                // This is the last attempt, reject with combined error info
                                reject(new Error(`Template creation failed: ${error.message} | Retry failed: ${retryError.message}`));
                            });
                    })
                    .finally(() => {
                        removeOverlay();
                    });
            })
            .catch(error => {
                console.error('Error checking existing plan templates:', error);
                reject(error);
                removeOverlay();
            });
    });
}

/**
 * Helper function to get coach profile ID using multiple fallback methods
 * @returns {Promise<string>} - Promise that resolves with coach ID
 */
function getCoachProfileId() {
    return new Promise((resolveCoach, rejectCoach) => {
        // Try to get coach ID from session storage first
        let coachProfileId = sessionStorage.getItem('coachProfileId');
        if (coachProfileId) {
            console.log('Using coach profile ID from session storage:', coachProfileId);
            return resolveCoach(coachProfileId);
        }
        
        // Try to get from hidden input field (if available)
        const hiddenCoachField = document.querySelector('input[name="coach_id"], input[name="coach_profile_id"], input[id="coach_id"], input[id="coach_profile_id"], [data-coach-id]');
        if (hiddenCoachField) {
            coachProfileId = hiddenCoachField.value || hiddenCoachField.getAttribute('data-coach-id');
            if (coachProfileId) {
                console.log('Using coach profile ID from hidden field:', coachProfileId);
                sessionStorage.setItem('coachProfileId', coachProfileId);
                return resolveCoach(coachProfileId);
            }
        }
        
        // Try to get from data attribute on body or other container
        const bodyDataCoach = document.body.getAttribute('data-coach-id');
        if (bodyDataCoach) {
            console.log('Using coach profile ID from body attribute:', bodyDataCoach);
            sessionStorage.setItem('coachProfileId', bodyDataCoach);
            return resolveCoach(bodyDataCoach);
        }
        
        // Try to get from global variable if available
        if (window.COACH_PROFILE_ID) {
            console.log('Using coach profile ID from global variable:', window.COACH_PROFILE_ID);
            sessionStorage.setItem('coachProfileId', window.COACH_PROFILE_ID);
            return resolveCoach(window.COACH_PROFILE_ID);
        }
        
        // If none of the above worked, try extracting from URL or path if possible
        const pathMatch = window.location.pathname.match(/\/coach-profile\/(\d+)/);
        if (pathMatch && pathMatch[1]) {
            console.log('Using coach profile ID from URL path:', pathMatch[1]);
            sessionStorage.setItem('coachProfileId', pathMatch[1]);
            return resolveCoach(pathMatch[1]);
        }
        
        // Last resort - try to get profile directly from API
        console.log('All quick methods failed, trying API call to get coach profile...');
        // Try getting the me endpoint first - more reliable if available
        APIBase.request('/profiles/api/v1/coach-profiles/me/', {
            method: 'GET'
        })
            .then(response => {
                console.log('Coach profile /me API response:', response);
                if (response && response.success && response.data && response.data.id) {
                    const coachId = response.data.id;
                    console.log('Retrieved coach profile ID from /me endpoint:', coachId);
                    sessionStorage.setItem('coachProfileId', coachId);
                    return resolveCoach(coachId);
                }
                
                // If /me endpoint doesn't work, try the list endpoint
                return APIBase.request('/profiles/api/v1/coach-profiles/', {
                    method: 'GET'
                });
            })
            .then(response => {
                // This might be from the list endpoint if /me failed
                if (!response || !response.success) {
                    throw new Error(response?.error || 'Failed to fetch coach profile');
                }
                
                const data = response.data;
                // Handle different possible response formats
                let coachId = null;
                
                // If it's a list response (results array)
                if (data && data.results && data.results.length > 0) {
                    coachId = data.results[0].id;
                }
                // If it's a single object response
                else if (data && data.id) {
                    coachId = data.id;
                }
                // If the first item has the coach ID (no pagination)
                else if (data && Array.isArray(data) && data.length > 0) {
                    coachId = data[0].id;
                }
                
                if (coachId) {
                    console.log('Retrieved coach profile ID from list endpoint:', coachId);
                    // Store for future use
                    sessionStorage.setItem('coachProfileId', coachId);
                    resolveCoach(coachId);
                } else {
                    throw new Error('Could not find coach profile ID in API response');
                }
            })
            .catch(error => {
                console.error('Coach profile API error:', error);
                rejectCoach(new Error('Could not retrieve coach profile ID. Please ensure you are logged in as a coach.'));
            });
    });
}

// Add a hidden field with coach ID to the page if not already present
function ensureCoachIdField() {
    // Check if we already have the field
    if (document.getElementById('hidden_coach_id')) {
        return;
    }
    
    // Create a hidden input with coach ID
    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.id = 'hidden_coach_id';
    hiddenField.name = 'coach_id';
    
    // Try to get coach ID from URL or user info
    try {
        // First check if user info is available in the page
        const userInfoScript = document.querySelector('script#user-info');
        if (userInfoScript && userInfoScript.textContent) {
            try {
                const userData = JSON.parse(userInfoScript.textContent);
                if (userData && userData.coach_id) {
                    hiddenField.value = userData.coach_id;
                    document.body.appendChild(hiddenField);
                    console.log('Added coach ID from user info:', userData.coach_id);
                    return;
                }
            } catch (parseErr) {
                console.warn('Failed to parse user info JSON:', parseErr);
                // Continue to next method
            }
        }
        
        // Try to get from data attribute on the logged in user element if exists
        const userElement = document.querySelector('[data-user-type="coach"], .coach-profile, .coach-info');
        if (userElement && userElement.getAttribute('data-coach-id')) {
            hiddenField.value = userElement.getAttribute('data-coach-id');
            document.body.appendChild(hiddenField);
            console.log('Added coach ID from user element:', hiddenField.value);
            return;
        }

        // Make a direct API call to get the coach profile using the newly added 'me' endpoint
        APIBase.request('/profiles/api/v1/coach-profiles/me/', { method: 'GET' })
            .then(response => {
                if (response && response.success && response.data && response.data.id) {
                    hiddenField.value = response.data.id;
                    document.body.setAttribute('data-coach-id', response.data.id);
                    document.body.appendChild(hiddenField);
                    console.log('Added coach ID from API call:', response.data.id);
                    return;
                }
                
                // Fallback method - try to get from session storage
                const storedCoachId = sessionStorage.getItem('coach_id');
                if (storedCoachId) {
                    hiddenField.value = storedCoachId;
                    document.body.setAttribute('data-coach-id', storedCoachId);
                    document.body.appendChild(hiddenField);
                    console.log('Using coach ID from session storage:', storedCoachId);
                    return;
                }
                
                console.warn('Could not retrieve coach ID from API');
            })
            .catch(err => {
                console.error('Error fetching coach profile:', err);
                
                // Fallback method - try to get from session storage
                const storedCoachId = sessionStorage.getItem('coach_id');
                if (storedCoachId) {
                    hiddenField.value = storedCoachId;
                    document.body.setAttribute('data-coach-id', storedCoachId);
                    document.body.appendChild(hiddenField);
                    console.log('Using coach ID from session storage after API error:', storedCoachId);
                }
            });
    } catch (e) {
        console.error('Error setting up coach ID field:', e);
        console.error('Could not set up coach ID field. Please log in as a coach to continue.');
    }
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', ensureCoachIdField);
// Also call it now in case the DOM is already loaded
ensureCoachIdField();

// Loading overlay utility functions
function showLoadingOverlay(message = 'Loading...') {
    // Remove any existing overlay first
    hideLoadingOverlay();
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background-color:rgba(0,0,0,0.7); z-index:9999; display:flex; align-items:center; justify-content:center;';
    
    // Create loading spinner and message
    const content = document.createElement('div');
    content.className = 'loading-content';
    content.style.cssText = 'background-color:white; padding:20px; border-radius:5px; text-align:center; box-shadow: 0 0 10px rgba(0,0,0,0.3);';
    
    // Add spinner
    content.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">${message}</p>
    `;
    
    // Append to DOM
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    return overlay;
}

function hideLoadingOverlay() {
    // Find and remove all loading overlays
    const overlays = document.querySelectorAll('.loading-overlay');
    overlays.forEach(overlay => {
        if (overlay && document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    });
}

// Workout template functions moved to workout_template_creation.js and workout_template_core.js

// Removed - Workout template preview code moved to workout_template_creation.js

// Removed - editWorkoutTemplate and deleteWorkoutTemplate functions moved to workout_template_creation.js

// Meal and workout template functions have been moved to dedicated files:
// - workout_template_core.js and workout_template_creation.js for workout templates
// - meal_template_creation.js for meal templates

/**
 * Generate star icons to visualize difficulty level
 * @param {number} difficulty - Difficulty level (1-5)
 * @returns {string} HTML string with stars
 */
function generateDifficultyStars(difficulty) {
    if (!difficulty) return '-';
    
    // Parse as integer and clamp between 1-5
    const level = Math.min(Math.max(parseInt(difficulty) || 1, 1), 5);
    
    let stars = '';
    // Add filled stars
    for (let i = 0; i < level; i++) {
        stars += '<i class="bi bi-star-fill text-warning"></i>';
    }
    // Add empty stars
    for (let i = level; i < 5; i++) {
        stars += '<i class="bi bi-star text-muted"></i>';
    }
    
    return stars;
}

/**
 * Load plan review data and render it in the plan review tab
 * This function aggregates all the data from previous steps
 */
function loadPlanReview() {
    const planSummary = document.getElementById('planSummary');
    const planItemsTableBody = document.getElementById('planItemsTableBody');
    
    // Show loading state
    if (planSummary) {
        planSummary.innerHTML = `
            <h5 class="section-title">Plan Summary</h5>
            <div class="placeholder-content text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading plan summary...</span>
                </div>
            </div>
        `;
    }
    
    if (planItemsTableBody) {
        planItemsTableBody.innerHTML = `
            <tr class="placeholder-row">
                <td colspan="5" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading plan items...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Get current plan ID from session storage
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    if (!currentPlanId) {
        showToast('error', 'No plan found. Please create a plan first');
        setTimeout(() => {
            document.getElementById('plan-basics-tab').click();
        }, 1000);
        return;
    }
    
    // Fetch the current plan data from the backend to ensure we have the most up-to-date information
    CoachPlanAPI.productPlans.getById(currentPlanId)
        .then(plan => {
            // Render plan summary
            renderPlanSummary(plan, planSummary);
            
            // Load and render all selected templates
            renderSelectedTemplates(plan);
            
            // Render plan structure in the table
            renderPlanStructure(plan, planItemsTableBody);
            
            // Mark step as viewable
            updateStepStatus('plan-review', 'viewable');
            
            // Enable publish button if everything is valid
            validatePlanForPublishing(plan);
        })
        .catch(error => {
            console.error('Error loading plan for review:', error);
            showToast('error', 'Failed to load plan details');
            if (planSummary) {
                planSummary.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load plan details. Please try again.
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="loadPlanReview()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                    </button>
                `;
            }
        });
}

/**
 * Render the plan summary section
 * @param {Object} plan - The plan object
 * @param {HTMLElement} container - The container to render into
 */
function renderPlanSummary(plan, container) {
    if (!container) return;
    
    container.innerHTML = `
        <h5 class="section-title">Plan Summary</h5>
        <div class="card">
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-6">
                        <p class="mb-2"><strong>Name:</strong> ${plan.name || 'Not specified'}</p>
                        <p class="mb-2"><strong>Duration:</strong> ${plan.duration || 'Not specified'} days</p>
                        <p class="mb-2"><strong>Goal:</strong> ${plan.goal || 'Not specified'}</p>
                        <p class="mb-2"><strong>Level:</strong> ${plan.level || 'Not specified'}</p>
                    </div>
                    <div class="col-md-6">
                        <p class="mb-2"><strong>Price:</strong> ${plan.price ? '$' + plan.price : 'Not specified'}</p>
                        <p class="mb-2"><strong>Workout Days/Week:</strong> ${plan.workout_days || '0'}</p>
                        <p class="mb-2"><strong>Rest Days/Week:</strong> ${plan.rest_days || '0'}</p>
                        <p class="mb-2"><strong>Status:</strong> <span class="badge bg-${plan.is_active ? 'success' : 'warning'}">${plan.is_active ? 'Active' : 'Draft'}</span></p>
                    </div>
                </div>
                <div class="mt-3">
                    <p class="mb-1"><strong>Description:</strong></p>
                    <p>${plan.description || 'No description provided'}</p>
                </div>
            </div>
        </div>
    `;
    
}

/**
 * Render selected workout and meal templates
 * @param {Object} plan - The plan object
 */
function renderSelectedTemplates(plan) {
    // Get selected templates from session storage or backend data
    const selectedWorkoutTemplateIds = sessionStorage.getItem('selectedWorkoutTemplates') ? 
        JSON.parse(sessionStorage.getItem('selectedWorkoutTemplates')) : 
        (plan.workout_templates?.map(t => t.id) || []);
    
    const selectedMealTemplateIds = sessionStorage.getItem('selectedMealTemplates') ? 
        JSON.parse(sessionStorage.getItem('selectedMealTemplates')) : 
        (plan.meal_templates?.map(t => t.id) || []);
    
    // Fetch full workout templates data
    if (selectedWorkoutTemplateIds.length > 0) {
        CoachPlanAPI.workoutTemplates.getAll()
            .then(templates => {
                // Handle paginated responses
                if (templates && templates.results) {
                    console.log('Received paginated response for workout templates preview:', templates);
                    templates = templates.results;
                }
                
                // Check if templates is an array
                if (!Array.isArray(templates)) {
                    console.error('Workout templates for preview is not an array:', templates);
                    throw new Error('Invalid workout templates format');
                }
                
                const selectedTemplates = templates.filter(t => selectedWorkoutTemplateIds.includes(t.id));
                renderWorkoutTemplatesPreview(selectedTemplates);
            })
            .catch(error => {
                console.error('Error loading workout templates:', error);
                document.getElementById('workoutTemplatesPreview').innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load workout templates.
                    </div>
                `;
            });
    } else {
        // No workout templates selected
        const workoutTemplatesPreview = document.createElement('div');
        workoutTemplatesPreview.id = 'workoutTemplatesPreview';
        workoutTemplatesPreview.className = 'mt-4';
        workoutTemplatesPreview.innerHTML = `
            <h5 class="section-title">Workout Templates</h5>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                No workout templates selected.
            </div>
        `;
        document.getElementById('planSummary').after(workoutTemplatesPreview);
    }
    
    // Fetch full meal templates data
    if (selectedMealTemplateIds.length > 0) {
        CoachPlanAPI.mealTemplates.getAll()
            .then(templates => {
                // Handle paginated responses
                if (templates && templates.results) {
                    console.log('Received paginated response for meal templates preview:', templates);
                    templates = templates.results;
                }
                
                // Check if templates is an array
                if (!Array.isArray(templates)) {
                    console.error('Meal templates for preview is not an array:', templates);
                    throw new Error('Invalid meal templates format');
                }
                
                const selectedTemplates = templates.filter(t => selectedMealTemplateIds.includes(t.id));
                renderMealTemplatesPreview(selectedTemplates);
            })
            .catch(error => {
                console.error('Error loading meal templates:', error);
                document.getElementById('mealTemplatesPreview').innerHTML = `
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load meal templates.
                    </div>
                `;
            });
    } else {
        // No meal templates selected
        const mealTemplatesPreview = document.createElement('div');
        mealTemplatesPreview.id = 'mealTemplatesPreview';
        mealTemplatesPreview.className = 'mt-4';
        mealTemplatesPreview.innerHTML = `
            <h5 class="section-title">Meal Templates</h5>
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                No meal templates selected.
            </div>
        `;
        
        // Add after workout templates or plan summary
        const workoutTemplatesPreview = document.getElementById('workoutTemplatesPreview');
        if (workoutTemplatesPreview) {
            workoutTemplatesPreview.after(mealTemplatesPreview);
        } else {
            document.getElementById('planSummary').after(mealTemplatesPreview);
        }
    }
}

/**
 * Render workout templates in review tab
 * @param {Array} templates - The workout templates
 */
function renderWorkoutTemplatesPreview(templates) {
    if (!templates || templates.length === 0) return;
    
    const workoutTemplatesPreview = document.createElement('div');
    workoutTemplatesPreview.id = 'workoutTemplatesPreview';
    workoutTemplatesPreview.className = 'mt-4';
    
    let html = `
        <h5 class="section-title">Workout Templates (${templates.length})</h5>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Focus Area</th>
                        <th>Difficulty</th>
                        <th>Exercises</th>
                    </tr>
                </thead>
                <tbody id="workoutTemplatesReviewBody">
`;

    // Add template rows
    templates.forEach(template => {
        html += `
            <tr>
                <td>${template.name}</td>
                <td>${template.category || 'N/A'}</td>
                <td>${template.focus_area || 'N/A'}</td>
                <td>
                    ${getDifficultyStars(template.difficulty || 1)}
                </td>
                <td>${template.exercises?.length || 0} exercises</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    workoutTemplatesPreview.innerHTML = html;
    document.getElementById('planSummary').after(workoutTemplatesPreview);
}

/**
 * Render meal templates in review tab
 * @param {Array} templates - The meal templates
 */
function renderMealTemplatesPreview(templates) {
    if (!templates || templates.length === 0) return;
    
    const mealTemplatesPreview = document.createElement('div');
    mealTemplatesPreview.id = 'mealTemplatesPreview';
    mealTemplatesPreview.className = 'mt-4';
    
    let html = `
        <h5 class="section-title">Meal Templates (${templates.length})</h5>
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Meal Type</th>
                        <th>Calories</th>
                        <th>Protein</th>
                        <th>Carbs</th>
                        <th>Fat</th>
                    </tr>
                </thead>
                <tbody id="mealTemplatesReviewBody">
`;

    // Add template rows
    templates.forEach(template => {
        html += `
            <tr>
                <td>${template.name}</td>
                <td>${template.meal_type || 'N/A'}</td>
                <td>${template.calories || 0} kcal</td>
                <td>${template.protein || 0}g</td>
                <td>${template.carbs || 0}g</td>
                <td>${template.fat || 0}g</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    mealTemplatesPreview.innerHTML = html;
    
    // Add after workout templates or plan summary
    const workoutTemplatesPreview = document.getElementById('workoutTemplatesPreview');
    if (workoutTemplatesPreview) {
        workoutTemplatesPreview.after(mealTemplatesPreview);
    } else {
        document.getElementById('planSummary').after(mealTemplatesPreview);
    }
}

/**
 * Render plan structure in the table
 * @param {Object} plan - The plan object
 * @param {HTMLElement} tableBody - The table body to render into
 */
function renderPlanStructure(plan, tableBody) {
    if (!tableBody) return;
    
    if (!plan.plan_items || plan.plan_items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-3">
                    <div class="alert alert-warning mb-0">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        No plan days structure defined.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort plan items by day number
    const sortedItems = [...plan.plan_items].sort((a, b) => a.day_number - b.day_number);
    
    let html = '';
    
    sortedItems.forEach((item, index) => {
        html += `
            <tr>
                <td>Day ${item.day_number}</td>
                <td>
                    <span class="badge bg-${item.day_type === 'workout' ? 'primary' : 'secondary'}">
                        ${item.day_type === 'workout' ? 'Workout' : 'Rest'}
                    </span>
                </td>
                <td>${item.workout_template ? item.workout_template.name : 'N/A'}</td>
                <td>${item.meal_template ? item.meal_template.name : 'N/A'}</td>
                <td>${item.notes || '-'}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

/**
 * Validate if plan is ready for publishing
 * @param {Object} plan - The plan object
 */
function validatePlanForPublishing(plan) {
    const publishBtn = document.getElementById('publishPlanBtn');
    if (!publishBtn) return;
    
    const issues = [];
    
    // Check required plan properties
    if (!plan.name) issues.push('Plan name is required');
    if (!plan.duration) issues.push('Plan duration is required');
    if (!plan.price) issues.push('Plan price is required');
    
    // Check plan structure
    if (!plan.plan_items || plan.plan_items.length === 0) {
        issues.push('Plan structure is empty');
    }
    
    // Get selected templates
    const selectedWorkoutTemplateIds = sessionStorage.getItem('selectedWorkoutTemplates') ? 
        JSON.parse(sessionStorage.getItem('selectedWorkoutTemplates')) : 
        (plan.workout_templates?.map(t => t.id) || []);
    
    const selectedMealTemplateIds = sessionStorage.getItem('selectedMealTemplates') ? 
        JSON.parse(sessionStorage.getItem('selectedMealTemplates')) : 
        (plan.meal_templates?.map(t => t.id) || []);
    
    // Check templates
    if (selectedWorkoutTemplateIds.length === 0) issues.push('No workout templates selected');
    if (selectedMealTemplateIds.length === 0) issues.push('No meal templates selected');
    
    // Enable/disable publish button and show validation messages
    if (issues.length > 0) {
        publishBtn.disabled = true;
        publishBtn.title = issues.join(', ');
        
        // Add validation messages before publish button
        let validationAlert = document.getElementById('planValidationAlert');
        if (!validationAlert) {
            validationAlert = document.createElement('div');
            validationAlert.id = 'planValidationAlert';
            validationAlert.className = 'alert alert-warning mt-3';
            document.querySelector('.card-footer:last-child').prepend(validationAlert);
        }
        
        validationAlert.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Please fix these issues before publishing:</strong>
            <ul class="mb-0 mt-1">
                ${issues.map(issue => `<li>${issue}</li>`).join('')}
            </ul>
        `;
    } else {
        publishBtn.disabled = false;
        publishBtn.title = 'Publish this plan';
        
        // Remove validation messages if they exist
        const validationAlert = document.getElementById('planValidationAlert');
        if (validationAlert) validationAlert.remove();
    }
}

/**
 * Publish the plan
 */
function publishPlan() {
    const publishBtn = document.getElementById('publishPlanBtn');
    if (publishBtn) publishBtn.disabled = true;
    
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    if (!currentPlanId) {
        showToast('error', 'No plan found');
        if (publishBtn) publishBtn.disabled = false;
        return;
    }
    
    // Check if plan should be active immediately
    const makeActive = document.getElementById('publishPlanCheck').checked;
    
    // Show loading toast
    showToast('info', 'Publishing plan...', 0);
    
    CoachPlanAPI.productPlans.update(currentPlanId, { is_published: true, is_active: makeActive })
        .then(response => {
            // Close any open toasts
            document.querySelectorAll('.toast').forEach(toast => {
                const bsToast = bootstrap.Toast.getInstance(toast);
                if (bsToast) bsToast.hide();
            });
            
            showToast('success', 'Plan published successfully!');
            
            // Add success alert to page
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success mt-3';
            successAlert.innerHTML = `
                <i class="bi bi-check-circle-fill me-2"></i>
                <strong>Success!</strong> Your plan has been published${makeActive ? ' and is now active' : ''}.
                <div class="mt-2">
                    <a href="/plans/" class="btn btn-sm btn-primary me-2">
                        <i class="bi bi-list me-1"></i> View All Plans
                    </a>
                    <button class="btn btn-sm btn-outline-secondary" onclick="location.reload()">
                        <i class="bi bi-plus-circle me-1"></i> Create Another Plan
                    </button>
                </div>
            `;
            
            document.querySelector('.card-body:last-child').appendChild(successAlert);
            
            // Disable publish button and mark as published
            if (publishBtn) {
                publishBtn.disabled = true;
                publishBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Published';
                publishBtn.classList.replace('btn-success', 'btn-outline-success');
            }
            
            // Clear session storage for this plan
            sessionStorage.removeItem('currentPlanId');
            sessionStorage.removeItem('selectedWorkoutTemplates');
            sessionStorage.removeItem('selectedMealTemplates');
        })
        .catch(error => {
            console.error('Error publishing plan:', error);
            showToast('error', 'Failed to publish plan');
            if (publishBtn) publishBtn.disabled = false;
        });
} // This is the closing brace for publishPlan function

// Helper utility function to generate difficulty stars display
function generateDifficultyStars(difficulty) {
    if (!difficulty) return '-';
    
    const maxStars = 5;
    const filledStars = Math.min(Math.max(parseInt(difficulty) || 0, 0), maxStars);
    let starsHtml = '';
    
    for (let i = 1; i <= maxStars; i++) {
        if (i <= filledStars) {
            starsHtml += '<i class="bi bi-star-fill text-warning"></i>';
        } else {
            starsHtml += '<i class="bi bi-star text-muted"></i>';
        }
    }
    
    return starsHtml;
}

// Helper function to capitalize first letter
function capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Function to load the Review & Publish tab
 */
function loadPlanReview() {
    const reviewContainer = document.getElementById('reviewTabContent');
    const planSummary = document.getElementById('planSummary');
    const planItemsTableBody = document.getElementById('planItemsTableBody');
    
    // Show loading state
    if (planSummary) {
        planSummary.innerHTML = `
            <h5 class="section-title">Plan Summary</h5>
            <div class="placeholder-content text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading plan summary...</span>
                </div>
            </div>
        `;
    }
    
    if (planItemsTableBody) {
        planItemsTableBody.innerHTML = `
            <tr class="placeholder-row">
                <td colspan="5" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading plan items...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Get current plan ID from session storage
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    if (!currentPlanId) {
        showToast('error', 'No plan found. Please create a plan first');
        setTimeout(() => {
            document.getElementById('plan-basics-tab').click();
        }, 1000);
        return;
    }
    
    // Fetch the current plan data from the backend to ensure we have the most up-to-date information
    CoachPlanAPI.productPlans.getById(currentPlanId)
        .then(plan => {
            // Render plan summary
            renderPlanSummary(plan, planSummary);
            
            // Load and render all selected templates
            renderSelectedTemplates(plan);
            
            // Render plan structure in the table
            renderPlanStructure(plan, planItemsTableBody);
            
            // Mark step as viewable
            updateStepStatus('plan-review', 'viewable');
            
            // Validate plan for publishing
            validatePlanForPublishing(plan);
        })
        .catch(error => {
            console.error('Error loading plan data:', error);
            showToast('error', 'Failed to load plan data');
            if (planSummary) {
                planSummary.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Failed to load plan data
                    </div>
                `;
            }
        });
        
    // Load workout templates for review
    CoachPlanAPI.workoutTemplates.getAll()
        .then(templates => {
            const tbody = document.getElementById('workoutTemplatesReviewBody');
            
            if (!templates || templates.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No workout templates added to this plan</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = '';
            templates.forEach(template => {
                // Count exercises
                let exerciseCount = 0;
                if (template.structure && template.structure.blocks) {
                    template.structure.blocks.forEach(block => {
                        exerciseCount += block.exercises ? block.exercises.length : 0;
                    });
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${template.name}</td>
                    <td>${template.category || '-'}</td>
                    <td>${template.focus_area || '-'}</td>
                    <td>${generateDifficultyStars(template.difficulty)}</td>
                    <td>${exerciseCount}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading workout templates:', error);
            document.getElementById('workoutTemplatesReviewBody').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>
                        Error loading workout templates
                    </td>
                </tr>
            `;
        });
    
    // Load meal templates
    CoachPlanAPI.mealTemplates.getAll()
        .then(templates => {
            const tbody = document.getElementById('mealTemplatesReviewBody');
            
            if (!templates || templates.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No meal templates added to this plan</td>
                    </tr>
                `;
                return;
            }
            
            tbody.innerHTML = '';
            templates.forEach(template => {
                // Count ingredients
                let ingredientCount = 0;
                if (template.structure && template.structure.ingredients) {
                    ingredientCount = template.structure.ingredients.length;
                }
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${template.name}</td>
                    <td>${capitalizeFirst(template.meal_type || '-')}</td>
                    <td>${template.category || '-'}</td>
                    <td>${template.calories || '-'}</td>
                    <td>${ingredientCount}</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading meal templates:', error);
            document.getElementById('mealTemplatesReviewBody').innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i>
                        Error loading meal templates
                    </td>
                </tr>
            `;
        });
    
    // Re-attach event listeners
    document.getElementById('backToMealTemplate').addEventListener('click', function() {
        document.getElementById('meal-template-tab').click();
    });
    
    document.getElementById('publishPlanBtn').addEventListener('click', function() {
        publishPlan();
    });
}

/**
 * Render the plan summary in the review tab
 * @param {Object} plan - The plan object
 * @param {HTMLElement} container - The container element
 */
function renderPlanSummary(plan, container) {
    if (!plan || !container) return;
    
    const workoutDays = plan.workout_days_per_week || 0;
    const restDays = plan.rest_days_per_week || 0;
    
    container.innerHTML = `
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body">
                <h5 class="card-title mb-3">${plan.name || 'Untitled Plan'}</h5>
                <p class="text-muted mb-3">${plan.description || 'No description provided'}</p>
                
                <div class="row g-3 mb-3">
                    <div class="col-md-4">
                        <div class="small text-muted mb-1">Duration</div>
                        <div class="fw-bold">${plan.duration || 0} days</div>
                    </div>
                    <div class="col-md-4">
                        <div class="small text-muted mb-1">Schedule</div>
                        <div class="fw-bold">${workoutDays} workout day${workoutDays !== 1 ? 's' : ''}, ${restDays} rest day${restDays !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="small text-muted mb-1">Price</div>
                        <div class="fw-bold">$${plan.price || 0}</div>
                    </div>
                </div>
                
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="publishPlanCheck" checked>
                    <label class="form-check-label" for="publishPlanCheck">
                        <span class="fw-medium">Make plan active immediately</span>
                        <small class="d-block text-muted">If unchecked, plan will be published but inactive</small>
                    </label>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render selected templates in the review tab
 * @param {Object} plan - The plan object
 */
function renderSelectedTemplates(plan) {
    // This function would render the selected workout and meal templates
    // It's called from loadPlanReview but implementation is handled separately
    // through the workout templates and meal templates API calls
}

/**
 * Render the plan structure in the review tab
 * @param {Object} plan - The plan object
 * @param {HTMLElement} container - The container element
 */
function renderPlanStructure(plan, container) {
    if (!plan || !container) return;
    
    const workoutDays = plan.workout_days_per_week || 0;
    const restDays = plan.rest_days_per_week || 0;
    const totalDays = workoutDays + restDays;
    
    container.innerHTML = `
        <tr>
            <td>Workout Days</td>
            <td>${workoutDays}</td>
        </tr>
        <tr>
            <td>Rest Days</td>
            <td>${restDays}</td>
        </tr>
        <tr>
            <td>Total Days per Week</td>
            <td>${totalDays}</td>
        </tr>
        <tr>
            <td>Plan Duration</td>
            <td>${plan.duration || 0} days</td>
        </tr>
    `;
}

/**
 * Validate the plan for publishing
 * @param {Object} plan - The plan object
 */
function validatePlanForPublishing(plan) {
    if (!plan) return false;
    
    const publishBtn = document.getElementById('publishPlanBtn');
    let isValid = true;
    const errors = [];
    
    // Check required plan fields
    if (!plan.name) {
        isValid = false;
        errors.push('Plan name is required');
    }
    
    if (!plan.duration) {
        isValid = false;
        errors.push('Plan duration is required');
    }
    
    if (!plan.price) {
        isValid = false;
        errors.push('Plan price is required');
    }
    
    // Check if workout templates are selected
    const workoutTemplates = JSON.parse(sessionStorage.getItem('selectedWorkoutTemplates') || '[]');
    if (workoutTemplates.length === 0) {
        isValid = false;
        errors.push('At least one workout template is required');
    }
    
    // Check if meal templates are selected
    const mealTemplates = JSON.parse(sessionStorage.getItem('selectedMealTemplates') || '[]');
    if (mealTemplates.length === 0) {
        isValid = false;
        errors.push('At least one meal template is required');
    }
    
    // Update publish button state
    if (publishBtn) {
        publishBtn.disabled = !isValid;
        
        // Add tooltip with errors if any
        if (!isValid && errors.length > 0) {
            publishBtn.setAttribute('data-bs-toggle', 'tooltip');
            publishBtn.setAttribute('data-bs-placement', 'top');
            publishBtn.setAttribute('title', `Cannot publish: ${errors.join(', ')}`);
            
            // Initialize tooltip
            new bootstrap.Tooltip(publishBtn);
        }
    }
    
    return isValid;
}

/**
 * Update the status of a step in the plan creation process
 * @param {string} stepId - The ID of the step to update
 * @param {string} status - The new status ('viewable', 'active', 'completed')
 */
function updateStepStatus(stepId, status) {
    const stepElement = document.getElementById(stepId);
    if (!stepElement) return;
    
    // Update the step status
    if (status === 'viewable') {
        // Make step viewable but not active
        stepElement.classList.add('viewable');
    } else if (status === 'active') {
        // Make step active
        stepElement.classList.add('active');
    } else if (status === 'completed') {
        // Mark step as completed
        stepElement.classList.add('completed');
    }
}

/**
 * Publish the plan by collecting all data and sending to backend
 */
function publishPlan() {
    console.log('publishPlan() called');
    
    // Show loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = 1050;
    overlay.innerHTML = `
        <div class="bg-white p-4 rounded shadow-sm text-center">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Publishing plan...</span>
            </div>
            <h5>Publishing Plan</h5>
            <p class="mb-0">Please wait while your plan is being published...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Get plan ID
    const planId = sessionStorage.getItem('currentPlanId');
    if (!planId) {
        document.body.removeChild(overlay);
        showToast('error', 'Cannot publish: No plan has been created yet');
        return;
    }
    
    // Get selected templates
    const workoutTemplateIds = JSON.parse(sessionStorage.getItem('selectedWorkoutTemplates') || '[]');
    const mealTemplateIds = JSON.parse(sessionStorage.getItem('selectedMealTemplates') || '[]');
    
    if (workoutTemplateIds.length === 0 || mealTemplateIds.length === 0) {
        document.body.removeChild(overlay);
        showToast('error', `Please select ${workoutTemplateIds.length === 0 ? 'workout' : 'meal'} templates before publishing`);
        return;
    }
    
    // Load existing plan data to merge with updates
    CoachPlanAPI.productPlans.getById(planId)
        .then(existingPlan => {
            console.log('Existing plan data:', existingPlan);
            
            // Collect form data
            const duration = parseInt(document.getElementById('planDuration').value);
            const price = parseFloat(document.getElementById('planPrice').value);
            const workoutDaysPerWeek = parseInt(document.getElementById('workoutDaysPerWeek')?.value || existingPlan.workout_days_per_week || 5);
            const restDaysPerWeek = parseInt(document.getElementById('restDaysPerWeek')?.value || existingPlan.rest_days_per_week || 2);
            
            // Calculate dates and session metrics
            const dates = calculatePlanDates(duration);
            const sessionMetrics = calculateSessionMetrics(duration, workoutDaysPerWeek, price);
            
            const planData = {
                id: planId,
                name: document.getElementById('planName').value,
                plan_type: document.getElementById('planType').value || existingPlan.plan_type,
                description: document.getElementById('planDescription').value,
                difficulty_level: getDifficultyLevelString(document.getElementById('difficultyLevel').value || existingPlan.difficulty_level),
                duration: duration,
                price: price,
                max_clients: document.getElementById('maxClients').value || existingPlan.max_clients || null,
                workout_days_per_week: workoutDaysPerWeek,
                rest_days_per_week: restDaysPerWeek,
                start_date: dates.start_date,
                end_date: dates.end_date,
                session_count: sessionMetrics.session_count,
                price_per_session: sessionMetrics.price_per_session,
                workout_templates: workoutTemplateIds,
                meal_templates: mealTemplateIds,
                is_published: true,
                status: 'active'
            };
            
            console.log('Publishing plan with data:', planData);
            
            // Update and publish the plan
            return CoachPlanAPI.productPlans.update(planId, planData);
        })
        .then(plan => {
            console.log('Plan published successfully:', plan);
            showToast('success', 'Plan published successfully!');
            
            // Clear session storage for plan creation data
            sessionStorage.removeItem('currentPlanId');
            sessionStorage.removeItem('planBasics');
            sessionStorage.removeItem('selectedWorkoutTemplates');
            sessionStorage.removeItem('selectedMealTemplates');
            
            // Redirect to plans list after short delay
            setTimeout(() => {
                window.location.href = '/coach/plans/';
            }, 1500);
        })
        .catch(error => {
            console.error('Error publishing plan:', error);
            
            let errorMessage = 'Failed to publish plan.';
            
            // Try to extract detailed error message from API response
            if (error && error.errorJSON) {
                if (typeof error.errorJSON === 'object') {
                    const fieldErrors = [];
                    for (const [field, errors] of Object.entries(error.errorJSON)) {
                        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${fieldName}: ${errors.join(', ')}`);
                        } else {
                            fieldErrors.push(`${fieldName}: ${errors}`);
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage += ` Please fix the following issues:\n${fieldErrors.join('\n')}`;
                    }
                }
            }
            
            showToast('error', errorMessage);
            document.body.removeChild(overlay);
        })

}

function deleteWorkoutTemplate(templateId) {
    if (confirm('Are you sure you want to delete this workout template?')) {
        // Show loading state in the table row
        const row = document.querySelector(`#workoutTemplatesTableBody .edit-template-btn[data-id="${templateId}"]`).closest('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Deleting...</span>
                </div>
                <span class="ms-2">Deleting template...</span>
            </td>
        `;
        
        // Delete the template
        CoachPlanAPI.workoutTemplates.delete(templateId)
            .then(() => {
                showToast('success', 'Workout template deleted successfully');
                loadWorkoutTemplates(); // Refresh the templates list
            })
            .catch(error => {
                console.error('Error deleting workout template:', error);
                showToast('error', 'Failed to delete workout template');
                loadWorkoutTemplates(); // Refresh the templates list anyway
            });
    }
}

// Meal Templates Functions
let currentMealTemplate = null;
let currentMealTemplateId = null;
let ingredients = [];

function loadMealTemplates() {
    const tableBody = document.getElementById('mealTemplatesTableBody');
    tableBody.innerHTML = `
        <tr class="placeholder-row">
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;
    
    // Use the API service to fetch meal templates
    CoachPlanAPI.mealTemplates.getAll()
        .then(templates => {
            mealTemplates = templates;
            renderMealTemplatesTable(templates);
        })
        .catch(error => {
            console.error('Error loading meal templates:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Failed to load meal templates
                        </div>
                    </td>
                </tr>
            `;
        });
}

function renderMealTemplatesTable(templates) {
    const tableBody = document.getElementById('mealTemplatesTableBody');
    const loadingIndicator = document.getElementById('mealTemplatesLoading');
    const emptyState = document.getElementById('noMealTemplates');
    
    // Hide loading indicator
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    
    // Handle paginated responses from API
    if (templates && templates.results) {
        console.log('Received paginated response for meal templates:', templates);
        templates = templates.results;
    }
    
    if (!Array.isArray(templates)) {
        console.error('Meal templates is not an array:', templates);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="text-muted mb-0">Error loading meal templates. Please refresh and try again.</p>
                    <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadMealTemplates()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    if (templates.length === 0) {
        // Show empty state
        if (emptyState) emptyState.style.display = 'block';
        tableBody.innerHTML = '';
        return;
    }
    
    // Hide empty state if we have templates
    if (emptyState) emptyState.style.display = 'none';
    
    tableBody.innerHTML = '';
    
    templates.forEach(template => {
        const row = document.createElement('tr');
        
        // Count ingredients
        let ingredientCount = 0;
        if (template.structure && template.structure.ingredients) {
            ingredientCount = template.structure.ingredients.length;
        }
        
        // Create the HTML for the row
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input class="form-check-input meal-template-checkbox" type="checkbox" data-template-id="${template.id}">
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div>
                        <h6 class="mb-0">${template.meal_name || template.name || 'Unnamed Template'}</h6>
                        <small class="text-muted">${template.description ? template.description.substring(0, 50) + (template.description.length > 50 ? '...' : '') : 'No description'}</small>
                    </div>
                </div>
            </td>
            <td>${capitalizeFirst(template.meal_type || '-')}</td>
            <td>${template.category || '-'}</td>
            <td>${template.calories || '-'}</td>
            <td>${ingredientCount}</td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button type="button" class="btn btn-outline-primary view-meal-btn" data-id="${template.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-outline-secondary edit-meal-btn" data-id="${template.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-meal-btn" data-id="${template.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        // Add event listeners to the buttons
        row.querySelector('.view-meal-btn').addEventListener('click', () => {
            viewMealTemplate(template.id);
        });
        
        row.querySelector('.edit-meal-btn').addEventListener('click', () => {
            editMealTemplate(template.id);
        });
        
        row.querySelector('.delete-meal-btn').addEventListener('click', () => {
            deleteMealTemplate(template.id);
        });
        
        // Add event listener for checkbox to update selection count
        const checkbox = row.querySelector('.meal-template-checkbox');
        checkbox.addEventListener('change', () => {
            updateSelectedMealTemplatesCount();
        });
        
        tableBody.appendChild(row);
    });
}

/**
 * Updates the count of selected meal templates in the UI
 */
function updateSelectedMealTemplatesCount() {
    const selectedTemplates = getSelectedMealTemplates();
    const countElement = document.getElementById('selectedMealTemplatesCount');
    
    if (countElement) {
        countElement.textContent = selectedTemplates.length;
        
        // Update navigation button state
        const nextBtn = document.getElementById('nextToReview');
        if (nextBtn) {
            nextBtn.disabled = selectedTemplates.length === 0;
        }
    }
}

/**
 * Get all currently selected meal templates
 * @returns {Array} Array of template IDs
 */
function getSelectedMealTemplates() {
    const selectedTemplates = [];
    const checkboxes = document.querySelectorAll('#mealTemplatesTableBody input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedTemplates.push(checkbox.dataset.templateId);
    });
    
    console.log('Selected meal templates:', selectedTemplates);
    return selectedTemplates;
}

/**
 * Get all currently selected workout templates
 * @returns {Array} Array of template IDs
 */
function getSelectedWorkoutTemplates() {
    const selectedTemplates = [];
    const checkboxes = document.querySelectorAll('#workoutTemplatesTableBody input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedTemplates.push(checkbox.dataset.templateId);
    });
    
    console.log('Selected workout templates:', selectedTemplates);
    return selectedTemplates;
}

/**
 * Save selected workout templates to session storage and update plan in backend
 * @returns {Promise} Promise that resolves when templates are saved
 */
function saveWorkoutTemplateSelections() {
    console.log('saveWorkoutTemplateSelections() called');
    // Get current plan ID
    const planId = sessionStorage.getItem('currentPlanId');
    console.log('Current plan ID for workout template selection:', planId);
    
    if (!planId) {
        const error = new Error('Please create a plan first');
        showToast('error', error.message);
        return Promise.reject(error);
    }
    
    // Get selected template IDs
    const selectedTemplateIds = getSelectedWorkoutTemplates();
    
    // If no templates selected, show error
    if (selectedTemplateIds.length === 0) {
        const error = new Error('Please select at least one workout template');
        showToast('error', error.message);
        return Promise.reject(error);
    }
    
    // Save to session storage
    sessionStorage.setItem('selectedWorkoutTemplates', JSON.stringify(selectedTemplateIds));
    
    // Show loading state on next button
    const nextBtn = document.getElementById('nextToMealTemplates');
    const originalBtnText = nextBtn.innerHTML;
    nextBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    nextBtn.disabled = true;
    
    // Update plan with selected templates
    console.log('Updating plan with workout templates:', selectedTemplateIds);
    return CoachPlanAPI.productPlans.update(planId, {
        workout_templates: selectedTemplateIds
    })
    .then(response => {
        console.log('Plan updated with workout templates successfully:', response);
        // Mark step as complete
        updateStepStatus('workout-templates', 'complete');
        
        // Reset button state
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        
        return response;
    })
    .catch(error => {
        console.error('Error saving workout templates:', error);
        
        // Reset button state
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        
        // Show error toast
        showToast('error', 'Failed to save workout templates: ' + (error.message || 'Unknown error'));
        
        return Promise.reject(error);
    });
}

/**
 * Save selected meal templates to session storage and update plan in backend
 * @returns {Promise} Promise that resolves when templates are saved
 */
function saveMealTemplateSelections() {
    console.log('saveMealTemplateSelections() called');
    // Get current plan ID
    const planId = sessionStorage.getItem('currentPlanId');
    console.log('Retrieved plan ID from sessionStorage:', planId);
    if (!planId) {
        const error = new Error('Please create a plan first');
        showToast('error', error.message);
        return Promise.reject(error);
    }
    
    // Get selected template IDs
    const selectedTemplateIds = getSelectedMealTemplates();
    
    // If no templates selected, show error
    if (selectedTemplateIds.length === 0) {
        showToast('error', 'Please select at least one meal template');
        return Promise.reject(new Error('No templates selected'));
    }
    
    // Save to session storage
    sessionStorage.setItem('selectedMealTemplates', JSON.stringify(selectedTemplateIds));
    
    // Show loading state on next button
    const nextBtn = document.getElementById('nextToReview');
    const originalBtnText = nextBtn.innerHTML;
    nextBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    nextBtn.disabled = true;
    
    // Update plan with selected templates
    console.log('Updating plan with meal templates:', selectedTemplateIds);
    return CoachPlanAPI.productPlans.update(planId, {
        meal_templates: selectedTemplateIds
    })
    .then(response => {
        console.log('Plan updated with meal templates successfully:', response);
        // Mark step as complete
        updateStepStatus('meal-templates', 'complete');
        
        // Reset button state
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        
        return response;
    })
    .catch(error => {
        console.error('Error saving meal template selections:', error);
        showToast('error', 'Failed to save meal template selections');
        throw error;
    })
    .finally(() => {
        // Restore button state
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
    });
}

/**
 * Load meal templates from the API
 */
function loadMealTemplates() {
    const tableBody = document.getElementById('mealTemplatesTableBody');
    const loadingIndicator = document.getElementById('mealTemplatesLoading');
    const emptyState = document.getElementById('noMealTemplates');
    
    // Show loading state
    if (tableBody) tableBody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Get plan ID from session storage
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    
    // If no current plan ID, go back to basics step
    if (!currentPlanId) {
        showToast('error', 'Please create a plan first');
        setTimeout(() => {
            document.getElementById('plan-basics-tab').click();
        }, 1000);
        return;
    }
    
    // Fetch templates from API
    CoachPlanAPI.mealTemplates.getAll()
        .then(templates => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Filter templates if needed (e.g., by coach ID or other criteria)
            // This could be implemented later if needed
            
            if (!templates || templates.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            // Save to session storage for plan creation workflow
            sessionStorage.setItem('mealTemplates', JSON.stringify(templates));
            
            // Render templates in table
            renderMealTemplatesTable(templates);
            
            // Load saved selected templates if they exist
            const selectedTemplates = JSON.parse(sessionStorage.getItem('selectedMealTemplates') || '[]');
            if (selectedTemplates.length > 0) {
                // Mark checkboxes for selected templates
                selectedTemplates.forEach(templateId => {
                    const checkbox = document.querySelector(`#mealTemplatesTableBody input[data-template-id="${templateId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
                
                // Update selected count display
                updateSelectedMealTemplatesCount();
                
                // Mark step as complete
                updateStepStatus('meal-templates', 'complete');
            }
        })
        .catch(error => {
            console.error('Error loading meal templates:', error);
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-circle-fill me-2"></i>
                        Failed to load meal templates. Please try again.
                    </div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="loadMealTemplates()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Try Again
                    </button>
                `;
            }
        });
}

function showMealTemplateEditor(templateId = null) {
    // Hide template list and show editor
    document.getElementById('mealTemplateEditor').style.display = 'block';
    document.querySelector('.meal-templates-container').style.display = 'none';
    
    // Clear previous form data
    document.getElementById('mealTemplateName').value = '';
    document.getElementById('mealTemplateCategory').value = '';
    document.getElementById('mealTemplateType').value = 'lunch';
    document.getElementById('mealTemplateCalories').value = '';
    document.getElementById('mealTemplateProtein').value = '';
    document.getElementById('mealTemplateCarbs').value = '';
    document.getElementById('mealTemplateFat').value = '';
    document.getElementById('mealTemplateDescription').value = '';
    document.getElementById('mealTemplateInstructions').value = '';
    document.getElementById('ingredientsContainer').innerHTML = '';
    
    currentMealTemplateId = null;
    ingredients = [];
    
    // If editing an existing template, load its data
    if (templateId) {
        currentMealTemplateId = templateId;
        
        // Show loading state
        document.getElementById('ingredientsContainer').innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading template...</span>
                </div>
            </div>
        `;
        
        // Fetch the template data
        CoachPlanAPI.mealTemplates.getById(templateId)
            .then(template => {
                currentMealTemplate = template;
                
                // Fill the form with template data
                document.getElementById('mealTemplateName').value = template.name;
                document.getElementById('mealTemplateCategory').value = template.category || '';
                document.getElementById('mealTemplateType').value = template.meal_type || 'lunch';
                document.getElementById('mealTemplateCalories').value = template.calories || '';
                document.getElementById('mealTemplateProtein').value = template.protein || '';
                document.getElementById('mealTemplateCarbs').value = template.carbs || '';
                document.getElementById('mealTemplateFat').value = template.fat || '';
                document.getElementById('mealTemplateDescription').value = template.description || '';
                document.getElementById('mealTemplateInstructions').value = template.instructions || '';
                
                // Load ingredients
                document.getElementById('ingredientsContainer').innerHTML = '';
                if (template.structure && template.structure.ingredients) {
                    ingredients = template.structure.ingredients;
                    ingredients.forEach((ingredient, index) => {
                        addIngredientToUI(ingredient, index);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading meal template:', error);
                showToast('error', 'Failed to load meal template');
                hideMealTemplateEditor();
            });
    } else {
        // Add an empty ingredient to start with
        addIngredient();
    }
}

function hideMealTemplateEditor() {
    document.getElementById('mealTemplateEditor').style.display = 'none';
    document.querySelector('.meal-templates-container').style.display = 'block';
    document.getElementById('mealTemplatePreview').style.display = 'none';
}

function addIngredient() {
    const ingredient = {
        name: '',
        quantity: '',
        unit: 'g',
        notes: ''
    };
    
    ingredients.push(ingredient);
    addIngredientToUI(ingredient, ingredients.length - 1);
}

function addIngredientToUI(ingredient, ingredientIndex) {
    const container = document.getElementById('ingredientsContainer');
    
    const ingredientElement = document.createElement('div');
    ingredientElement.className = 'ingredient-item border rounded p-2 mb-2';
    ingredientElement.dataset.ingredientIndex = ingredientIndex;
    
    ingredientElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="input-group" style="max-width: 70%;">
                <span class="input-group-text">Name</span>
                <input type="text" class="form-control ingredient-name" value="${ingredient.name || ''}">
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-ingredient-btn">
                <i class="bi bi-x-circle"></i>
            </button>
        </div>
        
        <div class="row g-2">
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Quantity</span>
                    <input type="text" class="form-control ingredient-quantity" value="${ingredient.quantity || ''}">
                </div>
            </div>
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Unit</span>
                    <select class="form-select ingredient-unit">
                        <option value="g" ${ingredient.unit === 'g' ? 'selected' : ''}>g</option>
                        <option value="kg" ${ingredient.unit === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="ml" ${ingredient.unit === 'ml' ? 'selected' : ''}>ml</option>
                        <option value="l" ${ingredient.unit === 'l' ? 'selected' : ''}>l</option>
                        <option value="cup" ${ingredient.unit === 'cup' ? 'selected' : ''}>cup</option>
                        <option value="tbsp" ${ingredient.unit === 'tbsp' ? 'selected' : ''}>tbsp</option>
                        <option value="tsp" ${ingredient.unit === 'tsp' ? 'selected' : ''}>tsp</option>
                        <option value="oz" ${ingredient.unit === 'oz' ? 'selected' : ''}>oz</option>
                        <option value="piece" ${ingredient.unit === 'piece' ? 'selected' : ''}>piece</option>
                    </select>
                </div>
            </div>
            <div class="col-md-4">
                <div class="input-group input-group-sm">
                    <span class="input-group-text">Calories</span>
                    <input type="number" class="form-control ingredient-calories" min="0" value="${ingredient.calories || ''}">
                </div>
            </div>
        </div>
        
        <div class="mt-2">
            <textarea class="form-control form-control-sm ingredient-notes" placeholder="Notes">${ingredient.notes || ''}</textarea>
        </div>
    `;
    
    // Add event listeners
    ingredientElement.querySelector('.remove-ingredient-btn').addEventListener('click', () => {
        removeIngredient(ingredientIndex);
    });
    
    // Add change event listeners for all inputs
    ingredientElement.querySelector('.ingredient-name').addEventListener('change', (e) => {
        ingredients[ingredientIndex].name = e.target.value;
    });
    
    ingredientElement.querySelector('.ingredient-quantity').addEventListener('change', (e) => {
        ingredients[ingredientIndex].quantity = e.target.value;
    });
    
    ingredientElement.querySelector('.ingredient-unit').addEventListener('change', (e) => {
        ingredients[ingredientIndex].unit = e.target.value;
    });
    
    ingredientElement.querySelector('.ingredient-calories').addEventListener('change', (e) => {
        ingredients[ingredientIndex].calories = e.target.value ? parseInt(e.target.value) : '';
    });
    
    ingredientElement.querySelector('.ingredient-notes').addEventListener('change', (e) => {
        ingredients[ingredientIndex].notes = e.target.value;
    });
    
    container.appendChild(ingredientElement);
}

function removeIngredient(ingredientIndex) {
    // Remove from the data structure
    ingredients.splice(ingredientIndex, 1);
    
    // Rebuild the ingredients list
    const container = document.getElementById('ingredientsContainer');
    container.innerHTML = '';
    
    ingredients.forEach((ingredient, index) => {
        addIngredientToUI(ingredient, index);
    });
}

function saveMealTemplate() {
    // Validate form
    const name = document.getElementById('mealTemplateName').value;
    if (!name) {
        showToast('error', 'Template name is required');
        return;
    }
    
    // Check if ingredients are added
    if (ingredients.length === 0) {
        showToast('error', 'Add at least one ingredient to the template');
        return;
    }
    
    // Collect form data
    const templateData = {
        name: name,
        description: document.getElementById('mealTemplateDescription').value,
        category: document.getElementById('mealTemplateCategory').value,
        meal_type: document.getElementById('mealTemplateType').value,
        calories: document.getElementById('mealTemplateCalories').value ? parseInt(document.getElementById('mealTemplateCalories').value) : null,
        protein: document.getElementById('mealTemplateProtein').value ? parseInt(document.getElementById('mealTemplateProtein').value) : null,
        carbs: document.getElementById('mealTemplateCarbs').value ? parseInt(document.getElementById('mealTemplateCarbs').value) : null,
        fat: document.getElementById('mealTemplateFat').value ? parseInt(document.getElementById('mealTemplateFat').value) : null,
        instructions: document.getElementById('mealTemplateInstructions').value,
        structure: {
            ingredients: ingredients
        }
    };
    
    // Show loading state
    const saveBtn = document.getElementById('saveMealTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    // Save template
    let apiCall;
    if (currentMealTemplateId) {
        apiCall = CoachPlanAPI.mealTemplates.update(currentMealTemplateId, templateData);
    } else {
        apiCall = CoachPlanAPI.mealTemplates.create(templateData);
    }
    
    apiCall
        .then(template => {
            showToast('success', `Meal template ${currentMealTemplateId ? 'updated' : 'created'} successfully`);
            hideMealTemplateEditor();
            loadMealTemplates(); // Refresh the templates list
        })
        .catch(error => {
            console.error('Error saving meal template:', error);
            showToast('error', `Failed to ${currentMealTemplateId ? 'update' : 'create'} meal template`);
        })
        .finally(() => {
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        });
}

function collectTemplateFormData(type) {
    // Implementation for collecting form data based on template type
    const formData = {
        name: document.getElementById('templateName').value,
        description: document.getElementById('templateDescription').value
    };
    
    switch (type) {
        case 'workout':
            formData.difficulty = parseInt(document.getElementById('templateDifficulty').value);
            formData.category = document.getElementById('templateCategory').value;
            // Collect exercise blocks data
            break;
        case 'meal':
            formData.category = document.getElementById('templateCategory').value;
            formData.meal_type = document.getElementById('mealType').value;
            formData.calories = document.getElementById('calories').value;
            formData.protein = document.getElementById('protein').value;
            formData.carbs = document.getElementById('carbs').value;
            formData.fat = document.getElementById('fat').value;
            // Collect ingredients data
            break;
        case 'plan':
            formData.plan_type = document.getElementById('templateType').value;
            formData.difficulty = parseInt(document.getElementById('templateDifficulty').value);
            // Collect plan structure data
            break;
    }
    
    return formData;
}

// Helper function to map numeric difficulty to string values
function getDifficultyLevelString(difficultyValue) {
    const difficultyMap = {
        '1': 'beginner',
        '2': 'intermediate',  // Note: 'Easy' maps to 'intermediate' level
        '3': 'intermediate',  // 'Moderate' also maps to 'intermediate'
        '4': 'advanced',      // 'Challenging' maps to 'advanced'
        '5': 'expert'         // 'Advanced' maps to 'expert'
    };
    
    return difficultyMap[difficultyValue] || 'intermediate';
}

// Get a valid renewal period value
function getValidRenewalPeriod(renewalValue) {
    // Valid choices are: 'monthly', 'quarterly', 'semi_annual', 'annual'
    const validRenewalPeriods = ['monthly', 'quarterly', 'semi_annual', 'annual'];
    return validRenewalPeriods.includes(renewalValue) ? renewalValue : 'monthly';
}

// Calculate start and end dates based on duration
function calculatePlanDates(durationDays) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    // Format dates as YYYY-MM-DD
    return {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
    };
}

// Calculate session count and price per session
function calculateSessionMetrics(durationDays, workoutDaysPerWeek, totalPrice) {
    const weeks = durationDays / 7;
    const sessionCount = Math.max(1, Math.round(weeks * workoutDaysPerWeek));
    const pricePerSession = sessionCount > 0 ? totalPrice / sessionCount : totalPrice;
    
    return {
        session_count: sessionCount,
        price_per_session: pricePerSession.toFixed(2)
    };
}

// Plan Creation Handling
function savePlanBasics() {
    console.log('savePlanBasics() called');
    // Show loading state on the next button
    const nextBtn = document.getElementById('nextToStructure');
    const originalBtnText = nextBtn.innerHTML;
    nextBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    nextBtn.disabled = true;
    
    // Validate required fields
    const requiredFields = [
        { id: 'planName', label: 'Plan Name' },
        { id: 'planType', label: 'Plan Type' },
        { id: 'planDuration', label: 'Duration' },
        { id: 'planPrice', label: 'Price' },
        { id: 'planDescription', label: 'Description' }
    ];
    
    let isValid = true;
    let firstInvalidField = null;
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        const value = element.value.trim();
        
        if (!value) {
            isValid = false;
            if (!firstInvalidField) firstInvalidField = element;
            element.classList.add('is-invalid');
            
            // Add or update invalid feedback message
            let feedback = element.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                element.parentNode.insertBefore(feedback, element.nextSibling);
            }
            feedback.textContent = `${field.label} is required`;
        } else {
            element.classList.remove('is-invalid');
            const feedback = element.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.remove();
            }
        }
    });
    
    // Validate numeric fields
    const numericFields = [
        { id: 'planDuration', min: 1, label: 'Duration' },
        { id: 'planPrice', min: 0, label: 'Price' }
    ];
    
    numericFields.forEach(field => {
        const element = document.getElementById(field.id);
        const value = parseFloat(element.value);
        
        if (isNaN(value) || value < field.min) {
            isValid = false;
            if (!firstInvalidField) firstInvalidField = element;
            element.classList.add('is-invalid');
            
            let feedback = element.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                element.parentNode.insertBefore(feedback, element.nextSibling);
            }
            feedback.textContent = `${field.label} must be a number ${field.min > 0 ? 'greater than ' + field.min : ''}`;
        }
    });
    
    if (!isValid) {
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        firstInvalidField.focus();
        return Promise.reject(new Error('Validation failed'));
    }
    
    // Collect form data
    const duration = parseInt(document.getElementById('planDuration').value);
    const price = parseFloat(document.getElementById('planPrice').value);
    const workoutDaysPerWeek = 5; // Default value, will be updated in plan structure step
    
    // Calculate dates, session count and price per session
    const dates = calculatePlanDates(duration);
    const sessionMetrics = calculateSessionMetrics(duration, workoutDaysPerWeek, price);
    
    const planData = {
        name: document.getElementById('planName').value.trim(),
        plan_type: document.getElementById('planType').value,
        difficulty_level: getDifficultyLevelString(document.getElementById('difficultyLevel').value),
        duration: duration,
        max_clients: document.getElementById('maxClients').value || null,
        price: price,
        renewal_period: getValidRenewalPeriod(document.getElementById('renewalPeriod').value),
        description: document.getElementById('planDescription').value.trim(),
        is_active: document.getElementById('isActive').checked,
        workout_days_per_week: workoutDaysPerWeek,
        // Add missing required fields
        start_date: dates.start_date,
        end_date: dates.end_date,
        session_count: sessionMetrics.session_count,
        price_per_session: sessionMetrics.price_per_session
    };
    
    // Store in session storage for persistence between page reloads
    sessionStorage.setItem('planBasics', JSON.stringify(planData));
    
    // Save to API
    let apiCall;
    if (currentPlanId) {
        apiCall = CoachPlanAPI.productPlans.update(currentPlanId, planData);
    } else {
        apiCall = CoachPlanAPI.productPlans.create(planData);
    }
    
    return apiCall
        .then(plan => {
            // Set the current plan ID and store it in sessionStorage for persistence
            currentPlanId = plan.id;
            sessionStorage.setItem('currentPlanId', plan.id);
            console.log('Plan saved successfully. Plan ID:', plan.id);
            
            // Update step status icon to completed
            document.querySelector('#plan-basics-tab .step-status i').className = 'bi bi-check-circle-fill text-success';
            
            return plan;
        })
        .catch(error => {
            console.error('Error saving plan basics:', error);
            
            // Extract error message from API response if available
            let errorMessage = 'Failed to save plan basics. Please check your inputs and try again.';
            let validationErrors = [];
            
            try {
                // Try to parse the error to handle different formats
                if (error && error.errorJSON) {
                    // Handle structured error responses
                    if (error.errorJSON.type === 'validation_error' && Array.isArray(error.errorJSON.errors)) {
                        // Process DRF validation error format
                        error.errorJSON.errors.forEach(err => {
                            if (err.attr && err.detail) {
                                validationErrors.push(`${err.attr.replace(/_/g, ' ')}: ${err.detail}`);
                                
                                // Try to map field name to form field ID
                                const fieldMappings = {
                                    'price_per_session': 'planPrice',
                                    'session_count': 'planDuration',
                                    'start_date': null, // Calculated field, not directly in form
                                    'end_date': null,   // Calculated field, not directly in form
                                    'renewal_period': 'renewalPeriod'
                                };
                                
                                const fieldId = fieldMappings[err.attr] || 
                                               err.attr.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
                                
                                const fieldElement = document.getElementById(fieldId);
                                if (fieldElement) {
                                    fieldElement.classList.add('is-invalid');
                                    
                                    let feedback = fieldElement.nextElementSibling;
                                    if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                                        feedback = document.createElement('div');
                                        feedback.className = 'invalid-feedback';
                                        fieldElement.parentNode.insertBefore(feedback, fieldElement.nextSibling);
                                    }
                                    feedback.textContent = err.detail;
                                }
                            }
                        });
                        
                        if (validationErrors.length > 0) {
                            errorMessage = `Please fix the following issues:\n${validationErrors.join('\n')}`;
                        }
                    } else if (typeof error.errorJSON === 'object') {
                        // Handle standard Django REST Framework field-specific errors
                        const fieldErrors = [];
                        for (const [field, errors] of Object.entries(error.errorJSON)) {
                            const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            if (Array.isArray(errors)) {
                                fieldErrors.push(`${fieldName}: ${errors.join(', ')}`);
                            } else {
                                fieldErrors.push(`${fieldName}: ${errors}`);
                            }
                            
                            // Also mark field as invalid in the form
                            const fieldElement = document.getElementById(field) || 
                                               document.getElementById(field.replace(/_([a-z])/g, g => g[1].toUpperCase()));
                            if (fieldElement) {
                                fieldElement.classList.add('is-invalid');
                                
                                let feedback = fieldElement.nextElementSibling;
                                if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                                    feedback = document.createElement('div');
                                    feedback.className = 'invalid-feedback';
                                    fieldElement.parentNode.insertBefore(feedback, fieldElement.nextSibling);
                                }
                                feedback.textContent = Array.isArray(errors) ? errors.join(', ') : errors;
                            }
                        }
                        
                        if (fieldErrors.length > 0) {
                            errorMessage = `Please fix the following issues:\n${fieldErrors.join('\n')}`;
                        }
                    }
                } else if (error.error) {
                    errorMessage = error.error;
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }

            if (error && error.message) {
                errorMessage = error.message;
            }
            
            showToast('error', errorMessage);
            throw error;
        })
        .finally(() => {
            nextBtn.innerHTML = originalBtnText;
            nextBtn.disabled = false;
        });
}

function savePlanStructure() {
    // Show loading state on the next button
    const nextBtn = document.getElementById('nextToWorkoutTemplate');
    const originalBtnText = nextBtn.innerHTML;
    nextBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    nextBtn.disabled = true;
    
    if (!currentPlanId) {
        showToast('error', 'Please complete the Plan Basics section first');
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        
        // Navigate back to Plan Basics tab
        document.getElementById('plan-basics-tab').click();
        return Promise.reject(new Error('No current plan ID'));
    }
    
    // Validate numeric inputs
    const numericFields = [
        { id: 'workoutDaysPerWeek', min: 0, max: 7, label: 'Workout Days Per Week' },
        { id: 'mealsPerDay', min: 0, max: 10, label: 'Meals Per Day' },
        { id: 'snacksPerDay', min: 0, max: 10, label: 'Snacks Per Day' }
    ];
    
    let isValid = true;
    let firstInvalidField = null;
    
    numericFields.forEach(field => {
        const element = document.getElementById(field.id);
        const value = parseInt(element.value);
        
        if (isNaN(value) || value < field.min || value > field.max) {
            isValid = false;
            if (!firstInvalidField) firstInvalidField = element;
            element.classList.add('is-invalid');
            
            let feedback = element.nextElementSibling;
            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                element.parentNode.insertBefore(feedback, element.nextSibling);
            }
            feedback.textContent = `${field.label} must be between ${field.min} and ${field.max}`;
        } else {
            element.classList.remove('is-invalid');
            const feedback = element.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.remove();
            }
        }
    });
    
    if (!isValid) {
        nextBtn.innerHTML = originalBtnText;
        nextBtn.disabled = false;
        firstInvalidField.focus();
        return Promise.reject(new Error('Validation failed'));
    }
    
    // Collect structure data
    const structureData = {
        workout_days_per_week: parseInt(document.getElementById('workoutDaysPerWeek').value),
        meals_per_day: parseInt(document.getElementById('mealsPerDay').value),
        snacks_per_day: parseInt(document.getElementById('snacksPerDay').value)
    };
    
    // Store in session storage for persistence
    sessionStorage.setItem('planStructure', JSON.stringify(structureData));
    
    // Save to API
    return CoachPlanAPI.productPlans.update(currentPlanId, structureData)
        .then(plan => {
            // Update plan structure in memory
            if (window.planData) {
                window.planData = {...window.planData, ...structureData};
            } else {
                window.planData = structureData;
            }
            
            // Update step status icon to completed
            document.querySelector('#plan-structure-tab .step-status i').className = 'bi bi-check-circle-fill text-success';
            
            return plan;
        })
        .catch(error => {
            console.error('Error saving plan structure:', error);
            
            // Extract error message from API response if available
            let errorMessage = 'Failed to save plan structure. Please try again.';
            
            if (error && error.errorJSON) {
                // Handle structured error responses
                if (typeof error.errorJSON === 'object') {
                    // Django REST Framework often returns field-specific errors
                    const fieldErrors = [];
                    for (const [field, errors] of Object.entries(error.errorJSON)) {
                        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        if (Array.isArray(errors)) {
                            fieldErrors.push(`${fieldName}: ${errors.join(', ')}`);
                        } else {
                            fieldErrors.push(`${fieldName}: ${errors}`);
                        }
                        
                        // Also mark field as invalid in the form
                        const fieldElement = document.getElementById(field) || 
                                           document.getElementById(field.replace(/_([a-z])/g, g => g[1].toUpperCase()));
                        if (fieldElement) {
                            fieldElement.classList.add('is-invalid');
                            
                            let feedback = fieldElement.nextElementSibling;
                            if (!feedback || !feedback.classList.contains('invalid-feedback')) {
                                feedback = document.createElement('div');
                                feedback.className = 'invalid-feedback';
                                fieldElement.parentNode.insertBefore(feedback, fieldElement.nextSibling);
                            }
                            feedback.textContent = Array.isArray(errors) ? errors.join(', ') : errors;
                        }
                    }
                    
                    if (fieldErrors.length > 0) {
                        errorMessage = `Please fix the following issues:\n${fieldErrors.join('\n')}`;
                    }
                } else if (error.error) {
                    errorMessage = error.error;
                }
            } else if (error && error.message) {
                errorMessage = error.message;
            }
            
            showToast('error', errorMessage);
            throw error;
        })
        .finally(() => {
            nextBtn.innerHTML = originalBtnText;
            nextBtn.disabled = false;
        });
}

function saveWorkoutTemplate() {
    console.log('saveWorkoutTemplate called');
    
    // Get form data
    const form = document.getElementById('workoutTemplateForm');
    
    // Check form validity
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get template data
    const templateData = {
        name: document.getElementById('workoutTemplateName').value,
        category: document.getElementById('workoutTemplateCategory').value,
        difficulty: parseInt(document.getElementById('workoutTemplateDifficulty').value) || 3,
        duration: parseInt(document.getElementById('workoutTemplateDuration').value) || 45,
        description: document.getElementById('workoutTemplateDescription').value,
        instructions: document.getElementById('workoutTemplateInstructions').value,
        exercise_blocks: []
    };
    
    // Get coach profile ID
    const coachProfileId = getCoachProfileId();
    if (!coachProfileId) {
        showToast('error', 'Could not determine coach profile ID');
        return;
    }
    templateData.coach_profile = coachProfileId;
    
    // Get template ID if editing
    const templateId = document.getElementById('workoutTemplateId')?.value;
    
    // Get exercise blocks
    const blockElements = document.querySelectorAll('.exercise-block');
    blockElements.forEach((blockElem, blockIndex) => {
        const blockNameInput = blockElem.querySelector('.block-name');
        const blockInstructionsInput = blockElem.querySelector('.block-instructions');
        
        const block = {
            name: blockNameInput?.value || `Block ${blockIndex + 1}`,
            instructions: blockInstructionsInput?.value || '',
            order: blockIndex,
            exercises: []
        };
        
        // Get exercises in this block
        const exerciseElements = blockElem.querySelectorAll('.exercise-item');
        exerciseElements.forEach((exerciseElem, exerciseIndex) => {
            const exercise = {
                name: exerciseElem.querySelector('.exercise-name')?.value || '',
                muscle_group: exerciseElem.querySelector('.muscle-group')?.value || '',
                sets: parseInt(exerciseElem.querySelector('.sets')?.value) || 1,
                reps: exerciseElem.querySelector('.reps')?.value || '',
                rest: parseInt(exerciseElem.querySelector('.rest')?.value) || 0,
                instructions: exerciseElem.querySelector('.exercise-instructions')?.value || '',
                order: exerciseIndex
            };
            
            // Add exercise to block if it has a name
            if (exercise.name.trim()) {
                block.exercises.push(exercise);
            }
        });
        
        // Add block to template if it has a name and at least one exercise
        if (block.name.trim() && block.exercises.length > 0) {
            templateData.exercise_blocks.push(block);
        }
    });
    
    // Validate template data
    if (!templateData.name.trim()) {
        showToast('error', 'Template name is required');
        return;
    }
    
    if (templateData.exercise_blocks.length === 0) {
        showToast('error', 'At least one exercise block with exercises is required');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveWorkoutTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    // Save template
    const apiMethod = templateId ? 
        () => CoachPlanAPI.workoutTemplates.update(templateId, templateData) : 
        () => CoachPlanAPI.workoutTemplates.create(templateData);
    
    apiMethod()
        .then(response => {
            console.log('Workout template saved:', response);
            showToast('success', 'Workout template saved successfully');
            
            // Reset form
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
            
            // Hide editor and show templates list
            document.getElementById('workoutTemplateEditor').style.display = 'none';
            document.querySelector('.workout-templates-container').style.display = 'block';
            
            // Reload templates
            loadWorkoutTemplates();
        })
        .catch(error => {
            console.error('Error saving workout template:', error);
            showToast('error', `Failed to save workout template: ${error.message || 'Unknown error'}`);
            
            // Reset button
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        });
}

/**
 * Initialize Bootstrap tooltips on the page
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize Bootstrap popovers on the page
 */
function initPopovers() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// Event Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize popovers and tooltips
    initTooltips();
    initPopovers();
    
    // Attach event listener to Save Template button in modal
    document.getElementById('saveTemplateBtn').addEventListener('click', function() {
        const modalTitle = document.getElementById('templateModalLabel').textContent;
        if (modalTitle.includes('Workout')) {
            saveWorkoutTemplate();
        } else if (modalTitle.includes('Meal')) {
            saveMealTemplate();
        }
    });
    
    // Retrieve plan ID from sessionStorage if it exists
    currentPlanId = sessionStorage.getItem('currentPlanId');
    console.log('Initialized with plan ID from sessionStorage:', currentPlanId);
    // Tooltips already initialized
    
    // Initial load of workout templates if on that tab
    if (document.getElementById('workout-template')) {
        loadWorkoutTemplates();
    }
    
    // Setup workout templates navigation buttons
    const nextToMealTemplatesBtn = document.getElementById('nextToMealTemplates');
    if (nextToMealTemplatesBtn) {
        nextToMealTemplatesBtn.addEventListener('click', function() {
            console.log('Next to meal templates button clicked');
            saveWorkoutTemplateSelections()
                .then(() => {
                    console.log('Workout templates saved successfully, proceeding to meal templates tab');
                    showToast('success', 'Workout templates saved successfully');
                    document.getElementById('meal-template-tab').click();
                })
                .catch(error => {
                    console.error('Failed to save workout templates:', error);
                    // Error already shown in saveWorkoutTemplateSelections
                });
        });
    }
    
    const backToStructureBtn = document.getElementById('backToStructure');
    if (backToStructureBtn) {
        backToStructureBtn.addEventListener('click', function() {
            document.getElementById('plan-structure-tab').click();
        });
    }
    
    // Setup Select All checkbox for workout templates
    const selectAllWorkoutTemplates = document.getElementById('selectAllWorkoutTemplates');
    if (selectAllWorkoutTemplates) {
        selectAllWorkoutTemplates.addEventListener('change', function() {
            const isChecked = this.checked;
            const checkboxes = document.querySelectorAll('#workoutTemplatesTableBody input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            updateSelectedWorkoutTemplatesCount();
        });
    }
    
    // Setup empty state create template button
    const emptyStateCreateTemplateBtn = document.getElementById('emptyStateCreateTemplate');
    if (emptyStateCreateTemplateBtn) {
        emptyStateCreateTemplateBtn.addEventListener('click', function() {
            showWorkoutTemplateEditor();
        });
    }
    
    // Setup empty state create meal template button
    const emptyStateCreateMealTemplateBtn = document.getElementById('emptyStateCreateMealTemplate');
    if (emptyStateCreateMealTemplateBtn) {
        emptyStateCreateMealTemplateBtn.addEventListener('click', function() {
            showMealTemplateEditor();
        });
    }
    
    // Setup Select All checkbox for meal templates
    const selectAllMealTemplates = document.getElementById('selectAllMealTemplates');
    if (selectAllMealTemplates) {
        selectAllMealTemplates.addEventListener('change', function() {
            const isChecked = this.checked;
            const checkboxes = document.querySelectorAll('#mealTemplatesTableBody input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            
            updateSelectedMealTemplatesCount();
        });
    }
    
    // Initialize components
    loadTemplates();
    
    // Navigation between steps
    document.getElementById('nextToStructure').addEventListener('click', function() {
        savePlanBasics()
            .then(() => {
                showToast('success', 'Plan basics saved successfully');
                document.getElementById('plan-structure-tab').click();
            })
            .catch(error => console.error('Error saving plan basics:', error));
    });
    
    document.getElementById('backToBasics').addEventListener('click', function() {
        document.getElementById('plan-basics-tab').click();
    });
    
    document.getElementById('nextToWorkoutTemplate').addEventListener('click', function() {
        savePlanStructure()
            .then(() => {
                showToast('success', 'Plan structure saved successfully');
                document.getElementById('workout-template-tab').click();
            })
            .catch(error => console.error('Error saving plan structure:', error));
    });
    
    document.getElementById('backToStructure').addEventListener('click', function() {
        document.getElementById('plan-structure-tab').click();
    });
    
    document.getElementById('nextToMealTemplate').addEventListener('click', function() {
        // Save workout templates association if needed
        document.getElementById('meal-template-tab').click();
    });
    
    document.getElementById('backToWorkoutTemplate').addEventListener('click', function() {
        document.getElementById('workout-template-tab').click();
    });
    
    document.getElementById('nextToPlanReview').addEventListener('click', function() {
        // Save meal templates association if needed
        document.getElementById('plan-review-tab').click();
        loadPlanReview();
    });
    
    document.getElementById('backToMealTemplate').addEventListener('click', function() {
        document.getElementById('meal-template-tab').click();
    });
    
    document.getElementById('publishPlanBtn').addEventListener('click', function() {
        publishPlan();
    });
    
    // Workout template handling
    document.getElementById('createWorkoutTemplateBtn').addEventListener('click', function() {
        showWorkoutTemplateEditor();
    });
    
    document.getElementById('cancelWorkoutTemplateBtn').addEventListener('click', function() {
        hideWorkoutTemplateEditor();
    });
    
    document.getElementById('addExerciseBlockBtn').addEventListener('click', function() {
        addExerciseBlock();
    });
    
    document.getElementById('workoutTemplateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveWorkoutTemplate();
    });
    
    // Meal templates tab activation
    document.getElementById('meal-template-tab').addEventListener('click', function() {
        loadMealTemplates();
    });
    
    // Setup meal templates navigation buttons
    const nextToReviewBtn = document.getElementById('nextToReview');
    if (nextToReviewBtn) {
        nextToReviewBtn.addEventListener('click', function() {
            saveMealTemplateSelections()
                .then(() => {
                    showToast('success', 'Meal templates saved successfully');
                    document.getElementById('plan-review-tab').click();
                })
                .catch(error => {
                    // Error already shown in saveMealTemplateSelections
                });
        });
    }
    
    const backToWorkoutTemplatesBtn = document.getElementById('backToWorkoutTemplates');
    if (backToWorkoutTemplatesBtn) {
        backToWorkoutTemplatesBtn.addEventListener('click', function() {
            document.getElementById('workout-templates-tab').click();
        });
    }
    
    document.getElementById('cancelMealTemplateBtn').addEventListener('click', function() {
        hideMealTemplateEditor();
    });
    
    // Meal template handling
    document.getElementById('createMealTemplateBtn').addEventListener('click', function() {
        showMealTemplateEditor();
    });
    
    document.getElementById('addIngredientBtn').addEventListener('click', function() {
        addIngredient();
    });
    
    document.getElementById('mealTemplateForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMealTemplate();
    });
    
    // Calculator for workout vs rest days
    document.getElementById('workoutDaysPerWeek').addEventListener('change', updateWorkoutDaysCalculation);
    updateWorkoutDaysCalculation();
    
    // Load initial data
    loadWorkoutTemplates();
    loadMealTemplates();
});

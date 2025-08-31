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

// API endpoints
const API_ENDPOINTS = {
    productPlans: '/api/coach/product-plans/',
    planTemplates: '/api/coach/plan-templates/',
    workoutTemplates: '/api/coach/workout-templates/',
    exerciseTemplates: '/api/coach/exercise-templates/',
    mealTemplates: '/api/coach/meal-templates/',
};

// JWT token handling
function getAuthToken() {
    return localStorage.getItem('token');
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
    };
}

// API functions
const PlanAPI = {
    // Product Plans
    async createPlan(planData) {
        try {
            const response = await fetch(API_ENDPOINTS.productPlans, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            });
            
            if (!response.ok) throw new Error(`Error creating plan: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error creating plan:', error);
            showToast('error', 'Failed to create plan');
            throw error;
        }
    },
    
    async updatePlan(planId, planData) {
        try {
            const response = await fetch(`${API_ENDPOINTS.productPlans}${planId}/`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(planData)
            });
            
            if (!response.ok) throw new Error(`Error updating plan: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error updating plan:', error);
            showToast('error', 'Failed to update plan');
            throw error;
        }
    },
    
    async duplicatePlan(planId) {
        try {
            const response = await fetch(`${API_ENDPOINTS.productPlans}${planId}/duplicate/`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error(`Error duplicating plan: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error duplicating plan:', error);
            showToast('error', 'Failed to duplicate plan');
            throw error;
        }
    },
    
    // Templates
    async fetchTemplates(templateType) {
        let endpoint;
        switch (templateType) {
            case 'plan':
                endpoint = API_ENDPOINTS.planTemplates;
                break;
            case 'workout':
                endpoint = API_ENDPOINTS.workoutTemplates;
                break;
            case 'exercise':
                endpoint = API_ENDPOINTS.exerciseTemplates;
                break;
            case 'meal':
                endpoint = API_ENDPOINTS.mealTemplates;
                break;
            default:
                throw new Error(`Unknown template type: ${templateType}`);
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error(`Error fetching ${templateType} templates: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${templateType} templates:`, error);
            showToast('error', `Failed to load ${templateType} templates`);
            throw error;
        }
    },
    
    async createTemplate(templateType, templateData) {
        let endpoint;
        switch (templateType) {
            case 'plan':
                endpoint = API_ENDPOINTS.planTemplates;
                break;
            case 'workout':
                endpoint = API_ENDPOINTS.workoutTemplates;
                break;
            case 'exercise':
                endpoint = API_ENDPOINTS.exerciseTemplates;
                break;
            case 'meal':
                endpoint = API_ENDPOINTS.mealTemplates;
                break;
            default:
                throw new Error(`Unknown template type: ${templateType}`);
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(templateData)
            });
            
            if (!response.ok) throw new Error(`Error creating ${templateType} template: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error creating ${templateType} template:`, error);
            showToast('error', `Failed to create ${templateType} template`);
            throw error;
        }
    },
    
    async updateTemplate(templateType, templateId, templateData) {
        let endpoint;
        switch (templateType) {
            case 'plan':
                endpoint = `${API_ENDPOINTS.planTemplates}${templateId}/`;
                break;
            case 'workout':
                endpoint = `${API_ENDPOINTS.workoutTemplates}${templateId}/`;
                break;
            case 'exercise':
                endpoint = `${API_ENDPOINTS.exerciseTemplates}${templateId}/`;
                break;
            case 'meal':
                endpoint = `${API_ENDPOINTS.mealTemplates}${templateId}/`;
                break;
            default:
                throw new Error(`Unknown template type: ${templateType}`);
        }
        
        try {
            const response = await fetch(endpoint, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(templateData)
            });
            
            if (!response.ok) throw new Error(`Error updating ${templateType} template: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Error updating ${templateType} template:`, error);
            showToast('error', `Failed to update ${templateType} template`);
            throw error;
        }
    }
};

// Utility functions
function showToast(type, message) {
    const toastEl = document.getElementById('toast');
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    document.getElementById('toastBody').textContent = message;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

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
        PlanAPI.fetchTemplates('workout').then(data => {
            workoutTemplates = data;
            renderTemplateItems('workout', data);
        }),
        PlanAPI.fetchTemplates('meal').then(data => {
            mealTemplates = data;
            renderTemplateItems('meal', data);
        }),
        PlanAPI.fetchTemplates('plan').then(data => {
            planTemplates = data;
            renderTemplateItems('plan', data);
        }),
        PlanAPI.fetchTemplates('exercise').then(data => {
            exerciseTemplates = data;
        })
    ]).catch(error => {
        console.error('Error loading templates:', error);
    });
}

function renderTemplateItems(type, templates) {
    let containerId;
    let icon;
    
    switch (type) {
        case 'workout':
            containerId = 'workoutTemplates';
            icon = 'bi-lightning-charge';
            break;
        case 'meal':
            containerId = 'mealTemplates';
            icon = 'bi-egg-fried';
            break;
        case 'plan':
            containerId = 'planTemplates';
            icon = 'bi-journal-check';
            break;
        default:
            return;
    }
    
    const container = document.getElementById(containerId);
    const itemsContainer = container.querySelector('.template-items');
    
    if (templates.length === 0) {
        itemsContainer.innerHTML = `<div class="text-center text-muted py-3">No ${type} templates found.</div>`;
        return;
    }
    
    itemsContainer.innerHTML = '';
    
    templates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item template-draggable';
        templateItem.dataset.templateId = template.id;
        templateItem.dataset.templateType = type;
        templateItem.innerHTML = `
            <h6><i class="bi ${icon} me-2"></i>${template.name}</h6>
            <p class="small text-muted mb-0">${template.description ? template.description.substring(0, 50) + '...' : 'No description'}</p>
        `;
        
        templateItem.addEventListener('click', () => {
            showTemplatePreview(type, template);
        });
        
        itemsContainer.appendChild(templateItem);
    });
    
    // Add "Create New" button
    const createNewBtn = document.createElement('div');
    createNewBtn.className = 'template-item create-new';
    createNewBtn.innerHTML = `
        <h6 class="text-primary"><i class="bi bi-plus-circle me-2"></i>Create New Template</h6>
        <p class="small text-muted mb-0">Create a custom ${type} template</p>
    `;
    
    createNewBtn.addEventListener('click', () => {
        showTemplateForm(type);
    });
    
    itemsContainer.appendChild(createNewBtn);
}

function showTemplatePreview(type, template) {
    // Implementation for showing template preview
    console.log(`Showing preview for ${type} template:`, template);
    // This would show a modal or side panel with template details and "Apply" button
}

function showTemplateForm(type, templateData = null) {
    const modalTitle = document.getElementById('templateModalLabel');
    const modalBody = document.querySelector('#templateModal .modal-body');
    const saveBtn = document.getElementById('saveTemplateBtn');
    
    modalTitle.textContent = templateData ? `Edit ${capitalizeFirst(type)} Template` : `Create New ${capitalizeFirst(type)} Template`;
    
    // Generate form based on template type
    let formHtml = '';
    
    switch (type) {
        case 'workout':
            formHtml = generateWorkoutTemplateForm(templateData);
            break;
        case 'meal':
            formHtml = generateMealTemplateForm(templateData);
            break;
        case 'plan':
            formHtml = generatePlanTemplateForm(templateData);
            break;
        default:
            formHtml = '<div class="alert alert-danger">Unknown template type</div>';
    }
    
    modalBody.innerHTML = formHtml;
    
    // Setup save button handler
    saveBtn.onclick = () => {
        const formData = collectTemplateFormData(type);
        
        if (templateData) {
            PlanAPI.updateTemplate(type, templateData.id, formData)
                .then(updated => {
                    showToast('success', `${capitalizeFirst(type)} template updated successfully`);
                    loadTemplates(); // Reload templates
                    $('#templateModal').modal('hide');
                })
                .catch(error => console.error('Error updating template:', error));
        } else {
            PlanAPI.createTemplate(type, formData)
                .then(created => {
                    showToast('success', `${capitalizeFirst(type)} template created successfully`);
                    loadTemplates(); // Reload templates
                    $('#templateModal').modal('hide');
                })
                .catch(error => console.error('Error creating template:', error));
        }
    };
    
    // Show the modal
    const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
    templateModal.show();
}

function generateWorkoutTemplateForm(template = null) {
    return `
        <form id="workoutTemplateForm">
            <div class="row g-3">
                <div class="col-12">
                    <label for="templateName" class="form-label">Template Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="templateName" required value="${template?.name || ''}">
                </div>
                
                <div class="col-12">
                    <label for="templateDescription" class="form-label">Description</label>
                    <textarea class="form-control" id="templateDescription" rows="2">${template?.description || ''}</textarea>
                </div>
                
                <div class="col-md-6">
                    <label for="templateDifficulty" class="form-label">Difficulty Level</label>
                    <select class="form-select" id="templateDifficulty">
                        <option value="1" ${template?.difficulty === 1 ? 'selected' : ''}>Beginner (1)</option>
                        <option value="2" ${template?.difficulty === 2 ? 'selected' : ''}>Easy (2)</option>
                        <option value="3" ${!template || template?.difficulty === 3 ? 'selected' : ''}>Moderate (3)</option>
                        <option value="4" ${template?.difficulty === 4 ? 'selected' : ''}>Challenging (4)</option>
                        <option value="5" ${template?.difficulty === 5 ? 'selected' : ''}>Advanced (5)</option>
                    </select>
                </div>
                
                <div class="col-md-6">
                    <label for="templateCategory" class="form-label">Category</label>
                    <input type="text" class="form-control" id="templateCategory" value="${template?.category || ''}">
                </div>
                
                <div class="col-12">
                    <h6 class="mt-3 mb-2">Exercise Blocks</h6>
                    <div id="exerciseBlocksContainer">
                        <!-- Exercise blocks will be added here -->
                        ${template?.structure ? renderExerciseBlocksFromTemplate(template.structure) : ''}
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addExerciseBlockBtn">
                        <i class="bi bi-plus-circle me-1"></i> Add Exercise Block
                    </button>
                </div>
            </div>
        </form>
    `;
}

function generateMealTemplateForm(template = null) {
    return `
        <form id="mealTemplateForm">
            <div class="row g-3">
                <div class="col-12">
                    <label for="templateName" class="form-label">Template Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="templateName" required value="${template?.name || ''}">
                </div>
                
                <div class="col-12">
                    <label for="templateDescription" class="form-label">Description</label>
                    <textarea class="form-control" id="templateDescription" rows="2">${template?.description || ''}</textarea>
                </div>
                
                <div class="col-md-6">
                    <label for="templateCategory" class="form-label">Category</label>
                    <input type="text" class="form-control" id="templateCategory" value="${template?.category || ''}">
                </div>
                
                <div class="col-md-6">
                    <label for="mealType" class="form-label">Meal Type</label>
                    <select class="form-select" id="mealType">
                        <option value="breakfast" ${template?.meal_type === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                        <option value="lunch" ${template?.meal_type === 'lunch' ? 'selected' : ''}>Lunch</option>
                        <option value="dinner" ${template?.meal_type === 'dinner' ? 'selected' : ''}>Dinner</option>
                        <option value="snack" ${template?.meal_type === 'snack' ? 'selected' : ''}>Snack</option>
                        <option value="pre_workout" ${template?.meal_type === 'pre_workout' ? 'selected' : ''}>Pre-Workout</option>
                        <option value="post_workout" ${template?.meal_type === 'post_workout' ? 'selected' : ''}>Post-Workout</option>
                    </select>
                </div>
                
                <div class="col-12">
                    <h6 class="mt-3 mb-2">Ingredients</h6>
                    <div id="ingredientsContainer">
                        <!-- Ingredients will be added here -->
                        ${template?.structure ? renderIngredientsFromTemplate(template.structure) : ''}
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addIngredientBtn">
                        <i class="bi bi-plus-circle me-1"></i> Add Ingredient
                    </button>
                </div>
                
                <div class="col-12">
                    <h6 class="mt-3 mb-2">Nutritional Information</h6>
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label for="calories" class="form-label">Calories</label>
                            <input type="number" class="form-control" id="calories" value="${template?.calories || ''}">
                        </div>
                        <div class="col-md-3">
                            <label for="protein" class="form-label">Protein (g)</label>
                            <input type="number" class="form-control" id="protein" value="${template?.protein || ''}">
                        </div>
                        <div class="col-md-3">
                            <label for="carbs" class="form-label">Carbs (g)</label>
                            <input type="number" class="form-control" id="carbs" value="${template?.carbs || ''}">
                        </div>
                        <div class="col-md-3">
                            <label for="fat" class="form-label">Fat (g)</label>
                            <input type="number" class="form-control" id="fat" value="${template?.fat || ''}">
                        </div>
                    </div>
                </div>
            </div>
        </form>
    `;
}

function generatePlanTemplateForm(template = null) {
    return `
        <form id="planTemplateForm">
            <div class="row g-3">
                <div class="col-12">
                    <label for="templateName" class="form-label">Template Name <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="templateName" required value="${template?.name || ''}">
                </div>
                
                <div class="col-12">
                    <label for="templateDescription" class="form-label">Description</label>
                    <textarea class="form-control" id="templateDescription" rows="2">${template?.description || ''}</textarea>
                </div>
                
                <div class="col-md-6">
                    <label for="templateType" class="form-label">Plan Type</label>
                    <select class="form-select" id="templateType">
                        <option value="workout" ${template?.plan_type === 'workout' ? 'selected' : ''}>Workout Only</option>
                        <option value="diet" ${template?.plan_type === 'diet' ? 'selected' : ''}>Diet/Nutrition Only</option>
                        <option value="combined" ${!template || template?.plan_type === 'combined' ? 'selected' : ''}>Combined (Workout & Diet)</option>
                    </select>
                </div>
                
                <div class="col-md-6">
                    <label for="templateDifficulty" class="form-label">Difficulty Level</label>
                    <select class="form-select" id="templateDifficulty">
                        <option value="1" ${template?.difficulty === 1 ? 'selected' : ''}>Beginner (1)</option>
                        <option value="2" ${template?.difficulty === 2 ? 'selected' : ''}>Easy (2)</option>
                        <option value="3" ${!template || template?.difficulty === 3 ? 'selected' : ''}>Moderate (3)</option>
                        <option value="4" ${template?.difficulty === 4 ? 'selected' : ''}>Challenging (4)</option>
                        <option value="5" ${template?.difficulty === 5 ? 'selected' : ''}>Advanced (5)</option>
                    </select>
                </div>
                
                <div class="col-12">
                    <h6 class="mt-3 mb-2">Plan Structure</h6>
                    <p class="text-muted small">Define the week pattern for this plan template</p>
                    
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        You'll be able to assign specific workout and meal templates to each day after creating this template.
                    </div>
                </div>
            </div>
        </form>
    `;
}

// Helper functions
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function renderExerciseBlocksFromTemplate(structure) {
    // Implementation for rendering exercise blocks from template structure
    return '<div class="text-muted">Click "Add Exercise Block" to add exercises</div>';
}

function renderIngredientsFromTemplate(structure) {
    // Implementation for rendering ingredients from template structure
    return '<div class="text-muted">Click "Add Ingredient" to add meal ingredients</div>';
}

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
    
    if (!templates || templates.length === 0) {
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

function saveWorkoutTemplate() {
    // Validate form
    const name = document.getElementById('workoutTemplateName').value;
    if (!name) {
        showToast('error', 'Template name is required');
        return;
    }
    
    // Check if exercises are added
    let hasExercises = false;
    for (const block of exerciseBlocks) {
        if (block.exercises && block.exercises.length > 0) {
            hasExercises = true;
            break;
        }
    }
    
    if (!hasExercises) {
        showToast('error', 'Add at least one exercise to the template');
        return;
    }
    
    // Collect form data
    const templateData = {
        name: name,
        description: document.getElementById('workoutTemplateDescription').value,
        category: document.getElementById('workoutTemplateCategory').value,
        difficulty: parseInt(document.getElementById('workoutTemplateDifficulty').value),
        duration_minutes: parseInt(document.getElementById('workoutTemplateDuration').value),
        instructions: document.getElementById('workoutTemplateInstructions').value,
        structure: {
            blocks: exerciseBlocks
        }
    };
    
    // Get plan ID from session storage
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    
    // If we have a current plan, associate this template with it
    if (currentPlanId) {
        templateData.product_plan = currentPlanId;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveWorkoutTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    // Save template
    let apiCall;
    if (currentWorkoutTemplateId) {
        apiCall = CoachPlanAPI.workoutTemplates.update(currentWorkoutTemplateId, templateData);
    } else {
        apiCall = CoachPlanAPI.workoutTemplates.create(templateData);
    }
    
    apiCall
        .then(template => {
            showToast('success', `Workout template ${currentWorkoutTemplateId ? 'updated' : 'created'} successfully`);
            hideWorkoutTemplateEditor();
            loadWorkoutTemplates(); // Refresh the templates list
        })
        .catch(error => {
            console.error('Error saving workout template:', error);
            showToast('error', `Failed to ${currentWorkoutTemplateId ? 'update' : 'create'} workout template`);
        })
        .finally(() => {
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        });
}

function viewWorkoutTemplate(templateId) {
    // Hide template list and editor
    document.querySelector('.workout-templates-container').style.display = 'none';
    document.getElementById('workoutTemplateEditor').style.display = 'none';
    
    // Get or create the preview container
    let previewContainer = document.getElementById('workoutTemplatePreview');
    if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.id = 'workoutTemplatePreview';
        previewContainer.className = 'template-preview';
        document.getElementById('workout-template').querySelector('.card-body').appendChild(previewContainer);
    }
    previewContainer.style.display = 'block';
    
    // Show loading state
    previewContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading template...</span>
            </div>
        </div>
    `;
    
    // Fetch template details
    CoachPlanAPI.workoutTemplates.getById(templateId)
        .then(template => {
            let exerciseBlocksHtml = '';
            let totalExercises = 0;
            
            if (template.structure && template.structure.blocks && template.structure.blocks.length > 0) {
                exerciseBlocksHtml = template.structure.blocks.map(block => {
                    let exercisesHtml = '';
                    
                    if (block.exercises && block.exercises.length > 0) {
                        totalExercises += block.exercises.length;
                        exercisesHtml = block.exercises.map(exercise => `
                            <tr>
                                <td>${exercise.name}</td>
                                <td>${exercise.sets || '-'}</td>
                                <td>${exercise.reps || '-'}</td>
                                <td>${exercise.rest_seconds ? exercise.rest_seconds + ' sec' : '-'}</td>
                                <td>${exercise.notes || '-'}</td>
                            </tr>
                        `).join('');
                    } else {
                        exercisesHtml = `<tr><td colspan="5" class="text-center text-muted">No exercises in this block</td></tr>`;
                    }
                    
                    return `
                        <div class="card mb-3">
                            <div class="card-header bg-light">
                                <h6 class="mb-0">${block.name || 'Unnamed Block'}</h6>
                                <small class="text-muted">${capitalizeFirst(block.type || 'standard')}</small>
                            </div>
                            <div class="card-body p-0">
                                <table class="table table-sm mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Exercise</th>
                                            <th>Sets</th>
                                            <th>Reps</th>
                                            <th>Rest</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${exercisesHtml}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                exerciseBlocksHtml = `<div class="alert alert-info">No exercise blocks defined</div>`;
            }
            
            previewContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="section-title mb-0">Workout Template Preview</h5>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="backToWorkoutListBtn">
                            <i class="bi bi-arrow-left me-1"></i> Back to List
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" id="editCurrentWorkoutTemplateBtn" data-id="${template.id}">
                            <i class="bi bi-pencil me-1"></i> Edit
                        </button>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-body">
                        <h5>${template.name}</h5>
                        <p class="text-muted">${template.description || 'No description'}</p>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <small class="text-muted d-block">Category</small>
                                <span>${template.category || '-'}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Difficulty</small>
                                <div class="difficulty-stars">
                                    ${generateDifficultyStars(template.difficulty)}
                                </div>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Duration</small>
                                <span>${template.duration_minutes ? template.duration_minutes + ' minutes' : '-'}</span>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <small class="text-muted d-block">Exercise Blocks</small>
                                <span>${template.structure?.blocks?.length || 0}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Total Exercises</small>
                                <span>${totalExercises}</span>
                            </div>
                        </div>
                        
                        ${template.instructions ? `
                            <div class="mb-3">
                                <small class="text-muted d-block">Instructions</small>
                                <p>${template.instructions}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <h6 class="mb-3">Exercise Blocks</h6>
                <div class="exercise-blocks-preview">
                    ${exerciseBlocksHtml}
                </div>
            `;
            
            // Add event listeners
            document.getElementById('backToWorkoutListBtn').addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.workout-templates-container').style.display = 'block';
            });
            
            document.getElementById('editCurrentWorkoutTemplateBtn').addEventListener('click', () => {
                editWorkoutTemplate(template.id);
            });
        })
        .catch(error => {
            console.error('Error loading workout template:', error);
            previewContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load template
                </div>
                <button type="button" class="btn btn-outline-secondary" id="backToWorkoutListBtn">
                    <i class="bi bi-arrow-left me-1"></i> Back to List
                </button>
            `;
            
            document.getElementById('backToWorkoutListBtn').addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.workout-templates-container').style.display = 'block';
            });
        });
}

function editWorkoutTemplate(templateId) {
    showWorkoutTemplateEditor(templateId);
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

// Meal template event listeners will be added dynamically after templates are loaded
// This ensures proper event binding to dynamically created elements

function viewMealTemplate(templateId) {
    // Hide template list and editor
    document.querySelector('.meal-templates-container').style.display = 'none';
    document.getElementById('mealTemplateEditor').style.display = 'none';
    
    const previewContainer = document.getElementById('mealTemplatePreview');
    previewContainer.style.display = 'block';
    
    // Show loading state
    previewContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading template...</span>
            </div>
        </div>
    `;
    
    // Fetch template details
    CoachPlanAPI.mealTemplates.getById(templateId)
        .then(template => {
            // Render template preview
            let ingredientsHtml = '';
            
            if (template.structure && template.structure.ingredients && template.structure.ingredients.length > 0) {
                ingredientsHtml = template.structure.ingredients.map(ingredient => `
                    <tr>
                        <td>${ingredient.name}</td>
                        <td>${ingredient.amount} ${ingredient.unit}</td>
                        <td>${ingredient.calories || '-'}</td>
                        <td>${ingredient.protein || '-'}</td>
                        <td>${ingredient.carbs || '-'}</td>
                        <td>${ingredient.fat || '-'}</td>
                    </tr>
                `).join('');
            } else {
                ingredientsHtml = '<tr><td colspan="6" class="text-muted text-center">No ingredients defined</td></tr>';
            }
            
            // Calculate nutrition totals
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            
            if (template.structure && template.structure.ingredients) {
                template.structure.ingredients.forEach(ingredient => {
                    totalCalories += Number(ingredient.calories) || 0;
                    totalProtein += Number(ingredient.protein) || 0;
                    totalCarbs += Number(ingredient.carbs) || 0;
                    totalFat += Number(ingredient.fat) || 0;
                });
            }
            
            previewContainer.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="section-title mb-0">Meal Template Preview</h5>
                    <div>
                        <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="backToMealListBtn">
                            <i class="bi bi-arrow-left me-1"></i> Back to List
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" id="editMealTemplateBtn" data-id="${template.id}">
                            <i class="bi bi-pencil me-1"></i> Edit
                        </button>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-body">
                        <h5>${template.name}</h5>
                        <p class="text-muted">${template.description || 'No description'}</p>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <small class="text-muted d-block">Category</small>
                                <span>${template.category || '-'}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Meal Type</small>
                                <span>${capitalizeFirst(template.meal_type) || '-'}</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Calories</small>
                                <span>${template.calories || totalCalories || '-'}</span>
                            </div>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <small class="text-muted d-block">Protein</small>
                                <span>${template.protein || totalProtein || '-'}g</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Carbs</small>
                                <span>${template.carbs || totalCarbs || '-'}g</span>
                            </div>
                            <div class="col-md-4">
                                <small class="text-muted d-block">Fat</small>
                                <span>${template.fat || totalFat || '-'}g</span>
                            </div>
                        </div>
                        
                        ${template.instructions ? `
                            <div class="mb-3">
                                <small class="text-muted d-block">Preparation Instructions</small>
                                <p>${template.instructions}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <h6 class="mb-3">Ingredients</h6>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Calories</th>
                                <th>Protein (g)</th>
                                <th>Carbs (g)</th>
                                <th>Fat (g)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ingredientsHtml}
                        </tbody>
                    </table>
                </div>
            `;
            
            // Add event listeners
            document.getElementById('backToMealListBtn').addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.meal-templates-container').style.display = 'block';
            });
            
            document.getElementById('editMealTemplateBtn').addEventListener('click', () => {
                editMealTemplate(template.id);
            });
        })
        .catch(error => {
            console.error('Error loading meal template:', error);
            previewContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load template
                </div>
                <button type="button" class="btn btn-outline-secondary" id="backToMealListBtn">
                    <i class="bi bi-arrow-left me-1"></i> Back to List
                </button>
            `;
            
            document.getElementById('backToMealListBtn').addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.meal-templates-container').style.display = 'block';
            });
        });
}

function editMealTemplate(templateId) {
    showMealTemplateEditor(templateId);
}

function deleteMealTemplate(templateId) {
    if (confirm('Are you sure you want to delete this meal template?')) {
        // Show loading state in the table row
        const row = document.querySelector(`#mealTemplatesTableBody .edit-template-btn[data-id="${templateId}"]`).closest('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Deleting...</span>
                </div>
                <span class="ms-2">Deleting template...</span>
            </td>
        `;
        
        // Delete the template
        CoachPlanAPI.mealTemplates.delete(templateId)
            .then(() => {
                showToast('success', 'Meal template deleted successfully');
                loadMealTemplates(); // Refresh the templates list
            })
            .catch(error => {
                console.error('Error deleting meal template:', error);
                showToast('error', 'Failed to delete meal template');
                loadMealTemplates(); // Refresh the templates list anyway
            });
    }
}

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
    CoachPlanAPI.productPlans.get(currentPlanId)
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
        CoachPlanAPI.workoutTemplates.list()
            .then(templates => {
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
        CoachPlanAPI.mealTemplates.list()
            .then(templates => {
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
    CoachPlanAPI.productPlans.get(currentPlanId)
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
    
    // Collect form data
    const planData = {
        name: document.getElementById('planName').value,
        description: document.getElementById('planDescription').value,
        duration: parseInt(document.getElementById('planDuration').value),
        price: parseFloat(document.getElementById('planPrice').value),
        workout_days_per_week: parseInt(document.getElementById('workoutDaysPerWeek').value),
        rest_days_per_week: parseInt(document.getElementById('restDaysPerWeek').value),
        status: 'active',  // Set as active by default
    };
    
    // Validate required fields
    const requiredFields = ['name', 'duration', 'price', 'workout_days_per_week', 'rest_days_per_week'];
    const missingFields = requiredFields.filter(field => !planData[field]);
    
    if (missingFields.length > 0) {
        document.body.removeChild(overlay);
        const fieldNames = missingFields.map(field => field.replace('_', ' ')).join(', ');
        showToast('error', `Please fill in all required fields: ${fieldNames}`);
        return;
    }
    
    // Create plan
    CoachPlanAPI.productPlans.create(planData)
        .then(plan => {
            showToast('success', 'Plan created successfully!');
            // Redirect to plans list after short delay
            setTimeout(() => {
                window.location.href = '/coach/plans/';
            }, 1500);
        })
        .catch(error => {
            console.error('Error publishing plan:', error);
            showToast('error', 'Failed to publish plan. Please check the form and try again.');
            document.body.removeChild(overlay);
        });
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
    
    if (!templates || templates.length === 0) {
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
                        <h6 class="mb-0">${template.name}</h6>
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
    
    return selectedTemplates;
}

/**
 * Save selected meal templates to session storage and update plan in backend
 * @returns {Promise} Promise that resolves when templates are saved
 */
function saveMealTemplateSelections() {
    // Get current plan ID
    const currentPlanId = sessionStorage.getItem('currentPlanId');
    if (!currentPlanId) {
        return Promise.reject(new Error('No current plan'));
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
    return CoachPlanAPI.productPlans.update(currentPlanId, {
        meal_templates: selectedTemplateIds
    })
    .then(response => {
        // Mark step as complete
        updateStepStatus('meal-templates', 'complete');
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
    document.getElementById('mealTemplatePreparation').value = '';
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
                document.getElementById('mealTemplatePreparation').value = template.preparation || '';
                
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
        preparation: document.getElementById('mealTemplatePreparation').value,
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

// Plan Creation Handling
function savePlanBasics() {
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
    const planData = {
        name: document.getElementById('planName').value.trim(),
        plan_type: document.getElementById('planType').value,
        difficulty: parseInt(document.getElementById('difficultyLevel').value),
        duration_days: parseInt(document.getElementById('planDuration').value),
        max_clients: document.getElementById('maxClients').value || null,
        price: parseFloat(document.getElementById('planPrice').value),
        renewal_period: document.getElementById('renewalPeriod').value,
        description: document.getElementById('planDescription').value.trim(),
        is_active: document.getElementById('isActive').checked
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
            currentPlanId = plan.id;
            
            // Update step status icon to completed
            document.querySelector('#plan-basics-tab .step-status i').className = 'bi bi-check-circle-fill text-success';
            
            return plan;
        })
        .catch(error => {
            console.error('Error saving plan basics:', error);
            showToast('error', 'Failed to save plan basics. Please check your inputs and try again.');
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
            showToast('error', 'Failed to save plan structure. Please try again.');
            throw error;
        })
        .finally(() => {
            nextBtn.innerHTML = originalBtnText;
            nextBtn.disabled = false;
        });
}

// Event Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initial load of workout templates if on that tab
    if (document.getElementById('workout-template')) {
        loadWorkoutTemplates();
    }
    
    // Setup workout templates navigation buttons
    const nextToMealTemplatesBtn = document.getElementById('nextToMealTemplates');
    if (nextToMealTemplatesBtn) {
        nextToMealTemplatesBtn.addEventListener('click', function() {
            saveWorkoutTemplateSelections()
                .then(() => {
                    showToast('success', 'Workout templates saved successfully');
                    document.getElementById('meal-template-tab').click();
                })
                .catch(error => {
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

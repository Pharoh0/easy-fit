/**
 * Meal Template Creation JavaScript
 * Handles meal template creation and management separately from workout templates
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize meal template components
    initMealTemplateCreation();
});

// Initialize all meal template functionality
function initMealTemplateCreation() {
    console.log('Initializing meal template creation module');
    
    // Initialize event listeners
    document.getElementById('createMealTemplateBtn')?.addEventListener('click', showMealTemplateEditor);
    document.getElementById('cancelMealTemplateBtn')?.addEventListener('click', hideMealTemplateEditor);
    document.getElementById('saveMealTemplateBtn')?.addEventListener('click', saveMealTemplate);
    document.getElementById('emptyStateCreateMealTemplate')?.addEventListener('click', showMealTemplateEditor);
    
    // Load existing meal templates when the page loads
    loadMealTemplates();
}

// Load meal templates from API
function loadMealTemplates() {
    console.log('Loading meal templates');
    
    // Show loading indicator
    document.getElementById('mealTemplatesLoading').style.display = 'block';
    document.getElementById('noMealTemplates').style.display = 'none';
    
    // Clear existing table rows
    const tableBody = document.getElementById('mealTemplatesTableBody');
    tableBody.innerHTML = '';
    
    // Call API to get meal templates
    CoachPlanAPI.mealTemplates.getAll()
        .then(response => {
            // Hide loading indicator
            document.getElementById('mealTemplatesLoading').style.display = 'none';
            
            // Process response data
            const templates = response.results || response;
            if (templates && templates.length > 0) {
                // Populate table with templates
                templates.forEach(template => {
                    const row = createMealTemplateRow(template);
                    tableBody.appendChild(row);
                });
            } else {
                // Show empty state
                document.getElementById('noMealTemplates').style.display = 'block';
            }
        })
        .catch(error => {
            // Hide loading indicator
            document.getElementById('mealTemplatesLoading').style.display = 'none';
            document.getElementById('noMealTemplates').style.display = 'block';
            
            // Show error message
            console.error('Error loading meal templates:', error);
            showToast('error', `Failed to load meal templates: ${error.message || 'Unknown error'}`);
        });
}

// Create a table row for a meal template
function createMealTemplateRow(template) {
    const row = document.createElement('tr');
    
    // Checkbox cell
    const checkboxCell = document.createElement('td');
    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'form-check';
    const checkbox = document.createElement('input');
    checkbox.className = 'form-check-input meal-template-checkbox';
    checkbox.type = 'checkbox';
    checkbox.setAttribute('data-id', template.id);
    checkbox.addEventListener('change', updateSelectedMealTemplatesCount);
    checkboxDiv.appendChild(checkbox);
    checkboxCell.appendChild(checkboxDiv);
    row.appendChild(checkboxCell);
    
    // Template name cell
    const nameCell = document.createElement('td');
    nameCell.innerHTML = `<strong>${template.name || 'Unnamed Template'}</strong>`;
    row.appendChild(nameCell);
    
    // Meal type cell
    const mealTypeCell = document.createElement('td');
    mealTypeCell.textContent = template.meal_type || '-';
    row.appendChild(mealTypeCell);
    
    // Category cell
    const categoryCell = document.createElement('td');
    categoryCell.textContent = template.category || '-';
    row.appendChild(categoryCell);
    
    // Calories cell
    const caloriesCell = document.createElement('td');
    caloriesCell.textContent = template.calories || '-';
    row.appendChild(caloriesCell);
    
    // Ingredients cell
    const ingredientsCell = document.createElement('td');
    const ingredients = template.ingredients?.length || 0;
    ingredientsCell.innerHTML = `<span class="badge bg-secondary">${ingredients}</span>`;
    row.appendChild(ingredientsCell);
    
    // Actions cell
    const actionsCell = document.createElement('td');
    actionsCell.className = 'text-end';
    actionsCell.innerHTML = `
        <button class="btn btn-sm btn-outline-primary me-1 view-meal-template-btn" data-id="${template.id}">
            <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-secondary me-1 edit-meal-template-btn" data-id="${template.id}">
            <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-meal-template-btn" data-id="${template.id}">
            <i class="bi bi-trash"></i>
        </button>
    `;
    
    // Add event listeners to action buttons
    actionsCell.querySelector('.view-meal-template-btn').addEventListener('click', () => viewMealTemplate(template.id));
    actionsCell.querySelector('.edit-meal-template-btn').addEventListener('click', () => editMealTemplate(template.id));
    actionsCell.querySelector('.delete-meal-template-btn').addEventListener('click', () => deleteMealTemplate(template.id));
    
    row.appendChild(actionsCell);
    
    return row;
}

// Show meal template editor
function showMealTemplateEditor() {
    // Hide templates list
    document.querySelector('.meal-templates-container').style.display = 'none';
    
    // Show editor
    const editor = document.getElementById('mealTemplateEditor');
    editor.style.display = 'block';
    
    // Reset form
    document.getElementById('mealTemplateForm')?.reset();
    document.getElementById('mealTemplateId').value = '';
    
    // Set focus on the name field
    document.getElementById('mealTemplateName').focus();
}

// Hide meal template editor
function hideMealTemplateEditor() {
    // Show templates list
    document.querySelector('.meal-templates-container').style.display = 'block';
    
    // Hide editor
    const editor = document.getElementById('mealTemplateEditor');
    editor.style.display = 'none';
}

// Save meal template (create new or update existing)
function saveMealTemplate(event) {
    if (event) event.preventDefault();
    
    // Get form data
    const form = document.getElementById('mealTemplateForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Get form values
    const templateId = document.getElementById('mealTemplateId').value;
    const templateData = {
        name: document.getElementById('mealTemplateName').value,
        meal_type: document.getElementById('mealTemplateType').value,
        category: document.getElementById('mealTemplateCategory').value,
        calories: parseInt(document.getElementById('mealTemplateCalories').value) || 0,
        description: document.getElementById('mealTemplateDescription').value,
        instructions: document.getElementById('mealTemplateInstructions').value,
        ingredients: getMealIngredients()
    };
    
    // Show loading state
    const saveBtn = document.getElementById('saveMealTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    // Call API to save template
    let apiCall;
    if (templateId) {
        apiCall = CoachPlanAPI.mealTemplates.update(templateId, templateData);
    } else {
        apiCall = CoachPlanAPI.mealTemplates.create(templateData);
    }
    
    apiCall
        .then(template => {
            console.log('Meal template saved successfully:', template);
            showToast('success', `Meal template ${templateId ? 'updated' : 'created'} successfully`);
            hideMealTemplateEditor();
            loadMealTemplates(); // Refresh the templates list
        })
        .catch(error => {
            console.error('Error saving meal template:', error);
            let errorMessage = `Failed to ${templateId ? 'update' : 'create'} meal template`;
            
            // Parse error response
            if (error && typeof error === 'object') {
                if (error.error) {
                    errorMessage += `: ${error.error}`;
                } else if (error.message) {
                    errorMessage += `: ${error.message}`;
                }
            } else if (typeof error === 'string') {
                errorMessage += `: ${error}`;
            }
            
            showToast('error', errorMessage);
        })
        .finally(() => {
            // Restore button state
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        });
}

// Get meal ingredients from the form
function getMealIngredients() {
    const ingredients = [];
    const ingredientRows = document.querySelectorAll('.meal-ingredient-row');
    
    ingredientRows.forEach(row => {
        const nameInput = row.querySelector('.ingredient-name');
        const amountInput = row.querySelector('.ingredient-amount');
        const unitInput = row.querySelector('.ingredient-unit');
        
        if (nameInput.value) {
            ingredients.push({
                name: nameInput.value,
                amount: parseFloat(amountInput.value) || 0,
                unit: unitInput.value || 'g'
            });
        }
    });
    
    return ingredients;
}

// Helper function to update the count of selected meal templates
function updateSelectedMealTemplatesCount() {
    const checkboxes = document.querySelectorAll('.meal-template-checkbox:checked');
    const counter = document.getElementById('selectedMealTemplatesCount');
    counter.textContent = checkboxes.length.toString();
    
    // Show/hide the counter
    const counterContainer = document.getElementById('selectedMealTemplatesCounter');
    counterContainer.style.display = checkboxes.length > 0 ? 'block' : 'none';
}

// View meal template details
function viewMealTemplate(templateId) {
    console.log('Viewing meal template:', templateId);
    
    // Hide templates list and editor
    document.querySelector('.meal-templates-container').style.display = 'none';
    document.getElementById('mealTemplateEditor').style.display = 'none';
    
    // Show loading state in the preview container
    const previewContainer = document.getElementById('mealTemplatePreview') || 
                              createMealTemplatePreviewContainer();
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading template...</span>
            </div>
        </div>
    `;
    
    // Load template details
    CoachPlanAPI.mealTemplates.getById(templateId)
        .then(template => {
            // Render template details
            previewContainer.innerHTML = createMealTemplatePreviewHTML(template);
            
            // Add event listeners to buttons
            document.getElementById('backToMealListBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.meal-templates-container').style.display = 'block';
            });
            
            document.getElementById('editCurrentMealTemplateBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                editMealTemplate(template.id);
            });
        })
        .catch(error => {
            console.error('Error loading meal template details:', error);
            previewContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading template details: ${error.message || 'Unknown error'}
                </div>
                <button class="btn btn-secondary btn-sm" id="backToMealListErrorBtn">
                    <i class="bi bi-arrow-left me-1"></i> Back to List
                </button>
            `;
            
            document.getElementById('backToMealListErrorBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.meal-templates-container').style.display = 'block';
            });
        });
}

// Create HTML for meal template preview
function createMealTemplatePreviewHTML(template) {
    let ingredientsHtml = '';
    let nutritionHtml = '';
    
    // Generate ingredients list
    if (template.ingredients && template.ingredients.length > 0) {
        ingredientsHtml = template.ingredients.map(ingredient => `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                ${ingredient.name}
                <span class="badge bg-primary rounded-pill">${ingredient.amount} ${ingredient.unit}</span>
            </li>
        `).join('');
    } else {
        ingredientsHtml = `<li class="list-group-item text-center text-muted">No ingredients defined</li>`;
    }
    
    // Generate nutrition info
    if (template.nutrition) {
        nutritionHtml = `
            <div class="card-header bg-light">
                <h6 class="mb-0">Nutrition Information</h6>
            </div>
            <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Calories
                    <span class="badge bg-secondary rounded-pill">${template.calories || 0} kcal</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Protein
                    <span class="badge bg-secondary rounded-pill">${template.nutrition.protein || 0} g</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Carbohydrates
                    <span class="badge bg-secondary rounded-pill">${template.nutrition.carbs || 0} g</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Fat
                    <span class="badge bg-secondary rounded-pill">${template.nutrition.fat || 0} g</span>
                </li>
            </ul>
        `;
    }
    
    return `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="section-title mb-0">Meal Template Preview</h5>
            <div>
                <button type="button" class="btn btn-sm btn-outline-secondary me-2" id="backToMealListBtn">
                    <i class="bi bi-arrow-left me-1"></i> Back to List
                </button>
                <button type="button" class="btn btn-sm btn-primary" id="editCurrentMealTemplateBtn" data-id="${template.id}">
                    <i class="bi bi-pencil me-1"></i> Edit
                </button>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${template.name || 'Unnamed Template'}</h5>
                    <span class="badge bg-primary">${template.meal_type || 'Meal'}</span>
                </div>
                <small class="text-muted">${template.category || 'Uncategorized'}</small>
            </div>
            <div class="card-body">
                <p class="card-text">${template.description || 'No description provided.'}</p>
                
                <h6 class="mt-3 mb-2">Instructions</h6>
                <p class="card-text">${template.instructions || 'No instructions provided.'}</p>
                
                <h6 class="mt-3 mb-2">Ingredients</h6>
                <ul class="list-group mb-3">
                    ${ingredientsHtml}
                </ul>
                
                ${nutritionHtml}
            </div>
        </div>
    `;
}

// Create a container for meal template preview
function createMealTemplatePreviewContainer() {
    const previewContainer = document.createElement('div');
    previewContainer.id = 'mealTemplatePreview';
    previewContainer.className = 'template-preview';
    document.getElementById('meal-template').querySelector('.card-body').appendChild(previewContainer);
    return previewContainer;
}

// Edit meal template
function editMealTemplate(templateId) {
    // Show editor
    document.querySelector('.meal-templates-container').style.display = 'none';
    const editor = document.getElementById('mealTemplateEditor');
    editor.style.display = 'block';
    
    // Show loading state
    editor.querySelector('form').innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading template...</span>
            </div>
        </div>
    `;
    
    // Load template details
    CoachPlanAPI.mealTemplates.getById(templateId)
        .then(template => {
            // Reset form
            document.getElementById('mealTemplateForm').innerHTML = createMealTemplateFormHTML();
            
            // Set form values
            document.getElementById('mealTemplateId').value = template.id;
            document.getElementById('mealTemplateName').value = template.name || '';
            document.getElementById('mealTemplateType').value = template.meal_type || '';
            document.getElementById('mealTemplateCategory').value = template.category || '';
            document.getElementById('mealTemplateCalories').value = template.calories || 0;
            document.getElementById('mealTemplateDescription').value = template.description || '';
            document.getElementById('mealTemplateInstructions').value = template.instructions || '';
            
            // Add ingredients
            if (template.ingredients && template.ingredients.length > 0) {
                template.ingredients.forEach(ingredient => {
                    addMealIngredientRow(ingredient);
                });
            } else {
                // Add empty ingredient row
                addMealIngredientRow();
            }
            
            // Add event listeners
            document.getElementById('addIngredientBtn').addEventListener('click', () => addMealIngredientRow());
            document.getElementById('saveMealTemplateBtn').addEventListener('click', saveMealTemplate);
            document.getElementById('cancelMealTemplateBtn').addEventListener('click', hideMealTemplateEditor);
        })
        .catch(error => {
            console.error('Error loading meal template for editing:', error);
            showToast('error', `Failed to load meal template: ${error.message || 'Unknown error'}`);
            hideMealTemplateEditor();
        });
}

// Delete meal template
function deleteMealTemplate(templateId) {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this meal template? This action cannot be undone.')) {
        return;
    }
    
    // Delete template
    CoachPlanAPI.mealTemplates.delete(templateId)
        .then(() => {
            console.log('Meal template deleted successfully');
            showToast('success', 'Meal template deleted successfully');
            loadMealTemplates(); // Refresh the templates list
        })
        .catch(error => {
            console.error('Error deleting meal template:', error);
            showToast('error', `Failed to delete meal template: ${error.message || 'Unknown error'}`);
        });
}

// Create HTML for meal template form
function createMealTemplateFormHTML() {
    return `
        <input type="hidden" id="mealTemplateId">
        <div class="row g-3 mb-3">
            <div class="col-md-6">
                <label for="mealTemplateName" class="form-label">Template Name</label>
                <input type="text" class="form-control" id="mealTemplateName" required>
            </div>
            <div class="col-md-3">
                <label for="mealTemplateType" class="form-label">Meal Type</label>
                <select class="form-select" id="mealTemplateType">
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="pre_workout">Pre-Workout</option>
                    <option value="post_workout">Post-Workout</option>
                </select>
            </div>
            <div class="col-md-3">
                <label for="mealTemplateCalories" class="form-label">Calories</label>
                <input type="number" class="form-control" id="mealTemplateCalories" min="0" step="1">
            </div>
            <div class="col-md-6">
                <label for="mealTemplateCategory" class="form-label">Category</label>
                <input type="text" class="form-control" id="mealTemplateCategory" 
                       placeholder="e.g., Vegetarian, High Protein, Low Carb">
            </div>
            <div class="col-12">
                <label for="mealTemplateDescription" class="form-label">Description</label>
                <textarea class="form-control" id="mealTemplateDescription" rows="2"></textarea>
            </div>
            <div class="col-12">
                <label class="form-label">Instructions/Preparation</label>
                <textarea class="form-control" id="mealTemplateInstructions" rows="3"></textarea>
            </div>
        </div>
        
        <h6 class="mb-3">Ingredients</h6>
        <div class="ingredients-container" id="ingredientsContainer">
            <!-- Ingredient rows will be added here -->
        </div>
        
        <button type="button" class="btn btn-outline-primary mt-3" id="addIngredientBtn">
            <i class="bi bi-plus-circle me-1"></i> Add Ingredient
        </button>
        
        <div class="d-flex justify-content-end mt-4">
            <button type="button" class="btn btn-secondary me-2" id="cancelMealTemplateBtn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="saveMealTemplateBtn">Save Template</button>
        </div>
    `;
}

// Add ingredient row to meal template form
function addMealIngredientRow(ingredient = null) {
    const container = document.getElementById('ingredientsContainer');
    const rowId = `ingredient-${Date.now()}`;
    
    const row = document.createElement('div');
    row.className = 'row g-2 mb-2 meal-ingredient-row';
    row.id = rowId;
    
    row.innerHTML = `
        <div class="col-5">
            <input type="text" class="form-control ingredient-name" placeholder="Ingredient name" 
                   value="${ingredient ? ingredient.name : ''}">
        </div>
        <div class="col-3">
            <input type="number" class="form-control ingredient-amount" placeholder="Amount" min="0" step="0.1"
                   value="${ingredient ? ingredient.amount : ''}">
        </div>
        <div class="col-3">
            <input type="text" class="form-control ingredient-unit" placeholder="Unit" 
                   value="${ingredient ? ingredient.unit : 'g'}">
        </div>
        <div class="col-1">
            <button type="button" class="btn btn-outline-danger btn-sm remove-ingredient-btn" data-row-id="${rowId}">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(row);
    
    // Add event listener to remove button
    row.querySelector('.remove-ingredient-btn').addEventListener('click', function() {
        const rowId = this.getAttribute('data-row-id');
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
        }
    });
}

// Helper function to show toast messages
function showToast(type, message) {
    // Check if toast container exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create toast container
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.className = `toast align-items-center border-0 ${type === 'error' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-success'} text-white`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    // Remove toast from DOM after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        this.remove();
    });
}

/**
 * Meal Template Management JavaScript
 * Handles the creation, editing, and management of meal templates
 */

// Global variables for tracking ingredients and templates
let ingredients = [];
let ingredientCounter = 0;
let currentMealTemplateId = null;
let currentTemplateId = null; // For storing the parent template ID

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
    
    // Initialize file upload handlers
    initFileUploadHandlers();
    
    // Load meal templates
    loadMealTemplates();
    
    // Event listeners
    document.getElementById('createMealTemplateBtn').addEventListener('click', function() {
        showMealTemplateEditor();
    });
    
    // Empty state create button
    const emptyStateBtn = document.getElementById('emptyStateCreateMealTemplate');
    if (emptyStateBtn) {
        emptyStateBtn.addEventListener('click', function() {
            showMealTemplateEditor();
        });
    }
    
    // Add ingredient button
    document.getElementById('addIngredientBtn').addEventListener('click', function() {
        addIngredient();
    });
    
    // Save template button
    document.getElementById('saveMealTemplateBtn').addEventListener('click', saveMealTemplate);
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
 * Load meal templates from the API and display them in the table
 */
function loadMealTemplates() {
    const tableBody = document.getElementById('mealTemplatesTableBody');
    const loadingIndicator = document.getElementById('mealTemplatesLoading');
    const emptyState = document.getElementById('noMealTemplates');
    
    // Show loading state
    if (tableBody) tableBody.innerHTML = '';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Fetch templates from API
    CoachPlanAPI.mealTemplates.getAll()
        .then(response => {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Handle paginated responses from API
            const templates = response.results ? response.results : response;
            
            if (!templates || templates.length === 0) {
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            // Render templates in table
            renderMealTemplatesTable(templates);
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

/**
 * Render meal templates in the table
 * @param {Array} templates - Array of meal template objects
 */
function renderMealTemplatesTable(templates) {
    const tableBody = document.getElementById('mealTemplatesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    templates.forEach(template => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${template.meal_name || template.name || 'Unnamed'}</td>
            <td>${formatMealType(template.meal_type)}</td>
            <td>${template.calories || 0} kcal</td>
            <td>${template.preparation_time_minutes || 0} min</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editMealTemplate(${template.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteMealTemplate(${template.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Format meal type for display
 * @param {string} type - The meal type value
 * @returns {string} Formatted meal type
 */
function formatMealType(type) {
    if (!type) return 'Unknown';
    
    const types = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner',
        'snack': 'Snack',
        'pre_workout': 'Pre-Workout',
        'post_workout': 'Post-Workout'
    };
    
    return types[type] || type;
}

/**
 * Initialize the meal template form
 */
function initMealTemplateForm() {
    // Reset form fields
    document.getElementById('mealTemplateForm').reset();
    
    // Reset current template ID
    currentMealTemplateId = null;
    currentTemplateId = null;
    
    // Clear ingredients
    document.getElementById('ingredientsContainer').innerHTML = '';
    ingredients = [];
    ingredientCounter = 0;
    
    // Initialize file upload handlers (resets all media arrays and previews)
    initFileUploadHandlers();
    
    // Add an empty ingredient
    addIngredient();
}

/**
 * Show the meal template editor modal
 * @param {number} templateId - Optional template ID to edit
 */
function showMealTemplateEditor(templateId = null) {
    initMealTemplateForm();
    
    const modalTitle = document.getElementById('mealTemplateModalLabel');
    
    if (templateId) {
        // Edit existing template
        modalTitle.textContent = 'Edit Meal Template';
        currentMealTemplateId = templateId;
        
        // Load template data
        CoachPlanAPI.mealTemplates.getById(templateId)
            .then(template => {
                if (!template) {
                    showToast('error', 'Template not found');
                    return;
                }
                
                // Debug: Log the template data structure
                console.log('Template data received:', template);
                
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
                
                // Populate form fields - use exact backend API field names as primary options
                // Populate form fields with explicit names matching the backend model fields
                setFormValue('mealTemplateName', getPropertyValue(template, ['meal_name']));
                setSelectValue('mealTemplateType', getPropertyValue(template, ['meal_type']));
                setFormValue('mealTemplateCategory', getPropertyValue(template, ['category']));
                setFormValue('mealTemplateDescription', getPropertyValue(template, ['description']));
                setFormValue('mealTemplatePreparationTime', getPropertyValue(template, ['preparation_time_minutes'], 0));
                setFormValue('mealTemplateCookingTime', getPropertyValue(template, ['cooking_time_minutes'], 0));
                setFormValue('mealTemplateCalories', getPropertyValue(template, ['calories'], 0));
                setFormValue('mealTemplateProtein', getPropertyValue(template, ['protein_grams'], 0));
                setFormValue('mealTemplateCarbs', getPropertyValue(template, ['carbs_grams'], 0));
                setFormValue('mealTemplateFat', getPropertyValue(template, ['fats_grams'], 0));
                setFormValue('mealTemplateInstructions', getPropertyValue(template, ['recipe']));
                
                console.log('Loaded template data:', {
                    name: template.meal_name,
                    type: template.meal_type,
                    category: template.category,
                    description: template.description,
                    ingredients: template.ingredients
                });
                
                // Store template ID reference
                if (template.template) {
                    currentTemplateId = template.template;
                }
                
                // Display existing media (main image, additional images, and videos)
                displayExistingMedia(template);
                
                // Clear existing ingredients first
                document.getElementById('ingredientsContainer').innerHTML = '';
                ingredients = [];
                ingredientCounter = 0;
                
                // Load ingredients if available
                if (template.ingredients && template.ingredients.length > 0) {
                    console.log('Loading ingredients:', template.ingredients);
                    template.ingredients.forEach(ingredientData => {
                        addIngredient(ingredientData);
                    });
                } else {
                    // Add an empty ingredient
                    addIngredient();
                }
            })
            .catch(error => {
                console.error('Error loading template:', error);
                const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
                showToast('error', `Failed to load template: ${errorMessage}`);
            });
    } else {
        // Create new template
        modalTitle.textContent = 'Create Meal Template';
        
        // Add an empty ingredient
        addIngredient();
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('mealTemplateModal'));
    modal.show();
}

/**
 * Add an ingredient to the form
 * @param {object} ingredientData - Optional ingredient data for editing
 */
function addIngredient(ingredientData = null) {
    ingredientCounter++;
    const ingredientId = ingredientCounter;
    
    console.log('Adding ingredient with data:', ingredientData);
    
    const ingredientElement = document.createElement('div');
    ingredientElement.className = 'ingredient-item p-2 border rounded mb-2';
    ingredientElement.dataset.ingredientId = ingredientId;
    
    // Use the global helper function for property retrieval instead of a local one
    // Handle different API response formats for ingredients with multiple possible property names
    const name = getPropertyValue(ingredientData, ['name', 'ingredient_name', 'food_name'], '');
    const amount = getPropertyValue(ingredientData, ['amount', 'quantity', 'value'], '');
    const unit = getPropertyValue(ingredientData, ['unit', 'measure', 'measurement_unit'], 'g');
    const category = getPropertyValue(ingredientData, ['category', 'ingredient_category', 'food_category'], 'protein');
    const notes = getPropertyValue(ingredientData, ['notes', 'description', 'comment'], '');
    
    ingredientElement.innerHTML = `
        <div class="row g-2">
            <div class="col-md-4">
                <label class="form-label form-label-sm">Name</label>
                <input type="text" class="form-control form-control-sm" placeholder="Ingredient name" 
                       value="${name}" data-field="ingredient-name" required>
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Amount</label>
                <input type="text" class="form-control form-control-sm" placeholder="e.g. 100" 
                       value="${amount}" data-field="ingredient-amount" required>
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Unit</label>
                <input type="text" class="form-control form-control-sm" placeholder="e.g. g, ml" 
                       value="${unit}" data-field="ingredient-unit" required>
            </div>
            <div class="col-md-3">
                <label class="form-label form-label-sm">Category</label>
                <select class="form-select form-select-sm" data-field="ingredient-category">
                    <option value="protein" ${category === 'protein' ? 'selected' : ''}>Protein</option>
                    <option value="vegetable" ${category === 'vegetable' ? 'selected' : ''}>Vegetable</option>
                    <option value="fruit" ${category === 'fruit' ? 'selected' : ''}>Fruit</option>
                    <option value="grain" ${category === 'grain' ? 'selected' : ''}>Grain</option>
                    <option value="dairy" ${category === 'dairy' ? 'selected' : ''}>Dairy</option>
                    <option value="fat" ${category === 'fat' ? 'selected' : ''}>Fat/Oil</option>
                    <option value="spice" ${category === 'spice' ? 'selected' : ''}>Spice/Herb</option>
                    <option value="other" ${category === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="col-md-1 d-flex align-items-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeIngredient(${ingredientId})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="col-md-12">
                <label class="form-label form-label-sm">Notes</label>
                <input type="text" class="form-control form-control-sm" placeholder="Optional notes" 
                       value="${notes}" data-field="ingredient-notes">
            </div>
        </div>
    `;
    
    document.getElementById('ingredientsContainer').appendChild(ingredientElement);
    
    // Add to tracking array
    if (!ingredientData) {
        ingredients.push({
            id: ingredientId,
            name: '',
            quantity: '',
            unit: 'g',
            category: 'protein',
            substitution_options: '',
            brand_preference: '',
            calories_contribution: 0,
            protein_contribution: 0,
            is_optional: false,
            order: ingredients.length + 1
        });
    } else {
        // Make sure we have consistent property names and map to backend API fields
        ingredients.push({
            id: ingredientId,
            name: name,
            quantity: amount, // Backend uses quantity instead of amount
            unit: unit,
            category: category, // Used for frontend organization, not stored in backend
            substitution_options: notes, // Map notes to substitution_options
            brand_preference: '',
            calories_contribution: 0,
            protein_contribution: 0,
            is_optional: false,
            order: ingredients.length + 1
        });
    }
}

/**
 * Remove an ingredient from the form
 * @param {number} ingredientId - ID of the ingredient to remove
 */
function removeIngredient(ingredientId) {
    const ingredientElement = document.querySelector(`.ingredient-item[data-ingredient-id="${ingredientId}"]`);
    if (ingredientElement) {
        ingredientElement.remove();
        
        // Update tracking array
        ingredients = ingredients.filter(ingredient => ingredient.id !== ingredientId);
    }
}

/**
 * Edit a meal template
 * @param {number} templateId - ID of the template to edit
 */
function editMealTemplate(templateId) {
    showMealTemplateEditor(templateId);
}

/**
 * Delete a meal template
 * @param {number} templateId - ID of the template to delete
 */
function deleteMealTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this meal template? This action cannot be undone.')) {
        return;
    }

    CoachPlanAPI.mealTemplates.delete(templateId)
        .then(() => {
            showToast('success', 'Meal template deleted successfully');
            loadMealTemplates();
        })
        .catch(error => {
            console.error('Error deleting template:', error);
            showToast('error', `Failed to delete template: ${error.message || 'Unknown error'}`);
        });
}

/**
 * Save the meal template
 */
function saveMealTemplate() {
    // Get form data
    const name = document.getElementById('mealTemplateName').value.trim();
    const mealType = document.getElementById('mealTemplateType').value;
    const category = document.getElementById('mealTemplateCategory').value.trim();
    const prepTimeMinutes = document.getElementById('mealTemplatePreparationTime').value;
    const cookTimeMinutes = document.getElementById('mealTemplateCookingTime').value;
    const description = document.getElementById('mealTemplateDescription').value.trim();
    const calories = document.getElementById('mealTemplateCalories').value;
    const protein = document.getElementById('mealTemplateProtein').value;
    const carbs = document.getElementById('mealTemplateCarbs').value;
    const fats = document.getElementById('mealTemplateFat').value;
    const instructions = document.getElementById('mealTemplateInstructions').value.trim();
    // Use the correct IDs for image/media input elements
    const imageInput = document.getElementById('mealImageInput');
    const newImageFile = imageInput && imageInput.files ? imageInput.files[0] : null;
    
    // Get references to multiple images and videos inputs
    const multipleImagesInput = document.getElementById('mealMultipleImagesInput');
    const videosInput = document.getElementById('mealVideosInput');
    
    // Log current state of media files for debugging
    console.log('Current state before save:', {
        newImageFile,
        imageFile: window.imageFile,
        imageFiles: window.imageFiles,
        videoFiles: window.videoFiles,
    });

    // Required fields validation
    const requiredFields = [
        { id: 'mealTemplateName', label: 'Meal name', value: name },
        { id: 'mealTemplateType', label: 'Meal type', value: mealType },
        { id: 'mealTemplatePreparationTime', label: 'Preparation time', value: prepTimeMinutes },
        { id: 'mealTemplateFat', label: 'Fats', value: fats }
    ];

    // Check each required field
    for (const field of requiredFields) {
        if (!field.value) {
            showToast('error', `${field.label} is required`);
            document.getElementById(field.id).focus();
            document.getElementById(field.id).classList.add('is-invalid');
            return;
        } else {
            document.getElementById(field.id).classList.remove('is-invalid');
        }
    }
    
    // Validate nutritional values are numbers
    const nutritionalFields = [
        { id: 'mealTemplateCalories', label: 'Calories', value: calories },
        { id: 'mealTemplateProtein', label: 'Protein', value: protein },
        { id: 'mealTemplateCarbs', label: 'Carbs', value: carbs },
        { id: 'mealTemplateFat', label: 'Fats', value: fats }
    ];
    
    for (const field of nutritionalFields) {
        if (field.value && isNaN(parseInt(field.value))) {
            showToast('error', `${field.label} must be a number`);
            document.getElementById(field.id).focus();
            document.getElementById(field.id).classList.add('is-invalid');
            return;
        } else {
            document.getElementById(field.id).classList.remove('is-invalid');
        }
    }
    
    // Collect ingredients data
    const ingredientsList = [];
    const ingredientElements = document.getElementById('ingredientsContainer').querySelectorAll('.ingredient-item');
    let ingredientError = false;
    
    ingredientElements.forEach(ingredientElement => {
        const name = ingredientElement.querySelector('[data-field="ingredient-name"]').value.trim();
        const amount = ingredientElement.querySelector('[data-field="ingredient-amount"]').value.trim();
        const unit = ingredientElement.querySelector('[data-field="ingredient-unit"]').value.trim();
        const category = ingredientElement.querySelector('[data-field="ingredient-category"]').value;
        const notes = ingredientElement.querySelector('[data-field="ingredient-notes"]').value.trim();
        
        // Validate each ingredient
        if (!name) {
            ingredientElement.querySelector('[data-field="ingredient-name"]').classList.add('is-invalid');
            ingredientError = true;
        } else {
            ingredientElement.querySelector('[data-field="ingredient-name"]').classList.remove('is-invalid');
        }
        
        if (!amount) {
            ingredientElement.querySelector('[data-field="ingredient-amount"]').classList.add('is-invalid');
            ingredientError = true;
        } else {
            ingredientElement.querySelector('[data-field="ingredient-amount"]').classList.remove('is-invalid');
        }
        
        if (name && amount) {
            ingredientsList.push({
                name: name,
                quantity: amount, // Backend uses quantity instead of amount
                unit: unit,
                category: category, // Used for frontend organization
                notes: notes, // Store notes directly, not as substitution_options
                order: ingredientsList.length + 1
            });
        }
    });
    
    // Show error message if any ingredient fields are invalid
    if (ingredientError) {
        showToast('error', 'All ingredient fields must be filled');
        return;
    }
    
    // At least one ingredient required
    if (ingredientsList.length === 0) {
        showToast('error', 'At least one ingredient is required');
        return;
    }
    
    // Prepare template data with field names exactly matching backend API
    // Use FormData to handle file uploads
    const formData = new FormData();
    
    // Required fields - ensure they have valid values
    formData.append('meal_name', name || 'Untitled Meal');
    formData.append('meal_type', mealType || 'breakfast');
    formData.append('calories', parseInt(calories) || 0);
    formData.append('protein_grams', parseFloat(protein) || 0);
    formData.append('carbs_grams', parseFloat(carbs) || 0);
    formData.append('fats_grams', parseFloat(fats) || 0);
    
    // Optional fields
    // Category is now a separate field in the backend model
    formData.append('category', category || '');
    formData.append('description', description || '');
    formData.append('preparation_time_minutes', parseInt(prepTimeMinutes) || 0);
    formData.append('cooking_time_minutes', parseInt(cookTimeMinutes) || 0);
    formData.append('recipe', instructions || ''); // Backend uses recipe instead of instructions
    
    // Use the helper function to add all media files to the form data
    addMediaToFormData(formData);
    
    // Log form data before submission
    console.log('FormData prepared for submission');
    console.log('Current meal template ID:', currentMealTemplateId);
    console.log('Current template ID:', currentTemplateId);
    
    // Add ingredients data as separate field in JSON format
    // The backend serializer will parse this and create ingredient objects
    const ingredientsData = ingredientsList.map((ingredient, index) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category || '',
        notes: ingredient.notes || ''
    }));
    
    // Log ingredients data for debugging
    console.log('Ingredients data before sending:', ingredientsData);
    
    // Add ingredients directly to the FormData for the serializer to handle
    formData.append('ingredients', JSON.stringify(ingredientsData));
    
    // Log the form data
    console.log('FormData entries:');
    for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
    }
    
    // Create a template first if this is a new meal template
    const saveBtn = document.getElementById('saveMealTemplateBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    if (currentMealTemplateId) {
        // Update existing template
        // Make sure the template field is included when updating
        if (currentTemplateId) {
            formData.append('template', currentTemplateId);
        }
        
        CoachPlanAPI.mealTemplates.update(currentMealTemplateId, formData, true) // true for multipart/form-data
            .then(response => {
                showToast('success', 'Meal template updated successfully');
                
                // Hide modal and reload templates
                bootstrap.Modal.getInstance(document.getElementById('mealTemplateModal')).hide();
                loadMealTemplates();
                
                // Reset button
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            })
            .catch(error => {
                console.error('Error updating meal template:', error);
                const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
                showToast('error', `Failed to update template: ${errorMessage}`);
                
                // Reset button
                saveBtn.innerHTML = originalBtnText;
                saveBtn.disabled = false;
            });
    } else {
        // Get coach profile ID and create plan template
        CoachPlanAPI.getCurrentCoachProfile()
        .then(coachId => {
            if (!coachId) {
                throw new Error('Could not determine coach profile ID. Please try again later.');
            }
            
            console.log('Creating plan template with coach ID:', coachId);
            // Create plan template with coach ID
            return CoachPlanAPI.planTemplates.create({
                name: name || 'Untitled Meal Template',
                description: description || '',
                template_type: 'meal',
                is_public: false,
                coach: coachId
            });
        })
        .then(planTemplate => {
            console.log('Plan template created successfully:', planTemplate);
            // Important: Add template ID to meal template data
            formData.append('template', planTemplate.id);
            
            // Create meal template with the template ID
            console.log('Creating meal template with template ID:', planTemplate.id);
            return CoachPlanAPI.mealTemplates.create(formData, true); // true for multipart/form-data
        })
        .then(response => {
            showToast('success', 'Meal template created successfully');
            
            // Hide modal and reload templates
            bootstrap.Modal.getInstance(document.getElementById('mealTemplateModal')).hide();
            loadMealTemplates();
            
            // Reset button
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error creating meal template:', error);
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
 * @param {string} type - Type of toast (success, error, warning, info)
 * @param {string} message - Message to display
 */
function showToast(type, message) {
    // Check if we're in a modal context
    const modalIsOpen = document.getElementById('mealTemplateModal') && 
                       document.getElementById('mealTemplateModal').classList.contains('show');
    
    // Use the modal toast container if the modal is open, otherwise use the page container
    const containerId = modalIsOpen ? 'modalToastContainer' : 'toastContainer';
    const toastContainer = document.getElementById(containerId) || document.createElement('div');
    
    // Create a page-level toast container if it doesn't exist and we're not in a modal
    if (!document.getElementById(containerId) && !modalIsOpen) {
        toastContainer.id = containerId;
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1050';
        document.body.appendChild(toastContainer);
    }
    
    const toastId = `toast-${Date.now()}`;
    const bgClass = type === 'success' ? 'bg-success' :
                  type === 'error' ? 'bg-danger' :
                  type === 'warning' ? 'bg-warning' :
                  'bg-info';
                  
    const icon = type === 'success' ? 'check-circle-fill' :
                type === 'error' ? 'x-circle-fill' :
                type === 'warning' ? 'exclamation-triangle-fill' :
                'info-circle-fill';
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${icon} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    
    // Remove the toast from the DOM after it's hidden
    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove();
    });
    
    // Log message to console for debugging
    const logPrefix = modalIsOpen ? '[MODAL]' : '[PAGE]';
    console.log(`${logPrefix} ${type.toUpperCase()} TOAST: ${message}`);
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
 * Handle image upload preview
 * @param {Event} event - Change event from file input
 */
function handleImagePreview(event) {
    const fileInput = event.target;
    const previewContainer = document.getElementById('mealTemplateImagePreview');
    const previewImage = previewContainer.querySelector('img');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            previewContainer.style.display = 'block';
        }
        
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        previewImage.src = '';
        previewContainer.style.display = 'none';
    }
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

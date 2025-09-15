/**
 * EazyFit Plan Customization Templates JavaScript
 * Handles template loading and application functionality
 */

const PlanCustomizationTemplates = (() => {
    // Template storage
    let workoutTemplates = [];
    let mealTemplates = [];
    let currentTemplateType = null;

/**
 * Load all templates
 */
function loadTemplates() {
    Promise.all([
        // Load workout templates
        CoachPlanAPI.workoutTemplates.getAll().then(data => {
            workoutTemplates = data.results || [];
            renderWorkoutTemplatesList();
        }),
        // Load meal templates
        CoachPlanAPI.mealTemplates.getAll().then(data => {
            mealTemplates = data.results || [];
            renderMealTemplatesList();
        })
    ]).catch(error => {
        console.error('Error loading templates:', error);
        showToast('danger', 'Failed to load templates');
    });
}

/**
 * Render workout templates list in sidebar
 */
function renderWorkoutTemplatesList() {
    const container = document.getElementById('workoutTemplatesList');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (!workoutTemplates || workoutTemplates.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-2">No workout templates found</div>';
        return;
    }
    
    // Iterate through templates
    workoutTemplates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-list-item mb-2 p-2 border rounded';
        templateItem.dataset.templateId = String(template.id);
        templateItem.dataset.templateType = 'workout';
        
        // Template details
        templateItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${template.name || 'Unnamed Template'}</h6>
                    <div class="small text-muted">
                        ${template.workout_type || 'N/A'} | ${template.duration_minutes || 0} min
                    </div>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary preview-template-btn" title="Preview">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-primary apply-template-btn" title="Apply">
                        <i class="bi bi-check2"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const previewBtn = templateItem.querySelector('.preview-template-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                previewWorkoutTemplate(template.id);
            });
        }
        
        const applyBtn = templateItem.querySelector('.apply-template-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                applyWorkoutTemplate(template.id);
            });
        }
        
        // Add drag & drop functionality
        templateItem.setAttribute('draggable', 'true');
        templateItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: template.id,
                type: 'workout'
            }));
        });
        
        container.appendChild(templateItem);
    });
    // Note: We intentionally avoid a delegated container handler here to prevent
    // duplicate event firing alongside the per-item listeners above.
}

/**
 * Render meal templates list in sidebar
 */
function renderMealTemplatesList() {
    const container = document.getElementById('mealTemplatesList');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (!mealTemplates || mealTemplates.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-2">No meal templates found</div>';
        return;
    }
    
    // Iterate through templates
    mealTemplates.forEach(template => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-list-item mb-2 p-2 border rounded';
        templateItem.dataset.templateId = String(template.id);
        templateItem.dataset.templateType = 'meal';
        
        // Template details
        templateItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${template.meal_name || 'Unnamed Template'}</h6>
                    <div class="small text-muted">
                        ${template.meal_type || 'N/A'} | ${template.calories || 0} kcal
                    </div>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary preview-template-btn" title="Preview">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-primary apply-template-btn" title="Apply">
                        <i class="bi bi-check2"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const previewBtn = templateItem.querySelector('.preview-template-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                previewMealTemplate(template.id);
            });
        }
        
        const applyBtn = templateItem.querySelector('.apply-template-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                applyMealTemplate(template.id);
            });
        }
        
        // Add drag & drop functionality
        templateItem.setAttribute('draggable', 'true');
        templateItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: template.id,
                type: 'meal'
            }));
        });
        
        container.appendChild(templateItem);
    });
}

/**
 * Render workout templates dropdown
 */
function renderWorkoutTemplatesDropdown() {
    const container = document.getElementById('workoutTemplatesDropdown');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (!workoutTemplates || workoutTemplates.length === 0) {
        container.innerHTML = '<li><span class="dropdown-item-text">No workout templates found</span></li>';
        return;
    }
    
    // Group templates by category
    const categories = {};
    workoutTemplates.forEach(template => {
        const category = template.workout_type || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(template);
    });
    
    // Add category headers and templates
    Object.keys(categories).forEach(category => {
        // Add category header
        container.innerHTML += `<li><h6 class="dropdown-header">${category}</h6></li>`;
        
        // Add templates in this category
        categories[category].forEach(template => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            // dataset for robust delegated handling
            link.dataset.templateId = String(template.id);
            link.dataset.templateType = 'workout';
            link.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${template.name}</span>
                    <span class="text-muted ms-3">${template.duration_minutes || 0} min</span>
                </div>
            `;
            
            // Add click event
            link.addEventListener('click', (e) => {
                e.preventDefault();
                applyWorkoutTemplate(template.id);
            });
            
            item.appendChild(link);
            container.appendChild(item);
        });
        
        // Add divider after each category
        container.innerHTML += '<li><hr class="dropdown-divider"></li>';
    });
    
    // Remove last divider
    const dividers = container.querySelectorAll('.dropdown-divider');
    if (dividers.length > 0) {
        dividers[dividers.length - 1].remove();
    }
    // Note: We rely on per-link listeners above; no delegated container handler
    // to avoid duplicate apply calls when events bubble.
}

/**
 * Render meal templates dropdown
 */
function renderMealTemplatesDropdown() {
    const container = document.getElementById('mealTemplatesDropdown');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    if (!mealTemplates || mealTemplates.length === 0) {
        container.innerHTML = '<li><span class="dropdown-item-text">No meal templates found</span></li>';
        return;
    }
    
    // Group templates by category
    const categories = {};
    mealTemplates.forEach(template => {
        const category = template.meal_type || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(template);
    });
    
    // Add category headers and templates
    Object.keys(categories).forEach(category => {
        // Add category header
        container.innerHTML += `<li><h6 class="dropdown-header">${capitalizeFirst(category)}</h6></li>`;
        
        // Add templates in this category
        categories[category].forEach(template => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            // dataset for robust delegated handling
            link.dataset.templateId = String(template.id);
            link.dataset.templateType = 'meal';
            link.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${template.meal_name}</span>
                    <span class="text-muted ms-3">${template.calories || 0} kcal</span>
                </div>
            `;
            
            // Add click event
            link.addEventListener('click', (e) => {
                e.preventDefault();
                applyMealTemplate(template.id);
            });
            
            item.appendChild(link);
            container.appendChild(item);
        });
        
        // Add divider after each category
        container.innerHTML += '<li><hr class="dropdown-divider"></li>';
    });
    
    // Remove last divider
    const dividers = container.querySelectorAll('.dropdown-divider');
    if (dividers.length > 0) {
        dividers[dividers.length - 1].remove();
    }
}

/**
 * Preview a workout template in modal
 * @param {number} templateId - The ID of the workout template
 */
function previewWorkoutTemplate(templateId) {
    // Show modal and loading state
    const modal = document.getElementById('templatePreviewModal');
    const modalTitle = document.getElementById('templatePreviewModalLabel');
    const modalContent = document.getElementById('templatePreviewContent');
    const applyBtn = document.getElementById('applyTemplateBtn');
    
    modalTitle.textContent = 'Workout Template Preview';
    modalContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading template...</p>
        </div>
    `;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Load template data
    CoachPlanAPI.workoutTemplates.getById(templateId)
        .then(template => {
            // Update modal title
            modalTitle.textContent = `Workout Template: ${template.name}`;
            
            // Update modal content
            let html = `
                <div class="workout-template-preview">
                    <div class="row mb-3">
                        <div class="col-md-8">
                            <h5>${template.name || 'Unnamed Workout'}</h5>
                            <p>${template.instructions || 'No description available'}</p>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <ul class="list-unstyled mb-0">
                                        <li><strong>Type:</strong> ${template.workout_type || 'N/A'}</li>
                                        <li><strong>Duration:</strong> ${template.duration_minutes || 0} minutes</li>
                                        <li><strong>Intensity:</strong> ${template.intensity_level || 'N/A'}</li>
                                        <li><strong>Equipment:</strong> ${template.equipment_needed || 'None required'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
            `;
            
            // Add exercises if available
            if (template.exercises && template.exercises.length > 0) {
                html += `
                    <h6 class="mb-3">Exercises</h6>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Exercise</th>
                                    <th>Category</th>
                                    <th>Sets</th>
                                    <th>Reps</th>
                                    <th>Rest</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                template.exercises.forEach(exercise => {
                    html += `
                        <tr>
                            <td>${exercise.exercise_name}</td>
                            <td>${exercise.exercise_category || 'N/A'}</td>
                            <td>${exercise.sets || 0}</td>
                            <td>${exercise.reps || 'N/A'}</td>
                            <td>${exercise.rest_seconds || 0} sec</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                html += `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No exercises found in this template.
                    </div>
                `;
            }
            
            html += '</div>';
            
            // Add replace option for workout (single)
            html += `
                <div class="form-check mt-2">
                    <input class="form-check-input" type="checkbox" value="1" id="replaceExistingCheckbox">
                    <label class="form-check-label" for="replaceExistingCheckbox">
                        Replace existing workout content (unchecked = add/append)
                    </label>
                </div>
            `;
            modalContent.innerHTML = html;
            
            // Update apply button
            applyBtn.textContent = 'Apply to Day';
            applyBtn.dataset.templateId = template.id;
            applyBtn.dataset.templateType = 'workout';
            
            // Add click event to apply button
            applyBtn.onclick = function() {
                const replace = !!document.getElementById('replaceExistingCheckbox')?.checked;
                if (PlanCustomizationData && typeof PlanCustomizationData.applyTemplate === 'function') {
                    PlanCustomizationData.applyTemplate('workout', template.id, replace);
                } else {
                    showToast('danger', 'Template application not available');
                }
                bsModal.hide();
            };
        })
        .catch(error => {
            console.error('Error loading workout template:', error);
            modalContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load template: ${error.message || 'Unknown error'}
                </div>
            `;
        });
}

/**
 * Preview a meal template in modal
 * @param {number} templateId - The ID of the meal template
 */
function previewMealTemplate(templateId) {
    // Show modal and loading state
    const modal = document.getElementById('templatePreviewModal');
    const modalTitle = document.getElementById('templatePreviewModalLabel');
    const modalContent = document.getElementById('templatePreviewContent');
    const applyBtn = document.getElementById('applyTemplateBtn');
    
    modalTitle.textContent = 'Meal Template Preview';
    modalContent.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading template...</p>
        </div>
    `;
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Load template data
    CoachPlanAPI.mealTemplates.getById(templateId)
        .then(template => {
            // Update modal title
            modalTitle.textContent = `Meal Template: ${template.meal_name}`;
            
            // Update modal content
            let html = `
                <div class="meal-template-preview">
                    <div class="row mb-3">
                        <div class="col-md-8">
                            <h5>${template.meal_name || 'Unnamed Meal'}</h5>
                            <p>${template.description || 'No description available'}</p>
                        </div>
                        <div class="col-md-4">
                            <div class="card">
                                <div class="card-body">
                                    <h6>Nutrition Facts</h6>
                                    <ul class="list-unstyled mb-0">
                                        <li><strong>Calories:</strong> ${template.calories || 0} kcal</li>
                                        <li><strong>Protein:</strong> ${template.protein_grams || 0}g</li>
                                        <li><strong>Carbs:</strong> ${template.carbs_grams || 0}g</li>
                                        <li><strong>Fats:</strong> ${template.fats_grams || 0}g</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="mb-2">Preparation Details</h6>
                            <ul class="list-unstyled">
                                <li><strong>Meal Type:</strong> ${capitalizeFirst(template.meal_type || 'N/A')}</li>
                                <li><strong>Category:</strong> ${template.category || 'N/A'}</li>
                                <li><strong>Prep Time:</strong> ${template.preparation_time_minutes || 0} min</li>
                                <li><strong>Cook Time:</strong> ${template.cooking_time_minutes || 0} min</li>
                            </ul>
                        </div>
                    </div>
            `;
            
            // Add ingredients if available
            if (template.ingredients && template.ingredients.length > 0) {
                html += `
                    <h6 class="mt-3 mb-2">Ingredients</h6>
                    <ul class="list-group mb-3">
                `;
                
                template.ingredients.forEach(ingredient => {
                    html += `
                        <li class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <span>
                                    <strong>${ingredient.name}</strong>
                                    ${ingredient.notes ? `<small class="text-muted"> (${ingredient.notes})</small>` : ''}
                                </span>
                                <span>${ingredient.quantity} ${ingredient.unit}</span>
                            </div>
                        </li>
                    `;
                });
                
                html += '</ul>';
            } else {
                html += `
                    <div class="alert alert-info mt-3">
                        <i class="bi bi-info-circle-fill me-2"></i>
                        No ingredients found in this template.
                    </div>
                `;
            }
            
            // Add recipe if available
            if (template.recipe) {
                html += `
                    <h6 class="mt-3 mb-2">Recipe</h6>
                    <div class="card">
                        <div class="card-body">
                            ${template.recipe}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            
            // Update modal content
            modalContent.innerHTML = html;
            
            // Update apply button
            applyBtn.textContent = 'Apply to Day';
            applyBtn.dataset.templateId = template.id;
            applyBtn.dataset.templateType = 'meal';
            
            // Add click event to apply button
            applyBtn.onclick = function() {
                const replace = !!document.getElementById('replaceExistingCheckbox')?.checked;
                if (PlanCustomizationData && typeof PlanCustomizationData.applyTemplate === 'function') {
                    PlanCustomizationData.applyTemplate('meal', template.id, replace);
                } else {
                    showToast('danger', 'Template application not available');
                }
                bsModal.hide();
            };
        })
        .catch(error => {
            console.error('Error loading meal template:', error);
            modalContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    Failed to load template: ${error.message || 'Unknown error'}
                </div>
            `;
        });
}

/**
 * Apply a workout template to the current day
 * @param {number} templateId - The ID of the workout template
 */
function applyWorkoutTemplate(templateId) {
    // Find template in loaded templates (tolerate string/number ids)
    const template = workoutTemplates.find(t => String(t.id) === String(templateId));
    
    if (!template) {
        showToast('danger', 'Workout template not found');
        return;
    }
    
    // Apply template via data module (server-side)
    if (PlanCustomizationData && typeof PlanCustomizationData.applyTemplate === 'function') {
        const replace = !!document.getElementById('workoutReplaceToggle')?.checked;
        PlanCustomizationData.applyTemplate('workout', parseInt(templateId, 10), replace);
    } else {
        showToast('danger', 'Template application not available');
    }
}

/**
 * Apply a meal template to the current day
 * @param {number} templateId - The ID of the meal template
 */
function applyMealTemplate(templateId) {
    // Find template in loaded templates (tolerate string/number ids)
    const template = mealTemplates.find(t => String(t.id) === String(templateId));
    
    if (!template) {
        showToast('danger', 'Meal template not found');
        return;
    }
    
    // Apply template to current day
    if (PlanCustomizationData && typeof PlanCustomizationData.applyTemplate === 'function') {
        const replace = !!document.getElementById('mealReplaceToggle')?.checked;
        PlanCustomizationData.applyTemplate('meal', parseInt(templateId, 10), replace);
    } else {
        showToast('danger', 'Template application not available');
    }
}

/**
 * Load a workout template UI
 * @param {Object} template - The workout template object
 */
function loadWorkoutTemplate(template) {
    // Show content, hide empty state
    document.getElementById('workoutEmptyState').style.display = 'none';
    document.getElementById('workoutContent').style.display = 'block';
    
    // Update header info
    document.getElementById('workoutName').textContent = template.name || 'Unnamed Workout';
    document.getElementById('workoutType').textContent = template.workout_type || 'N/A';
    document.getElementById('workoutDuration').textContent = `${template.duration_minutes || 0} min`;
    document.getElementById('workoutIntensity').textContent = template.intensity_level || 'N/A';
    
    // Render exercise blocks
    renderExerciseBlocks(template);
}

/**
 * Load a meal template UI
 * @param {Object} template - The meal template object
 */
function loadMealTemplate(template) {
    // Show content, hide empty state
    document.getElementById('mealEmptyState').style.display = 'none';
    document.getElementById('mealContent').style.display = 'block';
    
    // Update header info
    document.getElementById('nutritionPlanName').textContent = template.meal_name || 'Unnamed Meal';
    document.getElementById('nutritionPlanType').textContent = template.category || capitalizeFirst(template.meal_type) || 'N/A';
    document.getElementById('nutritionCalories').textContent = `${template.calories || 0} kcal`;
    document.getElementById('nutritionProtein').textContent = `${template.protein_grams || 0}g`;
    document.getElementById('nutritionCarbs').textContent = `${template.carbs_grams || 0}g`;
    document.getElementById('nutritionFats').textContent = `${template.fats_grams || 0}g`;
    
    // Render meals
    renderMeals(template);
}

/**
 * Render exercise blocks from a workout template
 * @param {Object} template - The workout template
 */
function renderExerciseBlocks(template) {
    const container = document.getElementById('exerciseBlocksContainer');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Group exercises by block
    const exercisesByBlock = {};
    
    if (template.exercises && template.exercises.length > 0) {
        template.exercises.forEach(exercise => {
            const blockKey = `${exercise.block_name || 'Main Block'}-${exercise.block_type || 'circuit'}`;
            if (!exercisesByBlock[blockKey]) {
                exercisesByBlock[blockKey] = [];
            }
            exercisesByBlock[blockKey].push(exercise);
        });
    }
    
    // No exercises case
    if (Object.keys(exercisesByBlock).length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle-fill me-2"></i>
                This template does not contain any exercises.
            </div>
        `;
        return;
    }
    
    // Create blocks
    Object.keys(exercisesByBlock).forEach(blockKey => {
        const exercises = exercisesByBlock[blockKey];
        const [blockName, blockType] = blockKey.split('-');
        
        const blockEl = document.createElement('div');
        blockEl.className = 'exercise-block mb-3 p-3 border rounded';
        
        // Block header
        blockEl.innerHTML = `
            <div class="exercise-block-header mb-3">
                <h6>${blockName}</h6>
                <span class="badge ${getBlockTypeBadgeClass(blockType)}">${capitalizeFirst(blockType.replace('_', ' '))}</span>
            </div>
        `;
        
        // Exercises table
        const tableEl = document.createElement('div');
        tableEl.className = 'table-responsive';
        tableEl.innerHTML = `
            <table class="table table-sm">
                <thead class="table-light">
                    <tr>
                        <th>Exercise</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Rest</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `;
        
        const tbody = tableEl.querySelector('tbody');
        
        // Add exercises
        exercises.forEach(exercise => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${exercise.exercise_name}</td>
                <td>${exercise.sets || 0}</td>
                <td>${exercise.reps || 'N/A'}</td>
                <td>${exercise.rest_seconds || 0}s</td>
                <td>${exercise.exercise_category || 'N/A'}</td>
            `;
            tbody.appendChild(tr);
        });
        
        blockEl.appendChild(tableEl);
        container.appendChild(blockEl);
    });
}

/**
 * Get badge class for block type
 * @param {string} blockType - The block type
 * @returns {string} Badge class
 */
function getBlockTypeBadgeClass(blockType) {
    const typeMap = {
        'circuit': 'bg-primary',
        'superset': 'bg-success',
        'straight_set': 'bg-info',
        'pyramid': 'bg-warning',
        'drop_set': 'bg-danger',
        'hiit': 'bg-purple',
        'amrap': 'bg-orange',
        'emom': 'bg-teal'
    };
    
    return typeMap[blockType] || 'bg-secondary';
}

/**
 * Render meals from a meal template
 * @param {Object} template - The meal template
 */
function renderMeals(template) {
    const container = document.getElementById('mealsContainer');
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Check if we have ingredients
    if (!template.ingredients || template.ingredients.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle-fill me-2"></i>
                This template does not contain any ingredients.
            </div>
        `;
        return;
    }
    
    // Group ingredients by category
    const ingredientsByCategory = {};
    template.ingredients.forEach(ingredient => {
        const category = ingredient.category || 'Uncategorized';
        if (!ingredientsByCategory[category]) {
            ingredientsByCategory[category] = [];
        }
        ingredientsByCategory[category].push(ingredient);
    });
    
    // Create meal sections
    const mealEl = document.createElement('div');
    mealEl.className = 'meal-ingredients mb-3';
    
    // Meal header
    mealEl.innerHTML = `
        <h6 class="mb-3">Ingredients</h6>
    `;
    
    // Create ingredient lists by category
    Object.keys(ingredientsByCategory).forEach(category => {
        const ingredients = ingredientsByCategory[category];
        
        const categoryEl = document.createElement('div');
        categoryEl.className = 'ingredient-category mb-3';
        
        categoryEl.innerHTML = `
            <h6 class="ingredient-category-title mb-2">${category}</h6>
            <ul class="list-group mb-3">
                ${ingredients.map(ingredient => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${ingredient.name} ${ingredient.notes ? `<small class="text-muted">(${ingredient.notes})</small>` : ''}</span>
                        <span class="badge bg-light text-dark">${ingredient.quantity} ${ingredient.unit}</span>
                    </li>
                `).join('')}
            </ul>
        `;
        
        mealEl.appendChild(categoryEl);
    });
    
    // Add recipe if available
    if (template.recipe) {
        const recipeEl = document.createElement('div');
        recipeEl.className = 'meal-recipe mb-3';
        
        recipeEl.innerHTML = `
            <h6 class="mb-2">Preparation Instructions</h6>
            <div class="card">
                <div class="card-body">
                    ${template.recipe}
                </div>
            </div>
        `;
        
        mealEl.appendChild(recipeEl);
    }
    
    container.appendChild(mealEl);
}

/**
 * Open the template selection modal
 * @param {string} type - Template type ('workout' or 'meal')
 */
function openTemplateModal(type) {
    currentTemplateType = type;
    
    // Show appropriate modal based on type
    const modalId = `${type}TemplateModal`;
    const modal = document.getElementById(modalId) || document.getElementById('templateModal');
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    } else {
        showToast('error', 'Template selection not available');
    }
}

/**
 * Show toast notification
 */
function showToast(type, message, duration = 5000) {
    if (window.showToast) {
        window.showToast(type, message, duration);
    } else {
        console.log(`${type}: ${message}`);
        alert(message);
    }
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Public API
return {
    loadTemplates,
    renderWorkoutTemplatesList,
    renderMealTemplatesList,
    renderWorkoutTemplatesDropdown,
    renderMealTemplatesDropdown,
    previewWorkoutTemplate,
    previewMealTemplate,
    applyWorkoutTemplate,
    applyMealTemplate,
    openTemplateModal
};

})();

/**
 * Workout Template Creation JavaScript
 * Handles workout template creation and management UI components
 */

// View workout template details
function viewWorkoutTemplate(templateId) {
    console.log('Viewing workout template:', templateId);
    
    // Hide templates list and editor
    document.querySelector('.workout-templates-container').style.display = 'none';
    document.getElementById('workoutTemplateEditor').style.display = 'none';
    
    // Show loading state in the preview container
    const previewContainer = document.getElementById('workoutTemplatePreview') || 
                              createWorkoutTemplatePreviewContainer();
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading template...</span>
            </div>
        </div>
    `;
    
    // Load template details
    CoachPlanAPI.workoutTemplates.getById(templateId)
        .then(template => {
            // Render template details
            previewContainer.innerHTML = createWorkoutTemplatePreviewHTML(template);
            
            // Add event listeners to buttons
            document.getElementById('backToWorkoutListBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.workout-templates-container').style.display = 'block';
            });
            
            document.getElementById('editCurrentWorkoutTemplateBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                editWorkoutTemplate(template.id);
            });
        })
        .catch(error => {
            console.error('Error loading workout template details:', error);
            previewContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading template details: ${error.message || 'Unknown error'}
                </div>
                <button class="btn btn-secondary btn-sm" id="backToWorkoutListErrorBtn">
                    <i class="bi bi-arrow-left me-1"></i> Back to List
                </button>
            `;
            
            document.getElementById('backToWorkoutListErrorBtn')?.addEventListener('click', () => {
                previewContainer.style.display = 'none';
                document.querySelector('.workout-templates-container').style.display = 'block';
            });
        });
}

// Create HTML for workout template preview
function createWorkoutTemplatePreviewHTML(template) {
    let exerciseBlocksHtml = '';
    
    // Generate exercise blocks
    if (template.exercise_blocks && template.exercise_blocks.length > 0) {
        exerciseBlocksHtml = template.exercise_blocks.map((block, blockIndex) => {
            // Generate exercises list for this block
            let exercisesHtml = '';
            if (block.exercises && block.exercises.length > 0) {
                exercisesHtml = block.exercises.map((exercise, exerciseIndex) => `
                    <div class="exercise-item p-3 border-bottom ${exerciseIndex === block.exercises.length - 1 ? 'border-0' : ''}">
                        <div class="d-flex justify-content-between">
                            <h6 class="mb-1">${exercise.name}</h6>
                            <span class="badge bg-light text-dark">${exercise.muscle_group || 'Not specified'}</span>
                        </div>
                        <div class="d-flex mt-2 mb-2">
                            <div class="me-3">
                                <small class="text-muted d-block">Sets</small>
                                <span class="badge bg-primary">${exercise.sets || 1}</span>
                            </div>
                            <div class="me-3">
                                <small class="text-muted d-block">Reps/Duration</small>
                                <span class="badge bg-primary">${exercise.reps || '-'}</span>
                            </div>
                            <div>
                                <small class="text-muted d-block">Rest</small>
                                <span class="badge bg-primary">${exercise.rest || 0}s</span>
                            </div>
                        </div>
                        ${exercise.instructions ? `<p class="small text-muted mb-0">${exercise.instructions}</p>` : ''}
                    </div>
                `).join('');
            } else {
                exercisesHtml = `<div class="p-3"><em class="text-muted">No exercises defined for this block</em></div>`;
            }
            
            return `
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Block ${blockIndex + 1}: ${block.name || 'Unnamed Block'}</h5>
                        </div>
                        ${block.instructions ? `<p class="text-muted small mb-0">${block.instructions}</p>` : ''}
                    </div>
                    <div class="card-body p-0">
                        ${exercisesHtml}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        exerciseBlocksHtml = `
            <div class="alert alert-light">
                <i class="bi bi-info-circle-fill me-2 text-muted"></i>
                No exercise blocks defined in this template.
            </div>
        `;
    }
    
    return `
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
        
        <div class="card mb-3">
            <div class="card-header bg-light">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${template.name || 'Unnamed Template'}</h5>
                    <div>
                        <span class="badge bg-secondary me-2">Difficulty: ${getDifficultyText(template.difficulty)}</span>
                        <span class="badge bg-info">${template.duration || 45} min</span>
                    </div>
                </div>
                <p class="text-muted small mb-0">
                    ${template.category ? `Category: ${template.category}` : ''}
                </p>
            </div>
            <div class="card-body">
                <p class="card-text">${template.description || 'No description provided.'}</p>
                
                ${template.instructions ? `
                    <h6 class="mt-3 mb-2">Instructions</h6>
                    <p class="card-text">${template.instructions}</p>
                ` : ''}
                
                <h6 class="mt-3 mb-2">Exercise Blocks</h6>
                ${exerciseBlocksHtml}
            </div>
        </div>
    `;
}

// Helper function to get difficulty text from value
function getDifficultyText(value) {
    switch (parseInt(value) || 3) {
        case 1: return 'Beginner';
        case 2: return 'Easy';
        case 3: return 'Moderate';
        case 4: return 'Challenging';
        case 5: return 'Advanced';
        default: return 'Moderate';
    }
}

// Create a container for workout template preview
function createWorkoutTemplatePreviewContainer() {
    const previewContainer = document.createElement('div');
    previewContainer.id = 'workoutTemplatePreview';
    previewContainer.className = 'template-preview';
    document.getElementById('workout-template').querySelector('.card-body').appendChild(previewContainer);
    return previewContainer;
}

// Edit workout template
function editWorkoutTemplate(templateId) {
    // Show editor
    document.querySelector('.workout-templates-container').style.display = 'none';
    const editor = document.getElementById('workoutTemplateEditor');
    editor.style.display = 'block';
    
    // Show loading state
    showLoadingOverlay('Loading workout template...');
    
    // Add hidden template ID field if not exists
    if (!document.getElementById('workoutTemplateId')) {
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.id = 'workoutTemplateId';
        document.getElementById('workoutTemplateForm').appendChild(hiddenField);
    }
    
    // Load template details
    CoachPlanAPI.workoutTemplates.getById(templateId)
        .then(template => {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Set template ID
            document.getElementById('workoutTemplateId').value = template.id;
            
            // Set basic template details
            document.getElementById('workoutTemplateName').value = template.name || '';
            document.getElementById('workoutTemplateCategory').value = template.category || '';
            document.getElementById('workoutTemplateDifficulty').value = template.difficulty || 3;
            document.getElementById('workoutTemplateDuration').value = template.duration || 45;
            document.getElementById('workoutTemplateDescription').value = template.description || '';
            document.getElementById('workoutTemplateInstructions').value = template.instructions || '';
            
            // Clear existing blocks
            const blocksContainer = document.getElementById('exerciseBlocksContainer');
            blocksContainer.innerHTML = '';
            
            // Add exercise blocks
            if (template.exercise_blocks && template.exercise_blocks.length > 0) {
                template.exercise_blocks.forEach(block => {
                    addExerciseBlock(block);
                });
            } else {
                // Add empty block if none exist
                addExerciseBlock();
            }
        })
        .catch(error => {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Show error message
            console.error('Error loading workout template for editing:', error);
            showToast('error', `Failed to load workout template: ${error.message || 'Unknown error'}`);
            hideWorkoutTemplateEditor();
        });
}

// Delete workout template
function deleteWorkoutTemplate(templateId) {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this workout template? This action cannot be undone.')) {
        return;
    }
    
    // Show loading overlay
    showLoadingOverlay('Deleting workout template...');
    
    // Delete template
    CoachPlanAPI.workoutTemplates.delete(templateId)
        .then(() => {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Show success message
            showToast('success', 'Workout template deleted successfully');
            
            // Refresh templates list
            loadWorkoutTemplates();
        })
        .catch(error => {
            // Hide loading overlay
            hideLoadingOverlay();
            
            // Show error message
            console.error('Error deleting workout template:', error);
            showToast('error', `Failed to delete workout template: ${error.message || 'Unknown error'}`);
        });
}

// Show loading overlay
function showLoadingOverlay(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner-wrapper">
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="spinner-message text-light mt-3" id="loadingMessage"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    document.getElementById('loadingMessage').textContent = message;
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
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

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
    
    // Setup event listeners
    document.getElementById('createWorkoutTemplateBtn').addEventListener('click', function() {
        showWorkoutTemplateEditor();
    });
    
    document.getElementById('emptyStateCreateWorkoutTemplate').addEventListener('click', function() {
        showWorkoutTemplateEditor();
    });
    
    document.getElementById('addExerciseBlockBtn').addEventListener('click', function() {
        addExerciseBlock();
    });
    
    document.getElementById('saveWorkoutTemplateBtn').addEventListener('click', function() {
        saveWorkoutTemplate();
    });
    
    // Initialize file preview functionality
    initializeFileInputPreviews();
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
    
    // Reset image and video previews
    const mainImagePreview = document.getElementById('workoutImagePreview');
    const additionalImagesPreview = document.getElementById('additionalImagesPreview');
    const videosPreview = document.getElementById('videosPreview');
    
    if (mainImagePreview) mainImagePreview.innerHTML = '';
    if (additionalImagesPreview) additionalImagesPreview.innerHTML = '';
    if (videosPreview) videosPreview.innerHTML = '';
    
    // Reset global variables
    currentWorkoutTemplateId = templateId;
    exerciseBlocks = [];
    
    // Remove any existing hidden inputs for media removal
    const existingRemoveImagesInput = document.getElementById('remove_images');
    const existingRemoveVideosInput = document.getElementById('remove_videos');
    if (existingRemoveImagesInput) existingRemoveImagesInput.remove();
    if (existingRemoveVideosInput) existingRemoveVideosInput.remove();
    
    // Set modal title based on edit/create mode
    const modalTitle = document.getElementById('workoutTemplateModalTitle');
    if (modalTitle) {
        modalTitle.textContent = templateId ? 'Edit Workout Template' : 'Create Workout Template';
    }
    
    if (templateId) {
        // Show loading indicator
        const loadingElement = document.createElement('div');
        loadingElement.id = 'templateLoadingIndicator';
        loadingElement.className = 'text-center my-4';
        loadingElement.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading template data...</p>
        `;
        
        document.getElementById('exerciseBlocksContainer').appendChild(loadingElement);
        
        // Fetch template data from API
        CoachPlanAPI.workoutTemplates.getById(templateId)
            .then(template => {
                console.log('Loaded template:', template);
                
                // Fill form with template data
                document.getElementById('workoutTemplateName').value = template.name || '';
                document.getElementById('workoutType').value = template.workout_type || 'strength_training';
                document.getElementById('workoutDuration').value = template.duration_minutes || 30;
                document.getElementById('intensityLevel').value = template.intensity_level || 'moderate';
                document.getElementById('workoutDescription').value = template.instructions || '';
                document.getElementById('workoutEquipment').value = template.equipment_needed || '';
                
                // Display existing main image if any
                if (template.workout_image) {
                    displayImagePreview('workoutImagePreview', template.workout_image);
                }
                
                // Display existing additional images if any
                if (template.workout_images && template.workout_images.length > 0) {
                    template.workout_images.forEach(img => {
                        displayImagePreview('additionalImagesPreview', img.image, img.id);
                    });
                }
                
                // Display existing videos if any
                if (template.workout_videos && template.workout_videos.length > 0) {
                    template.workout_videos.forEach(vid => {
                        displayVideoPreview('videosPreview', vid.video, vid.id);
                    });
                }
                
                // Create blocks and add exercises
                Object.keys(exercisesByBlock).forEach((blockId, index) => {
                    const blockExercises = exercisesByBlock[blockId];
                    const blockName = blockId === 'default' ? `Block ${index + 1}` : blockId;
                    const blockType = 'circuit'; // Default type, adjust as needed
                    
                    // Create exercise block
                    const newBlockId = addExerciseBlock(blockName, blockType);
                    
                    // Add exercises to this block
                    blockExercises.forEach(exercise => {
                        addExerciseToBlock(newBlockId, exercise);
                    });
                });
                
                // If no blocks were created (no exercises), add an empty one
                if (Object.keys(exercisesByBlock).length === 0) {
                    addExerciseBlock();
                }
            })
            .catch(error => {
                console.error('Error loading template for edit:', error);
                showToast('error', 'Failed to load template data');
                
                // Remove loading indicator and add empty block
                const loadingIndicator = document.getElementById('templateLoadingIndicator');
                if (loadingIndicator) loadingIndicator.remove();
                
                addExerciseBlock();
            });
    } else {
        // Adding new template, create an empty exercise block
        addExerciseBlock();
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('workoutTemplateModal'));
    modal.show();
}

/**
 * Save the workout template
 */
async function saveWorkoutTemplate() {
    // Get all form values
    const name = document.getElementById('workoutTemplateName').value.trim();
    const workoutType = document.getElementById('workoutType').value;
    const duration = document.getElementById('workoutDuration').value;
    const intensityLevel = document.getElementById('intensityLevel').value;
    const instructions = document.getElementById('workoutDescription').value.trim();
    const equipment = document.getElementById('workoutEquipment').value.trim();
    
    // Get file inputs
    const mainImageInput = document.getElementById('workoutImage');
    const additionalImagesInput = document.getElementById('additionalImages');
    const videosInput = document.getElementById('workoutVideos');
    
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
    
    // Get save button reference
    const saveBtn = document.querySelector('#saveWorkoutTemplateBtn') || document.querySelector('button[type="submit"]');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Save';
    
    // Show loading state
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
    }
    
    blockElements.forEach((blockElement, blockIndex) => {
        const blockId = parseInt(blockElement.dataset.blockId);
        const blockNameField = blockElement.querySelector('[data-field="block-name"]');
        const blockTypeField = blockElement.querySelector('[data-field="block-type"]');
        
        const blockName = blockNameField ? blockNameField.value.trim() : `Block ${blockIndex + 1}`;
        const blockType = blockTypeField ? blockTypeField.value : 'circuit';
        
        // Create block object
        const blockData = {
            id: blockId,
            name: blockName,
            type: blockType,
            exercises: []
        };
        
        // Add exercises to the collection with validation
        const exerciseElements = blockElement.querySelectorAll('.exercise-item');
        let exerciseError = false;
        
        exerciseElements.forEach((exerciseElement, exerciseIndex) => {
            if (exerciseElement) {
                const exerciseId = exerciseElement.dataset.exerciseId || exerciseElement.id;
                const nameField = exerciseElement.querySelector('[data-field="exercise-name"]');
                const exerciseName = nameField ? nameField.value.trim() : '';
                
                if (!exerciseName) {
                    exerciseError = true;
                    showToast('error', `Exercise name is required in block ${blockIndex + 1}, exercise ${exerciseIndex + 1}`);
                    return;
                }
                
                // Get fields
                const categoryField = exerciseElement.querySelector('[data-field="exercise-category"]');
                const setsField = exerciseElement.querySelector('[data-field="sets"]');
                const repsField = exerciseElement.querySelector('[data-field="reps"]');
                const restField = exerciseElement.querySelector('[data-field="rest"]');
                const instructionsField = exerciseElement.querySelector('[data-field="instructions"]');
                
                // Build exercise object
                const exerciseObj = {
                    exercise_name: exerciseName,
                    exercise_category: categoryField ? categoryField.value : 'chest',
                    sets: setsField ? parseInt(setsField.value) || 3 : 3,
                    reps: repsField ? repsField.value.trim() || '8-12' : '8-12',
                    rest_seconds: restField ? parseInt(restField.value) || 60 : 60,
                    instructions: instructionsField ? instructionsField.value.trim() : '',
                    block_id: blockName, // Store block name as identifier
                    block_type: blockType,
                    order: exerciseIndex + 1
                };
                
                // Handle media files
                const imageFile = document.getElementById(`exercise-image-${exerciseId}`);
                const videoFile = document.getElementById(`exercise-video-${exerciseId}`);
                const imagePreview = document.getElementById(`image-preview-${exerciseId}`);
                const videoPreview = document.getElementById(`video-preview-${exerciseId}`);
                
                // Get any existing media URLs from previews
                if (imagePreview) {
                    const img = imagePreview.querySelector('img');
                    if (img && img.src && img.src.startsWith('http')) {
                        exerciseObj.existing_image_url = img.src;
                    }
                }
                
                if (videoPreview) {
                    const link = videoPreview.querySelector('a');
                    if (link && link.href && link.href.startsWith('http')) {
                        exerciseObj.existing_video_url = link.href;
                    }
                }
                
                // Handle new file uploads
                if (imageFile && imageFile.files && imageFile.files[0]) {
                    exerciseObj.demonstration_image = imageFile.files[0];
                    console.log(`Added image file for exercise ${exerciseName}:`, imageFile.files[0].name);
                }
                
                if (videoFile && videoFile.files && videoFile.files[0]) {
                    exerciseObj.demonstration_video = videoFile.files[0];
                    console.log(`Added video file for exercise ${exerciseName}:`, videoFile.files[0].name);
                }

                // Add exercise to the block's exercises array
                blockData.exercises.push(exerciseObj);
            }
        });

        // Return early if exercise validation failed
        if (exerciseError) {
            showToast('error', 'All exercise names must be filled');
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
            return;
        }

        if (blockData.exercises.length === 0) {
            showToast('error', `Block ${blockIndex + 1} has no exercises. Please add at least one exercise.`);
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
            return;
        }

        // Add this block to the blocks array
        blocks.push(blockData);
    });

    if (blocks.length === 0) {
        showToast('error', 'At least one exercise block with exercises is required');
        return;
    }
    
    // Prepare FormData to handle file uploads
    const formData = new FormData();
    
    // Add basic template info - make sure strings aren't empty
    formData.append('name', name || 'Workout Template');
    formData.append('workout_type', workoutType || 'strength_training');
    formData.append('duration_minutes', parseInt(duration) || 30);
    formData.append('intensity_level', intensityLevel || 'moderate');
    formData.append('instructions', instructions);
    formData.append('equipment_needed', equipment);
    
    // Add blocks data as JSON
    formData.append('blocks_data', JSON.stringify(blocks));
    
    // Debug log all form data entries
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`${key}: File - ${value.name} (${value.type})`);
        } else if (value instanceof Blob) {
            console.log(`${key}: Blob - ${value.size} bytes`);
        } else {
            console.log(`${key}: ${value}`);
        }
    }
    
    // Add main workout image if selected
    if (mainImageInput && mainImageInput.files && mainImageInput.files[0]) {
        formData.append('workout_image', mainImageInput.files[0]);
        console.log('Adding main workout image:', mainImageInput.files[0].name);
    }
    
    // Add additional images if selected
    if (additionalImagesInput && additionalImagesInput.files && additionalImagesInput.files.length > 0) {
        for (let i = 0; i < additionalImagesInput.files.length; i++) {
            formData.append('workout_images', additionalImagesInput.files[i]);
            console.log('Adding additional image:', additionalImagesInput.files[i].name);
        }
    }
    
    // Add videos if selected
    if (videosInput && videosInput.files && videosInput.files.length > 0) {
        for (let i = 0; i < videosInput.files.length; i++) {
            formData.append('workout_videos', videosInput.files[i]);
            console.log('Adding video:', videosInput.files[i].name);
        }
    }
    
    // Add IDs of images/videos to remove if any
    const removeImagesInput = document.getElementById('remove_images');
    const removeVideosInput = document.getElementById('remove_videos');
    
    if (removeImagesInput && removeImagesInput.value) {
        formData.append('remove_images', removeImagesInput.value);
    }
    
    if (removeVideosInput && removeVideosInput.value) {
        formData.append('remove_videos', removeVideosInput.value);
    }
    
    // Use the save button reference we already have above
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    saveBtn.disabled = true;
    
    try {
        // Create or update the workout template
        if (currentWorkoutTemplateId) {
            // Update existing template
            console.log('Updating workout template with ID:', currentWorkoutTemplateId);
            
            // Ensure we have the plan template ID for update
            const workoutTemplate = await CoachPlanAPI.workoutTemplates.getById(currentWorkoutTemplateId);
            
            if (workoutTemplate && workoutTemplate.template) {
                formData.append('template', workoutTemplate.template);
            }
            
            // Call update API with multipart form data
            const response = await CoachPlanAPI.workoutTemplates.update(currentWorkoutTemplateId, formData, true);
            console.log('Workout template updated:', response);
            
            showToast('success', 'Workout template updated successfully');
            
            // Hide modal and reload templates
            const modalElement = document.getElementById('workoutTemplateModal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            
            // Reload template list
            loadWorkoutTemplates();
        } else {
            // Create new template workflow
            console.log('Creating new workout template');
            
            // Get coach profile ID first
            const coachId = await CoachPlanAPI.getCurrentCoachProfile();
            
            if (!coachId) {
                throw new Error('Could not determine coach profile ID');
            }
            
            console.log('Got coach profile ID:', coachId);
            
            // Create plan template
            const planTemplateData = {
                name: name || 'Workout Template',
                description: instructions || '',
                template_type: 'workout',
                coach: coachId,
                is_public: false
            };
            
            console.log('Creating plan template with data:', planTemplateData);
            const planTemplate = await CoachPlanAPI.planTemplates.create(planTemplateData);
            console.log('Plan template created:', planTemplate);
            
            // Add template ID to form data
            formData.append('template', planTemplate.id);
            
            // Log form data after adding template
            console.log('FormData with template ID:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`${key}: File - ${value.name} (${value.type})`);
                } else if (value instanceof Blob) {
                    console.log(`${key}: Blob - ${value.size} bytes`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
            
            // Create workout template
            console.log('Creating workout template with FormData...');
            const workoutTemplate = await CoachPlanAPI.workoutTemplates.create(formData, true);
            console.log('Workout template created:', workoutTemplate);
            
            showToast('success', 'Workout template created successfully');
            
            // Hide modal and reload templates
            const modalElement = document.getElementById('workoutTemplateModal');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            
            // Reload template list
            loadWorkoutTemplates();
        }
    } catch (error) {
        handleSaveError(error, saveBtn, originalBtnText);
        return;
    } finally {
        // Reset button state
        if (saveBtn) {
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        }
    }
}

/**
 * Handle errors in the save operation
 * @param {Error} error - The error object
 * @param {HTMLElement} saveBtn - The save button element
 * @param {string} originalBtnText - The original button text
 */
function handleSaveError(error, saveBtn, originalBtnText) {
    console.error('Error saving workout template:', error);
    
    // Extract error details for better error messages
    let errorMessage = 'Unknown error';
    
    if (error.errorJSON) {
        // Handle structured error response
        if (error.errorJSON.errors && Array.isArray(error.errorJSON.errors)) {
            // Format validation errors
            errorMessage = error.errorJSON.errors.map(err => 
                `${err.attr || ''}: ${err.detail || 'Error'}`
            ).join('\n');
        } else if (error.errorJSON.detail) {
            errorMessage = error.errorJSON.detail;
        }
    } else if (error.error) {
        errorMessage = error.error;
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    // Show toast with detailed error
    showToast('error', `Failed to save template: ${errorMessage}`);
    
    // Reset button without closing modal
    if (saveBtn) {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

/**
 * Create a workout template workflow
 * @param {FormData} formData - The form data to create template with
 * @param {boolean} isMultipart - Whether the request is multipart/form-data
 * @returns {Promise} Promise for the create operation
 */
function createTemplateWorkflow(formData, isMultipart = false) {
    // First create the plan template
    return CoachPlanAPI.getCurrentCoachProfile()
        .then(coachId => {
            if (!coachId) {
                throw new Error('Could not determine coach profile ID. Please try again.');
            }
            
            // For plan template creation, we need regular JSON data
            const planTemplateData = {
                name: formData.get('name'),
                description: formData.get('instructions') || '',
                template_type: 'workout',
                coach: coachId,
                is_public: false
            };
            
            return CoachPlanAPI.planTemplates.create(planTemplateData);
        })
        .then(planTemplate => {
            // Then create the workout template with the new plan template ID
            formData.append('template', planTemplate.id);
            return CoachPlanAPI.workoutTemplates.create(formData, isMultipart);
        });
}

/**
 * Show a toast notification
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} message - The message to display
 */
function showToast(type, message) {
    // Check if we're in a modal context
    const modalIsOpen = document.getElementById('workoutTemplateModal') && 
                       document.getElementById('workoutTemplateModal').classList.contains('show');
    
    // Use the modal toast container if the modal is open, otherwise use the page container
    const containerId = modalIsOpen ? 'modalToastContainer' : 'toastContainer';
    let toastContainer = document.getElementById(containerId);
    
    if (!toastContainer) {
        // Create toast container if it doesn't exist
        toastContainer = document.createElement('div');
        toastContainer.id = containerId;
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1080'; // Higher than modal backdrop
        
        // If we're in a modal, append to the modal-content to ensure it's above the modal
        if (modalIsOpen) {
            const modalContent = document.querySelector('#workoutTemplateModal .modal-content');
            if (modalContent) {
                modalContent.appendChild(toastContainer);
            } else {
                document.body.appendChild(toastContainer);
            }
        } else {
            document.body.appendChild(toastContainer);
        }
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
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center ${bgClass} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-${icon} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
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

/**
 * Add a new exercise block to the template editor
 * @param {string} blockName - Optional name for the block
 * @param {string} blockType - Optional type of block
 * @returns {number} The new block ID
 */
function addExerciseBlock(blockName = '', blockType = 'circuit') {
    // Generate a unique block ID
    exerciseBlockCounter++;
    const blockId = exerciseBlockCounter;
    
    const blockElement = document.createElement('div');
    blockElement.className = 'exercise-block card mb-4';
    blockElement.dataset.blockId = blockId;
    
    blockElement.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <div class="form-floating me-3">
                    <input type="text" class="form-control" id="blockName-${blockId}" 
                           placeholder="Block Name" value="${blockName || `Block ${blockId}`}" data-field="block-name">
                    <label for="blockName-${blockId}">Block Name</label>
                </div>
                <div class="form-floating">
                    <select class="form-select" id="blockType-${blockId}" data-field="block-type">
                        <option value="circuit" ${blockType === 'circuit' ? 'selected' : ''}>Circuit</option>
                        <option value="superset" ${blockType === 'superset' ? 'selected' : ''}>Superset</option>
                        <option value="straight_sets" ${blockType === 'straight_sets' ? 'selected' : ''}>Straight Sets</option>
                        <option value="pyramid" ${blockType === 'pyramid' ? 'selected' : ''}>Pyramid</option>
                    </select>
                    <label for="blockType-${blockId}">Block Type</label>
                </div>
            </div>
            <div class="btn-group">
                <button type="button" class="btn btn-sm btn-success add-exercise-btn" onclick="addExerciseToBlock(${blockId})">
                    <i class="bi bi-plus-lg me-1"></i> Add Exercise
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeExerciseBlock(${blockId})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        <div class="card-body p-0">
            <div class="exercises-container" id="exercises-${blockId}">
                <!-- Exercises will be added here -->
            </div>
            <div class="p-3 text-center text-muted small" id="empty-exercises-${blockId}">
                <i class="bi bi-info-circle me-1"></i>
                No exercises added yet. Click 'Add Exercise' to start.
            </div>
        </div>
    `;
    
    document.getElementById('exerciseBlocksContainer').appendChild(blockElement);
    
    // Store block information
    exerciseBlocks.push({
        id: blockId,
        name: blockName || `Block ${blockId}`,
        type: blockType,
        exercises: []
    });
    
    return blockId;
}

/**
 * Remove an exercise block from the editor
 * @param {number} blockId - The block ID to remove
 */
function removeExerciseBlock(blockId) {
    let blockElement = document.querySelector(`.exercise-block[data-block-id="${blockId}"]`);
    if (!blockElement) {
        blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    }
    
    if (blockElement) {
        // Confirm before removing if there are exercises
        const exercisesContainer = blockElement.querySelector('.exercises-container');
        const exercisesCount = exercisesContainer ? exercisesContainer.querySelectorAll('.exercise-item').length : 0;
        
        if (exercisesCount > 0) {
            const confirmRemove = confirm(`Are you sure you want to remove this exercise block with ${exercisesCount} exercise(s)?`);
            if (!confirmRemove) return;
        }
        
        blockElement.remove();
    }
    
    // Remove from tracked blocks
    exerciseBlocks = exerciseBlocks.filter(block => block.id !== blockId);
    
    // If no blocks left, add an empty one
    if (document.querySelectorAll('.exercise-block').length === 0) {
        addExerciseBlock();
    }
}

/**
 * Add an exercise to a specific block
 * @param {number} blockId - The block ID to add the exercise to
 * @param {object} exerciseData - Optional existing exercise data
 */
function addExerciseToBlock(blockId, exerciseData = null) {
    const exerciseId = `exercise-${blockId}-${Date.now()}`;
    const exercisesContainer = document.getElementById(`exercises-${blockId}`);
    const emptyMessage = document.getElementById(`empty-exercises-${blockId}`);
    
    if (!exercisesContainer) {
        console.error(`Exercises container for block ${blockId} not found`);
        return;
    }
    
    // Hide empty message
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }
    
    const exerciseElement = document.createElement('div');
    exerciseElement.className = 'exercise-item p-3 border-bottom';
    exerciseElement.id = exerciseId;
    
    // Get values from exercise data if provided
    const name = exerciseData ? exerciseData.exercise_name || '' : '';
    const category = exerciseData ? exerciseData.exercise_category || 'chest' : 'chest';
    const sets = exerciseData ? exerciseData.sets || 3 : 3;
    const reps = exerciseData ? exerciseData.reps || '8-12' : '8-12';
    const rest = exerciseData ? exerciseData.rest_seconds || 60 : 60;
    const instructions = exerciseData ? exerciseData.instructions || '' : '';
    
    // Check for demonstration media
    const imageUrl = exerciseData && exerciseData.demonstration_image ? exerciseData.demonstration_image : '';
    const videoUrl = exerciseData && exerciseData.demonstration_video ? exerciseData.demonstration_video : '';
    
    exerciseElement.innerHTML = `
        <div class="row">
            <div class="col-md-4">
                <div class="form-floating mb-2">
                    <input type="text" class="form-control" id="exercise-name-${exerciseId}" 
                        placeholder="Exercise Name" value="${name}" data-field="exercise-name" required>
                    <label for="exercise-name-${exerciseId}">Exercise Name *</label>
                </div>
                
                <div class="form-floating mb-2">
                    <select class="form-select" id="exercise-category-${exerciseId}" data-field="exercise-category">
                        <option value="chest" ${category === 'chest' ? 'selected' : ''}>Chest</option>
                        <option value="back" ${category === 'back' ? 'selected' : ''}>Back</option>
                        <option value="legs" ${category === 'legs' ? 'selected' : ''}>Legs</option>
                        <option value="shoulders" ${category === 'shoulders' ? 'selected' : ''}>Shoulders</option>
                        <option value="arms" ${category === 'arms' ? 'selected' : ''}>Arms</option>
                        <option value="abs" ${category === 'abs' ? 'selected' : ''}>Core/Abs</option>
                        <option value="cardio" ${category === 'cardio' ? 'selected' : ''}>Cardio</option>
                        <option value="full_body" ${category === 'full_body' ? 'selected' : ''}>Full Body</option>
                    </select>
                    <label for="exercise-category-${exerciseId}">Muscle Group</label>
                </div>
            </div>
            
            <div class="col-md-5">
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-floating mb-2">
                            <input type="number" class="form-control" id="exercise-sets-${exerciseId}" 
                                placeholder="Sets" value="${sets}" min="1" data-field="sets">
                            <label for="exercise-sets-${exerciseId}">Sets</label>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-floating mb-2">
                            <input type="text" class="form-control" id="exercise-reps-${exerciseId}" 
                                placeholder="Reps" value="${reps}" data-field="reps">
                            <label for="exercise-reps-${exerciseId}">Reps/Time</label>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-floating mb-2">
                            <input type="number" class="form-control" id="exercise-rest-${exerciseId}" 
                                placeholder="Rest" value="${rest}" min="0" data-field="rest">
                            <label for="exercise-rest-${exerciseId}">Rest (sec)</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-floating">
                    <textarea class="form-control" style="height: 80px" id="exercise-instructions-${exerciseId}" 
                        placeholder="Instructions" data-field="instructions">${instructions}</textarea>
                    <label for="exercise-instructions-${exerciseId}">Instructions</label>
                </div>
            </div>
            
            <div class="col-md-3">
                <!-- Demonstration Media Section -->
                <div class="mb-2">
                    <label class="form-label">Demonstration Image</label>
                    <input type="file" class="form-control form-control-sm" id="exercise-image-${exerciseId}" 
                        accept="image/*" data-field="demonstration-image">
                    <div class="mt-2" id="image-preview-${exerciseId}">
                        ${imageUrl ? `<img src="${imageUrl}" class="img-thumbnail" style="max-height: 100px;">` : ''}
                    </div>
                </div>
                
                <div class="mb-2">
                    <label class="form-label">Demonstration Video</label>
                    <input type="file" class="form-control form-control-sm" id="exercise-video-${exerciseId}" 
                        accept="video/*" data-field="demonstration-video">
                    <div class="mt-2" id="video-preview-${exerciseId}">
                        ${videoUrl ? `
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-success">Video uploaded</span>
                                <a href="${videoUrl}" class="btn btn-sm btn-outline-primary" target="_blank">
                                    <i class="bi bi-play-circle"></i> View
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <button type="button" class="btn btn-sm btn-outline-danger w-100" onclick="removeExercise('${exerciseId}')">
                    <i class="bi bi-trash me-1"></i> Remove Exercise
                </button>
            </div>
        </div>
    `;
    
    // Add to container
    exercisesContainer.appendChild(exerciseElement);
    
    // Initialize file input event listeners for previews
    initializeFilePreview(`exercise-image-${exerciseId}`, `image-preview-${exerciseId}`, 'image');
    initializeFilePreview(`exercise-video-${exerciseId}`, `video-preview-${exerciseId}`, 'video');
}

/**
 * Remove an exercise from its block
 * @param {string} exerciseId - The exercise element ID to remove
 */
function removeExercise(exerciseId) {
    const exerciseElement = document.getElementById(exerciseId);
    if (!exerciseElement) return;
    
    // Get the parent block to check if this is the last exercise
    const blockElement = exerciseElement.closest('.exercise-block');
    const exercisesContainer = exerciseElement.closest('.exercises-container');
    
    exerciseElement.remove();
    
    // Show empty message if no exercises left
    if (exercisesContainer && exercisesContainer.children.length === 0 && blockElement) {
        const blockId = blockElement.dataset.blockId;
        const emptyMessage = document.getElementById(`empty-exercises-${blockId}`);
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }
    }
}

/**
 * Initialize file preview functionality for image and video uploads
 * @param {string} inputId - The ID of the file input element
 * @param {string} previewId - The ID of the preview container
 * @param {string} type - The type of media ('image' or 'video')
 */
/**
 * Display image preview in the specified container
 * @param {string} containerId - The ID of the container element
 * @param {string} imageUrl - URL of the image to display
 * @param {number} imageId - Optional ID of the image for removal
 */
function displayImagePreview(containerId, imageUrl, imageId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item position-relative d-inline-block me-2 mb-2';
    if (imageId) previewItem.dataset.imageId = imageId;
    
    previewItem.innerHTML = `
        <img src="${imageUrl}" class="img-thumbnail" style="max-height: 100px; max-width: 150px;">
        ${imageId ? `
        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                onclick="removeMedia('image', ${imageId}, this.parentElement)">
            <i class="bi bi-x"></i>
        </button>
        ` : ''}
    `;
    
    container.appendChild(previewItem);
}

/**
 * Display video preview in the specified container
 * @param {string} containerId - The ID of the container element
 * @param {string} videoUrl - URL of the video
 * @param {number} videoId - Optional ID of the video for removal
 */
function displayVideoPreview(containerId, videoUrl, videoId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item position-relative d-inline-block me-2 mb-2';
    if (videoId) previewItem.dataset.videoId = videoId;
    
    const fileName = videoUrl.split('/').pop();
    
    previewItem.innerHTML = `
        <div class="video-preview p-2 border rounded">
            <div class="d-flex align-items-center">
                <i class="bi bi-file-earmark-play me-2 text-primary"></i>
                <span class="text-truncate" style="max-width: 120px;">${fileName}</span>
            </div>
            <div class="mt-1">
                <a href="${videoUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-play-circle"></i> View
                </a>
                ${videoId ? `
                <button type="button" class="btn btn-sm btn-outline-danger" 
                        onclick="removeMedia('video', ${videoId}, this.parentElement.parentElement.parentElement)">
                    <i class="bi bi-trash"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    container.appendChild(previewItem);
}

/**
 * Handle removal of media files (images/videos)
 * @param {string} type - Type of media ('image' or 'video')
 * @param {number} id - ID of the media to remove
 * @param {HTMLElement} element - The preview element to remove from DOM
 */
function removeMedia(type, id, element) {
    if (!confirm(`Are you sure you want to remove this ${type}?`)) return;
    
    // Add ID to the list of items to remove when form is submitted
    const inputName = type === 'image' ? 'remove_images' : 'remove_videos';
    let input = document.getElementById(inputName);
    
    if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.id = inputName;
        input.name = inputName;
        input.value = JSON.stringify([id]);
        document.getElementById('workoutTemplateForm').appendChild(input);
    } else {
        let ids = JSON.parse(input.value || '[]');
        ids.push(id);
        input.value = JSON.stringify(ids);
    }
    
    // Remove the preview element
    if (element) element.remove();
}

/**
 * Initialize file preview functionality for image and video uploads
 * @param {string} inputId - The ID of the file input element
 * @param {string} previewContainerId - The ID of the preview container
 * @param {string} type - The type of media ('image' or 'video')
 */
function initializeFileInputPreviews() {
    // Setup main image preview
    const mainImageInput = document.getElementById('workoutImage');
    if (mainImageInput) {
        mainImageInput.addEventListener('change', function() {
            const previewContainer = document.getElementById('workoutImagePreview');
            if (!previewContainer) return;
            
            previewContainer.innerHTML = '';
            
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    displayImagePreview('workoutImagePreview', e.target.result);
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
    
    // Setup additional images preview
    const additionalImagesInput = document.getElementById('additionalImages');
    if (additionalImagesInput) {
        additionalImagesInput.addEventListener('change', function() {
            const previewContainer = document.getElementById('additionalImagesPreview');
            if (!previewContainer) return;
            
            if (this.files && this.files.length > 0) {
                for (let i = 0; i < this.files.length; i++) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        displayImagePreview('additionalImagesPreview', e.target.result);
                    };
                    reader.readAsDataURL(this.files[i]);
                }
            }
        });
    }
    
    // Setup videos preview
    const videosInput = document.getElementById('workoutVideos');
    if (videosInput) {
        videosInput.addEventListener('change', function() {
            const previewContainer = document.getElementById('videosPreview');
            if (!previewContainer) return;
            
            if (this.files && this.files.length > 0) {
                for (let i = 0; i < this.files.length; i++) {
                    const file = this.files[i];
                    const videoPreviewItem = document.createElement('div');
                    videoPreviewItem.className = 'preview-item position-relative d-inline-block me-2 mb-2';
                    
                    videoPreviewItem.innerHTML = `
                        <div class="video-preview p-2 border rounded">
                            <div class="d-flex align-items-center">
                                <i class="bi bi-file-earmark-play me-2 text-primary"></i>
                                <span class="text-truncate" style="max-width: 120px;">${file.name}</span>
                            </div>
                            <div class="mt-1">
                                <span class="badge bg-primary">Video selected</span>
                            </div>
                        </div>
                    `;
                    
                    previewContainer.appendChild(videoPreviewItem);
                }
            }
        });
    }
}

function initializeFilePreview(inputId, previewId, type) {
    const fileInput = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewId);
    
    if (!fileInput || !previewContainer) {
        console.error(`Could not initialize file preview for ${inputId}`);
        return;
    }
    
    fileInput.addEventListener('change', function() {
        // Clear previous preview
        previewContainer.innerHTML = '';
        
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            if (type === 'image') {
                // Create image preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewContainer.innerHTML = `
                        <img src="${e.target.result}" class="img-thumbnail" style="max-height: 100px;">
                        <div class="mt-1 small text-muted">${file.name} (${formatFileSize(file.size)})</div>
                    `;
                };
                reader.readAsDataURL(file);
            } else if (type === 'video') {
                // Create video indicator
                previewContainer.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center p-2 border rounded">
                        <span><i class="bi bi-file-earmark-play me-2"></i>${file.name} (${formatFileSize(file.size)})</span>
                        <span class="badge bg-primary">Video selected</span>
                    </div>
                `;
            }
        }
    });
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - The file size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Edit workout template - fetches the template data and opens editor modal
 * @param {number} templateId - The template ID to edit
 */
function editWorkoutTemplate(templateId) {
    if (!templateId) {
        showToast('error', 'Invalid template ID');
        return;
    }
    
    showWorkoutTemplateEditor(templateId);
}

/**
 * Delete workout template with confirmation
 * @param {number} templateId - The template ID to delete
 */
function deleteWorkoutTemplate(templateId) {
    if (!templateId) {
        showToast('error', 'Invalid template ID');
        return;
    }
    
    // Confirm before deleting
    const confirmDelete = confirm('Are you sure you want to delete this workout template? This action cannot be undone.');
    
    if (confirmDelete) {
        CoachPlanAPI.workoutTemplates.delete(templateId)
            .then(() => {
                showToast('success', 'Workout template deleted successfully');
                loadWorkoutTemplates(); // Refresh the list
            })
            .catch(error => {
                console.error('Error deleting template:', error);
                const errorMessage = error.errorJSON?.detail || error.error || error.message || 'Unknown error';
                showToast('error', `Failed to delete template: ${errorMessage}`);
            });
    }
}

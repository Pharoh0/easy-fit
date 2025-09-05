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
    exercisesByBlock = {};
    
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
    
    // Show editor
    document.querySelector('.workout-templates-container').style.display = 'none';
    const editor = document.getElementById('workoutTemplateEditor');
    editor.style.display = 'block';
    
    // Reset the exercise blocks container
    const exerciseBlocksContainer = document.getElementById('exerciseBlocksContainer');
    exerciseBlocksContainer.innerHTML = '';
    
    if (templateId) {
        // Show loading state when editing existing template
        const loadingElement = document.createElement('div');
        loadingElement.id = 'templateLoadingIndicator';
        loadingElement.className = 'text-center my-4';
        loadingElement.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading template data...</p>
        `;
        
        exerciseBlocksContainer.appendChild(loadingElement);
        
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
                
                // Remove loading indicator once data is loaded
                const loadingIndicator = document.getElementById('templateLoadingIndicator');
                if (loadingIndicator) loadingIndicator.remove();
                
                // Process exercises if available
                if (template.exercises && Array.isArray(template.exercises)) {
                    console.log('Template exercises:', template.exercises);
                    
                    // Group exercises by block
                    exercisesByBlock = {};
                    template.exercises.forEach(exercise => {
                        const blockId = exercise.block_id || 'default';
                        if (!exercisesByBlock[blockId]) {
                            exercisesByBlock[blockId] = [];
                        }
                        exercisesByBlock[blockId].push(exercise);
                    });
                    
                    console.log('Exercises grouped by block:', exercisesByBlock);
                    
                    // Create blocks and add exercises
                    Object.keys(exercisesByBlock).forEach((blockId, index) => {
                        const blockExercises = exercisesByBlock[blockId];
                        let blockName = `Block ${index + 1}`;
                        let blockType = 'circuit';
                        
                        // Try to get block name and type from first exercise
                        if (blockExercises.length > 0) {
                            blockName = blockExercises[0].block_name || blockName;
                            blockType = blockExercises[0].block_type || blockType;
                        }
                        
                        // Create exercise block
                        const newBlockId = addExerciseBlock(blockName, blockType);
                        
                        // Add exercises to this block
                        blockExercises.forEach(exercise => {
                            addExerciseToBlock(newBlockId, exercise);
                        });
                    });
                }
                
                // If no blocks were created (no exercises), add an empty one
                if (!template.exercises || template.exercises.length === 0) {
                    addExerciseBlock();
                }
            })
            .catch(error => {
                console.error('Error loading template for edit:', error);
                showToast('error', 'Failed to load template data');
                
                // Remove loading indicator and add empty block
                const loadingIndicator = document.getElementById('templateLoadingIndicator');
                if (loadingIndicator) loadingIndicator.remove();
                
                // Add an empty exercise block if none exists
                if (document.querySelectorAll('.exercise-block').length === 0) {
                    addExerciseBlock();
                }
            });
    } else {
        // Adding new template, create an empty exercise block
        addExerciseBlock();
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('workoutTemplateModal'));
    modal.show();
}

/**
 * File upload handling for meal templates
 */

// Global variables for storing file references
window.imageFiles = [];
window.videoFiles = [];
window.removedImageIds = [];
window.removedVideoIds = [];

/**
 * Initialize file upload handlers
 */
function initFileUploadHandlers() {
    const imageInput = document.getElementById('mealImageInput');
    const multipleImagesInput = document.getElementById('mealMultipleImagesInput');
    const videosInput = document.getElementById('mealVideosInput');
    
    // Reset arrays and flags
    window.imageFiles = [];
    window.videoFiles = [];
    window.removedImageIds = [];
    window.removedVideoIds = [];
    window.currentMainImageUrl = null;
    window.removeMainImage = false;
    
    // Clear previews
    document.getElementById('mealImagePreview').innerHTML = '';
    document.getElementById('mealMultipleImagesPreview').innerHTML = '';
    document.getElementById('mealVideosPreview').innerHTML = '';
    
    // Single image preview handler
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            console.log('Processing main image:', file.name);
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const previewElement = document.getElementById('mealImagePreview');
                previewElement.innerHTML = `
                    <div class="position-relative mb-3 meal-image-container">
                        <img src="${event.target.result}" class="img-thumbnail" style="width: 100%; max-height: 200px; object-fit: cover;" />
                        <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 clear-image">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                `;
                
                // Add event listener for the clear button
                document.querySelector('.clear-image').addEventListener('click', () => {
                    previewElement.innerHTML = '';
                    imageInput.value = '';
                });
            };
            reader.readAsDataURL(file);
        });
    }
    
    // Multiple images preview handler
    if (multipleImagesInput) {
        multipleImagesInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            console.log(`Adding ${files.length} additional images`);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                window.imageFiles.push(file);
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    const previewContainer = document.getElementById('mealMultipleImagesPreview');
                    const imageDiv = document.createElement('div');
                    imageDiv.className = 'position-relative mb-3 col-4';
                    imageDiv.dataset.index = window.imageFiles.indexOf(file);
                    
                    imageDiv.innerHTML = `
                        <div class="card">
                            <img src="${event.target.result}" class="card-img-top" style="height: 150px; object-fit: cover;" />
                            <div class="card-footer p-1 text-center">
                                <button type="button" class="btn btn-sm btn-danger remove-additional-image">
                                    <i class="bi bi-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                    
                    previewContainer.appendChild(imageDiv);
                    
                    // Add event listener for remove button
                    imageDiv.querySelector('.remove-additional-image').addEventListener('click', () => {
                        const index = parseInt(imageDiv.dataset.index);
                        window.imageFiles.splice(index, 1);
                        previewContainer.removeChild(imageDiv);
                        
                        // Reindex remaining elements
                        const remainingDivs = previewContainer.querySelectorAll('div[data-index]');
                        remainingDivs.forEach((div, idx) => {
                            div.dataset.index = idx;
                        });
                        
                        console.log(`Removed image, ${window.imageFiles.length} remaining`);
                    });
                };
                reader.readAsDataURL(file);
            }
            
            // Reset the input to allow selecting the same files again
            multipleImagesInput.value = '';
        });
    }
    
    // Video files preview handler
    if (videosInput) {
        videosInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            console.log(`Adding ${files.length} videos`);
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                window.videoFiles.push(file);
                
                const previewContainer = document.getElementById('mealVideosPreview');
                const videoDiv = document.createElement('div');
                videoDiv.className = 'position-relative mb-3 col-6';
                videoDiv.dataset.index = window.videoFiles.indexOf(file);
                
                videoDiv.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">${file.name}</h6>
                            <p class="card-text small">${(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div class="card-footer p-1 text-center">
                            <button type="button" class="btn btn-sm btn-danger remove-video">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
                
                previewContainer.appendChild(videoDiv);
                
                // Add event listener for remove button
                videoDiv.querySelector('.remove-video').addEventListener('click', () => {
                    const index = parseInt(videoDiv.dataset.index);
                    window.videoFiles.splice(index, 1);
                    previewContainer.removeChild(videoDiv);
                    
                    // Reindex remaining elements
                    const remainingDivs = previewContainer.querySelectorAll('div[data-index]');
                    remainingDivs.forEach((div, idx) => {
                        div.dataset.index = idx;
                    });
                    
                    console.log(`Removed video, ${window.videoFiles.length} remaining`);
                });
            }
            
            // Reset the input to allow selecting the same files again
            videosInput.value = '';
        });
    }
}

/**
 * Display existing media when editing a template
 * @param {object} template - The template object with media data
 */
function displayExistingMedia(template) {
    // Reset arrays
    window.removedImageIds = [];
    window.removedVideoIds = [];
    
    // Store current main image URL for update
    window.currentMainImageUrl = template.meal_image || null;
    console.log('Current main image URL:', window.currentMainImageUrl);
    
    // Display main image if available
    if (template.meal_image) {
        const imagePreviewContainer = document.getElementById('mealImagePreview');
        imagePreviewContainer.innerHTML = `
            <div class="position-relative mb-3 meal-image-container">
                <img src="${template.meal_image}" class="img-thumbnail" style="width: 100%; max-height: 200px; object-fit: cover;" />
                <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 clear-image">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `;
        
        // Add event listener for the clear button
        const clearButton = imagePreviewContainer.querySelector('.clear-image');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                imagePreviewContainer.innerHTML = '';
                document.getElementById('mealImageInput').value = '';
                window.currentMainImageUrl = null; // Clear the stored URL
                window.removeMainImage = true; // Flag to indicate removal
                console.log('Main image marked for removal');
            });
        }
    }
    
    // Display additional images if available
    const multipleImagesPreviewContainer = document.getElementById('mealMultipleImagesPreview');
    multipleImagesPreviewContainer.innerHTML = '';
    
    if (template.meal_images && template.meal_images.length > 0) {
        template.meal_images.forEach((img) => {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'position-relative mb-3 col-4';
            imageDiv.dataset.imageId = img.id;
            
            imageDiv.innerHTML = `
                <div class="card">
                    <img src="${img.image}" class="card-img-top" style="height: 150px; object-fit: cover;" />
                    <div class="card-footer p-1 text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-existing-image">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `;
            
            multipleImagesPreviewContainer.appendChild(imageDiv);
            
            // Add event listener for remove button
            const removeButton = imageDiv.querySelector('.remove-existing-image');
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    console.log(`Marking image ID ${img.id} for removal`);
                    window.removedImageIds.push(img.id);
                    multipleImagesPreviewContainer.removeChild(imageDiv);
                });
            }
        });
    }
    
    // Display videos if available
    const videosPreviewContainer = document.getElementById('mealVideosPreview');
    videosPreviewContainer.innerHTML = '';
    
    if (template.meal_videos && template.meal_videos.length > 0) {
        template.meal_videos.forEach((vid, idx) => {
            const videoDiv = document.createElement('div');
            videoDiv.className = 'position-relative mb-3 col-6';
            videoDiv.dataset.videoId = vid.id;
            
            videoDiv.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">Video ${idx + 1}</h6>
                        <a href="${vid.video}" target="_blank" class="btn btn-sm btn-primary">View Video</a>
                    </div>
                    <div class="card-footer p-1 text-center">
                        <button type="button" class="btn btn-sm btn-danger remove-existing-video">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `;
            
            videosPreviewContainer.appendChild(videoDiv);
            
            // Add event listener for remove button
            const removeButton = videoDiv.querySelector('.remove-existing-video');
            if (removeButton) {
                removeButton.addEventListener('click', () => {
                    console.log(`Marking video ID ${vid.id} for removal`);
                    window.removedVideoIds.push(vid.id);
                    videosPreviewContainer.removeChild(videoDiv);
                });
            }
        });
    }
}

/**
 * Add media files to a FormData object for submission
 * @param {FormData} formData - The FormData object to add files to
 */
function addMediaToFormData(formData) {
    try {
        // Add main image if selected
        const imageInput = document.getElementById('mealImageInput');
        if (imageInput && imageInput.files && imageInput.files[0]) {
            // New file selected - use it
            const mainImageFile = imageInput.files[0];
            formData.append('meal_image', mainImageFile);
            console.log('Added new main image to form data:', mainImageFile.name);
        } else if (window.currentMainImageUrl && !window.removeMainImage) {
            // No new file but we have existing image URL and it wasn't removed
            // We don't need to add anything here as the backend will keep the existing image
            // Just log for debugging
            console.log('Using existing main image URL:', window.currentMainImageUrl);
        } else if (window.removeMainImage) {
            // If main image was explicitly removed, send empty value
            formData.append('meal_image', ''); 
            console.log('Main image will be removed');
        }
        
        // Add additional images if available - one by one with individual append calls
        if (window.imageFiles && window.imageFiles.length > 0) {
            console.log(`Adding ${window.imageFiles.length} additional images to form data`);
            for (let i = 0; i < window.imageFiles.length; i++) {
                const imageFile = window.imageFiles[i];
                if (imageFile) {
                    formData.append('meal_images', imageFile);
                    console.log(`Added additional image ${i+1}: ${imageFile.name}`);
                }
            }
        }
        
        // Add videos if available - one by one with individual append calls
        if (window.videoFiles && window.videoFiles.length > 0) {
            console.log(`Adding ${window.videoFiles.length} videos to form data`);
            for (let i = 0; i < window.videoFiles.length; i++) {
                const videoFile = window.videoFiles[i];
                if (videoFile) {
                    formData.append('meal_videos', videoFile);
                    console.log(`Added video ${i+1}: ${videoFile.name}`);
                }
            }
        }
        
        // Add removed media IDs if editing
        if (window.removedImageIds && window.removedImageIds.length > 0) {
            const removedImagesJSON = JSON.stringify(window.removedImageIds);
            formData.append('remove_images', removedImagesJSON);
            console.log(`Added removed image IDs: ${removedImagesJSON}`);
        }
        
        if (window.removedVideoIds && window.removedVideoIds.length > 0) {
            const removedVideosJSON = JSON.stringify(window.removedVideoIds);
            formData.append('remove_videos', removedVideosJSON);
            console.log(`Added removed video IDs: ${removedVideosJSON}`);
        }
        
        // Log form data for debugging
        console.log('FormData entries:');
        try {
            for (let pair of formData.entries()) {
                if (pair[0] === 'meal_image' || pair[0] === 'meal_images' || pair[0] === 'meal_videos') {
                    console.log(`${pair[0]}: [File: ${pair[1].name}, type: ${pair[1].type}, size: ${pair[1].size} bytes]`);
                } else {
                    console.log(`${pair[0]}: ${pair[1]}`);
                }
            }
        } catch (err) {
            console.log('Error logging form data:', err);
        }
    } catch (error) {
        console.error('Error adding media to form data:', error);
        throw error; // Re-throw to allow handling in the calling function
    }
}

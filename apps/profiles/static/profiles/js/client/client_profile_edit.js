/**
 * Client Profile Edit JavaScript - Clean API Implementation
 * Handles profile editing with proper API integration
 */

// Global variables
let currentProfile = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Edit profile page loaded, initializing...');
    initializeEditProfilePage();
});

/**
 * Set up image preview functionality for avatar and cover image
 */
function setupImagePreviews() {
    console.log('Setting up image preview functionality...');
    
    // Avatar preview
    const avatarInput = document.getElementById('avatar');
    let avatarPreview = document.getElementById('avatar-preview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // If there's a default avatar placeholder, replace it with an img
                    if (avatarPreview.tagName.toLowerCase() !== 'img') {
                        const img = document.createElement('img');
                        img.id = 'avatar-preview';
                        img.classList.add('current-avatar');
                        img.alt = 'Profile avatar';
                        avatarPreview.parentNode.replaceChild(img, avatarPreview);
                        avatarPreview = img;
                    }
                    
                    // Set the preview image source
                    avatarPreview.src = e.target.result;
                };
                
                reader.readAsDataURL(this.files[0]);
            }
        });
        console.log('Avatar preview setup complete');
    } else {
        console.log('Avatar input or preview elements not found');
    }
    
    // Cover image functionality removed
}

/**
 * Initialize the edit profile page
 */
async function initializeEditProfilePage() {
    try {
        console.log('Loading current profile data...');
        
        // Try to load profile data with retry mechanism
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
            try {
                await loadCurrentProfile();
                break; // Success, exit retry loop
            } catch (error) {
                retryCount++;
                console.warn(`Profile loading attempt ${retryCount} failed:`, error.message);
                
                if (retryCount > maxRetries) {
                    throw error; // Re-throw the error after max retries
                }
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log('Setting up form handling...');
        setupFormHandling();
        
        console.log('Setting up image previews...');
// Setup image preview functionality
setupImagePreviews();
        
        console.log('Edit profile page initialized successfully');
        
        // Verify profile data is properly loaded
        if (!currentProfile || !currentProfile.id) {
            throw new Error('Profile data verification failed after initialization.');
        }
        
    } catch (error) {
        console.error('Error initializing edit profile page:', error);
        showErrorMessage('Failed to load profile data: ' + error.message + '. Please refresh the page or log in again.');
        
        // Disable the form if profile loading failed
        const form = document.getElementById('profile-edit-form');
        if (form) {
            form.style.opacity = '0.5';
            form.style.pointerEvents = 'none';
        }
    }
}

/**
 * Load current profile data from API
 */
async function loadCurrentProfile() {
    try {
        console.log('Fetching profile data from API...');
        console.log('Access token:', localStorage.getItem('access_token') ? 'Present' : 'Missing');
        
        // First try to get the list of profiles (which will be filtered to current user)
        const response = await fetch('/profiles/api/v1/client-profile/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
            }
        });
        
        console.log('Profile API response status:', response.status);
        console.log('Profile API response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Profile API error response:', errorText);
            
            if (response.status === 401) {
                throw new Error('You must be logged in to edit your profile. Please log in again.');
            }
            throw new Error(`Failed to load profile data: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Profile API response data:', data);
        console.log('Data type:', typeof data);
        console.log('Data keys:', Object.keys(data));
        
        // Extract profile from different possible response formats
        let profileData;
        
        if (Array.isArray(data)) {
            // Direct array response
            console.log('Found direct array response with length:', data.length);
            if (data.length > 0) {
                profileData = data[0];
                console.log('Using first item from array as profile data');
            } else {
                throw new Error('No profile found in array. Please create a profile first.');
            }
        } else if (data.results && Array.isArray(data.results)) {
            // Paginated response with results array
            console.log('Found paginated results array with length:', data.results.length);
            if (data.results.length > 0) {
                profileData = data.results[0];
                console.log('Using first result from paginated response');
            } else {
                throw new Error('No profile found in results. Please create a profile first.');
            }
        } else if (data.id) {
            // Direct profile object
            console.log('Using direct profile object');
            profileData = data;
        } else {
            throw new Error('Unexpected API response format. Please contact support.');
        }
        
        console.log('Profile data extracted:', profileData);
        console.log('Final profile data:', profileData);
        console.log('Profile ID:', profileData.id);
        
        if (!profileData.id) {
            throw new Error('Profile data is missing ID field.');
        }
        
        currentProfile = profileData;
        console.log('currentProfile set to:', currentProfile);
        
        // Populate form with current data
        populateForm(currentProfile);
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showErrorMessage('Failed to load profile data: ' + error.message);
        throw error;
    }
}

/**
 * Populate form with profile data
 */
function populateForm(profile) {
    if (!profile) {
        console.error('No profile data provided to populateForm');
        return;
    }
    
    console.log('Populating form with profile data:', profile);
    
    // Basic fields
    const basicFields = ['age', 'height', 'weight'];
    basicFields.forEach(field => {
        const input = document.getElementById(field);
        if (input && profile[field] !== null && profile[field] !== undefined) {
            input.value = profile[field];
            console.log(`Set ${field} to ${profile[field]}`);
        }
    });
    
    // Dropdown fields
    const dropdownFields = ['gender', 'activity_level'];
    dropdownFields.forEach(field => {
        const select = document.getElementById(field);
        if (select && profile[field]) {
            select.value = profile[field];
            console.log(`Set ${field} dropdown to ${profile[field]}`);
        }
    });
    
    // Health information fields (textareas)
    const healthFields = ['health_conditions', 'fitness_goals', 'dietary_preferences', 'allergies'];
    healthFields.forEach(field => {
        const textarea = document.getElementById(field);
        if (textarea && profile[field]) {
            textarea.value = profile[field];
            console.log(`Set ${field} textarea to ${profile[field]}`);
        }
    });
    
    // Social media fields
    const socialFields = ['instagram', 'facebook', 'twitter'];
    socialFields.forEach(field => {
        const input = document.getElementById(field);
        if (input && profile[field]) {
            input.value = profile[field];
            console.log(`Set ${field} to ${profile[field]}`);
        }
    });
    
    // Display existing images
    if (profile.avatar) {
        displayImagePreview('avatar-preview', profile.avatar);
        console.log('Set avatar preview to', profile.avatar);
    }
}

/**
 * Display image preview for existing profile images
 */
function displayImagePreview(previewId, imageUrl) {
    const previewElement = document.getElementById(previewId);
    if (!previewElement) {
        console.error(`Preview element with ID ${previewId} not found`);
        return;
    }
    
    // Handle different preview element structures
    if (previewId === 'avatar-preview') {
        // For avatar preview
        if (previewElement.tagName === 'IMG') {
            // If it's already an img element
            previewElement.src = imageUrl;
            previewElement.style.display = 'block';
            previewElement.classList.add('current-avatar');
        } else {
            // Clear any default content
            previewElement.innerHTML = '';
            // Create image element
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.alt = 'Profile avatar';
            imgElement.className = 'current-avatar';
            previewElement.appendChild(imgElement);
        }
    }
    
    console.log(`Image preview set for ${previewId}:`, imageUrl);
}

/**
 * Set up form handling with API integration
 */
function setupFormHandling() {
    const form = document.getElementById('profile-edit-form');
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            console.log('Form submitted, processing...');
            
            if (validateForm()) {
                await saveProfile();
            }
        });
    } else {
        console.error('Profile edit form not found!');
    }
}

/**
 * Validate form data
 */
function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    
    // Basic validation for numeric fields
    const numericFields = ['age', 'height', 'weight'];
    numericFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input) return;
        
        if (input.value && isNaN(parseFloat(input.value))) {
            isValid = false;
            input.classList.add('is-invalid');
            showFieldError(input, 'Please enter a valid number');
        } else if (input.value) {
            // Check for decimal field overflow (max_digits=5, decimal_places=2)
            // This means maximum value is 999.99
            if (field === 'height' || field === 'weight') {
                const value = parseFloat(input.value);
                if (value >= 1000) {
                    isValid = false;
                    input.classList.add('is-invalid');
                    showFieldError(input, `Value must be less than 1000`);
                } else if (value < 0) {
                    isValid = false;
                    input.classList.add('is-invalid');
                    showFieldError(input, `Value cannot be negative`);
                } else {
                    // Check if there are more than 2 decimal places
                    const decimalStr = input.value.toString().split('.')[1];
                    if (decimalStr && decimalStr.length > 2) {
                        input.value = value.toFixed(2); // Automatically fix by rounding to 2 decimal places
                    }
                }
            } else if (field === 'age') {
                const value = parseInt(input.value);
                if (value <= 0 || value > 120) {
                    isValid = false;
                    input.classList.add('is-invalid');
                    showFieldError(input, `Age must be between 1 and 120`);
                }
            }
        }
    });
    
    return isValid;
}

/**
 * Save profile data via API
 */
async function saveProfile() {
    try {
        showLoading(true);
        
        // Check if we have file inputs with files selected
        const avatarInput = document.getElementById('avatar');
        const hasAvatarFile = avatarInput && avatarInput.files && avatarInput.files.length > 0;
        
        // Determine if we need to use FormData (for files) or JSON (for text-only updates)
        const useFormData = hasAvatarFile;
        
        console.log('File inputs detected:', { hasAvatarFile });
        console.log('Using FormData for submission:', useFormData);
        
        // Get the basic form data (text fields)
        const jsonData = getFormData();
        console.log('JSON form data:', jsonData);
        
        if (!currentProfile) {
            console.error('currentProfile is null or undefined');
            throw new Error('Profile data not loaded. Please refresh the page and try again.');
        }
        
        if (!currentProfile.id) {
            console.error('currentProfile missing id:', currentProfile);
            throw new Error('Profile data is incomplete (missing ID). Please refresh the page and try again.');
        }
        
        console.log('Profile ID for update:', currentProfile.id);
        
        // Use PUT method to update existing profile
        const url = `/profiles/api/v1/client-profile/${currentProfile.id}/`;
        
        console.log('Updating profile with PUT request to:', url);
        
        let response;
        
        if (useFormData) {
            // Use FormData for file uploads
            const formData = new FormData();
            
            // Add all JSON data to FormData
            Object.keys(jsonData).forEach(key => {
                formData.append(key, jsonData[key]);
            });
            
            // Add files if selected
            if (hasAvatarFile) {
                formData.append('avatar', avatarInput.files[0]);
            }
            
            console.log('Sending FormData with files');
            
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    // Don't set Content-Type with FormData, browser will set it with boundary
                    'X-CSRFToken': getCsrfToken(),
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                },
                body: formData
            });
        } else {
            // Use JSON for text-only updates
            console.log('Sending JSON data (no files)');
            
            response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                },
                body: JSON.stringify(jsonData)
            });
        }
        
        console.log('PUT Response status:', response.status);
        
        if (!response.ok) {
            let errorMessage = 'Failed to save profile';
            try {
                const errorText = await response.text();
                console.error('PUT Error response text:', errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    console.error('PUT Error response parsed:', errorData);
                    
                    // Handle DRF validation errors
                    if (errorData && typeof errorData === 'object') {
                        if (errorData.type === 'validation_error' && errorData.errors) {
                            // Handle the specific validation error format
                            const fieldErrors = {};
                            errorData.errors.forEach(error => {
                                fieldErrors[error.attr] = error.detail;
                            });
                            displayFieldErrors(fieldErrors);
                            errorMessage = 'Please fix the validation errors above.';
                        } else if (errorData.detail) {
                            errorMessage = errorData.detail;
                        } else {
                            // Standard DRF error format
                            displayFieldErrors(errorData);
                            errorMessage = 'Please fix the validation errors above.';
                        }
                    }
                } catch (jsonError) {
                    console.error('Error parsing JSON from error response:', jsonError);
                    errorMessage = `Server error (${response.status}). Please try again.`;
                }
            } catch (parseError) {
                console.error('Error reading error response:', parseError);
                errorMessage = `Server error (${response.status}). Please try again.`;
            }
            throw new Error(errorMessage);
        }
        
        const updatedProfile = await response.json();
        currentProfile = updatedProfile;
        
        console.log('Profile updated successfully:', updatedProfile);
        showSuccessMessage('Profile updated successfully!');
        
        // Redirect back to profile view after a short delay
        setTimeout(() => {
            window.location.href = '/profiles/client-profile/';
        }, 1500);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showErrorMessage(error.message || 'Failed to save profile. Please try again.');
    } finally {
        showLoading(false);
    }
}

/**
 * Get form data as object
 */
function getFormData() {
    const formData = {};
    
    // Basic fields
    const fields = [
        'age', 'height', 'weight', 'gender', 'activity_level'
    ];
    
    // Health information fields
    const healthFields = [
        'health_conditions', 'fitness_goals', 'dietary_preferences', 'allergies'
    ];
    
    // Social media fields
    const socialFields = [
        'instagram', 'facebook', 'twitter'
    ];
    
    // Process basic fields
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            const value = input.value ? input.value.trim() : '';
            if (value || field === 'gender' || field === 'activity_level') {
                // Convert numeric fields to proper types
                if (['age', 'height', 'weight'].includes(field) && value) {
                    formData[field] = parseFloat(value);
                } else {
                    formData[field] = value;
                }
            }
        }
    });
    
    // Process health information fields (textareas)
    healthFields.forEach(field => {
        const textarea = document.getElementById(field);
        if (textarea) {
            formData[field] = textarea.value.trim();
        }
    });
    
    // Process social media fields
    socialFields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            formData[field] = input.value.trim();
        }
    });
    
    // Handle file inputs separately (these will be handled by the backend)
    // We don't include them in the JSON payload
    
    console.log('Collected form data:', formData);
    return formData;
}

/**
 * Display field-specific validation errors
 */
function displayFieldErrors(errors) {
    // Clear previous errors
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    
    console.log('Displaying field errors:', errors);
    
    // Display new errors
    Object.keys(errors).forEach(fieldName => {
        const input = document.getElementById(fieldName);
        if (input) {
            input.classList.add('is-invalid');
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback field-error';
            errorDiv.textContent = Array.isArray(errors[fieldName]) 
                ? errors[fieldName][0] 
                : errors[fieldName];
            
            input.parentNode.appendChild(errorDiv);
            
            // Scroll to the first error
            if (input.classList.contains('is-invalid') && !window.scrolledToError) {
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.scrolledToError = true;
                setTimeout(() => { window.scrolledToError = false; }, 1000);
            }
        } else {
            console.warn(`Field ${fieldName} not found in the form but has errors:`, errors[fieldName]);
            // Show a general error message for fields not found in the form
            showErrorMessage(`Validation error for ${fieldName}: ${errors[fieldName]}`);
        }
    });
}

/**
 * Get CSRF token from cookies
 */
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Show field error message
 */
function showFieldError(input, message) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'invalid-feedback field-error';
    errorMsg.textContent = message;
    input.parentNode.appendChild(errorMsg);
}

/**
 * Show loading state
 */
function showLoading(show) {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

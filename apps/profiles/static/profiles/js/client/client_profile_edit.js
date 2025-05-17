// Client Profile Edit JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Image preview functionality for avatar
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatar-preview');
    
    if (avatarInput && avatarPreview) {
        avatarInput.addEventListener('change', function() {
            previewImage(this, avatarPreview, true);
        });
    }
    
    // Image preview functionality for cover image
    const coverInput = document.getElementById('cover_image');
    const coverPreview = document.getElementById('cover-preview');
    
    if (coverInput && coverPreview) {
        coverInput.addEventListener('change', function() {
            previewImage(this, coverPreview, false);
        });
    }
    
    // Form validation
    const form = document.querySelector('.profile-edit-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            let isValid = true;
            
            // Basic validation for numeric fields
            const numericFields = ['age', 'height', 'weight'];
            numericFields.forEach(field => {
                const input = document.getElementById(field);
                if (input && input.value && isNaN(parseFloat(input.value))) {
                    isValid = false;
                    input.classList.add('is-invalid');
                    // Add error message if not already present
                    if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('text-danger')) {
                        const errorMsg = document.createElement('div');
                        errorMsg.className = 'text-danger';
                        errorMsg.innerText = 'Please enter a valid number';
                        input.parentNode.insertBefore(errorMsg, input.nextSibling);
                    }
                } else if (input) {
                    input.classList.remove('is-invalid');
                    // Remove error message if exists
                    if (input.nextElementSibling && input.nextElementSibling.classList.contains('text-danger')) {
                        input.parentNode.removeChild(input.nextElementSibling);
                    }
                }
            });
            
            // File size validation
            const fileFields = [
                { input: avatarInput, maxSize: 2 * 1024 * 1024, name: 'Profile picture' }, // 2MB
                { input: coverInput, maxSize: 5 * 1024 * 1024, name: 'Cover image' }  // 5MB
            ];
            
            fileFields.forEach(field => {
                if (field.input && field.input.files && field.input.files.length > 0) {
                    const file = field.input.files[0];
                    if (file.size > field.maxSize) {
                        isValid = false;
                        field.input.classList.add('is-invalid');
                        // Add error message if not already present
                        if (!field.input.nextElementSibling || !field.input.nextElementSibling.classList.contains('text-danger')) {
                            const errorMsg = document.createElement('div');
                            errorMsg.className = 'text-danger';
                            errorMsg.innerText = `${field.name} is too large. Maximum size is ${field.maxSize / (1024 * 1024)}MB.`;
                            field.input.parentNode.insertBefore(errorMsg, field.input.nextSibling);
                        }
                    } else {
                        field.input.classList.remove('is-invalid');
                        // Remove error message if exists
                        const errorMsgElement = field.input.nextElementSibling;
                        if (errorMsgElement && errorMsgElement.classList.contains('text-danger')) {
                            field.input.parentNode.removeChild(errorMsgElement);
                        }
                    }
                }
            });
            
            if (!isValid) {
                event.preventDefault();
                
                // Scroll to the first error
                const firstError = document.querySelector('.is-invalid');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
    }
});

// Function to preview uploaded images
function previewImage(input, previewElement, isAvatar) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Check if the preview element is an image or a div
            if (previewElement.tagName.toLowerCase() === 'img') {
                previewElement.src = e.target.result;
            } else {
                // Create new image element
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = isAvatar ? 'current-avatar' : 'current-cover';
                img.id = previewElement.id;
                
                // Replace the preview element with the new image
                previewElement.parentNode.replaceChild(img, previewElement);
            }
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

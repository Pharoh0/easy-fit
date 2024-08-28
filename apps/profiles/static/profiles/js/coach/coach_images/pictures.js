// document.addEventListener('DOMContentLoaded', function() {
//     const apiUrl = '/profiles/api/v1/coach-pictures/';
//     const container = document.getElementById('pictures-container');
//     const addButton = document.getElementById('add-picture-button');
//     const modal = document.getElementById('picture-modal');
//     const form = document.getElementById('picture-form');
//     const formErrors = document.getElementById('form-errors');
//     const loadingIndicator = document.getElementById('loading-indicator');
//     const successMessage = document.getElementById('success-message');
//     const closeButton = document.querySelector('.close');  // Close button for the main modal
//     const confirmDeleteModal = document.getElementById('confirm-delete-modal');  // Delete confirmation modal
//     const closeDeleteButton = document.querySelector('.close-delete');  // Close button for the delete confirmation modal
//     const confirmDeleteButton = document.getElementById('confirm-delete-button');
//     const cancelDeleteButton = document.getElementById('cancel-delete-button');
//     let deletePictureId = null;

//     // Fetch and display all coach pictures
//     function loadPictures() {
//         showLoading();
//         fetch(apiUrl, {
//             headers: {
//                 'Accept': 'application/json',
//                 'Authorization': `Bearer ${getAccessToken()}`
//             }
//         })
//         .then(response => response.json())
//         .then(data => {
//             container.innerHTML = '';
//             data.forEach(picture => {
//                 const div = document.createElement('div');
//                 div.className = 'picture-item';
//                 div.innerHTML = `
//                     <img src="${picture.image}" alt="${picture.description}" class="img-thumbnail">
//                     <p>${picture.description}</p>
//                     <div class="button-group">
//                         <button data-id="${picture.id}" class="edit-button">Edit</button>
//                         <button data-id="${picture.id}" class="delete-button">Delete</button>
//                     </div>
//                 `;
//                 container.appendChild(div);
//             });
//             hideLoading();
//         })
//         .catch(error => {
//             console.error('Error fetching pictures:', error);
//             hideLoading();
//         });
//     }

//     // Show loading indicator
//     function showLoading() {
//         if (loadingIndicator) {
//             loadingIndicator.style.display = 'block';
//         }
//     }

//     // Hide loading indicator
//     function hideLoading() {
//         if (loadingIndicator) {
//             loadingIndicator.style.display = 'none';
//         }
//     }

//     // Display success message
//     function showSuccessMessage(message) {
//         if (successMessage) {
//             successMessage.textContent = message;
//             successMessage.style.display = 'block';
//             setTimeout(() => {
//                 successMessage.style.display = 'none';
//             }, 3000); // Hide after 3 seconds
//         }
//     }

//     // Open modal for adding/editing
//     addButton.addEventListener('click', () => {
//         openModal();
//     });

//     // Close modal when the close button is clicked
//     closeButton.addEventListener('click', () => {
//         closeModal();
//     });

//     // Handle form submission
//     form.addEventListener('submit', function(event) {
//         event.preventDefault();
//         formErrors.innerHTML = '';

//         const formData = new FormData(form);

//         const isEdit = form.dataset.edit === 'true';
//         const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
//         const method = isEdit ? 'PUT' : 'POST';

//         fetch(url, {
//             method: method,
//             headers: {
//                 'X-CSRFToken': getCSRFToken(),
//                 'Authorization': `Bearer ${getAccessToken()}`,
//             },
//             body: formData,
//         })
//         .then(response => {
//             if (response.ok) {
//                 return response.json();
//             } else {
//                 return response.json().then(data => { throw data; });
//             }
//         })
//         .then(() => {
//             closeModal();
//             loadPictures();
//             showSuccessMessage(isEdit ? 'Picture updated successfully!' : 'Picture added successfully!');
//         })
//         .catch(errors => {
//             displayErrors(errors);
//         });
//     });

//     // Handle edit and delete buttons
//     container.addEventListener('click', function(event) {
//         if (event.target.classList.contains('edit-button')) {
//             const id = event.target.dataset.id;
//             editPicture(id);
//         }
//         if (event.target.classList.contains('delete-button')) {
//             deletePictureId = event.target.dataset.id;
//             openDeleteModal();  // Open delete confirmation modal
//         }
//     });

//     // Edit picture
//     function editPicture(id) {
//         fetch(`${apiUrl}${id}/`, {
//             headers: {
//                 'Accept': 'application/json',
//                 'Authorization': `Bearer ${getAccessToken()}`
//             }
//         })
//         .then(response => response.json())
//         .then(picture => {
//             openModal(picture);
//         })
//         .catch(error => console.error('Error fetching picture:', error));
//     }

//     // Open delete confirmation modal
//     function openDeleteModal() {
//         confirmDeleteModal.style.display = 'block';
//     }

//     // Close delete confirmation modal
//     function closeDeleteModal() {
//         confirmDeleteModal.style.display = 'none';
//         deletePictureId = null;
//     }

//     // Confirm delete picture
//     confirmDeleteButton.addEventListener('click', function() {
//         if (!deletePictureId) return;

//         fetch(`${apiUrl}${deletePictureId}/`, {
//             method: 'DELETE',
//             headers: {
//                 'X-CSRFToken': getCSRFToken(),
//                 'Authorization': `Bearer ${getAccessToken()}`,
//             }
//         })
//         .then(response => {
//             if (response.ok) {
//                 loadPictures();
//                 showSuccessMessage('Picture deleted successfully!');
//             } else {
//                 console.error('Failed to delete picture.');
//             }
//             closeDeleteModal();
//         })
//         .catch(error => console.error('Error deleting picture:', error));
//     });

//     // Cancel delete action
//     cancelDeleteButton.addEventListener('click', closeDeleteModal);

//     // Open modal function
//     function openModal(picture = null) {
//         modal.style.display = 'block';
//         if (picture) {
//             form.description.value = picture.description;
//             form.dataset.edit = 'true';
//             form.dataset.id = picture.id;
//         } else {
//             form.reset();
//             delete form.dataset.edit;
//             delete form.dataset.id;
//         }
//     }

//     // Close modal function
//     function closeModal() {
//         modal.style.display = 'none';
//         form.reset();
//         formErrors.innerHTML = '';
//         delete form.dataset.edit;
//         delete form.dataset.id;
//     }

//     // Display errors
//     function displayErrors(errors) {
//         formErrors.innerHTML = '';
//         for (const field in errors) {
//             const errorMessages = Array.isArray(errors[field]) ? errors[field].join(', ') : errors[field];
//             const errorDiv = document.createElement('div');
//             errorDiv.className = 'error-message';
//             errorDiv.textContent = `${field}: ${errorMessages}`;
//             formErrors.appendChild(errorDiv);
//         }
//     }

//     // Get CSRF token from cookies
//     function getCSRFToken() {
//         let cookieValue = null;
//         const cookies = document.cookie.split(';');
//         for (let cookie of cookies) {
//             cookie = cookie.trim();
//             if (cookie.startsWith('csrftoken=')) {
//                 cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
//                 break;
//             }
//         }
//         return cookieValue;
//     }

//     // Get access token from localStorage
//     function getAccessToken() {
//         return localStorage.getItem('access_token');
//     }

//     // Initial load
//     loadPictures();
// });


document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = '/profiles/api/v1/coach-pictures/';
    const container = document.getElementById('pictures-container');
    const addButton = document.getElementById('add-picture-button');
    const modal = document.getElementById('picture-modal');
    const form = document.getElementById('picture-form');
    const formErrors = document.getElementById('form-errors');
    const loadingIndicator = document.getElementById('loading-indicator');
    const successMessage = document.getElementById('success-message');
    const closeButton = document.querySelector('.close');  // Close button for the main modal
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');  // Delete confirmation modal
    const closeDeleteButton = document.querySelector('.close-delete');  // Close button for the delete confirmation modal
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    let deletePictureId = null;

    // Fetch and display all coach pictures
    function loadPictures() {
        showLoading();
        fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            data.forEach(picture => {
                const div = document.createElement('div');
                div.className = 'picture-item';
                div.innerHTML = `
                    <img src="${picture.image}" alt="${picture.description}" class="img-thumbnail">
                    <p>${picture.description}</p>
                    <div class="button-group">
                        <button data-id="${picture.id}" class="edit-button">Edit</button>
                        <button data-id="${picture.id}" class="delete-button">Delete</button>
                    </div>
                `;
                container.appendChild(div);
            });
            hideLoading();
        })
        .catch(error => {
            console.error('Error fetching pictures:', error);
            hideLoading();
        });
    }

    // Show loading indicator
    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }

    // Hide loading indicator
    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    // Display success message
    function showSuccessMessage(message) {
        if (successMessage) {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000); // Hide after 3 seconds
        }
    }

    // Open modal for adding/editing
    addButton.addEventListener('click', () => {
        openModal();
    });

    // Close modal when the close button is clicked
    closeButton.addEventListener('click', () => {
        closeModal();
    });

    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        formErrors.innerHTML = '';

        const formData = new FormData(form);

        const isEdit = form.dataset.edit === 'true';
        const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
        const method = isEdit ? 'PUT' : 'POST';

        // If it's an edit and no new file is selected, do not include the file in the request
        if (isEdit && !form.image.files.length) {
            formData.delete('image');
        }

        fetch(url, {
            method: method,
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${getAccessToken()}`,
            },
            body: formData,
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(data => { throw data; });
            }
        })
        .then(() => {
            closeModal();
            loadPictures();
            showSuccessMessage(isEdit ? 'Picture updated successfully!' : 'Picture added successfully!');
        })
        .catch(errors => {
            displayErrors(errors);
        });
    });

    // Handle edit and delete buttons
    container.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.dataset.id;
            editPicture(id);
        }
        if (event.target.classList.contains('delete-button')) {
            deletePictureId = event.target.dataset.id;
            openDeleteModal();  // Open delete confirmation modal
        }
    });

    // Edit picture
    function editPicture(id) {
        fetch(`${apiUrl}${id}/`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`
            }
        })
        .then(response => response.json())
        .then(picture => {
            openModal(picture);
        })
        .catch(error => console.error('Error fetching picture:', error));
    }

    // Open delete confirmation modal
    function openDeleteModal() {
        confirmDeleteModal.style.display = 'block';
    }

    // Close delete confirmation modal
    function closeDeleteModal() {
        confirmDeleteModal.style.display = 'none';
        deletePictureId = null;
    }

    // Confirm delete picture
    confirmDeleteButton.addEventListener('click', function() {
        if (!deletePictureId) return;

        fetch(`${apiUrl}${deletePictureId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => {
            if (response.ok) {
                loadPictures();
                showSuccessMessage('Picture deleted successfully!');
            } else {
                console.error('Failed to delete picture.');
            }
            closeDeleteModal();
        })
        .catch(error => console.error('Error deleting picture:', error));
    });

    // Cancel delete action
    cancelDeleteButton.addEventListener('click', closeDeleteModal);

    function openModal(picture = null) {
        modal.style.display = 'block';
    
        // Clear any previous error messages
        formErrors.innerHTML = '';
    
        // Check if there's an image preview element already, and remove it
        let imgPreview = form.querySelector('#image-preview');
        if (imgPreview) {
            imgPreview.remove();
        }
    
        // Reset the form to clear any previous input
        form.reset();
    
        if (picture) {
            form.description.value = picture.description;
    
            // Create an image preview element and set its attributes
            imgPreview = document.createElement('img');
            imgPreview.src = picture.image;
            imgPreview.alt = 'Current Image';
            imgPreview.style.width = '100px';
            imgPreview.style.height = '100px';
            imgPreview.style.display = 'block';
            imgPreview.style.marginBottom = '10px';
            imgPreview.id = 'image-preview'; // Give it an ID for future reference
    
            // Create a label for the current image
            const imgLabel = document.createElement('label');
            // imgLabel.textContent = 'Current Picture:';
            imgLabel.style.display = 'block';
    
            // Insert the label and the image preview before the file input
            const fileInput = form.querySelector('input[name="image"]');
            fileInput.insertAdjacentElement('beforebegin', imgLabel);
            fileInput.insertAdjacentElement('beforebegin', imgPreview);
    
            form.dataset.edit = 'true';
            form.dataset.id = picture.id;
    
            // Ensure the file input is visible
            fileInput.style.display = 'block';
        } else {
            // If adding a new picture, ensure the image input is visible and no previews exist
            const fileInput = form.querySelector('input[name="image"]');
            fileInput.style.display = 'block';
            delete form.dataset.edit;
            delete form.dataset.id;
        }
    }
    
    function closeModal() {
        modal.style.display = 'none';
        form.reset(); // Clear the form input
        formErrors.innerHTML = ''; // Clear any error messages
    
        // Remove the image preview if it exists
        const imgPreview = form.querySelector('#image-preview');
        if (imgPreview) {
            imgPreview.remove();
        }
    
        delete form.dataset.edit;
        delete form.dataset.id;
    }

    // Display errors
    function displayErrors(errors) {
        formErrors.innerHTML = '';
        for (const field in errors) {
            const errorMessages = Array.isArray(errors[field]) ? errors[field].join(', ') : errors[field];
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = `${field}: ${errorMessages}`;
            formErrors.appendChild(errorDiv);
        }
    }

    // Get CSRF token from cookies
    function getCSRFToken() {
        let cookieValue = null;
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith('csrftoken=')) {
                cookieValue = decodeURIComponent(cookie.substring('csrftoken='.length));
                break;
            }
        }
        return cookieValue;
    }

    // Get access token from localStorage
    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    // Initial load
    loadPictures();
});

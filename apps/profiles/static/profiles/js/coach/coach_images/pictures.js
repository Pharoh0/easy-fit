document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = '/profiles/api/v1/coach-pictures/';
    const container = document.getElementById('pictures-container');
    const addButton = document.getElementById('add-picture-button');
    const modalElement = document.getElementById('picture-modal');
    const modal = new bootstrap.Modal(modalElement);  // Initialize Bootstrap modal
    const deleteModalElement = document.getElementById('confirm-delete-modal');
    const deleteModal = new bootstrap.Modal(deleteModalElement);  // Delete modal
    const form = document.getElementById('picture-form');
    const formErrors = document.getElementById('form-errors');
    const successMessage = document.getElementById('success-message');  // Success message element
    let deletePictureId = null;

    // Fetch and display all coach pictures
    function loadPictures() {
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
                div.className = 'col-md-4';  // Use Bootstrap grid classes
                div.innerHTML = `
                    <div class="card h-100">
                        <img src="${picture.image}" alt="${picture.description}" class="card-img-top img-thumbnail">
                        <div class="card-body">
                            <p class="card-text">${picture.description}</p>
                            <button data-id="${picture.id}" class="edit-button btn btn-sm btn-warning">Edit</button>
                            <button data-id="${picture.id}" class="delete-button btn btn-sm btn-danger">Delete</button>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching pictures:', error));
    }

    // Open modal for adding/editing pictures
    addButton.addEventListener('click', () => {
        openModal();
    });

    // Handle form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        formErrors.innerHTML = '';

        const formData = new FormData(form);
        const isEdit = form.dataset.edit === 'true';
        const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
        const method = isEdit ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
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
            modal.hide();  // Hide the modal using Bootstrap
            loadPictures();
            showSuccessMessage(isEdit ? 'Picture updated successfully!' : 'Picture added successfully!');
        })
        .catch(errors => {
            displayErrors(errors);
        });
    });

    // Show success message
    function showSuccessMessage(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);  // Hide after 3 seconds
    }

    // Handle edit and delete buttons
    container.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.dataset.id;
            editPicture(id);
        }
        if (event.target.classList.contains('delete-button')) {
            deletePictureId = event.target.dataset.id;
            deleteModal.show();  // Show delete confirmation modal using Bootstrap
        }
    });

    // Edit picture
    function editPicture(id) {
        fetch(`${apiUrl}${id}/`, {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        })
        .then(response => response.json())
        .then(picture => {
            openModal(picture);
        })
        .catch(error => console.error('Error fetching picture:', error));
    }

    // Confirm delete picture
    document.getElementById('confirm-delete-button').addEventListener('click', function() {
        if (!deletePictureId) return;

        fetch(`${apiUrl}${deletePictureId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => {
            if (response.ok) {
                loadPictures();
                deleteModal.hide();  // Hide delete confirmation modal
                showSuccessMessage('Picture deleted successfully!');
            }
        })
        .catch(error => console.error('Error deleting picture:', error));
    });

    // Open modal for adding/editing
    function openModal(picture = null) {
        form.reset();  // Clear the form
        formErrors.innerHTML = '';  // Clear previous errors
        if (picture) {
            form.description.value = picture.description;
            document.getElementById('current-image-container').style.display = 'block';
            document.getElementById('current-image').src = picture.image;
            form.dataset.edit = 'true';
            form.dataset.id = picture.id;
        } else {
            document.getElementById('current-image-container').style.display = 'none';
            delete form.dataset.edit;
            delete form.dataset.id;
        }
        modal.show();  // Show modal using Bootstrap
    }

    // Display errors
    function displayErrors(errors) {
        formErrors.innerHTML = '';
        for (const field in errors) {
            const errorMessages = Array.isArray(errors[field]) ? errors[field].join(', ') : errors[field];
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message text-danger';
            errorDiv.textContent = `${field}: ${errorMessages}`;
            formErrors.appendChild(errorDiv);
        }
    }

    // Get access token from localStorage
    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    // Load pictures on page load
    loadPictures();
});

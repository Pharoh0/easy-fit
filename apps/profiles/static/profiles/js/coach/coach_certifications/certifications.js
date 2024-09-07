// document.addEventListener('DOMContentLoaded', function() {
//     const apiUrl = '/profiles/api/v1/coach-certifications/';
//     const container = document.getElementById('certifications-container');
//     const addButton = document.getElementById('add-certification-button');
//     const modal = document.getElementById('certification-modal');
//     const form = document.getElementById('certification-form');
//     const formErrors = document.getElementById('form-errors');
//     const loadingIndicator = document.getElementById('loading-indicator');
//     const successMessage = document.getElementById('success-message');
//     const closeButton = document.querySelector('.close');
//     const confirmDeleteModal = document.getElementById('confirm-delete-modal');
//     const closeDeleteButton = document.querySelector('.close-delete');
//     const confirmDeleteButton = document.getElementById('confirm-delete-button');
//     const cancelDeleteButton = document.getElementById('cancel-delete-button');
//     let deleteCertificationId = null;

//     function loadCertifications() {
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
//             data.forEach(certification => {
//                 const div = document.createElement('div');
//                 div.className = 'certification-item';
//                 div.innerHTML = `
//                     <a href="${certification.file}" target="_blank">${certification.description || 'View Certification'}</a>
//                     <div class="button-group">
//                         <button data-id="${certification.id}" class="edit-button">Edit</button>
//                         <button data-id="${certification.id}" class="delete-button">Delete</button>
//                     </div>
//                 `;
//                 container.appendChild(div);
//             });
//             hideLoading();
//         })
//         .catch(error => {
//             console.error('Error fetching certifications:', error);
//             hideLoading();
//         });
//     }

//     function showLoading() {
//         if (loadingIndicator) {
//             loadingIndicator.style.display = 'block';
//         }
//     }

//     function hideLoading() {
//         if (loadingIndicator) {
//             loadingIndicator.style.display = 'none';
//         }
//     }

//     function showSuccessMessage(message) {
//         if (successMessage) {
//             successMessage.textContent = message;
//             successMessage.style.display = 'block';
//             setTimeout(() => {
//                 successMessage.style.display = 'none';
//             }, 3000);
//         }
//     }

//     addButton.addEventListener('click', () => {
//         openModal();
//     });

//     closeButton.addEventListener('click', () => {
//         closeModal();
//     });

//     form.addEventListener('submit', function(event) {
//         event.preventDefault();
//         formErrors.innerHTML = '';

//         const formData = new FormData(form);

//         const isEdit = form.dataset.edit === 'true';
//         const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
//         const method = isEdit ? 'PUT' : 'POST';

//         if (isEdit && !form.file.files.length) {
//             formData.delete('file');
//         }

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
//             loadCertifications();
//             showSuccessMessage(isEdit ? 'Certification updated successfully!' : 'Certification added successfully!');
//         })
//         .catch(errors => {
//             displayErrors(errors);
//         });
//     });

//     container.addEventListener('click', function(event) {
//         if (event.target.classList.contains('edit-button')) {
//             const id = event.target.dataset.id;
//             editCertification(id);
//         }
//         if (event.target.classList.contains('delete-button')) {
//             deleteCertificationId = event.target.dataset.id;
//             openDeleteModal();
//         }
//     });

//     function editCertification(id) {
//         fetch(`${apiUrl}${id}/`, {
//             headers: {
//                 'Accept': 'application/json',
//                 'Authorization': `Bearer ${getAccessToken()}`
//             }
//         })
//         .then(response => response.json())
//         .then(certification => {
//             openModal(certification);
//         })
//         .catch(error => console.error('Error fetching certification:', error));
//     }

//     function openDeleteModal() {
//         confirmDeleteModal.style.display = 'block';
//     }

//     function closeDeleteModal() {
//         confirmDeleteModal.style.display = 'none';
//         deleteCertificationId = null;
//     }

//     confirmDeleteButton.addEventListener('click', function() {
//         if (!deleteCertificationId) return;

//         fetch(`${apiUrl}${deleteCertificationId}/`, {
//             method: 'DELETE',
//             headers: {
//                 'X-CSRFToken': getCSRFToken(),
//                 'Authorization': `Bearer ${getAccessToken()}`,
//             }
//         })
//         .then(response => {
//             if (response.ok) {
//                 loadCertifications();
//                 showSuccessMessage('Certification deleted successfully!');
//             } else {
//                 console.error('Failed to delete certification.');
//             }
//             closeDeleteModal();
//         })
//         .catch(error => console.error('Error deleting certification:', error));
//     });

//     cancelDeleteButton.addEventListener('click', closeDeleteModal);

//     function openModal(certification = null) {
//         modal.style.display = 'block';

//         formErrors.innerHTML = '';
//         form.reset();

//         let filePreview = form.querySelector('#file-preview');
//         if (filePreview) {
//             filePreview.remove();
//         }

//         if (certification) {
//             form.description.value = certification.description;

//             filePreview = document.createElement('a');
//             filePreview.href = certification.file;
//             filePreview.textContent = 'View Current Certification';
//             filePreview.target = '_blank';
//             filePreview.id = 'file-preview';

//             const fileInput = form.querySelector('input[name="file"]');
//             fileInput.insertAdjacentElement('beforebegin', filePreview);

//             form.dataset.edit = 'true';
//             form.dataset.id = certification.id;

//             fileInput.style.display = 'block';
//         } else {
//             const fileInput = form.querySelector('input[name="file"]');
//             fileInput.style.display = 'block';
//             delete form.dataset.edit;
//             delete form.dataset.id;
//         }
//     }

//     function closeModal() {
//         modal.style.display = 'none';
//         form.reset();
//         formErrors.innerHTML = '';

//         const filePreview = form.querySelector('#file-preview');
//         if (filePreview) {
//             filePreview.remove();
//         }

//         delete form.dataset.edit;
//         delete form.dataset.id;
//     }

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

//     function getAccessToken() {
//         return localStorage.getItem('access_token');
//     }

//     loadCertifications();
// });


document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = '/profiles/api/v1/coach-certifications/';
    const container = document.getElementById('certifications-container');
    const addButton = document.getElementById('add-certification-button');
    const modalElement = document.getElementById('certification-modal');
    const deleteModalElement = document.getElementById('confirm-delete-modal');
    const modal = new bootstrap.Modal(modalElement);  // Initialize Bootstrap modal for certification
    const deleteModal = new bootstrap.Modal(deleteModalElement);  // Initialize Bootstrap modal for delete confirmation
    const form = document.getElementById('certification-form');
    const formErrors = document.getElementById('form-errors');
    const successMessage = document.getElementById('success-message');  // Success message element
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    let deleteCertificationId = null;

    // Fetch and display all coach certifications
    function loadCertifications() {
        fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`
            }
        })
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            data.forEach(certification => {
                const div = document.createElement('div');
                div.className = 'col-md-4';  // Bootstrap grid classes
                div.innerHTML = `
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">${certification.description || 'Certification'}</h5>
                            <a href="${certification.file}" target="_blank" class="btn btn-primary">View Certification</a>
                            <div class="mt-3">
                                <button data-id="${certification.id}" class="edit-button btn btn-warning btn-sm">Edit</button>
                                <button data-id="${certification.id}" class="delete-button btn btn-danger btn-sm">Delete</button>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        })
        .catch(error => console.error('Error fetching certifications:', error));
    }

    // Open modal for adding/editing certifications
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

        if (isEdit && !form.file.files.length) {
            formData.delete('file');
        }

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
            modal.hide();  // Hide modal using Bootstrap
            loadCertifications();
            showSuccessMessage(isEdit ? 'Certification updated successfully!' : 'Certification added successfully!');
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
            editCertification(id);
        }
        if (event.target.classList.contains('delete-button')) {
            deleteCertificationId = event.target.dataset.id;
            deleteModal.show();  // Open delete confirmation modal
        }
    });

    // Edit certification
    function editCertification(id) {
        fetch(`${apiUrl}${id}/`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`
            }
        })
        .then(response => response.json())
        .then(certification => {
            openModal(certification);
        })
        .catch(error => console.error('Error fetching certification:', error));
    }

    // Confirm delete certification
    confirmDeleteButton.addEventListener('click', function() {
        if (!deleteCertificationId) return;

        fetch(`${apiUrl}${deleteCertificationId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => {
            if (response.ok) {
                loadCertifications();
                deleteModal.hide();  // Hide delete confirmation modal
                showSuccessMessage('Certification deleted successfully!');
            }
        })
        .catch(error => console.error('Error deleting certification:', error));
    });

    // Open modal for adding/editing
    function openModal(certification = null) {
        form.reset();  // Clear form fields
        formErrors.innerHTML = '';  // Clear error messages

        // Reset any existing file preview
        document.getElementById('current-file-container').style.display = 'none';

        if (certification) {
            form.description.value = certification.description;
            document.getElementById('current-file').href = certification.file;
            document.getElementById('current-file-container').style.display = 'block';
            form.dataset.edit = 'true';
            form.dataset.id = certification.id;
        } else {
            delete form.dataset.edit;
            delete form.dataset.id;
        }

        modal.show();  // Show modal using Bootstrap
    }

    function displayErrors(errors) {
        formErrors.innerHTML = '';
        for (const field in errors) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'text-danger';
            errorDiv.textContent = `${field}: ${errors[field]}`;
            formErrors.appendChild(errorDiv);
        }
    }

    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    loadCertifications();
});

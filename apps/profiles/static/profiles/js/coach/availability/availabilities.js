document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = '/profiles/api/v1/coach-availabilities/';
    const container = document.getElementById('availabilities-container');
    const addButton = document.getElementById('add-availability-button');
    const modalElement = document.getElementById('availability-modal');
    const deleteModalElement = document.getElementById('delete-confirmation-modal');  // Delete modal
    const modal = new bootstrap.Modal(modalElement);
    const deleteModal = new bootstrap.Modal(deleteModalElement);  // Bootstrap delete modal instance
    const form = document.getElementById('availability-form');
    const formErrors = document.getElementById('form-errors');
    const loadingIndicator = document.getElementById('loading-indicator');
    const successMessage = document.getElementById('success-message');
    let availabilityToDelete = null;  // Store availability to delete

    async function loadAvailabilities() {
        try {
            showLoading();
            let response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                }
            });

            if (response.status === 401) {
                await refreshToken();
                response = await fetch(apiUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${getAccessToken()}`,
                    }
                });
            }

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            container.innerHTML = '';
            data.forEach(avail => {
                const div = document.createElement('div');
                div.className = 'availability-item border p-3 mb-2';  // Bootstrap styling
                div.innerHTML = `
                    <p><strong>${avail.day_of_week}</strong>: ${avail.start_time} - ${avail.end_time}</p>
                    <button data-id="${avail.id}" class="edit-button btn btn-sm btn-warning">Edit</button>
                    <button data-id="${avail.id}" class="delete-button btn btn-sm btn-danger">Delete</button>
                `;
                container.appendChild(div);
            });
            hideLoading();
        } catch (error) {
            console.error('Error fetching availabilities:', error);
            hideLoading();
        }
    }

    function showLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }

    function hideLoading() {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    function showSuccessMessage(message) {
        if (successMessage) {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 3000);
        }
    }

    addButton.addEventListener('click', () => {
        openModal();
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        formErrors.innerHTML = '';

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (key !== 'coach_profile') {
                data[key] = value;
            }
        });

        const isEdit = form.dataset.edit === 'true';
        const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            let response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                closeModal();
                loadAvailabilities();
                showSuccessMessage(isEdit ? 'Availability updated successfully!' : 'Availability added successfully!');
            } else {
                const errorData = await response.json();
                throw errorData;
            }
        } catch (errors) {
            displayErrors(errors);
        }
    });

    container.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.dataset.id;
            editAvailability(id);
        }
        if (event.target.classList.contains('delete-button')) {
            const id = event.target.dataset.id;
            availabilityToDelete = id;
            deleteModal.show();  // Show delete confirmation modal
        }
    });

    // Confirm deletion
    document.getElementById('confirm-delete').addEventListener('click', function() {
        if (availabilityToDelete) {
            deleteAvailability(availabilityToDelete);
            availabilityToDelete = null;  // Reset the deletion ID after deletion
        }
    });

    async function editAvailability(id) {
        try {
            let response = await fetch(`${apiUrl}${id}/`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                }
            });

            const avail = await response.json();
            openModal(avail);
        } catch (error) {
            console.error('Error fetching availability:', error);
        }
    }

    async function deleteAvailability(id) {
        try {
            let response = await fetch(`${apiUrl}${id}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                }
            });

            if (response.ok) {
                loadAvailabilities();
                deleteModal.hide();  // Close the delete confirmation modal after deletion
                showSuccessMessage('Availability deleted successfully!');
            } else {
                console.error('Failed to delete availability.');
            }
        } catch (error) {
            console.error('Error deleting availability:', error);
        }
    }

    function openModal(avail = null) {
        if (avail) {
            form.day_of_week.value = avail.day_of_week;
            form.start_time.value = avail.start_time;
            form.end_time.value = avail.end_time;
            form.dataset.edit = 'true';
            form.dataset.id = avail.id;
        } else {
            form.reset();
            delete form.dataset.edit;
            delete form.dataset.id;
        }
        modal.show();
    }

    function closeModal() {
        modal.hide();
        form.reset();
        formErrors.innerHTML = '';
        delete form.dataset.edit;
        delete form.dataset.id;
    }

    function displayErrors(errors) {
        formErrors.innerHTML = '';
        for (const field in errors) {
            const errorMessages = errors[field];
            let errorMessageText;

            if (Array.isArray(errorMessages)) {
                errorMessageText = errorMessages.join(', ');
            } else if (typeof errorMessages === 'string') {
                errorMessageText = errorMessages;
            } else if (typeof errorMessages === 'object') {
                errorMessageText = JSON.stringify(errorMessages);
            } else {
                errorMessageText = String(errorMessages);
            }

            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message text-danger';
            errorDiv.textContent = `${field}: ${errorMessageText}`;
            formErrors.appendChild(errorDiv);
        }
    }

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

    function getAccessToken() {
        return localStorage.getItem('access_token');
    }

    loadAvailabilities();
});

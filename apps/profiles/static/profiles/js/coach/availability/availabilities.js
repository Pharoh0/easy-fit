document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = 'http://127.0.0.1:8000/profiles/api/v1/coach-availabilities/';
    const container = document.getElementById('availabilities-container');
    const addButton = document.getElementById('add-availability-button');
    const modal = document.getElementById('availability-modal');
    const form = document.getElementById('availability-form');
    const formErrors = document.getElementById('form-errors');
    const loadingIndicator = document.getElementById('loading-indicator');
    const successMessage = document.getElementById('success-message');

    function loadAvailabilities() {
        showLoading();
        fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => {
            if (response.status === 401) {
                return refreshToken().then(() => loadAvailabilities());
            }
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            container.innerHTML = '';
            data.forEach(avail => {
                const div = document.createElement('div');
                div.className = 'availability-item';
                div.innerHTML = `
                    <p>${avail.day_of_week}: ${avail.start_time} - ${avail.end_time}</p>
                    <button data-id="${avail.id}" class="edit-button btn btn-sm btn-warning">Edit</button>
                    <button data-id="${avail.id}" class="delete-button btn btn-sm btn-danger">Delete</button>
                `;
                container.appendChild(div);
            });
            hideLoading();
        })
        .catch(error => {
            console.error('Error fetching availabilities:', error);
            hideLoading();
        });
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

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        formErrors.innerHTML = '';

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            if (key !== 'coach_profile') {  // Exclude coach_profile from the data
                data[key] = value;
            }
        });
    
        // formData.forEach((value, key) => data[key] = value);

        const isEdit = form.dataset.edit === 'true';
        const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
        const method = isEdit ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`,
            },
            body: JSON.stringify(data),
        })
        .then(response => {
            if (response.status === 401) {
                return refreshToken().then(() => form.submit());
            }
            if (response.ok) {
                return response.json();
            } else {
                return response.json().then(data => { throw data; });
            }
        })
        .then(() => {
            closeModal();
            loadAvailabilities();
            showSuccessMessage(isEdit ? 'Availability updated successfully!' : 'Availability added successfully!');
        })
        .catch(errors => {
            displayErrors(errors);
        });
    });

    container.addEventListener('click', function(event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.dataset.id;
            editAvailability(id);
        }
        if (event.target.classList.contains('delete-button')) {
            const id = event.target.dataset.id;
            deleteAvailability(id);
        }
    });

    function editAvailability(id) {
        fetch(`${apiUrl}${id}/`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => response.json())
        .then(avail => {
            openModal(avail);
        })
        .catch(error => console.error('Error fetching availability:', error));
    }

    function deleteAvailability(id) {
        if (!confirm('Are you sure you want to delete this availability?')) return;

        fetch(`${apiUrl}${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'Accept': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`,
            }
        })
        .then(response => {
            if (response.ok) {
                loadAvailabilities();
                showSuccessMessage('Availability deleted successfully!');
            } else {
                console.error('Failed to delete availability.');
            }
        })
        .catch(error => console.error('Error deleting availability:', error));
    }

    function openModal(avail = null) {
        modal.style.display = 'block';
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
    }

    function closeModal() {
        modal.style.display = 'none';
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
    
            // Check if errorMessages is an array and join the messages
            if (Array.isArray(errorMessages)) {
                errorMessageText = errorMessages.join(', ');
            } else if (typeof errorMessages === 'string') {
                // If it's a string, use it directly
                errorMessageText = errorMessages;
            } else if (typeof errorMessages === 'object') {
                // If it's an object, convert it to a string (useful if Django returns nested errors)
                errorMessageText = JSON.stringify(errorMessages);
            } else {
                // Fallback to handling as a string
                errorMessageText = String(errorMessages);
            }
    
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
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

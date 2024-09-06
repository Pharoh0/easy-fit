document.addEventListener('DOMContentLoaded', function () {
    const apiUrl = '/plan-management/api/v1/product-plans/';
    const container = document.getElementById('plans-container');
    const addButton = document.getElementById('add-plan-button');
    const closeButton = document.querySelector('.close');  // Close button for the main modal
    const modal = document.getElementById('plan-modal');
    const form = document.getElementById('plan-form');
    const formErrors = document.getElementById('form-errors');
    const loadingIndicator = document.getElementById('loading-indicator');
    const successMessage = document.getElementById('success-message');
    const confirmDeleteModal = document.getElementById('confirm-delete-modal');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    let deletePlanId = null;

    // Load Product Plans
    async function loadPlans() {
        try {
            showLoading();
            let response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
            });

            if (response.status === 401) {
                await refreshToken();
                response = await fetch(apiUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${getAccessToken()}`,
                    },
                });
            }

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            container.innerHTML = '';
            data.forEach(plan => {
                const div = document.createElement('div');
                div.className = 'plan-item';
                div.innerHTML = `
                    <h3>${plan.name}</h3>
                    <p>${plan.description}</p>
                    <p><strong>Plan Type:</strong> ${plan.plan_type}</p>
                    <p><strong>Price:</strong> $${plan.price}</p>
                    <button data-id="${plan.id}" class="edit-button btn btn-sm btn-warning">Edit</button>
                    <button data-id="${plan.id}" class="delete-button btn btn-sm btn-danger">Delete</button>
                `;
                container.appendChild(div);
            });
            hideLoading();
        } catch (error) {
            console.error('Error fetching product plans:', error);
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

    if (addButton) {
        addButton.addEventListener('click', () => {
            openModal();
        });
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            formErrors.innerHTML = '';

            const formData = new FormData(form);
            const isEdit = form.dataset.edit === 'true';
            const url = isEdit ? `${apiUrl}${form.dataset.id}/` : apiUrl;
            const method = isEdit ? 'PUT' : 'POST';

            try {
                let response = await fetch(url, {
                    method: method,
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Authorization': `Bearer ${getAccessToken()}`,
                    },
                    body: formData,
                });

                if (response.status === 401) {
                    await refreshToken();
                    response = await fetch(url, {
                        method: method,
                        headers: {
                            'X-CSRFToken': getCSRFToken(),
                            'Authorization': `Bearer ${getAccessToken()}`,
                        },
                        body: formData,
                    });
                }

                if (response.ok) {
                    closeModal();
                    loadPlans();
                    showSuccessMessage(isEdit ? 'Product plan updated successfully!' : 'Product plan added successfully!');
                } else {
                    const errorData = await response.json();
                    throw errorData;
                }
            } catch (errors) {
                displayErrors(errors);
            }
        });
    }

    container.addEventListener('click', function (event) {
        if (event.target.classList.contains('edit-button')) {
            const id = event.target.dataset.id;
            editPlan(id);
        }
        if (event.target.classList.contains('delete-button')) {
            deletePlanId = event.target.dataset.id;
            openDeleteModal();
        }
    });

    async function editPlan(id) {
        try {
            let response = await fetch(`${apiUrl}${id}/`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
            });

            if (response.status === 401) {
                await refreshToken();
                response = await fetch(`${apiUrl}${id}/`, {
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${getAccessToken()}`,
                    },
                });
            }

            const plan = await response.json();
            openModal(plan);
        } catch (error) {
            console.error('Error fetching product plan:', error);
        }
    }

    async function deletePlan() {
        if (!deletePlanId) return;

        try {
            let response = await fetch(`${apiUrl}${deletePlanId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Authorization': `Bearer ${getAccessToken()}`,
                },
            });

            if (response.status === 401) {
                await refreshToken();
                response = await fetch(`${apiUrl}${deletePlanId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Authorization': `Bearer ${getAccessToken()}`,
                    },
                });
            }

            if (response.ok) {
                loadPlans();
                showSuccessMessage('Product plan deleted successfully!');
            } else {
                console.error('Failed to delete product plan.');
            }
            closeDeleteModal();
        } catch (error) {
            console.error('Error deleting product plan:', error);
        }
    }

    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', deletePlan);
    }

    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', closeDeleteModal);
    }

    function openModal(plan = null) {
        if (modal) {
            modal.style.display = 'flex';  // Use 'flex' to activate flexbox centering
            modal.classList.add('show');   // Optional: Add this if you want smooth transition
            formErrors.innerHTML = '';
            form.reset();

            if (plan) {
                form.name.value = plan.name;
                form.description.value = plan.description;
                form.plan_type.value = plan.plan_type;
                form.price.value = plan.price;
                form.price_per_session.value = plan.price_per_session;
                form.session_count.value = plan.session_count;
                form.start_date.value = plan.start_date;
                form.end_date.value = plan.end_date;
                form.renewal_period.value = plan.renewal_period;

                form.dataset.edit = 'true';
                form.dataset.id = plan.id;
            } else {
                delete form.dataset.edit;
                delete form.dataset.id;
            }
        }
    }

    

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';  // Hide modal
            form.reset();
            formErrors.innerHTML = '';
            delete form.dataset.edit;
            delete form.dataset.id;
        }
    }

    // Close modal when the close button is clicked
    closeButton.addEventListener('click', () => {
        closeModal();
    });
    

    function openDeleteModal() {
        if (confirmDeleteModal) {
            confirmDeleteModal.style.display = 'flex';
        }
    }

    function closeDeleteModal() {
        if (confirmDeleteModal) {
            confirmDeleteModal.style.display = 'none';
            deletePlanId = null;
        }
    }

    function displayErrors(errors) {
        formErrors.innerHTML = '';
        if (errors) {
            if (errors.errors) {
                errors = errors.errors;
            }
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
                errorDiv.className = 'error-message';
                errorDiv.textContent = `${field}: ${errorMessageText}`;
                formErrors.appendChild(errorDiv);
            }
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

    // Function to refresh token (if you have implemented it)
    async function refreshToken() {
        // Implement token refresh logic here
    }

    // Initial load
    loadPlans();
});

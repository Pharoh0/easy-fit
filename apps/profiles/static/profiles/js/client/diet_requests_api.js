/**
 * Diet Requests JavaScript - API Driven Implementation
 * Handles client-side functionality for managing diet requests and offers
 */

// DOM Elements
let requestsContainer;
let requestDetailContainer;
let createRequestForm;
let loadingSpinner;
let errorContainer;
let requestId;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Loading and error elements
    loadingSpinner = document.getElementById('loading-spinner');
    errorContainer = document.getElementById('error-container');
    
    // Check which page we're on and initialize accordingly
    requestsContainer = document.getElementById('requests-list');
    requestDetailContainer = document.getElementById('request-detail');
    createRequestForm = document.getElementById('create-request-form');
    
    if (requestsContainer) {
        initRequestsList();
    } else if (requestDetailContainer) {
        requestId = requestDetailContainer.dataset.requestId;
        initRequestDetail();
    } else if (createRequestForm) {
        initCreateRequestForm();
    }
    
    // Auto dismiss alerts after 5 seconds
    dismissAlerts();
});

/**
 * Initialize the diet requests list page
 * Fetches and displays all client diet requests
 */
function initRequestsList() {
    if (!requestsContainer) return;
    
    fetchDietRequests();
    
    // Status filter functionality for request list
    const filterButtons = document.querySelectorAll('.status-filter .nav-link');
    
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Show/hide request cards based on filter
                const requestCards = document.querySelectorAll('.request-card');
                requestCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-status') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
}

/**
 * Initialize the diet request detail page
 * Fetches and displays a single diet request's details
 */
function initRequestDetail() {
    if (!requestDetailContainer || !requestId) return;
    
    fetchDietRequestDetail(requestId);
    
    // Set up request action buttons with event delegation
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.request-action-btn');
        if (!target) return;
        
        e.preventDefault();
        
        const action = target.dataset.action;
        const requestId = target.dataset.requestId;
        
        // Different modal content based on action
        let modalTitle, modalBody, btnText, btnClass;
        
        switch (action) {
            case 'accept-offer':
                modalTitle = 'Accept Diet Plan Offer';
                modalBody = `
                    <p>Are you sure you want to accept this diet plan offer?</p>
                    <p>When accepted:</p>
                    <ul>
                        <li>Your payment method will be charged</li>
                        <li>The coach will begin working on your diet plan</li>
                        <li>You'll be notified when the diet plan is ready</li>
                    </ul>
                `;
                btnText = 'Accept Offer';
                btnClass = 'btn-success';
                break;
                
            case 'reject-offer':
                modalTitle = 'Reject Diet Plan Offer';
                modalBody = `
                    <p>Are you sure you want to reject this diet plan offer?</p>
                    <p>When rejected:</p>
                    <ul>
                        <li>The offer will be declined</li>
                        <li>You won't be charged</li>
                        <li>You can still make new diet plan requests</li>
                    </ul>
                `;
                btnText = 'Reject Offer';
                btnClass = 'btn-danger';
                break;
                
            case 'cancel-request':
                modalTitle = 'Cancel Diet Request';
                modalBody = `
                    <p>Are you sure you want to cancel this diet request?</p>
                    <p>When cancelled:</p>
                    <ul>
                        <li>The coach will be notified</li>
                        <li>This action cannot be undone</li>
                        <li>You can create a new request if needed</li>
                    </ul>
                `;
                btnText = 'Cancel Request';
                btnClass = 'btn-danger';
                break;
                
            default:
                return;
        }
        
        // Set up the confirmation modal
        const confirmModal = document.getElementById('confirmModal');
        if (!confirmModal) return;
        
        const bsModal = new bootstrap.Modal(confirmModal);
        
        confirmModal.querySelector('.modal-title').textContent = modalTitle;
        confirmModal.querySelector('.modal-body').innerHTML = modalBody;
        
        // Update confirm button action
        const confirmButton = confirmModal.querySelector('#confirmActionBtn');
        confirmButton.dataset.action = action;
        confirmButton.dataset.requestId = requestId;
        confirmButton.textContent = btnText;
        confirmButton.className = `btn ${btnClass}`;
        
        // Show the modal
        bsModal.show();
    });
    
    // Handle confirmation button click
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
        confirmActionBtn.addEventListener('click', async function() {
            const action = this.dataset.action;
            const requestId = this.dataset.requestId;
            
            // Hide the modal
            const confirmModal = document.getElementById('confirmModal');
            const bsModal = bootstrap.Modal.getInstance(confirmModal);
            bsModal.hide();
            
            // Show loading
            showLoading(true);
            
            try {
                let result;
                
                // Call the appropriate API endpoint
                switch (action) {
                    case 'accept-offer':
                        result = await acceptOffer(requestId);
                        showSuccess('You have successfully accepted the offer!');
                        break;
                    case 'reject-offer':
                        result = await rejectOffer(requestId);
                        showSuccess('You have successfully rejected the offer.');
                        break;
                    case 'cancel-request':
                        result = await cancelDietRequest(requestId);
                        showSuccess('Your diet request has been cancelled.');
                        break;
                }
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                showError(`Failed to ${action.replace('-', ' ')}. ${error.message || 'Please try again later.'}`);
                console.error(`Error with action ${action}:`, error);
            } finally {
                showLoading(false);
            }
        });
    }
}

/**
 * Initialize the diet request creation form
 */
function initCreateRequestForm() {
    if (!createRequestForm) return;
    
    // Toggle measurement fields based on checkbox
    const includeMeasurementCheck = document.getElementById('include-measurements');
    const measurementFields = document.getElementById('measurement-fields');
    
    if (includeMeasurementCheck && measurementFields) {
        // Initial state
        toggleMeasurementFields();
        
        // Listen for changes
        includeMeasurementCheck.addEventListener('change', toggleMeasurementFields);
        
        function toggleMeasurementFields() {
            measurementFields.style.display = includeMeasurementCheck.checked ? 'block' : 'none';
        }
    }
    
    // Form validation and submission
    createRequestForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!validateRequestForm()) {
            return;
        }
        
        // Show loading
        showLoading(true);
        
        // Collect form data
        const formData = {
            coach: createRequestForm.querySelector('select[name="coach"]').value,
            goals: createRequestForm.querySelector('textarea[name="goals"]').value,
            dietary_restrictions: createRequestForm.querySelector('textarea[name="dietary_restrictions"]').value,
            allergies: createRequestForm.querySelector('textarea[name="allergies"]').value,
            additional_notes: createRequestForm.querySelector('textarea[name="additional_notes"]').value
        };
        
        // Add measurements if included
        if (includeMeasurementCheck && includeMeasurementCheck.checked) {
            formData.weight = createRequestForm.querySelector('input[name="weight"]').value;
            formData.height = createRequestForm.querySelector('input[name="height"]').value;
            formData.body_fat_percentage = createRequestForm.querySelector('input[name="body_fat_percentage"]').value;
            formData.muscle_mass = createRequestForm.querySelector('input[name="muscle_mass"]').value;
        }
        
        try {
            // Submit request to API
            const result = await createDietRequest(formData);
            
            showSuccess('Your diet request has been submitted successfully!');
            
            // Redirect to the requests list page after a short delay
            setTimeout(() => {
                window.location.href = '/profiles/client/diet-requests/';
            }, 2000);
            
        } catch (error) {
            showError(`Failed to submit your diet request. ${error.message || 'Please try again later.'}`);
            console.error('Error submitting diet request:', error);
        } finally {
            showLoading(false);
        }
    });
    
    // Helper function to validate the form
    function validateRequestForm() {
        let isValid = true;
        
        // Reset previous error messages
        createRequestForm.querySelectorAll('.invalid-feedback').forEach(el => {
            el.textContent = '';
        });
        createRequestForm.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        
        // Validate coach selection
        const coachSelect = createRequestForm.querySelector('select[name="coach"]');
        if (!coachSelect.value) {
            showFieldError(coachSelect, 'Please select a coach.');
            isValid = false;
        }
        
        // Validate goals
        const goalsField = createRequestForm.querySelector('textarea[name="goals"]');
        if (!goalsField.value.trim()) {
            showFieldError(goalsField, 'Please describe your fitness goals.');
            isValid = false;
        }
        
        // Validate measurements if included
        if (includeMeasurementCheck && includeMeasurementCheck.checked) {
            // Validate weight
            const weightField = createRequestForm.querySelector('input[name="weight"]');
            if (!weightField.value || isNaN(weightField.value) || weightField.value <= 0) {
                showFieldError(weightField, 'Please enter a valid weight.');
                isValid = false;
            }
            
            // Validate height
            const heightField = createRequestForm.querySelector('input[name="height"]');
            if (!heightField.value || isNaN(heightField.value) || heightField.value <= 0) {
                showFieldError(heightField, 'Please enter a valid height.');
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    // Helper function to show field error
    function showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        // Find or create feedback element
        let feedback = field.nextElementSibling;
        if (!feedback || !feedback.classList.contains('invalid-feedback')) {
            feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            field.parentNode.insertBefore(feedback, field.nextSibling);
        }
        
        feedback.textContent = message;
    }
}

/**
 * Fetch all diet requests for the current client
 */
async function fetchDietRequests() {
    showLoading(true);
    
    try {
        const requests = await fetchAPI('client-diet-requests/', 'GET');
        renderDietRequestsList(requests);
    } catch (error) {
        showError('Failed to load diet requests. Please try again later.');
        console.error('Error fetching diet requests:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch details for a specific diet request
 * @param {string} id - Diet request ID
 */
async function fetchDietRequestDetail(id) {
    showLoading(true);
    
    try {
        const request = await fetchAPI(`client-diet-requests/${id}/`, 'GET');
        renderDietRequestDetail(request);
    } catch (error) {
        showError('Failed to load diet request details. Please try again later.');
        console.error('Error fetching diet request details:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Render the list of diet requests
 * @param {Array} requests - List of diet request objects
 */
function renderDietRequestsList(requests) {
    if (!requestsContainer) return;
    
    // Clear the container
    requestsContainer.innerHTML = '';
    
    if (!requests || requests.length === 0) {
        requestsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <h5>No Diet Requests</h5>
                <p>You haven't made any diet plan requests yet.</p>
                <a href="/profiles/client/diet-requests/create/" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Create Diet Request
                </a>
            </div>
        `;
        return;
    }
    
    // Create request cards
    const row = document.createElement('div');
    row.className = 'row';
    
    requests.forEach(request => {
        const statusClass = getStatusClass(request.status);
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="request-card" data-status="${request.status}">
                <div class="request-header ${statusClass}">
                    <div class="coach-info">
                        ${request.coach_details ? `
                            <img src="${request.coach_details.profile_pic || '/static/profiles/img/default-profile.png'}" alt="Coach profile" class="coach-img">
                            <div>
                                <h5>${request.coach_details.full_name}</h5>
                                <span class="badge ${statusClass}">${request.status_display}</span>
                            </div>
                        ` : `
                            <div>
                                <h5>Diet Request</h5>
                                <span class="badge ${statusClass}">${request.status_display}</span>
                            </div>
                        `}
                    </div>
                </div>
                <div class="request-body">
                    <div class="request-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Requested: ${formatDate(request.request_date)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-bullseye"></i>
                            <span>Goals: ${truncateText(request.goals, 60)}</span>
                        </div>
                        ${request.is_offer ? `
                            <div class="detail-item">
                                <i class="fas fa-tag"></i>
                                <span>Offered Price: $${request.price}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="request-footer">
                    <a href="/profiles/client/diet-requests/${request.id}/" class="btn btn-primary">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                    ${request.is_offer && request.status === 'pending' ? `
                        <button class="btn btn-success request-action-btn" 
                            data-action="accept-offer" 
                            data-request-id="${request.id}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        row.appendChild(card);
    });
    
    requestsContainer.appendChild(row);
    
    // Update filter counts
    updateFilterCounts();
}

/**
 * Render a single diet request's details
 * @param {Object} request - Diet request object
 */
function renderDietRequestDetail(request) {
    if (!requestDetailContainer) return;
    
    // Update request details
    document.getElementById('request-status').textContent = request.status_display;
    document.getElementById('request-status').className = `badge ${getStatusClass(request.status)}`;
    document.getElementById('request-date').textContent = formatDate(request.request_date);
    
    // Update coach info
    if (request.coach_details) {
        document.getElementById('coach-name').textContent = request.coach_details.full_name;
        const coachImg = document.getElementById('coach-img');
        if (coachImg) {
            coachImg.src = request.coach_details.profile_pic || '/static/profiles/img/default-profile.png';
        }
    }
    
    // Update request details content
    document.getElementById('request-goals').textContent = request.goals;
    
    if (request.dietary_restrictions) {
        document.getElementById('request-restrictions').textContent = request.dietary_restrictions;
        document.getElementById('restrictions-section').style.display = 'block';
    } else {
        document.getElementById('restrictions-section').style.display = 'none';
    }
    
    if (request.allergies) {
        document.getElementById('request-allergies').textContent = request.allergies;
        document.getElementById('allergies-section').style.display = 'block';
    } else {
        document.getElementById('allergies-section').style.display = 'none';
    }
    
    if (request.additional_notes) {
        document.getElementById('request-notes').textContent = request.additional_notes;
        document.getElementById('notes-section').style.display = 'block';
    } else {
        document.getElementById('notes-section').style.display = 'none';
    }
    
    // Update price if offer
    if (request.is_offer) {
        document.getElementById('offer-price').textContent = `$${request.price}`;
        document.getElementById('offer-section').style.display = 'block';
    } else {
        document.getElementById('offer-section').style.display = 'none';
    }
    
    // Update action buttons
    const actionsContainer = document.getElementById('request-actions');
    if (actionsContainer) {
        actionsContainer.innerHTML = '';
        
        // Add appropriate action buttons based on request status
        if (request.is_offer && request.status === 'pending') {
            // Offer buttons for pending offers
            actionsContainer.innerHTML = `
                <button class="btn btn-success btn-lg w-100 mb-2 request-action-btn" 
                    data-action="accept-offer" 
                    data-request-id="${request.id}">
                    <i class="fas fa-check"></i> Accept Offer
                </button>
                <button class="btn btn-danger btn-lg w-100 request-action-btn" 
                    data-action="reject-offer" 
                    data-request-id="${request.id}">
                    <i class="fas fa-times"></i> Reject Offer
                </button>
            `;
        } else if (request.status === 'pending') {
            // Cancel button for pending requests
            actionsContainer.innerHTML = `
                <button class="btn btn-danger btn-lg w-100 request-action-btn" 
                    data-action="cancel-request" 
                    data-request-id="${request.id}">
                    <i class="fas fa-times"></i> Cancel Request
                </button>
            `;
        }
    }
    
    // Show the detail container
    requestDetailContainer.style.display = 'block';
}

/**
 * Update the counts in filter buttons
 */
function updateFilterCounts() {
    const filterButtons = document.querySelectorAll('.status-filter .nav-link');
    const requestCards = document.querySelectorAll('.request-card');
    
    // Initialize counts
    const counts = {
        all: requestCards.length,
        pending: 0,
        accepted: 0,
        rejected: 0,
        cancelled: 0,
        completed: 0
    };
    
    // Count requests by status
    requestCards.forEach(card => {
        const status = card.getAttribute('data-status');
        if (counts[status] !== undefined) {
            counts[status]++;
        }
    });
    
    // Update count in each filter button
    filterButtons.forEach(button => {
        const filter = button.getAttribute('data-filter');
        const countBadge = button.querySelector('.badge');
        
        if (countBadge && counts[filter] !== undefined) {
            countBadge.textContent = counts[filter];
        }
    });
}

/**
 * Auto-dismiss alerts after 5 seconds
 */
function dismissAlerts() {
    const alertElements = document.querySelectorAll('.alert:not(.persistent)');
    alertElements.forEach(alert => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 5000);
    });
}

/**
 * Get the CSS class for request status
 * @param {string} status - Request status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
    switch (status) {
        case 'accepted':
        case 'completed':
            return 'bg-success';
        case 'pending':
            return 'bg-info';
        case 'rejected':
        case 'cancelled':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

/**
 * Truncate text with ellipsis if too long
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * Format a date string
 * @param {string} dateString - Date string from API
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Show loading spinner
 * @param {boolean} show - Whether to show or hide the spinner
 */
function showLoading(show) {
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    if (!errorContainer) return;
    
    errorContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong><i class="fas fa-exclamation-triangle me-2"></i>Error!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = errorContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    if (!errorContainer) return;
    
    errorContainer.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <strong><i class="fas fa-check-circle me-2"></i>Success!</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = errorContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Create a new diet request
 * @param {Object} requestData - Diet request data
 * @returns {Promise} - Promise resolving to created diet request
 */
async function createDietRequest(requestData) {
    try {
        const response = await fetchAPI('client-diet-requests/', 'POST', requestData);
        return response;
    } catch (error) {
        console.error('Error creating diet request:', error);
        throw error;
    }
}

/**
 * Cancel a diet request
 * @param {string} requestId - Diet request ID
 * @returns {Promise} - Promise resolving to updated request
 */
async function cancelDietRequest(requestId) {
    try {
        const response = await fetchAPI(`client-diet-requests/${requestId}/cancel/`, 'POST');
        return response;
    } catch (error) {
        console.error('Error canceling diet request:', error);
        throw error;
    }
}

/**
 * Accept a coach's offer for a diet request
 * @param {string} offerId - Offer ID
 * @returns {Promise} - Promise resolving to updated request
 */
async function acceptOffer(offerId) {
    try {
        const response = await fetchAPI(`coach-offers/${offerId}/accept/`, 'POST');
        return response;
    } catch (error) {
        console.error('Error accepting offer:', error);
        throw error;
    }
}

/**
 * Reject a coach's offer for a diet request
 * @param {string} offerId - Offer ID
 * @returns {Promise} - Promise resolving to updated request
 */
async function rejectOffer(offerId) {
    try {
        const response = await fetchAPI(`coach-offers/${offerId}/reject/`, 'POST');
        return response;
    } catch (error) {
        console.error('Error rejecting offer:', error);
        throw error;
    }
}

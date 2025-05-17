/**
 * Subscriptions JavaScript - API Driven Implementation
 * Handles client-side functionality for managing subscriptions
 */

// DOM Elements
let subscriptionsContainer;
let subscriptionDetailContainer;
let loadingSpinner;
let errorContainer;
let subscriptionId;

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
    subscriptionsContainer = document.getElementById('subscriptions-list');
    subscriptionDetailContainer = document.getElementById('subscription-detail');
    
    if (subscriptionsContainer) {
        initSubscriptionsList();
    } else if (subscriptionDetailContainer) {
        subscriptionId = subscriptionDetailContainer.dataset.subscriptionId;
        initSubscriptionDetail();
    }
    
    // Meal day / Workout day selectors
    initDaySelectors();
    
    // Auto dismiss alerts after 5 seconds
    dismissAlerts();
    
    // Date restrictions for consultation scheduling
    initConsultationDateRestrictions();
    
    // Filter subscriptions (for subscriptions list page)
    initSubscriptionFilters();
});

/**
 * Initialize the subscriptions list page
 * Fetches and displays all client subscriptions
 */
function initSubscriptionsList() {
    if (!subscriptionsContainer) return;
    
    fetchSubscriptions();
    
    // Set up subscription action buttons
    initSubscriptionActions();
}

/**
 * Initialize the subscription detail page
 * Fetches and displays a single subscription's details
 */
function initSubscriptionDetail() {
    if (!subscriptionDetailContainer || !subscriptionId) return;
    
    fetchSubscriptionDetail(subscriptionId);
    
    // Set up subscription action buttons
    initSubscriptionActions();
}

/**
 * Fetch all subscriptions for the current client
 */
async function fetchSubscriptions() {
    showLoading(true);
    
    try {
        const subscriptions = await subscriptionService.getAllSubscriptions();
        renderSubscriptionsList(subscriptions);
    } catch (error) {
        showError('Failed to load subscriptions. Please try again later.');
        console.error('Error fetching subscriptions:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Fetch details for a specific subscription
 * @param {string} id - Subscription ID
 */
async function fetchSubscriptionDetail(id) {
    showLoading(true);
    
    try {
        const subscription = await subscriptionService.getSubscription(id);
        renderSubscriptionDetail(subscription);
    } catch (error) {
        showError('Failed to load subscription details. Please try again later.');
        console.error('Error fetching subscription details:', error);
    } finally {
        showLoading(false);
    }
}

/**
 * Render the list of subscriptions
 * @param {Array} subscriptions - List of subscription objects
 */
function renderSubscriptionsList(subscriptions) {
    if (!subscriptionsContainer) return;
    
    // Clear the container
    subscriptionsContainer.innerHTML = '';
    
    if (!subscriptions || subscriptions.length === 0) {
        subscriptionsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-dumbbell"></i>
                </div>
                <h5>No Active Subscriptions</h5>
                <p>You don't have any active subscriptions yet.</p>
                <a href="/profiles/coaches/" class="btn btn-primary">
                    <i class="fas fa-search"></i> Find a Coach
                </a>
            </div>
        `;
        return;
    }
    
    // Create subscription cards
    subscriptions.forEach(subscription => {
        const statusClass = getStatusClass(subscription.status);
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="subscription-card">
                <div class="subscription-header ${statusClass}">
                    <div class="coach-info">
                        <img src="${subscription.coach_details.profile_pic || '/static/profiles/img/default-profile.png'}" alt="Coach profile" class="coach-img">
                        <div>
                            <h5>${subscription.coach_details.full_name}</h5>
                            <span class="badge ${statusClass}">${subscription.status_display}</span>
                        </div>
                    </div>
                </div>
                <div class="subscription-body">
                    <h4 class="subscription-name">${subscription.name}</h4>
                    <div class="subscription-details">
                        <div class="detail-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Started: ${formatDate(subscription.start_date)}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-hourglass-half"></i>
                            <span>${subscription.days_remaining} days remaining</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clipboard-check"></i>
                            <span>${subscription.progress_reports_count} progress reports</span>
                        </div>
                    </div>
                </div>
                <div class="subscription-footer">
                    <a href="/profiles/client/subscriptions/${subscription.id}/" class="btn btn-primary">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                    ${getActionButton(subscription)}
                </div>
            </div>
        `;
        subscriptionsContainer.appendChild(card);
    });
    
    // Re-initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Render a single subscription's details
 * @param {Object} subscription - Subscription object
 */
function renderSubscriptionDetail(subscription) {
    if (!subscriptionDetailContainer) return;
    
    // Update subscription details
    document.getElementById('subscription-name').textContent = subscription.name;
    document.getElementById('subscription-status').textContent = subscription.status_display;
    document.getElementById('subscription-status').className = `badge ${getStatusClass(subscription.status)}`;
    
    // Update coach info
    if (subscription.coach_details) {
        document.getElementById('coach-name').textContent = subscription.coach_details.full_name;
        const coachImg = document.getElementById('coach-img');
        if (coachImg) {
            coachImg.src = subscription.coach_details.profile_pic || '/static/profiles/img/default-profile.png';
        }
    }
    
    // Update dates and details
    document.getElementById('start-date').textContent = formatDate(subscription.start_date);
    document.getElementById('end-date').textContent = formatDate(subscription.end_date);
    document.getElementById('days-remaining').textContent = subscription.days_remaining;
    
    // Update action buttons
    const actionsContainer = document.getElementById('subscription-actions');
    if (actionsContainer) {
        actionsContainer.innerHTML = getActionButton(subscription, true);
    }
    
    // Show the detail container
    subscriptionDetailContainer.style.display = 'block';
}

/**
 * Initialize subscription action buttons (pause, resume, cancel)
 */
function initSubscriptionActions() {
    // Use event delegation to handle all subscription action buttons
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.subscription-action-btn');
        if (!target) return;
        
        e.preventDefault();
        
        const action = target.dataset.action;
        const subscriptionId = target.dataset.subscriptionId;
        const subscriptionName = target.dataset.subscriptionName;
        
        // Different modal content based on action
        let modalTitle, modalBody, btnText, btnClass;
        
        switch (action) {
            case 'pause':
                modalTitle = 'Pause Subscription';
                modalBody = `
                    <p>Are you sure you want to pause your <strong>${subscriptionName}</strong> subscription?</p>
                    <p>While paused:</p>
                    <ul>
                        <li>Your subscription end date will be extended</li>
                        <li>You won't be billed for the paused period</li>
                        <li>You can resume your subscription at any time</li>
                    </ul>
                `;
                btnText = 'Pause Subscription';
                btnClass = 'btn-warning';
                break;
                
            case 'resume':
                modalTitle = 'Resume Subscription';
                modalBody = `
                    <p>Are you sure you want to resume your <strong>${subscriptionName}</strong> subscription?</p>
                    <p>When resumed:</p>
                    <ul>
                        <li>Your subscription will become active again</li>
                        <li>Billing will restart according to your payment schedule</li>
                        <li>Your coach will continue tracking your progress</li>
                    </ul>
                `;
                btnText = 'Resume Subscription';
                btnClass = 'btn-success';
                break;
                
            case 'cancel':
                modalTitle = 'Cancel Subscription';
                modalBody = `
                    <p>Are you sure you want to cancel your <strong>${subscriptionName}</strong> subscription?</p>
                    <p>When cancelled:</p>
                    <ul>
                        <li>Your subscription will end immediately</li>
                        <li>You will lose access to your coach's resources</li>
                        <li>This action cannot be undone</li>
                    </ul>
                `;
                btnText = 'Cancel Subscription';
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
        confirmButton.dataset.subscriptionId = subscriptionId;
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
            const subscriptionId = this.dataset.subscriptionId;
            
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
                    case 'pause':
                        result = await subscriptionService.pauseSubscription(subscriptionId);
                        showSuccess('Your subscription has been paused successfully.');
                        break;
                    case 'resume':
                        result = await subscriptionService.resumeSubscription(subscriptionId);
                        showSuccess('Your subscription has been resumed successfully.');
                        break;
                    case 'cancel':
                        result = await subscriptionService.cancelSubscription(subscriptionId);
                        showSuccess('Your subscription has been cancelled successfully.');
                        break;
                }
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                showError(`Failed to ${action} subscription. ${error.message || 'Please try again later.'}`);
                console.error(`Error ${action}ing subscription:`, error);
            } finally {
                showLoading(false);
            }
        });
    }
}

/**
 * Initialize day selectors for meal and workout plans
 */
function initDaySelectors() {
    // Handle meal plan day selection
    const mealDayBtns = document.querySelectorAll('.meal-days .day-btn');
    const mealDayContents = document.querySelectorAll('.meal-days .day-content');
    
    mealDayBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and content
            mealDayBtns.forEach(b => b.classList.remove('active'));
            mealDayContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding content
            const dayNumber = this.getAttribute('data-day');
            document.getElementById('day' + dayNumber).classList.add('active');
        });
    });
    
    // Handle workout plan day selection
    const workoutDayBtns = document.querySelectorAll('.workout-days .day-btn');
    const workoutDayContents = document.querySelectorAll('.workout-days .day-content');
    
    workoutDayBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and content
            workoutDayBtns.forEach(b => b.classList.remove('active'));
            workoutDayContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding content
            const dayNumber = this.getAttribute('data-day');
            document.getElementById('workout-day' + dayNumber).classList.add('active');
        });
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
 * Initialize date and time restrictions for consultation scheduling
 */
function initConsultationDateRestrictions() {
    const dateInput = document.getElementById('consultation-date');
    if (!dateInput) return;
    
    // Set min date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
    
    // Set max date to 2 weeks from now
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    dateInput.max = twoWeeks.toISOString().split('T')[0];
    
    // Handle time slot selection
    const timeSlots = document.querySelectorAll('.time-slot-btn');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', function() {
            // Remove active class from all slots
            timeSlots.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked slot
            this.classList.add('active');
            
            // Update hidden input with selected time
            const timeInput = document.getElementById('consultation-time');
            if (timeInput) {
                timeInput.value = this.dataset.time;
            }
        });
    });
}

/**
 * Initialize filters for the subscriptions list page
 */
function initSubscriptionFilters() {
    const filterButtons = document.querySelectorAll('.subscription-filter-btn');
    if (!filterButtons.length) return;
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get filter value
            const filter = this.dataset.filter;
            
            // Filter subscription cards
            const subscriptionCards = document.querySelectorAll('.subscription-card');
            subscriptionCards.forEach(card => {
                const status = card.querySelector('.badge').textContent.toLowerCase();
                
                if (filter === 'all' || status === filter) {
                    card.closest('.col-md-6').style.display = 'block';
                } else {
                    card.closest('.col-md-6').style.display = 'none';
                }
            });
        });
    });
}

/**
 * Get the CSS class for subscription status
 * @param {string} status - Subscription status
 * @returns {string} CSS class
 */
function getStatusClass(status) {
    switch (status) {
        case 'active':
            return 'bg-success';
        case 'paused':
            return 'bg-warning';
        case 'cancelled':
        case 'expired':
            return 'bg-danger';
        case 'pending':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

/**
 * Get action button HTML based on subscription status
 * @param {Object} subscription - Subscription object
 * @param {boolean} isDetailPage - Whether this is for the detail page
 * @returns {string} Action button HTML
 */
function getActionButton(subscription, isDetailPage = false) {
    const btnClass = isDetailPage ? 'btn-lg w-100 mb-2' : '';
    
    switch (subscription.status) {
        case 'active':
            return `
                <button class="btn btn-warning subscription-action-btn ${btnClass}" 
                    data-action="pause" 
                    data-subscription-id="${subscription.id}" 
                    data-subscription-name="${subscription.name}">
                    <i class="fas fa-pause"></i> Pause Subscription
                </button>
            `;
        case 'paused':
            return `
                <button class="btn btn-success subscription-action-btn ${btnClass}" 
                    data-action="resume" 
                    data-subscription-id="${subscription.id}" 
                    data-subscription-name="${subscription.name}">
                    <i class="fas fa-play"></i> Resume Subscription
                </button>
            `;
        case 'cancelled':
        case 'expired':
            return `
                <button class="btn btn-secondary ${btnClass}" disabled>
                    <i class="fas fa-times"></i> Subscription Ended
                </button>
            `;
        default:
            return '';
    }
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
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    // Create success alert if it doesn't exist
    let successAlert = document.getElementById('success-alert');
    if (!successAlert) {
        successAlert = document.createElement('div');
        successAlert.id = 'success-alert';
        successAlert.className = 'alert alert-success alert-dismissible fade show';
        successAlert.setAttribute('role', 'alert');
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        successAlert.appendChild(closeButton);
        document.querySelector('.container').prepend(successAlert);
    }
    
    // Update message and show alert
    successAlert.innerHTML = message + successAlert.innerHTML.substring(successAlert.innerHTML.indexOf('<button'));
    
    // Hide after 5 seconds
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(successAlert);
        bsAlert.close();
    }, 5000);
}

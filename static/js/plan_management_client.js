/**
 * Plan Management Client JavaScript
 * Handles client-side functionality for plan browsing and subscription
 */

// Global settings
const API_BASE = '/plan-management/api/v1';

// Global state for filtering
let currentPlans = [];
let activeFilters = {
    type: 'all',
    priceMin: null,
    priceMax: null,
    duration: 'all',
    sort: null,
    search: ''
};

// Initialize client plan browsing
function initializeClientPlanBrowsing() {
    // Prevent double initialization if inline script and DOMContentLoaded both call this
    if (window._planBrowserInitialized) {
        return;
    }
    window._planBrowserInitialized = true;
    loadAvailablePlans();
    setupEventListeners();
}

// Load all available plans
async function loadAvailablePlans() {
    try {
        showLoading('planBrowserContainer');
        
        const result = await APIBase.request(`${API_BASE}/product-plans/?is_active=true`);
        
        if (!result.success) {
            throw new Error('Failed to load plans');
        }
        
        const data = result.data;
        currentPlans = data.results || data;
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Error loading plans:', error);
        showError('planBrowserContainer', 'Unable to load available plans. Please try again later.');
    }
}

// Apply all active filters and render plans
function applyFiltersAndRender() {
    let filteredPlans = [...currentPlans];
    
    // Apply type filter
    if (activeFilters.type !== 'all') {
        filteredPlans = filteredPlans.filter(plan => plan.plan_type === activeFilters.type);
    }
    
    // Apply price filter
    if (activeFilters.priceMin !== null) {
        filteredPlans = filteredPlans.filter(plan => parseFloat(plan.price) >= activeFilters.priceMin);
    }
    if (activeFilters.priceMax !== null) {
        filteredPlans = filteredPlans.filter(plan => parseFloat(plan.price) <= activeFilters.priceMax);
    }
    
    // Apply duration filter
    if (activeFilters.duration !== 'all') {
        const maxDays = parseInt(activeFilters.duration);
        filteredPlans = filteredPlans.filter(plan => {
            const duration = calculateDuration(plan.start_date, plan.end_date);
            return duration <= maxDays;
        });
    }
    
    // Apply search filter
    if (activeFilters.search) {
        const searchTerm = activeFilters.search.toLowerCase();
        filteredPlans = filteredPlans.filter(plan => {
            return (
                plan.name.toLowerCase().includes(searchTerm) ||
                (plan.description || '').toLowerCase().includes(searchTerm) ||
                (plan.coach_info?.display_name && plan.coach_info.display_name.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    // Apply sorting
    if (activeFilters.sort) {
        switch (activeFilters.sort) {
            case 'price-asc':
                filteredPlans.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-desc':
                filteredPlans.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'duration-asc':
                filteredPlans.sort((a, b) => {
                    const durationA = calculateDuration(a.start_date, a.end_date);
                    const durationB = calculateDuration(b.start_date, b.end_date);
                    return durationA - durationB;
                });
                break;
            case 'duration-desc':
                filteredPlans.sort((a, b) => {
                    const durationA = calculateDuration(a.start_date, a.end_date);
                    const durationB = calculateDuration(b.start_date, b.end_date);
                    return durationB - durationA;
                });
                break;
            case 'rating-desc':
                filteredPlans.sort((a, b) => {
                    const ratingA = parseFloat(a.average_rating || 0);
                    const ratingB = parseFloat(b.average_rating || 0);
                    return ratingB - ratingA;
                });
                break;
        }
    }
    
    // Render the filtered plans
    renderAvailablePlans(filteredPlans);
}

// Render available plans in the container
function renderAvailablePlans(plans) {
    const container = document.getElementById('planBrowserContainer');
    
    if (!plans || plans.length === 0) {
        container.innerHTML = `
            <div class="text-center p-5">
                <i class="bi bi-clipboard-x fs-1 text-muted mb-3"></i>
                <h4>No Plans Available</h4>
                <p class="text-muted">There are currently no available plans. Please check back later.</p>
            </div>
        `;
        return;
    }
    
    const planCardsHtml = plans.map(plan => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card plan-card h-100">
                <div class="card-header bg-${getPlanTypeColor(plan.plan_type)}">
                    <h5 class="card-title mb-0 text-white">
                        <i class="bi ${getPlanTypeIcon(plan.plan_type)} me-2"></i>
                        ${plan.name}
                    </h5>
                </div>
                <div class="card-body">
                    <div class="plan-price mb-3">
                        <span class="display-6">$${parseFloat(plan.price).toFixed(2)}</span>
                        <span class="text-muted">${plan.payment_frequency || 'one-time'}</span>
                    </div>
                    <p class="card-text">${plan.description || 'No description available'}</p>
                    <div class="plan-details mb-3">
                        <div><i class="bi bi-calendar3 me-2"></i>Duration: ${calculateDuration(plan.start_date, plan.end_date)} days</div>
                        <div><i class="bi bi-person-check me-2"></i>Coach: ${plan.coach_info?.display_name || 'Unknown'}</div>
                        <div><i class="bi bi-star me-2"></i>Rating: ${plan.average_rating || 'Not rated'}</div>
                    </div>
                </div>
                <div class="card-footer bg-light">
                    <button class="btn btn-primary w-100 view-plan-btn" data-plan-id="${plan.id}">
                        <i class="bi bi-eye me-2"></i>View Details
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="row">
            ${planCardsHtml}
        </div>
    `;
    
    // Attach event listeners to the view plan buttons
    attachPlanViewButtons();
}

// Attach event listeners to plan view buttons
function attachPlanViewButtons() {
    document.querySelectorAll('.view-plan-btn').forEach(button => {
        button.addEventListener('click', function() {
            const planId = this.getAttribute('data-plan-id');
            viewPlanDetails(planId);
        });
    });
}

// View plan details
async function viewPlanDetails(planId) {
    try {
        const planModal = new bootstrap.Modal(document.getElementById('planDetailsModal'));
        
        // Show modal with loading state
        document.getElementById('planDetailsBody').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading plan details...</p>
            </div>
        `;
        planModal.show();
        
        // Fetch plan details
        const result = await APIBase.request(`${API_BASE}/product-plans/${planId}/`);
        if (!result.success) {
            throw new Error('Failed to load plan details');
        }
        const plan = result.data;
        renderPlanDetails(plan);
        
    } catch (error) {
        console.error('Error loading plan details:', error);
        document.getElementById('planDetailsBody').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Unable to load plan details. Please try again later.
            </div>
        `;
    }
}

// Render plan details in modal
function renderPlanDetails(plan) {
    const planDetailsBody = document.getElementById('planDetailsBody');
    
    planDetailsBody.innerHTML = `
        <div class="plan-details-content">
            <div class="text-center mb-4">
                <span class="badge bg-${getPlanTypeColor(plan.plan_type)} fs-6 mb-2">
                    <i class="bi ${getPlanTypeIcon(plan.plan_type)} me-1"></i>
                    ${plan.plan_type.toUpperCase()}
                </span>
                <h3>${plan.name}</h3>
                <div class="plan-price">
                    <span class="display-5">$${parseFloat(plan.price).toFixed(2)}</span>
                    <span class="text-muted">${plan.payment_frequency || 'one-time'}</span>
                </div>
            </div>
            
            <div class="plan-info mb-4">
                <h5>Plan Information</h5>
                <div class="row">
                    <div class="col-md-6">
                        <ul class="list-group">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-calendar3 me-2"></i>Duration:</span>
                                <span class="badge bg-primary rounded-pill">${calculateDuration(plan.start_date, plan.end_date)} days</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-person-check me-2"></i>Coach:</span>
                                <span>${plan.coach_info?.display_name || 'Unknown'}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-star me-2"></i>Rating:</span>
                                <span>${renderRatingStars(plan.average_rating || 0)}</span>
                            </li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-group">
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-calendar-date me-2"></i>Start Date:</span>
                                <span>${formatDate(plan.start_date)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-calendar-date me-2"></i>End Date:</span>
                                <span>${formatDate(plan.end_date)}</span>
                            </li>
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <span><i class="bi bi-people me-2"></i>Subscribers:</span>
                                <span class="badge bg-secondary rounded-pill">${plan.subscription_count || 0}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="plan-description mb-4">
                <h5>Description</h5>
                <div class="card">
                    <div class="card-body">
                        <p>${plan.description || 'No description available'}</p>
                    </div>
                </div>
            </div>
            
            <div class="text-center">
                <button class="btn btn-lg btn-primary subscribe-btn" data-plan-id="${plan.id}">
                    <i class="bi bi-credit-card me-2"></i>Subscribe Now
                </button>
            </div>
        </div>
    `;
    
    // Attach subscription button event
    document.querySelector('.subscribe-btn').addEventListener('click', function() {
        const planId = this.getAttribute('data-plan-id');
        showSubscriptionConfirmation(planId);
    });
}

// Show subscription confirmation modal
async function showSubscriptionConfirmation(planId) {
    try {
        // Close plan details modal
        const planModal = bootstrap.Modal.getInstance(document.getElementById('planDetailsModal'));
        planModal.hide();
        
        // Show subscription modal
        const subscriptionModal = new bootstrap.Modal(document.getElementById('subscriptionConfirmModal'));
        
        // Show loading state
        document.getElementById('subscriptionConfirmBody').innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Preparing subscription...</p>
            </div>
        `;
        subscriptionModal.show();
        
        // Fetch plan details again for confirmation
        const result = await APIBase.request(`${API_BASE}/product-plans/${planId}/`);
        if (!result.success) {
            throw new Error('Failed to load plan details');
        }
        const plan = result.data;
        renderSubscriptionConfirmation(plan);
        
    } catch (error) {
        console.error('Error preparing subscription:', error);
        document.getElementById('subscriptionConfirmBody').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Unable to prepare subscription. Please try again later.
            </div>
        `;
    }
}

// Render subscription confirmation
function renderSubscriptionConfirmation(plan) {
    const subscriptionBody = document.getElementById('subscriptionConfirmBody');
    
    subscriptionBody.innerHTML = `
        <div class="subscription-confirmation">
            <div class="text-center mb-4">
                <i class="bi bi-check-circle text-success fs-1"></i>
                <h4>You're about to subscribe to:</h4>
                <h3 class="fw-bold">${plan.name}</h3>
            </div>
            
            <div class="subscription-details mb-4">
                <div class="card bg-light">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6 text-end fw-bold">Plan Type:</div>
                            <div class="col-6">${plan.plan_type.toUpperCase()}</div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6 text-end fw-bold">Price:</div>
                            <div class="col-6">$${parseFloat(plan.price).toFixed(2)}</div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6 text-end fw-bold">Duration:</div>
                            <div class="col-6">${calculateDuration(plan.start_date, plan.end_date)} days</div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6 text-end fw-bold">Start Date:</div>
                            <div class="col-6">${formatDate(plan.start_date)}</div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6 text-end fw-bold">End Date:</div>
                            <div class="col-6">${formatDate(plan.end_date)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="payment-info alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                <span>You will be charged $${parseFloat(plan.price).toFixed(2)} for this subscription.</span>
            </div>
            
            <div class="form-check mb-3">
                <input class="form-check-input" type="checkbox" id="termsAgree">
                <label class="form-check-label" for="termsAgree">
                    I agree to the terms and conditions
                </label>
            </div>
        </div>
    `;
    
    // Update confirm button with plan ID
    const confirmBtn = document.getElementById('confirmSubscriptionBtn');
    confirmBtn.setAttribute('data-plan-id', plan.id);
    confirmBtn.disabled = true;
    
    // Enable/disable confirm button based on checkbox
    document.getElementById('termsAgree').addEventListener('change', function() {
        confirmBtn.disabled = !this.checked;
    });
}

// Subscribe to plan
async function subscribeToPlan(planId) {
    try {
        const confirmBtn = document.getElementById('confirmSubscriptionBtn');
        const originalText = confirmBtn.innerHTML;
        
        // Update button state
        confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing...';
        confirmBtn.disabled = true;
        
        // Make API call to create subscription via global API utility
        const result = await APIBase.request(`${API_BASE}/plan-subscriptions/`, {
            method: 'POST',
            body: JSON.stringify({ product_plan_id: planId })
        });
        
        if (result.success) {
            showSubscriptionSuccess(result.data);
        } else {
            // Surface backend error text if available
            throw new Error(result.error || 'Subscription failed');
        }
        
    } catch (error) {
        console.error('Error subscribing to plan:', error);
        showSubscriptionError(error.message || 'Unable to complete subscription');
        
        // Reset button
        const confirmBtn = document.getElementById('confirmSubscriptionBtn');
        confirmBtn.innerHTML = '<i class="bi bi-credit-card me-2"></i>Subscribe Now';
        confirmBtn.disabled = false;
    }
}

// Show subscription success
function showSubscriptionSuccess(result) {
    const subscriptionBody = document.getElementById('subscriptionConfirmBody');
    
    subscriptionBody.innerHTML = `
        <div class="text-center py-4">
            <div class="success-animation mb-4">
                <i class="bi bi-check-circle-fill text-success display-1"></i>
            </div>
            <h3 class="text-success mb-3">Subscription Successful!</h3>
            <p class="lead">You have successfully subscribed to the plan.</p>
            <div class="mt-4">
                <a href="/plan-management/client/dashboard/" class="btn btn-primary">
                    <i class="bi bi-speedometer2 me-2"></i>Go to Dashboard
                </a>
            </div>
        </div>
    `;
    
    // Hide confirm button
    document.getElementById('confirmSubscriptionBtn').style.display = 'none';
    document.getElementById('cancelSubscriptionBtn').style.display = 'none';
    
    // Auto-redirect after delay
    setTimeout(() => {
        window.location.href = '/plan-management/client/dashboard/';
    }, 3000);
}

// Show subscription error
function showSubscriptionError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'alert alert-danger mt-3';
    errorElement.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${message}`;
    
    // Add to subscription body
    const subscriptionBody = document.getElementById('subscriptionConfirmBody');
    
    // Remove any existing error messages
    const existingError = subscriptionBody.querySelector('.alert-danger');
    if (existingError) {
        existingError.remove();
    }
    
    subscriptionBody.appendChild(errorElement);
}

// Setup event listeners
function setupEventListeners() {
    // Plan type filter buttons
    document.querySelectorAll('.plan-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.plan-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter
            activeFilters.type = this.getAttribute('data-filter');
            applyFiltersAndRender();
        });
    });
    
    // Price filter
    const applyPriceBtn = document.getElementById('applyPriceFilter');
    if (applyPriceBtn) {
        applyPriceBtn.addEventListener('click', function() {
            const minInput = document.getElementById('priceMin');
            const maxInput = document.getElementById('priceMax');
            
            activeFilters.priceMin = minInput.value ? parseFloat(minInput.value) : null;
            activeFilters.priceMax = maxInput.value ? parseFloat(maxInput.value) : null;
            
            applyFiltersAndRender();
        });
    }
    
    // Duration filter
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) {
        durationFilter.addEventListener('change', function() {
            activeFilters.duration = this.value;
            applyFiltersAndRender();
        });
    }
    
    // Sort options
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update sort option text in dropdown button
            document.getElementById('sortDropdown').innerText = this.innerText;
            
            // Apply sort
            activeFilters.sort = this.getAttribute('data-sort');
            applyFiltersAndRender();
        });
    });
    
    // Add search functionality
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'form-control form-control-sm me-2';
    searchInput.placeholder = 'Search plans...';
    searchInput.id = 'planSearchInput';
    
    // Add search input before the sort dropdown
    const sortDropdown = document.getElementById('sortDropdown');
    if (sortDropdown) {
        sortDropdown.parentNode.insertBefore(searchInput, sortDropdown);
        
        // Add event listener for search input
        searchInput.addEventListener('input', function() {
            activeFilters.search = this.value;
            applyFiltersAndRender();
        });
    }
    
    // Reset filters button
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            // Reset all filters
            document.querySelectorAll('.plan-filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-filter') === 'all') {
                    btn.classList.add('active');
                }
            });
            
            // Reset price inputs
            document.getElementById('priceMin').value = '';
            document.getElementById('priceMax').value = '';
            
            // Reset duration select
            document.getElementById('durationFilter').value = 'all';
            
            // Reset search
            const searchInput = document.getElementById('planSearchInput');
            if (searchInput) searchInput.value = '';
            
            // Reset sort dropdown text
            const sortDropdown = document.getElementById('sortDropdown');
            if (sortDropdown) sortDropdown.innerHTML = '<i class="bi bi-sort-alpha-down me-1"></i>Sort By';
            
            // Reset filter state
            activeFilters = {
                type: 'all',
                priceMin: null,
                priceMax: null,
                duration: 'all',
                sort: null,
                search: ''
            };
            
            // Apply filters
            applyFiltersAndRender();
        });
    }
    
    // Confirm subscription button
    document.getElementById('confirmSubscriptionBtn').addEventListener('click', function() {
        const planId = this.getAttribute('data-plan-id');
        subscribeToPlan(planId);
    });
}

// Helper functions
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading plans...</p>
        </div>
    `;
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}

function getPlanTypeColor(planType) {
    const types = {
        'workout': 'success',
        'diet': 'info',
        'combined': 'primary',
        'custom': 'secondary'
    };
    return types[planType.toLowerCase()] || 'primary';
}

function getPlanTypeIcon(planType) {
    const icons = {
        'workout': 'bi-activity',
        'diet': 'bi-egg-fried',
        'combined': 'bi-layers',
        'custom': 'bi-gear'
    };
    return icons[planType.toLowerCase()] || 'bi-clipboard-check';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 30; // Default to 30 if calculation fails
}

function renderRatingStars(rating) {
    const fullStar = '<i class="bi bi-star-fill text-warning"></i>';
    const halfStar = '<i class="bi bi-star-half text-warning"></i>';
    const emptyStar = '<i class="bi bi-star text-warning"></i>';
    
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += fullStar;
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += halfStar;
        } else {
            stars += emptyStar;
        }
    }
    
    return stars;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize if container exists
    if (document.getElementById('planBrowserContainer')) {
        initializeClientPlanBrowsing();
    }
});

// Export for global use
window.initializeClientPlanBrowsing = initializeClientPlanBrowsing;

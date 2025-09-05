/**
 * EazyFit Coach Plan Creation JavaScript
 * Simplified version without template selection steps
 */

// Global variables
let currentPlanId = null;

// CoachPlanAPI is imported from static/js/api/coach_plan_api.js

// Utility functions
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Show toast notification
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} message - The message to display
 * @param {number} duration - How long the toast should display (ms)
 */
function showToast(type, message, duration = 5000) {
    // Get or create toast container
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = createToastContainer();
    }
    
    const toastId = 'toast-' + Date.now();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    // Create toast content
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // Add toast to container
    container.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        animation: true,
        autohide: true,
        delay: duration
    });
    
    bsToast.show();
    
    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

/**
 * Create the toast container if it doesn't exist
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

/**
 * Update the workout days calculation
 */
function updateWorkoutDaysCalculation() {
    const workoutDays = parseInt(document.getElementById('workoutDaysPerWeek').value) || 0;
    const restDays = 7 - workoutDays;
    document.getElementById('restDaysPerWeek').value = restDays;
}

/**
 * Save the current form data to session storage
 */
function savePlanStateToSession() {
    const formData = {
        name: document.getElementById('planName')?.value,
        description: document.getElementById('planDescription')?.value,
        plan_type: document.querySelector('input[name="planType"]:checked')?.value,
        price: document.getElementById('planPrice')?.value,
        duration: document.getElementById('planDuration')?.value,
        workout_days_per_week: document.getElementById('workoutDaysPerWeek')?.value
    };
    
    sessionStorage.setItem('planCreationFormData', JSON.stringify(formData));
}

/**
 * Restore saved plan state from session storage
 */
function restorePlanStateFromSession() {
    // Restore any saved form data
    const formData = JSON.parse(sessionStorage.getItem('planCreationFormData') || '{}');
    
    if (formData.name) document.getElementById('planName').value = formData.name;
    if (formData.description) document.getElementById('planDescription').value = formData.description;
    if (formData.plan_type) {
        const radioButton = document.querySelector(`input[name="planType"][value="${formData.plan_type}"]`);
        if (radioButton) radioButton.checked = true;
    }
    if (formData.price) document.getElementById('planPrice').value = formData.price;
    if (formData.duration) document.getElementById('planDuration').value = formData.duration;
    if (formData.workout_days_per_week) document.getElementById('workoutDaysPerWeek').value = formData.workout_days_per_week;
    
    // Update calculated fields
    updateWorkoutDaysCalculation();
}

/**
 * Initialize all event listeners for plan creation
 */
function initializePlanCreationListeners() {
    // Plan Basics Tab Navigation
    const nextToStructureBtn = document.getElementById('nextToStructure');
    if (nextToStructureBtn) {
        nextToStructureBtn.addEventListener('click', function() {
            // Validate form first
            const planName = document.getElementById('planName').value;
            const planDescription = document.getElementById('planDescription').value;
            const planType = document.querySelector('input[name="planType"]:checked')?.value;
            const planPrice = document.getElementById('planPrice').value;
            
            if (!planName || !planDescription || !planType || !planPrice) {
                showToast('warning', 'Please fill out all required fields');
                return;
            }
            
            // Save form data to session storage
            savePlanStateToSession();
            
            // Navigate to plan structure tab
            document.getElementById('plan-structure-tab').click();
        });
    }
    
    // Plan Structure Tab Navigation
    const nextToReviewBtn = document.getElementById('nextToReview');
    if (nextToReviewBtn) {
        nextToReviewBtn.addEventListener('click', function() {
            // Save form data to session storage
            savePlanStateToSession();
            
            // Navigate to review tab
            document.getElementById('plan-review-tab').click();
        });
    }
    
    const backToBasicsBtn = document.getElementById('backToBasics');
    if (backToBasicsBtn) {
        backToBasicsBtn.addEventListener('click', function() {
            // Save form data to session storage
            savePlanStateToSession();
            
            // Navigate to plan basics tab
            document.getElementById('plan-basics-tab').click();
        });
    }
    
    // Review Tab Navigation
    const backToStructureBtn = document.getElementById('backToStructure');
    if (backToStructureBtn) {
        backToStructureBtn.addEventListener('click', function() {
            // Navigate to plan structure tab
            document.getElementById('plan-structure-tab').click();
        });
    }
    
    // Workout days calculation
    const workoutDaysInput = document.getElementById('workoutDaysPerWeek');
    if (workoutDaysInput) {
        workoutDaysInput.addEventListener('change', updateWorkoutDaysCalculation);
        workoutDaysInput.addEventListener('input', updateWorkoutDaysCalculation);
    }
    
    // Publish Plan Button
    const publishPlanBtn = document.getElementById('publishPlanBtn');
    if (publishPlanBtn) {
        publishPlanBtn.addEventListener('click', function() {
            publishPlan();
        });
    }
}

/**
 * Publish the plan
 */
function publishPlan() {
    const planName = document.getElementById('planName').value;
    const planDescription = document.getElementById('planDescription').value;
    const planType = document.querySelector('input[name="planType"]:checked')?.value;
    const planPrice = parseFloat(document.getElementById('planPrice').value);
    const planDuration = parseInt(document.getElementById('planDuration').value);
    const workoutDaysPerWeek = parseInt(document.getElementById('workoutDaysPerWeek').value);
    const isActive = document.getElementById('publishPlanCheck').checked;
    const difficultyLevel = document.getElementById('difficultyLevel')?.value;
    const maxClients = document.getElementById('maxClients')?.value;
    const renewalPeriod = document.getElementById('renewalPeriod')?.value;
    const mealsPerDay = document.getElementById('mealsPerDay')?.value;
    const snacksPerDay = document.getElementById('snacksPerDay')?.value;
    
    if (!planName || !planDescription || !planType || isNaN(planPrice) || isNaN(planDuration)) {
        showToast('warning', 'Please fill out all required fields');
        return;
    }
    
    // Show loading indicator
    const publishBtn = document.getElementById('publishPlanBtn');
    const originalBtnText = publishBtn.innerHTML;
    publishBtn.disabled = true;
    publishBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Publishing...
    `;
    
    // Prepare data for API call
    const planData = {
        name: planName,
        description: planDescription,
        plan_type: planType,
        price: planPrice,
        duration: planDuration,
        is_active: isActive,
        difficulty_level: difficultyLevel || 3,
        max_clients: maxClients || null,
        renewal_period: renewalPeriod || 'none',
        workout_days_per_week: workoutDaysPerWeek || 0,
        meals_per_day: mealsPerDay || 0,
        snacks_per_day: snacksPerDay || 0
    };
    
    // Create the plan via API
    CoachPlanAPI.productPlans.create(planData)
        .then(response => {
            showToast('success', 'Plan created successfully!');
            
            // Clean up session storage
            sessionStorage.removeItem('planCreationFormData');
            
            // Redirect to plan management page
            setTimeout(() => {
                window.location.href = '/plan-management/coach/plan-management/';
            }, 1500);
        })
        .catch(error => {
            console.error('Error creating plan:', error);
            showToast('error', `Failed to create plan: ${error.message || 'Unknown error'}`);
        })
        .finally(() => {
            // Reset button state
            publishBtn.disabled = false;
            publishBtn.innerHTML = originalBtnText;
        });
}

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize Bootstrap popovers
 */
function initPopovers() {
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// Event Handlers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializePlanCreationListeners();
    
    // Try to restore any saved state (if returning from previous page)
    restorePlanStateFromSession();
    
    // Retrieve plan ID from sessionStorage if it exists
    currentPlanId = sessionStorage.getItem('currentPlanId');
    console.log('Initialized with plan ID from sessionStorage:', currentPlanId);
    
    // Initialize tooltips
    initTooltips();
});

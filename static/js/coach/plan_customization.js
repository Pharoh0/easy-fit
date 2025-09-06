/**
 * EazyFit Plan Customization JavaScript
 * Handles plan customization functionality including template application
 */

// Global toast notification system
window.showToast = function(type, message, duration = 5000) {
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
};

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
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Initialize navigation between days
 */
function initDayNavigation() {
    const prevDayBtn = document.getElementById('previousDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    
    if (prevDayBtn) {
        prevDayBtn.addEventListener('click', function() {
            navigateToPrevDay();
        });
    }
    
    if (nextDayBtn) {
        nextDayBtn.addEventListener('click', function() {
            navigateToNextDay();
        });
    }
}

/**
 * Navigate to previous day
 */
function navigateToPrevDay() {
    const planDays = PlanCustomizationData.getPlanDays();
    const currentDayId = PlanCustomizationData.getCurrentDayId();
    
    if (!planDays.length || !currentDayId) return;
    
    const currentIndex = planDays.findIndex(day => day.id === currentDayId);
    if (currentIndex > 0) {
        PlanCustomizationData.selectDay(planDays[currentIndex - 1].id);
    }
}

/**
 * Navigate to next day
 */
function navigateToNextDay() {
    const planDays = PlanCustomizationData.getPlanDays();
    const currentDayId = PlanCustomizationData.getCurrentDayId();
    
    if (!planDays.length || !currentDayId) return;
    
    const currentIndex = planDays.findIndex(day => day.id === currentDayId);
    if (currentIndex >= 0 && currentIndex < planDays.length - 1) {
        PlanCustomizationData.selectDay(planDays[currentIndex + 1].id);
    }
}

/**
 * Initialize event handlers for templates
 */
function initTemplateHandlers() {
    // Get template buttons
    const workoutTemplateBtn = document.getElementById('applyWorkoutTemplateBtn');
    const mealTemplateBtn = document.getElementById('applyMealTemplateBtn');
    
    // Add event listeners
    if (workoutTemplateBtn) {
        workoutTemplateBtn.addEventListener('click', function() {
            PlanCustomizationTemplates.openTemplateModal('workout');
        });
    }
    
    if (mealTemplateBtn) {
        mealTemplateBtn.addEventListener('click', function() {
            PlanCustomizationTemplates.openTemplateModal('meal');
        });
    }
}

/**
 * Initialize the plan customization page
 */
function initializePlanCustomization() {
    console.log('Initializing plan customization page...');
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize day navigation
    initDayNavigation();
    
    // Initialize template handlers
    initTemplateHandlers();
    
    // Initialize data module
    if (PlanCustomizationData.initialize()) {
        // Load plan data
        PlanCustomizationData.loadPlanData();
        
        // Load templates
        if (typeof PlanCustomizationTemplates !== 'undefined' && 
            typeof PlanCustomizationTemplates.loadTemplates === 'function') {
            PlanCustomizationTemplates.loadTemplates();
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing plan customization...');
    initializePlanCustomization();
});

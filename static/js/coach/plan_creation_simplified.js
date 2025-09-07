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

// Normalize renewal period to API-allowed values
function normalizeRenewal(v) {
    const allowed = ['weekly', 'monthly'];
    v = String(v || '').toLowerCase();
    return allowed.includes(v) ? v : 'monthly';
}

/**
 * Render review summary and simple plan days preview
 */
function renderReviewSummary() {
    try {
        const name = (document.getElementById('planName').value || '').trim() || 'Untitled Plan';
        const type = document.getElementById('planType')?.value || 'workout';
        const price = parseFloat(document.getElementById('planPrice').value);
        const duration = parseInt(document.getElementById('planDuration').value, 10) || 30;
        const diffRaw = document.getElementById('difficultyLevel')?.value || '3';
        const renewal = document.getElementById('renewalPeriod')?.value || 'monthly';
        const mapDifficulty = (v) => ({'1':'beginner','2':'intermediate','3':'intermediate','4':'advanced','5':'expert'})[String(v)] || 'intermediate';

        const container = document.getElementById('planSummary');
        if (container) {
            container.innerHTML = `
                <h5 class="section-title">Plan Summary</h5>
                <div class="row g-3">
                    <div class="col-md-6"><strong>Name:</strong> ${name}</div>
                    <div class="col-md-3"><strong>Type:</strong> ${type}</div>
                    <div class="col-md-3"><strong>Duration:</strong> ${duration} days</div>
                    <div class="col-md-3"><strong>Difficulty:</strong> ${mapDifficulty(diffRaw)}</div>
                    <div class="col-md-3"><strong>Price:</strong> $${isNaN(price) ? '0' : price}</div>
                    <div class="col-md-3"><strong>Renewal:</strong> ${renewal}</div>
                </div>
            `;
        }

        const tbody = document.getElementById('planItemsTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            // Preview rows for the full duration
            const rows = [];
            for (let i = 1; i <= Math.max(1, duration); i++) {
                rows.push({
                    day: i,
                    type: (type === 'combined' ? 'Workout + Nutrition' : (type === 'workout' ? 'Workout' : 'Nutrition')),
                    workout: (type !== 'diet' ? 'Planned' : '-'),
                    nutrition: (type !== 'workout' ? 'Planned' : '-'),
                    notes: ''
                });
            }
            rows.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${r.day}</td><td>${r.type}</td><td>${r.workout}</td><td>${r.nutrition}</td><td>${r.notes}</td>`;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.warn('renderReviewSummary error', e);
    }
}

/**
 * Show toast notification
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {string} message - The message to display
 * @param {number} duration - How long the toast should display (ms)
 */
function showToast(type, message, duration = 5000) {
    try {
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
        
        if (window.bootstrap && window.bootstrap.Toast) {
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
        } else {
            // Fallback if Bootstrap JS isn't available
            console.warn('Bootstrap Toast not available; using alert fallback');
            alert(message);
            // Remove element
            toast.remove();
        }
    } catch (e) {
        console.error('showToast failed, falling back to alert', e);
        alert(message);
    }
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
        plan_type: document.getElementById('planType')?.value,
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
        const select = document.getElementById('planType');
        if (select) select.value = formData.plan_type;
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
            const planName = (document.getElementById('planName').value || '').trim();
            const planDescription = (document.getElementById('planDescription').value || '').trim();
            let planType = document.getElementById('planType')?.value || '';
            const planPrice = document.getElementById('planPrice').value;
            const planDuration = parseInt(document.getElementById('planDuration').value, 10);

            // Highlight missing fields
            const missing = [];
            const setInvalid = (id, invalid) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.toggle('is-invalid', !!invalid);
            };
            setInvalid('planName', !planName);
            setInvalid('planDescription', !planDescription);
            // planType: if missing, set sane default and don't block
            if (!planType) {
                const sel = document.getElementById('planType');
                if (sel) sel.value = 'workout';
                planType = 'workout';
            }
            setInvalid('planType', false);
            setInvalid('planPrice', !planPrice);
            setInvalid('planDuration', !(Number.isFinite(planDuration) && planDuration > 0));

            if (!planType) {
                const sel = document.getElementById('planType');
                if (sel) { sel.value = 'workout'; }
            }
            // Non-blocking: if fields are missing, set reasonable defaults and proceed
            if (!Number.isFinite(planDuration) || planDuration <= 0) {
                const durEl = document.getElementById('planDuration');
                if (durEl) durEl.value = 30;
            }
            if (!planPrice || isNaN(parseFloat(planPrice))) {
                const priceEl = document.getElementById('planPrice');
                if (priceEl) priceEl.value = '0';
            }
            if (!planName) {
                const nameEl = document.getElementById('planName');
                if (nameEl && !nameEl.value) nameEl.value = 'Untitled Plan';
            }
            if (!planDescription) {
                const descEl = document.getElementById('planDescription');
                if (descEl && !descEl.value) descEl.value = 'No description provided';
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
            // Render the review summary before navigating
            try { renderReviewSummary(); } catch (e) { console.warn('Render review summary failed', e); }
            
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
        publishPlanBtn.addEventListener('click', function(e) {
            console.log('Publish button clicked (direct handler)');
            try { publishPlan(); } catch (err) { console.error('publishPlan threw', err); showToast('error', err?.message || 'Publish failed'); }
        });
    }
}

/**
 * Publish the plan
 */
function publishPlan() {
    const planName = (document.getElementById('planName').value || '').trim();
    const planDescription = (document.getElementById('planDescription').value || '').trim();
    let planType = document.getElementById('planType')?.value || '';
    const planPrice = parseFloat(document.getElementById('planPrice').value);
    const planDuration = parseInt(document.getElementById('planDuration').value, 10);
    const isActive = document.getElementById('publishPlanCheck')?.checked || false;
    const difficultyLevelRaw = document.getElementById('difficultyLevel')?.value || '3';
    const renewalPeriod = document.getElementById('renewalPeriod')?.value || 'monthly';
    const maxClients = document.getElementById('maxClients')?.value || null;

    const mapDifficulty = (val) => {
        switch (String(val)) {
            case '1': return 'beginner';
            case '2': return 'intermediate';
            case '3': return 'intermediate';
            case '4': return 'advanced';
            case '5': return 'expert';
            default: return 'intermediate';
        }
    };

    // Compute dates required by backend
    const toISODate = (d) => d.toISOString().slice(0,10);
    const today = new Date();
    const startDate = toISODate(today);
    const endDate = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.max(0, (Number.isFinite(planDuration) ? planDuration : 30) - 1)));

    // Fallbacks
    if (!planType) planType = 'workout';
    const safeDuration = Number.isFinite(planDuration) && planDuration > 0 ? planDuration : 30;
    const safePrice = isNaN(planPrice) ? 0 : planPrice;

    // Prepare minimal required data matching ProductPlanSerializer
    const planData = {
        name: planName || 'Untitled Plan',
        description: planDescription || 'No description provided',
        plan_type: planType,
        price: safePrice,
        price_per_session: safePrice,
        session_count: 1,
        start_date: startDate,
        end_date: endDate,
        renewal_period: normalizeRenewal(renewalPeriod),
        // Optional/ignored by serializer but safe to send
        duration_days: safeDuration,
        difficulty_level: mapDifficulty(difficultyLevelRaw),
        max_clients: maxClients ? parseInt(maxClients, 10) : null,
        is_active: !!isActive
    };

    // Show loading indicator
    const publishBtn = document.getElementById('publishPlanBtn');
    const originalBtnText = publishBtn.innerHTML;
    publishBtn.disabled = true;
    publishBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Publishing...
    `;

    // Use APIBase directly to capture field-level errors
    APIBase.request('/plan-management/api/v1/product-plans/', {
        method: 'POST',
        body: JSON.stringify(planData)
    }).then((res) => {
        if (res && res.success) {
            showToast('success', 'Plan created successfully!');
            sessionStorage.removeItem('planCreationFormData');
            setTimeout(() => { window.location.href = '/plan-management/coach/plan-management/'; }, 1200);
            return;
        }
        // Show server-side validation errors inline (supports DRF validation_error shape)
        const e = res && (res.errorJSON || {});
        const idMap = {
            name: 'planName', description: 'planDescription', plan_type: 'planType', price: 'planPrice',
            price_per_session: 'planPrice', session_count: null, start_date: null, end_date: null,
            renewal_period: 'renewalPeriod', duration_days: 'planDuration', difficulty_level: 'difficultyLevel'
        };
        const highlight = (attr, detail) => {
            const elId = idMap[attr];
            if (elId) {
                const el = document.getElementById(elId);
                if (el) el.classList.add('is-invalid');
            }
            return `${attr}: ${detail}`;
        };
        let messages = [];
        if (e && e.type === 'validation_error' && Array.isArray(e.errors)) {
            messages = e.errors.map(er => highlight(er.attr || 'field', er.detail || 'Invalid'));
        } else if (e && typeof e === 'object' && !Array.isArray(e)) {
            Object.keys(e).forEach((field) => {
                const val = e[field];
                const msg = Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : JSON.stringify(val));
                messages.push(highlight(field, msg));
            });
        }
        const fallback = (typeof res.error === 'string') ? res.error : 'Failed to create plan';
        showToast('warning', messages.length ? messages.join(' | ') : fallback);
    }).catch((err) => {
        console.error('Publish error', err);
        showToast('error', err?.message || 'Failed to create plan');
    }).finally(() => {
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
    console.log('[PlanCreation] DOMContentLoaded - initializing');
    // Initialize event listeners
    initializePlanCreationListeners();
    
    // Try to restore any saved state (if returning from previous page)
    restorePlanStateFromSession();
    // Ensure a sane default for plan type
    const planTypeSelect = document.getElementById('planType');
    if (planTypeSelect && (!planTypeSelect.value || planTypeSelect.value === '')) {
        planTypeSelect.value = 'workout';
    }
    
    // Retrieve plan ID from sessionStorage if it exists
    currentPlanId = sessionStorage.getItem('currentPlanId');
    console.log('Initialized with plan ID from sessionStorage:', currentPlanId);
    
    // Delegated click handler as fallback (in case button is re-rendered or listeners lost)
    document.addEventListener('click', function(e) {
        const pubBtn = e.target.closest('#publishPlanBtn');
        if (pubBtn) {
            console.log('Publish button clicked (delegated handler)');
            e.preventDefault();
            try { publishPlan(); } catch (err) { console.error('publishPlan threw (delegated)', err); showToast('error', err?.message || 'Publish failed'); }
        }
    });

    // Initialize tooltips
    initTooltips();
});

// Expose for debugging
window.publishPlan = publishPlan;

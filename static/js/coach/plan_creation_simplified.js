/**
 * EazyFit Coach Plan Creation JavaScript
 * Simplified version without template selection steps
 */

// Global variables
let currentPlanId = null;
// Guard to prevent double submissions
let isPublishingPlan = false;

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
    const maxClients = document.getElementById('maxClients')?.value || 'unlimited';
    const workoutDays = parseInt(document.getElementById('workoutDaysPerWeek')?.value, 10);
    const mealsPerDay = parseInt(document.getElementById('mealsPerDay')?.value, 10);
    const snacksPerDay = parseInt(document.getElementById('snacksPerDay')?.value, 10);
        const mapDifficulty = (v) => ({'1':'beginner','2':'intermediate','3':'intermediate','4':'advanced','5':'expert'})[String(v)] || 'intermediate';

        console.log('[PlanCreation] Rendering review with data:', {
            name, type, price, duration, difficulty: mapDifficulty(diffRaw), renewal, maxClients,
            workoutDays, mealsPerDay, snacksPerDay
        });

        const container = document.getElementById('planSummary');
        if (container) {
            container.innerHTML = `
                <h5 class="section-title">Plan Summary</h5>
                <div class="row g-3">
                    <div class="col-md-6"><strong>Name:</strong> ${name}</div>
                    <div class="col-md-3"><strong>Type:</strong> ${type}</div>
                    <div class="col-md-3"><strong>Duration:</strong> ${duration} days</div>
                    <div class="col-md-3"><strong>Difficulty:</strong> ${mapDifficulty(diffRaw)}</div>
                    <div class="col-md-3"><strong>Price:</strong> $${isNaN(price) ? '0.00' : price.toFixed(2)}</div>
                    <div class="col-md-3"><strong>Max Clients:</strong> ${maxClients === '' ? 'unlimited' : maxClients}</div>
                    <div class="col-md-3"><strong>Renewal:</strong> ${renewal}</div>
                    <div class="col-md-3"><strong>Workout Days/Week:</strong> ${Number.isFinite(workoutDays) ? workoutDays : '-'}</div>
                    <div class="col-md-3"><strong>Meals/Day:</strong> ${Number.isFinite(mealsPerDay) ? mealsPerDay : '-'}</div>
                    <div class="col-md-3"><strong>Snacks/Day:</strong> ${Number.isFinite(snacksPerDay) ? snacksPerDay : '-'}</div>
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
            console.warn('Bootstrap Toast not available; toast UI disabled');
            // Remove element
            toast.remove();
        }
    } catch (e) {
        console.error('showToast failed', e);
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
 * Update step completion status in the navigation
 * @param {number} stepNumber - The step number (1 or 2 - Plan Structure removed)
 * @param {boolean} isCompleted - Whether the step should be marked as completed
 */
function updateStepStatus(stepNumber, isCompleted) {
    try {
        const stepButtons = [
            { number: 1, id: 'plan-basics-tab' },
            { number: 2, id: 'plan-structure-tab' },
            { number: 3, id: 'plan-review-tab' }
        ];
        
        const step = stepButtons.find(s => s.number === stepNumber);
        if (!step) return;
        
        const stepButton = document.getElementById(step.id);
        if (!stepButton) return;
        
        const statusIcon = stepButton.querySelector('.step-status i');
        if (!statusIcon) return;
        
        if (isCompleted) {
            // Mark as completed
            statusIcon.className = 'bi bi-check-circle-fill text-success';
        } else {
            // Mark as not completed
            statusIcon.className = 'bi bi-circle text-secondary';
        }
    } catch (e) {
        console.warn('updateStepStatus error', e);
    }
}

/**
 * Mark all steps up to the current step as completed
 * @param {number} currentStep - The current step number (1 or 2)
 */
function markStepsCompleted(currentStep) {
    for (let i = 1; i <= currentStep; i++) {
        updateStepStatus(i, true);
    }
    // Mark future steps as not completed
    for (let i = currentStep + 1; i <= 3; i++) {
        updateStepStatus(i, false);
    }
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
        difficulty_level: document.getElementById('difficultyLevel')?.value,
        max_clients: document.getElementById('maxClients')?.value,
        renewal_period: document.getElementById('renewalPeriod')?.value,
        workout_days_per_week: document.getElementById('workoutDaysPerWeek')?.value,
        meals_per_day: document.getElementById('mealsPerDay')?.value,
        snacks_per_day: document.getElementById('snacksPerDay')?.value
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
    if (formData.difficulty_level) {
        const select = document.getElementById('difficultyLevel');
        if (select) select.value = formData.difficulty_level;
    }
    if (formData.max_clients) document.getElementById('maxClients').value = formData.max_clients;
    if (formData.renewal_period) {
        const select = document.getElementById('renewalPeriod');
        if (select) select.value = formData.renewal_period;
    }
    if (formData.workout_days_per_week) {
        const element = document.getElementById('workoutDaysPerWeek');
        if (element) element.value = formData.workout_days_per_week;
    }
    if (formData.meals_per_day) {
        const element = document.getElementById('mealsPerDay');
        if (element) element.value = formData.meals_per_day;
    }
    if (formData.snacks_per_day) {
        const element = document.getElementById('snacksPerDay');
        if (element) element.value = formData.snacks_per_day;
    }
    
    // Update calculated fields
    if (document.getElementById('workoutDaysPerWeek')) {
        updateWorkoutDaysCalculation();
    }
}

/**
 * Initialize all event listeners for plan creation
 */
function initializePlanCreationListeners() {
    // Plan Basics Tab Navigation - now goes directly to Review
    const nextToStructureBtn = document.getElementById('nextToReview');
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
            // planType must be selected by the user
            setInvalid('planType', !planType);
            setInvalid('planPrice', !planPrice);
            setInvalid('planDuration', !(Number.isFinite(planDuration) && planDuration > 0));

            // Block navigation if required fields are missing
            if (!planName || !planDescription || !planType || !(Number.isFinite(planDuration) && planDuration > 0) || !planPrice || isNaN(parseFloat(planPrice))) {
                showToast('warning', 'Please fill all required fields before continuing.');
                return;
            }

            // Save form data to session storage
            savePlanStateToSession();
            
            // Render the review summary before navigating
            try { renderReviewSummary(); } catch (e) { console.warn('Render review summary failed', e); }

            // Mark step 1 as completed when moving to step 2
            markStepsCompleted(1);

            // Navigate to structure tab
            document.getElementById('plan-structure-tab').click();
        });
    }

    // Structure nav buttons
    const backToBasicsFromStructureBtn = document.getElementById('backToBasicsFromStructure');
    if (backToBasicsFromStructureBtn) {
        backToBasicsFromStructureBtn.addEventListener('click', function() {
            savePlanStateToSession();
            markStepsCompleted(0);
            document.getElementById('plan-basics-tab').click();
        });
    }
    const nextToReviewFromStructureBtn = document.getElementById('nextToReviewFromStructure');
    if (nextToReviewFromStructureBtn) {
        nextToReviewFromStructureBtn.addEventListener('click', function() {
            savePlanStateToSession();
            markStepsCompleted(2);
            try { renderReviewSummary(); } catch (e) { console.warn('Render review summary failed', e); }
            document.getElementById('plan-review-tab').click();
        });
    }

    // Back button from Review to Structure
    const backToStructureFromReviewBtn = document.getElementById('backToStructureFromReview');
    if (backToStructureFromReviewBtn) {
        backToStructureFromReviewBtn.addEventListener('click', function() {
            savePlanStateToSession();
            markStepsCompleted(1);
            document.getElementById('plan-structure-tab').click();
        });
    }
    
    // Workout days calculation (if elements exist)
    const workoutDaysInput = document.getElementById('workoutDaysPerWeek');
    if (workoutDaysInput) {
        workoutDaysInput.addEventListener('change', updateWorkoutDaysCalculation);
        workoutDaysInput.addEventListener('input', updateWorkoutDaysCalculation);
    }
    
    // Add Bootstrap tab event listeners to handle direct tab clicks
    const planBasicsTab = document.getElementById('plan-basics-tab');
    const planStructureTab = document.getElementById('plan-structure-tab');
    const planReviewTab = document.getElementById('plan-review-tab');
    
    if (planBasicsTab) {
        planBasicsTab.addEventListener('shown.bs.tab', function() {
            // When showing basics tab, no steps are completed yet
            markStepsCompleted(0);
        });
    }
    
    if (planStructureTab) {
        planStructureTab.addEventListener('shown.bs.tab', function() {
            // When showing structure tab, mark step 1 as completed
            markStepsCompleted(1);
        });
    }
    
    if (planReviewTab) {
        planReviewTab.addEventListener('shown.bs.tab', function() {
            // When showing review tab, mark steps 1 and 2 as completed
            markStepsCompleted(2);
            // Also render the review summary
            try { renderReviewSummary(); } catch (e) { console.warn('Render review summary failed', e); }
        });
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
    // Reentrancy guard: if a publish is already in progress, ignore new clicks
    if (isPublishingPlan) return;
    isPublishingPlan = true;

    const planName = (document.getElementById('planName').value || '').trim();
    const planDescription = (document.getElementById('planDescription').value || '').trim();
    let planType = document.getElementById('planType')?.value || '';
    const planPrice = parseFloat(document.getElementById('planPrice').value);
    const planDuration = parseInt(document.getElementById('planDuration').value, 10);
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

    // Compute dates only for create; in edit, we won't modify dates unless explicitly intended
    const toISODate = (d) => d.toISOString().slice(0,10);
    const today = new Date();
    const startDate = toISODate(today);
    const endDate = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.max(0, (Number.isFinite(planDuration) ? planDuration : 30) - 1)));

    // Validate mandatory fields (no static defaults)
    if (!planName || !planDescription || !planType || !(Number.isFinite(planDuration) && planDuration > 0) || isNaN(planPrice)) {
        showToast('warning', 'Please complete all required fields before publishing.');
        isPublishingPlan = false;
        return;
    }
    const safeDuration = planDuration;
    const safePrice = planPrice;

    // Get structure settings (with safety checks)
    const workoutDaysPerWeek = parseInt(document.getElementById('workoutDaysPerWeek')?.value, 10) || 5;
    const mealsPerDay = parseInt(document.getElementById('mealsPerDay')?.value, 10) || 3;
    const snacksPerDay = parseInt(document.getElementById('snacksPerDay')?.value, 10) || 2;

    // Prepare minimal required data matching ProductPlanSerializer
    const planData = {
    name: planName,
    description: planDescription,
        plan_type: planType,
        price: safePrice,
        price_per_session: safePrice,
        session_count: 1,
        // For creation we send start/end; for edit we'll omit unless changing duration
        renewal_period: normalizeRenewal(renewalPeriod),
        // Structure settings
        workout_days_per_week: workoutDaysPerWeek,
        rest_days_per_week: Math.max(0, 7 - workoutDaysPerWeek),
        meals_per_day: mealsPerDay,
        snacks_per_day: snacksPerDay,
        // Optional/ignored by serializer but safe to send
        duration_days: safeDuration,
        difficulty_level: mapDifficulty(difficultyLevelRaw),
        max_clients: maxClients ? parseInt(maxClients, 10) : null,
        is_active: true  // Default to active when publishing
    };

    // Only include dates on create; avoid changing saved dates during edit unless explicitly needed
    const isEdit = !!currentPlanId;
    if (!isEdit) {
        planData.start_date = startDate;
        planData.end_date = endDate;
    }

    // Show loading indicator
    const publishBtn = document.getElementById('publishPlanBtn');
    const originalBtnText = publishBtn.innerHTML;
    publishBtn.disabled = true;
    publishBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Publishing...
    `;

    // Create vs Update based on currentPlanId
    const url = isEdit
        ? `/plan-management/api/v1/product-plans/${currentPlanId}/`
        : '/plan-management/api/v1/product-plans/';
    const method = isEdit ? 'PATCH' : 'POST';

    APIBase.request(url, { method, body: JSON.stringify(planData) }).then((res) => {
        if (res && res.success) {
            showToast('success', isEdit ? 'Plan updated successfully!' : 'Plan created successfully!');
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
        const fallback = (typeof res.error === 'string') ? res.error : (isEdit ? 'Failed to update plan' : 'Failed to create plan');
        showToast('warning', messages.length ? messages.join(' | ') : fallback);
    }).catch((err) => {
        console.error('Publish error', err);
        showToast('error', err?.message || (isEdit ? 'Failed to update plan' : 'Failed to create plan'));
    }).finally(() => {
        publishBtn.disabled = false;
        publishBtn.innerHTML = originalBtnText;
        isPublishingPlan = false;
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
    console.log('[PlanCreation] URL:', window.location.href);
    console.log('[PlanCreation] Search params:', window.location.search);
    
    // Initialize event listeners
    initializePlanCreationListeners();
    
    // Try to restore any saved state (only for create mode, not edit mode)
    // Edit mode will load data from API instead
    if (!window.location.search.includes('plan_id')) {
        restorePlanStateFromSession();
    }
    
    // Do not auto-fill mandatory fields; user must choose/provide them
    
    // Detect edit mode from query params: ?plan_id=123
    try {
        const params = new URLSearchParams(window.location.search);
        const pid = params.get('plan_id');
        if (pid) {
            // Edit mode: plan_id is in URL
            currentPlanId = pid;
            sessionStorage.setItem('currentPlanId', currentPlanId);
            console.log('[PlanCreation] Edit mode detected - plan_id from URL:', currentPlanId);
        } else {
            // Create mode: no plan_id in URL, clear any stored plan_id
            currentPlanId = null;
            sessionStorage.removeItem('currentPlanId');
            console.log('[PlanCreation] Create mode detected - no plan_id in URL');
        }
    } catch (e) {
        console.warn('Failed to parse plan_id from URL', e);
        // Fallback to create mode
        currentPlanId = null;
        sessionStorage.removeItem('currentPlanId');
    }

    // If in edit mode, preload the plan and lock immutable fields
    if (currentPlanId) {
        // Fetch plan details
        CoachPlanAPI.productPlans.getById(currentPlanId).then((plan) => {
            if (!plan) return;
            // Prefill fields from plan
            const mapDiff = { beginner:'1', easy:'2', intermediate:'3', challenging:'4', advanced:'4', expert:'5', hard:'4' };
            const safe = (v, d) => (v === null || v === undefined || v === '' ? d : v);
            document.getElementById('planName').value = safe(plan.name, '');
            document.getElementById('planDescription').value = safe(plan.description, '');
            // Lock plan type in edit
            const typeSel = document.getElementById('planType');
            if (typeSel) {
                typeSel.value = plan.plan_type || typeSel.value;
                typeSel.disabled = true;
            }
            // Use duration directly from database only
            if (plan.duration_days != null) {
                document.getElementById('planDuration').value = plan.duration_days;
            }
            document.getElementById('planPrice').value = safe(plan.price, 0);
            document.getElementById('difficultyLevel').value = mapDiff[String(plan.difficulty_level || '').toLowerCase()] || '3';
            // Handle max_clients properly - if null, show empty for unlimited
            document.getElementById('maxClients').value = plan.max_clients ? plan.max_clients : '';
            document.getElementById('renewalPeriod').value = safe(plan.renewal_period, 'monthly');
            // Note: is_active field removed from UI - plans are active by default when published
            
            // Log loaded data for debugging
            console.log('[PlanCreation] Loaded plan data:', {
                name: plan.name,
                price: plan.price,
                duration_days: plan.duration_days,
                max_clients: plan.max_clients,
                difficulty_level: plan.difficulty_level
            });
            
            // Populate structure fields
            if (document.getElementById('workoutDaysPerWeek') && plan.workout_days_per_week != null) {
                document.getElementById('workoutDaysPerWeek').value = plan.workout_days_per_week;
            }
            if (document.getElementById('restDaysPerWeek') && plan.rest_days_per_week != null) {
                document.getElementById('restDaysPerWeek').value = plan.rest_days_per_week;
            } else if (document.getElementById('restDaysPerWeek')) {
                const w = parseInt(document.getElementById('workoutDaysPerWeek').value, 10) || 5;
                document.getElementById('restDaysPerWeek').value = Math.max(0, 7 - w);
            }
            if (document.getElementById('mealsPerDay') && plan.meals_per_day != null) {
                document.getElementById('mealsPerDay').value = plan.meals_per_day;
            }
            if (document.getElementById('snacksPerDay') && plan.snacks_per_day != null) {
                document.getElementById('snacksPerDay').value = plan.snacks_per_day;
            }
            // Update headings/buttons in edit mode
            const heroTitle = document.querySelector('.hero-gradient h1');
            if (heroTitle) heroTitle.textContent = 'Edit Plan';
            const heroDesc = document.querySelector('.hero-gradient p');
            if (heroDesc) heroDesc.textContent = 'Update details for your existing plan';
            const publishBtn = document.getElementById('publishPlanBtn');
            if (publishBtn) publishBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
            showToast('info', 'Editing existing plan. Some fields are locked.');
            
            // For edit mode, mark steps as completed since data is already loaded
            setTimeout(() => {
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab) {
                    const tabId = activeTab.id;
                    if (tabId === 'plan-basics-tab') {
                        markStepsCompleted(0); // Current step - no steps completed yet
                    } else if (tabId === 'plan-review-tab') {
                        markStepsCompleted(1); // Step 1 completed (on review step)
                    }
                }
            }, 200);
        }).catch((err) => {
            console.error('Failed to load plan for editing', err);
            showToast('warning', 'Could not load plan details for editing');
        });
    } else {
        // Create mode: ensure UI shows correct create mode elements
        console.log('[PlanCreation] Setting up create mode UI');
        const heroTitle = document.querySelector('.hero-gradient h1');
        if (heroTitle) heroTitle.textContent = 'Create a New Plan';
        const heroDesc = document.querySelector('.hero-gradient p');
        if (heroDesc) heroDesc.textContent = 'Design comprehensive fitness and nutrition plans for your clients';
        const publishBtn = document.getElementById('publishPlanBtn');
        if (publishBtn) publishBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Publish Plan';
        
        // Clear any existing form data that might be from a previous session
        document.getElementById('planName').value = '';
        document.getElementById('planDescription').value = '';
        // Ensure plan type is enabled in create mode
        const planTypeSelect = document.getElementById('planType');
        if (planTypeSelect) planTypeSelect.disabled = false;
        // Clear the saved form data from session storage for create mode
        sessionStorage.removeItem('planCreationFormData');
        // Keep default values for other fields as they are properly set
    }
    
    // Initialize step completion status based on active tab
    setTimeout(() => {
        const activeTab = document.querySelector('.nav-link.active');
        if (activeTab) {
            const tabId = activeTab.id;
            if (tabId === 'plan-basics-tab') {
                markStepsCompleted(0); // No steps completed yet
            } else if (tabId === 'plan-review-tab') {
                markStepsCompleted(1); // Step 1 completed (basics done, now on review)
                try { renderReviewSummary(); } catch (e) { console.warn('Initial review summary failed', e); }
            }
        }
    }, 100); // Small delay to ensure DOM is fully loaded
    
    // Note: Removed delegated click handler to prevent double submissions

    // Initialize tooltips
    initTooltips();
});

// Expose for debugging
window.publishPlan = publishPlan;
window.showToast = showToast;

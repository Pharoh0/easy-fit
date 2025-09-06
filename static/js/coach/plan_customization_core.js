/**
 * EazyFit Plan Customization Core JavaScript
 * Handles core functionality for plan customization interface
 */

// Global variables
let currentPlanId = null;
let currentClientId = null;
let currentDayId = null;
let currentDay = null;
let planDays = [];
let workoutTemplates = [];
let mealTemplates = [];
let currentWorkoutTemplate = null;
let currentMealTemplate = null;

// CoachPlanAPI is imported from static/js/api/coach_plan_api.js

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
 * Capitalize first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a date string
 * @param {string} dateStr - The date string to format
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
}

/**
 * Initialize the plan customization page
 */
function initializePlanCustomization() {
    // Get plan ID and client ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentPlanId = urlParams.get('plan_id');
    currentClientId = urlParams.get('client_id');
    
    if (!currentPlanId) {
        showToast('error', 'No plan ID provided');
        return;
    }
    
    // Load plan data
    loadPlanData()
        .then(() => {
            // Load templates
            loadTemplates();
            
            // Initialize event listeners
            initializeEventListeners();
        })
        .catch(error => {
            console.error('Error loading plan data:', error);
            showToast('error', 'Failed to load plan data');
        });
}

/**
 * Load plan data from the API
 */
function loadPlanData() {
    return new Promise((resolve, reject) => {
        // Show loading state
        document.getElementById('planDayLoading').style.display = 'block';
        document.getElementById('planDayContentArea').style.display = 'none';
        
        // Load plan days
        CoachPlanAPI.planDays.getByPlanId(currentPlanId)
            .then(data => {
                planDays = data;
                
                // Sort days by day number
                planDays.sort((a, b) => a.day_number - b.day_number);
                
                // Render plan navigation
                renderPlanNavigation();
                
                // Load first day if available
                if (planDays.length > 0) {
                    currentDayId = planDays[0].id;
                    loadPlanDay(currentDayId);
                } else {
                    // No days available
                    showToast('warning', 'No plan days available');
                    document.getElementById('planDayLoading').style.display = 'none';
                }
                
                resolve();
            })
            .catch(error => {
                console.error('Error loading plan days:', error);
                showToast('error', 'Failed to load plan days');
                reject(error);
            });
    });
}

/**
 * Load a specific plan day
 * @param {number} dayId - The ID of the day to load
 */
function loadPlanDay(dayId) {
    // Show loading state
    document.getElementById('planDayLoading').style.display = 'block';
    document.getElementById('planDayContentArea').style.display = 'none';
    
    // Find day in loaded days
    currentDay = planDays.find(day => day.id === dayId);
    
    if (!currentDay) {
        showToast('error', 'Day not found');
        return;
    }
    
    // Set current day ID
    currentDayId = dayId;
    
    // Update UI with day data
    document.getElementById('planDayTitle').textContent = `Day ${currentDay.day_number}: ${currentDay.title || 'Plan Day'}`;
    
    // Populate form fields
    document.getElementById('dayTitle').value = currentDay.title || '';
    document.getElementById('dayTheme').value = currentDay.theme || '';
    document.getElementById('difficultyLevel').value = currentDay.difficulty_level || '3';
    document.getElementById('dayNotes').value = currentDay.notes || '';
    document.getElementById('coachInstructions').value = currentDay.coach_instructions || '';
    
    // Set day type radio button
    if (currentDay.day_type === 'workout') {
        document.getElementById('typeWorkout').checked = true;
    } else if (currentDay.day_type === 'rest') {
        document.getElementById('typeRest').checked = true;
    } else {
        document.getElementById('typeBoth').checked = true;
    }
    
    // Load workout data if available
    if (currentDay.workout_template) {
        loadWorkoutTemplate(currentDay.workout_template);
    } else {
        // Show empty state
        document.getElementById('workoutEmptyState').style.display = 'block';
        document.getElementById('workoutContent').style.display = 'none';
    }
    
    // Load meal data if available
    if (currentDay.meal_template) {
        loadMealTemplate(currentDay.meal_template);
    } else {
        // Show empty state
        document.getElementById('mealEmptyState').style.display = 'block';
        document.getElementById('mealContent').style.display = 'none';
    }
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Hide loading state
    document.getElementById('planDayLoading').style.display = 'none';
    document.getElementById('planDayContentArea').style.display = 'block';
}

/**
 * Render the plan navigation sidebar
 */
function renderPlanNavigation() {
    const container = document.getElementById('planNavigation');
    if (!container) return;
    
    let html = '';
    
    // Group days by week
    const weeks = {};
    
    planDays.forEach(day => {
        const weekNum = Math.ceil(day.day_number / 7);
        if (!weeks[weekNum]) {
            weeks[weekNum] = [];
        }
        weeks[weekNum].push(day);
    });
    
    // Create week navigation
    Object.keys(weeks).forEach(weekNum => {
        const weekDays = weeks[weekNum];
        
        html += `
            <div class="plan-nav-week">
                <div class="plan-nav-week-header p-3" data-bs-toggle="collapse" data-bs-target="#week${weekNum}">
                    <h6 class="mb-0 d-flex align-items-center">
                        <i class="bi bi-calendar-week me-2"></i>
                        Week ${weekNum}
                        <i class="bi bi-chevron-down ms-auto"></i>
                    </h6>
                </div>
                <div class="collapse ${weekNum === '1' ? 'show' : ''}" id="week${weekNum}">
                    <div class="list-group list-group-flush">
        `;
        
        // Add days for this week
        weekDays.forEach(day => {
            const dayType = day.day_type || 'both';
            let typeIcon = 'bi-calendar-check';
            let typeBadge = 'bg-primary';
            let typeText = 'Workout & Meal';
            
            if (dayType === 'workout') {
                typeIcon = 'bi-lightning-charge';
                typeText = 'Workout';
            } else if (dayType === 'rest') {
                typeIcon = 'bi-cloud-sun';
                typeBadge = 'bg-secondary';
                typeText = 'Rest';
            }
            
            html += `
                <button class="list-group-item list-group-item-action d-flex align-items-center plan-day-item" 
                    data-day-id="${day.id}">
                    <div class="me-2 day-number">${day.day_number}</div>
                    <div class="day-info">
                        <div class="day-title">${day.title || `Day ${day.day_number}`}</div>
                        <div class="day-type">
                            <i class="bi ${typeIcon} me-1"></i>
                            <span class="badge ${typeBadge} badge-sm">${typeText}</span>
                        </div>
                    </div>
                </button>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    // Update container
    container.innerHTML = html;
    
    // Add click events to day items
    document.querySelectorAll('.plan-day-item').forEach(item => {
        item.addEventListener('click', function() {
            const dayId = parseInt(this.dataset.dayId);
            
            // Save current day data before loading new day
            savePlanDay().then(() => {
                loadPlanDay(dayId);
                
                // Update active state
                document.querySelectorAll('.plan-day-item').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    });
    
    // Set active state for current day
    if (currentDayId) {
        const activeDay = document.querySelector(`.plan-day-item[data-day-id="${currentDayId}"]`);
        if (activeDay) {
            activeDay.classList.add('active');
        }
    }
}

/**
 * Update navigation buttons based on current day position
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById('previousDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');
    
    if (!currentDay) return;
    
    // Find current day index
    const currentIndex = planDays.findIndex(day => day.id === currentDayId);
    
    // Update previous button
    if (currentIndex <= 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.disabled = false;
    }
    
    // Update next button
    if (currentIndex >= planDays.length - 1) {
        nextBtn.disabled = true;
    } else {
        nextBtn.disabled = false;
    }
}

/**
 * Save the current plan day data
 */
function savePlanDay() {
    if (!currentDayId) {
        return Promise.resolve();
    }
    
    // Show saving indicator
    const saveBtn = document.getElementById('saveDayBtn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `;
    
    // Gather form data
    const dayData = {
        title: document.getElementById('dayTitle').value,
        theme: document.getElementById('dayTheme').value,
        difficulty_level: parseInt(document.getElementById('difficultyLevel').value) || 3,
        day_type: document.querySelector('input[name="dayType"]:checked').value,
        notes: document.getElementById('dayNotes').value,
        coach_instructions: document.getElementById('coachInstructions').value,
        workout_template: currentWorkoutTemplate ? currentWorkoutTemplate.id : null,
        meal_template: currentMealTemplate ? currentMealTemplate.id : null
    };
    
    // Update API
    return CoachPlanAPI.planDays.update(currentDayId, dayData)
        .then(updatedDay => {
            // Update local data
            const index = planDays.findIndex(day => day.id === currentDayId);
            if (index !== -1) {
                planDays[index] = { ...planDays[index], ...updatedDay };
            }
            
            // Show success message
            showToast('success', 'Day saved successfully');
            
            // Update navigation to reflect any changes
            renderPlanNavigation();
            
            return updatedDay;
        })
        .catch(error => {
            console.error('Error saving day:', error);
            showToast('error', `Failed to save day: ${error.message || 'Unknown error'}`);
            throw error;
        })
        .finally(() => {
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        });
}

/**
 * Reset the current day form to its original state
 */
function resetDayForm() {
    // Reload current day
    loadPlanDay(currentDayId);
    showToast('info', 'Form reset to last saved state');
}

/**
 * Initialize event listeners for the page
 */
function initializeEventListeners() {
    // Save button
    const saveBtn = document.getElementById('saveDayBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            savePlanDay();
        });
    }
    
    // Reset button
    const resetBtn = document.getElementById('resetDayBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            resetDayForm();
        });
    }
    
    // Navigation buttons
    const prevBtn = document.getElementById('previousDayBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            const currentIndex = planDays.findIndex(day => day.id === currentDayId);
            if (currentIndex > 0) {
                const prevDay = planDays[currentIndex - 1];
                
                // Save current day first
                savePlanDay().then(() => {
                    loadPlanDay(prevDay.id);
                    
                    // Update active state in navigation
                    document.querySelectorAll('.plan-day-item').forEach(el => {
                        el.classList.remove('active');
                    });
                    const activeDay = document.querySelector(`.plan-day-item[data-day-id="${prevDay.id}"]`);
                    if (activeDay) {
                        activeDay.classList.add('active');
                    }
                });
            }
        });
    }
    
    const nextBtn = document.getElementById('nextDayBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const currentIndex = planDays.findIndex(day => day.id === currentDayId);
            if (currentIndex < planDays.length - 1) {
                const nextDay = planDays[currentIndex + 1];
                
                // Save current day first
                savePlanDay().then(() => {
                    loadPlanDay(nextDay.id);
                    
                    // Update active state in navigation
                    document.querySelectorAll('.plan-day-item').forEach(el => {
                        el.classList.remove('active');
                    });
                    const activeDay = document.querySelector(`.plan-day-item[data-day-id="${nextDay.id}"]`);
                    if (activeDay) {
                        activeDay.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Remove workout button
    const removeWorkoutBtn = document.getElementById('removeWorkoutBtn');
    if (removeWorkoutBtn) {
        removeWorkoutBtn.addEventListener('click', function() {
            // Remove workout template
            currentWorkoutTemplate = null;
            
            // Update UI
            document.getElementById('workoutEmptyState').style.display = 'block';
            document.getElementById('workoutContent').style.display = 'none';
            
            // Save changes
            savePlanDay();
        });
    }
    
    // Remove nutrition button
    const removeNutritionBtn = document.getElementById('removeNutritionBtn');
    if (removeNutritionBtn) {
        removeNutritionBtn.addEventListener('click', function() {
            // Remove meal template
            currentMealTemplate = null;
            
            // Update UI
            document.getElementById('mealEmptyState').style.display = 'block';
            document.getElementById('mealContent').style.display = 'none';
            
            // Save changes
            savePlanDay();
        });
    }
    
    // Refresh templates button
    const refreshTemplatesBtn = document.getElementById('refreshTemplatesBtn');
    if (refreshTemplatesBtn) {
        refreshTemplatesBtn.addEventListener('click', function() {
            loadTemplates();
            showToast('info', 'Refreshing templates...');
        });
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializePlanCustomization();
});

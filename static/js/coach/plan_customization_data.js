/**
 * Plan Customization Data Module
 * Handles data loading and management for plan customization
 */

const PlanCustomizationData = (() => {
    // State variables
    let currentPlanId = null;
    let currentClientId = null;
    let currentSubscriptionId = null;
    let currentDayId = null;
    let planDays = [];
    let planData = null;
    let clientData = null;
    
    /**
     * Initialize data from URL parameters
     */
    function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        currentSubscriptionId = urlParams.get('subscription_id');
        currentPlanId = urlParams.get('plan_id');
        currentClientId = urlParams.get('client_id');
        
        console.log(`Initializing with: plan=${currentPlanId}, client=${currentClientId}, subscription=${currentSubscriptionId}`);
        
        if (!currentPlanId && !currentSubscriptionId) {
            showError('Missing plan or subscription information');
            return false;
        }
        
        return true;
    }
    
    /**
     * Load plan data from API
     */
    async function loadPlanData() {
        // Show page-level loading
        showLoading(true, 'planDayLoading');
        
        try {
            // If we have subscription ID but not plan ID, we need to fetch plan details
            if (currentSubscriptionId && !currentPlanId) {
                await fetchSubscriptionDetails();
            }
            
            // Now we should have plan ID to fetch plan data
            if (currentPlanId) {
                await Promise.all([
                    fetchPlanDetails(),
                    fetchPlanDays()
                ]);
                
                showLoading(false, 'planDayLoading');
                // Reveal content area
                const contentArea = document.getElementById('planDayContentArea');
                if (contentArea) contentArea.style.display = '';
                renderPlanDays();
                selectFirstDay();
                return true;
            } else {
                showError('Could not determine plan details');
                showLoading(false, 'planDayLoading');
                return false;
            }
        } catch (error) {
            console.error('Error loading plan data:', error);
            showError('Failed to load plan data: ' + error.message);
            showLoading(false, 'planDayLoading');
            return false;
        }
    }
    
    /**
     * Fetch subscription details from API
     */
    async function fetchSubscriptionDetails() {
        try {
            const response = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${currentSubscriptionId}/subscription_details/`, {
                method: 'GET'
            });
            
            if (response.success && response.data) {
                console.log('Subscription details:', response.data);
                
                // Try to get plan ID from different possible response structures
                if (response.data.plan_id) {
                    currentPlanId = response.data.plan_id;
                } else if (response.data.subscription && response.data.subscription.product_plan) {
                    currentPlanId = response.data.subscription.product_plan.id;
                }
                
                // Try to get client ID from different possible response structures
                if (response.data.client_id) {
                    currentClientId = response.data.client_id;
                } else if (response.data.subscription && response.data.subscription.client_id) {
                    currentClientId = response.data.subscription.client_id;
                }
                
                clientData = response.data.client || {};
                
                console.log(`Extracted plan_id=${currentPlanId}, client_id=${currentClientId}`);
                return response.data;
            } else {
                throw new Error('Failed to load subscription details');
            }
        } catch (error) {
            console.error('Error fetching subscription details:', error);
            throw error;
        }
    }
    
    /**
     * Fetch plan details from API
     */
    async function fetchPlanDetails() {
        try {
            const plan = await CoachPlanAPI.productPlans.getById(currentPlanId);
            planData = plan;
            console.log('Plan details:', plan);
            
            // Update page title
            const pageTitleElement = document.querySelector('.modern-card.hero-gradient h2');
            if (pageTitleElement && plan.name) {
                pageTitleElement.textContent = plan.name;
            }
            
            return plan;
        } catch (error) {
            console.error('Error fetching plan details:', error);
            throw error;
        }
    }
    
    /**
     * Fetch plan days from API
     */
    async function fetchPlanDays() {
        try {
            // Prefer subscription_id to avoid needing both plan_id and client_id
            const url = currentSubscriptionId
                ? `/plan-management/api/v1/coach-plan-customization/plan_days/?subscription_id=${currentSubscriptionId}`
                : `/plan-management/api/v1/coach-plan-customization/plan_days/?plan_id=${currentPlanId}&client_id=${currentClientId || ''}`;

            const response = await APIBase.request(url, {
                method: 'GET'
            });
            
            if (response.success && response.data) {
                planDays = response.data;
                console.log('Plan days:', planDays);
                return planDays;
            } else {
                throw new Error('Failed to load plan days');
            }
        } catch (error) {
            console.error('Error fetching plan days:', error);
            throw error;
        }
    }
    
    /**
     * Fetch single day details from API
     */
    async function fetchDayDetails(dayId) {
        try {
            // Prefer subscription_id to avoid needing both plan_id and client_id
            const url = currentSubscriptionId
                ? `/plan-management/api/v1/coach-plan-customization/plan_days/${dayId}/?subscription_id=${currentSubscriptionId}`
                : `/plan-management/api/v1/coach-plan-customization/plan_days/${dayId}/?client_id=${currentClientId || ''}`;

            const response = await APIBase.request(url, {
                method: 'GET'
            });
            
            if (response.success && response.data) {
                // Update the day data in our local array
                const dayIndex = planDays.findIndex(d => d.id === dayId);
                if (dayIndex >= 0) {
                    planDays[dayIndex] = response.data;
                }
                
                console.log('Day details:', response.data);
                return response.data;
            } else {
                throw new Error('Failed to load day details');
            }
        } catch (error) {
            console.error(`Error fetching day ${dayId} details:`, error);
            throw error;
        }
    }
    
    /**
     * Render plan days in sidebar navigation
     */
    function renderPlanDays() {
        const daysContainer = document.getElementById('planNavigation');
        if (!daysContainer || !planDays.length) return;
        
        // Clear container
        daysContainer.innerHTML = '';
        
        // Group days by week
        const daysByWeek = {};
        planDays.forEach(day => {
            const weekNumber = Math.ceil(day.day_number / 7);
            if (!daysByWeek[weekNumber]) {
                daysByWeek[weekNumber] = [];
            }
            daysByWeek[weekNumber].push(day);
        });
        
        // Create weeks and days
        Object.keys(daysByWeek).forEach(weekNumber => {
            // Create week header
            const weekHeader = document.createElement('div');
            weekHeader.className = 'list-group-item plan-nav-week-header py-2 px-3';
            weekHeader.innerHTML = `<h6 class="mb-0">Week ${weekNumber}</h6>`;
            daysContainer.appendChild(weekHeader);
            
            // Create days for this week
            const weekDays = daysByWeek[weekNumber];
            weekDays.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'list-group-item plan-day-item d-flex align-items-center';
                dayElement.dataset.dayId = day.id;
                dayElement.dataset.dayNumber = day.day_number;
                
                // Determine day type label and icon
                let dayTypeLabel = 'Regular Day';
                let dayTypeIcon = '';
                
                if (day.is_rest_day) {
                    dayTypeLabel = 'Rest Day';
                    dayTypeIcon = '<i class="fas fa-bed text-muted ms-1"></i>';
                } else if (day.workouts && day.workouts.length > 0) {
                    dayTypeLabel = 'Workout Day';
                    dayTypeIcon = '<i class="fas fa-dumbbell text-primary ms-1"></i>';
                }
                
                if (day.meals && day.meals.length > 0) {
                    if (dayTypeLabel === 'Regular Day') {
                        dayTypeLabel = 'Meal Plan Day';
                    } else {
                        dayTypeLabel += ' + Meals';
                    }
                    dayTypeIcon += '<i class="fas fa-utensils text-success ms-1"></i>';
                }
                
                dayElement.innerHTML = `
                    <div class="day-number me-3">${day.day_number}</div>
                    <div class="flex-grow-1">
                        <div class="day-title">Day ${day.day_number}</div>
                        <div class="day-type small text-muted">${dayTypeLabel} ${dayTypeIcon}</div>
                    </div>
                `;
                
                // Add click handler
                dayElement.addEventListener('click', function() {
                    selectDay(day.id);
                });
                
                daysContainer.appendChild(dayElement);
            });
        });
    }
    
    /**
     * Select a day by ID
     */
    async function selectDay(dayId) {
        if (currentDayId === dayId) return; // Already selected
        
        currentDayId = dayId;
        
        // Update active class
        document.querySelectorAll('.plan-day-item').forEach(el => {
            el.classList.remove('active');
        });
        
        const dayElement = document.querySelector(`.plan-day-item[data-day-id="${dayId}"]`);
        if (dayElement) {
            dayElement.classList.add('active');
            
            // Update day title
            const dayNumber = dayElement.dataset.dayNumber;
            const dayTitleElement = document.getElementById('planDayTitle');
            if (dayTitleElement) {
                dayTitleElement.textContent = `Day ${dayNumber}: Plan Overview`;
            }
        }
        
        // Load day details and render
        try {
            showLoading(true, 'planDayLoading');
            const dayData = await fetchDayDetails(dayId);
            renderDayContent(dayData);
            showLoading(false, 'planDayLoading');
            const contentArea = document.getElementById('planDayContentArea');
            if (contentArea) contentArea.style.display = '';
        } catch (error) {
            console.error('Error loading day details:', error);
            showError('Failed to load day details');
            showLoading(false, 'planDayLoading');
        }
    }
    
    /**
     * Select first day in the plan
     */
    function selectFirstDay() {
        if (!planDays.length) return;
        selectDay(planDays[0].id);
    }
    
    /**
     * Render day content in main area
     */
    function renderDayContent(dayData) {
        if (!dayData) return;
        // Render sections into existing containers in the template
        renderWorkoutsSection(dayData);
        renderMealsSection(dayData);
        renderCoachNotes(dayData);
    }
    
    /**
     * Render workouts section
     */
    function renderWorkoutsSection(dayData) {
        const emptyState = document.getElementById('workoutEmptyState');
        const content = document.getElementById('workoutContent');
        const nameEl = document.getElementById('workoutName');
        const typeEl = document.getElementById('workoutType');
        const durationEl = document.getElementById('workoutDuration');
        const intensityEl = document.getElementById('workoutIntensity');
        const blocksContainer = document.getElementById('exerciseBlocksContainer');
        if (!emptyState || !content) return;

        if (!dayData.workouts || dayData.workouts.length === 0) {
            emptyState.style.display = '';
            content.style.display = 'none';
            if (blocksContainer) blocksContainer.innerHTML = '';
            return;
        }

        const workout = dayData.workouts[0];
        emptyState.style.display = 'none';
        content.style.display = '';
        if (nameEl) nameEl.textContent = workout.name || 'Workout';
        if (typeEl) typeEl.textContent = workout.type || '';
        if (durationEl) durationEl.textContent = workout.duration || '';
        if (intensityEl) intensityEl.textContent = workout.intensity || '';

        if (blocksContainer) {
            blocksContainer.innerHTML = '';
            (workout.exercises || []).forEach(exercise => {
                const block = document.createElement('div');
                block.className = 'exercise-block';
                block.innerHTML = `
                    <div class="exercise-block-header d-flex justify-content-between">
                        <h6>${exercise.name}</h6>
                    </div>
                    <div class="exercise-details p-2">
                        <div class="row">
                            <div class="col-md-3"><strong>Sets:</strong> ${exercise.sets || '-'}</div>
                            <div class="col-md-3"><strong>Reps:</strong> ${exercise.reps || '-'}</div>
                            <div class="col-md-3"><strong>Weight:</strong> ${exercise.weight || '-'}</div>
                            <div class="col-md-3"><strong>Rest:</strong> ${exercise.rest || '-'}</div>
                        </div>
                        ${exercise.notes ? `<div class="mt-2"><strong>Notes:</strong> ${exercise.notes}</div>` : ''}
                    </div>`;
                blocksContainer.appendChild(block);
            });
        }

        // Template button in header already exists; ensure it opens modal
        const addBtn = document.getElementById('applyWorkoutTemplateBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                PlanCustomizationTemplates.openTemplateModal('workout');
            });
        }
    }
    
    /**
     * Render meals section
     */
    function renderMealsSection(dayData) {
        const emptyState = document.getElementById('mealEmptyState');
        const content = document.getElementById('mealContent');
        const nameEl = document.getElementById('nutritionPlanName');
        const typeEl = document.getElementById('nutritionPlanType');
        const caloriesEl = document.getElementById('nutritionCalories');
        const proteinEl = document.getElementById('nutritionProtein');
        const carbsEl = document.getElementById('nutritionCarbs');
        const fatsEl = document.getElementById('nutritionFats');
        const mealsContainer = document.getElementById('mealsContainer');
        if (!emptyState || !content) return;

        if (!dayData.meals || dayData.meals.length === 0) {
            emptyState.style.display = '';
            content.style.display = 'none';
            if (mealsContainer) mealsContainer.innerHTML = '';
            return;
        }

        const nutrition = dayData.meals[0];
        emptyState.style.display = 'none';
        content.style.display = '';
        if (nameEl) nameEl.textContent = nutrition.name || 'Nutrition Plan';
        if (typeEl) typeEl.textContent = nutrition.type || '';
        if (caloriesEl) caloriesEl.textContent = nutrition.nutrition?.calories || nutrition.total_calories || '-';
        if (proteinEl) proteinEl.textContent = nutrition.nutrition?.protein || nutrition.protein_grams || '-';
        if (carbsEl) carbsEl.textContent = nutrition.nutrition?.carbs || nutrition.carbs_grams || '-';
        if (fatsEl) fatsEl.textContent = nutrition.nutrition?.fats || nutrition.fats_grams || '-';

        if (mealsContainer) {
            mealsContainer.innerHTML = '';
            (nutrition.items || []).forEach(item => {
                const el = document.createElement('div');
                el.className = 'meal-item p-2 border-bottom';
                el.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${item.name}</strong> ${item.quantity ? `<span class="text-muted"> - ${item.quantity}</span>` : ''}
                        </div>
                    </div>`;
                mealsContainer.appendChild(el);
            });
        }

        const addBtn = document.getElementById('applyMealTemplateBtn');
        if (addBtn) {
            addBtn.addEventListener('click', function() {
                PlanCustomizationTemplates.openTemplateModal('meal');
            });
        }
    }
    
    /**
     * Render coach notes section
     */
    function renderCoachNotes(dayData) {
        const notesTextarea = document.getElementById('dayNotes');
        const saveBtn = document.getElementById('saveDayBtn');
        if (notesTextarea) {
            notesTextarea.value = dayData.coach_notes || '';
        }
        if (saveBtn) {
            saveBtn.onclick = function() {
                const notes = notesTextarea ? notesTextarea.value : '';
                saveCoachNotes(currentDayId, notes);
            };
        }
    }
    
    /**
     * Save coach notes for a day
     */
    async function saveCoachNotes(dayId, notes) {
        try {
            showLoading(true, 'saveNotes');
            
            const response = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${dayId}/notes/`, {
                method: 'POST',
                body: JSON.stringify({
                    notes: notes
                })
            });
            
            if (response.success) {
                showToast('success', 'Notes saved successfully');
                
                // Update notes in our local data
                const dayIndex = planDays.findIndex(d => d.id === dayId);
                if (dayIndex >= 0) {
                    planDays[dayIndex].coach_notes = notes;
                }
            } else {
                throw new Error('Failed to save notes');
            }
            
            showLoading(false, 'saveNotes');
        } catch (error) {
            console.error('Error saving notes:', error);
            showError('Failed to save notes: ' + error.message);
            showLoading(false, 'saveNotes');
        }
    }
    
    /**
     * Apply template to current day
     */
    async function applyTemplate(templateType, templateId) {
        if (!currentDayId || !templateType || !templateId) {
            showError('Missing required information to apply template');
            return false;
        }
        
        try {
            showLoading(true, 'applyTemplate');
            
            const response = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/apply_template/`, {
                method: 'POST',
                body: JSON.stringify({
                    template_type: templateType,
                    template_id: templateId
                })
            });
            
            if (response.success) {
                showToast('success', 'Template applied successfully');
                
                // Reload day data
                await selectDay(currentDayId);
                return true;
            } else {
                throw new Error('Failed to apply template');
            }
        } catch (error) {
            console.error('Error applying template:', error);
            showError('Failed to apply template: ' + error.message);
            showLoading(false, 'applyTemplate');
            return false;
        }
    }
    
    /**
     * Show loading indicator
     */
    function showLoading(isLoading, containerId = 'planDayLoading') {
        const loadingContainer = document.getElementById(containerId);
        if (!loadingContainer) return;
        
        if (isLoading) {
            loadingContainer.classList.remove('d-none');
        } else {
            loadingContainer.classList.add('d-none');
        }
    }
    
    /**
     * Show error message
     */
    function showError(message) {
        console.error(message);
        showToast('danger', message);
    }
    
    /**
     * Show toast message
     */
    function showToast(type, message) {
        if (window.showToast) {
            window.showToast(type, message);
        } else {
            alert(message);
        }
    }
    
    // Public API
    return {
        initialize,
        loadPlanData,
        selectDay,
        applyTemplate,
        getCurrentDayId: () => currentDayId,
        getCurrentPlanId: () => currentPlanId,
        getCurrentClientId: () => currentClientId,
        getCurrentSubscriptionId: () => currentSubscriptionId,
        getPlanDays: () => planDays,
        getPlanData: () => planData,
        getClientData: () => clientData
    };
})();

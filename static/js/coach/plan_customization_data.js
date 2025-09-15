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
    // Track current selected session containers (first by default)
    let currentWorkoutPlanId = null;
    let currentNutritionPlanId = null;

    /**
     * Initialize data from URL parameters
     */
    function initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        currentSubscriptionId = urlParams.get('subscription_id');
        currentPlanId = urlParams.get('plan_id');
        currentClientId = urlParams.get('client_id');

        // Support plan_id passed in the URL path: /plan-management/coach/plan-customization/<plan_id>/
        if (!currentPlanId) {
            try {
                const path = window.location.pathname;
                const m = path.match(/\/coach\/plan-customization\/(\d+)/);
                if (m && m[1]) {
                    currentPlanId = m[1];
                }
            } catch (e) { /* ignore */ }
        }
        
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
     * Remove workout from current day
     */
    async function removeWorkout() {
        if (!currentDayId) return;
        try {
            const payload = {};
            if (currentWorkoutPlanId) payload.workout_plan_id = currentWorkoutPlanId;
            const res = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/remove_workout/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.success) {
                showToast('success', 'Workout removed');
                await selectDay(currentDayId, true);
            } else {
                throw new Error(res.error || 'Failed to remove workout');
            }
        } catch (e) {
            console.error(e);
            showError('Failed to remove workout');
        }
    }

    /**
     * Remove nutrition plan from current day
     */
    async function removeNutrition() {
        if (!currentDayId) return;
        try {
            const payload = {};
            if (currentNutritionPlanId) payload.nutrition_plan_id = currentNutritionPlanId;
            const res = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/remove_nutrition/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (res.success) {
                showToast('success', 'Nutrition plan removed');
                await selectDay(currentDayId, true);
            } else {
                throw new Error(res.error || 'Failed to remove nutrition');
            }
        } catch (e) {
            console.error(e);
            showError('Failed to remove nutrition plan');
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

            let response = await APIBase.request(url, { method: 'GET' });
            if (response && response.success) {
                planDays = Array.isArray(response.data) ? response.data : [];
                // If no days and we have a subscription_id, attempt to generate (backward compatibility)
                if ((!planDays || planDays.length === 0) && currentSubscriptionId) {
                    console.log('No plan days found; attempting to generate...');
                    const genRes = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${currentSubscriptionId}/generate_plan_days/`, { method: 'POST' });
                    console.log('Generate response:', genRes);
                    // Re-fetch after generation attempt
                    response = await APIBase.request(url, { method: 'GET' });
                    if (response && response.success) {
                        planDays = Array.isArray(response.data) ? response.data : [];
                    }
                }
                console.log('Plan days:', planDays);
                return planDays;
            }
            throw new Error((response && response.error) || 'Failed to load plan days');
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
    async function selectDay(dayId, force = false) {
        if (currentDayId === dayId && !force) return; // Already selected and no force reload
        
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
            // Update header with per-day title
            const titleEl = document.getElementById('planDayTitle');
            if (titleEl) {
                titleEl.textContent = dayData.day_title || `Day ${dayData.day_number}: Plan Overview`;
            }
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
        // Maintain selected session ids if still present, otherwise default to first
        if ((dayData.workouts || []).length) {
            const found = dayData.workouts.find(w => w.id === currentWorkoutPlanId);
            currentWorkoutPlanId = found ? found.id : dayData.workouts[0].id;
        } else {
            currentWorkoutPlanId = null;
        }
        if ((dayData.meals || []).length) {
            const found = dayData.meals.find(m => m.id === currentNutritionPlanId);
            currentNutritionPlanId = found ? found.id : dayData.meals[0].id;
        } else {
            currentNutritionPlanId = null;
        }
        // Render sections into existing containers in the template
        renderDayOverview(dayData);
        renderWorkoutsSection(dayData);
        renderMealsSection(dayData);
        renderCoachNotes(dayData);
    }

    /**
     * Render Day Overview section (title, theme, difficulty, type, instructions)
     */
    function renderDayOverview(dayData) {
        const dayTitleEl = document.getElementById('dayTitle');
        const dayThemeEl = document.getElementById('dayTheme');
        const diffEl = document.getElementById('difficultyLevel');
        const coachInstrEl = document.getElementById('coachInstructions');
        const typeWorkoutEl = document.getElementById('typeWorkout');
        const typeRestEl = document.getElementById('typeRest');
        const typeBothEl = document.getElementById('typeBoth');

        if (dayTitleEl) dayTitleEl.value = dayData.day_title || `Day ${dayData.day_number}`;
        if (dayThemeEl) dayThemeEl.value = dayData.day_theme || '';
        if (coachInstrEl) coachInstrEl.value = dayData.coach_instructions || '';

        // Map planned_difficulty text -> select value 1..5
        const diffMap = {
            'very_easy': 1,
            'easy': 2,
            'moderate': 3,
            'hard': 4,
            'very_hard': 5
        };
        if (diffEl) {
            const val = String(diffMap[String(dayData.planned_difficulty || 'moderate')] || 3);
            diffEl.value = val;
        }

        // Day type radios
        const dayType = (dayData.day_type || 'both').toLowerCase();
        if (typeWorkoutEl) typeWorkoutEl.checked = (dayType === 'workout');
        if (typeRestEl) typeRestEl.checked = (dayType === 'rest');
        if (typeBothEl) typeBothEl.checked = (dayType === 'both');
    }

    /**
     * Save Day Overview
     */
    async function saveDayOverview(dayId) {
        const dayTitleEl = document.getElementById('dayTitle');
        const dayThemeEl = document.getElementById('dayTheme');
        const diffEl = document.getElementById('difficultyLevel');
        const coachInstrEl = document.getElementById('coachInstructions');
        const typeWorkoutEl = document.getElementById('typeWorkout');
        const typeRestEl = document.getElementById('typeRest');
        const typeBothEl = document.getElementById('typeBoth');

        const payload = {
            day_title: dayTitleEl ? dayTitleEl.value : undefined,
            day_theme: dayThemeEl ? dayThemeEl.value : undefined,
            difficulty_level: diffEl ? diffEl.value : undefined,
            coach_instructions: coachInstrEl ? coachInstrEl.value : undefined,
            day_type: (typeWorkoutEl && typeWorkoutEl.checked) ? 'workout' : (typeRestEl && typeRestEl.checked) ? 'rest' : 'both'
        };

        const res = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${dayId}/overview/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res || !res.success) {
            throw new Error((res && res.error) || 'Failed to save overview');
        }

        // Update local cache
        const idx = planDays.findIndex(d => d.id === dayId);
        if (idx >= 0) {
            planDays[idx].day_title = payload.day_title;
            planDays[idx].day_theme = payload.day_theme;
            planDays[idx].planned_difficulty = payload.difficulty_level;
            planDays[idx].coach_instructions = payload.coach_instructions;
            planDays[idx].day_type = payload.day_type;
        }
        // Update header title
        const titleEl = document.getElementById('planDayTitle');
        if (titleEl && payload.day_title) {
            titleEl.textContent = `${payload.day_title}`;
        }
        return true;
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

        // Sessions summary and per-session cards
        const sessions = dayData.workouts;
        const first = sessions[0];
        currentWorkoutPlanId = first.id;
        emptyState.style.display = 'none';
        content.style.display = '';
    if (nameEl) nameEl.textContent = first.name || 'Workout';
    if (typeEl) typeEl.textContent = first.type || '';
    if (durationEl) durationEl.textContent = first.duration || '';
    if (intensityEl) intensityEl.textContent = first.intensity || '';
    // Hide the legacy workout summary row to avoid duplication with cards
    const workoutHeader = document.querySelector('#workoutContent .workout-header');
    if (workoutHeader) workoutHeader.style.display = 'none';

        // Remove session selector (no dropdown UX)
        const wpSelectWrap2 = document.getElementById('workoutSessionSelectWrap');
        if (wpSelectWrap2 && wpSelectWrap2.parentNode) wpSelectWrap2.parentNode.removeChild(wpSelectWrap2);

        if (blocksContainer) {
            blocksContainer.innerHTML = '';
            sessions.forEach((wp, idx) => {
                const card = document.createElement('div');
                card.className = 'card mb-3';
                const meta = [wp.type || '', wp.duration ? (wp.duration + ' min') : '', wp.intensity || '']
                    .filter(Boolean).join(' · ');
                card.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-semibold">${wp.session_name || ('Session ' + (idx+1))} - ${wp.name || 'Workout'}</div>
                            ${meta ? `<div class="text-muted small">${meta}</div>` : ''}
                        </div>
                        <button class="btn btn-sm btn-outline-danger" data-wp-id="${wp.id}"><i class="bi bi-trash"></i></button>
                    </div>
                    <div class="card-body py-2">
                        ${(wp.exercises || []).length ? `
                        <div class="table-responsive">
                            <table class="table table-sm mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Exercise</th>
                                        <th>Sets</th>
                                        <th>Reps/Time</th>
                                        <th>Rest</th>
                                        <th class="d-none d-md-table-cell">Block</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(wp.exercises || []).map(ex => `
                                        <tr>
                                            <td>${ex.name}</td>
                                            <td>${ex.sets || '-'}</td>
                                            <td>${ex.reps || '-'}</td>
                                            <td>${ex.rest || '-'}</td>
                                            <td class="d-none d-md-table-cell">${ex.block_name || ''}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>` : `
                        <div class="text-muted small">No exercises found</div>
                        `}
                    </div>`;
                const btn = card.querySelector('button[data-wp-id]');
                if (btn) {
                    btn.addEventListener('click', async () => {
                        try {
                            btn.disabled = true;
                            const res = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/remove_workout/`, {
                                method: 'POST',
                                body: JSON.stringify({ workout_plan_id: wp.id })
                            });
                            if (res && res.success) {
                                showToast('success', 'Workout session removed');
                                await selectDay(currentDayId, true);
                            } else {
                                throw new Error((res && res.error) || 'Failed to remove workout');
                            }
                        } catch (e) {
                            console.error(e);
                            showToast('danger', 'Failed to remove workout session');
                        } finally {
                            btn.disabled = false;
                        }
                    });
                }
                blocksContainer.appendChild(card);
            });
        }

        // Apply Template button is a Bootstrap dropdown toggle; no extra click handler needed here
        const removeBtn = document.getElementById('removeWorkoutBtn');
        if (removeBtn) {
            removeBtn.onclick = removeWorkout;
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

        // Determine selected nutrition plan
        const plans = dayData.meals;
        let nutrition = plans.find(p => p.id === currentNutritionPlanId) || plans[0];
        currentNutritionPlanId = nutrition.id;
        emptyState.style.display = 'none';
        content.style.display = '';
        // Show a friendly plan name; hide raw default like 'Nutrition Plan 1'
        if (nameEl) {
            const rawName = nutrition.name || '';
            const isDefault = /^\s*Nutrition\s+Plan(\s*\d+)?\s*$/i.test(rawName);
            const fallback = nutrition.items && nutrition.items.length ? `${nutrition.items[0].name}` : 'Nutrition Plan';
            nameEl.textContent = isDefault ? fallback : rawName;
        }
    if (typeEl) typeEl.textContent = nutrition.type || '';
    if (caloriesEl) caloriesEl.textContent = nutrition.nutrition?.calories || nutrition.total_calories || '-';
    if (proteinEl) proteinEl.textContent = nutrition.nutrition?.protein || nutrition.protein_grams || '-';
    if (carbsEl) carbsEl.textContent = nutrition.nutrition?.carbs || nutrition.carbs_grams || '-';
    if (fatsEl) fatsEl.textContent = nutrition.nutrition?.fats || nutrition.fats_grams || '-';
    // Hide the legacy nutrition summary row to avoid duplication with meal cards
    const nutritionSummary = document.querySelector('#mealContent .nutrition-summary');
    if (nutritionSummary) nutritionSummary.style.display = 'none';

        // Remove nutrition plan selector dropdown (show header only)
        const selWrapOld = document.getElementById('nutritionPlanSelectWrap');
        if (selWrapOld && selWrapOld.parentNode) selWrapOld.parentNode.removeChild(selWrapOld);

        if (mealsContainer) {
            mealsContainer.innerHTML = '';
            (nutrition.items || []).forEach(meal => {
                const card = document.createElement('div');
                card.className = 'card mb-2';
                const cals = (meal.nutrition && (meal.nutrition.calories ?? meal.nutrition.kcal)) ?? meal.calories ?? '-';
                const prot = (meal.nutrition && meal.nutrition.protein) ?? meal.protein ?? '-';
                const carbs = (meal.nutrition && meal.nutrition.carbs) ?? meal.carbs ?? '-';
                const fats = (meal.nutrition && meal.nutrition.fats) ?? meal.fats ?? '-';
                const subtitle = [meal.meal_time, cals !== '-' ? (cals + ' kcal') : '']
                    .filter(Boolean).join(' · ');
                card.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center py-2">
                        <div>
                            <div class="fw-semibold">${meal.name}</div>
                            ${subtitle ? `<div class="text-muted small">${subtitle}</div>` : ''}
                        </div>
                        <button class="btn btn-sm btn-outline-danger" data-meal-id="${meal.id}"><i class="bi bi-trash"></i></button>
                    </div>
                    <div class="card-body py-2">
                        <div class="row text-center small g-0">
                            <div class="col"><div class="text-uppercase text-muted">Calories</div><div class="fw-semibold">${cals !== '-' ? cals : '-'}</div></div>
                            <div class="col"><div class="text-uppercase text-muted">Protein</div><div class="fw-semibold">${prot !== '-' ? prot : '-'}</div></div>
                            <div class="col"><div class="text-uppercase text-muted">Carbs</div><div class="fw-semibold">${carbs !== '-' ? carbs : '-'}</div></div>
                            <div class="col"><div class="text-uppercase text-muted">Fats</div><div class="fw-semibold">${fats !== '-' ? fats : '-'}</div></div>
                        </div>
                    </div>`;
                const btn = card.querySelector('button[data-meal-id]');
                if (btn) {
                    btn.addEventListener('click', async () => {
                        try {
                            btn.disabled = true;
                            const res = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/remove_meal/`, {
                                method: 'POST',
                                body: JSON.stringify({ meal_id: meal.id })
                            });
                            if (res && res.success) {
                                showToast('success', 'Meal removed');
                                await selectDay(currentDayId, true);
                            } else {
                                throw new Error((res && res.error) || 'Failed to remove meal');
                            }
                        } catch (e) {
                            console.error(e);
                            showToast('danger', 'Failed to remove meal');
                        } finally {
                            btn.disabled = false;
                        }
                    });
                }
                mealsContainer.appendChild(card);
            });
        }

        // Media row for nutrition
        let mealMediaRow = document.getElementById('mealMediaRow');
        if (!mealMediaRow) {
            mealMediaRow = document.createElement('div');
            mealMediaRow.id = 'mealMediaRow';
            mealMediaRow.className = 'mb-3';
            const summary = document.querySelector('#mealContent .nutrition-summary');
            if (summary && summary.parentNode) {
                summary.parentNode.insertBefore(mealMediaRow, summary.nextSibling);
            }
        }
        mealMediaRow.innerHTML = '';
        if (nutrition.image || nutrition.video_url || nutrition.video) {
            let html = '<div class="row g-2">';
            if (nutrition.image) html += `<div class="col-auto"><img src="${nutrition.image}" class="img-thumbnail" style="max-height:120px" alt="Meal"></div>`;
            if (nutrition.video_url) html += `<div class="col-auto align-self-center"><a href="${nutrition.video_url}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="bi bi-play-circle me-1"></i>Recipe Video</a></div>`;
            if (nutrition.video) html += `<div class="col-auto align-self-center"><a href="${nutrition.video}" target="_blank" class="btn btn-sm btn-outline-secondary"><i class="bi bi-play-circle me-1"></i>Recipe Video</a></div>`;
            html += '</div>';
            mealMediaRow.innerHTML = html;
        }

        // Apply Template button is a Bootstrap dropdown toggle; no extra click handler needed here
        const removeBtn = document.getElementById('removeNutritionBtn');
        if (removeBtn) {
            removeBtn.onclick = removeNutrition;
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
            saveBtn.onclick = async function() {
                try {
                    const notes = notesTextarea ? notesTextarea.value : '';
                    // Save overview first, then notes
                    await saveDayOverview(currentDayId);
                    await saveCoachNotes(currentDayId, notes);
                    showToast('success', 'Day saved');
                } catch (e) {
                    console.error(e);
                    showToast('danger', 'Failed to save day');
                }
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
    let applyingTemplate = false; // guard against double submissions
    async function applyTemplate(templateType, templateId, replace = false) {
        if (!currentDayId || !templateType || !templateId) {
            showError('Missing required information to apply template');
            return false;
        }
        if (applyingTemplate) {
            // Debounce duplicate clicks
            return false;
        }
        applyingTemplate = true;
        
        try {
            showLoading(true, 'applyTemplate');
            
            const payload = {
                template_type: templateType,
                template_id: templateId,
                replace: !!replace
            };
            if (templateType === 'workout' && replace && currentWorkoutPlanId) {
                payload.workout_plan_id = currentWorkoutPlanId;
            }
            // For meals: always target the current nutrition plan if available so
            // multiple templates add additional meals to the same plan/day.
            if (templateType === 'meal' && currentNutritionPlanId) {
                payload.nutrition_plan_id = currentNutritionPlanId;
            }
            const response = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/plan_days/${currentDayId}/apply_template/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            if (response.success) {
                showToast('success', 'Template applied successfully');
                
                // Reload day data
                await selectDay(currentDayId, true);
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
        finally {
            applyingTemplate = false;
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
        removeWorkout,
        removeNutrition,
        getCurrentDayId: () => currentDayId,
        getCurrentPlanId: () => currentPlanId,
        getCurrentClientId: () => currentClientId,
        getCurrentSubscriptionId: () => currentSubscriptionId,
        getPlanDays: () => planDays,
        getPlanData: () => planData,
        getClientData: () => clientData
    };
})();

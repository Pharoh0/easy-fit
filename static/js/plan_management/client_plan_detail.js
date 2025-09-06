/* Client Plan Detail Page JS
 * - Fetches progress and plan days for a subscription
 * - Renders DataTables with filters
 * - Supports actions: start, complete, skip, reschedule
 * Security: uses global APIBase (JWT + CSRF)
 */

class ClientPlanDetailManager {
    constructor() {
        this.subscriptionId = this.getSubscriptionIdFromUrl();
        this.planDaysTable = null;
        this.progressChart = null;
        this.init();
    }

    getSubscriptionIdFromUrl() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[pathParts.length - 2]; // Get subscription ID from URL
    }

    async init() {
        try {
            await this.loadPlanProgress();
            await this.initializePlanDaysTable();
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize client plan detail:', error);
            this.showError('Failed to load plan details. Please refresh the page.');
        }
    }

    async loadPlanProgress() {
        try {
            // Correct client progress URL (not under api/v1 prefix)
            const response = await APIBase.request(`/plan-management/client/plan-progress/${this.subscriptionId}/`, {
                method: 'GET'
            });

            if (response.success) {
                this.updateProgressDisplay(response.data);
            } else {
                throw new Error(response.error || 'Failed to load progress');
            }
        } catch (error) {
            console.error('Error loading plan progress:', error);
            this.showError('Failed to load plan progress');
        }
    }

    updateProgressDisplay(progressData) {
        // Update progress circle (matches template markup)
        const percent = progressData.stats?.completion_percentage || 0;
        const circle = document.getElementById('progressCircle');
        const percentText = document.getElementById('progressPercent');
        if (circle) {
            const deg = Math.min(360, Math.max(0, percent * 3.6));
            circle.style.background = `conic-gradient(#28a745 0deg ${deg}deg, #e9ecef ${deg}deg 360deg)`;
        }
        if (percentText) {
            percentText.textContent = `${percent}%`;
        }

        // Update stats
        const statsMap = [
            ['completedDays', progressData.stats?.completed_days || 0],
            ['totalDays', progressData.stats?.total_days || 0],
            ['daysRemaining', progressData.stats?.days_remaining || 0],
        ];
        statsMap.forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        // Update plan name
        const planNameElement = document.querySelector('.plan-title');
        if (planNameElement && progressData.plan_name) {
            planNameElement.textContent = progressData.plan_name;
        }
    }

    async initializePlanDaysTable() {
        try {
            // Destroy existing table if it exists
            if (this.planDaysTable) {
                this.planDaysTable.destroy();
            }

            const self = this;
            this.planDaysTable = $('#planDaysTable').DataTable({
                processing: true,
                serverSide: false,
                ajax: {
                    url: `/plan-management/api/v1/plan-days/?subscription=${this.subscriptionId}`,
                    type: 'GET',
                    headers: {
                        'Authorization': `Bearer ${APIBase.getJWTToken()}`,
                        'X-CSRFToken': APIBase.getCSRFToken()
                    },
                    dataSrc: function(json) {
                        if (json.results) {
                            return json.results;
                        } else if (Array.isArray(json)) {
                            return json;
                        }
                        return [];
                    },
                    error: function(xhr, error, code) {
                        console.error('DataTable AJAX error:', error, code);
                        console.error('Response:', xhr.responseText);
                    }
                },
                columns: [
                    {
                        data: null,
                        className: 'details-control',
                        orderable: false,
                        defaultContent: '<i class="fas fa-chevron-right text-muted"></i>',
                        title: '',
                        width: '24px'
                    },
                    { 
                        data: 'day_number',
                        title: 'Day',
                        width: '60px'
                    },
                    { 
                        data: 'day_title',
                        title: 'Title'
                    },
                    { 
                        data: 'scheduled_date',
                        title: 'Scheduled Date',
                        render: function(data) {
                            return new Date(data).toLocaleDateString();
                        }
                    },
                    { 
                        data: 'completion_status',
                        title: 'Status',
                        render: function(data) {
                            const statusClasses = {
                                'not_started': 'badge-secondary',
                                'in_progress': 'badge-warning',
                                'completed': 'badge-success',
                                'skipped': 'badge-info',
                                'rescheduled': 'badge-primary'
                            };
                            const statusLabels = {
                                'not_started': 'Not Started',
                                'in_progress': 'In Progress',
                                'completed': 'Completed',
                                'skipped': 'Skipped',
                                'rescheduled': 'Rescheduled'
                            };
                            return `<span class="badge ${statusClasses[data] || 'badge-secondary'}">${statusLabels[data] || data}</span>`;
                        }
                    },
                    { 
                        data: 'completion_percentage',
                        title: 'Progress',
                        render: function(data) {
                            const percentage = parseFloat(data) || 0;
                            return `
                                <div class="progress" style="height: 20px;">
                                    <div class="progress-bar" role="progressbar" 
                                         style="width: ${percentage}%" 
                                         aria-valuenow="${percentage}" 
                                         aria-valuemin="0" 
                                         aria-valuemax="100">
                                        ${percentage.toFixed(1)}%
                                    </div>
                                </div>
                            `;
                        }
                    },
                    {
                        data: 'client_rating',
                        title: 'Rating',
                        orderable: false,
                        render: function(data, type, row) {
                            const rating = parseInt(data) || 0;
                            let stars = '<div class="day-rating" data-day-id="' + row.id + '">';
                            for (let i = 1; i <= 5; i++) {
                                stars += `<span class="star ${i <= rating ? 'text-warning' : 'text-muted'}" data-rating="${i}" style="cursor:pointer;">★</span>`;
                            }
                            stars += '</div>';
                            return stars;
                        }
                    },
                    { 
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            const viewBtn = `<button class=\"btn btn-sm btn-outline-primary me-1\" onclick=\"clientPlanDetail.viewDay(${row.id})\">View</button>`;
                            if (row.completion_status !== 'completed') {
                                return viewBtn + `<button class=\"btn btn-sm btn-success\" onclick=\"clientPlanDetail.completeDay(${row.id})\">Mark Complete</button>`;
                            }
                            return viewBtn;
                        }
                    }
                ],
                order: [[1, 'asc']],
                pageLength: 10,
                responsive: true,
                language: {
                    emptyTable: "No plan days available",
                    loadingRecords: "Loading plan days...",
                    processing: "Loading..."
                },
                initComplete: function() {
                    // Bind events for details toggle and rating
                    self.bindTableEvents();
                }
            });

        } catch (error) {
            console.error('Error initializing plan days table:', error);
            this.showError('Failed to load plan days table');
        }
    }

    setupEventListeners() {
        // Quick filter buttons
        document.getElementById('todayToggle')?.addEventListener('click', () => this.filterPlanDays('today'));
        document.getElementById('upcomingToggle')?.addEventListener('click', () => this.filterPlanDays('upcoming'));
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            const start = document.getElementById('startDate');
            const end = document.getElementById('endDate');
            const status = document.getElementById('statusFilter');
            if (start) start.value = '';
            if (end) end.value = '';
            if (status) status.value = 'all';
            this.filterPlanDays('all');
        });

        // Date range filters
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyDateFilters());
    }

    filterPlanDays(filter) {
        let url = `/plan-management/api/v1/plan-days/?subscription=${this.subscriptionId}`;
        
        switch (filter) {
            case 'today':
                url += '&today=true';
                break;
            case 'upcoming':
                url += '&upcoming=true';
                break;
            case 'all':
            default:
                // No additional filters
                break;
        }

        this.planDaysTable.ajax.url(url).load();
    }

    applyDateFilters() {
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const status = document.getElementById('statusFilter')?.value;

        let url = `/plan-management/api/v1/plan-days/?subscription=${this.subscriptionId}`;
        
        if (startDate) url += `&start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        if (status && status !== 'all') url += `&status=${status}`;

        this.planDaysTable.ajax.url(url).load();
    }

    bindTableEvents() {
        const self = this;
        const tbody = $('#planDaysTable tbody');
        // Toggle details
        tbody.off('click', 'td.details-control').on('click', 'td.details-control', function() {
            const tr = $(this).closest('tr');
            const row = self.planDaysTable.row(tr);
            const icon = $(this).find('i.fas');
            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');
                if (icon.length) icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
            } else {
                const data = row.data();
                row.child(self.formatDayDetails(data)).show();
                tr.addClass('shown');
                if (icon.length) icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
            }
        });

        // Rating stars click
        tbody.off('click', '.day-rating .star').on('click', '.day-rating .star', async function() {
            const star = $(this);
            const rating = parseInt(star.data('rating'));
            const dayId = parseInt(star.closest('.day-rating').data('day-id'));
            try {
                const res = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ client_rating: rating })
                });
                if (res && res.success) {
                    // Refresh table row data to reflect updated rating
                    self.planDaysTable.ajax.reload(null, false);
                    self.showSuccess('Rating saved');
                } else {
                    throw new Error((res && res.error) || 'Failed to save rating');
                }
            } catch (e) {
                console.error('Failed to save rating', e);
                self.showError('Failed to save rating');
            }
        });
    }

    formatDayDetails(day) {
        // Build nested HTML with workouts and meals
        let html = '<div class="row g-3 p-2">';
        // Workouts
        html += '<div class="col-12 col-md-6">';
        html += '<h6 class="mb-2"><i class="fas fa-dumbbell me-1"></i> Workouts</h6>';
        if (day.workout_plans && day.workout_plans.length) {
            html += '<ul class="list-group list-group-flush">';
            day.workout_plans.forEach((wp, idx) => {
                const blocks = (wp.exercise_blocks || []).length;
                const exercises = (wp.exercise_blocks || []).reduce((acc, b) => acc + (b.exercises ? b.exercises.length : 0), 0);
                html += `<li class="list-group-item">
                    <div class="fw-semibold">${wp.session_name || 'Session ' + (idx+1)} — ${wp.workout_name || ''}</div>
                    <div class="text-muted small">Type: ${wp.workout_type || '-'} • Duration: ${wp.total_duration_minutes || 0} min • Blocks: ${blocks} • Exercises: ${exercises}</div>
                </li>`;
            });
            html += '</ul>';
        } else {
            html += '<div class="text-muted">No workouts planned.</div>';
        }
        html += '</div>';

        // Meals
        html += '<div class="col-12 col-md-6">';
        html += '<h6 class="mb-2"><i class="fas fa-utensils me-1"></i> Meals</h6>';
        if (day.nutrition_plans && day.nutrition_plans.length) {
            html += '<ul class="list-group list-group-flush">';
            day.nutrition_plans.forEach((np, idx) => {
                const meals = (np.meals || []).length;
                html += `<li class="list-group-item">
                    <div class="fw-semibold">${np.plan_name || 'Plan ' + (idx+1)}</div>`;
                if (np.meals && np.meals.length) {
                    html += '<div class="small mt-1">';
                    np.meals.forEach(m => {
                        html += `<div class="text-muted">${(m.meal_type || '').toString().replace('_',' ')} — ${m.meal_name || ''} (${m.calories_per_serving || 0} kcal)</div>`;
                    });
                    html += '</div>';
                } else {
                    html += '<div class="text-muted small">No meals.</div>';
                }
                html += '</li>';
            });
            html += '</ul>';
        } else {
            html += '<div class="text-muted">No meals planned.</div>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    }

    async viewDay(dayId) {
        try {
            // Show loading in modal
            const modalEl = document.getElementById('dayDetailsModal');
            const bodyEl = document.getElementById('dayDetailsContent');
            if (bodyEl) bodyEl.innerHTML = '<div class="text-center py-5"><div class="spinner-border" role="status"></div><div class="mt-2 small text-muted">Loading day details...</div></div>';
            const modal = new bootstrap.Modal(modalEl);
            modal.show();

            const res = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/`, { method: 'GET' });
            if (!res || !res.success) throw new Error(res?.error || 'Failed to load day');
            const day = res.data;

            const content = `
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div>
                            <h5 class="mb-1">Day ${day.day_number}${day.day_title ? ' — ' + day.day_title : ''}</h5>
                            <div class="text-muted small">
                                <i class="fas fa-calendar me-1"></i> ${new Date(day.scheduled_date).toLocaleDateString()} · 
                                <span class="ms-1"><i class="fas fa-chart-line me-1"></i> ${parseFloat(day.completion_percentage || 0).toFixed(1)}%</span>
                            </div>
                        </div>
                        <div>
                            ${day.completion_status !== 'completed' ? `<button class="btn btn-success" onclick="clientPlanDetail.completeDay(${day.id})">Mark Complete</button>` : '<span class="badge bg-success">Completed</span>'}
                        </div>
                    </div>
                </div>

                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-star text-warning me-2"></i>Your Day Review</span>
                        <small class="text-muted">Help your coach improve your plan</small>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center flex-wrap gap-3 mb-2">
                            <div class="me-2 small text-muted">Rating:</div>
                            ${this.renderStars(5, day.client_rating || 0, 'day', day.id)}
                        </div>
                        <textarea id="dayReviewText" class="form-control" rows="2" placeholder="Write your feedback (optional)">${day.client_feedback || ''}</textarea>
                        <div class="text-end mt-2">
                            <button class="btn btn-primary save-day-review" data-day-id="${day.id}">Save Review</button>
                        </div>
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-header d-flex align-items-center justify-content-between">
                                <span><i class="fas fa-dumbbell me-2"></i>Workouts</span>
                                <span class="badge bg-light text-dark">${(day.workout_plans || []).length} session(s)</span>
                            </div>
                            <div class="card-body">
                                ${this.buildWorkoutsHtml(day.workout_plans || [])}
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-6">
                        <div class="card h-100">
                            <div class="card-header d-flex align-items-center justify-content-between">
                                <span><i class="fas fa-utensils me-2"></i>Meals</span>
                                <span class="badge bg-light text-dark">${(day.nutrition_plans || []).length} plan(s)</span>
                            </div>
                            <div class="card-body">
                                ${this.buildMealsHtml(day.nutrition_plans || [])}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (bodyEl) bodyEl.innerHTML = content;
            this.bindModalEvents();
        } catch (e) {
            console.error('Failed to open day view', e);
            this.showError('Failed to load day details');
        }
    }

    renderStars(max, current, type, id) {
        const cur = parseInt(current) || 0;
        let stars = `<div class="rating-stars" data-type="${type}" data-id="${id}" data-value="${cur}">`;
        for (let i = 1; i <= max; i++) {
            stars += `<span class="star ${i <= cur ? 'text-warning' : 'text-muted'}" data-value="${i}" style="cursor:pointer;font-size:1.1rem;">★</span>`;
        }
        stars += '</div>';
        return stars;
    }

    buildWorkoutsHtml(workoutPlans) {
        if (!workoutPlans.length) return '<div class="text-muted">No workouts planned.</div>';
        let html = '';
        workoutPlans.forEach((wp, wIdx) => {
            html += `
                <div class="mb-3 p-2 border rounded">
                    <div class="d-flex align-items-start justify-content-between flex-wrap gap-2">
                        <div>
                            <div class="fw-semibold">${wp.session_name || 'Session ' + (wIdx+1)} ${wp.workout_name ? '— ' + wp.workout_name : ''}</div>
                            <div class="text-muted small">Type: ${wp.workout_type || '-'} • Intensity: ${wp.intensity_level || '-'} • Duration: ${wp.total_duration_minutes || 0} min • Target kcal: ${wp.target_calories_burn || 0}</div>
                        </div>
                        ${wp.workout_image_url ? `<img src="${wp.workout_image_url}" class="rounded" style="max-height:60px">` : ''}
                    </div>
                    ${wp.workout_video_url ? `<div class="ratio ratio-16x9 mt-2"><iframe src="${wp.workout_video_url}" title="Workout Video" allowfullscreen></iframe></div>` : ''}
                    ${this.buildBlocksHtml(wp.exercise_blocks || [])}
                    <div class="mt-2 p-2 bg-light rounded">
                        <div class="d-flex align-items-center flex-wrap gap-3 mb-2">
                            <div class="small text-muted">Workout rating:</div>
                            ${this.renderStars(5, wp.client_effort_rating ? Math.round((parseInt(wp.client_effort_rating)||0)/2) : 0, 'workout', wp.id)}
                        </div>
                        <textarea id="workoutNotes_${wp.id}" class="form-control" rows="2" placeholder="Notes about this workout (optional)">${wp.client_notes || ''}</textarea>
                        <div class="text-end mt-2">
                            <button class="btn btn-sm btn-outline-primary save-workout-review" data-workout-id="${wp.id}">Save Workout Review</button>
                        </div>
                    </div>
                </div>
            `;
        });
        return html;
    }

    buildBlocksHtml(blocks) {
        if (!blocks.length) return '';
        let html = '<div class="mt-2">';
        blocks.forEach((b, i) => {
            const collapseId = `blk_${b.id}`;
            html += `
                <div class="card mb-2">
                    <div class="card-header p-2">
                        <button class="btn btn-sm btn-link text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                            <i class="fas fa-list me-1"></i>${b.block_name || 'Block ' + (i+1)} <span class="text-muted">(${b.block_type || 'set'})</span>
                        </button>
                    </div>
                    <div id="${collapseId}" class="collapse">
                        <div class="card-body p-2">
                            ${this.buildExercisesHtml(b.exercises || [])}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    buildExercisesHtml(exercises) {
        if (!exercises.length) return '<div class="text-muted small">No exercises.</div>';
        let html = '<div class="list-group list-group-flush">';
        exercises.forEach(ex => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex gap-3 align-items-start flex-wrap">
                        ${ex.demonstration_image_url ? `<img src="${ex.demonstration_image_url}" class="rounded" style="width:64px;height:64px;object-fit:cover">` : ''}
                        <div class="flex-grow-1">
                            <div class="fw-semibold">${ex.exercise_name}</div>
                            <div class="text-muted small">
                                Sets: ${ex.sets_count || '-'} · ${ex.reps_per_set ? `Reps: ${ex.reps_per_set}` : (ex.duration_seconds ? `Duration: ${ex.duration_seconds}s` : '')} · Rest: ${ex.rest_between_sets_seconds || 0}s
                            </div>
                            ${ex.form_instructions ? `<div class="small mt-1">${ex.form_instructions}</div>` : ''}
                            ${ex.demonstration_video_url ? `<div class="ratio ratio-16x9 mt-2"><iframe src="${ex.demonstration_video_url}" title="Exercise Video" allowfullscreen></iframe></div>` : ''}
                            ${(ex.secondary_images_urls && ex.secondary_images_urls.length) ? `<div class="mt-2 d-flex flex-wrap gap-2">${ex.secondary_images_urls.map(u => `<img src="${u}" class="rounded" style="width:56px;height:56px;object-fit:cover">`).join('')}</div>` : ''}
                            <div class="mt-2 p-2 bg-light rounded">
                                <div class="d-flex align-items-center flex-wrap gap-3 mb-2">
                                    <div class="small text-muted">Difficulty:</div>
                                    ${this.renderStars(5, ex.perceived_difficulty ? Math.round((parseInt(ex.perceived_difficulty)||0)/2) : 0, 'exercise', ex.id)}
                                </div>
                                <div class="text-end">
                                    <button class="btn btn-sm btn-outline-primary save-exercise-rating" data-exercise-id="${ex.id}">Save Exercise Rating</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    buildMealsHtml(nutritionPlans) {
        if (!nutritionPlans.length) return '<div class="text-muted">No meals planned.</div>';
        let html = '';
        nutritionPlans.forEach((np, nIdx) => {
            html += `
                <div class="mb-3 p-2 border rounded">
                    <div class="fw-semibold">${np.plan_name || 'Plan ' + (nIdx+1)}</div>
                    <div class="text-muted small">Target: ${np.nutritional_summary?.targets?.calories || np.target_calories || 0} kcal · Protein: ${np.nutritional_summary?.targets?.protein || np.target_protein_grams || 0}g · Carbs: ${np.nutritional_summary?.targets?.carbs || np.target_carbs_grams || 0}g · Fats: ${np.nutritional_summary?.targets?.fats || np.target_fats_grams || 0}g</div>
                    ${this.buildMealsListHtml(np.meals || [])}
                </div>
            `;
        });
        return html;
    }

    buildMealsListHtml(meals) {
        if (!meals.length) return '<div class="text-muted small">No meals.</div>';
        let html = '<div class="list-group list-group-flush mt-2">';
        meals.forEach(m => {
            const collapseId = `meal_${m.id}`;
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div class="d-flex gap-3 align-items-start">
                            ${m.meal_image_url ? `<img src="${m.meal_image_url}" class="rounded" style="width:64px;height:64px;object-fit:cover">` : ''}
                            <div>
                                <div class="fw-semibold">${m.meal_name || 'Meal'} <span class="text-muted">(${(m.meal_type || '').toString().replace('_',' ')})</span></div>
                                <div class="text-muted small">${m.calories_per_serving || 0} kcal · P: ${m.protein_grams || 0}g · C: ${m.carbs_grams || 0}g · F: ${m.fats_grams || 0}g</div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-link text-decoration-none" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">Details</button>
                    </div>
                    <div id="${collapseId}" class="collapse mt-2">
                        <div class="small">
                            ${m.meal_description ? `<div class=\"mb-2\"><strong>Description:</strong> ${m.meal_description}</div>` : ''}
                            ${m.recipe_instructions ? `<div class=\"mb-2\"><strong>Recipe:</strong> ${m.recipe_instructions}</div>` : ''}
                            ${m.recipe_video_file_url ? `<div class=\"ratio ratio-16x9 mt-2\"><video controls src=\"${m.recipe_video_file_url}\"></video></div>` : (m.recipe_video_url ? `<div class=\"ratio ratio-16x9 mt-2\"><iframe src=\"${m.recipe_video_url}\" title=\"Recipe Video\" allowfullscreen></iframe></div>` : '')}
                            ${this.buildIngredientsHtml(m.ingredients || [])}
                            ${(m.additional_images_urls && m.additional_images_urls.length) ? `<div class=\"mt-2 d-flex flex-wrap gap-2\">${m.additional_images_urls.map(u => `<img src=\"${u}\" class=\"rounded\" style=\"width:72px;height:72px;object-fit:cover\">`).join('')}</div>` : ''}
                            <div class=\"mt-2 p-2 bg-light rounded\">
                                <div class=\"d-flex align-items-center flex-wrap gap-3 mb-2\">
                                    <div class=\"small text-muted\">Meal rating:</div>
                                    ${this.renderStars(5, m.client_rating || 0, 'meal', m.id)}
                                </div>
                                <textarea id=\"mealNotes_${m.id}\" class=\"form-control\" rows=\"2\" placeholder=\"Notes about this meal (optional)\">${m.client_notes || ''}</textarea>
                                <div class=\"text-end mt-2\">
                                    <button class=\"btn btn-sm btn-outline-primary save-meal-review\" data-meal-id=\"${m.id}\">Save Meal Review</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    bindModalEvents() {
        const container = document.getElementById('dayDetailsContent');
        if (!container) return;

        // Star click handler (delegate)
        container.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.classList.contains('star') && target.closest('.rating-stars')) {
                const starsWrap = target.closest('.rating-stars');
                const value = parseInt(target.getAttribute('data-value')) || 0;
                starsWrap.setAttribute('data-value', value);
                // repaint
                starsWrap.querySelectorAll('.star').forEach((s, idx) => {
                    if (idx < value) {
                        s.classList.add('text-warning');
                        s.classList.remove('text-muted');
                    } else {
                        s.classList.add('text-muted');
                        s.classList.remove('text-warning');
                    }
                });
            }
        });

        // Save day review
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.save-day-review');
            if (!btn) return;
            const dayId = parseInt(btn.getAttribute('data-day-id'));
            const stars = container.querySelector('.rating-stars[data-type="day"][data-id="' + dayId + '"]');
            const rating = parseInt(stars?.getAttribute('data-value')) || 0;
            const notes = document.getElementById('dayReviewText')?.value || '';
            try {
                const res = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ client_rating: rating, client_feedback: notes })
                });
                if (res && res.success) {
                    this.showSuccess('Day review saved');
                    this.planDaysTable?.ajax?.reload(null, false);
                    this.loadPlanProgress();
                } else {
                    throw new Error(res?.error || 'Failed to save');
                }
            } catch (err) {
                console.error(err);
                this.showError('Failed to save day review');
            }
        });

        // Save workout review
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.save-workout-review');
            if (!btn) return;
            const workoutId = parseInt(btn.getAttribute('data-workout-id'));
            const stars = container.querySelector('.rating-stars[data-type="workout"][data-id="' + workoutId + '"]');
            const ratingStars = parseInt(stars?.getAttribute('data-value')) || 0;
            const effort = ratingStars * 2; // map 1..5 -> 2..10
            const notes = document.getElementById('workoutNotes_' + workoutId)?.value || '';
            try {
                const res = await APIBase.request(`/plan-management/api/v1/workout-plans/${workoutId}/rate_workout/`, {
                    method: 'POST',
                    body: JSON.stringify({ effort_rating: effort, notes })
                });
                if (res && res.success) {
                    this.showSuccess('Workout review saved');
                } else {
                    // Some viewsets return object directly without success flag
                    if (res && res.id) {
                        this.showSuccess('Workout review saved');
                    } else {
                        throw new Error(res?.error || 'Failed to save');
                    }
                }
            } catch (err) {
                console.error(err);
                this.showError('Failed to save workout review');
            }
        });

        // Save meal review
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.save-meal-review');
            if (!btn) return;
            const mealId = parseInt(btn.getAttribute('data-meal-id'));
            const stars = container.querySelector('.rating-stars[data-type="meal"][data-id="' + mealId + '"]');
            const rating = parseInt(stars?.getAttribute('data-value')) || 0;
            const notes = document.getElementById('mealNotes_' + mealId)?.value || '';
            try {
                const res = await APIBase.request(`/plan-management/api/v1/meal-plans/${mealId}/rate_meal/`, {
                    method: 'POST',
                    body: JSON.stringify({ rating, notes })
                });
                if (res && res.success) {
                    this.showSuccess('Meal review saved');
                } else {
                    // Some viewsets may return object directly
                    if (res && res.id) {
                        this.showSuccess('Meal review saved');
                    } else {
                        throw new Error(res?.error || 'Failed to save');
                    }
                }
            } catch (err) {
                console.error(err);
                this.showError('Failed to save meal review');
            }
        });

        // Save exercise rating
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.save-exercise-rating');
            if (!btn) return;
            const exId = parseInt(btn.getAttribute('data-exercise-id'));
            const stars = container.querySelector('.rating-stars[data-type="exercise"][data-id="' + exId + '"]');
            const starVal = parseInt(stars?.getAttribute('data-value')) || 0;
            const difficulty = starVal * 2; // map 1..5 -> 2..10
            try {
                const res = await APIBase.request(`/plan-management/api/v1/exercises/${exId}/rate_exercise/`, {
                    method: 'POST',
                    body: JSON.stringify({ difficulty })
                });
                if (res && (res.success || res.id)) {
                    this.showSuccess('Exercise rating saved');
                } else {
                    throw new Error(res?.error || 'Failed to save');
                }
            } catch (err) {
                console.error(err);
                this.showError('Failed to save exercise rating');
            }
        });
    }

    buildIngredientsHtml(ings) {
        if (!ings.length) return '';
        let html = '<div><strong>Ingredients:</strong><ul class="mt-2">';
        ings.forEach(ing => {
            const qty = [ing.quantity, ing.unit].filter(Boolean).join(' ');
            html += `<li>${ing.ingredient_name} ${qty ? '(' + qty + ')' : ''}</li>`;
        });
        html += '</ul></div>';
        return html;
    }

    async startDay(dayId) {
        try {
            const response = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/start_day/`, {
                method: 'POST'
            });

            if (response.success && response.data) {
                this.showSuccess('Day started successfully!');
                this.planDaysTable.ajax.reload();
                this.loadPlanProgress(); // Refresh progress
            } else {
                throw new Error(response.error || 'Failed to start day');
            }
        } catch (error) {
            console.error('Error starting day:', error);
            this.showError('Failed to start day');
        }
    }

    async completeDay(dayId) {
        try {
            const response = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/complete_day/`, {
                method: 'POST'
            });

            if (response.success && response.data) {
                this.showSuccess('Day completed successfully! Please add your rating.');
                this.planDaysTable.ajax.reload();
                this.loadPlanProgress(); // Refresh progress
                // Prompt for rating by opening the detailed day modal with review section
                this.viewDay(dayId);
            } else {
                throw new Error(response.error || 'Failed to complete day');
            }
        } catch (error) {
            console.error('Error completing day:', error);
            this.showError('Failed to complete day');
        }
    }

    async skipDay(dayId) {
        const reason = await utils.prompt({ title: 'Skip Day', label: 'Reason (optional)', placeholder: 'Optional reason', inputType: 'textarea', required: false });
        
        try {
            const response = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/skip_day/`, {
                method: 'POST',
                body: JSON.stringify({ reason: reason || '' })
            });

            if (response.success && response.data) {
                this.showSuccess('Day skipped successfully!');
                this.planDaysTable.ajax.reload();
                this.loadPlanProgress(); // Refresh progress
            } else {
                throw new Error(response.error || 'Failed to skip day');
            }
        } catch (error) {
            console.error('Error skipping day:', error);
            this.showError('Failed to skip day');
        }
    }

    async rescheduleDay(dayId) {
        const newDate = await utils.prompt({ title: 'Reschedule Day', label: 'New date', inputType: 'date', required: true });
        
        if (!newDate) return;

        try {
            const response = await APIBase.request(`/plan-management/api/v1/plan-days/${dayId}/reschedule_day/`, {
                method: 'POST',
                body: JSON.stringify({ new_date: newDate })
            });

            if (response.success && response.data) {
                this.showSuccess('Day rescheduled successfully!');
                this.planDaysTable.ajax.reload();
            } else {
                throw new Error(response.error || 'Failed to reschedule day');
            }
        } catch (error) {
            console.error('Error rescheduling day:', error);
            this.showError('Failed to reschedule day');
        }
    }

    showSuccess(message) {
        // Create or update success alert
        this.showAlert(message, 'success');
    }

    showError(message) {
        // Create or update error alert
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        // Prefer global toast utility if available
        if (window.utils && typeof window.utils.showToast === 'function') {
            const toastType = type === 'danger' ? 'danger' : (type || 'info');
            utils.showToast(message, toastType);
            return;
        }

        // Fallback: inline alert rendering
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const mainContent = document.querySelector('.container-fluid') || document.body;
        mainContent.insertBefore(alertDiv, mainContent.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.clientPlanDetail = new ClientPlanDetailManager();
});

/**
 * Dashboard JavaScript
 * Handles dashboard functionality, progress tracking, and analytics
 */

class DashboardManager {
    constructor() {
        this.progressChart = null;
        this.currentPeriod = 'week';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboardData();
        this.setTodayDate();
    }

    bindEvents() {
        // Log today button
        document.getElementById('logTodayBtn')?.addEventListener('click', () => {
            this.showLogTodayModal();
        });

        // Refresh dashboard
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Chart period buttons
        document.querySelectorAll('input[name="chartPeriod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.loadProgressChart();
            });
        });

        // Log today form
        document.getElementById('logTodayForm')?.addEventListener('submit', (e) => {
            this.handleLogToday(e);
        });

        // Add goal button
        document.getElementById('addGoalBtn')?.addEventListener('click', () => {
            this.showAddGoalModal();
        });

        // Add goal form
        document.getElementById('addGoalForm')?.addEventListener('submit', (e) => {
            this.handleAddGoal(e);
        });

        // Range inputs for mood and energy
        document.getElementById('energyLevel')?.addEventListener('input', (e) => {
            document.getElementById('energyValue').textContent = e.target.value;
        });

        document.getElementById('moodRating')?.addEventListener('input', (e) => {
            document.getElementById('moodValue').textContent = e.target.value;
        });

        // Quick action buttons
        document.getElementById('viewPlansBtn')?.addEventListener('click', () => {
            window.location.href = '/plan-management/my-plans/';
        });

        document.getElementById('messageCoachBtn')?.addEventListener('click', async () => {
            try {
                utils.showToast('Finding your coach...', 'info');
                
                // Get the client's active subscriptions to find their coach
                const response = await api.get('/plan-management/api/v1/plan-subscriptions/?is_active=true&status=active');
                
                if (response.ok) {
                    const data = await response.json();
                    const subscriptions = data.results || data;
                    
                    if (subscriptions && subscriptions.length > 0) {
                        // Find the first active subscription with a coach
                        const subscription = subscriptions.find(sub => {
                            return sub.product_plan && 
                                  (sub.product_plan.coach_user_id || 
                                   (sub.product_plan.coach && sub.product_plan.coach.user && sub.product_plan.coach.user.id));
                        });
                        
                        if (subscription) {
                            // Extract coach user ID from the subscription
                            let coachUserId = subscription.product_plan.coach_user_id;
                            
                            // If coach_user_id is not directly available, try to get it from the coach object
                            if (!coachUserId && subscription.product_plan.coach) {
                                if (subscription.product_plan.coach.user && subscription.product_plan.coach.user.id) {
                                    coachUserId = subscription.product_plan.coach.user.id;
                                } else {
                                    coachUserId = subscription.product_plan.coach.id;
                                }
                            }
                            
                            if (coachUserId) {
                                console.log('Found coach user ID:', coachUserId);
                                console.log('Opening chat with subscription context:', subscription.id);
                                
                                // Open the messaging page with coach and subscription context
                                window.location.href = `/messaging/chat/?plan_subscription_id=${subscription.id}&coach_user_id=${coachUserId}`;
                                return;
                            }
                        }
                    }
                    
                    // If no coach found, just open the general messaging page
                    utils.showToast('No active coach found. Opening general messages.', 'warning');
                    window.location.href = '/messaging/chat/';
                } else {
                    throw new Error('Failed to load subscriptions');
                }
            } catch (error) {
                console.error('Error finding coach:', error);
                utils.showToast('Error finding your coach. Opening general messages.', 'error');
                window.location.href = '/messaging/chat/';
            }
        });

        document.getElementById('browseNewPlansBtn')?.addEventListener('click', () => {
            window.location.href = '/plan-management/browse/';
        });

        document.getElementById('viewRatingsBtn')?.addEventListener('click', () => {
            window.location.href = '/plan-management/ratings/';
        });
    }

    setTodayDate() {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('todayDate').textContent = dateStr;
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadQuickStats(),
                this.loadProgressChart(),
                this.loadTodaysPlan(),
                this.loadActiveGoals(),
                this.loadRecentMilestones(),
                this.loadRecentActivity()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            utils.showToast('Failed to load dashboard data', 'danger');
        }
    }

    async loadQuickStats() {
        try {
            const response = await api.get('/plan-management/api/v1/plan-progress/');
            
            if (response.ok) {
                const progressData = await response.json();
                
                if (progressData.results && progressData.results.length > 0) {
                    const progress = progressData.results[0]; // Get first active progress
                    
                    document.getElementById('currentStreak').textContent = progress.current_streak || 0;
                    document.getElementById('completionRate').textContent = `${Math.round(progress.completion_percentage || 0)}%`;
                    document.getElementById('activePlans').textContent = progressData.results.length;
                }

                // Load goals count
                const goalsResponse = await api.get('/plan-management/api/v1/goal-tracking/?achieved_only=true');
                if (goalsResponse.ok) {
                    const goalsData = await goalsResponse.json();
                    document.getElementById('achievedGoals').textContent = goalsData.results?.length || 0;
                }
            }
        } catch (error) {
            console.error('Failed to load quick stats:', error);
        }
    }

    async loadProgressChart() {
        try {
            const params = new URLSearchParams({
                period: this.currentPeriod
            });

            const response = await api.get(`/plan-management/api/v1/plan-progress/analytics/?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderProgressChart(data);
            }
        } catch (error) {
            console.error('Failed to load progress chart:', error);
        }
    }

    renderProgressChart(data) {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.progressChart) {
            this.progressChart.destroy();
        }

        // Prepare chart data
        const chartData = {
            labels: data.completion_trend?.data?.map(d => d.week) || [],
            datasets: [
                {
                    label: 'Completion Rate (%)',
                    data: data.completion_trend?.data?.map(d => d.rate) || [],
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }
            ]
        };

        // Add wellness data if available
        if (data.wellness_trend?.data?.length > 0) {
            chartData.datasets.push({
                label: 'Wellness Score',
                data: data.wellness_trend.data.map(d => d.wellness_score * 20), // Scale to percentage
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                yAxisID: 'y1'
            });
        }

        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 100
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    async loadTodaysPlan() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await api.get(`/plan-management/api/v1/plan-days/?date=${today}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderTodaysPlan(data.results || []);
            }
        } catch (error) {
            console.error('Failed to load today\'s plan:', error);
        }
    }

    renderTodaysPlan(planDays) {
        const container = document.getElementById('todaysPlan');
        
        if (planDays.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-calendar-day fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No plans for today. Take a rest day or browse new plans!</p>
                </div>
            `;
            return;
        }

        let html = '';
        planDays.forEach(planDay => {
            html += `
                <div class="plan-day-card mb-3 p-3 border rounded ${planDay.is_completed ? 'bg-light' : ''}">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${planDay.plan_name}</h6>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" ${planDay.is_completed ? 'checked' : ''} 
                                   data-plan-day-id="${planDay.id}">
                            <label class="form-check-label">Completed</label>
                        </div>
                    </div>
                    
                    ${planDay.nutrition_plan ? `
                    <div class="mb-2">
                        <small class="text-muted"><i class="fas fa-utensils"></i> Nutrition:</small>
                        <span class="ms-2">${planDay.nutrition_plan.total_calories} calories</span>
                    </div>
                    ` : ''}
                    
                    ${planDay.workout_plan ? `
                    <div class="mb-2">
                        <small class="text-muted"><i class="fas fa-dumbbell"></i> Workout:</small>
                        <span class="ms-2">${planDay.workout_plan.estimated_duration} minutes</span>
                    </div>
                    ` : ''}
                    
                    <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-sm btn-outline-primary view-plan-day-btn" data-plan-day-id="${planDay.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${!planDay.is_completed ? `
                        <button class="btn btn-sm btn-success start-plan-day-btn" data-plan-day-id="${planDay.id}">
                            <i class="fas fa-play"></i> Start
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Bind events for plan day cards
        container.querySelectorAll('.view-plan-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planDayId = e.target.closest('button').dataset.planDayId;
                this.viewPlanDayDetails(planDayId);
            });
        });

        container.querySelectorAll('.start-plan-day-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planDayId = e.target.closest('button').dataset.planDayId;
                this.startPlanDay(planDayId);
            });
        });
    }

    async loadActiveGoals() {
        try {
            const response = await api.get('/plan-management/api/v1/goal-tracking/?active_only=true');
            
            if (response.ok) {
                const data = await response.json();
                this.renderActiveGoals(data.results || []);
            }
        } catch (error) {
            console.error('Failed to load active goals:', error);
        }
    }

    renderActiveGoals(goals) {
        const container = document.getElementById('activeGoals');
        
        if (goals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-target fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No active goals. Set some goals to track your progress!</p>
                </div>
            `;
            return;
        }

        let html = '';
        goals.forEach(goal => {
            const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            
            html += `
                <div class="goal-card mb-3 p-3 border rounded">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-0">${goal.title}</h6>
                        <small class="text-muted">${goal.goal_type}</small>
                    </div>
                    
                    <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar" role="progressbar" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted">${goal.current_value} / ${goal.target_value}</small>
                        <small class="text-muted">${Math.round(progress)}%</small>
                    </div>
                    
                    ${goal.target_date ? `
                    <div class="mt-2">
                        <small class="text-muted">Target: ${utils.formatDate(goal.target_date)}</small>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadRecentMilestones() {
        try {
            const response = await api.get('/plan-management/api/v1/plan-progress/milestone_progress/');
            
            if (response.ok) {
                const data = await response.json();
                this.renderRecentMilestones(data.recent_milestones || []);
            }
        } catch (error) {
            console.error('Failed to load recent milestones:', error);
        }
    }

    renderRecentMilestones(milestones) {
        const container = document.getElementById('recentMilestones');
        
        if (milestones.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-medal fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No milestones yet. Keep working towards your goals!</p>
                </div>
            `;
            return;
        }

        let html = '';
        milestones.forEach(milestone => {
            html += `
                <div class="milestone-card mb-3 p-3 border rounded bg-light">
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <i class="${milestone.badge_icon || 'fas fa-trophy'} fa-2x text-warning"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${milestone.title}</h6>
                            <p class="mb-1 small text-muted">${milestone.description}</p>
                            <small class="text-muted">${utils.formatDate(milestone.achieved_at)}</small>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadRecentActivity() {
        try {
            const response = await api.get('/plan-management/api/v1/daily-progress/?current_week=true');
            
            if (response.ok) {
                const data = await response.json();
                this.renderRecentActivity(data.results || []);
            }
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-history fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No recent activity. Start logging your progress!</p>
                </div>
            `;
            return;
        }

        let html = '';
        activities.forEach(activity => {
            html += `
                <div class="timeline-item d-flex mb-3">
                    <div class="timeline-marker me-3">
                        <div class="bg-primary rounded-circle" style="width: 12px; height: 12px;"></div>
                    </div>
                    <div class="timeline-content">
                        <h6 class="mb-1">${activity.day_completed ? 'Completed' : 'Logged'} daily progress</h6>
                        <p class="mb-1 small text-muted">
                            ${activity.workout_completed ? '✅ Workout completed' : '❌ Workout skipped'} • 
                            ${activity.diet_completed ? '✅ Diet followed' : '❌ Diet not followed'}
                        </p>
                        <small class="text-muted">${utils.formatDate(activity.date)}</small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    showLogTodayModal() {
        const modal = new bootstrap.Modal(document.getElementById('logTodayModal'));
        modal.show();
    }

    async handleLogToday(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const logData = {
            workout_completed: formData.get('workout_completed') === 'on',
            diet_completed: formData.get('diet_completed') === 'on',
            energy_level: parseInt(formData.get('energy_level')),
            mood_rating: parseInt(formData.get('mood_rating')),
            notes: formData.get('notes'),
            weight: formData.get('weight') ? parseFloat(formData.get('weight')) : null,
            sleep_hours: formData.get('sleep_hours') ? parseFloat(formData.get('sleep_hours')) : null
        };

        try {
            const response = await api.post('/plan-management/api/v1/daily-progress/log_today/', logData);
            
            if (response.ok) {
                utils.showToast('Progress logged successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('logTodayModal'));
                modal.hide();
                
                // Reset form
                e.target.reset();
                
                // Refresh dashboard
                this.loadDashboardData();
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to log progress', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to log progress');
        }
    }

    showAddGoalModal() {
        const modal = new bootstrap.Modal(document.getElementById('addGoalModal'));
        modal.show();
    }

    async handleAddGoal(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const goalData = {
            goal_type: formData.get('goal_type'),
            title: formData.get('title'),
            description: formData.get('description'),
            target_value: parseFloat(formData.get('target_value')),
            current_value: parseFloat(formData.get('current_value')),
            target_date: formData.get('target_date')
        };

        try {
            const response = await api.post('/plan-management/api/v1/goal-tracking/', goalData);
            
            if (response.ok) {
                utils.showToast('Goal added successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addGoalModal'));
                modal.hide();
                
                // Reset form
                e.target.reset();
                
                // Refresh goals
                this.loadActiveGoals();
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to add goal', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to add goal');
        }
    }

    async viewPlanDayDetails(planDayId) {
        // This would open a detailed view of the plan day
        window.location.href = `/plan-management/plan-day/${planDayId}/`;
    }

    async startPlanDay(planDayId) {
        try {
            const response = await api.post(`/plan-management/api/v1/plan-days/${planDayId}/start/`);
            
            if (response.ok) {
                utils.showToast('Plan day started!', 'success');
                this.loadTodaysPlan();
            } else {
                utils.handleApiError(response, 'Failed to start plan day');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to start plan day');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});

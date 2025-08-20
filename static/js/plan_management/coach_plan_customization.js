// Coach Plan Customization Management
class CoachPlanCustomizationManager {
    constructor() {
        this.subscriptionsTable = null;
        this.planDaysTable = null;
        this.currentSubscription = null;
        this.init();
    }

    async init() {
        try {
            // Only initialize the subscriptions DataTable if the table exists on this page
            if (document.getElementById('clientSubscriptionsTable')) {
                await this.initializeSubscriptionsTable();
            }
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize coach plan customization:', error);
            this.showError('Failed to load coach dashboard. Please refresh the page.');
        }
    }

    async initializeSubscriptionsTable() {
        try {
            if (this.subscriptionsTable) {
                this.subscriptionsTable.destroy();
            }

            const $table = $('#clientSubscriptionsTable');
            if ($table.length === 0) return; // Guard for pages without this table

            this.subscriptionsTable = $table.DataTable({
                processing: true,
                serverSide: false,
                ajax: {
                    url: '/plan-management/api/v1/coach-plan-customization/client_subscriptions/',
                    type: 'GET',
                    headers: {
                        'Authorization': `Bearer ${APIBase.getJWTToken()}`,
                        'X-CSRFToken': APIBase.getCSRFToken()
                    },
                    dataSrc: function(json) {
                        return Array.isArray(json) ? json : [];
                    },
                    error: function(xhr, error, code) {
                        console.error('Subscriptions AJAX error:', error, code);
                    }
                },
                columns: [
                    { 
                        data: 'client',
                        title: 'Client',
                        render: function(data, type, row) {
                            return `<div class="d-flex align-items-center">
                                <div class="avatar-sm me-2">
                                    <div class="avatar-title bg-primary rounded-circle">
                                        ${data.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div class="fw-medium">${data}</div>
                                    <small class="text-muted">Client</small>
                                </div>
                            </div>`;
                        }
                    },
                    { 
                        data: 'product_plan',
                        title: 'Plan',
                        render: function(data) {
                            return `<div>
                                <div class="fw-medium">${data.name}</div>
                                <small class="text-muted">${data.plan_type}</small>
                            </div>`;
                        }
                    },
                    { 
                        data: 'subscribed_at',
                        title: 'Subscribed',
                        render: function(data) {
                            return new Date(data).toLocaleDateString();
                        }
                    },
                    { 
                        data: 'status',
                        title: 'Status',
                        render: function(data) {
                            const statusClasses = {
                                'pending': 'badge-warning',
                                'active': 'badge-success',
                                'cancelled': 'badge-danger',
                                'completed': 'badge-info'
                            };
                            return `<span class="badge ${statusClasses[data] || 'badge-secondary'}">${data.charAt(0).toUpperCase() + data.slice(1)}</span>`;
                        }
                    },
                    { 
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-primary view-subscription" data-subscription-id="${row.id}">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    <button class="btn btn-sm btn-success customize-subscription" data-subscription-id="${row.id}">
                                        <i class="fas fa-edit"></i> Customize
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                order: [[2, 'desc']],
                pageLength: 10,
                responsive: true,
                language: {
                    emptyTable: "No client subscriptions found",
                    loadingRecords: "Loading subscriptions...",
                    processing: "Loading..."
                }
            });

        } catch (error) {
            console.error('Error initializing subscriptions table:', error);
            this.showError('Failed to load subscriptions table');
        }
    }

    async viewSubscriptionDetails(subscriptionId) {
        try {
            const resp = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${subscriptionId}/subscription_details/`, {
                method: 'GET'
            });
            if (!resp.success || !resp.data) {
                throw new Error(resp.error || 'Failed to load subscription details');
            }
            const data = resp.data;

            this.currentSubscription = data.subscription;
            this.displaySubscriptionDetails(data);
            
            // Show details modal
            const modal = new bootstrap.Modal(document.getElementById('subscriptionDetailsModal'));
            modal.show();

        } catch (error) {
            console.error('Error loading subscription details:', error);
            this.showError('Failed to load subscription details');
        }
    }

    displaySubscriptionDetails(data) {
        const { subscription, plan_days, statistics } = data;
        
        // Update modal content
        document.getElementById('modalClientName').textContent = subscription.client;
        document.getElementById('modalPlanName').textContent = subscription.product_plan.name;
        document.getElementById('modalSubscriptionStatus').innerHTML = `<span class="badge badge-${subscription.status === 'active' ? 'success' : 'secondary'}">${subscription.status}</span>`;
        
        // Update statistics
        document.getElementById('modalTotalDays').textContent = statistics.total_days;
        document.getElementById('modalCompletedDays').textContent = statistics.completed_days;
        document.getElementById('modalInProgressDays').textContent = statistics.in_progress_days;
        document.getElementById('modalNotStartedDays').textContent = statistics.not_started_days;
        
        // Calculate completion percentage
        const completionPercentage = statistics.total_days > 0 ? 
            (statistics.completed_days / statistics.total_days * 100).toFixed(1) : 0;
        document.getElementById('modalCompletionPercentage').textContent = `${completionPercentage}%`;
        
        // Update progress bar
        const progressBar = document.getElementById('modalProgressBar');
        if (progressBar) {
            progressBar.style.width = `${completionPercentage}%`;
            progressBar.setAttribute('aria-valuenow', completionPercentage);
        }
    }

    async customizePlan(subscriptionId) {
        try {
            // Track current subscription globally for other modules
            window.currentSubscriptionId = subscriptionId;
            const resp = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${subscriptionId}/subscription_details/`, {
                method: 'GET'
            });
            if (!resp.success || !resp.data) {
                throw new Error(resp.error || 'Failed to load plan for customization');
            }
            const data = resp.data;

            this.currentSubscription = data.subscription;

            // Show inline customization panel and update header
            const panel = document.getElementById('inlinePlanCustomizationPanel');
            if (panel) {
                panel.classList.remove('d-none');
                const nameEl = document.getElementById('customizationClientName');
                const planEl = document.getElementById('customizationPlanName');
                if (nameEl) nameEl.textContent = `${this.currentSubscription.client} — Plan Days`;
                if (planEl) planEl.textContent = `${this.currentSubscription.product_plan.name} (${this.currentSubscription.status})`;
            }

            // Initialize (or re-initialize) plan days table with new data
            this.initializePlanDaysCustomization(data.plan_days);

            // Scroll panel into view
            if (panel && typeof panel.scrollIntoView === 'function') {
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } catch (error) {
            console.error('Error loading plan for customization:', error);
            this.showError('Failed to load plan for customization');
        }
    }

    initializePlanDaysCustomization(planDays) {
        if (this.planDaysTable) {
            this.planDaysTable.destroy();
        }

        this.planDaysTable = $('#planDaysCustomizationTable').DataTable({
            data: planDays,
            columns: [
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
                    title: 'Date',
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
                        return `<span class="badge ${statusClasses[data] || 'badge-secondary'}">${data.replace('_', ' ')}</span>`;
                    }
                },
                { 
                    data: 'day_summary',
                    title: 'Content',
                    render: function(data) {
                        let content = [];
                        if (data.has_nutrition) content.push('<i class="fas fa-utensils text-success" title="Nutrition Plan"></i>');
                        if (data.has_workout) content.push('<i class="fas fa-dumbbell text-primary" title="Workout Plan"></i>');
                        return content.length > 0 ? content.join(' ') : '<span class="text-muted">No content</span>';
                    }
                },
                { 
                    data: null,
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        return `
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary pd-edit" data-day-id="${row.id}" title="Edit Day">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-success pd-notes" data-day-id="${row.id}" title="Add Notes">
                                    <i class="fas fa-sticky-note"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info pd-view" data-day-id="${row.id}" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            order: [[0, 'asc']],
            pageLength: 15,
            responsive: true,
            language: {
                emptyTable: "No plan days available",
                processing: "Loading..."
            }
        });
    }

    async editPlanDay(dayId) {
        // Find the day data
        const dayData = this.planDaysTable.data().toArray().find(day => day.id === dayId);
        if (!dayData) {
            this.showError('Day data not found');
            return;
        }

        // Populate edit form
        document.getElementById('editDayId').value = dayId;
        document.getElementById('editDayTitle').value = dayData.day_title || '';
        document.getElementById('editDayDescription').value = dayData.day_description || '';
        document.getElementById('editDayTheme').value = dayData.day_theme || '';
        document.getElementById('editCoachInstructions').value = dayData.coach_instructions || '';
        document.getElementById('editPlannedDifficulty').value = dayData.planned_difficulty || 'moderate';
        document.getElementById('editEstimatedDuration').value = dayData.estimated_duration_minutes || '';

        // Show edit modal
        const modal = new bootstrap.Modal(document.getElementById('editPlanDayModal'));
        modal.show();
    }

    async savePlanDayChanges() {
        const dayId = document.getElementById('editDayId').value;
        const dayData = {
            day_title: document.getElementById('editDayTitle').value,
            day_description: document.getElementById('editDayDescription').value,
            day_theme: document.getElementById('editDayTheme').value,
            coach_instructions: document.getElementById('editCoachInstructions').value,
            planned_difficulty: document.getElementById('editPlannedDifficulty').value,
            estimated_duration_minutes: parseInt(document.getElementById('editEstimatedDuration').value) || null
        };

        try {
            const resp = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${this.currentSubscription.id}/customize_plan_day/`, {
                method: 'POST',
                body: JSON.stringify({
                    day_id: dayId,
                    day_data: dayData
                })
            });

            if (!resp.success || !resp.data) {
                throw new Error(resp.error || 'Failed to update plan day');
            }
            const updatedDay = resp.data;

            if (updatedDay.id) {
                this.showSuccess('Plan day updated successfully!');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editPlanDayModal'));
                modal?.hide();
                
                // Refresh the customization view
                this.customizePlan(this.currentSubscription.id);
            } else {
                throw new Error('Failed to update plan day');
            }
        } catch (error) {
            console.error('Error updating plan day:', error);
            this.showError('Failed to update plan day');
        }
    }

    async addCoachNotes(dayId) {
        const notes = prompt('Enter coach notes for this day:');
        if (notes === null) return; // User cancelled

        try {
            const resp = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${this.currentSubscription.id}/add_coach_notes/`, {
                method: 'POST',
                body: JSON.stringify({
                    day_id: dayId,
                    notes: notes
                })
            });

            if (!resp.success || !resp.data) {
                throw new Error(resp.error || 'Failed to add coach notes');
            }
            
            if (resp.data.message) {
                this.showSuccess(resp.data.message);
            } else {
                throw new Error('Failed to add notes');
            }
        } catch (error) {
            console.error('Error adding coach notes:', error);
            this.showError('Failed to add coach notes');
        }
    }

    async regeneratePlanDays(subscriptionId) {
        if (!confirm('Are you sure you want to regenerate all plan days? This will reset any customizations.')) {
            return;
        }

        const regenBtn = document.getElementById('regeneratePlanDays');
        const prevHTML = regenBtn ? regenBtn.innerHTML : null;
        if (regenBtn) {
            regenBtn.disabled = true;
            regenBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Regenerating...`;
        }

        try {
            const resp = await APIBase.request(`/plan-management/api/v1/coach-plan-customization/${subscriptionId}/regenerate_plan_days/`, {
                method: 'POST'
            });

            if (!resp.success || !resp.data) {
                throw new Error(resp.error || 'Failed to regenerate plan days');
            }

            if (resp.data.message) {
                this.showSuccess(`${resp.data.message}`);
                // Guarded reload of subscriptions table
                if (this.subscriptionsTable && this.subscriptionsTable.ajax) {
                    this.subscriptionsTable.ajax.reload();
                }
                if (this.currentSubscription && this.currentSubscription.id === subscriptionId) {
                    this.customizePlan(subscriptionId);
                }
            } else {
                throw new Error('Failed to regenerate plan days');
            }
        } catch (error) {
            console.error('Error regenerating plan days:', error);
            this.showError('Failed to regenerate plan days');
        } finally {
            if (regenBtn) {
                regenBtn.innerHTML = prevHTML;
                regenBtn.disabled = false;
            }
        }
    }

    async viewDayDetails(dayId) {
        this.editPlanDay(dayId);
    }

    setupEventListeners() {
        // Save plan day changes
        document.getElementById('savePlanDayChanges')?.addEventListener('click', () => {
            this.savePlanDayChanges();
        });

        // Filter subscriptions
        document.getElementById('statusFilterCoach')?.addEventListener('change', (e) => {
            this.filterSubscriptions(e.target.value);
        });

        // Regenerate plan days button
        document.getElementById('regeneratePlanDays')?.addEventListener('click', () => {
            if (this.currentSubscription) {
                this.regeneratePlanDays(this.currentSubscription.id);
            }
        });

        // Customize button in subscription details modal
        document.getElementById('customizeFromDetails')?.addEventListener('click', () => {
            if (this.currentSubscription?.id) {
                const detailsModal = bootstrap.Modal.getInstance(document.getElementById('subscriptionDetailsModal'));
                if (detailsModal) detailsModal.hide();
                this.customizePlan(this.currentSubscription.id);
            }
        });

        // Delegated handlers for actions inside the subscriptions DataTable
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-subscription');
            if (viewBtn && viewBtn.dataset.subscriptionId) {
                const id = parseInt(viewBtn.dataset.subscriptionId, 10);
                if (!isNaN(id)) this.viewSubscriptionDetails(id);
            }

            const customizeBtn = e.target.closest('.customize-subscription');
            if (customizeBtn && customizeBtn.dataset.subscriptionId) {
                const id = parseInt(customizeBtn.dataset.subscriptionId, 10);
                if (!isNaN(id)) this.customizePlan(id);
            }

            // Delegated plan day actions within DataTable (class-based)
            const planDayEditBtn = e.target.closest('.pd-edit');
            if (planDayEditBtn && planDayEditBtn.dataset.dayId) {
                const id = parseInt(planDayEditBtn.dataset.dayId, 10);
                if (!isNaN(id)) this.editPlanDay(id);
            }

            const planDayNotesBtn = e.target.closest('.pd-notes');
            if (planDayNotesBtn && planDayNotesBtn.dataset.dayId) {
                const id = parseInt(planDayNotesBtn.dataset.dayId, 10);
                if (!isNaN(id)) this.addCoachNotes(id);
            }

            const planDayViewBtn = e.target.closest('.pd-view');
            if (planDayViewBtn && planDayViewBtn.dataset.dayId) {
                const id = parseInt(planDayViewBtn.dataset.dayId, 10);
                if (!isNaN(id)) this.viewDayDetails(id);
            }
        });
    }

    filterSubscriptions(status) {
        let url = '/plan-management/api/v1/coach-plan-customization/client_subscriptions/';
        if (status && status !== 'all') {
            url += `?status=${status}`;
        }
        this.subscriptionsTable.ajax.url(url).load();
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at the top of the main content
        const mainContent = document.querySelector('.container-fluid') || document.body;
        mainContent.insertBefore(alertDiv, mainContent.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.coachCustomization = new CoachPlanCustomizationManager();

    // Deep link: auto-open customization when subscription_id is present
    const params = new URLSearchParams(window.location.search);
    const subId = params.get('subscription_id');
    if (subId && /^\d+$/.test(subId)) {
        window.coachCustomization.customizePlan(parseInt(subId, 10));
    }
});

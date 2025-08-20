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
            const response = await APIBase.request(`/plan-management/api/v1/client/plan-progress/${this.subscriptionId}/`, {
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
        // Update progress circle
        const progressCircle = document.querySelector('.progress-circle .percentage');
        const progressBar = document.querySelector('.progress-circle .progress-bar');
        
        if (progressCircle && progressData.stats) {
            progressCircle.textContent = `${progressData.stats.completion_percentage}%`;
            if (progressBar) {
                progressBar.style.strokeDasharray = `${progressData.stats.completion_percentage * 2.51}, 251`;
            }
        }

        // Update stats
        const statsElements = {
            'completed-days': progressData.stats?.completed_days || 0,
            'total-days': progressData.stats?.total_days || 0,
            'days-remaining': progressData.stats?.days_remaining || 0
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
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
                        render: function(data) {
                            if (!data) return '-';
                            return '★'.repeat(data) + '☆'.repeat(5 - data);
                        }
                    },
                    { 
                        data: null,
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            let actions = '';
                            
                            if (row.completion_status === 'not_started') {
                                actions += `<button class="btn btn-sm btn-primary me-1" onclick="clientPlanDetail.startDay(${row.id})">Start</button>`;
                            }
                            
                            if (row.completion_status === 'in_progress') {
                                actions += `<button class="btn btn-sm btn-success me-1" onclick="clientPlanDetail.completeDay(${row.id})">Complete</button>`;
                            }
                            
                            if (row.completion_status !== 'completed') {
                                actions += `<button class="btn btn-sm btn-warning me-1" onclick="clientPlanDetail.skipDay(${row.id})">Skip</button>`;
                                actions += `<button class="btn btn-sm btn-info" onclick="clientPlanDetail.rescheduleDay(${row.id})">Reschedule</button>`;
                            }
                            
                            return actions || '-';
                        }
                    }
                ],
                order: [[0, 'asc']],
                pageLength: 10,
                responsive: true,
                language: {
                    emptyTable: "No plan days available",
                    loadingRecords: "Loading plan days...",
                    processing: "Loading..."
                }
            });

        } catch (error) {
            console.error('Error initializing plan days table:', error);
            this.showError('Failed to load plan days table');
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.getElementById('filterAll')?.addEventListener('click', () => this.filterPlanDays('all'));
        document.getElementById('filterToday')?.addEventListener('click', () => this.filterPlanDays('today'));
        document.getElementById('filterUpcoming')?.addEventListener('click', () => this.filterPlanDays('upcoming'));

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
                this.showSuccess('Day completed successfully!');
                this.planDaysTable.ajax.reload();
                this.loadPlanProgress(); // Refresh progress
            } else {
                throw new Error(response.error || 'Failed to complete day');
            }
        } catch (error) {
            console.error('Error completing day:', error);
            this.showError('Failed to complete day');
        }
    }

    async skipDay(dayId) {
        const reason = prompt('Please provide a reason for skipping this day (optional):');
        
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
        const newDate = prompt('Please enter the new date (YYYY-MM-DD):');
        
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
    window.clientPlanDetail = new ClientPlanDetailManager();
});

/**
 * Staff Dashboard Controller
 * Handles rendering of dashboard statistics and charts
 */
document.addEventListener('DOMContentLoaded', function() {
    const charts = {};
    let metricsData = null;

    // Chart config
    const chartColors = {
        primary: '#4e73df',
        success: '#1cc88a',
        info: '#36b9cc',
        warning: '#f6c23e',
        danger: '#e74a3b',
        secondary: '#858796',
        light: '#f8f9fc',
        dark: '#5a5c69'
    };

    // Chart options
    const chartOptions = {
        maintainAspectRatio: false,
        layout: {
            padding: {
                left: 10,
                right: 10,
                top: 10,
                bottom: 10
            }
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom'
            }
        }
    };

    // Initialize dashboard
    function initDashboard() {
        fetchDashboardMetrics();
    }

    // Fetch metrics from API
    async function fetchDashboardMetrics() {
        try {
            showLoading();
            const response = await StaffAPI.dashboard.metrics();
            
            console.log('Dashboard metrics response:', response);
            
            if (response && response.success && response.data) {
                metricsData = response.data;
                updateStats();
                renderCharts();
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Error fetching dashboard metrics:', err);
            window.utils.showToast('Failed to load dashboard metrics', 'danger');
        } finally {
            hideLoading();
        }
    }

    // Update stat counters
    function updateStats() {
        if (!metricsData) return;
        
        // User stats
        const users = metricsData.users || {};
        updateElementText('statUsersTotal', users.total || 0);
        updateElementText('statUsersClients', users.clients || 0);
        updateElementText('statUsersCoaches', users.coaches || 0);
        updateElementText('statUsersStaff', users.staff || 0);
        
        // Pending approvals - support both structures
        const approvals = metricsData.approvals || metricsData.pending_approvals || {};
        updateElementText('statPendingCoaches', approvals.coaches_pending || 0);
        updateElementText('statPendingCerts', approvals.certifications_pending || 0);
    }
    
    // Safely update element text content
    function updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    // Render dashboard charts
    function renderCharts() {
        if (!metricsData) return;
        
        renderUserRolesChart();
        renderPlansOverviewChart();
    }

    // Render user roles pie chart
    function renderUserRolesChart() {
        const ctx = document.getElementById('chartUsersByRole');
        if (!ctx) return;

        const userData = metricsData.users || {};
        
        if (charts.userRoles) {
            charts.userRoles.destroy();
        }
        
        charts.userRoles = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Clients', 'Coaches', 'Staff'],
                datasets: [{
                    data: [
                        userData.clients || 0,
                        userData.coaches || 0,
                        userData.staff || 0
                    ],
                    backgroundColor: [
                        chartColors.primary,
                        chartColors.success,
                        chartColors.warning
                    ],
                    hoverBackgroundColor: [
                        chartColors.primary,
                        chartColors.success,
                        chartColors.warning
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    legend: {
                        ...chartOptions.plugins.legend,
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Render plans overview bar chart
    function renderPlansOverviewChart() {
        const ctx = document.getElementById('chartPlansOverview');
        if (!ctx) return;

        // Handle the specific structure from the backend
        const plansData = metricsData.plans || {};
        
        // Extract request data with fallbacks
        const requestData = plansData.requests || {};
        const requestsPending = requestData.pending || 0;
        const requestsApproved = requestData.approved || 0;
        const requestsRejected = requestData.rejected || 0;
        const requestsCancelled = requestData.cancelled || 0;
        
        // Extract subscription data with fallbacks
        const subsData = plansData.subscriptions || {};
        const subsPending = subsData.pending || 0;
        const subsActive = subsData.active || 0;
        const subsExpired = subsData.expired || 0;
        const subsCancelled = subsData.cancelled || 0;
        
        if (charts.plansOverview) {
            charts.plansOverview.destroy();
        }
        
        charts.plansOverview = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pending', 'Approved/Active', 'Rejected/Expired', 'Cancelled'],
                datasets: [
                    {
                        label: 'Plan Requests',
                        backgroundColor: chartColors.primary,
                        data: [requestsPending, requestsApproved, requestsRejected, requestsCancelled]
                    },
                    {
                        label: 'Plan Subscriptions',
                        backgroundColor: chartColors.success,
                        data: [subsPending, subsActive, subsExpired, subsCancelled]
                    }
                ]
            },
            options: {
                ...chartOptions,
                scales: {
                    x: {
                        stacked: false
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Show loading state on dashboard
    function showLoading() {
        const containers = document.querySelectorAll('.dashboard-stats-loading');
        containers.forEach(container => {
            container.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
        });
    }

    // Hide loading state
    function hideLoading() {
        const containers = document.querySelectorAll('.dashboard-stats-loading');
        containers.forEach(container => {
            container.innerHTML = '';
        });
    }

    // Initialize
    initDashboard();
});

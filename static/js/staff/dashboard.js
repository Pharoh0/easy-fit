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
            metricsData = await StaffAPI.dashboard.metrics();
            updateStats();
            renderCharts();
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
        document.getElementById('statUsersTotal').textContent = metricsData.users.total || 0;
        document.getElementById('statUsersClients').textContent = metricsData.users.clients || 0;
        document.getElementById('statUsersCoaches').textContent = metricsData.users.coaches || 0;
        document.getElementById('statUsersStaff').textContent = metricsData.users.staff || 0;
        
        // Pending approvals
        document.getElementById('statPendingCoaches').textContent = metricsData.pending_approvals.coaches || 0;
        document.getElementById('statPendingCerts').textContent = metricsData.pending_approvals.certifications || 0;
    }

    // Render dashboard charts
    function renderCharts() {
        if (!metricsData) return;
        
        renderUserRolesChart();
        renderPlansOverviewChart();
    }

    // Render user roles pie chart
    function renderUserRolesChart() {
        const ctx = document.getElementById('userRolesChart');
        if (!ctx) return;

        const userData = metricsData.users;
        
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
        const ctx = document.getElementById('plansOverviewChart');
        if (!ctx) return;

        const plansData = metricsData.plans || {
            plan_requests: { pending: 0, approved: 0, rejected: 0, cancelled: 0 },
            plan_subscriptions: { active: 0, pending: 0, expired: 0, cancelled: 0 }
        };
        
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
                        data: [
                            plansData.plan_requests.pending || 0,
                            plansData.plan_requests.approved || 0,
                            plansData.plan_requests.rejected || 0,
                            plansData.plan_requests.cancelled || 0
                        ]
                    },
                    {
                        label: 'Plan Subscriptions',
                        backgroundColor: chartColors.success,
                        data: [
                            plansData.plan_subscriptions.pending || 0,
                            plansData.plan_subscriptions.active || 0,
                            plansData.plan_subscriptions.expired || 0,
                            plansData.plan_subscriptions.cancelled || 0
                        ]
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

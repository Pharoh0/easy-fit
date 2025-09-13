/**
 * Staff Dashboard Controller
 * Handles rendering of dashboard statistics and charts
 */
document.addEventListener('DOMContentLoaded', function() {
    const charts = {};
    let metricsData = null;
    let reportData = null;

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
        // Hook filters
        const applyBtn = document.getElementById('btnApplyFilters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                fetchDashboardReport();
            });
        }
        // Initial report
        fetchDashboardReport();
        // Quick ranges
        document.querySelectorAll('.filters-toolbar [data-range]')?.forEach(btn => {
            btn.addEventListener('click', () => applyQuickRange(btn.getAttribute('data-range')));
        });
        // Reset
        const resetBtn = document.getElementById('btnResetFilters');
        resetBtn && resetBtn.addEventListener('click', () => resetFilters());
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
        // If we have filtered report data, prefer it for user totals and derived stats
        if (reportData) {
            const u = reportData.users_by_role || {};
            const total = (u.client || 0) + (u.coach || 0) + (u.staff || 0);
            updateElementText('statUsersTotal', total);
            updateElementText('statUsersClients', u.client || 0);
            updateElementText('statUsersCoaches', u.coach || 0);
            updateElementText('statUsersStaff', u.staff || 0);
            // Extra stats if present in DOM
            const subs = (reportData.subscriptions_by_status || {});
            updateElementText('statActiveSubsFiltered', subs.active || 0);
            updateElementText('chipSubsPending', subs.pending || 0);
            updateElementText('chipSubsActive', subs.active || 0);
            updateElementText('chipSubsExpired', subs.expired || 0);
            updateElementText('chipSubsCancelled', subs.cancelled || 0);
            const reqs = (reportData.requests_by_status || {});
            const reqTotal = Object.values(reqs).reduce((a,b)=>a+(b||0),0);
            updateElementText('statRequestsTotalFiltered', reqTotal);
            updateElementText('chipReqPending', reqs.pending || 0);
            updateElementText('chipReqApproved', (reqs.approved || reqs.accepted || 0));
            updateElementText('chipReqRejected', reqs.rejected || 0);
            updateElementText('chipReqCancelled', reqs.cancelled || 0);
        } else if (metricsData) {
            // Fallback to initial summary metrics
            const users = metricsData.users || {};
            updateElementText('statUsersTotal', users.total || 0);
            updateElementText('statUsersClients', users.clients || 0);
            updateElementText('statUsersCoaches', users.coaches || 0);
            updateElementText('statUsersStaff', users.staff || 0);
        }

        // Pending approvals (not filter-based)
        if (reportData) {
            // Pending are global, but we still display them alongside activity for context
            const approvals = reportData.approvals || {};
            updateElementText('statPendingCoaches', approvals.coaches_pending || 0);
            updateElementText('statPendingCerts', approvals.certifications_pending || 0);
            // Optionally display activity counts if elements exist
            const act = reportData.approvals_activity || {};
            updateElementText('statCoachesApprovedInRange', act.coaches_approved || 0);
            updateElementText('statCertsApprovedInRange', act.certs_approved || 0);
            updateElementText('statCertsRejectedInRange', act.certs_rejected || 0);
        } else if (metricsData) {
            const approvals = metricsData.approvals || metricsData.pending_approvals || {};
            updateElementText('statPendingCoaches', approvals.coaches_pending || 0);
            updateElementText('statPendingCerts', approvals.certifications_pending || 0);
        }
    }
    
    // Safely update element text content
    function updateElementText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    // Render dashboard charts
    function renderCharts() {
        // Use reportData (filtered) if available; otherwise fallback to metricsData
        renderUserRolesChart();
        renderPlansOverviewChart();
        renderSeriesCharts();
    }

    // Render user roles pie chart
    function renderUserRolesChart() {
        const ctx = document.getElementById('chartUsersByRole');
        if (!ctx) return;
        let clients = 0, coaches = 0, staff = 0;
        if (reportData && reportData.users_by_role) {
            clients = reportData.users_by_role.client || 0;
            coaches = reportData.users_by_role.coach || 0;
            staff = reportData.users_by_role.staff || 0;
        } else if (metricsData && metricsData.users) {
            const userData = metricsData.users;
            clients = userData.clients || 0;
            coaches = userData.coaches || 0;
            staff = userData.staff || 0;
        }
        
        if (charts.userRoles) {
            charts.userRoles.destroy();
        }
        
        charts.userRoles = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Clients', 'Coaches', 'Staff'],
                datasets: [{
                    data: [clients, coaches, staff],
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
        let requestsPending = 0, requestsApproved = 0, requestsRejected = 0, requestsCancelled = 0;
        let subsPending = 0, subsActive = 0, subsExpired = 0, subsCancelled = 0;

        if (reportData) {
            const req = reportData.requests_by_status || {};
            const sub = reportData.subscriptions_by_status || {};
            requestsPending = req.pending || 0;
            requestsApproved = (req.approved || req.accepted || 0); // tolerate naming
            requestsRejected = req.rejected || 0;
            requestsCancelled = req.cancelled || 0;
            subsPending = sub.pending || 0;
            subsActive = sub.active || 0;
            subsExpired = sub.expired || 0;
            subsCancelled = sub.cancelled || 0;
        } else if (metricsData) {
            const plansData = metricsData.plans || {};
            const requestData = plansData.requests || {};
            requestsPending = requestData.pending || 0;
            requestsApproved = requestData.approved || 0;
            requestsRejected = requestData.rejected || 0;
            requestsCancelled = requestData.cancelled || 0;
            const subsData = plansData.subscriptions || {};
            subsPending = subsData.pending || 0;
            subsActive = subsData.active || 0;
            subsExpired = subsData.expired || 0;
            subsCancelled = subsData.cancelled || 0;
        }
        
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

    // Fetch filterable report
    async function fetchDashboardReport() {
        try {
            const filters = getCurrentFilters();
            const resp = await StaffAPI.dashboard.report(filters);
            if (resp && resp.success && resp.data) {
                reportData = resp.data;
                renderSeriesCharts();
            }
        } catch (e) {
            console.error('Failed to load report', e);
        }
    }

    function getCurrentFilters() {
        const get = (id) => (document.getElementById(id)?.value || '').trim();
        return {
            start: get('filterStart'),
            end: get('filterEnd'),
            role: get('filterRole'),
            plan_status: get('filterPlanStatus'),
        };
    }

    function applyQuickRange(type) {
        const startEl = document.getElementById('filterStart');
        const endEl = document.getElementById('filterEnd');
        const today = new Date();
        const setDate = (d) => d.toISOString().slice(0,10);
        let startDate = '';
        if (type === '7d') {
            const d = new Date(today); d.setDate(d.getDate()-7); startDate = setDate(d);
        } else if (type === '30d') {
            const d = new Date(today); d.setDate(d.getDate()-30); startDate = setDate(d);
        } else if (type === '90d') {
            const d = new Date(today); d.setDate(d.getDate()-90); startDate = setDate(d);
        } else if (type === 'ytd') {
            const d = new Date(today.getFullYear(), 0, 1); startDate = setDate(d);
        } else {
            startDate = '';
        }
        startEl && (startEl.value = startDate);
        endEl && (endEl.value = setDate(today));
        fetchDashboardReport();
    }

    function resetFilters() {
        ['filterStart','filterEnd','filterRole','filterPlanStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') el.value = '';
            else el.value = '';
        });
        fetchDashboardReport();
    }

    function updateFilterSummary() {
        const s = document.getElementById('filterSummary');
        if (!s) return;
        const f = getCurrentFilters();
        const parts = [];
        if (f.start) parts.push(`From ${f.start}`);
        if (f.end) parts.push(`to ${f.end}`);
        if (f.role) parts.push(`role=${f.role}`);
        if (f.plan_status) parts.push(`status=${f.plan_status}`);
        s.textContent = parts.length ? parts.join(' • ') : 'No filters applied';
    }

    // Render timeseries charts using reportData
    function renderSeriesCharts() {
        if (!reportData) return;
        const usersCtx = document.getElementById('chartUsersSeries');
        const subsCtx = document.getElementById('chartSubsSeries');
        if (!usersCtx || !subsCtx) return;

        const usersSeries = reportData.series?.users_per_month || {};
        const subsSeries = reportData.series?.subs_per_month || {};
        let labels = Array.from(new Set([...Object.keys(usersSeries), ...Object.keys(subsSeries)])).sort();
        // Ensure we have at least the last 6 months if empty
        if (!labels.length) {
            labels = buildLastNMonthsLabels(6);
        }

        // Users chart
        if (charts.usersSeries) charts.usersSeries.destroy();
        charts.usersSeries = new Chart(usersCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Users',
                    data: labels.map(l => usersSeries[l] || 0),
                    borderColor: chartColors.primary,
                    backgroundColor: 'rgba(78,115,223,0.1)',
                    tension: .25,
                    fill: true,
                }]
            },
            options: chartOptions
        });

        // Subs chart
        if (charts.subsSeries) charts.subsSeries.destroy();
        charts.subsSeries = new Chart(subsCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Subscriptions',
                    data: labels.map(l => subsSeries[l] || 0),
                    borderColor: chartColors.success,
                    backgroundColor: 'rgba(28,200,138,0.1)',
                    tension: .25,
                    fill: true,
                }]
            },
            options: chartOptions
        });
    }

    function buildLastNMonthsLabels(n) {
        const arr = [];
        const d = new Date();
        d.setDate(1);
        for (let i = n - 1; i >= 0; i--) {
            const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
            const y = dt.getFullYear();
            const m = String(dt.getMonth()+1).padStart(2,'0');
            arr.push(`${y}-${m}`);
        }
        return arr;
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

/* Coach Dashboard JS
 * - Loads quick stats, analytics, and insights using JWT via APIBase + CoachAnalyticsAPI
 * - Renders Chart.js charts and initializes DataTables
 */
(function () {
    let measurementFrequencyChart = null;
    let clientDistributionChart = null;
    let planPerformanceChart = null;
    let topClientsTable = null;
    let revenueTrendChart = null;
    let lastAppliedState = null;
    // Server-driven pagination for Top Clients
    let topClientsLimit = 5;
    let topClientsOffset = 0;
    let topClientsTotal = 0;
    // Cache of plans for dropdown label rendering
    let plansCache = [];
    // Cache of clients for dropdown label rendering
    let clientsCache = [];

    $(document).ready(function () {
        setupFiltersUI();
        // Load coach plans for the Plan dropdown before applying UI
        loadCoachPlans().then(() => {
            // no-op; dropdown will be filled
        }).catch(() => {});
        // Preload coach clients (first page) for the Client dropdown
        loadCoachClients('').catch(() => {});
        const initialState = parseFiltersFromURL();
        applyStateToUI(initialState);
        lastAppliedState = initialState;
        // Parse pagination from URL and sync UI
        parsePaginationFromURL();
        // Ensure URL reflects the current state and pagination for consistency with backend queries
        updateUrlWithState(initialState);
        initCoachDashboard(initialState);
    });

    async function initCoachDashboard(options = {}) {
        console.debug('Initializing coach dashboard with options:', options);
        // Ensure options is not null/undefined
        options = options || {};
        
        // Ensure the options object is properly formatted
        if (typeof options !== 'object') {
            console.warn('Invalid options format, resetting to empty object');
            options = {};
        }

    async function loadCoachClients(searchTerm = '') {
        try {
            // Build query using current UI state (plan/category filters should scope the clients)
            const state = collectStateFromUI();
            const params = buildQueryOptionsFromState(state);
            if (searchTerm) params.q = searchTerm;
            const usp = new URLSearchParams(params);
            if (!usp.get('limit')) usp.set('limit', '20');
            const url = `/plan-management/api/v1/coach/clients/?${usp.toString()}`;
            const res = await APIBase.request(url);
            const results = (res && res.success && Array.isArray(res.results)) ? res.results : [];
            clientsCache = results;
            const menu = document.querySelector('.clients-menu');
            if (menu) {
                // Keep the first item (All clients)
                const first = menu.querySelector('li');
                menu.innerHTML = '';
                if (first) menu.appendChild(first);
                results.forEach(c => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a class="dropdown-item" href="#" data-value="${c.id}">${c.name || ('Client #' + c.id)}</a>`;
                    menu.appendChild(li);
                });
                if (results.length === 0) {
                    const li = document.createElement('li');
                    li.innerHTML = `<div class="dropdown-item text-muted">No clients</div>`;
                    menu.appendChild(li);
                }
            }
        } catch (e) {
            console.warn('Failed to load coach clients', e);
        }
    }

    async function loadCoachPlans() {
        try {
            // Pull coach plans (scoped by backend to current coach), page_size large enough for dropdown
            const url = '/plan-management/api/v1/product-plans/?page_size=100';
            const res = await APIBase.request(url);
            const data = (res && res.success) ? res.data : null;
            const results = data && (Array.isArray(data) ? data : data.results);
            plansCache = Array.isArray(results) ? results : [];
            // Fill dropdown
            const menu = document.querySelector('.plans-menu');
            if (menu) {
                // Preserve the first "All plans" item
                const keepFirst = menu.querySelector('li');
                menu.innerHTML = '';
                if (keepFirst) menu.appendChild(keepFirst);
                plansCache.forEach(p => {
                    const li = document.createElement('li');
                    li.innerHTML = `<a class="dropdown-item" href="#" data-value="${p.id}">${p.name || ('Plan #' + p.id)}</a>`;
                    menu.appendChild(li);
                });
            }
        } catch (e) {
            console.warn('Failed to load coach plans for dropdown', e);
        }
    }

    async function loadRevenueMetrics(options = {}) {
        try {
            const queryOptions = buildQueryOptionsFromState(options);
            console.debug('Loading revenue metrics with options:', queryOptions);

            // Fetch
            const res = await CoachAnalyticsAPI.getRevenueMetrics(queryOptions);
            if (!(res && res.success && res.revenue)) {
                console.warn('No revenue data available', res);
                const el = document.getElementById('revenueTrendChart');
                if (el) {
                    const card = el.closest('.card');
                    const target = (card && card.querySelector('.card-body')) || (card || el);
                    target.innerHTML = '<div class="text-center text-muted p-4">No data</div>';
                }
                return;
            }
            const rev = res.revenue;
            const total = Number(rev.total_revenue || 0);
            const currency = rev.currency || 'USD';
            const statEl = document.getElementById('statRevenue');
            if (statEl) statEl.textContent = CoachAnalyticsAPI.formatCurrency(total, currency);

            // Prepare trend data
            const labels = (rev.monthly_trend || []).map(x => x.month);
            const values = (rev.monthly_trend || []).map(x => x.revenue);

            const ctx = document.getElementById('revenueTrendChart');
            if (!ctx) return;
            if (revenueTrendChart) {
                try { revenueTrendChart.destroy(); } catch (e) {}
            }
            revenueTrendChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Revenue',
                        data: values,
                        backgroundColor: 'rgba(99, 102, 241, 0.7)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        maxBarThickness: 36,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: {
                                callback: function(value) { return CoachAnalyticsAPI.formatCurrency(value, currency); }
                            }
                        },
                        x: {
                            grid: { display: false }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const v = context.parsed.y;
                                    return CoachAnalyticsAPI.formatCurrency(v, currency);
                                }
                            }
                        },
                        legend: { display: false }
                    }
                }
            });
        } catch (e) {
            console.error('Error loading revenue metrics', e);
        }
    }
        
        // Show loading state (avoid replacing quick stats DOM which we will update in-place)
        ['analyticsContainer', 'insightsSummaryContainer', 'topClientsTableContainer'].forEach(id => {
            const container = document.getElementById(id);
            if (container) APIBase.showLoading(id);
        });
        
        // Load all sections in parallel with current filter options
        await Promise.allSettled([
            loadQuickStats(options),
            loadAnalytics(options),
            loadMeasurementInsights(options),
            loadRevenueMetrics(options),
        ]);
        
        console.debug('Dashboard initialization completed');
    }

    function updateTopClientsPagerUI() {
        const infoEl = document.getElementById('topClientsPageInfo');
        const btnPrev = document.getElementById('btnTopPrev');
        const btnNext = document.getElementById('btnTopNext');
        if (!infoEl || !btnPrev || !btnNext) return;

        const start = topClientsTotal === 0 ? 0 : (topClientsOffset + 1);
        const end = Math.min(topClientsOffset + topClientsLimit, topClientsTotal);
        infoEl.textContent = `Showing ${start}–${end} of ${topClientsTotal}`;

        // Enable/disable buttons
        btnPrev.disabled = (topClientsOffset <= 0);
        btnNext.disabled = (topClientsOffset + topClientsLimit >= topClientsTotal);

        // Sync page size selector if present
        const sel = document.getElementById('topClientsPageSize');
        if (sel) {
            const val = String(topClientsLimit);
            if (sel.value !== val) sel.value = val;
        }
    }

    async function loadQuickStats(options = {}) {
        try {
            // Ensure options are properly passed and logged
            const queryOptions = buildQueryOptionsFromState(options);
            console.debug('Loading quick stats with options:', queryOptions);
            
            const res = await CoachAnalyticsAPI.getClientStats(queryOptions);
            if (res && res.success && res.stats) {
                const s = res.stats;
                $('#statTotalClients').text(s.total_clients ?? 0);
                $('#statActiveSubs').text(s.active_subscriptions ?? 0);
                $('#statRecentMeasurements').text(s.recent_measurements ?? 0);
                $('#statEngagementRate').text(((s.engagement_rate ?? 0)).toString() + '%');
                if (typeof s.new_subscriptions !== 'undefined') {
                    const el = document.getElementById('statNewSubs');
                    if (el) el.textContent = s.new_subscriptions;
                }
                // Render client distribution donut
                try {
                    const canvas = document.getElementById('clientDistributionChart');
                    if (canvas) {
                        const total = Number(s.total_clients || 0);
                        const active = Number(s.active_clients || 0);
                        const inactive = Math.max(0, total - active);
                        const engaged = Number(s.active_subscriptions || 0); // proxy
                        if (clientDistributionChart) { try { clientDistributionChart.destroy(); } catch (e) {} }
                        clientDistributionChart = new Chart(canvas, {
                            type: 'doughnut',
                            data: {
                                labels: ['Active', 'Engaged', 'Inactive'],
                                datasets: [{
                                    data: [active, engaged, inactive],
                                    backgroundColor: ['#3b82f6','#22c55e','#8b5cf6'],
                                    borderWidth: 0,
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '70%',
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        callbacks: {
                                            label: function(ctx) {
                                                const val = ctx.parsed;
                                                const tot = (active + engaged + inactive) || 1;
                                                const pct = Math.round((val / tot) * 100);
                                                return `${ctx.label}: ${val} (${pct}%)`;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                        const centerVal = document.getElementById('distributionCenterValue');
                        if (centerVal) centerVal.textContent = String(total);
                    }
                } catch (e) { /* ignore */ }

                // Ensure plan performance donut in its own container
                await loadPlanPerformanceChart(options);

                console.debug('Quick stats loaded successfully');
            } else {
                console.warn('Failed to load quick stats', res);
                // Show user feedback for empty data
                if (!res || !res.stats) {
                    APIBase.showEmptyState('quickStatsContainer', 'No data');
                }
            }
        } catch (e) {
            console.error('Error loading quick stats', e);
        }
    }

    async function loadAnalytics(options = {}) {
        try {
            // Ensure options are properly passed and logged
            const queryOptions = buildQueryOptionsFromState(options);
            console.debug('Loading analytics with options:', queryOptions);
            
            // Check if container exists
            const container = document.getElementById('analyticsContainer');
            if (!container) {
                console.warn('Analytics container not found');
                return;
            }
            
            // Show loading indicator
            APIBase.showLoading('analyticsContainer');
            
            await CoachAnalyticsAPI.loadAnalyticsIntoElement('analyticsContainer', queryOptions);
            console.debug('Analytics loaded successfully');

            // Update top KPI cards for plan analytics
            try {
                const [pa, rs] = await Promise.all([
                    CoachAnalyticsAPI.getPlanAnalytics(queryOptions),
                    CoachAnalyticsAPI.getRatingsSummary(queryOptions),
                ]);
                const avgRating = (rs && rs.success && rs.ratings) ? (rs.ratings.avg_rating || 0) : 0;
                const completionPct = (pa && pa.success && pa.analytics && pa.analytics.completion_rates) ? (pa.analytics.completion_rates.completed || 0) : 0;
                const avgEl = document.getElementById('statPlanAvgRating');
                const compEl = document.getElementById('statPlanCompletion');
                if (avgEl) avgEl.textContent = String(avgRating);
                if (compEl) compEl.textContent = String(completionPct) + '%';
            } catch (e) { /* ignore kpi errors */ }
        } catch (e) {
            console.error('Error loading analytics', e);
            APIBase.showError('analyticsContainer', 'Failed to load analytics');
        }
    }

    async function loadPlanPerformanceChart(options = {}) {
        try {
            const queryOptions = buildQueryOptionsFromState(options);
            const res = await CoachAnalyticsAPI.getPlanAnalytics(queryOptions);
            if (!(res && res.success && res.analytics)) return;
            const data = res.analytics;
            const canvas = document.getElementById('planCompletionChart');
            if (!canvas) return;
            if (planPerformanceChart) {
                try { planPerformanceChart.destroy(); } catch (e) {}
            }
            const labels = Object.keys(data.completion_stats || {});
            const values = labels.map(k => (data.completion_stats[k] || 0));
            planPerformanceChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels.map(l => l.replace('_', ' ')),
                    datasets: [{
                        label: 'Days',
                        data: values,
                        backgroundColor: ['#22c55e','#0ea5e9','#6b7280','#f59e0b','#ef4444'],
                        borderWidth: 0,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        } catch (e) { console.warn('Plan performance chart error', e); }
    }

    async function loadMeasurementInsights(options = {}) {
        try {
            // Ensure options are properly passed and logged
            const query = buildQueryOptionsFromState(options);
            // include server paging for top clients
            query.top_limit = topClientsLimit;
            query.top_offset = topClientsOffset;
            console.debug('Loading measurement insights with options:', query);
            
            // Show loading indicators for the insights containers
            APIBase.showLoading('insightsSummaryContainer');
            // For Top Clients, show a spinner but preserve table markup by injecting it if missing later
            const topContainer = document.getElementById('topClientsTableContainer');
            if (topContainer) {
                topContainer.innerHTML = `
                    <div class="table-responsive">
                        <table class="table modern-table table-hover align-middle mb-0" id="topClientsTable">
                            <thead class="table-light">
                                <tr>
                                    <th scope="col" width="40">#</th>
                                    <th scope="col">Client</th>
                                    <th scope="col">Plan Type</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Measurements</th>
                                    <th scope="col">Last Activity</th>
                                    <th scope="col">Progress</th>
                                    <th scope="col" class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="8" class="text-center py-4">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>`;
            }
            
            const resp = await CoachAnalyticsAPI.getMeasurementInsights(query);
            if (!(resp && resp.success && resp.insights)) {
                console.warn('Failed to load measurement insights', resp);
                // Show empty states instead of leaving blank areas
                APIBase.showEmptyState('insightsSummaryContainer', 'No data');
                APIBase.showEmptyState('topClientsTableContainer', 'No data');
                updateTopClientsPagerUI(); // Still update UI with zero results
                return;
            }

            const insights = resp.insights;
            console.debug('Measurement insights loaded successfully:', insights);
            
            // Update top clients pagination meta if provided
            if (insights.top_clients_meta) {
                topClientsTotal = Number(insights.top_clients_meta.total) || 0;
                topClientsLimit = Number(insights.top_clients_meta.limit) || topClientsLimit;
                topClientsOffset = Number(insights.top_clients_meta.offset) || topClientsOffset;
            } else {
                topClientsTotal = (Array.isArray(insights.top_clients) ? insights.top_clients.length : 0);
            }
            updateTopClientsPagerUI();
            
            // Render each section with data validation
            if (Array.isArray(insights.measurement_frequency) && insights.measurement_frequency.length > 0) {
                renderMeasurementFrequency(insights.measurement_frequency);
            } else {
                console.debug('No measurement frequency data available');
                const chartContainer = document.getElementById('measurementFrequencyChart');
                if (chartContainer) {
                    const card = chartContainer.closest('.card');
                    const cardBody = card ? card.querySelector('.card-body') : null;
                    const target = cardBody || card || chartContainer;
                    target.innerHTML = '<div class="text-center text-muted p-4">No data</div>';
                }
            }
            
            renderInsightsSummary(insights);
            renderTopClientsTable(insights.top_clients || [], (options && options.q) ? options.q : '');
        } catch (e) {
            console.error('Error loading measurement insights', e);
            // Show error states
            APIBase.showError('insightsSummaryContainer', 'Failed to load insights');
            APIBase.showError('topClientsTableContainer', 'Failed to load client data');
        }
    }

    function renderMeasurementFrequency(list) {
        const ctx = document.getElementById('measurementFrequencyChart');
        if (!ctx) return;

        // Prepare data
        const labels = list.map(x => x.day);
        const values = list.map(x => x.count);

        // Destroy previous chart if exists
        if (measurementFrequencyChart) {
            try { measurementFrequencyChart.destroy(); } catch (e) {}
        }

        // Create gradient fill
        let gradient = null;
        try {
            const c2d = ctx.getContext('2d');
            gradient = c2d.createLinearGradient(0, 0, 0, ctx.height || 260);
            gradient.addColorStop(0, 'rgba(13, 110, 253, 0.35)');
            gradient.addColorStop(1, 'rgba(13, 110, 253, 0.05)');
        } catch (_) {}

        measurementFrequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Measurements',
                    data: values,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: gradient || 'rgba(13, 110, 253, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3,
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: 'rgba(0,0,0,0.06)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderTopClientsTable(items, searchTerm = '') {
        const rows = items.map((tc, index) => {
            // Extract client data
            const first = tc['client__user__first_name'] || '';
            const last = tc['client__user__last_name'] || '';
            const name = (first + ' ' + last).trim() || 'Unknown';
            const count = tc['measurement_count'] || 0;
            const clientId = tc['client__user_id'];
            
            // URLs
            const viewUrl = `/plan-management/coach/client-measurements/?client_id=${clientId}`;
            const createPlanUrl = `/plan-management/coach/plan-creation/?client_id=${clientId}`;
            
            // Plan type - normalize display and classes (map 'diet' -> 'Nutrition')
            const planTypeCode = (tc['plan_type'] || '').toLowerCase();
            const planTypeLabel = planTypeCode ? CoachAnalyticsAPI.formatPlanTypeLabel(planTypeCode) : 'Not Assigned';
            const planTypeClass = planTypeCode.includes('workout') ? 'text-success' : 
                                  (planTypeCode.includes('nutrition') || planTypeCode.includes('diet')) ? 'text-info' : 
                                  planTypeCode.includes('hybrid') ? 'text-primary' : 'text-secondary';
            const planTypeHtml = `<span class="badge bg-light ${planTypeClass}">${planTypeLabel}</span>`;
            
            // Status - extract from data or provide default
            const status = tc['status'] || (count > 10 ? 'Active' : 'New');
            const statusClass = status === 'Active' ? 'success' : 
                               status === 'Inactive' ? 'danger' : 
                               status === 'New' ? 'info' : 'secondary';
            const statusHtml = `<span class="badge bg-${statusClass}-subtle text-${statusClass}">${status}</span>`;
            
            // Last activity date
            const lastActivity = tc['last_activity_date'] || 'N/A';
            const lastActivityText = lastActivity === 'N/A' ? lastActivity : 
                                     typeof lastActivity === 'string' ? lastActivity : 
                                     new Date(lastActivity).toLocaleDateString();
            
            // Progress bar
            const progress = tc['progress_percent'] || Math.min(Math.round((count / 20) * 100), 100) || 0;
            const progressClass = progress >= 75 ? 'bg-success' : 
                                 progress >= 50 ? 'bg-info' : 
                                 progress >= 25 ? 'bg-warning' : 'bg-secondary';
            const progressHtml = `
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar ${progressClass}" role="progressbar" 
                         style="width: ${progress}%" aria-valuenow="${progress}" 
                         aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="small text-muted mt-1">${progress}%</div>
            `;
            
            // Client display with avatar image using global avatar fallback
            // We provide an empty src to trigger the global avatar handler which will
            // generate initials or use a default image. We include data-username for better initials.
            const clientHtml = `
                <div class="d-flex align-items-center">
                    <img class="client-avatar avatar-img rounded-circle me-2" 
                         src="" alt="${name}" data-username="${name}" 
                         width="32" height="32" loading="lazy" />
                    <div>
                        <div class="fw-medium">${name}</div>
                        <div class="small text-muted">#${clientId}</div>
                    </div>
                </div>
            `;
            
            // Action buttons with icons
            const actionHtml = `
                <div class="btn-group" role="group">
                    <a class="btn btn-sm btn-outline-primary" href="${viewUrl}" data-clientid="${clientId}">
                        <i class="bi bi-eye"></i> View
                    </a>
                    <a class="btn btn-sm btn-primary" href="${createPlanUrl}" data-clientid="${clientId}">
                        <i class="bi bi-plus-circle"></i> Plan
                    </a>
                </div>`;
            
            return [index + 1, clientHtml, planTypeHtml, statusHtml, count, lastActivityText, progressHtml, actionHtml];
        });

        const tableSelector = '#topClientsTable';
        const hasDataTables = !!(window.jQuery && $.fn && typeof $.fn.DataTable === 'function');
        if (hasDataTables) {
            if ($.fn.DataTable.isDataTable(tableSelector)) {
                topClientsTable = $(tableSelector).DataTable();
                topClientsTable.clear();
                if (rows.length) topClientsTable.rows.add(rows);
                topClientsTable.draw();
            } else {
                topClientsTable = $(tableSelector).DataTable({
                    data: rows,
                    columns: [
                        { title: '#', width: '40px' },
                        { title: 'Client', width: '20%' },
                        { title: 'Plan Type', width: '10%' },
                        { title: 'Status', width: '10%' },
                        { title: 'Measurements', width: '10%' },
                        { title: 'Last Activity', width: '15%' },
                        { title: 'Progress', width: '15%' },
                        { title: 'Actions', width: '15%', orderable: false, searchable: false, className: 'text-end' }
                    ],
                    paging: false,
                    info: false,
                    searching: false,
                    lengthChange: false,
                    order: [[4, 'desc']], // Order by measurements count
                    language: {
                        emptyTable: 'No data'
                    }
                });
            }
        } else {
            // Fallback: render plain rows without DataTables
            try {
                const tbody = document.querySelector('#topClientsTable tbody');
                if (tbody) {
                    const html = rows.map(cols => {
                        return `
                            <tr>
                                <td>${cols[0] ?? ''}</td>
                                <td>${cols[1] ?? ''}</td>
                                <td>${cols[2] ?? ''}</td>
                                <td>${cols[3] ?? ''}</td>
                                <td>${cols[4] ?? ''}</td>
                                <td>${cols[5] ?? ''}</td>
                                <td>${cols[6] ?? ''}</td>
                                <td class="text-end">${cols[7] ?? ''}</td>
                            </tr>`;
                    }).join('');
                    tbody.innerHTML = html || '<tr><td colspan="8" class="text-center py-3 text-muted">No data</td></tr>';
                }
            } catch (e) {
                console.warn('Failed to render plain table rows:', e);
            }
        }
    }

    function renderInsightsSummary(insights) {
        const container = document.getElementById('insightsSummaryContainer');
        if (!container) return;

        const summary = insights.summary || {};
        const total30 = summary.total_measurements_30d ?? 0;
        const avgPerClient = summary.avg_measurements_per_client ?? 0;
        const clientsWithProgress = summary.clients_with_progress ?? 0;
        const activeDays = (insights.measurement_frequency || []).length;

        // Update top insight counters if present
        try {
            const consEl = document.getElementById('insightConsistencyValue');
            if (consEl) {
                const pct = Math.round((activeDays / 30) * 100);
                consEl.textContent = `${isNaN(pct) ? 0 : pct}%`;
            }
            const progEl = document.getElementById('insightProgressValue');
            if (progEl) {
                progEl.textContent = `${clientsWithProgress}`;
            }
            const milesEl = document.getElementById('insightMilestonesValue');
            if (milesEl) {
                // Use count of days with measurements as a proxy milestone metric
                milesEl.textContent = `${activeDays}`;
            }
        } catch (e) { /* ignore */ }

        // Most improved (largest negative weight change)
        let mostImproved = null;
        if (Array.isArray(insights.client_progress)) {
            insights.client_progress.forEach(p => {
                if (p.weight_change != null) {
                    if (!mostImproved || (p.weight_change < mostImproved.weight_change)) {
                        mostImproved = p;
                    }
                }
            });
        }

        // Most engaged (highest measurements)
        const topClient = Array.isArray(insights.top_clients) && insights.top_clients.length ? insights.top_clients[0] : null;
        const topClientName = topClient ? `${(topClient['client__user__first_name']||'')} ${(topClient['client__user__last_name']||'')}`.trim() : null;
        const topClientId = topClient ? topClient['client__user_id'] : null;
        const topClientCount = topClient ? (topClient['measurement_count']||0) : 0;

        const kpiCard = (title, value, icon, extra='') => `
            <div class="col-sm-6 col-lg-3">
                <div class="card border-0 bg-light h-100">
                    <div class="card-body d-flex justify-content-between align-items-center">
                        <div>
                            <div class="text-muted small">${title}</div>
                            <div class="h5 mb-0">${value}</div>
                            ${extra}
                        </div>
                        <i class="bi ${icon} fs-2 text-secondary"></i>
                    </div>
                </div>
            </div>`;

        const improvedHtml = mostImproved ? `
            <div class="col-lg-6">
                <div class="p-3 rounded border h-100">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h6 class="mb-0">Most Improved</h6>
                        ${(() => {
                            const delta = Number(mostImproved.weight_change);
                            const sign = delta > 0 ? '+' : (delta < 0 ? '' : '');
                            const cls = delta < 0 ? 'bg-success-subtle text-success' : (delta > 0 ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary');
                            return `<span class="badge ${cls}">${sign}${delta.toFixed(1)} kg</span>`;
                        })()}
                    </div>
                    <div class="text-muted small mb-2">${mostImproved.client_name} over ${mostImproved.duration_days} days</div>
                    <div class="d-flex gap-2">
                        <a class="btn btn-sm btn-outline-primary" href="/plan-management/coach/client-measurements/?client_id=${mostImproved.client_id}">
                            <i class="bi bi-eye"></i> View Measurements
                        </a>
                        <a class="btn btn-sm btn-primary" href="/plan-management/coach/plan-creation/?client_id=${mostImproved.client_id}">
                            <i class="bi bi-plus-circle"></i> Create Plan
                        </a>
                    </div>
                </div>
            </div>` : '';

        const engagedHtml = topClient ? `
            <div class="col-lg-6">
                <div class="p-3 rounded border h-100">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <h6 class="mb-0">Most Engaged</h6>
                        <span class="badge bg-info-subtle text-info">${topClientCount} measurements</span>
                    </div>
                    <div class="text-muted small mb-2">${topClientName}</div>
                    <div class="d-flex gap-2">
                        <a class="btn btn-sm btn-outline-primary" href="/plan-management/coach/client-measurements/?client_id=${topClientId}">
                            <i class="bi bi-eye"></i> View Measurements
                        </a>
                        <a class="btn btn-sm btn-primary" href="/plan-management/coach/plan-creation/?client_id=${topClientId}">
                            <i class="bi bi-plus-circle"></i> Create Plan
                        </a>
                    </div>
                </div>
            </div>` : '';

        container.innerHTML = `
            <div class="row g-3 mb-2">
                ${kpiCard('Total Measurements (30d)', total30, 'bi-graph-up')}
                ${kpiCard('Active Days (30d)', `${activeDays}/30`, 'bi-calendar-check')}
                ${kpiCard('Avg per Client', avgPerClient, 'bi-people')}
                ${kpiCard('Clients with Progress', clientsWithProgress, 'bi-activity')}
            </div>
            <div class="row g-3">
                ${improvedHtml}
                ${engagedHtml}
            </div>`;
    }
    
    // ===== Filters State Management =====
    function defaultFilterState() {
        return {
            preset: '30d',
            start_date: '',
            end_date: '',
            plan_type: 'all',
            plan_id: '',
            client_id: '',
            segment: 'all',
            q: ''
        };
    }

    function computeDateRange(preset) {
        const today = new Date();
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let start = new Date(end);
        switch ((preset || '').toLowerCase()) {
            case '7d':
                start.setDate(end.getDate() - 6);
                break;
            case '30d':
                start.setDate(end.getDate() - 29);
                break;
            case '90d':
                start.setDate(end.getDate() - 89);
                break;
            case 'ytd':
                start = new Date(end.getFullYear(), 0, 1);
                break;
            default:
                // all or unknown
                start = null;
                break;
        }
        const fmt = (d) => d ? d.toISOString().slice(0, 10) : '';
        return { start_date: fmt(start), end_date: fmt(end) };
    }

    function parseFiltersFromURL() {
        try {
            const url = new URL(window.location.href);
            const p = url.searchParams;
            const state = defaultFilterState();
            state.preset = (p.get('preset') || state.preset).toLowerCase();
            state.start_date = p.get('start_date') || state.start_date;
            state.end_date = p.get('end_date') || state.end_date;
            state.plan_type = p.get('plan_type') || state.plan_type;
            state.plan_id = p.get('plan_id') || state.plan_id;
            state.client_id = p.get('client_id') || state.client_id;
            state.segment = p.get('segment') || state.segment;
            state.q = p.get('q') || state.q;

            if (state.preset !== 'custom') {
                const { start_date, end_date } = computeDateRange(state.preset);
                state.start_date = start_date;
                state.end_date = end_date;
            }
            return state;
        } catch (e) {
            return defaultFilterState();
        }
    }

    // Parse pagination params for Top Clients from URL
    function parsePaginationFromURL() {
        try {
            const url = new URL(window.location.href);
            const p = url.searchParams;
            const limit = parseInt(p.get('top_limit'));
            const offset = parseInt(p.get('top_offset'));
            if (!isNaN(limit) && limit > 0 && limit <= 50) {
                topClientsLimit = limit;
            }
            if (!isNaN(offset) && offset >= 0) {
                topClientsOffset = offset;
            }
            const sel = document.getElementById('topClientsPageSize');
            if (sel) sel.value = String(topClientsLimit);
        } catch (e) {
            // ignore
        }
    }

    function applyStateToUI(state) {
        // Time period radios
        const presetMap = { all: 'allTime', '7d': '7days', '30d': '30days', '90d': '90days', ytd: 'thisYear', custom: 'customRange' };
        const radioId = presetMap[state.preset] || '30days';
        $('input[name="timePeriod"]').prop('checked', false);
        $(`#${radioId}`).prop('checked', true);

        // Custom dates visibility (if custom date inputs exist)
        if (state.preset === 'custom') {
            $('#customDateInputs').show();
        } else {
            $('#customDateInputs').hide();
        }

        // Dates (if present)
        $('#filterStart').val(state.start_date || '');
        $('#filterEnd').val(state.end_date || '');

        // Plan type dropdown
        const $planBtn = $('#planTypesDropdown');
        if ($planBtn.length) {
            const selected = state.plan_type || 'all';
            $planBtn.data('selected', selected);
            const $item = $(`.plan-types-menu .dropdown-item[data-value="${selected}"]`);
            const labelText = $item.length ? $item.text().trim() : 'All plan types';
            $planBtn.html(`${labelText}<span class="badge bg-primary rounded-pill ms-2 filter-count">${selected === 'all' ? 'All' : labelText}</span>`);
        }

        // Plan dropdown
        const $plansBtn = $('#plansDropdown');
        if ($plansBtn.length) {
            const selectedPlan = (state.plan_id || '').toString();
            $plansBtn.data('selected', selectedPlan);
            let labelText = 'All plans';
            if (selectedPlan) {
                const plan = (plansCache || []).find(p => String(p.id) === selectedPlan);
                if (plan) labelText = plan.name || (`Plan #${plan.id}`);
            }
            $plansBtn.html(`${labelText}<span class="badge bg-primary rounded-pill ms-2 filter-count">${selectedPlan ? labelText : 'All'}</span>`);
        }

        // Client dropdown
        const $clientsBtn = $('#clientsDropdown');
        if ($clientsBtn.length) {
            const selectedClient = (state.client_id || '').toString();
            $clientsBtn.data('selected', selectedClient);
            let labelText = 'All clients';
            if (selectedClient) {
                const c = (clientsCache || []).find(x => String(x.id) === selectedClient);
                if (c) labelText = c.name || (`Client #${c.id}`);
            }
            $clientsBtn.html(`${labelText}<span class="badge bg-primary rounded-pill ms-2 filter-count">${selectedClient ? labelText : 'All'}</span>`);
        }

        // Segment dropdown
        const $segBtn = $('#segmentsDropdown');
        if ($segBtn.length) {
            const selected = state.segment || 'all';
            $segBtn.data('selected', selected);
            const $item = $(`.segments-menu .dropdown-item[data-value="${selected}"]`);
            const labelText = $item.length ? $item.text().trim() : 'All segments';
            $segBtn.html(`${labelText}<span class="badge bg-primary rounded-pill ms-2 filter-count">${selected === 'all' ? 'All' : labelText}</span>`);
        }

        // Search
        $('#searchClients').val(state.q || '');
    }

    function collectStateFromUI() {
        const state = defaultFilterState();
        const checkedId = ($('input[name="timePeriod"]:checked').attr('id') || '').toLowerCase();
        const idToPreset = { 'alltime': 'all', '7days': '7d', '30days': '30d', '90days': '90d', 'thisyear': 'ytd', 'customrange': 'custom' };
        state.preset = idToPreset[checkedId] || '30d';
        if (state.preset === 'custom') {
            state.start_date = ($('#filterStart').val() || '').trim();
            state.end_date = ($('#filterEnd').val() || '').trim();
        } else {
            const { start_date, end_date } = computeDateRange(state.preset);
            state.start_date = start_date;
            state.end_date = end_date;
        }
        state.plan_type = ($('#planTypesDropdown').data('selected') || 'all');
        state.plan_id = ($('#plansDropdown').data('selected') || '');
        state.client_id = ($('#clientsDropdown').data('selected') || '');
        state.segment = ($('#segmentsDropdown').data('selected') || 'all');
        state.q = ($('#searchClients').val() || '').trim();
        return state;
    }

    function buildQueryOptionsFromState(state) {
        if (!state) return {};
        const opts = {};
        // always send preset plus dates to allow backend flexibility
        if (state.preset && state.preset !== 'all') opts.preset = state.preset;
        if (state.start_date) opts.start_date = state.start_date;
        if (state.end_date) opts.end_date = state.end_date;
        if (state.plan_type && state.plan_type !== 'all') opts.plan_type = state.plan_type;
        if (state.plan_id) opts.plan_id = state.plan_id;
        if (state.client_id) opts.client_id = state.client_id;
        if (state.segment && state.segment !== 'all') opts.segment = state.segment;
        if (state.q) opts.q = state.q;
        
        // Debug log to ensure options are generated properly
        console.debug('Filter options:', opts);
        return opts;
    }

    function updateUrlWithState(state) {
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            params.set('preset', state.preset || '');
            if (state.start_date) params.set('start_date', state.start_date); else params.delete('start_date');
            if (state.end_date) params.set('end_date', state.end_date); else params.delete('end_date');
            if (state.plan_type && state.plan_type !== 'all') params.set('plan_type', state.plan_type); else params.delete('plan_type');
            if (state.plan_id) params.set('plan_id', state.plan_id); else params.delete('plan_id');
            if (state.client_id) params.set('client_id', state.client_id); else params.delete('client_id');
            if (state.segment && state.segment !== 'all') params.set('segment', state.segment); else params.delete('segment');
            if (state.q) params.set('q', state.q); else params.delete('q');
            // Persist Top Clients pagination
            if (topClientsLimit) params.set('top_limit', String(topClientsLimit)); else params.delete('top_limit');
            if (typeof topClientsOffset === 'number') params.set('top_offset', String(topClientsOffset)); else params.delete('top_offset');
            const newUrl = `${url.pathname}?${params.toString()}`;
            window.history.replaceState({}, '', newUrl);
        } catch (e) {}
    }

    function setupFiltersUI() {
        console.debug('Setting up filters UI');
        // Time period radios
        $(document).on('change', 'input[name="timePeriod"]', function () {
            const id = ($(this).attr('id') || '').toLowerCase();
            const isCustom = (id === 'customrange');
            if (isCustom) {
                $('#customDateInputs').show();
            } else {
                $('#customDateInputs').hide();
            }
            console.debug(`Time period changed: ${id}`);
        });

        // Plan types dropdown
        $(document).on('click', '.plan-types-menu .dropdown-item', function (e) {
            e.preventDefault();
            const value = $(this).data('value');
            const label = $(this).text().trim();
            const $btn = $('#planTypesDropdown');
            if ($btn.length) {
                $btn.data('selected', value);
                const badgeText = (value === 'all') ? 'All' : label;
                $btn.html(`${label}<span class="badge bg-primary rounded-pill ms-2 filter-count">${badgeText}</span>`);
                try { bootstrap.Dropdown.getOrCreateInstance($btn[0]).hide(); } catch (err) {}
            }
        });

        // Plans dropdown (specific plan)
        $(document).on('click', '.plans-menu .dropdown-item', function (e) {
            e.preventDefault();
            const value = String($(this).data('value') || '');
            const label = $(this).text().trim();
            const $btn = $('#plansDropdown');
            if ($btn.length) {
                $btn.data('selected', value);
                const badgeText = (value === '') ? 'All' : label;
                $btn.html(`${label}<span class="badge bg-primary rounded-pill ms-2 filter-count">${badgeText}</span>`);
                try { bootstrap.Dropdown.getOrCreateInstance($btn[0]).hide(); } catch (err) {}
            }
        });

        // Clients dropdown behavior: populate on open and handle selection
        $(document).on('show.bs.dropdown', '#clientsDropdown', async function () {
            try { await loadCoachClients($('#searchClients').val() || ''); } catch (_) {}
        });
        $(document).on('click', '.clients-menu .dropdown-item', function (e) {
            e.preventDefault();
            const value = String($(this).data('value') || '');
            const label = $(this).text().trim();
            const $btn = $('#clientsDropdown');
            if ($btn.length) {
                $btn.data('selected', value);
                const badgeText = (value === '') ? 'All' : label;
                $btn.html(`${label}<span class="badge bg-primary rounded-pill ms-2 filter-count">${badgeText}</span>`);
                try { bootstrap.Dropdown.getOrCreateInstance($btn[0]).hide(); } catch (err) {}
            }
        });

        // Segments dropdown
        $(document).on('click', '.segments-menu .dropdown-item', function (e) {
            e.preventDefault();
            const value = $(this).data('value');
            const label = $(this).text().trim();
            const $btn = $('#segmentsDropdown');
            if ($btn.length) {
                $btn.data('selected', value);
                const badgeText = (value === 'all') ? 'All' : label;
                $btn.html(`${label}<span class="badge bg-primary rounded-pill ms-2 filter-count">${badgeText}</span>`);
                try { bootstrap.Dropdown.getOrCreateInstance($btn[0]).hide(); } catch (err) {}
            }
        });

        // Apply filters
        $('#btnApplyFilters').on('click', async function () {
            console.debug('Apply filters button clicked');
            const state = collectStateFromUI();
            console.debug('Collected filter state:', state);
            
            // Reset server paging when filters change
            topClientsOffset = 0;
            
            // Save state for future reference - create deep copy to avoid reference issues
            lastAppliedState = JSON.parse(JSON.stringify(state));
            
            // Update UI to reflect the state
            applyStateToUI(state);
            
            // Update URL and trigger data refresh
            updateUrlWithState(state);
            
            // Show loading feedback
            $('#btnApplyFilters').prop('disabled', true).html(
                '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Applying...'
            );
            
            try {
                // Ensure we pass the state object directly, not a string version
                await initCoachDashboard(state);
                console.debug('Dashboard refreshed with new filters');
            } catch (err) {
                console.error('Error refreshing dashboard with filters:', err);
            } finally {
                // Reset button state
                $('#btnApplyFilters').prop('disabled', false).html('Apply Filters');
            }
        });

        // Reset filters
        $('#btnResetFilters').on('click', async function () {
            const state = defaultFilterState();
            const { start_date, end_date } = computeDateRange('30d');
            state.start_date = start_date;
            state.end_date = end_date;
            applyStateToUI(state);
            // Reset server paging when filters reset
            topClientsOffset = 0;
            lastAppliedState = state;
            updateUrlWithState(state);
            await initCoachDashboard(state);
        });

        // Search input and button
        $('#searchClients').on('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                $('#btnApplyFilters').trigger('click');
            }
        });
        $('#btnSearch').on('click', function () {
            $('#btnApplyFilters').trigger('click');
        });

        // Pager controls for Top Clients
        $(document).on('click', '#btnTopPrev', async function () {
            if (topClientsOffset <= 0) return;
            topClientsOffset = Math.max(0, topClientsOffset - topClientsLimit);
            updateUrlWithState(lastAppliedState || parseFiltersFromURL());
            await loadMeasurementInsights(lastAppliedState || parseFiltersFromURL());
        });
        $(document).on('click', '#btnTopNext', async function () {
            if (topClientsOffset + topClientsLimit >= topClientsTotal) return;
            topClientsOffset = topClientsOffset + topClientsLimit;
            updateUrlWithState(lastAppliedState || parseFiltersFromURL());
            await loadMeasurementInsights(lastAppliedState || parseFiltersFromURL());
        });

        // Page size change for Top Clients
        $(document).on('change', '#topClientsPageSize', async function () {
            const newLimit = parseInt($(this).val());
            if (!isNaN(newLimit) && newLimit > 0 && newLimit <= 50) {
                topClientsLimit = newLimit;
                topClientsOffset = 0; // reset to first page
                updateUrlWithState(lastAppliedState || parseFiltersFromURL());
                await loadMeasurementInsights(lastAppliedState || parseFiltersFromURL());
            }
        });
    }
})();

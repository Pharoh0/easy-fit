/* Coach Dashboard JS
 * - Loads quick stats, analytics, and insights using JWT via APIBase + CoachAnalyticsAPI
 * - Renders Chart.js charts and initializes DataTables
 */
(function () {
    let measurementFrequencyChart = null;
    let topClientsTable = null;
    let lastAppliedState = null;
    // Server-driven pagination for Top Clients
    let topClientsLimit = 5;
    let topClientsOffset = 0;
    let topClientsTotal = 0;

    $(document).ready(function () {
        setupFiltersUI();
        const initialState = parseFiltersFromURL();
        applyStateToUI(initialState);
        lastAppliedState = initialState;
        // Parse pagination from URL and sync UI
        parsePaginationFromURL();
        initCoachDashboard(initialState);
    });

    async function initCoachDashboard(options = {}) {
        // Load all sections in parallel with current filter options
        await Promise.allSettled([
            loadQuickStats(options),
            loadAnalytics(options),
            loadMeasurementInsights(options)
        ]);
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
            const res = await CoachAnalyticsAPI.getClientStats(buildQueryOptionsFromState(options));
            if (res && res.success && res.stats) {
                const s = res.stats;
                $('#statTotalClients').text(s.total_clients ?? 0);
                $('#statActiveSubs').text(s.active_subscriptions ?? 0);
                $('#statRecentMeasurements').text(s.recent_measurements ?? 0);
                $('#statEngagementRate').text(((s.engagement_rate ?? 0)).toString() + '%');
            } else {
                console.warn('Failed to load quick stats', res);
            }
        } catch (e) {
            console.error('Error loading quick stats', e);
        }
    }

    async function loadAnalytics(options = {}) {
        try {
            await CoachAnalyticsAPI.loadAnalyticsIntoElement('analyticsContainer', buildQueryOptionsFromState(options));
        } catch (e) {
            console.error('Error loading analytics', e);
            APIBase.showError('analyticsContainer', 'Failed to load analytics');
        }
    }

    async function loadMeasurementInsights(options = {}) {
        try {
            const query = buildQueryOptionsFromState(options);
            // include server paging for top clients
            query.top_limit = topClientsLimit;
            query.top_offset = topClientsOffset;
            const resp = await CoachAnalyticsAPI.getMeasurementInsights(query);
            if (!(resp && resp.success && resp.insights)) {
                console.warn('Failed to load measurement insights', resp);
                return;
            }

            const insights = resp.insights;
            // Update top clients pagination meta if provided
            if (insights.top_clients_meta) {
                topClientsTotal = Number(insights.top_clients_meta.total) || 0;
                topClientsLimit = Number(insights.top_clients_meta.limit) || topClientsLimit;
                topClientsOffset = Number(insights.top_clients_meta.offset) || topClientsOffset;
            } else {
                topClientsTotal = (Array.isArray(insights.top_clients) ? insights.top_clients.length : 0);
            }
            updateTopClientsPagerUI();
            renderMeasurementFrequency(insights.measurement_frequency || []);
            renderInsightsSummary(insights);
            renderTopClientsTable(insights.top_clients || [], (options && options.q) ? options.q : '');
        } catch (e) {
            console.error('Error loading measurement insights', e);
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

        measurementFrequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Measurements',
                    data: values,
                    borderColor: 'rgb(13, 110, 253)',
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }

    function renderTopClientsTable(items, searchTerm = '') {
        const rows = items.map(tc => {
            const first = tc['client__user__first_name'] || '';
            const last = tc['client__user__last_name'] || '';
            const name = (first + ' ' + last).trim() || 'Unknown';
            const count = tc['measurement_count'] || 0;
            const clientId = tc['client__user_id'];
            const url = `/plan-management/coach/client-measurements/?client_id=${clientId}`;
            const createPlanUrl = `/plan-management/coach/plan-creation/?client_id=${clientId}`;
            const actionHtml = `
                <div class="btn-group" role="group">
                    <a class="btn btn-sm btn-outline-primary" href="${url}" data-clientid="${clientId}">
                        <i class="bi bi-eye"></i> View
                    </a>
                    <a class="btn btn-sm btn-primary" href="${createPlanUrl}" data-clientid="${clientId}">
                        <i class="bi bi-plus-circle"></i> Create Plan
                    </a>
                </div>`;
            return [name, count, actionHtml];
        });

        const tableSelector = '#topClientsTable';
        if ($.fn.DataTable.isDataTable(tableSelector)) {
            topClientsTable = $(tableSelector).DataTable();
            topClientsTable.clear();
            if (rows.length) topClientsTable.rows.add(rows);
            topClientsTable.draw();
        } else {
            topClientsTable = $(tableSelector).DataTable({
                data: rows,
                columns: [
                    { title: 'Client' },
                    { title: 'Measurements' },
                    { title: 'Actions', orderable: false, searchable: false }
                ],
                paging: false,
                info: false,
                searching: false,
                lengthChange: false,
                order: [[1, 'desc']],
                language: {
                    emptyTable: 'No top clients found'
                }
            });
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
        // Presets
        const group = $('#filterPresetGroup');
        group.find('button').removeClass('active');
        const presetBtn = group.find(`button[data-preset="${state.preset}"]`);
        if (presetBtn.length) presetBtn.addClass('active');

        // Custom dates visibility
        if (state.preset === 'custom') {
            $('#customDateInputs').show();
        } else {
            $('#customDateInputs').hide();
        }

        // Dates
        $('#filterStart').val(state.start_date || '');
        $('#filterEnd').val(state.end_date || '');

        // Plan type & segment
        $('#filterPlanType').val(state.plan_type || 'all');
        $('#filterSegment').val(state.segment || 'all');

        // Search
        $('#filterSearch').val(state.q || '');
    }

    function collectStateFromUI() {
        const state = defaultFilterState();
        const activePreset = $('#filterPresetGroup button.active').data('preset');
        state.preset = (activePreset || '30d').toLowerCase();
        if (state.preset === 'custom') {
            state.start_date = ($('#filterStart').val() || '').trim();
            state.end_date = ($('#filterEnd').val() || '').trim();
        } else {
            const { start_date, end_date } = computeDateRange(state.preset);
            state.start_date = start_date;
            state.end_date = end_date;
        }
        state.plan_type = ($('#filterPlanType').val() || 'all');
        state.segment = ($('#filterSegment').val() || 'all');
        state.q = ($('#filterSearch').val() || '').trim();
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
        if (state.segment && state.segment !== 'all') opts.segment = state.segment;
        if (state.q) opts.q = state.q;
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
        // Preset buttons
        $('#filterPresetGroup').on('click', 'button', function () {
            $('#filterPresetGroup button').removeClass('active');
            $(this).addClass('active');
            const preset = ($(this).data('preset') || '').toLowerCase();
            if (preset === 'custom') {
                $('#customDateInputs').show();
            } else {
                $('#customDateInputs').hide();
            }
        });

        // Apply filters
        $('#btnApplyFilters').on('click', async function () {
            const state = collectStateFromUI();
            // Reset server paging when filters change
            topClientsOffset = 0;
            lastAppliedState = state;
            updateUrlWithState(state);
            await initCoachDashboard(state);
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

        // Enter key submits search
        $('#filterSearch').on('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                $('#btnApplyFilters').trigger('click');
            }
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

/* Coach Dashboard JS
 * - Loads quick stats, analytics, and insights using JWT via APIBase + CoachAnalyticsAPI
 * - Renders Chart.js charts and initializes DataTables
 */
(function () {
    let measurementFrequencyChart = null;
    let topClientsTable = null;

    $(document).ready(function () {
        initCoachDashboard();
    });

    async function initCoachDashboard() {
        // Load all sections in parallel
        await Promise.allSettled([
            loadQuickStats(),
            loadAnalytics(),
            loadMeasurementInsights()
        ]);
    }

    async function loadQuickStats() {
        try {
            const res = await CoachAnalyticsAPI.getClientStats();
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

    async function loadAnalytics() {
        try {
            await CoachAnalyticsAPI.loadAnalyticsIntoElement('analyticsContainer');
        } catch (e) {
            console.error('Error loading analytics', e);
            APIBase.showError('analyticsContainer', 'Failed to load analytics');
        }
    }

    async function loadMeasurementInsights() {
        try {
            const resp = await CoachAnalyticsAPI.getMeasurementInsights();
            if (!(resp && resp.success && resp.insights)) {
                console.warn('Failed to load measurement insights', resp);
                return;
            }

            const insights = resp.insights;
            renderMeasurementFrequency(insights.measurement_frequency || []);
            renderInsightsSummary(insights);
            renderTopClientsTable(insights.top_clients || []);
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

    function renderTopClientsTable(items) {
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
                pageLength: 5,
                lengthChange: false,
                order: [[1, 'desc']],
                language: {
                    emptyTable: 'No top clients found',
                    search: 'Filter:'
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
})();

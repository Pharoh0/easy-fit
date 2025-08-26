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
            const actionHtml = `
                <a class="btn btn-sm btn-outline-primary" href="${url}" data-clientid="${clientId}">
                    <i class="bi bi-eye"></i> View
                </a>`;
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
})();

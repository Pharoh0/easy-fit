/**
 * Coach Analytics API
 * Handles API calls for coach plan analytics using the shared APIBase
 */

class CoachAnalyticsAPI {
    /**
     * API endpoint base path
     */
    static BASE_PATH = '/plan-management/api/v1/coach';

    /**
     * Get plan analytics data for coach
     * @param {Object} options - Optional query parameters
     * @returns {Promise<Object>} Analytics data
     */
    static async getPlanAnalytics(options = {}) {
        console.debug('Getting plan analytics with options:', options);
        const url = `${this.BASE_PATH}/plan-analytics/${this.buildQuery(options)}`;
        try {
            const response = await APIBase.request(url);
            if (response.success && response.data && response.data.success === true && response.data.analytics) {
                console.debug('Plan analytics data received successfully');
                return { success: true, analytics: response.data.analytics };
            }
            console.warn('Failed to get plan analytics:', response);
            return { success: false, error: (response.error || 'No analytics data available'), emptyDataMessage: 'No analytics data available for the selected filters' };
        } catch (error) {
            console.error('Error fetching plan analytics:', error);
            return { success: false, error: error.message || 'Failed to connect to analytics service', strictSuccessCheck: true };
        }
    }

    /**
     * Get aggregated subscription stats (counts, churn, revenue summary)
     */
    static async getSubscriptionStats(options = {}) {
        console.debug('Getting subscription stats with options:', options);
        const url = `${this.BASE_PATH}/subscription-stats/${this.buildQuery(options)}`;
        try {
            const response = await APIBase.request(url);
            if (response.success) {
                const subscriptions = (response.data && response.data.subscriptions) ? response.data.subscriptions : response.data;
                return { success: true, subscriptions };
            }
            return { success: false, error: response.error || 'No subscription stats' };
        } catch (error) {
            console.error('Error fetching subscription stats:', error);
            return { success: false, error: error.message || 'Failed to connect to subscription stats service' };
        }
    }

    /**
     * Get ratings summary (avg, total, distribution, recent)
     */
    static async getRatingsSummary(options = {}) {
        console.debug('Getting ratings summary with options:', options);
        const url = `${this.BASE_PATH}/ratings-summary/${this.buildQuery(options)}`;
        try {
            const response = await APIBase.request(url);
            if (response.success) {
                const ratings = (response.data && response.data.ratings) ? response.data.ratings : response.data;
                return { success: true, ratings };
            }
            return { success: false, error: response.error || 'No ratings data' };
        } catch (error) {
            console.error('Error fetching ratings summary:', error);
            return { success: false, error: error.message || 'Failed to connect to ratings service' };
        }
    }

    /**
     * Get revenue metrics for the coach (totals + monthly trend)
     * @param {Object} options - filter params consistent with other coach endpoints
     */
    static async getRevenueMetrics(options = {}) {
        console.debug('Getting revenue metrics with options:', options);
        const url = `${this.BASE_PATH}/revenue-metrics/${this.buildQuery(options)}`;
        try {
            const response = await APIBase.request(url);
            if (response.success) {
                const revenue = (response.data && response.data.revenue) ? response.data.revenue : response.data;
                return { success: true, revenue };
            }
            return { success: false, error: response.error || 'No revenue data' };
        } catch (error) {
            console.error('Error fetching revenue metrics:', error);
            return { success: false, error: error.message || 'Failed to connect to revenue service' };
        }
    }

    /**
     * Get client measurement insights
     * @param {string} clientId - Optional client ID to filter by
     * @returns {Promise<Object>} Measurement insights data
     */
    static async getMeasurementInsights(options = {}) {
        console.debug('Getting measurement insights with options:', options);
        // Backward compatibility if clientId was passed directly
        if (typeof options === 'string' || typeof options === 'number') {
            options = { client_id: options };
            console.debug('Converted client_id to options object:', options);
        }
        
        const url = `${this.BASE_PATH}/measurement-insights/${this.buildQuery(options)}`;
        
        try {
            const response = await APIBase.request(url);
            
            if (response.success) {
                const insights = (response.data && response.data.insights) ? response.data.insights : response.data;
                console.debug('Measurement insights received successfully');
                return {
                    success: true,
                    insights: insights
                };
            }
            
            console.warn('Failed to get measurement insights:', response);
            return { 
                success: false, 
                error: (response.error || 'No measurement insights available'),
                emptyDataMessage: 'No measurement data available for the selected filters'
            };
        } catch (error) {
            console.error('Error fetching measurement insights:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to connect to measurement insights service'
            };
        }
    }

    /**
     * Get client quick stats
     * @returns {Promise<Object>} Client stats data
     */
    static async getClientStats(options = {}) {
        console.debug('Getting client stats with options:', options);
        const url = `${this.BASE_PATH}/client-stats/${this.buildQuery(options)}`;
        
        try {
            const response = await APIBase.request(url);
            
            if (response.success) {
                const stats = (response.data && response.data.stats) ? response.data.stats : response.data;
                console.debug('Client stats received successfully');
                return {
                    success: true,
                    stats: stats
                };
            }
            
            console.warn('Failed to get client stats:', response);
            return { 
                success: false, 
                error: (response.error || 'No client stats available'),
                emptyDataMessage: 'No client stats available for the selected filters'
            };
        } catch (error) {
            console.error('Error fetching client stats:', error);
            return { 
                success: false, 
                error: error.message || 'Failed to connect to client stats service'
            };
        }
    }
    
    /**
     * Load analytics data into UI element
     * @param {string} elementId - Element ID to load analytics into
     */
    static async loadAnalyticsIntoElement(elementId, options = {}) {
        console.debug(`Loading analytics into element: ${elementId} with options:`, options);
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element not found: ${elementId}`);
            return;
        }
        APIBase.showLoading(elementId);
        try {
            // Fetch all in parallel
            const [analytics, subs, ratings] = await Promise.all([
                this.getPlanAnalytics(options),
                this.getSubscriptionStats(options),
                this.getRatingsSummary(options),
            ]);

            if (analytics?.success && analytics.analytics) {
                // Gracefully handle optional sections
                const subscriptions = subs?.success ? subs.subscriptions : null;
                const ratingsSummary = ratings?.success ? ratings.ratings : null;
                this.renderAnalyticsCombined(element, analytics.analytics, subscriptions, ratingsSummary);
            } else {
                const message = analytics?.emptyDataMessage || 'No analytics data available for the selected filters';
                APIBase.showEmptyState(elementId, message);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            APIBase.showError(elementId, 'Unable to connect to analytics service');
        }
    }
    
    /**
     * Map backend plan_type codes to friendly labels
     */
    static formatPlanTypeLabel(code) {
        if (!code) return '';
        const map = { 'diet': 'Nutrition', 'workout': 'Workout' };
        const lower = String(code).toLowerCase();
        return map[lower] || (String(code).charAt(0).toUpperCase() + String(code).slice(1));
    }

    /**
     * Render analytics data into element
     * @param {HTMLElement} element - Element to render analytics into
     * @param {Object} data - Analytics data
     */
    static renderAnalyticsCombined(element, data, subscriptions, ratings) {
        // Completion donut data
        const completionRates = data.completion_rates || {};
        const donutLabels = Object.keys(completionRates).map(key => key.replace('_', ' '));
        const donutValues = Object.values(completionRates);

        // Subscription KPIs (optional)
        const subs = subscriptions || {};
        const rating = ratings || {};

        element.innerHTML = `
            <div class="row g-4">
                <!-- Plan Summary -->
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="text-muted">Plan Summary</h6>
                            <div class="row g-3 mt-1">
                                <div class="col-6">
                                    <div class="border rounded p-2 text-center">
                                        <div class="h5 mb-0">${data.total_days}</div>
                                        <small class="text-muted">Total Days</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-2 text-center">
                                        <div class="h5 mb-0">${data.completion_stats?.completed ?? 0}</div>
                                        <small class="text-muted">Completed</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-2 text-center">
                                        <div class="h5 mb-0">${(data.avg_client_rating ?? 0)}/5</div>
                                        <small class="text-muted">Avg Rating</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-2 text-center">
                                        <div class="h5 mb-0">${(data.completion_rates?.completed ?? 0)}%</div>
                                        <small class="text-muted">Completion</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Completion Chart -->
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="text-muted">Completion Rates</h6>
                            <div class="chart-container" style="position: relative; height:200px;">
                                <canvas id="completionChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ratings Summary -->
                <div class="col-md-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <h6 class="text-muted">Ratings</h6>
                            <div class="d-flex align-items-center mb-2">
                                <div class="display-6 me-2">${rating.avg_rating ?? 0}</div>
                                <div class="text-muted">avg<br/><small>${rating.total_ratings ?? 0} ratings</small></div>
                            </div>
                            <div class="small mb-2">
                                ${(function(){
                                    const dist = rating.distribution || {}; 
                                    const stars = [5,4,3,2,1];
                                    return stars.map(s => {
                                        const c = dist[String(s)] || 0; 
                                        const tot = rating.total_ratings || 0; 
                                        const pct = tot ? Math.round(c*100/tot) : 0; 
                                        return `<div class="d-flex align-items-center mb-1"><span class="me-2">${s}★</span><div class="progress flex-grow-1" style="height:6px"><div class="progress-bar" style="width:${pct}%"></div></div><span class="ms-2">${c}</span></div>`;
                                    }).join('');
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Ratings Table (optional) -->
            ${rating.recent && rating.recent.length ? `
            <div class="row g-4 mt-1">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="text-muted mb-2">Recent Ratings</h6>
                            <div class="table-responsive">
                                <table class="table table-sm" id="recentRatingsTable">
                                    <thead>
                                        <tr><th>Date</th><th>Client</th><th>Day</th><th>Rating</th></tr>
                                    </thead>
                                    <tbody>
                                        ${rating.recent.map(r => `
                                            <tr>
                                                <td>${r.date}</td>
                                                <td>${r.client_name || ''}</td>
                                                <td>#${r.day_number}</td>
                                                <td>${r.rating}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>` : ''}

            <!-- Subscription KPIs -->
            ${subscriptions ? `
            <div class="row g-3 mt-1">
                ${[{
                    label:'Total Subs', value: subscriptions.total_subscriptions, icon:'bi-collection'
                },{
                    label:'Active', value: subscriptions.active_subscriptions, icon:'bi-check-circle'
                },{
                    label:'Pending', value: subscriptions.pending_subscriptions, icon:'bi-hourglass'
                },{
                    label:'Cancelled', value: subscriptions.cancelled_subscriptions, icon:'bi-x-circle'
                },{
                    label:'Avg Price', value: (typeof subscriptions.avg_price === 'number' ? subscriptions.avg_price.toFixed(2) : subscriptions.avg_price), icon:'bi-cash-stack'
                },{
                    label:'Churn', value: (subscriptions.churn_rate || 0) + '%', icon:'bi-arrow-repeat'
                }].map(k => `
                    <div class="col-6 col-md-4 col-lg-2">
                        <div class="border rounded p-2 text-center h-100">
                            <div class="small text-muted"><i class="bi ${k.icon} me-1"></i>${k.label}</div>
                            <div class="h6 mb-0">${k.value ?? 0}</div>
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}
        `;

        // Initialize charts/tables after DOM inject
        setTimeout(() => {
            try {
                const ctx = document.getElementById('completionChart');
                if (ctx) {
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: donutLabels,
                            datasets: [{
                                label: 'Completion Rate (%)',
                                data: donutValues,
                                backgroundColor: [
                                    'rgba(34,197,94,0.7)',
                                    'rgba(14,165,233,0.7)',
                                    'rgba(107,114,128,0.7)',
                                    'rgba(245,158,11,0.7)',
                                    'rgba(239,68,68,0.7)'
                                ],
                                borderWidth: 0,
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '65%'
                        }
                    });
                }
            } catch (e) { console.warn('Completion chart init failed', e); }

            try {
                const $ = window.jQuery || window.$;
                if ($ && $.fn && typeof $.fn.DataTable === 'function') {
                    const sel = '#recentRatingsTable';
                    if (document.querySelector(sel)) {
                        if ($.fn.DataTable.isDataTable(sel)) $(sel).DataTable().clear().destroy();
                        $(sel).DataTable({ paging: false, searching: false, info: false, order: [[0,'desc']] });
                    }
                }
            } catch (e) { /* ignore */ }
        }, 0);
    }

    /**
     * Build a query string from key-value pairs, ignoring null/undefined/empty values
     * @param {Object} params
     * @returns {string} leading '?' if any params, otherwise ''
     */
    static buildQuery(params = {}) {
        try {
            const searchParams = new URLSearchParams();
            Object.entries(params || {}).forEach(([k, v]) => {
                if (v === undefined || v === null) return;
                if (typeof v === 'string' && v.trim() === '') return;
                searchParams.append(k, v);
            });
            const qs = searchParams.toString();
            const queryString = qs ? `?${qs}` : '';
            console.debug('Built query string:', queryString, 'from params:', params);
            return queryString;
        } catch (e) {
            console.error('Error building query string:', e);
            return '';
        }
    }


    /**
     * Format currency
     * @param {number} amount
     * @param {string} currency
     * @returns {string}
     */
    static formatCurrency(amount, currency = 'EGP') {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency,
        }).format(amount);
    }
}

// Make available globally
window.CoachAnalyticsAPI = CoachAnalyticsAPI;

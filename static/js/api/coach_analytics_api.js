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
        const url = `${this.BASE_PATH}/plan-analytics/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                analytics: response.data.analytics 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client measurement insights
     * @param {string} clientId - Optional client ID to filter by
     * @returns {Promise<Object>} Measurement insights data
     */
    static async getMeasurementInsights(clientId = null) {
        let url = `${this.BASE_PATH}/measurement-insights/`;
        if (clientId) {
            url += `?client_id=${clientId}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                insights: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client quick stats
     * @returns {Promise<Object>} Client stats data
     */
    static async getClientStats() {
        const url = '/coach/client-stats/';
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                stats: response.data 
            };
        }
        
        return response; // Return error response
    }
    
    /**
     * Load analytics data into UI element
     * @param {string} elementId - Element ID to load analytics into
     */
    static async loadAnalyticsIntoElement(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Show loading spinner
        APIBase.showLoading(elementId);
        
        try {
            const analytics = await this.getPlanAnalytics();
            
            if (analytics.success) {
                this.renderAnalytics(element, analytics.analytics);
            } else {
                APIBase.showError(elementId, 'Failed to load analytics data');
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            APIBase.showError(elementId, 'Unable to connect to analytics service');
        }
    }
    
    /**
     * Render analytics data into element
     * @param {HTMLElement} element - Element to render analytics into
     * @param {Object} data - Analytics data
     */
    static renderAnalytics(element, data) {
        // Create completion rates chart data
        const completionRates = data.completion_rates;
        const chartData = {
            labels: Object.keys(completionRates).map(key => key.replace('_', ' ')),
            datasets: [{
                label: 'Completion Rate (%)',
                data: Object.values(completionRates),
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',  // completed (green)
                    'rgba(255, 193, 7, 0.7)',  // in_progress (yellow)
                    'rgba(108, 117, 125, 0.7)', // not_started (gray)
                    'rgba(220, 53, 69, 0.7)',  // skipped (red)
                    'rgba(23, 162, 184, 0.7)'   // rescheduled (cyan)
                ],
                borderColor: [
                    'rgb(40, 167, 69)',
                    'rgb(255, 193, 7)',
                    'rgb(108, 117, 125)',
                    'rgb(220, 53, 69)',
                    'rgb(23, 162, 184)'
                ],
                borderWidth: 1
            }]
        };
        
        // Render analytics HTML
        element.innerHTML = `
            <div class="row g-4">
                <!-- Summary Stats -->
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">Plan Summary</h5>
                            <div class="row g-3 mt-2">
                                <div class="col-6">
                                    <div class="border rounded p-3 text-center">
                                        <h3 class="mb-1">${data.total_days}</h3>
                                        <small class="text-muted">Total Plan Days</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-3 text-center">
                                        <h3 class="mb-1">${data.completion_stats.completed}</h3>
                                        <small class="text-muted">Completed Days</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-3 text-center">
                                        <h3 class="mb-1">${data.avg_client_rating}/5</h3>
                                        <small class="text-muted">Avg. Client Rating</small>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="border rounded p-3 text-center">
                                        <h3 class="mb-1">${data.completion_rates.completed}%</h3>
                                        <small class="text-muted">Completion Rate</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Completion Chart -->
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-body">
                            <h5 class="card-title">Completion Rates</h5>
                            <div class="chart-container" style="position: relative; height:200px;">
                                <canvas id="completionChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Plan Type Adherence -->
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Plan Type Adherence</h5>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Plan Type</th>
                                            <th>Total Days</th>
                                            <th>Completed Days</th>
                                            <th>Adherence Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.plan_type_adherence.map(plan => `
                                            <tr>
                                                <td>${plan.plan_type}</td>
                                                <td>${plan.total_days}</td>
                                                <td>${plan.completed_days}</td>
                                                <td>
                                                    <div class="progress" style="height: 10px;">
                                                        <div class="progress-bar bg-success" 
                                                            role="progressbar" 
                                                            style="width: ${plan.adherence_rate}%;" 
                                                            aria-valuenow="${plan.adherence_rate}" 
                                                            aria-valuemin="0" 
                                                            aria-valuemax="100">
                                                        </div>
                                                    </div>
                                                    <small>${plan.adherence_rate}%</small>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize chart
        setTimeout(() => {
            const ctx = document.getElementById('completionChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    }
                }
            });
        }, 0);
    }
}

// Make available globally
window.CoachAnalyticsAPI = CoachAnalyticsAPI;

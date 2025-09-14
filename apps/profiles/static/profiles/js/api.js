/**
 * API Utility functions for Easy Fit application
 */

// Check if the API has already been loaded to prevent duplicate declarations
if (typeof window.EasyFitAPILoaded === 'undefined') {
    window.EasyFitAPILoaded = true;
    
    // CSRF token utility function
    function getCsrfToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * Base API client for making authenticated requests to the backend
     */
    window.ApiClient = class {
        constructor(baseUrl = '/profiles/api/v1/') {
            this.baseUrl = baseUrl;
        }

        /**
         * Make a request via unified APIBase (handles JWT, CSRF, refresh, redirects)
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Fetch options
         * @returns {Promise} - Parsed JSON data
         */
        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            const method = (options.method || 'GET').toUpperCase();
            const reqOptions = {
                method,
                headers: { ...(options.headers || {}) },
            };
            if (options.body !== undefined) {
                reqOptions.body = options.body;
            }

            const result = await APIBase.request(url, reqOptions);
            if (result && result.success) return result.data;
            throw { status: 400, message: result && result.error ? result.error : 'Request failed' };
        }
        
        // GET request
        async get(endpoint, params = {}) {
            const queryParams = new URLSearchParams(params).toString();
            const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
            return this.request(url, { method: 'GET' });
        }
        
        // POST request
        async post(endpoint, data = {}) {
            return this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        
        // PATCH request
        async patch(endpoint, data = {}) {
            return this.request(endpoint, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
        }
        
        // PUT request
        async put(endpoint, data = {}) {
            return this.request(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        }
        
        // DELETE request
        async delete(endpoint) {
            return this.request(endpoint, { method: 'DELETE' });
        }
    };
    
    // Export the MeasurementService as a window property to avoid duplicates
    window.MeasurementService = class {
        constructor(apiClient) {
            this.apiClient = apiClient;
            this.endpoint = 'measurements/';
        }
        
        // Get all measurements
        async getAllMeasurements() {
            return this.apiClient.get(this.endpoint);
        }
        
        // Get a single measurement
        async getMeasurement(id) {
            return this.apiClient.get(`${this.endpoint}${id}/`);
        }
        
        // Create a new measurement
        async createMeasurement(data) {
            return this.apiClient.post(this.endpoint, data);
        }
        
        // Update a measurement
        async updateMeasurement(id, data) {
            return this.apiClient.patch(`${this.endpoint}${id}/`, data);
        }
        
        // Delete a measurement
        async deleteMeasurement(id) {
            return this.apiClient.delete(`${this.endpoint}${id}/`);
        }
    };

    /**
     * Global fetchAPI function to simplify API calls
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method (GET, POST, etc)
     * @param {Object} data - Request data (for POST, PUT, PATCH)
     * @returns {Promise} - Response data
     */
    window.fetchAPI = async function(endpoint, method = 'GET', data = null, retried = false) {
        const baseUrl = '/profiles/api/v1/';
        const url = (endpoint.startsWith('http') || endpoint.startsWith('/')) ? endpoint : `${baseUrl}${endpoint}`;
        const opts = { method: method.toUpperCase(), headers: { 'Accept': 'application/json' } };
        if (data && ['POST', 'PUT', 'PATCH'].includes(opts.method)) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(data);
        }
        const result = await APIBase.request(url, opts);
        if (result && result.success) return result.data;
        throw { status: 400, message: result && result.error ? result.error : 'Request failed' };
    };
    
    // Export ProgressReportService as a window property to avoid duplicates
    if (typeof window.ProgressReportService === 'undefined') {
        window.ProgressReportService = class {
        constructor(apiClient) {
            this.apiClient = apiClient;
            this.endpoint = 'progress-reports/';
        }
        
        // Get all progress reports
        async getAllReports() {
            return this.apiClient.get(this.endpoint);
        }
        
        // Get a single report
        async getReport(id) {
            return this.apiClient.get(`${this.endpoint}${id}/`);
        }
        
        // Create a new report
        async createReport(data) {
            return this.apiClient.post(this.endpoint, data);
        }
        
        // Update a report
        async updateReport(id, data) {
            return this.apiClient.patch(`${this.endpoint}${id}/`, data);
        }
        
        // Delete a report
        async deleteReport(id) {
            return this.apiClient.delete(`${this.endpoint}${id}/`);
        }
    };
    }
}

    // Export DietRequestService as a window property to avoid duplicates
    if (typeof window.DietRequestService === 'undefined') {
        window.DietRequestService = class {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = 'diet-requests/';
    }
    
    // Get all diet requests
    async getAllRequests() {
        return this.apiClient.get(this.endpoint);
    }
    
    // Get a single diet request
    async getRequest(id) {
        return this.apiClient.get(`${this.endpoint}${id}/`);
    }
    
    // Create a new diet request
    async createRequest(data) {
        return this.apiClient.post(this.endpoint, data);
    }
    
    // Accept an offer
    async acceptOffer(id) {
        return this.apiClient.post(`${this.endpoint}${id}/accept_offer/`);
    }
    
    // Reject an offer
    async rejectOffer(id) {
        return this.apiClient.post(`${this.endpoint}${id}/reject_offer/`);
    }
    
    // Cancel a diet request
    async cancelRequest(id) {
        return this.apiClient.post(`${this.endpoint}${id}/cancel/`);
    }
};
    }

/**
 * Client API service for subscriptions
 */
if (!window.SubscriptionService) {
class SubscriptionService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = 'subscriptions/';
    }
    
    // Get all subscriptions
    async getAllSubscriptions() {
        return this.apiClient.get(this.endpoint);
    }
    
    // Get a single subscription
    async getSubscription(id) {
        return this.apiClient.get(`${this.endpoint}${id}/`);
    }
    
    // Pause a subscription
    async pauseSubscription(id) {
        return this.apiClient.post(`${this.endpoint}${id}/pause/`);
    }
    
    // Resume a subscription
    async resumeSubscription(id) {
        return this.apiClient.post(`${this.endpoint}${id}/resume/`);
    }
    
    // Cancel a subscription
    async cancelSubscription(id) {
        return this.apiClient.post(`${this.endpoint}${id}/cancel/`);
    }
}
    window.SubscriptionService = SubscriptionService;
}

// Initialize services
const apiClient = new ApiClient();
const measurementService = new MeasurementService(apiClient);
const progressReportService = new ProgressReportService(apiClient);
const dietRequestService = new DietRequestService(apiClient);
const subscriptionService = new SubscriptionService(apiClient);

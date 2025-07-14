/**
 * API Utility functions for Eazy Fit application
 */

// Check if the API has already been loaded to prevent duplicate declarations
if (typeof window.EazyFitAPILoaded === 'undefined') {
    window.EazyFitAPILoaded = true;
    
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
        constructor(baseUrl, csrfToken) {
            this.baseUrl = baseUrl;
            this.csrfToken = csrfToken;
        }

        /**
         * Make a fetch request with appropriate headers and error handling
         * @param {string} endpoint - API endpoint
         * @param {Object} options - Fetch options
         * @returns {Promise} - Response data or error
         */
        async request(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            
            // Set default headers
            const headers = {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken,
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                ...(options.headers || {})
            };
            
            try {
                const response = await fetch(url, {
                    ...options,
                    headers
                });
                
                // Check if the response is JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    
                    // Check if the request was successful
                    if (!response.ok) {
                        // Check for 401 to handle token refresh
                        if (response.status === 401 && typeof window.refreshToken === 'function') {
                            try {
                                await window.refreshToken();
                                // Retry the request with new token
                                return this.request(endpoint, options);
                            } catch (refreshError) {
                                console.error('Token refresh failed:', refreshError);
                                throw {
                                    status: response.status,
                                    message: 'Authentication failed',
                                    data
                                };
                            }
                        }
                        
                        throw {
                            status: response.status,
                            message: data.error || data.detail || 'An error occurred',
                            data
                        };
                    }
                    
                    return data;
                } else {
                    // Handle non-JSON responses
                    if (!response.ok) {
                        throw {
                            status: response.status,
                            message: 'An error occurred'
                        };
                    }
                    
                    return await response.text();
                }
            } catch (error) {
                console.error('API request failed:', error);
                throw error;
            }
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
    window.fetchAPI = async function(endpoint, method = 'GET', data = null) {
        // Base API URL - need to include the app prefix
        const baseUrl = '/profiles/api/v1/';
        const url = `${baseUrl}${endpoint}`;
        
        // Get JWT token from localStorage
        const token = localStorage.getItem('access_token');
        if (!token && typeof window.refreshToken === 'function') {
            try {
                await window.refreshToken();
            } catch (e) {
                console.error('Failed to refresh token:', e);
            }
        }
        
        // Request options with authentication headers
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
            }
        };
        
        // Add request body for non-GET requests
        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            
            // Check if the response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const jsonData = await response.json();
                
                // Check if response was successful
                if (!response.ok) {
                    // Handle 401 unauthorized with token refresh
                    if (response.status === 401 && typeof window.refreshToken === 'function') {
                        try {
                            await window.refreshToken();
                            // Retry with fresh token
                            return window.fetchAPI(endpoint, method, data);
                        } catch (refreshError) {
                            console.error('Token refresh failed during fetch:', refreshError);
                            throw {
                                status: response.status,
                                message: 'Authentication failed',
                                data: jsonData
                            };
                        }
                    }
                    
                    throw {
                        status: response.status,
                        message: jsonData.error || jsonData.detail || 'An error occurred',
                        data: jsonData
                    };
                }
                
                return jsonData;
            } else {
                // Handle non-JSON responses
                if (!response.ok) {
                    throw {
                        status: response.status,
                        message: 'An error occurred'
                    };
                }
                
                return await response.text();
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    };
    
    // Export ProgressReportService as a window property to avoid duplicates
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

/**
 * Client API service for measurements
 */
class MeasurementService {
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
}

/**
 * Global fetchAPI function to simplify API calls
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method (GET, POST, etc)
 * @param {Object} data - Request data (for POST, PUT, PATCH)
 * @returns {Promise} - Response data
 */
async function fetchAPI(endpoint, method = 'GET', data = null) {
    // Base API URL - need to include the app prefix
    const baseUrl = '/profiles/api/v1/';
    const url = `${baseUrl}${endpoint}`;
    
    // Get JWT token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn('No authentication token found. User may need to login.');
        // Attempt to refresh the token first
        try {
            if (typeof refreshToken === 'function') {
                await refreshToken();
            }
        } catch (e) {
            console.error('Failed to refresh token:', e);
        }
    }
    
    // Request options with authentication headers
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRFToken': getCsrfToken(),
            'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        }
    };
    
    // Add request body for non-GET requests
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        // Check if the response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const jsonData = await response.json();
            
            // Check if response was successful
            if (!response.ok) {
                throw {
                    status: response.status,
                    message: jsonData.error || jsonData.detail || 'An error occurred',
                    data: jsonData
                };
            }
            
            return jsonData;
        } else {
            // Handle non-JSON responses
            if (!response.ok) {
                throw {
                    status: response.status,
                    message: 'An error occurred'
                };
            }
            
            return await response.text();
        }
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Client API service for progress reports
 */
class ProgressReportService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.endpoint = 'progress-reports/';
    }
    
    // Get all progress reports
    async getAllReports() {
        return this.apiClient.get(this.endpoint);
    }
    
    // Get reports for a specific subscription
    async getReportsBySubscription(subscriptionId) {
        return this.apiClient.get(`${this.endpoint}by_subscription/`, { subscription_id: subscriptionId });
    }
    
    // Get a single report
    async getReport(id) {
        return this.apiClient.get(`${this.endpoint}${id}/`);
    }
    
    // Add a comment to a report
    async addComment(id, comment) {
        return this.apiClient.patch(`${this.endpoint}${id}/add_comment/`, { client_comment: comment });
    }
}

/**
 * Client API service for diet requests
 */
class DietRequestService {
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
}

/**
 * Client API service for subscriptions
 */
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

// Initialize services
const apiClient = new ApiClient();
const measurementService = new MeasurementService(apiClient);
const progressReportService = new ProgressReportService(apiClient);
const dietRequestService = new DietRequestService(apiClient);
const subscriptionService = new SubscriptionService(apiClient);

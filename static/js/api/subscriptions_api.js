/**
 * Subscriptions API
 * Handles API calls for plan subscriptions using the shared APIBase
 */

class SubscriptionsAPI {
    /**
     * API endpoint base path
     */
    static BASE_PATH = '/plan-management/api/v1/plan-subscriptions';

    /**
     * Get client subscriptions with pagination
     * @param {Object} options - Optional query parameters (page, page_size, status)
     * @returns {Promise<Object>} Subscriptions data with pagination
     */
    static async getSubscriptions(options = {}) {
        let url = `${this.BASE_PATH}/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = PaginationUtils.getPaginationQueryParams(
                options.page || 1,
                options.page_size || 10,
                {
                    status: options.status,
                    plan_type: options.plan_type,
                    is_active: options.is_active
                }
            );
            url += `?${params}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            // Handle both paginated (object with results) and non-paginated (array) responses
            const data = response.data;
            const isArray = Array.isArray(data);
            const subs = isArray ? data : (data.results || []);
            const count = isArray ? subs.length : (data.count ?? subs.length);
            const pageSize = options.page_size || (isArray ? (subs.length || 10) : (data.page_size || 10));
            return {
                success: true,
                subscriptions: subs,
                pagination: {
                    count: count,
                    next: isArray ? null : data.next,
                    previous: isArray ? null : data.previous,
                    current_page: options.page || 1,
                    total_pages: Math.max(1, Math.ceil((count || 0) / (pageSize || 10))),
                    page_size: pageSize
                }
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get subscription details
     * @param {number} id - Subscription ID
     * @returns {Promise<Object>} Subscription details
     */
    static async getSubscription(id) {
        const url = `${this.BASE_PATH}/${id}/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                subscription: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Create new subscription
     * @param {Object} subscriptionData - Subscription data to create
     * @returns {Promise<Object>} Created subscription data
     */
    static async createSubscription(subscriptionData) {
        const url = `${this.BASE_PATH}/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(subscriptionData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                subscription: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Update subscription
     * @param {number} id - Subscription ID
     * @param {Object} subscriptionData - Subscription data to update
     * @returns {Promise<Object>} Updated subscription data
     */
    static async updateSubscription(id, subscriptionData) {
        const url = `${this.BASE_PATH}/${id}/`;
        const options = {
            method: 'PATCH',
            body: JSON.stringify(subscriptionData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                subscription: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Cancel subscription
     * @param {number} id - Subscription ID
     * @param {Object} cancelData - Cancellation data (reason, etc.)
     * @returns {Promise<Object>} Response data
     */
    static async cancelSubscription(id, cancelData = {}) {
        const url = `${this.BASE_PATH}/${id}/cancel/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(cancelData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return {
                success: true,
                data: response.data
            };
        }
        
        return response; // Return error response
    }

    /**
     * Activate subscription (custom action)
     * @param {number} id - Subscription ID
     * @param {Object} payload - Optional payload (if API supports extra fields)
     * @returns {Promise<Object>} Response data
     */
    static async activateSubscription(id, payload = {}) {
        const url = `${this.BASE_PATH}/${id}/activate/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(payload)
        };
        const response = await APIBase.request(url, options);
        if (response.success) {
            return {
                success: true,
                data: response.data
            };
        }
        return response;
    }

    /**
     * Complete subscription (custom action)
     * @param {number} id - Subscription ID
     * @param {Object} payload - Optional payload
     * @returns {Promise<Object>} Response data
     */
    static async completeSubscription(id, payload = {}) {
        const url = `${this.BASE_PATH}/${id}/complete/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(payload)
        };
        const response = await APIBase.request(url, options);
        if (response.success) {
            return {
                success: true,
                data: response.data
            };
        }
        return response;
    }

    /**
     * Get available plans for subscription
     * @param {Object} options - Optional query parameters (plan_type, coach_id)
     * @returns {Promise<Object>} Available plans data
     */
    static async getAvailablePlans(options = {}) {
        let url = `${this.BASE_PATH}/available-plans/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(options)) {
                if (value !== null && value !== undefined) {
                    params.append(key, value);
                }
            }
            url += `?${params.toString()}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                plans: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get subscription analytics
     * @param {Object} options - Optional query parameters
     * @returns {Promise<Object>} Subscription analytics data
     */
    static async getSubscriptionAnalytics(options = {}) {
        let url = `${this.BASE_PATH}/analytics/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(options)) {
                if (value !== null && value !== undefined) {
                    params.append(key, value);
                }
            }
            url += `?${params.toString()}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                analytics: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Format subscription status for display
     * @param {string} status - Subscription status
     * @returns {Object} Formatted status with text and class
     */
    static formatStatus(status) {
        const statusMap = {
            'active': { text: 'Active', class: 'badge bg-success' },
            'pending': { text: 'Pending', class: 'badge bg-warning text-dark' },
            'cancelled': { text: 'Cancelled', class: 'badge bg-danger' },
            'expired': { text: 'Expired', class: 'badge bg-secondary' },
            'completed': { text: 'Completed', class: 'badge bg-info' }
        };
        
        return statusMap[status] || { text: status, class: 'badge bg-secondary' };
    }

    /**
     * Format date for display
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Make available globally
window.SubscriptionsAPI = SubscriptionsAPI;

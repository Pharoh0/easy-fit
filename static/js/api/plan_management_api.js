/**
 * Plan Management API
 * Handles API calls for plan management using the shared APIBase
 */

class PlanManagementAPI {
    /**
     * API endpoint base path
     */
    static BASE_PATH = '/plan-management/api/v1';

    /**
     * Get coach plans with pagination
     * @param {Object} options - Optional query parameters (page, page_size, plan_type)
     * @returns {Promise<Object>} Plans data with pagination
     */
    static async getCoachPlans(options = {}) {
        let url = `${this.BASE_PATH}/coach/plans/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = PaginationUtils.getPaginationQueryParams(
                options.page || 1,
                options.page_size || 10,
                {
                    plan_type: options.plan_type,
                    status: options.status
                }
            );
            url += `?${params}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                plans: response.data.results,
                pagination: {
                    count: response.data.count,
                    next: response.data.next,
                    previous: response.data.previous,
                    current_page: options.page || 1,
                    total_pages: Math.ceil(response.data.count / (options.page_size || 10)),
                    page_size: options.page_size || 10
                }
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get coach plan details
     * @param {number} planId - Plan ID
     * @returns {Promise<Object>} Plan details
     */
    static async getCoachPlan(planId) {
        const url = `${this.BASE_PATH}/coach/plans/${planId}/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                plan: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Create new coach plan
     * @param {Object} planData - Plan data to create
     * @returns {Promise<Object>} Created plan data
     */
    static async createCoachPlan(planData) {
        const url = `${this.BASE_PATH}/coach/plans/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(planData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                plan: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Update coach plan
     * @param {number} planId - Plan ID
     * @param {Object} planData - Plan data to update
     * @returns {Promise<Object>} Updated plan data
     */
    static async updateCoachPlan(planId, planData) {
        const url = `${this.BASE_PATH}/coach/plans/${planId}/`;
        const options = {
            method: 'PATCH',
            body: JSON.stringify(planData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                plan: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Delete coach plan
     * @param {number} planId - Plan ID
     * @returns {Promise<Object>} Response data
     */
    static async deleteCoachPlan(planId) {
        const url = `${this.BASE_PATH}/coach/plans/${planId}/`;
        const options = {
            method: 'DELETE'
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get coach client plan details
     * @param {number} subscriptionId - Subscription ID
     * @returns {Promise<Object>} Client plan details
     */
    static async getCoachClientPlan(subscriptionId) {
        const url = `${this.BASE_PATH}/coach/client-plans/${subscriptionId}/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                clientPlan: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get plan days for a client plan
     * @param {number} subscriptionId - Subscription ID
     * @param {Object} options - Optional query parameters (page, page_size, status)
     * @returns {Promise<Object>} Plan days data with pagination
     */
    static async getPlanDays(subscriptionId, options = {}) {
        let url = `${this.BASE_PATH}/coach/client-plans/${subscriptionId}/days/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = PaginationUtils.getPaginationQueryParams(
                options.page || 1,
                options.page_size || 10,
                {
                    status: options.status,
                    date_from: options.date_from,
                    date_to: options.date_to
                }
            );
            url += `?${params}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                planDays: response.data.results,
                pagination: {
                    count: response.data.count,
                    next: response.data.next,
                    previous: response.data.previous,
                    current_page: options.page || 1,
                    total_pages: Math.ceil(response.data.count / (options.page_size || 10)),
                    page_size: options.page_size || 10
                }
            };
        }
        
        return response; // Return error response
    }

    /**
     * Create plan day
     * @param {number} subscriptionId - Subscription ID
     * @param {Object} planDayData - Plan day data to create
     * @returns {Promise<Object>} Created plan day data
     */
    static async createPlanDay(subscriptionId, planDayData) {
        const url = `${this.BASE_PATH}/coach/client-plans/${subscriptionId}/days/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(planDayData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                planDay: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Update plan day
     * @param {number} subscriptionId - Subscription ID
     * @param {number} planDayId - Plan day ID
     * @param {Object} planDayData - Plan day data to update
     * @returns {Promise<Object>} Updated plan day data
     */
    static async updatePlanDay(subscriptionId, planDayId, planDayData) {
        const url = `${this.BASE_PATH}/coach/client-plans/${subscriptionId}/days/${planDayId}/`;
        const options = {
            method: 'PATCH',
            body: JSON.stringify(planDayData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                planDay: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Delete plan day
     * @param {number} subscriptionId - Subscription ID
     * @param {number} planDayId - Plan day ID
     * @returns {Promise<Object>} Response data
     */
    static async deletePlanDay(subscriptionId, planDayId) {
        const url = `${this.BASE_PATH}/coach/client-plans/${subscriptionId}/days/${planDayId}/`;
        const options = {
            method: 'DELETE'
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true
            };
        }
        
        return response; // Return error response
    }

    /**
     * Format plan type for display
     * @param {string} planType - Plan type
     * @returns {Object} Formatted plan type with text and class
     */
    static formatPlanType(planType) {
        const planTypeMap = {
            'workout': { text: 'Workout', class: 'badge bg-primary' },
            'diet': { text: 'Diet', class: 'badge bg-success' }
        };
        
        return planTypeMap[planType] || { text: planType, class: 'badge bg-secondary' };
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
window.PlanManagementAPI = PlanManagementAPI;

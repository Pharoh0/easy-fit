/**
 * Measurements API
 * Handles API calls for client measurements using the shared APIBase
 */

class MeasurementsAPI {
    /**
     * API endpoint base path
     */
    static BASE_PATH = '/api/v1/measurements';

    /**
     * Get client measurements with pagination
     * @param {Object} options - Optional query parameters (page, page_size, date_from, date_to)
     * @returns {Promise<Object>} Measurements data with pagination
     */
    static async getMeasurements(options = {}) {
        let url = `${this.BASE_PATH}/`;
        
        // Add query parameters if provided
        if (Object.keys(options).length > 0) {
            const params = PaginationUtils.getPaginationQueryParams(
                options.page || 1,
                options.page_size || 10,
                {
                    date_from: options.date_from,
                    date_to: options.date_to,
                    type: options.type
                }
            );
            url += `?${params}`;
        }
        
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                measurements: response.data.results,
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
     * Get latest measurement
     * @returns {Promise<Object>} Latest measurement data
     */
    static async getLatestMeasurement() {
        const url = `${this.BASE_PATH}/latest/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                measurement: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Create new measurement
     * @param {Object} measurementData - Measurement data to create
     * @returns {Promise<Object>} Created measurement data
     */
    static async createMeasurement(measurementData) {
        const url = `${this.BASE_PATH}/`;
        const options = {
            method: 'POST',
            body: JSON.stringify(measurementData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                measurement: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Update measurement
     * @param {number} id - Measurement ID
     * @param {Object} measurementData - Measurement data to update
     * @returns {Promise<Object>} Updated measurement data
     */
    static async updateMeasurement(id, measurementData) {
        const url = `${this.BASE_PATH}/${id}/`;
        const options = {
            method: 'PUT',
            body: JSON.stringify(measurementData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                measurement: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Delete measurement
     * @param {number} id - Measurement ID
     * @returns {Promise<Object>} Response data
     */
    static async deleteMeasurement(id) {
        const url = `${this.BASE_PATH}/${id}/`;
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
     * Get measurement analytics
     * @param {Object} options - Optional query parameters (date_from, date_to)
     * @returns {Promise<Object>} Measurement analytics data
     */
    static async getMeasurementAnalytics(options = {}) {
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
window.MeasurementsAPI = MeasurementsAPI;

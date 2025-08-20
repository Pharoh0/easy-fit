/**
 * Client Profile API
 * Handles API calls for client profile operations using the shared APIBase
 */

class ClientProfileAPI {
    /**
     * API endpoint base path
     */
    static BASE_PATH = '/api/v1/profiles/client';

    /**
     * Get client profile data
     * @returns {Promise<Object>} Client profile data
     */
    static async getProfile() {
        const url = `${this.BASE_PATH}/profile/`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                profile: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Update client profile
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<Object>} Updated profile data
     */
    static async updateProfile(profileData) {
        const url = `${this.BASE_PATH}/profile/`;
        const options = {
            method: 'PUT',
            body: JSON.stringify(profileData)
        };
        
        const response = await APIBase.request(url, options);
        
        if (response.success) {
            return { 
                success: true, 
                profile: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client measurements
     * @param {Object} options - Optional query parameters
     * @returns {Promise<Object>} Measurements data
     */
    static async getMeasurements(options = {}) {
        let url = `${this.BASE_PATH}/measurements/`;
        
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
                measurements: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client progress gallery
     * @param {Object} options - Optional query parameters
     * @returns {Promise<Object>} Progress gallery data
     */
    static async getProgressGallery(options = {}) {
        let url = `${this.BASE_PATH}/progress-gallery/`;
        
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
                gallery: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client progress reports
     * @param {Object} options - Optional query parameters
     * @returns {Promise<Object>} Progress reports data
     */
    static async getProgressReports(options = {}) {
        let url = `${this.BASE_PATH}/progress-reports/`;
        
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
                reports: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Get client recent activity
     * @param {number} limit - Maximum number of activities to return
     * @returns {Promise<Object>} Recent activity data
     */
    static async getRecentActivity(limit = 10) {
        const url = `${this.BASE_PATH}/recent-activity/?limit=${limit}`;
        const response = await APIBase.request(url);
        
        if (response.success) {
            return { 
                success: true, 
                activities: response.data 
            };
        }
        
        return response; // Return error response
    }

    /**
     * Format activity level for display
     * @param {string} activityLevel - Activity level code
     * @returns {string} Formatted activity level
     */
    static formatActivityLevel(activityLevel) {
        const activityLevels = {
            'sedentary': 'Sedentary (little or no exercise)',
            'lightly_active': 'Lightly Active (light exercise/sports 1-3 days/week)',
            'moderately_active': 'Moderately Active (moderate exercise/sports 3-5 days/week)',
            'very_active': 'Very Active (hard exercise/sports 6-7 days/week)',
            'extremely_active': 'Extremely Active (very hard exercise & physical job or training twice a day)'
        };
        
        return activityLevels[activityLevel] || activityLevel;
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

    /**
     * Format time ago for display
     * @param {string} dateString - Date string
     * @returns {string} Time ago string
     */
    static formatTimeAgo(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffMonth / 12);
        
        if (diffYear > 0) {
            return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
        } else if (diffMonth > 0) {
            return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
        } else if (diffDay > 0) {
            return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
        } else if (diffHour > 0) {
            return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
        } else if (diffMin > 0) {
            return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
        } else {
            return 'Just now';
        }
    }
}

// Make available globally
window.ClientProfileAPI = ClientProfileAPI;

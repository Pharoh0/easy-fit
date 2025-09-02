/**
 * API Base Utility
 * Provides shared functionality for all API modules with JWT authentication
 */

class APIBase {
    /**
     * Get JWT token from storage
     * @returns {string|null} JWT token or null if not found
     */
    static getJWTToken() {
        // Prefer unified key 'access_token', then fall back to legacy 'jwt_token'
        let token = localStorage.getItem('access_token');
        if (token) return token;

        token = localStorage.getItem('jwt_token');
        if (token) return token;

        // Try sessionStorage
        token = sessionStorage.getItem('access_token');
        if (token) return token;

        token = sessionStorage.getItem('jwt_token');
        if (token) return token;

        // Try cookie as fallback
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'access_token' || name === 'jwt_token') {
                return value;
            }
        }
        
        return null;
    }

    /**
     * Get CSRF token from cookie
     * @returns {string|null} CSRF token or null if not found
     */
    static getCSRFToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrftoken') {
                return value;
            }
        }
        return null;
    }

    /**
     * Check if token needs refresh (within 5 minutes of expiry)
     * @param {string} token - JWT token
     * @returns {boolean} True if token needs refresh
     */
    static tokenNeedsRefresh(token) {
        try {
            // JWT tokens are base64 encoded with 3 parts separated by dots
            const payload = token.split('.')[1];
            // Decode the base64 payload
            const decodedPayload = JSON.parse(atob(payload));
            // Check if exp claim exists
            if (!decodedPayload.exp) return false;
            
            // Get expiry time in milliseconds
            const expiryTime = decodedPayload.exp * 1000;
            // Get current time plus 5 minutes in milliseconds
            const currentTimePlus5Min = Date.now() + (5 * 60 * 1000);
            
            // Return true if token expires within 5 minutes
            return expiryTime < currentTimePlus5Min;
        } catch (error) {
            console.error('Error checking token expiry:', error);
            return false;
        }
    }

    /**
     * Refresh JWT token
     * @returns {Promise<string|null>} New JWT token or null if refresh failed
     */
    static async refreshToken() {
        try {
            const response = await fetch('/auth-users/api/v1/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            // Store new tokens (unified) and keep legacy keys in sync for compatibility
            try {
                // Always set unified keys in localStorage
                localStorage.setItem('access_token', data.access);
                if (data.refresh) localStorage.setItem('refresh_token', data.refresh);

                // If legacy/local keys exist, keep them updated too
                if (localStorage.getItem('jwt_token')) {
                    localStorage.setItem('jwt_token', data.access);
                }
                if (sessionStorage.getItem('jwt_token')) {
                    sessionStorage.setItem('jwt_token', data.access);
                }
                if (sessionStorage.getItem('access_token')) {
                    sessionStorage.setItem('access_token', data.access);
                }
                if (data.refresh && sessionStorage.getItem('refresh_token')) {
                    sessionStorage.setItem('refresh_token', data.refresh);
                }
            } catch (e) {
                console.warn('Failed to persist refreshed tokens in all stores:', e);
            }
            
            return data.access;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return null;
        }
    }

    /**
     * Make authenticated API request with automatic token refresh
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} API response
     */
    static async request(url, options = {}) {
        // Set default options
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        // Merge options with deep header merge
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: { ...(defaultOptions.headers || {}), ...((options && options.headers) || {}) }
        };
        
        // Get JWT token
        let token = this.getJWTToken();
        
        // Check if token needs refresh
        if (token && this.tokenNeedsRefresh(token)) {
            token = await this.refreshToken();
        }
        
        // Add JWT token to headers if available
        if (token) {
            mergedOptions.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Add CSRF token for non-GET requests
        if (mergedOptions.method !== 'GET') {
            const csrfToken = this.getCSRFToken();
            if (csrfToken) {
                mergedOptions.headers['X-CSRFToken'] = csrfToken;
            }
        }
        
        // If body is FormData, let browser set Content-Type with boundary automatically
        if (mergedOptions.body instanceof FormData) {
            delete mergedOptions.headers['Content-Type'];
        }
        
        try {
            // Make API request
            const response = await fetch(url, mergedOptions);
            
            // Handle 401 Unauthorized (token expired or invalid)
            if (response.status === 401) {
                // Try to refresh token if not already tried
                if (!options._tokenRefreshed) {
                    const newToken = await this.refreshToken();
                    if (newToken) {
                        // Retry request with new token
                        return this.request(url, { 
                            ...options, 
                            _tokenRefreshed: true,
                            headers: { 
                                ...options.headers,
                                'Authorization': `Bearer ${newToken}`
                            }
                        });
                    }
                }
                
                // If caller opts out of auto-redirect on 401, return gracefully
                if (options && options.noRedirectOn401) {
                    return { success: false, status: 401, error: 'Authentication required' };
                }

                // Redirect to login if token refresh failed
                try {
                    const loginUrl = (window.LOGIN_URL || '/auth-users/login/');
                    const currentUrl = window.location.href;
                    // Avoid redirect loop if already on login page
                    if (window.location.pathname !== loginUrl) {
                        window.location.href = `${loginUrl}?next=${encodeURIComponent(currentUrl)}`;
                    }
                } catch (e) {
                    window.location.href = '/auth-users/login/';
                }
                
                return { success: false, error: 'Authentication failed' };
            }
            
            // Handle other error responses
            if (!response.ok) {
                const contentType = (response.headers && response.headers.get) ? (response.headers.get('content-type') || '') : '';
                const raw = await response.text();
                let errorJSON = null;
                let message = '';

                const trimmed = (raw || '').trim();
                if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
                    try { errorJSON = JSON.parse(trimmed); } catch (e) { /* ignore parse failure */ }
                }

                if (errorJSON) {
                    if (typeof errorJSON === 'string') {
                        message = errorJSON;
                    } else if (errorJSON.detail) {
                        message = String(errorJSON.detail);
                    } else if (errorJSON.error) {
                        message = String(errorJSON.error);
                    } else if (errorJSON.message) {
                        message = String(errorJSON.message);
                    } else if (Array.isArray(errorJSON)) {
                        message = errorJSON.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(', ');
                    } else {
                        try { message = JSON.stringify(errorJSON); } catch (e) { message = ''; }
                    }
                }

                const errorText = message || raw || `HTTP ${response.status}`;
                console.error('API Error:', errorText);
                return { success: false, status: response.status, error: errorText, errorJSON };
            }
            
            // Parse JSON response safely (support 204/empty)
            const text = await response.text();
            if (!text) {
                return { success: true, data: null };
            }
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If response is not JSON, return raw text
                data = text;
            }
            return { success: true, data };
        } catch (error) {
            console.error('API Request failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Show loading spinner in element
     * @param {string} elementId - Element ID to show loading spinner in
     */
    static showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Show error message in element
     * @param {string} elementId - Element ID to show error message in
     * @param {string} message - Error message to display
     */
    static showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    ${message}
                </div>
            `;
        }
    }
    
    /**
     * Show empty state message in element
     * @param {string} elementId - Element ID to show empty state message in
     * @param {string} message - Empty state message to display
     */
    static showEmptyState(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-muted">
                        <i class="bi bi-inbox fs-2 mb-2"></i>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// Make available globally
window.APIBase = APIBase;

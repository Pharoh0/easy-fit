/**
 * Authentication utilities for Eazy Fit application
 */

// Get JWT tokens from localStorage
function getAccessToken() {
    return localStorage.getItem('access_token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

// Store tokens in localStorage
function setTokens(access, refresh = null) {
    localStorage.setItem('access_token', access);
    if (refresh) {
        localStorage.setItem('refresh_token', refresh);
    }
}

// Clear tokens from localStorage
function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAccessToken();
}

// Get CSRF token from cookies for secure AJAX requests
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

// Get authorization headers for API requests
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRFToken': getCsrfToken()
    };
    
    const accessToken = getAccessToken();
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    return headers;
}

// Refresh token if expired
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }
    
    try {
        const response = await fetch('/auth-users/api/token/refresh/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        
        const data = await response.json();
        setTokens(data.access);
        return data.access;
    } catch (error) {
        clearTokens();
        window.location.href = '/auth-users/login/';
        throw error;
    }
}

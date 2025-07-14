// auth_jwt.js
function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        // User is not logged in, silently return without error
        return;
    }

    fetch("/auth-users/api/v1/token/refresh/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else if (response.status === 401 || response.status === 500) {
            handleTokenExpiry();  // Handle the expiration or invalidation case
            throw new Error('Refresh token expired or invalid.');
        } else {
            throw new Error('Failed to refresh token.');
        }
    })
    .then(data => {
        // Update the tokens in localStorage
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);  // Store the new refresh token
        console.log("Access token refreshed:", data.access);
    })
    .catch(error => {
        console.error('Error refreshing token:', error.message);
    });
}

function logout() {
    console.log('Logout function called');
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    if (!refreshToken || !accessToken) {
        console.log('No tokens found, redirecting to login page');
        alert("Session has already expired. Please log in again.");
        window.location.href = "/auth-users/login/";  // Redirect to login page
        return;
    }

    console.log('Attempting to logout with tokens');
    // JWT Logout
    fetch("/auth-users/api/v1/logout/", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ refresh: refreshToken })
    })
    .then(response => {
        console.log('Logout response status:', response.status);
        // Always remove tokens regardless of response
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (response.ok) {
            console.log('Successful logout, redirecting to login page');
            window.location.href = "/auth-users/login/";  // Redirect to login page
        } else if (response.status === 401) {
            console.error('Unauthorized request. Possibly due to expired token.');
            // Still redirect to login page
            window.location.href = "/auth-users/login/";
        } else {
            console.error('Failed to logout but tokens removed, redirecting to login page.');
            window.location.href = "/auth-users/login/";
        }
    })
    .catch(error => {
        console.error('Error occurred during logout:', error.message);
        // Still remove tokens and redirect on error
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = "/auth-users/login/";
    });
}

function handleTokenExpiry() {
    // Clear the tokens from local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // Notify the user and redirect to the login page
    alert("Your session has expired. Please log in again.");
    window.location.href = "/auth-users/login/";
}

// Automatically refresh the token before it expires
function scheduleTokenRefresh() {
    // Check if user is logged in before scheduling a refresh
    const refreshTokenValue = localStorage.getItem('refresh_token');
    if (!refreshTokenValue) {
        // No token to refresh, check again later
        setTimeout(scheduleTokenRefresh, 30000); // Check again in 30 seconds
        return;
    }
    
    const accessTokenLifetime = 60 * 1000; // 1 minute in milliseconds
    setTimeout(() => {
        refreshToken(); // Call the function to refresh the token
        scheduleTokenRefresh(); // Schedule the next refresh
    }, accessTokenLifetime - 5000); // Refresh 5 seconds before expiration
}

// Schedule the first token refresh after the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded, scheduling token refresh');
    scheduleTokenRefresh();
    
    // Ensure logout button is properly bound
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        console.log('Logout button found, adding event listener');
        logoutButton.addEventListener('click', function(event) {
            console.log('Logout button clicked');
            event.preventDefault();
            logout();
        });
    } else {
        console.log('Logout button not found in the DOM');
    }
});

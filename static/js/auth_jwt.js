// auth_jwt.js
function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        console.error("No refresh token found.");
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
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    if (!refreshToken || !accessToken) {
        alert("Session has already expired. Please log in again.");
        window.location.href = "/auth-users/login/";  // Redirect to login page
        return;
    }

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
        if (response.ok) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = "/auth-users/login/";  // Redirect to login page
        } else {
            console.error('Failed to logout.');
        }
    })
    .catch(error => {
        console.error('Error occurred during logout:', error.message);
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
    const accessTokenLifetime = 60 * 1000; // 1 minute in milliseconds
    setTimeout(() => {
        refreshToken();
        scheduleTokenRefresh(); // Schedule the next refresh
    }, accessTokenLifetime - 5000); // Refresh 5 seconds before expiration
}

// Schedule the first token refresh after the page loads
scheduleTokenRefresh();

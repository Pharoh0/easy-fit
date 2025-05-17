/**
 * Client Profile API JavaScript
 * Handles fetching and displaying client profile data from the API
 */

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

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializeProfilePage();
});

/**
 * Initialize the client profile page
 */
async function initializeProfilePage() {
    try {
        // Fetch client profile data
        const clientProfile = await fetchClientProfile();
        
        // Populate profile data
        populateProfileData(clientProfile);
        
        // Fetch and display client measurements
        await fetchAndDisplayMeasurements();
        
        // Fetch and display active subscriptions
        await fetchAndDisplaySubscriptions();
        
        // Fetch and display diet requests
        await fetchAndDisplayDietRequests();
        
        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showErrorNotification('Failed to load profile data.');
    }
}

/**
 * Fetch client profile data from API
 */
async function fetchClientProfile() {
    try {
        // Use the correct endpoint based on the router registration
        const response = await fetchAPI('client-profile/', 'GET');
        
        // Check different possible response formats
        if (response && Array.isArray(response) && response.length > 0) {
            // If response is an array, return the first item
            return response[0];
        } else if (response && typeof response === 'object' && !Array.isArray(response)) {
            // If response is a direct object (not array), return it directly
            return response;
        } else if (response && response.results && Array.isArray(response.results) && response.results.length > 0) {
            // If response has a results array (common in DRF), return first item
            return response.results[0];
        } else {
            // Try alternative endpoints as fallback
            console.log('Trying alternative endpoints...');
            
            try {
                // Try first alternative
                // Get JWT access token
                const accessToken = localStorage.getItem('access_token');
                const csrfToken = getCsrfToken();
                
                const altResponse = await fetch('/profiles/api/v1/client-profile/', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRFToken': csrfToken,
                        ...(accessToken ? {'Authorization': `Bearer ${accessToken}`} : {})
                    }
                });
                
                if (altResponse.ok) {
                    const data = await altResponse.json();
                    return data.results ? data.results[0] : (Array.isArray(data) ? data[0] : data);
                }
            } catch (innerError) {
                console.error('First alternative failed:', innerError);
            }
            
            // If we get here, both attempts failed
            throw new Error('No profile data found in any expected format');
            
        }
    } catch (error) {
        console.error('Error fetching client profile:', error);
        throw error;
    }
}

/**
 * Populate profile data in the DOM
 */
function populateProfileData(profile) {
    if (!profile) {
        console.error('No profile data provided to populateProfileData');
        return;
    }

    // Log the profile data structure to help debug
    console.log('Profile data structure:', profile);
    
    // Get user data from profile, handling different API response formats
    const user = profile.user || profile;
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const email = user.email || '';
    const username = user.username || `${firstName} ${lastName}`.trim() || 'User';
    
    // Populate username if element exists
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = `${firstName} ${lastName}`.trim() || username;
    }
    
    // Populate email if element exists
    const emailElement = document.getElementById('email');
    if (emailElement) {
        emailElement.textContent = email;
    }
    
    // Populate avatar if container exists
    const avatarContainer = document.getElementById('avatar-container');
    if (avatarContainer) {
        const avatar = profile.avatar || profile.profile_image || null;
        if (avatar) {
            avatarContainer.innerHTML = `<img src="${avatar}" alt="${username}" class="avatar-image">`;
        } else {
            avatarContainer.innerHTML = `<div class="default-avatar"><i class="fas fa-user"></i></div>`;
        }
    }
    
    // Populate cover image if container exists
    const coverContainer = document.getElementById('cover-image-container');
    if (coverContainer) {
        const coverImage = profile.cover_image || profile.coverImage || null;
        if (coverImage) {
            coverContainer.innerHTML = `<img src="${coverImage}" alt="Cover Image" class="cover-image">`;
        }
    }
    
    // Populate client info
    const infoContainer = document.getElementById('client-info-container');
    if (infoContainer) {
        // Safely get location information
        const location = profile.city 
            ? `${profile.city.name || ''}${profile.city.region ? ', ' + profile.city.region.name : ''}`
            : 'Not specified';
            
        infoContainer.innerHTML = `
            <div class="info-item">
                <i class="fas fa-user"></i>
                <div>
                    <h6>Full Name</h6>
                    <p>${firstName} ${lastName}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-venus-mars"></i>
                <div>
                    <h6>Gender</h6>
                    <p>${profile.gender || 'Not specified'}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-birthday-cake"></i>
                <div>
                    <h6>Age</h6>
                    <p>${profile.age ? profile.age + ' years' : 'Not specified'}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <h6>Location</h6>
                    <p>${location}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-phone"></i>
                <div>
                    <h6>Phone</h6>
                    <p>${profile.phone || 'Not specified'}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-envelope"></i>
                <div>
                    <h6>Email</h6>
                    <p>${email}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-calendar-plus"></i>
                <div>
                    <h6>Member Since</h6>
                    <p>${profile.created_at ? formatDate(profile.created_at) : 'Not available'}</p>
                </div>
            </div>
        `;
    }
}

/**
 * Fetch and display client measurements
 */
async function fetchAndDisplayMeasurements() {
    try {
        const measurements = await fetchAPI('client-measurements/', 'GET');
        const statsContainer = document.getElementById('stats-container');
        const lastMeasurement = document.getElementById('last-measurement');
        
        // Reset containers
        statsContainer.innerHTML = '';
        
        if (measurements && measurements.length > 0) {
            // Sort measurements by date (newest first)
            measurements.sort((a, b) => new Date(b.date) - new Date(a.date));
            const latest = measurements[0];
            
            // Display latest measurement stats
            statsContainer.innerHTML = `
                <div class="col-md-4">
                    <div class="stat-box">
                        <div class="stat-icon">
                            <i class="fas fa-weight"></i>
                        </div>
                        <div class="stat-content">
                            <h5>${latest.weight || '0'}</h5>
                            <p>Weight (kg)</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-box">
                        <div class="stat-icon">
                            <i class="fas fa-ruler-vertical"></i>
                        </div>
                        <div class="stat-content">
                            <h5>${latest.height || '0'}</h5>
                            <p>Height (cm)</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-box">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-content">
                            <h5>${latest.body_fat || '0'}%</h5>
                            <p>Body Fat</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Display last measurement info
            lastMeasurement.innerHTML = `
                <p>
                    <i class="fas fa-calendar-alt"></i>
                    <strong>Last Measurement:</strong> ${formatDate(latest.date)}
                </p>
                <div class="measurement-details">
                    <div>Chest: ${latest.chest || 'N/A'} cm</div>
                    <div>Arms: ${latest.arms || 'N/A'} cm</div>
                    <div>Waist: ${latest.waist || 'N/A'} cm</div>
                    <div>Hips: ${latest.hips || 'N/A'} cm</div>
                    <div>Thighs: ${latest.thighs || 'N/A'} cm</div>
                    <div>Calves: ${latest.calves || 'N/A'} cm</div>
                </div>
            `;
        } else {
            // No measurements found
            statsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info">
                        No measurement data available. <a href="#" id="add-measurement-btn">Add your first measurement</a>
                    </div>
                </div>
            `;
            
            lastMeasurement.innerHTML = '';
        }
    } catch (error) {
        console.error('Error fetching measurements:', error);
        document.getElementById('stats-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Failed to load measurement data. Please try again later.
                </div>
            </div>
        `;
    }
}

/**
 * Fetch and display active subscriptions
 */
async function fetchAndDisplaySubscriptions() {
    try {
        const subscriptions = await fetchAPI('client-subscriptions/', 'GET');
        const container = document.getElementById('active-subscriptions-container');
        
        // Reset container
        container.innerHTML = '';
        
        // Filter active subscriptions
        const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'paused');
        
        if (activeSubscriptions.length > 0) {
            let html = '<div class="active-plans-list">';
            
            activeSubscriptions.forEach(sub => {
                const statusBadgeClass = sub.status === 'active' ? 'bg-success' : 'bg-warning';
                const statusText = sub.status === 'active' ? 'Active' : 'Paused';
                
                html += `
                    <div class="plan-item">
                        <div class="plan-coach">
                            <div class="coach-avatar">
                                <img src="${sub.coach.avatar || '/static/images/default-avatar.svg'}" alt="${sub.coach.user.first_name}">
                            </div>
                            <div class="coach-info">
                                <h5>${sub.coach.user.first_name} ${sub.coach.user.last_name}</h5>
                                <p>${sub.coach.title || 'Coach'}</p>
                            </div>
                        </div>
                        <div class="plan-details">
                            <div class="plan-title">
                                <h5>${sub.plan.name}</h5>
                                <span class="badge ${statusBadgeClass}">${statusText}</span>
                            </div>
                            <div class="plan-dates">
                                <p><i class="fas fa-calendar-alt"></i> ${formatDate(sub.start_date)} - ${formatDate(sub.end_date)}</p>
                            </div>
                            <div class="plan-actions">
                                <a href="/profiles/client/subscriptions/${sub.id}/" class="btn btn-sm btn-primary">View Details</a>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    You don't have any active plans. <a href="/search/coaches/">Find a coach</a> to get started!
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        document.getElementById('active-subscriptions-container').innerHTML = `
            <div class="alert alert-danger">
                Failed to load subscription data. Please try again later.
            </div>
        `;
    }
}

/**
 * Fetch and display diet requests
 */
async function fetchAndDisplayDietRequests() {
    try {
        const dietRequests = await fetchAPI('client-diet-requests/', 'GET');
        const container = document.getElementById('diet-requests-container');
        
        // Reset container
        container.innerHTML = '';
        
        // Filter recent and pending diet requests
        const recentRequests = dietRequests
            .filter(req => ['pending', 'in_progress', 'completed'].includes(req.status))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5); // Show only 5 most recent
        
        if (recentRequests.length > 0) {
            let html = '<div class="diet-request-list">';
            
            recentRequests.forEach(request => {
                // Define status badge color
                let statusBadgeClass = '';
                switch(request.status) {
                    case 'pending': statusBadgeClass = 'bg-warning'; break;
                    case 'in_progress': statusBadgeClass = 'bg-info'; break;
                    case 'completed': statusBadgeClass = 'bg-success'; break;
                    default: statusBadgeClass = 'bg-secondary';
                }
                
                html += `
                    <div class="diet-request-item">
                        <div class="request-header">
                            <h5>Diet Request #${request.id}</h5>
                            <span class="badge ${statusBadgeClass}">${request.status.replace('_', ' ')}</span>
                        </div>
                        <div class="request-details">
                            <p><strong>Goal:</strong> ${request.goal}</p>
                            <p><strong>Submitted:</strong> ${formatDate(request.created_at)}</p>
                        </div>
                        <div class="request-actions">
                            <a href="/profiles/client/diet-requests/${request.id}/" class="btn btn-sm btn-primary">View Details</a>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="alert alert-info">
                    You don't have any recent diet requests. <a href="/profiles/client/diet-requests/create/">Create a diet request</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error fetching diet requests:', error);
        document.getElementById('diet-requests-container').innerHTML = `
            <div class="alert alert-danger">
                Failed to load diet request data. Please try again later.
            </div>
        `;
    }
}

/**
 * Set up event listeners for buttons and actions
 */
function setupEventListeners() {
    // Edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // TODO: Implement edit profile functionality
            alert('Edit profile functionality will be implemented soon.');
        });
    }
    
    // View all measurements button
    const viewMeasurementsBtn = document.getElementById('view-measurements-btn');
    if (viewMeasurementsBtn) {
        viewMeasurementsBtn.addEventListener('click', function() {
            // Redirect to measurements page
            window.location.href = '/profiles/client/measurements/';
        });
    }
    
    // Add measurement button (if exists)
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'add-measurement-btn') {
            e.preventDefault();
            // Redirect to add measurement page
            window.location.href = '/profiles/client/measurements/add/';
        }
    });
    
    // View all progress button
    const viewAllProgressBtn = document.getElementById('view-all-progress-btn');
    if (viewAllProgressBtn) {
        viewAllProgressBtn.addEventListener('click', function() {
            // Redirect to progress page
            window.location.href = '/profiles/client/progress/';
        });
    }
}

/**
 * Format date string to locale format
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger alert-dismissible fade show notification-toast';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Append to body
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(function() {
        notification.remove();
    }, 5000);
}

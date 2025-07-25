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

// Flag to track authentication failures
let authFailureDetected = false;

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
        
        // Fetch and display progress gallery
        await fetchAndDisplayProgressGallery();
        
        // Load additional tab content
        await loadPersonalInfo(clientProfile);
        await loadHealthInfo(clientProfile);
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize charts
        initializeCharts();
    } catch (error) {
        console.error('Error initializing profile page:', error);
        showErrorNotification('Failed to load profile data.');
    }
}

/**
 * Fetch client profile data from API
 */
async function fetchClientProfile() {
    // Don't attempt to fetch if we've already detected an auth failure
    if (authFailureDetected) {
        console.warn('Authentication failure detected, skipping API call');
        throw new Error('Authentication required');
    }
    
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
        
        // Check if this is an authentication error
        if (error && error.status === 401) {
            // Set the flag to prevent further attempts
            authFailureDetected = true;
            
            // Show a login prompt
            showLoginRequiredMessage();
        }
        
        throw error;
    }
}

/**
 * Format activity level for display
 */
function formatActivityLevel(activityLevel) {
    if (!activityLevel) return 'Not specified';
    
    // Convert snake_case to readable format
    const activityMap = {
        'sedentary': 'Sedentary (little to no exercise)',
        'lightly_active': 'Lightly Active (1-3 days/week)',
        'moderately_active': 'Moderately Active (3-5 days/week)',
        'very_active': 'Very Active (6-7 days/week)',
        'extremely_active': 'Extremely Active (physical job or 2x daily)'  
    };
    
    return activityMap[activityLevel] || activityLevel;
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
            avatarContainer.innerHTML = `<img src="${avatar}" alt="${username}" class="avatar-image shadow">`;
        } else {
            avatarContainer.innerHTML = `<div class="default-avatar shadow"><i class="fas fa-user"></i></div>`;
        }
        
        // Add hover effect class
        const avatarElement = avatarContainer.querySelector('.avatar-image, .default-avatar');
        if (avatarElement) {
            avatarElement.classList.add('hover-effect');
        }
    }
    
    // Populate cover image if container exists
    const coverContainer = document.getElementById('cover-image-container');
    if (coverContainer) {
        const coverImage = profile.cover_image || profile.coverImage || null;
        if (coverImage) {
            coverContainer.innerHTML = `<img src="${coverImage}" alt="Cover Image" class="cover-image">`;
        } else {
            // Add a default gradient if no cover image
            coverContainer.classList.add('default-cover');
        }
    }
    
    // Update profile name in header
    const profileNameElement = document.getElementById('profile-name');
    if (profileNameElement) {
        profileNameElement.textContent = `${firstName} ${lastName}`.trim() || username;
    }
    
    // Populate client info
    const infoContainer = document.getElementById('client-info-container');
    if (infoContainer) {
        // Safely get location information
        const location = profile.city 
            ? `${profile.city.name || ''}${profile.city.region ? ', ' + profile.city.region.name : ''}`
            : 'Not specified';
            
        // Create HTML for personal information section
        let personalInfoHTML = `
            <div class="profile-section">
                <h5 class="section-title"><i class="fas fa-user-circle"></i> Personal Information</h5>
                <div class="info-grid">
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
                        <i class="fas fa-ruler-combined"></i>
                        <div>
                            <h6>Height</h6>
                            <p>${profile.height ? profile.height + ' cm' : 'Not specified'}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-weight"></i>
                        <div>
                            <h6>Weight</h6>
                            <p>${profile.weight ? profile.weight + ' kg' : 'Not specified'}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-running"></i>
                        <div>
                            <h6>Activity Level</h6>
                            <p>${formatActivityLevel(profile.activity_level)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create HTML for contact information section
        let contactInfoHTML = `
            <div class="profile-section">
                <h5 class="section-title"><i class="fas fa-address-card"></i> Contact Information</h5>
                <div class="info-grid">
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
                        <i class="fas fa-home"></i>
                        <div>
                            <h6>Address</h6>
                            <p>${profile.address || 'Not specified'}</p>
                        </div>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-calendar-plus"></i>
                        <div>
                            <h6>Member Since</h6>
                            <p>${profile.created_at ? formatDate(profile.created_at) : 'Not available'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create HTML for health information section
        let healthInfoHTML = `
            <div class="profile-section">
                <h5 class="section-title"><i class="fas fa-heartbeat"></i> Health Information</h5>
                <div class="info-grid">
                    <div class="info-item full-width">
                        <i class="fas fa-notes-medical"></i>
                        <div>
                            <h6>Health Conditions</h6>
                            <p>${profile.health_conditions || 'None specified'}</p>
                        </div>
                    </div>
                    <div class="info-item full-width">
                        <i class="fas fa-allergies"></i>
                        <div>
                            <h6>Allergies</h6>
                            <p>${profile.allergies || 'None specified'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create HTML for fitness goals section
        let fitnessGoalsHTML = `
            <div class="profile-section">
                <h5 class="section-title"><i class="fas fa-bullseye"></i> Fitness Goals</h5>
                <div class="info-grid">
                    <div class="info-item full-width">
                        <i class="fas fa-trophy"></i>
                        <div>
                            <h6>Goals</h6>
                            <p>${profile.fitness_goals || 'None specified'}</p>
                        </div>
                    </div>
                    <div class="info-item full-width">
                        <i class="fas fa-utensils"></i>
                        <div>
                            <h6>Dietary Preferences</h6>
                            <p>${profile.dietary_preferences || 'None specified'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Create HTML for social media section if any social links exist
        let socialMediaHTML = '';
        if (profile.instagram || profile.facebook || profile.twitter) {
            socialMediaHTML = `
                <div class="profile-section">
                    <h5 class="section-title"><i class="fas fa-share-alt"></i> Social Media</h5>
                    <div class="social-links">
                        ${profile.instagram ? `<a href="${profile.instagram}" target="_blank" class="social-link"><i class="fab fa-instagram"></i> Instagram</a>` : ''}
                        ${profile.facebook ? `<a href="${profile.facebook}" target="_blank" class="social-link"><i class="fab fa-facebook"></i> Facebook</a>` : ''}
                        ${profile.twitter ? `<a href="${profile.twitter}" target="_blank" class="social-link"><i class="fab fa-twitter"></i> Twitter</a>` : ''}
                    </div>
                </div>
            `;
        }
        
        // Combine all sections
        infoContainer.innerHTML = personalInfoHTML + contactInfoHTML + healthInfoHTML + fitnessGoalsHTML + socialMediaHTML;
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
        
        // Check if containers exist before manipulating them
        if (!statsContainer) {
            console.warn('Stats container not found in the DOM');
            return;
        }
        
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
            if (lastMeasurement) {
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
            }
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
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        Failed to load measurement data. Please try again later.
                    </div>
                </div>
            `;
        }
    }
}

// Subscription functionality moved to subscriptions_api.js
// Use dedicated subscription API functions instead

// Diet request functionality moved to diet_requests_api.js
// Use dedicated diet request API functions instead

/**
 * Set up event listeners for buttons and actions
 */
function setupEventListeners() {
    // Edit profile button
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            // Redirect to edit profile page
            window.location.href = '/profiles/client/edit-profile/';
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
    
    // Gallery lightbox modal functionality
    document.body.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('gallery-image')) {
            e.preventDefault();
            const imageUrl = e.target.src;
            if (typeof openGalleryModal === 'function') {
                openGalleryModal(imageUrl);
            }
        }
    });
}

/**
 * Fetch and display progress gallery
 */
async function fetchAndDisplayProgressGallery() {
    try {
        // Get containers
        const beforeAfterContainer = document.getElementById('before-after-container');
        const allPhotosContainer = document.getElementById('all-photos-container');
        const beforeAfterBadge = document.getElementById('before-after-count');
        const allPhotosBadge = document.getElementById('all-photos-count');
        
        // Reset containers
        if (beforeAfterContainer) {
            beforeAfterContainer.innerHTML = '<div class="skeleton-loader"></div>';
        }
        if (allPhotosContainer) {
            allPhotosContainer.innerHTML = '<div class="skeleton-loader"></div>';
        }
        
        // Fetch progress reports which contain photos
        const progressReports = await fetchAPI('client-progress-reports/', 'GET');
        
        // Exit if no containers found
        if (!beforeAfterContainer && !allPhotosContainer) {
            console.warn('Gallery containers not found in the DOM');
            return;
        }
        
        // Handle empty state
        if (!progressReports || progressReports.length === 0) {
            const emptyState = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <h3>No Progress Photos Yet</h3>
                    <p>Track your fitness journey by adding progress photos to your active plans.</p>
                </div>
            `;
            
            if (beforeAfterContainer) {
                beforeAfterContainer.innerHTML = emptyState;
            }
            if (allPhotosContainer) {
                allPhotosContainer.innerHTML = emptyState;
            }
            
            // Update badges
            if (beforeAfterBadge) beforeAfterBadge.textContent = '0';
            if (allPhotosBadge) allPhotosBadge.textContent = '0';
            
            return;
        }
        
        // Process the reports
        const beforeAfterPairs = [];
        const allPhotos = [];
        
        // Extract before/after pairs and all photos
        progressReports.forEach(report => {
            // If report has both before and after photos, add to before/after pairs
            if (report.before_photo && report.after_photo) {
                beforeAfterPairs.push({
                    id: report.id,
                    title: report.title || `Progress Report #${report.id}`,
                    date: report.created_at,
                    beforePhoto: report.before_photo,
                    afterPhoto: report.after_photo
                });
            }
            
            // Add all photos to the all photos array
            if (report.before_photo) {
                allPhotos.push({
                    url: report.before_photo,
                    title: `Before - ${report.title || `Progress Report #${report.id}`}`,
                    reportId: report.id,
                    date: report.created_at
                });
            }
            
            if (report.after_photo) {
                allPhotos.push({
                    url: report.after_photo,
                    title: `After - ${report.title || `Progress Report #${report.id}`}`,
                    reportId: report.id,
                    date: report.created_at
                });
            }
            
            // Add any additional photos
            if (report.additional_photos && Array.isArray(report.additional_photos)) {
                report.additional_photos.forEach((photoUrl, index) => {
                    allPhotos.push({
                        url: photoUrl,
                        title: `Photo ${index+1} - ${report.title || `Progress Report #${report.id}`}`,
                        reportId: report.id,
                        date: report.created_at
                    });
                });
            }
        });
        
        // Update badges
        if (beforeAfterBadge) beforeAfterBadge.textContent = beforeAfterPairs.length;
        if (allPhotosBadge) allPhotosBadge.textContent = allPhotos.length;
        
        // Render Before & After section
        if (beforeAfterContainer) {
            if (beforeAfterPairs.length > 0) {
                // Sort by most recent first
                beforeAfterPairs.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Take the most recent 3 for display
                const recentPairs = beforeAfterPairs.slice(0, 3);
                
                let html = '<div class="row">';
                
                recentPairs.forEach(pair => {
                    const formattedDate = formatDate(pair.date);
                    
                    html += `
                        <div class="col-md-4 mb-4">
                            <div class="comparison-card">
                                <div class="comparison-header">
                                    <h5>${pair.title}</h5>
                                    <span class="date">${formattedDate}</span>
                                </div>
                                <div class="comparison-images">
                                    <div class="comparison-image before">
                                        <img src="${pair.beforePhoto}" alt="Before" class="gallery-image" 
                                            data-gallery-id="${pair.id}" data-image-type="before">
                                        <div class="image-label">Before</div>
                                    </div>
                                    <div class="comparison-image after">
                                        <img src="${pair.afterPhoto}" alt="After" class="gallery-image" 
                                            data-gallery-id="${pair.id}" data-image-type="after">
                                        <div class="image-label">After</div>
                                    </div>
                                </div>
                                <div class="comparison-footer">
                                    <a href="/profiles/client/progress-reports/report/${pair.id}/" class="btn btn-sm btn-outline-primary">
                                        <i class="fas fa-eye"></i> View Details
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // Add view all button if there are more than shown
                if (beforeAfterPairs.length > 3) {
                    html += `
                        <div class="text-center mt-3">
                            <a href="/profiles/client/progress-reports/" class="btn btn-outline-primary">
                                <i class="fas fa-images"></i> View All Comparisons (${beforeAfterPairs.length})
                            </a>
                        </div>
                    `;
                }
                
                beforeAfterContainer.innerHTML = html;
            } else {
                beforeAfterContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-images"></i>
                        </div>
                        <h3>No Before & After Comparisons</h3>
                        <p>Add before and after photos to track your transformation journey.</p>
                    </div>
                `;
            }
        }
        
        // Render All Photos section
        if (allPhotosContainer) {
            if (allPhotos.length > 0) {
                // Sort by most recent first
                allPhotos.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                let html = '<div class="gallery-grid">';
                
                allPhotos.forEach((photo, index) => {
                    html += `
                        <div class="gallery-item">
                            <img src="${photo.url}" alt="${photo.title}" class="gallery-image" 
                                data-index="${index}" data-tippy-content="${photo.title}">
                        </div>
                    `;
                });
                
                html += '</div>';
                
                // Add view all button if there are many photos
                if (allPhotos.length > 12) {
                    html += `
                        <div class="text-center mt-3">
                            <a href="/profiles/client/progress-reports/" class="btn btn-outline-primary">
                                <i class="fas fa-images"></i> View All Photos (${allPhotos.length})
                            </a>
                        </div>
                    `;
                }
                
                allPhotosContainer.innerHTML = html;
                
                // Initialize tooltips if Tippy.js is available
                if (typeof tippy === 'function') {
                    tippy('.gallery-image[data-tippy-content]', {
                        placement: 'top',
                        arrow: true,
                        theme: 'light',
                        animation: 'scale'
                    });
                }
            } else {
                allPhotosContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-images"></i>
                        </div>
                        <h3>No Progress Photos</h3>
                        <p>Track your fitness journey by adding progress photos.</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error fetching progress gallery:', error);
        
        // Show error in containers
        const beforeAfterContainer = document.getElementById('before-after-container');
        const allPhotosContainer = document.getElementById('all-photos-container');
        
        const errorHtml = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> Failed to load gallery. Please try again later.
            </div>
        `;
        
        if (beforeAfterContainer) beforeAfterContainer.innerHTML = errorHtml;
        if (allPhotosContainer) allPhotosContainer.innerHTML = errorHtml;
        
        // Check if this is an authentication error
        if (error && error.status === 401) {
            // Set the flag to prevent further attempts
            authFailureDetected = true;
            
            // Show a login prompt
            showLoginRequiredMessage();
        }
    }
}

/**
 * Format date string
 */
function formatDate(dateString) {
    if (!dateString) return 'Not available';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
}

/**
 * Load personal information into the Personal Info tab
 */
async function loadPersonalInfo(profile) {
    const container = document.getElementById('client-info-container');
    if (!container) {
        console.warn('Personal info container not found');
        return;
    }
    
    const personalInfoHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-user text-primary me-2"></i>
                    <strong>Full Name:</strong> ${profile.username || 'Not specified'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-envelope text-primary me-2"></i>
                    <strong>Email:</strong> ${profile.email || 'Not specified'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-birthday-cake text-primary me-2"></i>
                    <strong>Age:</strong> ${profile.age || 'Not specified'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-venus-mars text-primary me-2"></i>
                    <strong>Gender:</strong> ${profile.gender || 'Not specified'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-ruler-vertical text-primary me-2"></i>
                    <strong>Height:</strong> ${profile.height ? profile.height + ' cm' : 'Not specified'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-weight text-primary me-2"></i>
                    <strong>Weight:</strong> ${profile.weight ? profile.weight + ' kg' : 'Not specified'}
                </div>
            </div>
            <div class="col-12">
                <div class="info-item">
                    <i class="fas fa-running text-primary me-2"></i>
                    <strong>Activity Level:</strong> ${profile.activity_level || 'Not specified'}
                </div>
            </div>
            <div class="col-12">
                <div class="info-item">
                    <i class="fas fa-bullseye text-primary me-2"></i>
                    <strong>Fitness Goals:</strong> ${profile.fitness_goals || 'Not specified'}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = personalInfoHTML;
}

/**
 * Load health information into the Health Info section
 */
async function loadHealthInfo(profile) {
    const container = document.getElementById('health-info-container');
    if (!container) {
        console.warn('Health info container not found');
        return;
    }
    
    const healthInfoHTML = `
        <div class="row g-3">
            <div class="col-12">
                <div class="info-item">
                    <i class="fas fa-heartbeat text-danger me-2"></i>
                    <strong>Health Conditions:</strong>
                    <p class="mt-2 mb-0">${profile.health_conditions || 'None specified'}</p>
                </div>
            </div>
            <div class="col-12">
                <div class="info-item">
                    <i class="fas fa-allergies text-warning me-2"></i>
                    <strong>Allergies:</strong>
                    <p class="mt-2 mb-0">${profile.allergies || 'None specified'}</p>
                </div>
            </div>
            <div class="col-12">
                <div class="info-item">
                    <i class="fas fa-utensils text-success me-2"></i>
                    <strong>Dietary Preferences:</strong>
                    <p class="mt-2 mb-0">${profile.dietary_preferences || 'None specified'}</p>
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-calculator text-info me-2"></i>
                    <strong>BMI:</strong> ${profile.bmi || 'Not calculated'}
                </div>
            </div>
            <div class="col-md-6">
                <div class="info-item">
                    <i class="fas fa-percentage text-warning me-2"></i>
                    <strong>Body Fat %:</strong> ${profile.body_fat_percentage || 'Not measured'}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = healthInfoHTML;
}

/**
 * Set up event listeners for the profile page
 */
function setupEventListeners() {
    // Tab switching event listeners
    const tabButtons = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabButtons.forEach(button => {
        button.addEventListener('shown.bs.tab', function(event) {
            const targetTab = event.target.getAttribute('data-bs-target');
            console.log('Tab switched to:', targetTab);
            
            // Load content based on active tab
            switch(targetTab) {
                case '#fitness-data':
                    loadMeasurementsTable();
                    break;
                case '#progress':
                    loadProgressReports();
                    break;
                case '#plans':
                    loadPlansAndSessions();
                    break;
                case '#gallery':
                    loadGalleryImages();
                    break;
            }
        });
    });
    
    // Upload photo button
    const uploadBtn = document.getElementById('upload-photo-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            // Handle photo upload
            console.log('Upload photo clicked');
        });
    }
}

/**
 * Initialize charts for the overview tab
 */
function initializeCharts() {
    const chartCanvas = document.getElementById('fitnessProgressChart');
    if (!chartCanvas) {
        console.warn('Chart canvas not found');
        return;
    }
    
    // Initialize Chart.js if available
    if (typeof Chart !== 'undefined') {
        const ctx = chartCanvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Weight (kg)',
                    data: [70, 69, 68, 67, 66, 65],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    } else {
        console.warn('Chart.js not loaded');
        chartCanvas.parentElement.innerHTML = '<p class="text-center text-muted">Chart library not available</p>';
    }
}

/**
 * Load measurements table (placeholder)
 */
function loadMeasurementsTable() {
    console.log('Loading measurements table...');
    // Implementation for loading measurements table
}

/**
 * Load progress reports (placeholder)
 */
function loadProgressReports() {
    console.log('Loading progress reports...');
    // Implementation for loading progress reports
}

/**
 * Load plans and sessions (placeholder)
 */
function loadPlansAndSessions() {
    console.log('Loading plans and sessions...');
    // Implementation for loading plans and sessions
}

/**
 * Load gallery images (placeholder)
 */
function loadGalleryImages() {
    console.log('Loading gallery images...');
    // Implementation for loading gallery images
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
    // Check if notification container exists
    let notificationContainer = document.getElementById('notification-container');
            
    // Create container if it doesn't exist
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
            
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification notification-error';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
            
    // Add to container
    notificationContainer.appendChild(notification);
            
    // Add event listener for close button
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', function() {
        notification.remove();
    });
            
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/**
 * Show login required message
 */
function showLoginRequiredMessage() {
    // Create or get the message container
    let loginMessageContainer = document.getElementById('login-message-container');
            
    if (!loginMessageContainer) {
        // Create the container if it doesn't exist
        loginMessageContainer = document.createElement('div');
        loginMessageContainer.id = 'login-message-container';
        loginMessageContainer.className = 'login-message-container';
                
        // Add it to the main content area
        const mainContent = document.querySelector('.main-content') || document.body;
        mainContent.prepend(loginMessageContainer);
    }
            
    // Clear any existing content
    loginMessageContainer.innerHTML = '';
            
    // Create the message
    const messageElement = document.createElement('div');
    messageElement.className = 'login-required-message';
    messageElement.innerHTML = `
        <div class="alert alert-warning" role="alert">
            <h4 class="alert-heading"><i class="fas fa-exclamation-triangle"></i> Authentication Required</h4>
            <p>Your session has expired or you are not logged in. Please log in to view your profile.</p>
            <hr>
            <p class="mb-0">
                <a href="/accounts/login/?next=/profiles/client-profile/" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Log In
                </a>
            </p>
        </div>
    `;
            
    // Add to container
    loginMessageContainer.appendChild(messageElement);
            
    // Hide the main profile content
    const profileContent = document.querySelector('.profile-content');
    if (profileContent) {
        profileContent.style.display = 'none';
    }
}

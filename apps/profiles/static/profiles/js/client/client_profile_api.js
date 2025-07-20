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
        
        // Fetch and display progress gallery
        await fetchAndDisplayProgressGallery();
        
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

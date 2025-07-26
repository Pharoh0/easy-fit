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
        // Check if user is authenticated
        const token = localStorage.getItem('access_token');
        if (!token) {
            console.warn('No authentication token found, redirecting to login');
            
            // Show user-friendly message
            const mainContent = document.querySelector('.client-profile-container');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="container mt-5">
                        <div class="row justify-content-center">
                            <div class="col-md-6">
                                <div class="card text-center">
                                    <div class="card-body py-5">
                                        <i class="fas fa-lock fa-3x text-warning mb-3"></i>
                                        <h4 class="card-title">Authentication Required</h4>
                                        <p class="card-text text-muted mb-4">
                                            You need to be logged in to view your profile.
                                            <br>Redirecting to login page...
                                        </p>
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            setTimeout(() => {
                window.location.href = '/auth-users/login/';
            }, 2000);
            return;
        }
        // Fetch client profile data
        const clientProfile = await fetchClientProfile();
        
        // Populate profile data
        populateProfileData(clientProfile);
        
        // Fetch and display measurements
        await fetchAndDisplayMeasurements();
        
        // Populate Key Metrics with real data
        await populateKeyMetrics();
        
        // Fetch and display progress gallery
        await fetchAndDisplayProgressGallery();
        
        // Load additional tab content
        await loadPersonalInfo(clientProfile);
        await loadHealthInfo(clientProfile);
        
        // Load recent activity with real data
        await loadRecentActivity();
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize charts with real data
        await initializeCharts();
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
 * Populate Key Metrics section with real data
 */
async function populateKeyMetrics() {
    try {
        // Get elements
        const currentWeightElement = document.getElementById('current-weight');
        const currentBmiElement = document.getElementById('current-bmi');
        const bodyFatElement = document.getElementById('body-fat');
        const caloriesBurnedElement = document.getElementById('calories-burned');
        
        // Check if elements exist
        if (!currentWeightElement || !currentBmiElement || !bodyFatElement || !caloriesBurnedElement) {
            console.warn('Key Metrics elements not found in the DOM');
            return;
        }
        
        // Show loading state
        currentWeightElement.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        currentBmiElement.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        bodyFatElement.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        caloriesBurnedElement.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
        
        // Fetch latest measurements
        const measurements = await fetchAPI('client-measurements/', 'GET');
        
        // Fetch activity data for calories
        let caloriesBurned = 0;
        try {
            const activityData = await fetchAPI('client-activity-summary/', 'GET')
                .catch(err => {
                    console.warn('Activity data not available, using default values');
                    return { calories_burned_week: 0 };
                });
            
            caloriesBurned = activityData.calories_burned_week || 0;
        } catch (err) {
            console.warn('Error fetching activity data:', err);
        }
        
        if (measurements && measurements.length > 0) {
            // Sort measurements by date (newest first)
            measurements.sort((a, b) => new Date(b.date) - new Date(a.date));
            const latest = measurements[0];
            
            // Calculate BMI if we have weight and height
            let bmi = '--';
            if (latest.weight && latest.height) {
                // BMI = weight(kg) / (height(m))²
                const heightInMeters = latest.height / 100;
                bmi = (latest.weight / (heightInMeters * heightInMeters)).toFixed(1);
            }
            
            // Update metrics
            currentWeightElement.innerHTML = `${latest.weight || '--'} <small>kg</small>`;
            currentBmiElement.innerHTML = bmi;
            bodyFatElement.innerHTML = `${latest.body_fat_percentage || '--'} <small>%</small>`;
            caloriesBurnedElement.innerHTML = `${caloriesBurned} <small>kcal</small>`;
            
            // Add color indicators based on values
            if (bmi !== '--') {
                if (bmi < 18.5) {
                    currentBmiElement.classList.add('text-warning');
                } else if (bmi >= 25) {
                    currentBmiElement.classList.add('text-danger');
                } else {
                    currentBmiElement.classList.add('text-success');
                }
            }
            
            if (latest.body_fat_percentage) {
                // Different ranges for men and women
                const gender = latest.gender || 'male';
                const bodyFat = parseFloat(latest.body_fat_percentage);
                
                if ((gender === 'male' && bodyFat < 8) || (gender === 'female' && bodyFat < 15)) {
                    bodyFatElement.classList.add('text-warning'); // Too low
                } else if ((gender === 'male' && bodyFat > 25) || (gender === 'female' && bodyFat > 32)) {
                    bodyFatElement.classList.add('text-danger'); // Too high
                } else {
                    bodyFatElement.classList.add('text-success'); // Healthy range
                }
            }
        } else {
            // No measurements found
            currentWeightElement.textContent = '--';
            currentBmiElement.textContent = '--';
            bodyFatElement.textContent = '--';
            caloriesBurnedElement.textContent = `${caloriesBurned} kcal`;
        }
    } catch (error) {
        console.error('Error populating key metrics:', error);
        // Set default values on error
        const elements = ['current-weight', 'current-bmi', 'body-fat', 'calories-burned'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '--';
        });
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
            
            if (lastMeasurement) {
                lastMeasurement.innerHTML = '';
            }
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
 * Populate Key Metrics with real data from the measurements API
 */
async function populateKeyMetrics() {
    try {
        // Show loading state
        setKeyMetricsLoadingState(true);

        // Fetch latest measurements
        const measurements = await fetchAPI('client-measurements/', 'GET');
        
        // Fetch profile data for activity level
        const profileData = await fetchClientProfile();
        
        if (measurements && Array.isArray(measurements) && measurements.length > 0) {
            // Get the most recent measurement
            const latestMeasurement = measurements[0]; // API returns most recent first
            
            // Update Current Weight with trend indicator
            const currentWeightElement = document.getElementById('current-weight');
            if (currentWeightElement && latestMeasurement.weight) {
                // Check if we have previous measurement to show trend
                let trendHtml = '';
                if (measurements.length > 1 && measurements[1].weight) {
                    const weightDiff = latestMeasurement.weight - measurements[1].weight;
                    const trendIcon = weightDiff < 0 ? 
                        '<i class="fas fa-arrow-down text-success"></i>' : 
                        (weightDiff > 0 ? '<i class="fas fa-arrow-up text-danger"></i>' : '');
                    trendHtml = trendIcon ? ` ${trendIcon} ${Math.abs(weightDiff).toFixed(1)}` : '';
                }
                currentWeightElement.innerHTML = `${latestMeasurement.weight} kg${trendHtml}`;
            }
            
            // Calculate and update BMI with health indicator
            const currentBmiElement = document.getElementById('current-bmi');
            if (currentBmiElement && latestMeasurement.weight && latestMeasurement.height) {
                const heightInMeters = latestMeasurement.height / 100;
                const bmi = (latestMeasurement.weight / (heightInMeters * heightInMeters)).toFixed(1);
                
                // Add BMI category
                let bmiCategory = '';
                let bmiCategoryClass = '';
                
                if (bmi < 18.5) {
                    bmiCategory = 'Underweight';
                    bmiCategoryClass = 'text-warning';
                } else if (bmi >= 18.5 && bmi < 25) {
                    bmiCategory = 'Normal';
                    bmiCategoryClass = 'text-success';
                } else if (bmi >= 25 && bmi < 30) {
                    bmiCategory = 'Overweight';
                    bmiCategoryClass = 'text-warning';
                } else {
                    bmiCategory = 'Obese';
                    bmiCategoryClass = 'text-danger';
                }
                
                currentBmiElement.innerHTML = `${bmi} <span class="${bmiCategoryClass}">(${bmiCategory})</span>`;
            }
            
            // Update Body Fat % with healthy range indicator
            const bodyFatElement = document.getElementById('body-fat');
            if (bodyFatElement && latestMeasurement.body_fat_percentage) {
                // Determine if body fat percentage is in healthy range (approximate ranges)
                const gender = profileData?.gender || 'male'; // Default to male if not specified
                const age = profileData?.age || 30; // Default to 30 if not specified
                let isHealthy = false;
                
                if (gender.toLowerCase() === 'male') {
                    // Rough male healthy ranges
                    if (age < 40 && latestMeasurement.body_fat_percentage >= 8 && latestMeasurement.body_fat_percentage <= 19) isHealthy = true;
                    if (age >= 40 && latestMeasurement.body_fat_percentage >= 11 && latestMeasurement.body_fat_percentage <= 21) isHealthy = true;
                } else {
                    // Rough female healthy ranges
                    if (age < 40 && latestMeasurement.body_fat_percentage >= 21 && latestMeasurement.body_fat_percentage <= 32) isHealthy = true;
                    if (age >= 40 && latestMeasurement.body_fat_percentage >= 23 && latestMeasurement.body_fat_percentage <= 33) isHealthy = true;
                }
                
                const healthyIndicator = isHealthy ? '<i class="fas fa-check-circle text-success"></i>' : '';
                bodyFatElement.innerHTML = `${latestMeasurement.body_fat_percentage}% ${healthyIndicator}`;
            }
            
            // Calculate calories burned based on weight, height, age, gender and activity level
            const caloriesBurnedElement = document.getElementById('calories-burned');
            if (caloriesBurnedElement) {
                // Get activity level multiplier
                const activityMultipliers = {
                    'sedentary': 1.2,
                    'lightly_active': 1.375,
                    'moderately_active': 1.55,
                    'very_active': 1.725,
                    'extremely_active': 1.9
                };
                
                const weight = latestMeasurement.weight || 70; // kg
                const height = latestMeasurement.height || 170; // cm
                const age = profileData?.age || 30;
                const gender = profileData?.gender?.toLowerCase() || 'male';
                const activityLevel = profileData?.activity_level || 'moderately_active';
                const activityMultiplier = activityMultipliers[activityLevel] || 1.55;
                
                // Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation
                let bmr;
                if (gender === 'male') {
                    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
                } else {
                    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
                }
                
                // Total Daily Energy Expenditure (TDEE)
                const caloriesBurned = Math.round(bmr * activityMultiplier);
                caloriesBurnedElement.textContent = `${caloriesBurned} cal`;
            }
        } else {
            // Set default values if no measurements available
            const elements = {
                'current-weight': '--',
                'current-bmi': '--',
                'body-fat': '--',
                'calories-burned': '--'
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }
    } catch (error) {
        console.error('Error populating key metrics:', error);
        // Set error state for all metrics
        const elements = ['current-weight', 'current-bmi', 'body-fat', 'calories-burned'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = 'Error loading data';
                element.classList.add('text-danger');
            }
        });
    } finally {
        // Hide loading state
        setKeyMetricsLoadingState(false);
    }
}

/**
 * Set loading state for key metrics section
 */
function setKeyMetricsLoadingState(isLoading) {
    const elements = ['current-weight', 'current-bmi', 'body-fat', 'calories-burned'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (isLoading) {
                element.textContent = 'Loading...';
                element.classList.add('text-muted');
            } else {
                element.classList.remove('text-muted');
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
 * Initialize charts for the overview tab with real data from measurements
 */
async function initializeCharts() {
    try {
        const chartCanvas = document.getElementById('fitnessProgressChart');
        if (!chartCanvas || !chartCanvas.parentElement) {
            console.warn('Chart canvas or parent container not found');
            return;
        }
        
        // Safely check container exists before setting innerHTML
        const chartContainer = chartCanvas.parentElement;
        
        // Show loading state
        chartContainer.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 250px">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        // Fetch measurements data for chart
        const measurements = await fetchAPI('client-measurements/', 'GET');
        
        // Make sure the container still exists after the async operation
        if (!document.body.contains(chartContainer)) {
            console.warn('Chart container no longer exists in the DOM');
            return;
        }
        
        // Restore the canvas
        chartContainer.innerHTML = '';
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'fitnessProgressChart';
        chartContainer.appendChild(newCanvas);
        
        // Process measurements data
        let labels = [];
        let weightData = [];
        let bodyFatData = [];
        
        if (measurements && Array.isArray(measurements) && measurements.length > 0) {
            // Sort by date ascending (oldest first)
            const sortedMeasurements = [...measurements].sort((a, b) => {
                return new Date(a.date_recorded) - new Date(b.date_recorded);
            });
            
            // Get last 6 measurements or all if less than 6
            const displayMeasurements = sortedMeasurements.slice(-6);
            
            // Extract data points
            displayMeasurements.forEach(measurement => {
                const date = new Date(measurement.date_recorded);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                
                if (measurement.weight) {
                    weightData.push(measurement.weight);
                }
                
                if (measurement.body_fat_percentage) {
                    bodyFatData.push(measurement.body_fat_percentage);
                }
            });
        }
        
        // If no data, use placeholder
        if (labels.length === 0) {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            weightData = [70, 69, 68, 67, 66, 65];
            bodyFatData = [20, 19, 18, 17, 16, 15];
        }
        
        // Initialize Chart.js if available
        if (typeof Chart !== 'undefined') {
            const ctx = newCanvas.getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Weight (kg)',
                            data: weightData,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Body Fat %',
                            data: bodyFatData,
                            borderColor: '#ff6384',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.4,
                            fill: true,
                            hidden: bodyFatData.length === 0 // Hide if no data
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grace: '5%' // Add 5% padding to the top
                        }
                    }
                }
            });
        } else {
            console.warn('Chart.js not loaded');
            newCanvas.parentElement.innerHTML = '<p class="text-center text-muted">Chart library not available</p>';
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
        
        // Safely find the chart container again in case it was lost in context
        const chartContainer = document.getElementById('fitnessProgressChart');
        if (chartContainer && chartContainer.parentElement) {
            chartContainer.parentElement.innerHTML = '<p class="text-center text-danger">Failed to load chart data</p>';
        }
        
        // Don't let this error block other page components
        // Just log it and continue with page initialization
    }
}

/**
 * Load measurements table with real data
 */
async function loadMeasurementsTable() {
    try {
        console.log('Loading measurements table...');

        const measurementsTableBody = document.getElementById('measurements-tbody');
        if (!measurementsTableBody) {
            console.warn('Measurements table body not found');
            return;
        }

        // Fetch measurements data
        const measurements = await fetchAPI('client-measurements/', 'GET');

        if (measurements && measurements.length > 0) {
            measurementsTableBody.innerHTML = '';

            measurements.forEach(measurement => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(measurement.date)}</td>
                    <td>${measurement.weight ? measurement.weight + ' kg' : '--'}</td>
                    <td>${measurement.height ? measurement.height + ' cm' : '--'}</td>
                    <td>${measurement.chest ? measurement.chest + ' cm' : '--'}</td>
                    <td>${measurement.waist ? measurement.waist + ' cm' : '--'}</td>
                    <td>${measurement.hips ? measurement.hips + ' cm' : '--'}</td>
                    <td>${measurement.body_fat_percentage ? measurement.body_fat_percentage + '%' : '--'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editMeasurement(${measurement.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMeasurement(${measurement.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                measurementsTableBody.appendChild(row);
            });
        } else {
            measurementsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-ruler fa-2x mb-3 d-block"></i>
                        No measurements recorded yet.
                        <br>
                        <button class="btn btn-primary btn-sm mt-2">
                            <i class="fas fa-plus me-1"></i> Add First Measurement
                        </button>
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading measurements table:', error);
        const measurementsTableBody = document.getElementById('measurements-tbody');
        if (measurementsTableBody) {
            measurementsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3 d-block"></i>
                        Failed to load measurements data.
                        <br>
                        <button class="btn btn-outline-primary btn-sm mt-2" onclick="loadMeasurementsTable()">
                            <i class="fas fa-refresh me-1"></i> Try Again
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Load progress reports with real data
 */
async function loadProgressReports() {
    try {
        console.log('Loading progress reports...');
        
        const progressReportsContainer = document.getElementById('progress-reports-container');
        if (!progressReportsContainer) {
            console.warn('Progress reports container not found');
            return;
        }
        
        // Fetch progress reports data
        const progressReports = await fetchAPI('client-progress-reports/', 'GET');
        
        if (progressReports && progressReports.length > 0) {
            progressReportsContainer.innerHTML = '';
            
            progressReports.forEach(report => {
                const reportCard = document.createElement('div');
                reportCard.className = 'card mb-3';
                reportCard.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${report.title || 'Progress Report'}</h6>
                            <small class="text-muted">${formatDate(report.date)}</small>
                        </div>
                        <p class="card-text text-muted mb-2">${report.description || 'No description available'}</p>
                        ${report.client_comment ? `<div class="alert alert-light p-2 mb-2"><small><strong>Your Comment:</strong> ${report.client_comment}</small></div>` : ''}
                        ${report.coach_feedback ? `<div class="alert alert-info p-2 mb-2"><small><strong>Coach Feedback:</strong> ${report.coach_feedback}</small></div>` : ''}
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary" onclick="viewProgressReport(${report.id})">
                                    <i class="fas fa-eye me-1"></i> View Details
                                </button>
                                ${!report.client_comment ? `<button class="btn btn-outline-success" onclick="addCommentToReport(${report.id})"><i class="fas fa-comment me-1"></i> Add Comment</button>` : ''}
                            </div>
                            <span class="badge bg-${report.status === 'completed' ? 'success' : 'warning'}">${report.status || 'pending'}</span>
                        </div>
                    </div>
                `;
                progressReportsContainer.appendChild(reportCard);
            });
        } else {
            progressReportsContainer.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-chart-line fa-3x mb-3 d-block"></i>
                    <h6>No Progress Reports Yet</h6>
                    <p class="mb-3">Your coach will create progress reports to track your fitness journey.</p>
                    <button class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-plus me-1"></i> Request Progress Review
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading progress reports:', error);
        const progressReportsContainer = document.getElementById('progress-reports-container');
        if (progressReportsContainer) {
            progressReportsContainer.innerHTML = `
                <div class="text-center text-danger py-5">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3 d-block"></i>
                    <h6>Failed to Load Progress Reports</h6>
                    <p class="mb-3">There was an error loading your progress reports.</p>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadProgressReports()">
                        <i class="fas fa-refresh me-1"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Load plans and sessions with real data
 */
async function loadPlansAndSessions() {
    try {
        console.log('Loading plans and sessions...');
        
        const plansContainer = document.getElementById('plans-container');
        const sessionsContainer = document.getElementById('sessions-container');
        
        if (!plansContainer || !sessionsContainer) {
            console.warn('Plans or sessions container not found');
            return;
        }
        
        // Fetch plans and sessions data (using subscriptions as plans for now)
        const [subscriptions, sessions] = await Promise.all([
            fetchAPI('client-subscriptions/', 'GET'),
            fetchAPI('client-sessions/', 'GET') // This endpoint may need to be created
        ]);
        
        // Load Plans
        if (subscriptions && subscriptions.length > 0) {
            plansContainer.innerHTML = '';
            
            subscriptions.forEach(subscription => {
                const planCard = document.createElement('div');
                planCard.className = 'card mb-3';
                planCard.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${subscription.plan_name || 'Fitness Plan'}</h6>
                            <span class="badge bg-${subscription.status === 'active' ? 'success' : 'secondary'}">${subscription.status || 'inactive'}</span>
                        </div>
                        <p class="card-text text-muted mb-2">${subscription.description || 'No description available'}</p>
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <small class="text-muted d-block">Duration</small>
                                <strong>${subscription.duration_months || '--'} months</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Start Date</small>
                                <strong>${formatDate(subscription.start_date)}</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">End Date</small>
                                <strong>${formatDate(subscription.end_date)}</strong>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-primary" onclick="viewPlanDetails(${subscription.id})">
                                    <i class="fas fa-eye me-1"></i> View Details
                                </button>
                                <button class="btn btn-outline-info" onclick="downloadPlan(${subscription.id})">
                                    <i class="fas fa-download me-1"></i> Download
                                </button>
                            </div>
                            <small class="text-muted">Coach: ${subscription.coach_name || 'Not assigned'}</small>
                        </div>
                    </div>
                `;
                plansContainer.appendChild(planCard);
            });
        } else {
            plansContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-dumbbell fa-2x mb-3 d-block"></i>
                    <h6>No Active Plans</h6>
                    <p class="mb-3">You don't have any active fitness plans yet.</p>
                    <button class="btn btn-primary btn-sm">
                        <i class="fas fa-plus me-1"></i> Browse Plans
                    </button>
                </div>
            `;
        }
        
        // Load Sessions (placeholder implementation)
        sessionsContainer.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-calendar-alt fa-2x mb-3 d-block"></i>
                <h6>Sessions Coming Soon</h6>
                <p class="mb-3">Session tracking functionality will be available soon.</p>
                <button class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-calendar-plus me-1"></i> Schedule Session
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading plans and sessions:', error);
        
        if (plansContainer) {
            plansContainer.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3 d-block"></i>
                    <h6>Failed to Load Plans</h6>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadPlansAndSessions()">
                        <i class="fas fa-refresh me-1"></i> Try Again
                    </button>
                </div>
            `;
        }
        
        if (sessionsContainer) {
            sessionsContainer.innerHTML = `
                <div class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3 d-block"></i>
                    <h6>Failed to Load Sessions</h6>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadPlansAndSessions()">
                        <i class="fas fa-refresh me-1"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Load gallery images (placeholder)
 */
function loadGalleryImages() {
    console.log('Loading gallery images...');
    // Implementation for loading gallery images
}

/**
 * Load recent activity with real data
 * Combines data from various endpoints to show recent activity
 */
async function loadRecentActivity() {
    console.log('Loading recent activity...');
    
    const activityContainer = document.getElementById('recent-activity');
    if (!activityContainer) {
        console.warn('Recent activity container not found');
        return;
    }
    
    try {
        // Show loading state
        activityContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">Loading activity...</p>
            </div>
        `;
        
        // Collect activity data from various endpoints
        let activityItems = [];
        
        // 1. Get measurements (newest first)
        try {
            const measurements = await fetchAPI('client-measurements/', 'GET');
            if (measurements && Array.isArray(measurements)) {
                measurements.slice(0, 3).forEach(measurement => {
                    activityItems.push({
                        type: 'measurement',
                        icon: 'fas fa-weight',
                        iconBg: 'bg-primary',
                        title: 'Updated measurements',
                        details: `Weight: ${measurement.weight} kg${measurement.body_fat_percentage ? ', Body Fat: ' + measurement.body_fat_percentage + '%' : ''}`,
                        date: new Date(measurement.date_recorded || measurement.date),
                        timestamp: new Date(measurement.date_recorded || measurement.date).getTime()
                    });
                });
            }
        } catch (err) {
            console.warn('Error fetching measurements for activity:', err);
        }
        
        // 2. Get progress reports
        try {
            const reports = await fetchAPI('client-progress-reports/', 'GET');
            if (reports && Array.isArray(reports)) {
                reports.slice(0, 3).forEach(report => {
                    activityItems.push({
                        type: 'progress',
                        icon: 'fas fa-chart-line',
                        iconBg: 'bg-success',
                        title: 'New progress report',
                        details: report.title || 'Progress update recorded',
                        date: new Date(report.created_at || report.date),
                        timestamp: new Date(report.created_at || report.date).getTime()
                    });
                });
            }
        } catch (err) {
            console.warn('Error fetching progress reports for activity:', err);
        }
        
        // 3. Get workout sessions (if endpoint exists)
        // Note: This endpoint may not be implemented yet, so we handle the 404 gracefully
        try {
            // Try to fetch sessions but don't let a 404 break the entire activity feed
            const fetchSessionsPromise = fetchAPI('client-sessions/', 'GET');
            
            // Set a timeout to avoid waiting too long for a non-existent endpoint
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Sessions fetch timed out')), 3000);
            });
            
            // Race between actual fetch and timeout
            const sessions = await Promise.race([fetchSessionsPromise, timeoutPromise])
                .catch(err => {
                    // If 404 or timeout, just return empty array (don't break the activity feed)
                    console.log('Sessions endpoint not available, skipping this data source');
                    return [];
                });
                
            if (sessions && Array.isArray(sessions)) {
                sessions.slice(0, 3).forEach(session => {
                    activityItems.push({
                        type: 'session',
                        icon: 'fas fa-dumbbell',
                        iconBg: 'bg-danger',
                        title: 'Completed workout session',
                        details: session.title || session.workout_plan || 'Workout session',
                        date: new Date(session.date || session.created_at),
                        timestamp: new Date(session.date || session.created_at).getTime()
                    });
                });
            }
        } catch (err) {
            // Just log and continue - don't let this stop the activity feed
            console.warn('Error fetching sessions for activity:', err);
        }
        
        // Sort all activity items by date (newest first)
        activityItems.sort((a, b) => b.timestamp - a.timestamp);
        
        // Display activity items
        if (activityItems.length > 0) {
            // Take only the 5 most recent items
            const recentItems = activityItems.slice(0, 5);
            
            activityContainer.innerHTML = recentItems.map(item => `
                <div class="activity-item">
                    <div class="activity-icon ${item.iconBg}">
                        <i class="${item.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="mb-1 fw-bold">${item.title}</p>
                        <p class="mb-1 small">${item.details}</p>
                        <span class="text-muted small">${formatTimeAgo(item.date)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            // No activity found
            activityContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-calendar-check text-muted mb-3" style="font-size: 2rem;"></i>
                    <p class="text-muted">No recent activity found.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-circle text-danger mb-3" style="font-size: 2rem;"></i>
                <p class="text-danger">Failed to load recent activity.</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadRecentActivity()">Try Again</button>
            </div>
        `;
    }
}

/**
 * Format a date as a time ago string (e.g., "3 hours ago")
 */
function formatTimeAgo(date) {
    const now = new Date();
    const secondsAgo = Math.floor((now - date) / 1000);
    
    // Less than a minute
    if (secondsAgo < 60) {
        return 'Just now';
    }
    
    // Less than an hour
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) {
        return minutesAgo === 1 ? '1 minute ago' : `${minutesAgo} minutes ago`;
    }
    
    // Less than a day
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) {
        return hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
    }
    
    // Less than a week
    const daysAgo = Math.floor(hoursAgo / 24);
    if (daysAgo < 7) {
        return daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
    }
    
    // Otherwise, return the date
    return date.toLocaleDateString();
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

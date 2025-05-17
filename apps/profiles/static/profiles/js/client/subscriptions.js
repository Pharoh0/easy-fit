/**
 * Subscriptions JavaScript - API Driven Implementation
 * Handles client-side functionality for managing subscriptions
 */

// DOM Elements
let subscriptionsContainer;
let subscriptionDetailContainer;
let loadingSpinner;
let errorContainer;
let subscriptionId;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Loading and error elements
    loadingSpinner = document.getElementById('loading-spinner');
    errorContainer = document.getElementById('error-container');
    
    // Check which page we're on and initialize accordingly
    subscriptionsContainer = document.getElementById('subscriptions-list');
    subscriptionDetailContainer = document.getElementById('subscription-detail');
    
    if (subscriptionsContainer) {
        initSubscriptionsList();
    } else if (subscriptionDetailContainer) {
        subscriptionId = subscriptionDetailContainer.dataset.subscriptionId;
        initSubscriptionDetail();
    }
    
    // Meal day / Workout day selectors
    initDaySelectors();
    
    // Auto dismiss alerts after 5 seconds
    dismissAlerts();
    
    // Date restrictions for consultation scheduling
    initConsultationDateRestrictions();
    
    // Filter subscriptions (for subscriptions list page)
    initSubscriptionFilters();
});

/**
 * Initialize day selectors for meal and workout plans
 */
function initDaySelectors() {
    // Handle meal plan day selection
    const mealDayBtns = document.querySelectorAll('.meal-days .day-btn');
    const mealDayContents = document.querySelectorAll('.meal-days .day-content');
    
    mealDayBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and content
            mealDayBtns.forEach(b => b.classList.remove('active'));
            mealDayContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding content
            const dayNumber = this.getAttribute('data-day');
            document.getElementById('day' + dayNumber).classList.add('active');
        });
    });
    
    // Handle workout plan day selection
    const workoutDayBtns = document.querySelectorAll('.workout-days .day-btn');
    const workoutDayContents = document.querySelectorAll('.workout-days .day-content');
    
    workoutDayBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and content
            workoutDayBtns.forEach(b => b.classList.remove('active'));
            workoutDayContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding content
            const dayId = this.getAttribute('data-day');
            document.getElementById(dayId).classList.add('active');
        });
    });
}

/**
 * Initialize confirmation dialogs for subscription actions
 */
function initActionConfirmations() {
    // Confirm subscription actions that require additional confirmation
    const pauseSubscriptionForm = document.querySelector('form[action*="pause_subscription"]');
    const cancelSubscriptionForm = document.querySelector('form[action*="cancel_subscription"]');
    const resumeSubscriptionForm = document.querySelector('form[action*="resume_subscription"]');
    
    if (pauseSubscriptionForm) {
        pauseSubscriptionForm.addEventListener('submit', function(e) {
            const pauseReason = document.getElementById('pauseReason');
            
            // If modal is not being used, confirm directly
            if (!document.getElementById('pauseSubscriptionModal')) {
                if (!confirm('Are you sure you want to pause this subscription?')) {
                    e.preventDefault();
                }
            }
        });
    }
    
    if (cancelSubscriptionForm) {
        cancelSubscriptionForm.addEventListener('submit', function(e) {
            const cancelReason = document.getElementById('cancelReason');
            
            // If modal is not being used, confirm directly
            if (!document.getElementById('cancelSubscriptionModal')) {
                if (!confirm('WARNING: Are you sure you want to cancel this subscription? This action cannot be undone.')) {
                    e.preventDefault();
                }
            }
        });
    }
    
    if (resumeSubscriptionForm) {
        resumeSubscriptionForm.addEventListener('submit', function(e) {
            if (!confirm('Are you sure you want to resume this subscription?')) {
                e.preventDefault();
            }
        });
    }
}

/**
 * Auto-dismiss alerts after a timeout
 */
function dismissAlerts() {
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
}

/**
 * Initialize date and time restrictions for consultation scheduling
 */
function initConsultationDateRestrictions() {
    const consultationDateInput = document.getElementById('consultationDate');
    const consultationTimeInput = document.getElementById('consultationTime');
    
    if (consultationDateInput) {
        // Set min date to today
        const today = new Date();
        const todayFormatted = today.toISOString().split('T')[0];
        consultationDateInput.setAttribute('min', todayFormatted);
        
        // Set max date to 3 months from now
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        const maxDateFormatted = maxDate.toISOString().split('T')[0];
        consultationDateInput.setAttribute('max', maxDateFormatted);
        
        // Validate selected date is not a weekend
        consultationDateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                alert('Please select a weekday (Monday-Friday) for your consultation.');
                this.value = '';
            }
        });
    }
    
    if (consultationTimeInput) {
        // Restrict time to business hours (9AM - 6PM)
        consultationTimeInput.addEventListener('change', function() {
            const selectedTime = this.value;
            const hour = parseInt(selectedTime.split(':')[0]);
            
            if (hour < 9 || hour >= 18) {
                alert('Please select a time between 9:00 AM and 6:00 PM.');
                this.value = '09:00';
            }
        });
    }
}

/**
 * Initialize subscription filters for the subscriptions list page
 */
function initSubscriptionFilters() {
    const filterOptions = document.querySelectorAll('.filter-option');
    const subscriptionCards = document.querySelectorAll('.subscription-card');
    
    if (filterOptions.length > 0 && subscriptionCards.length > 0) {
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove active class from all options
                filterOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                this.classList.add('active');
                
                // Get filter value
                const filter = this.getAttribute('data-filter');
                
                // Show/hide subscription cards based on filter
                subscriptionCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-status') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
}

/**
 * Animation for plan tabs and contents
 */
document.addEventListener('shown.bs.tab', function(event) {
    // Get newly activated tab
    const activeTab = event.target;
    const tabId = activeTab.getAttribute('data-bs-target');
    
    // Add animation to the tab content
    const tabContent = document.querySelector(tabId);
    if (tabContent) {
        tabContent.style.opacity = '0';
        setTimeout(() => {
            tabContent.style.transition = 'opacity 0.5s ease';
            tabContent.style.opacity = '1';
        }, 50);
    }
});

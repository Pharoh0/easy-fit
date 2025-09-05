/**
 * User Activity Tracker
 * Tracks user activity to improve authentication and session handling
 */

(function() {
    // Initialize activity timestamp on script load
    updateActivityTimestamp();
    
    // Set up event listeners for user activity
    document.addEventListener('mousemove', debounce(updateActivityTimestamp, 60000)); // Once per minute
    document.addEventListener('keydown', debounce(updateActivityTimestamp, 60000));
    document.addEventListener('touchstart', debounce(updateActivityTimestamp, 60000));
    document.addEventListener('click', debounce(updateActivityTimestamp, 60000));
    document.addEventListener('scroll', debounce(updateActivityTimestamp, 60000));
    
    // Update timestamp when page visibility changes (user returns to tab)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            updateActivityTimestamp();
        }
    });
    
    /**
     * Update the last activity timestamp in session storage
     */
    function updateActivityTimestamp() {
        try {
            sessionStorage.setItem('last_user_activity', Date.now().toString());
            console.debug('Activity timestamp updated');
        } catch (e) {
            console.warn('Failed to update activity timestamp:', e);
        }
    }
    
    /**
     * Simple debounce function to limit how often a function runs
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
})();

/**
 * Avatar Handler - Global solution for avatar image fallbacks
 * Automatically handles all avatar images site-wide
 */
(function() {
    // Classes that should be treated as avatars for fallback handling
    const AVATAR_CLASSES = [
        'profile-avatar', 
        'navbar-profile-avatar', 
        'avatar', 
        'user-avatar',
        'client-avatar',
        'coach-avatar',
        'message-avatar',
        'comment-avatar',
        'avatar-img',
        'profile-img'
    ];
    
    // Default avatar path
    const DEFAULT_AVATAR = '/static/images/default-avatar.svg';
    
    /**
     * Apply fallback handling to an image element
     * @param {HTMLImageElement} img - The image element to handle
     */
    function handleAvatarFallback(img) {
        // Skip if already has error handler
        if (img.hasAttribute('data-avatar-handled')) return;
        
        // Mark as handled
        img.setAttribute('data-avatar-handled', 'true');
        
        // Add error handler
        img.onerror = function() {
            // Clear error handler to prevent loops
            this.onerror = null;
            
            // Get user name for generating avatar
            const userName = this.getAttribute('data-username') || 
                             this.getAttribute('alt') || 
                             'User';
            
            // Try to use AvatarGenerator from utils if available
            if (window.AvatarGenerator && typeof window.AvatarGenerator.generateAvatar === 'function') {
                this.src = window.AvatarGenerator.generateAvatar(userName);
            }
            // Otherwise try to use the global AvatarGenerator class if available
            else if (window.AvatarGenerator && typeof window.AvatarGenerator.generateAvatar === 'function') {
                this.src = window.AvatarGenerator.generateAvatar(userName);
            }
            // Finally, fall back to default avatar image
            else {
                this.src = DEFAULT_AVATAR;
            }
        };
        
        // Force reload if already failed to load (but src is set)
        if (img.complete && img.naturalHeight === 0 && img.src) {
            const originalSrc = img.src;
            // Clear src and then set it again to trigger onerror
            img.src = '';
            setTimeout(() => { img.src = originalSrc; }, 0);
        }
    }
    
    /**
     * Find all avatar images on the page and apply fallback handling
     */
    function setupAvatarFallbacks() {
        // Process images with avatar-related classes
        AVATAR_CLASSES.forEach(className => {
            const avatars = document.querySelectorAll(`.${className}`);
            avatars.forEach(img => {
                if (img.tagName === 'IMG') {
                    handleAvatarFallback(img);
                }
            });
        });
        
        // Process images inside elements with avatar-related classes
        AVATAR_CLASSES.forEach(className => {
            const avatarContainers = document.querySelectorAll(`.${className}`);
            avatarContainers.forEach(container => {
                if (container.tagName !== 'IMG') {
                    const img = container.querySelector('img');
                    if (img) {
                        handleAvatarFallback(img);
                    }
                }
            });
        });
        
        // Process images with src containing 'avatar' or 'profile' keywords
        document.querySelectorAll('img[src*="avatar"], img[src*="profile"]').forEach(img => {
            handleAvatarFallback(img);
        });
    }
    
    /**
     * Setup MutationObserver to handle dynamically added avatar images
     */
    function setupAvatarObserver() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        // If the added node is an element
                        if (node.nodeType === 1) {
                            // Check if it's an avatar image
                            if (node.tagName === 'IMG') {
                                const isAvatar = AVATAR_CLASSES.some(cls => node.classList.contains(cls)) ||
                                                node.src.includes('avatar') || 
                                                node.src.includes('profile');
                                
                                if (isAvatar) {
                                    handleAvatarFallback(node);
                                }
                            }
                            
                            // Also check for avatar images inside this node
                            const avatars = [...node.querySelectorAll('img')].filter(img => {
                                return AVATAR_CLASSES.some(cls => img.classList.contains(cls)) ||
                                       img.src.includes('avatar') || 
                                       img.src.includes('profile');
                            });
                            
                            avatars.forEach(img => handleAvatarFallback(img));
                        }
                    });
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Run on page load
    document.addEventListener('DOMContentLoaded', function() {
        setupAvatarFallbacks();
        setupAvatarObserver();
    });
    
    // Also run immediately in case the DOM is already loaded
    if (document.readyState !== 'loading') {
        setupAvatarFallbacks();
        setupAvatarObserver();
    }
})();

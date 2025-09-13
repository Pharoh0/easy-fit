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
    
    // Helpers
    function getUserName(img) {
        return img.getAttribute('data-username') || img.getAttribute('alt') || 'User';
    }

    function isDefaultAvatarSrc(src) {
        if (!src) return false;
        try { src = String(src); } catch (e) { return false; }
        return src.indexOf('default-avatar.svg') !== -1;
    }

    function applyGeneratedAvatar(img) {
        const userName = getUserName(img);
        // Determine a reasonable size for crisp rendering
        let size = 32;
        try {
            const cs = window.getComputedStyle ? window.getComputedStyle(img) : null;
            const sw = cs ? parseInt(cs.width) || 0 : 0;
            const sh = cs ? parseInt(cs.height) || 0 : 0;
            const aw = Number(img.width || 0);
            const ah = Number(img.height || 0);
            const candidates = [sw, sh, aw, ah, 32].filter(n => n && !isNaN(n));
            size = Math.max.apply(null, candidates);
            size = Math.max(24, Math.min(size, 256)); // clamp
        } catch (e) { /* ignore, keep default */ }

        if (window.AvatarGenerator && typeof window.AvatarGenerator.generateAvatar === 'function') {
            img.src = window.AvatarGenerator.generateAvatar(userName, { size });
        } else {
            img.src = DEFAULT_AVATAR;
        }
    }
    
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
            applyGeneratedAvatar(this);
        };

        // Initial checks for empty/placeholder src that won't trigger onerror
        try {
            const currentSrc = (img.getAttribute('src') || '').trim();
            const looksEmpty = !currentSrc || currentSrc === '#' || currentSrc.toLowerCase() === 'none' || currentSrc.toLowerCase() === 'null';

            // If no valid src, immediately apply generated/default avatar
            if (looksEmpty) {
                applyGeneratedAvatar(img);
                return;
            }

            // For navbar avatar, prefer generated avatar over default static placeholder
            if (img.classList.contains('navbar-profile-avatar') && isDefaultAvatarSrc(currentSrc)) {
                applyGeneratedAvatar(img);
                // continue to try loading remote image below if provided
            }
        } catch (e) { /* ignore */ }

        // Preload remote avatar if provided via data-remote-src and swap only on success
        try {
            const remoteSrc = img.getAttribute('data-remote-src');
            if (remoteSrc && !img.getAttribute('data-remote-attempted')) {
                img.setAttribute('data-remote-attempted', '1');
                const tmp = new Image();
                tmp.onload = function() {
                    // Only swap if still default or generated
                    try {
                        const cur = img.getAttribute('src') || '';
                        const isPlaceholder = isDefaultAvatarSrc(cur) || cur.startsWith('data:image/svg');
                        if (isPlaceholder) img.src = remoteSrc;
                    } catch (_) { img.src = remoteSrc; }
                };
                tmp.onerror = function() {
                    // keep generated/default
                };
                tmp.src = remoteSrc;
            }
        } catch (e) { /* ignore */ }

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


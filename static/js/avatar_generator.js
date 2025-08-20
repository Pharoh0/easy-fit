/**
 * Avatar Generator - Local replacement for UI Avatars API
 * Generates avatar images with initials based on user names
 */
class AvatarGenerator {
    /**
     * Generate a data URL for an avatar with the given name
     * @param {string} name - The name to use for generating initials
     * @param {Object} options - Configuration options
     * @returns {string} - Data URL for the avatar image
     */
    static generateAvatar(name, options = {}) {
        const defaultOptions = {
            background: '667eea',
            color: 'fff',
            size: 32,
            fontSize: 0.4, // Relative to size
            fontFamily: 'Arial, sans-serif',
            uppercase: true
        };
        
        const config = { ...defaultOptions, ...options };
        const canvas = document.createElement('canvas');
        const size = parseInt(config.size, 10);
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = `#${config.background}`;
        ctx.fillRect(0, 0, size, size);
        
        // Generate initials
        const initials = this.getInitials(name, config.uppercase);
        
        // Draw text
        ctx.fillStyle = `#${config.color}`;
        ctx.font = `${size * config.fontSize}px ${config.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);
        
        // Return data URL
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Get initials from a name
     * @param {string} name - Full name
     * @param {boolean} uppercase - Whether to uppercase the initials
     * @returns {string} - Initials (1-2 characters)
     */
    static getInitials(name, uppercase = true) {
        if (!name) return '?';
        
        const parts = name.trim().split(/\s+/);
        let initials = '';
        
        if (parts.length === 1) {
            initials = parts[0].charAt(0);
        } else {
            initials = parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
        }
        
        return uppercase ? initials.toUpperCase() : initials;
    }
}

// Make available globally
window.AvatarGenerator = AvatarGenerator;

// Utility functions for Eazy Fit application
const utils = {
    // Sanitize strings to prevent XSS attacks
    sanitize: function(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },
    // Format currency based on locale
    formatCurrency: function(amount, locale = 'en-US', currency = 'USD') {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },
    
    // Format date
    formatDate: function(dateString, options = {}) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                ...options
            });
        } catch (e) {
            console.error('Error formatting date:', e);
            return dateString;
        }
    },
    
    // Check if user is authenticated
    isAuthenticated: function() {
        return !!localStorage.getItem('access_token');
    },
    
    // Get authentication redirect URL
    getAuthRedirectURL: function(returnPath = window.location.pathname) {
        return `/auth-users/login/?next=${encodeURIComponent(returnPath)}`;
    },
    
    // Create authentication modal
    createAuthModal: function() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('auth-required-modal');
        if (!modal) {
            const modalHTML = `
            <div class="modal fade" id="auth-required-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Authentication Required</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>You need to be logged in to perform this action.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <a href="/auth-users/login/" class="btn btn-primary">Log In</a>
                            <a href="/auth-users/register/" class="btn btn-outline-primary">Register</a>
                        </div>
                    </div>
                </div>
            </div>`;
            
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
            modal = document.getElementById('auth-required-modal');
        }
        
        return modal;
    },
    
    // Show authentication modal
    showAuthModal: function() {
        const modal = this.createAuthModal();
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    },
    
    // Handle authentication required
    handleAuthRequired: function(event, redirectURL) {
        if (!this.isAuthenticated()) {
            // Prevent default link behavior
            if (event) {
                event.preventDefault();
            }
            
            // Show modal or redirect
            if (redirectURL) {
                // Store the URL to redirect after login
                const returnPath = encodeURIComponent(redirectURL);
                window.location.href = this.getAuthRedirectURL(returnPath);
            } else {
                this.showAuthModal();
            }
            return false;
        }
        return true;
    }
};

// Avatar generator utility
const AvatarGenerator = {
    // Generate a simple avatar based on name
    generateAvatar: function(name, options = {}) {
        const defaultOptions = {
            size: 100,
            background: this._getColorFromString(name),
            color: '#FFFFFF',
            fontSize: 40
        };
        
        const opts = {...defaultOptions, ...options};
        const canvas = document.createElement('canvas');
        canvas.width = opts.size;
        canvas.height = opts.size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = opts.color;
        ctx.font = `${opts.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const initials = this._getInitials(name);
        ctx.fillText(initials, canvas.width/2, canvas.height/2);
        
        return canvas.toDataURL('image/png');
    },
    
    // Get initials from name
    _getInitials: function(name) {
        if (!name) return '?';
        
        const words = name.trim().split(' ');
        if (words.length === 1) {
            return words[0].charAt(0).toUpperCase();
        }
        
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    },
    
    // Generate color from string
    _getColorFromString: function(str) {
        if (!str) return '#6c757d';
        
        const colors = [
            '#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#dc3545', 
            '#fd7e14', '#28a745', '#20c997', '#17a2b8'
        ];
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
};

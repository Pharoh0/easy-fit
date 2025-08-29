/**
 * Eazy Fit Navbar JavaScript
 * Consolidated navbar functionality including dropdowns, dark mode, and plan management
 */

// Generate a local avatar using canvas based on user initials
function generateLocalAvatar(name) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 100;
    
    canvas.width = size;
    canvas.height = size;
    
    // Get initials (first letter of each word, max 2)
    const initials = name.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue + 30}, 70%, 50%)`);
    
    // Draw background
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Draw initials
    ctx.fillStyle = 'white';
    ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);
    
    return canvas.toDataURL();
}

// Initialize all Bootstrap dropdowns
function initializeDropdowns() {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded!');
        return;
    }
    
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(dropdown => {
        // Initialize only if not already initialized
        if (!dropdown.hasAttribute('data-bs-initialized')) {
            try {
                new bootstrap.Dropdown(dropdown, {
                    autoClose: true
                });
                dropdown.setAttribute('data-bs-initialized', 'true');
            } catch (e) {
                console.error('Error initializing dropdown:', e);
            }
        }
    });
}

// Handle logout functionality (unified)
function handleLogout() {
    const candidates = [
        document.getElementById('logout-button'), // current id in navbar.html
        document.getElementById('logoutButton')   // legacy id just in case
    ].filter(Boolean);

    candidates.forEach((btn) => {
        if (btn.getAttribute('data-bound') === 'true') return;
        btn.setAttribute('data-bound', 'true');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (typeof window.logout === 'function') {
                // Use unified logout from auth_jwt.js
                window.logout();
            } else {
                // Fallback: clear tokens and redirect to unified login
                try {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('jwt_token');
                    sessionStorage.removeItem('jwt_token');
                } catch (err) {}
                const loginUrl = (window.LOGIN_URL || '/auth-users/login/');
                const nextUrl = encodeURIComponent(window.location.href);
                window.location.href = `${loginUrl}?next=${nextUrl}`;
            }
        });
    });
}

// Plan Management Functions
function showPlanAnalytics() {
    const modal = document.getElementById('analyticsModal');
    if (!modal) {
        console.warn('Analytics modal not found');
        return;
    }
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Initialize all navbar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dropdowns first
    initializeDropdowns();
    
    // Reinitialize dropdowns when modals are shown/hidden
    document.addEventListener('shown.bs.modal', initializeDropdowns);
    document.addEventListener('hidden.bs.modal', initializeDropdowns);
    
    // Handle image fallbacks
    const navbarLogo = document.querySelector('.navbar-logo');
    if (navbarLogo) {
        navbarLogo.onerror = function() {
            this.onerror = null;
            this.src = '/static/images/default-logo.png';
        };
    }

    // Dark mode toggle functionality
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;
    
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');
    
    function setTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
            if (darkModeIcon) {
                darkModeIcon.classList.remove('bi-moon');
                darkModeIcon.classList.add('bi-sun');
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (darkModeIcon) {
                darkModeIcon.classList.remove('bi-sun');
                darkModeIcon.classList.add('bi-moon');
            }
        }
    }
    
    // Set initial theme
    if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
        setTheme(true);
    }
    
    // Toggle dark mode when button is clicked
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            const isDark = !document.body.classList.contains('dark-mode');
            setTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
    
    // Handle search functionality
    const searchInput = document.querySelector('.navbar-search input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    console.log('Searching for:', query);
                    // Here you would typically redirect to a search results page
                    window.location.href = `/search/?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    // Handle notifications dropdown
    const notificationBell = document.querySelector('.nav-link[data-bs-toggle="dropdown"]');
    if (notificationBell) {
        notificationBell.addEventListener('shown.bs.dropdown', function() {
            // Mark notifications as read when dropdown is shown
            const unreadBadge = this.querySelector('.notification-badge');
            if (unreadBadge) {
                unreadBadge.style.display = 'none';
                // Here you would typically make an API call to mark notifications as read
            }
        });
    }
    
    // Plan management keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Only activate when not in an input field
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable) {
            return;
        }
        
        // Ctrl/Cmd + Shift + P for Plan Management
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            const planManagementLink = document.querySelector('a[href*="plan-management"]');
            if (planManagementLink) {
                window.location.href = planManagementLink.href;
            }
        }
    });
    
    // Initialize logout handler
    handleLogout();
    
    // Make showPlanAnalytics available globally and bind navbar Analytics link
    window.showPlanAnalytics = showPlanAnalytics;

    const analyticsLink = document.getElementById('navPlanAnalytics');
    if (analyticsLink && analyticsLink.getAttribute('data-bound') !== 'true') {
        analyticsLink.setAttribute('data-bound', 'true');
        analyticsLink.addEventListener('click', function(e) {
            e.preventDefault();
            showPlanAnalytics();
        });
    }
    
    // Make navbar sticky on scroll with improved performance
    const navbar = document.querySelector('.modern-navbar');
    if (navbar) {
        // Use requestAnimationFrame for better performance
        let lastScrollY = window.scrollY;
        let ticking = false;
        
        const updateNavbar = () => {
            if (lastScrollY > 10) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            lastScrollY = window.scrollY;
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateNavbar();
                });
                ticking = true;
            }
        }, { passive: true });
        
        // Ensure correct initial state
        updateNavbar();
    }
    
    // Handle notifications (example functionality)
    const notificationBadges = document.querySelectorAll('.notification-badge');
    notificationBadges.forEach(badge => {
        const parent = badge.closest('a');
        if (parent) {
            parent.addEventListener('click', function(e) {
                // For demo purposes only
                if (this.querySelector('.bi-bell')) {
                    e.preventDefault();
                    if (window.utils && typeof window.utils.showToast === 'function') {
                        utils.showToast('Notifications panel will be implemented here', 'info');
                    }
                } else if (this.querySelector('.bi-cart')) {
                    e.preventDefault();
                    if (window.utils && typeof window.utils.showToast === 'function') {
                        utils.showToast('Shopping cart will be implemented here', 'info');
                    }
                }
            });
        }
    });
    
    // Add active class to current nav item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href) && href !== '#') {
            link.classList.add('active');
        }
    });
});

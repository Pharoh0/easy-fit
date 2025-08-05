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

// Handle logout functionality
function handleLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear any stored tokens
            localStorage.removeItem('jwt_token');
            sessionStorage.removeItem('jwt_token');
            window.location.href = '/accounts/logout/';
        });
    }
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
    
    // Handle profile avatar fallbacks
    const profileAvatars = document.querySelectorAll('.profile-avatar, .navbar-profile-avatar');
    profileAvatars.forEach(avatar => {
        avatar.onerror = function() {
            this.onerror = null;
            const userName = this.getAttribute('data-username') || 'User';
            this.src = generateLocalAvatar(userName);
        };
    });

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
    
    // Make showPlanAnalytics available globally
    window.showPlanAnalytics = showPlanAnalytics;
    
    // Make navbar sticky on scroll
    const navbar = document.querySelector('.modern-navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 10) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
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
                    alert('Notifications panel will be implemented here');
                } else if (this.querySelector('.bi-cart')) {
                    e.preventDefault();
                    alert('Shopping cart will be implemented here');
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

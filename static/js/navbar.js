/**
 * Eazy Fit Navbar JavaScript
 * Handles navbar functionality including dark mode toggle, search, and notifications
 */

/**
 * Generate a local avatar using canvas based on user initials
 * @param {string} name - User's name
 * @returns {string} - Data URL of the generated avatar
 */
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

document.addEventListener('DOMContentLoaded', function() {
    // Handle image fallbacks
    const navbarLogo = document.querySelector('.navbar-logo');
    if (navbarLogo) {
        navbarLogo.onerror = function() {
            // Use a default logo if the main logo fails to load
            this.onerror = null;
            this.src = '/static/images/default-logo.png';
        };
    }
    
    // Handle profile avatar fallbacks
    const profileAvatars = document.querySelectorAll('.profile-avatar');
    profileAvatars.forEach(avatar => {
        avatar.onerror = function() {
            // Generate local avatar based on user initials
            this.onerror = null;
            const userName = this.getAttribute('data-username') || 'User';
            this.src = generateLocalAvatar(userName);
        };
    });

    // Dark mode toggle functionality
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;
    
    // Check for saved dark mode preference or respect OS preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem('theme');
    
    // Function to set theme based on preference
    const setTheme = (isDark) => {
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
    };
    
    // Set initial theme
    if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
        setTheme(true);
    }
    
    // Toggle dark mode when button is clicked
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDarkMode = document.body.classList.contains('dark-mode');
            setTheme(!isDarkMode);
            localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
        });
    }
    
    // Search functionality
    const searchInput = document.querySelector('.navbar-search input');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                // Perform search action
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    console.log('Searching for:', searchTerm);
                    // Here you would typically redirect to a search results page
                    // window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
                    
                    // For now, just show an alert
                    alert(`Search functionality will be implemented for: ${searchTerm}`);
                }
            }
        });
    }
    
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

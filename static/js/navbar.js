/**
 * Eazy Fit Navbar JavaScript
 * Handles navbar functionality including dark mode toggle, search, and notifications
 */

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
            // Use a default avatar or generate one based on user initials
            this.onerror = null;
            const userName = this.getAttribute('data-username') || 'User';
            this.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;
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

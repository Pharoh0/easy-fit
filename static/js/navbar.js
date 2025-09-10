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
    const notifBadge = document.querySelector('#notificationsDropdown .notification-badge');
    const notifMenu = document.getElementById('navNotificationsMenu');
    const notifDropdown = document.getElementById('notificationsDropdown');
    const markAllBtn = document.getElementById('markAllNotificationsRead');

    async function updateUnreadBadge() {
        if (!window.NotificationsAPI || !notifBadge) return;
        const res = await NotificationsAPI.unreadCount();
        let count = 0;
        if (res && res.success && res.data && typeof res.data.unread_count === 'number') {
            count = res.data.unread_count;
        } else if (res && res.unread_count != null) {
            count = res.unread_count;
        }
        if (count > 0) {
            notifBadge.textContent = String(count);
            notifBadge.style.display = '';
        } else {
            notifBadge.style.display = 'none';
        }
    }
    
    // Update badge when WebSocket sends unread count
    if (window.notificationWS) {
        window.notificationWS.addEventListener('unread_count', (data) => {
            if (notifBadge && data && typeof data.count === 'number') {
                if (data.count > 0) {
                    notifBadge.textContent = String(data.count);
                    notifBadge.style.display = '';
                } else {
                    notifBadge.style.display = 'none';
                }
            }
        });
        
        // Handle real-time notifications
        window.notificationWS.addEventListener('notification', (data) => {
            // Refresh the notification list if dropdown is open
            if (notifDropdown && notifDropdown.classList.contains('show')) {
                loadNotificationsList();
            }
        });
    }

    function renderNotificationsList(items) {
        if (!notifMenu) return;
        try { notifMenu.innerHTML = ''; } catch (e) {}
        if (!items || !items.length) {
            notifMenu.innerHTML = '<div class="p-3 text-muted">No notifications</div>';
            return;
        }
        const typeIcon = (t) => {
            switch (t) {
                case 'plan_created': return 'bi-clipboard-plus';
                case 'plan_updated': return 'bi-pencil-square';
                case 'plan_customized': return 'bi-sliders2';
                case 'daily_reminder': return 'bi-calendar2-check';
                case 'milestone_achieved': return 'bi-trophy';
                case 'plan_completed': return 'bi-flag';
                case 'plan_cancelled': return 'bi-x-circle';
                case 'plan_approved': return 'bi-check-circle';
                case 'plan_rejected': return 'bi-x-octagon';
                case 'coach_message': return 'bi-chat-dots';
                case 'refund_processed': return 'bi-cash-coin';
                default: return 'bi-bell';
            }
        };
        const formatWhen = (iso) => {
            try {
                const d = new Date(iso);
                return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            } catch (e) { return ''; }
        };

        const makeItem = (n) => {
            const li = document.createElement('a');
            li.className = 'dropdown-item d-flex align-items-start gap-2';
            li.href = '#';
            li.innerHTML = `
                <i class="bi ${typeIcon(n.notification_type)} mt-1 ${n.is_read ? 'text-muted' : 'text-primary'}"></i>
                <div class="flex-grow-1">
                    <div class="fw-semibold small">${(n.subject || n.notification_type).replace(/_/g, ' ')}</div>
                    <div class="small text-muted">${(n.subscription_info && n.subscription_info.plan_name) ? n.subscription_info.plan_name : ''} · ${formatWhen(n.sent_at || n.created_at)}</div>
                </div>
            `;
            li.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    // Try WebSocket first if available
                    if (window.notificationWS && window.notificationWS.connected) {
                        window.notificationWS.markAsRead(n.id);
                        li.querySelector('i').classList.remove('text-primary');
                        li.querySelector('i').classList.add('text-muted');
                        return;
                    }
                    
                    // Fall back to REST API
                    await NotificationsAPI.markRead(n.id);
                    li.querySelector('i').classList.remove('text-primary');
                    li.querySelector('i').classList.add('text-muted');
                    await updateUnreadBadge();
                } catch (err) {}
            });
            return li;
        };

        items.forEach(n => notifMenu.appendChild(makeItem(n)));
    }

    async function loadNotificationsList() {
        if (!window.NotificationsAPI) return;
        const res = await NotificationsAPI.list({});
        let items = [];
        if (res && res.success) {
            const data = res.data;
            if (data && Array.isArray(data.results)) items = data.results;
            else if (Array.isArray(data)) items = data;
        }
        renderNotificationsList(items);
    }

    // Initial load of unread count
    updateUnreadBadge();
    
    // Only poll if WebSocket is not available
    if (!window.notificationWS || !window.notificationWS.connected) {
        setInterval(updateUnreadBadge, 60000);
    }

    // Load notifications when dropdown is opened
    if (notifDropdown) {
        notifDropdown.addEventListener('shown.bs.dropdown', () => {
            loadNotificationsList();
        });
    }

    if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Try WebSocket first if available
            if (window.notificationWS && window.notificationWS.connected) {
                window.notificationWS.markAllAsRead();
                if (window.utils) utils.showToast('All notifications marked as read', 'success');
                return;
            }
            
            // Fall back to REST API
            const res = await NotificationsAPI.markAllRead();
            if (res && res.success) {
                updateUnreadBadge();
                loadNotificationsList();
                if (window.utils) utils.showToast('All notifications marked as read', 'success');
            } else if (window.utils) {
                utils.showToast('Failed to mark all as read', 'danger');
            }
        });
    }
    
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

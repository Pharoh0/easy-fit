// Client Profile View JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize tabs
    var tabElms = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElms.forEach(function(tabElm) {
        tabElm.addEventListener('click', function(event) {
            event.preventDefault();
            var tab = new bootstrap.Tab(tabElm);
            tab.show();
        });
    });

    // Gallery image click handler (for lightbox effect)
    const galleryItems = document.querySelectorAll('.gallery-item img');
    galleryItems.forEach(function(item) {
        item.addEventListener('click', function() {
            // You could add a lightbox library here or custom modal implementation
            console.log('Gallery item clicked:', item.src);
        });
    });

    // Progress animation for statistics
    const statValues = document.querySelectorAll('.stat-value');
    animateStatValues(statValues);

    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Function to animate stat values when they come into view
function animateStatValues(elements) {
    const options = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    elements.forEach(element => {
        observer.observe(element);
    });
}

// Handle tabs state persistence
function saveActiveTab(tabId) {
    if (localStorage) {
        localStorage.setItem('activeClientProfileTab', tabId);
    }
}

function loadActiveTab() {
    if (localStorage && localStorage.getItem('activeClientProfileTab')) {
        const tabId = localStorage.getItem('activeClientProfileTab');
        const tabElement = document.querySelector(`button[data-bs-target="${tabId}"]`);
        if (tabElement) {
            const tab = new bootstrap.Tab(tabElement);
            tab.show();
        }
    }
}

// Add event listener for tab changes
document.addEventListener('shown.bs.tab', function(event) {
    const targetId = event.target.getAttribute('data-bs-target');
    saveActiveTab(targetId);
});

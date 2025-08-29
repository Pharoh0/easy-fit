/**
 * Dashboard UI Interactions
 * Enhances dashboard UX with subtle animations, tooltips, and dynamic effects
 */

class DashboardInteractions {
    constructor() {
        this.initTooltips();
        this.initStatCardAnimations();
        this.initFilterInteractions();
        this.initChartAnimations();
        this.initScrollEffects();
        this.initCollapsibleFilterPanel();
    }

    /**
     * Initialize Bootstrap tooltips
     */
    initTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl, {
            delay: { show: 300, hide: 100 }
        }));
    }

    /**
     * Add subtle animations to stat cards
     */
    initStatCardAnimations() {
        const statCards = document.querySelectorAll('.stat-card');
        
        // Add hover effect
        statCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });

            // Add subtle animations when stats are updated
            const statValue = card.querySelector('.stat-value');
            if (statValue && statValue.textContent !== '--') {
                // Create observer to detect content changes
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList') {
                            this.pulseElement(statValue);
                        }
                    });
                });
                
                observer.observe(statValue, { childList: true });
            }
        });
    }

    /**
     * Add subtle pulse animation to an element when its content changes
     */
    pulseElement(element) {
        element.classList.add('animate-pulse');
        setTimeout(() => {
            element.classList.remove('animate-pulse');
        }, 1000);
    }

    /**
     * Enhance filter interactions
     */
    initFilterInteractions() {
        const filterButtons = document.querySelectorAll('#filterPresetGroup .btn');
        const customDateInputs = document.getElementById('customDateInputs');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // Show/hide custom date inputs
                if (this.getAttribute('data-preset') === 'custom') {
                    customDateInputs.style.display = 'block';
                } else {
                    customDateInputs.style.display = 'none';
                }
            });
        });

        // Add filter ripple effect
        const btnApplyFilters = document.getElementById('btnApplyFilters');
        if (btnApplyFilters) {
            btnApplyFilters.addEventListener('click', function() {
                this.classList.add('btn-ripple');
                setTimeout(() => {
                    this.classList.remove('btn-ripple');
                }, 500);
            });
        }
    }

    /**
     * Add smooth transitions to chart updates
     */
    initChartAnimations() {
        const chartContainers = document.querySelectorAll('.chart-container');
        
        // Add loading state to charts when data is being fetched
        chartContainers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                // Check if there's a chart instance
                if (canvas.chart) {
                    const originalUpdate = canvas.chart.update;
                    canvas.chart.update = function() {
                        container.classList.add('loading');
                        setTimeout(() => {
                            originalUpdate.apply(this, arguments);
                            setTimeout(() => {
                                container.classList.remove('loading');
                            }, 300);
                        }, 100);
                    };
                }
            }
        });
    }

    /**
     * Add scroll-based animations and effects
     */
    initScrollEffects() {
        const dashboard = document.querySelector('.dashboard-container');
        if (!dashboard) return;

        // Add scroll class to dashboard on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                dashboard.classList.add('scrolled');
            } else {
                dashboard.classList.remove('scrolled');
            }
        });

        // Add reveal animations for cards
        const cards = dashboard.querySelectorAll('.modern-card');
        this.setupScrollReveal(cards);
    }
    
    /**
     * Initialize collapsible filter panel with sticky behavior
     */
    initCollapsibleFilterPanel() {
        const filterPanel = document.getElementById('filterPanel');
        const filterBody = document.getElementById('filterBody');
        const filterCollapseIcon = document.getElementById('filterCollapseIcon');
        const btnToggleFilters = document.getElementById('btnToggleFilters');
        const filterToggleHeader = document.getElementById('filterToggleHeader');
        
        if (!filterPanel || !filterBody || !filterCollapseIcon) return;
        
        // Toggle filter panel when button is clicked
        if (btnToggleFilters) {
            btnToggleFilters.addEventListener('click', () => {
                this.toggleFilterPanel(filterPanel, filterBody, filterCollapseIcon);
            });
        }
        
        // Allow clicking on header to toggle filters (except buttons)
        if (filterToggleHeader) {
            filterToggleHeader.addEventListener('click', (e) => {
                // Only toggle if clicking directly on header (not on buttons)
                if (!e.target.closest('button') && 
                    !e.target.closest('.form-control') &&
                    (e.target === filterToggleHeader || 
                     (e.target.closest('#filterToggleHeader') && 
                      !e.target.closest('button') && 
                      !e.target.closest('.form-control')))) {
                    this.toggleFilterPanel(filterPanel, filterBody, filterCollapseIcon);
                }
            });
        }
        
        // Check if filter panel was collapsed in previous session
        if (sessionStorage.getItem('filterPanelCollapsed') === 'true') {
            filterBody.style.display = 'none';
            filterCollapseIcon.classList.remove('bi-chevron-up');
            filterCollapseIcon.classList.add('bi-chevron-down');
            filterPanel.classList.add('filter-panel-collapsed');
        }
        
        // Make filter panel sticky when scrolling
        this.initStickyFilterPanel(filterPanel);
    }
    
    /**
     * Toggle the filter panel visibility
     */
    toggleFilterPanel(filterPanel, filterBody, filterCollapseIcon) {
        const isCollapsed = filterPanel.classList.contains('filter-panel-collapsed');
        
        if (isCollapsed) {
            // Expand panel
            $(filterBody).slideDown(300);
            filterCollapseIcon.classList.remove('bi-chevron-down');
            filterCollapseIcon.classList.add('bi-chevron-up');
            filterPanel.classList.remove('filter-panel-collapsed');
            sessionStorage.setItem('filterPanelCollapsed', 'false');
        } else {
            // Collapse panel
            $(filterBody).slideUp(300);
            filterCollapseIcon.classList.remove('bi-chevron-up');
            filterCollapseIcon.classList.add('bi-chevron-down');
            filterPanel.classList.add('filter-panel-collapsed');
            sessionStorage.setItem('filterPanelCollapsed', 'true');
        }
    }
    
    /**
     * Make filter panel sticky when scrolling
     */
    initStickyFilterPanel(filterPanel) {
        if (!filterPanel) return;
        
        const filterPanelOffset = filterPanel.getBoundingClientRect().top + window.scrollY;
        let filterPanelWidth = filterPanel.offsetWidth;
        
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;
            const shouldStick = scrollPos > filterPanelOffset;
            
            if (shouldStick) {
                if (!filterPanel.classList.contains('sticky-filter-panel')) {
                    filterPanel.classList.add('sticky-filter-panel');
                    filterPanel.style.width = filterPanelWidth + 'px';
                    document.querySelector('.container').style.paddingTop = filterPanel.offsetHeight + 'px';
                }
            } else {
                if (filterPanel.classList.contains('sticky-filter-panel')) {
                    filterPanel.classList.remove('sticky-filter-panel');
                    filterPanel.style.width = '';
                    document.querySelector('.container').style.paddingTop = '';
                }
            }
        });
        
        // Update filter panel width on window resize
        window.addEventListener('resize', () => {
            if (!filterPanel.classList.contains('sticky-filter-panel')) {
                filterPanelWidth = filterPanel.offsetWidth;
            } else {
                filterPanel.style.width = document.querySelector('.container').offsetWidth + 'px';
            }
        });
    }

    /**
     * Setup scroll reveal animations for elements
     */
    setupScrollReveal(elements) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            elements.forEach(el => {
                el.classList.add('reveal-item');
                observer.observe(el);
            });
        } else {
            // Fallback for browsers that don't support IntersectionObserver
            elements.forEach(el => el.classList.add('revealed'));
        }
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardInteractions = new DashboardInteractions();
    
    // Add dashboard loading animation
    const dashboard = document.querySelector('.dashboard-container');
    if (dashboard) {
        setTimeout(() => {
            dashboard.classList.add('dashboard-loaded');
        }, 100);
    }
});

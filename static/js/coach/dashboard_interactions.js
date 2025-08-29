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

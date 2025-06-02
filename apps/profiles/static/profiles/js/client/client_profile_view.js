// Client Profile View JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var bootstrapTooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    bootstrapTooltips.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize Tippy.js tooltips if library is loaded
    if (typeof tippy !== 'undefined') {
        tippy('[data-tippy-content]', {
            allowHTML: true,
            placement: 'top',
            animation: 'scale',
            theme: 'light-border',
            duration: [300, 250],
            delay: [100, 100]
        });
    }

    // Animate stats on load
    animateStatValues();
    
    // Initialize tabs
    var tabElements = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElements.forEach(function(tabElement) {
        tabElement.addEventListener('click', function(event) {
            event.preventDefault();
            var tab = new bootstrap.Tab(tabElement);
            tab.show();
            
            // Save active tab to localStorage
            const tabId = tabElement.getAttribute('id');
            if (tabId && tabId.includes('plans')) {
                localStorage.setItem('active_plans_tab', tabId);
            } else if (tabId && tabId.includes('gallery')) {
                localStorage.setItem('active_gallery_tab', tabId);
            }
        });
    });

    // Restore active tabs from localStorage
    const activePlansTab = localStorage.getItem('active_plans_tab');
    const activeGalleryTab = localStorage.getItem('active_gallery_tab');
    
    if (activePlansTab) {
        const tabEl = document.getElementById(activePlansTab);
        if (tabEl) new bootstrap.Tab(tabEl).show();
    }
    
    if (activeGalleryTab) {
        const tabEl = document.getElementById(activeGalleryTab);
        if (tabEl) new bootstrap.Tab(tabEl).show();
    }

    // Fix progress bar width with animation
    setTimeout(function() {
        const progressBars = document.querySelectorAll('.progress-bar[data-progress]');
        progressBars.forEach(function(bar) {
            const progress = bar.getAttribute('data-progress');
            bar.style.transition = 'width 1s ease-in-out';
            bar.style.width = progress + '%';
        });
    }, 100);

    // Implement smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    window.scrollTo({
                        top: targetElement.offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Initialize gallery lightbox
    initializeGalleryLightbox();
});

// Function to animate stat values
function animateStatValues() {
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(function(statValue) {
        statValue.classList.add('animate-in');
    });
    
    // Animate with IntersectionObserver if available
    if ('IntersectionObserver' in window) {
        const options = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        statValues.forEach(function(element) {
            observer.observe(element);
        });
    }
}

/**
 * Open gallery modal with the specified image URL
 * @param {string} imageUrl - URL of the image to display in the modal
 */
function openGalleryModal(imageUrl) {
    // Get the modal elements
    const modal = document.getElementById('galleryLightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const imageCounter = document.getElementById('imageCounter');
    
    // Initialize the modal if not already done
    if (!modal) {
        initializeGalleryLightbox();
    }
    
    // Set the image
    if (lightboxImage) {
        lightboxImage.src = imageUrl;
    }
    
    // Find all gallery images to enable navigation
    const allGalleryImages = document.querySelectorAll('.gallery-image');
    const images = Array.from(allGalleryImages);
    let currentIndex = images.findIndex(img => img.src === imageUrl);
    
    // Update counter
    if (imageCounter && currentIndex !== -1) {
        imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
    }
    
    // Setup navigation button handlers for this session
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');
    
    // Remove previous event listeners if any
    const oldPrevBtn = prevBtn.cloneNode(true);
    const oldNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(oldPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(oldNextBtn, nextBtn);
    
    // Set up new event listeners
    oldPrevBtn.addEventListener('click', function() {
        if (currentIndex > 0) {
            currentIndex--;
            if (lightboxImage && images[currentIndex]) {
                lightboxImage.src = images[currentIndex].src;
                if (imageCounter) {
                    imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
                }
            }
            
            // Enable/disable buttons
            oldPrevBtn.disabled = currentIndex === 0;
            oldNextBtn.disabled = currentIndex === images.length - 1;
        }
    });
    
    oldNextBtn.addEventListener('click', function() {
        if (currentIndex < images.length - 1) {
            currentIndex++;
            if (lightboxImage && images[currentIndex]) {
                lightboxImage.src = images[currentIndex].src;
                if (imageCounter) {
                    imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
                }
            }
            
            // Enable/disable buttons
            oldPrevBtn.disabled = currentIndex === 0;
            oldNextBtn.disabled = currentIndex === images.length - 1;
        }
    });
    
    // Set initial button states
    oldPrevBtn.disabled = currentIndex === 0;
    oldNextBtn.disabled = currentIndex === images.length - 1;
    
    // Open the modal using Bootstrap
    if (typeof bootstrap !== 'undefined') {
        const lightboxInstance = new bootstrap.Modal(modal);
        lightboxInstance.show();
    }
    
    // Add keyboard navigation
    const handleKeydown = function(e) {
        if (e.key === 'ArrowLeft' && !oldPrevBtn.disabled) {
            oldPrevBtn.click();
        } else if (e.key === 'ArrowRight' && !oldNextBtn.disabled) {
            oldNextBtn.click();
        } else if (e.key === 'Escape') {
            if (typeof bootstrap !== 'undefined') {
                const lightboxInstance = bootstrap.Modal.getInstance(modal);
                if (lightboxInstance) lightboxInstance.hide();
            }
        }
    };
    
    // Add keyboard event listener when modal is shown
    modal.addEventListener('shown.bs.modal', function() {
        document.addEventListener('keydown', handleKeydown);
    });
    
    // Remove keyboard event listener when modal is hidden
    modal.addEventListener('hidden.bs.modal', function() {
        document.removeEventListener('keydown', handleKeydown);
    });
}

// Initialize gallery lightbox functionality
function initializeGalleryLightbox() {
    // Create lightbox modal HTML
    const lightboxModal = document.createElement('div');
    lightboxModal.id = 'galleryLightbox';
    lightboxModal.className = 'modal fade';
    lightboxModal.setAttribute('tabindex', '-1');
    lightboxModal.setAttribute('aria-hidden', 'true');
    
    lightboxModal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Progress Photo</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <img src="" class="img-fluid" id="lightboxImage">
                    <p class="mt-2" id="lightboxCaption"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="prevImageBtn"><i class="fas fa-arrow-left"></i> Previous</button>
                    <span class="mx-3" id="imageCounter">1/1</span>
                    <button type="button" class="btn btn-primary" id="nextImageBtn">Next <i class="fas fa-arrow-right"></i></button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body if not already present
    if (!document.getElementById('galleryLightbox')) {
        document.body.appendChild(lightboxModal);
    }
    
    // Add lightbox CSS
    if (!document.getElementById('lightbox-styles')) {
        const style = document.createElement('style');
        style.id = 'lightbox-styles';
        style.textContent = `
            #galleryLightbox .modal-content {
                background-color: rgba(0, 0, 0, 0.9);
                color: white;
                border: none;
            }
            #galleryLightbox .modal-header,
            #galleryLightbox .modal-footer {
                border-color: rgba(255, 255, 255, 0.1);
            }
            #galleryLightbox .btn-close {
                filter: invert(1) grayscale(100%) brightness(200%);
            }
            #lightboxImage {
                max-height: 70vh;
                object-fit: contain;
            }
            .gallery-image-container {
                position: relative;
                overflow: hidden;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }
            .gallery-image-container:hover {
                transform: translateY(-5px);
            }
            .gallery-image {
                width: 100%;
                height: 200px;
                object-fit: cover;
                transition: transform 0.5s ease;
            }
            .gallery-image:hover {
                transform: scale(1.05);
            }
            .gallery-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
            }
            .gallery-item-date {
                position: absolute;
                bottom: 10px;
                left: 10px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Initialize modal using Bootstrap if available
    let lightboxInstance;
    if (typeof bootstrap !== 'undefined') {
        lightboxInstance = new bootstrap.Modal(document.getElementById('galleryLightbox'));
    }
    
    // Get all gallery links and add click handlers
    const galleryLinks = document.querySelectorAll('.gallery-link');
    const images = Array.from(galleryLinks);
    let currentIndex = 0;
    
    // Setup gallery navigation functions
    const updateLightboxContent = function() {
        if (images.length === 0) return;
        
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxCaption = document.getElementById('lightboxCaption');
        const imageCounter = document.getElementById('imageCounter');
        const prevBtn = document.getElementById('prevImageBtn');
        const nextBtn = document.getElementById('nextImageBtn');
        
        const link = images[currentIndex];
        const img = link.querySelector('img');
        const caption = img ? (img.alt || 'Progress Photo') : 'Progress Photo';
        
        if (lightboxImage) lightboxImage.src = link.getAttribute('href');
        if (lightboxCaption) lightboxCaption.textContent = caption;
        if (imageCounter) imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
        
        // Enable/disable prev/next buttons based on position
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex === images.length - 1;
    };
    
    // Add click handlers to gallery images
    galleryLinks.forEach(function(link, index) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            currentIndex = index;
            updateLightboxContent();
            if (lightboxInstance) lightboxInstance.show();
        });
    });
    
    // Setup navigation button handlers
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentIndex > 0) {
                currentIndex--;
                updateLightboxContent();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            if (currentIndex < images.length - 1) {
                currentIndex++;
                updateLightboxContent();
            }
        });
    }
}

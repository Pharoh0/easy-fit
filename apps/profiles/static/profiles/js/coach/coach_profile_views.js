// Coach Profile Specific JavaScript
console.log("Coach Profile Page Loaded");

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();
    
    // Set up the image modal functionality
    setupImageModal();
    
    // Initialize gallery tabs if they exist
    setupGalleryTabs();
});

/**
 * Initialize Bootstrap tooltips
 */
function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**
 * Set up image modal with zoom and download functionality
 */
function setupImageModal() {
    // Select modal elements
    const modalEl = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    if (!modalEl || !modalImg) {
        console.error('Modal elements not found');
        return;
    }
    
    // Create the modal instance
    const modal = new bootstrap.Modal(modalEl);
    let currentZoom = 1;
    
    // Select all gallery items
    const galleryItems = document.querySelectorAll('.gallery-item');
    console.log('Found gallery items:', galleryItems.length);
    
    // Add click handler to all gallery items
    galleryItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default action
            
            // Get the image source
            const imgSrc = this.getAttribute('data-src') || 
                          (this.querySelector('img') ? this.querySelector('img').src : null);
            
            console.log('Gallery item clicked, image source:', imgSrc);
            
            if (imgSrc) {
                // Set image source
                modalImg.src = imgSrc;
                
                // Reset zoom
                currentZoom = 1;
                modalImg.style.transform = 'scale(1)';
                
                // Show the modal
                modal.show();
            }
        });
    });
    
    // Set up zoom controls
    const zoomInBtn = document.querySelector('.modal-zoom-in');
    const zoomOutBtn = document.querySelector('.modal-zoom-out');
    const downloadBtn = document.querySelector('.modal-download');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            currentZoom = Math.min(currentZoom + 0.25, 3);
            modalImg.style.transform = `scale(${currentZoom})`;
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            currentZoom = Math.max(currentZoom - 0.25, 0.5);
            modalImg.style.transform = `scale(${currentZoom})`;
        });
    }
    
    if (downloadBtn && modalImg) {
        downloadBtn.addEventListener('click', function() {
            if (modalImg.src) {
                const link = document.createElement('a');
                link.href = modalImg.src;
                link.download = 'eazy-fit-image-' + Date.now() + '.jpg';
                link.click();
            }
        });
    }
    
    // Reset modal when hidden
    modalEl.addEventListener('hidden.bs.modal', function() {
        modalImg.src = '';
    });
}

/**
 * Set up gallery tabs functionality
 */
function setupGalleryTabs() {
    const galleryTabs = document.getElementById('galleryTabs');
    
    if (!galleryTabs) return;
    
    // When a new tab is shown, trigger a resize event to fix any layout issues
    const tabLinks = galleryTabs.querySelectorAll('[data-bs-toggle="tab"]');
    
    tabLinks.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function() {
            window.dispatchEvent(new Event('resize'));
        });
    });
}
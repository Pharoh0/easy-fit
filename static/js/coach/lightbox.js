/**
 * Progress Photos Lightbox Manager
 * Handles lightbox functionality for progress photos with comparison and navigation
 */

class ProgressPhotosLightbox {
    constructor() {
        this.currentPhotoIndex = 0;
        this.photos = [];
        this.modalElement = document.getElementById('photoLightboxModal');
        this.isFullscreen = false;
        this.init();
    }

    init() {
        // Initialize modal if it exists
        if (!this.modalElement) {
            console.warn('Photo lightbox modal not found in DOM');
            return;
        }

        // Bind event listeners
        this.bindEvents();
    }

    bindEvents() {
        // Bind navigation buttons
        const prevBtn = document.getElementById('prevPhotoBtn');
        const nextBtn = document.getElementById('nextPhotoBtn');
        const closeBtn = document.getElementById('closeLightboxBtn');
        const downloadBtn = document.getElementById('downloadPhotoBtn');
        const expandBtn = document.getElementById('expandFullscreenBtn');

        // Main navigation buttons
        if (prevBtn) prevBtn.addEventListener('click', () => this.navigatePhotos('prev'));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigatePhotos('next'));
        if (closeBtn) closeBtn.addEventListener('click', this.closeModal.bind(this));
        if (downloadBtn) downloadBtn.addEventListener('click', this.downloadCurrentPhoto.bind(this));
        if (expandBtn) expandBtn.addEventListener('click', this.toggleFullscreen.bind(this));

        // Image overlay navigation buttons
        const prevOverlayBtn = document.getElementById('prevOverlayBtn');
        const nextOverlayBtn = document.getElementById('nextOverlayBtn');
        if (prevOverlayBtn) prevOverlayBtn.addEventListener('click', () => this.navigatePhotos('prev'));
        if (nextOverlayBtn) nextOverlayBtn.addEventListener('click', () => this.navigatePhotos('next'));

        // Mobile footer controls
        const mobilePrevBtn = document.getElementById('mobilePrevBtn');
        const mobileNextBtn = document.getElementById('mobileNextBtn');
        if (mobilePrevBtn) mobilePrevBtn.addEventListener('click', () => this.navigatePhotos('prev'));
        if (mobileNextBtn) mobileNextBtn.addEventListener('click', () => this.navigatePhotos('next'));

        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isModalOpen()) return;
            
            if (e.key === 'ArrowLeft') this.navigatePhotos('prev');
            else if (e.key === 'ArrowRight') this.navigatePhotos('next');
            else if (e.key === 'Escape') this.closeModal();
            else if (e.key === 'f') this.toggleFullscreen();
        });

        // Handle comparison select change
        const comparisonSelect = document.getElementById('comparisonSelect');
        if (comparisonSelect) {
            comparisonSelect.addEventListener('change', (e) => {
                this.updateComparisonView(e.target.value);
            });
        }
    }

    /**
     * Opens the lightbox with a collection of photos
     * @param {Array} photos - Array of photo objects with src, type, date, and metadata
     * @param {number} startIndex - Index of the photo to display first
     */
    openLightbox(photos, startIndex = 0) {
        if (!Array.isArray(photos) || photos.length === 0) {
            console.warn('No photos provided to lightbox');
            return;
        }

        this.photos = photos;
        this.currentPhotoIndex = Math.min(Math.max(0, startIndex), photos.length - 1);
        
        // Show the modal
        if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(this.modalElement);
            modal.show();
        } else {
            // Fallback for when bootstrap is not loaded
            this.modalElement.style.display = 'block';
            this.modalElement.classList.add('show');
        }
        
        // Display the current photo
        this.displayCurrentPhoto();
        this.updatePhotoCounter();
        
        // Update comparison options
        this.updateComparisonOptions();
    }

    /**
     * Navigate between photos
     * @param {string} direction - Direction to navigate ('prev' or 'next')
     */
    navigatePhotos(direction) {
        if (this.photos.length <= 1) return;
        
        if (direction === 'prev') {
            this.currentPhotoIndex = (this.currentPhotoIndex > 0) ? 
                this.currentPhotoIndex - 1 : this.photos.length - 1;
        } else {
            this.currentPhotoIndex = (this.currentPhotoIndex < this.photos.length - 1) ? 
                this.currentPhotoIndex + 1 : 0;
        }
        
        this.displayCurrentPhoto();
        this.updatePhotoCounter();
        
        // Reset comparison when changing photos
        const comparisonSelect = document.getElementById('comparisonSelect');
        if (comparisonSelect) comparisonSelect.value = '';
        
        // Reset comparison container
        this.resetComparisonView();
    }

    /**
     * Display the current photo in the lightbox
     */
    displayCurrentPhoto() {
        const photo = this.photos[this.currentPhotoIndex];
        if (!photo) return;
        
        const imageContainer = document.getElementById('lightboxImage');
        const mainContent = document.querySelector('.lightbox-main-content');
        const photoDateOverlay = document.querySelector('.photo-date-overlay');
        if (!imageContainer || !mainContent) return;
        
        // Show loading spinner
        mainContent.classList.add('loading');
        
        // Update main image with fade effect
        imageContainer.style.opacity = '0';
        
        // Update photo type badge in header
        const photoTypeBadge = document.querySelector('.photo-type-badge');
        if (photoTypeBadge && photo.type) {
            photoTypeBadge.textContent = photo.type;
        }
        
        // Update modal title
        const modalTitle = document.querySelector('#photoLightboxModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Progress Photo`;
        }
        
        setTimeout(() => {
            imageContainer.src = photo.src;
            imageContainer.onload = () => {
                // Hide loading spinner
                mainContent.classList.remove('loading');
                imageContainer.style.opacity = '1';
                
                // Update date overlay
                if (photoDateOverlay && photo.date) {
                    photoDateOverlay.textContent = this.formatDate(photo.date);
                    photoDateOverlay.style.opacity = '1';
                    setTimeout(() => {
                        photoDateOverlay.style.opacity = '0.7';
                    }, 2000);
                }
            };
            
            imageContainer.onerror = () => {
                // Hide loading spinner even on error
                mainContent.classList.remove('loading');
                imageContainer.style.opacity = '1';
                imageContainer.src = '/static/images/default-image.png'; // Fallback image
            };
        }, 300);
        
        // Update metadata
        this.updatePhotoMetadata(photo);
    }

    /**
     * Update the photo counter display
     */
    updatePhotoCounter() {
        // Update all counter elements
        const counterElements = document.querySelectorAll('.photo-counter');
        const counterText = `${this.currentPhotoIndex + 1} / ${this.photos.length}`;
        
        counterElements.forEach(el => {
            if (el) el.textContent = counterText;
        });
    }

    /**
     * Update the metadata display for the current photo
     * @param {Object} photo - The photo object with metadata
     */
    updatePhotoMetadata(photo) {
        // Update photo metadata in sidebar
        const dateEl = document.getElementById('photoDate');
        const typeEl = document.getElementById('photoType');
        const weightEl = document.getElementById('photoWeight');
        const notesEl = document.getElementById('photoNotes');
        
        if (dateEl && photo.date) dateEl.textContent = this.formatDate(photo.date);
        if (typeEl && photo.type) typeEl.textContent = photo.type;
        if (weightEl && photo.weight) weightEl.textContent = `${photo.weight} kg`;
        
        // Handle notes - show or hide based on existence
        if (notesEl) {
            if (photo.notes) {
                notesEl.textContent = photo.notes;
                notesEl.closest('.metadata-item').style.display = 'flex';
            } else {
                notesEl.closest('.metadata-item').style.display = 'none';
            }
        }
        
        // Update all places where this data might be displayed
        const allDateElements = document.querySelectorAll('.photo-date-value');
        allDateElements.forEach(el => {
            if (el && photo.date) el.textContent = this.formatDate(photo.date);
        });
    }

    /**
     * Update the comparison select options based on available photos
     */
    updateComparisonOptions() {
        const select = document.getElementById('comparisonSelect');
        if (!select) return;
        
        // Clear existing options except the placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Get current photo
        const currentPhoto = this.photos[this.currentPhotoIndex];
        if (!currentPhoto) return;
        
        // Add options for other photos of the same type but different dates
        this.photos.forEach((photo, index) => {
            if (index !== this.currentPhotoIndex && photo.type === currentPhoto.type) {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = this.formatDate(photo.date);
                select.appendChild(option);
            }
        });
        
        // Update thumbnails
        this.updateThumbnails();
    }

    /**
     * Update the comparison view
     * @param {string} comparePhotoIndex - Index of the photo to compare with
     */
    updateComparisonView(comparePhotoIndex) {
        if (!comparePhotoIndex) {
            this.resetComparisonView();
            return;
        }
        
        const comparePhoto = this.photos[comparePhotoIndex];
        const currentPhoto = this.photos[this.currentPhotoIndex];
        
        if (!comparePhoto || !currentPhoto) return;
        
        const comparisonContainer = document.getElementById('comparisonContainer');
        if (!comparisonContainer) return;
        
        comparisonContainer.innerHTML = '';
        comparisonContainer.classList.remove('empty');
        
        // Create side-by-side comparison with enhanced styling
        const comparisonHTML = `
            <div class="comparison-wrapper">
                <div class="comparison-item">
                    <div class="comparison-image-container">
                        <img src="${currentPhoto.src}" alt="Current" class="comparison-image">
                        <div class="comparison-label current">Current</div>
                    </div>
                    <div class="comparison-date">${this.formatDate(currentPhoto.date)}</div>
                    ${currentPhoto.weight ? `<div class="comparison-weight">${currentPhoto.weight} kg</div>` : ''}
                </div>
                <div class="comparison-item">
                    <div class="comparison-image-container">
                        <img src="${comparePhoto.src}" alt="Previous" class="comparison-image">
                        <div class="comparison-label previous">Previous</div>
                    </div>
                    <div class="comparison-date">${this.formatDate(comparePhoto.date)}</div>
                    ${comparePhoto.weight ? `<div class="comparison-weight">${comparePhoto.weight} kg</div>` : ''}
                </div>
            </div>
            <div class="comparison-actions">
                <button class="btn btn-sm btn-outline-light" onclick="window.progressPhotosLightbox.downloadComparisonView()"><i class="fas fa-download"></i> Download Comparison</button>
            </div>
        `;
        
        comparisonContainer.innerHTML = comparisonHTML;
        
        // Add animation effect
        setTimeout(() => {
            const items = comparisonContainer.querySelectorAll('.comparison-item');
            items.forEach(item => item.classList.add('show'));
        }, 100);
    }

    /**
     * Reset the comparison view to empty state
     */
    resetComparisonView() {
        const comparisonContainer = document.getElementById('comparisonContainer');
        if (!comparisonContainer) return;
        
        comparisonContainer.innerHTML = '<div class="empty-comparison-message"><i class="fas fa-image"></i><span>Select a photo to compare</span></div>';
        comparisonContainer.classList.add('empty');
    }

    /**
     * Update thumbnails in the sidebar
     * Note: Thumbnails section has been removed to simplify the UI
     */
    updateThumbnails() {
        // No-op since thumbnails section was removed
        return;
    }

    /**
     * Update the highlighting of thumbnails
     * Note: Thumbnails section has been removed to simplify the UI
     */
    updateThumbnailsHighlight() {
        // No-op since thumbnails section was removed
        return;
    }

    /**
     * Download the current photo
     */
    downloadCurrentPhoto() {
        const photo = this.photos[this.currentPhotoIndex];
        if (!photo) return;
        
        const link = document.createElement('a');
        link.href = photo.src;
        link.download = `progress-photo-${photo.type}-${this.formatDateForFilename(photo.date)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Check if the modal is currently open
     * @returns {boolean} True if modal is open
     */
    isModalOpen() {
        return this.modalElement && this.modalElement.classList.contains('show');
    }

    /**
     * Toggle fullscreen mode for the lightbox
     */
    toggleFullscreen() {
        const modalContent = this.modalElement.querySelector('.modal-content');
        const expandBtn = document.getElementById('expandFullscreenBtn');
        
        if (!this.isFullscreen) {
            // Enter fullscreen
            this.isFullscreen = true;
            modalContent.classList.add('fullscreen');
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-compress"></i>';
                expandBtn.setAttribute('title', 'Exit Fullscreen');
            }
            
            // Handle document-level fullscreen API if available
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            } else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            this.exitFullscreen();
        }
    }
    
    /**
     * Exit fullscreen mode
     */
    exitFullscreen() {
        if (!this.isFullscreen) return;
        
        const modalContent = this.modalElement.querySelector('.modal-content');
        const expandBtn = document.getElementById('expandFullscreenBtn');
        
        this.isFullscreen = false;
        modalContent.classList.remove('fullscreen');
        if (expandBtn) {
            expandBtn.innerHTML = '<i class="fas fa-expand"></i>';
            expandBtn.setAttribute('title', 'Fullscreen');
        }
        
        // Exit document-level fullscreen if active
        if (document.exitFullscreen) {
            if (document.fullscreenElement) document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            if (document.mozFullScreenElement) document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            if (document.webkitFullscreenElement) document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            if (document.msFullscreenElement) document.msExitFullscreen();
        }
    }
    
    /**
     * Download the current comparison view
     */
    downloadComparisonView() {
        const comparisonContainer = document.getElementById('comparisonContainer');
        if (!comparisonContainer) return;
        
        // Use html2canvas to capture the comparison as an image
        // Fallback to a basic message if html2canvas is not available
        if (typeof html2canvas === 'undefined') {
            alert('Download functionality requires html2canvas library');
            return;
        }
        
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'comparison-loading';
        loadingSpinner.innerHTML = '<div class="spinner-border text-light" role="status"><span class="visually-hidden">Loading...</span></div>';
        comparisonContainer.appendChild(loadingSpinner);
        
        html2canvas(comparisonContainer.querySelector('.comparison-wrapper')).then(canvas => {
            // Remove loading spinner
            comparisonContainer.removeChild(loadingSpinner);
            
            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.download = `comparison-${this.formatDateForFilename(new Date())}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error('Error generating comparison image:', err);
            comparisonContainer.removeChild(loadingSpinner);
            alert('Failed to generate comparison image');
        });
    }

    /**
     * Close the lightbox modal
     */
    closeModal() {
        // Exit fullscreen if active
        if (this.isFullscreen) {
            this.exitFullscreen();
        }
        
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(this.modalElement);
            if (modal) modal.hide();
        } else {
            // Fallback for when bootstrap is not loaded
            this.modalElement.style.display = 'none';
            this.modalElement.classList.remove('show');
        }
    }

    /**
     * Format a date for display
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format a date for use in filenames
     * @param {string} dateString - Date string to format
     * @returns {string} Formatted date for filenames
     */
    formatDateForFilename(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}

// Initialize the lightbox when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.progressPhotosLightbox = new ProgressPhotosLightbox();
    
    // Add event listeners for fullscreen change
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Handle fullscreen change events
    function handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || 
                          document.mozFullScreenElement || document.msFullscreenElement;
        
        // If browser fullscreen was exited but our state is still fullscreen, sync them
        if (!isFullscreen && window.progressPhotosLightbox.isFullscreen) {
            window.progressPhotosLightbox.exitFullscreen();
        }
    }
});

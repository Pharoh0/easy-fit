// Client Profile View JavaScript

/**
 * Global variables for body measurements
 */
let bodyParts = [];
let currentMeasurementId = null;
let bodyPartMeasurements = [];
let bodyMeasurementHistory = [];
let bodyDiagramLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var bootstrapTooltips = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    bootstrapTooltips.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize body measurements functionality if element exists
    if (document.getElementById('view-measurements-btn')) {
        initBodyMeasurements();
    }
    
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
}

// ======= BODY MEASUREMENTS FUNCTIONALITY ======= //

/**
 * Initialize body measurements functionality
 */
function initBodyMeasurements() {
    // Add event listener to measurements button
    const viewMeasurementsBtn = document.getElementById('view-measurements-btn');
    if (viewMeasurementsBtn) {
        viewMeasurementsBtn.addEventListener('click', function() {
            // Load and display measurements in modal
            loadAndDisplayMeasurements();
        });
    }
}

/**
 * Load and display body measurements
 */
async function loadAndDisplayMeasurements() {
    try {
        // Fetch latest measurements
        const response = await fetch('/api/v1/client-profile/enhanced-measurements/latest/', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Create a modal to show the measurements
        showBodyMeasurementsModal(data);
    } catch (error) {
        console.error('Error loading measurements:', error);
        utils.showToast('Failed to load body measurements. Please try again later.', 'danger');
    }
}

/**
 * Show body measurements modal
 */
function showBodyMeasurementsModal(measurement) {
    // Create modal if it doesn't exist already
    let modal = document.getElementById('bodyMeasurementsModal');
    if (!modal) {
        // Create modal element
        modal = document.createElement('div');
        modal.id = 'bodyMeasurementsModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('aria-labelledby', 'bodyMeasurementsModalLabel');
        modal.setAttribute('aria-hidden', 'true');
        
        // Modal HTML structure - more advanced with tabs for different measurement views
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="bodyMeasurementsModalLabel">Body Measurements</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="bodyMeasurementsModalBody">
                        <ul class="nav nav-tabs" id="measurementTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="latest-tab" data-bs-toggle="tab" data-bs-target="#latest-measurements" type="button" role="tab" aria-controls="latest-measurements" aria-selected="true">
                                    Latest Measurements
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="history-tab" data-bs-toggle="tab" data-bs-target="#measurement-history" type="button" role="tab" aria-controls="measurement-history" aria-selected="false">
                                    Measurement History
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="add-tab" data-bs-toggle="tab" data-bs-target="#add-measurement" type="button" role="tab" aria-controls="add-measurement" aria-selected="false">
                                    Add Measurement
                                </button>
                            </li>
                        </ul>
                        <div class="tab-content mt-3" id="measurementTabContent">
                            <div class="tab-pane fade show active" id="latest-measurements" role="tabpanel" aria-labelledby="latest-tab">
                                <div id="latest-measurements-content">
                                    <div class="text-center">
                                        <div class="spinner-border" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="measurement-history" role="tabpanel" aria-labelledby="history-tab">
                                <div class="row mb-3">
                                    <div class="col">
                                        <div class="input-group">
                                            <span class="input-group-text">Filter</span>
                                            <input type="text" id="measurements-filter" class="form-control" placeholder="Enter body part...">
                                            <button class="btn btn-primary" id="measurements-filter-btn">
                                                <i class="fas fa-search"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="col-auto">
                                        <select id="measurements-page-size" class="form-select">
                                            <option value="10">10 per page</option>
                                            <option value="25">25 per page</option>
                                            <option value="50">50 per page</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="table-responsive">
                                    <table id="measurements-history-table" class="table table-striped table-hover">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Body Part</th>
                                                <th>Measurement</th>
                                                <th>Unit</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="measurements-history-tbody">
                                            <tr>
                                                <td colspan="5" class="text-center">Loading measurements...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <div id="measurements-pagination-info">
                                        Page 1 of 1
                                    </div>
                                    <div>
                                        <button id="measurements-prev-page" class="btn btn-sm btn-outline-secondary" disabled>
                                            <i class="fas fa-arrow-left"></i> Previous
                                        </button>
                                        <button id="measurements-next-page" class="btn btn-sm btn-outline-secondary" disabled>
                                            Next <i class="fas fa-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="add-measurement" role="tabpanel" aria-labelledby="add-tab">
                                <form id="add-measurement-form">
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="measurement-date" class="form-label">Date</label>
                                            <input type="date" class="form-control" id="measurement-date" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="measurement-body-part" class="form-label">Body Part</label>
                                            <select class="form-select" id="measurement-body-part" required>
                                                <option value="" disabled selected>Select a body part</option>
                                                <!-- Body parts will be populated dynamically -->
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-md-6">
                                            <label for="measurement-value" class="form-label">Measurement</label>
                                            <input type="number" step="0.01" class="form-control" id="measurement-value" required>
                                        </div>
                                        <div class="col-md-6">
                                            <label for="measurement-unit" class="form-label">Unit</label>
                                            <select class="form-select" id="measurement-unit" required>
                                                <option value="cm">Centimeters (cm)</option>
                                                <option value="in">Inches (in)</option>
                                                <option value="kg">Kilograms (kg)</option>
                                                <option value="lb">Pounds (lb)</option>
                                                <option value="%">Percent (%)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="measurement-notes" class="form-label">Notes</label>
                                        <textarea class="form-control" id="measurement-notes" rows="3"></textarea>
                                    </div>
                                    <div class="d-grid">
                                        <button type="submit" class="btn btn-primary">Save Measurement</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <a href="#" class="btn btn-primary" id="viewFullMeasurementsBtn">
                            <i class="fas fa-external-link-alt"></i> View Full Measurements Page
                        </a>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Set up event listeners for the modal's interactive elements
        setupMeasurementModalEvents();
    }
    
    // Populate the modal with measurement data
    populateMeasurementData(measurement);
    
    // Initialize and show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

/**
 * Set up event listeners for the measurement modal's interactive elements
 */
function setupMeasurementModalEvents() {
    // Set up event listener for adding new measurement
    const addMeasurementForm = document.getElementById('add-measurement-form');
    if (addMeasurementForm) {
        addMeasurementForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMeasurement();
        });
    }
    
    // Set up event listeners for pagination buttons
    const prevPageBtn = document.getElementById('measurements-prev-page');
    const nextPageBtn = document.getElementById('measurements-next-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            loadPreviousPage();
        });
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            loadNextPage();
        });
    }
    
    // Set up filter button
    const filterBtn = document.getElementById('measurements-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            filterMeasurements();
        });
    }
    
    // Set up page size change
    const pageSizeSelect = document.getElementById('measurements-page-size');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            changePageSize();
        });
    }
    
    // Load body parts for dropdown
    loadBodyParts();
    
    // Set up history tab click event to load measurement history
    const historyTab = document.getElementById('history-tab');
    if (historyTab) {
        historyTab.addEventListener('click', function() {
            loadMeasurementHistory();
        });
    }
    
    // Set up full measurements page link
    const viewFullMeasurementsBtn = document.getElementById('viewFullMeasurementsBtn');
    if (viewFullMeasurementsBtn) {
        viewFullMeasurementsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Navigate to full measurements page (to be implemented)
            utils.showToast('Full measurements page will be implemented soon!', 'info');
        });
    }
}

/**
 * Populate the modal with measurement data
 * @param {Object} measurement - Latest measurement data from API
 */
function populateMeasurementData(measurement) {
    const latestContent = document.getElementById('latest-measurements-content');
    if (!latestContent) return;
    
    // Clear loading spinner
    latestContent.innerHTML = '';
    
    if (!measurement || !measurement.body_part_measurements || measurement.body_part_measurements.length === 0) {
        latestContent.innerHTML = '<div class="alert alert-info">No measurements found. Add your first measurement using the "Add Measurement" tab.</div>';
        return;
    }
    
    // Create table for latest measurements
    let tableHtml = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Body Part</th>
                        <th>Measurement</th>
                        <th>Unit</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add rows for each body part measurement
    measurement.body_part_measurements.forEach(partMeasurement => {
        const date = new Date(measurement.date_measured).toLocaleDateString();
        tableHtml += `
            <tr>
                <td>${partMeasurement.body_part.name}</td>
                <td>${partMeasurement.measurement_value}</td>
                <td>${partMeasurement.unit}</td>
                <td>${date}</td>
            </tr>
        `;
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="mt-3">
            <p><strong>Date Measured:</strong> ${new Date(measurement.date_measured).toLocaleDateString()}</p>
            <p><strong>Notes:</strong> ${measurement.notes || 'No notes'}</p>
        </div>
    `;
    
    latestContent.innerHTML = tableHtml;
}

/**
 * Load body parts for the dropdown select
 */
async function loadBodyParts() {
    try {
        const response = await fetch('/api/v1/client-profile/body-parts/', {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const bodyParts = await response.json();
        
        const bodyPartSelect = document.getElementById('measurement-body-part');
        if (!bodyPartSelect) return;
        
        // Clear existing options except for the default one
        while (bodyPartSelect.options.length > 1) {
            bodyPartSelect.remove(1);
        }
        
        // Add body parts to the dropdown
        bodyParts.results.forEach(part => {
            const option = document.createElement('option');
            option.value = part.id;
            option.textContent = part.name;
            bodyPartSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading body parts:', error);
    }
}

/**
 * Load measurement history with pagination
 */
async function loadMeasurementHistory(page = 1, pageSize = 10, filter = '') {
    try {
        let url = `/api/v1/client-profile/enhanced-measurements/?page=${page}&page_size=${pageSize}`;
        if (filter) {
            url += `&body_part__name__icontains=${encodeURIComponent(filter)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        // Update the history table
        updateHistoryTable(data);
        
        // Update pagination
        updatePagination(data, page);
    } catch (error) {
        console.error('Error loading measurement history:', error);
        const tbody = document.getElementById('measurements-history-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading measurements: ${error.message}</td></tr>`;
        }
    }
}

/**
 * Update the history table with data
 */
function updateHistoryTable(data) {
    const tbody = document.getElementById('measurements-history-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data.results || data.results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No measurements found</td></tr>';
        return;
    }
    
    // Add rows for each measurement
    data.results.forEach(measurement => {
        measurement.body_part_measurements.forEach(partMeasurement => {
            const tr = document.createElement('tr');
            
            // Format date
            const date = new Date(measurement.date_measured).toLocaleDateString();
            
            tr.innerHTML = `
                <td>${date}</td>
                <td>${partMeasurement.body_part.name}</td>
                <td>${partMeasurement.measurement_value}</td>
                <td>${partMeasurement.unit}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-measurement" data-id="${measurement.id}" data-part-id="${partMeasurement.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-measurement" data-id="${measurement.id}" data-part-id="${partMeasurement.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners for edit and delete buttons
            const editBtn = tr.querySelector('.edit-measurement');
            const deleteBtn = tr.querySelector('.delete-measurement');
            
            editBtn.addEventListener('click', function() {
                editMeasurement(measurement.id, partMeasurement.id);
            });
            
            deleteBtn.addEventListener('click', function() {
                deleteMeasurement(measurement.id, partMeasurement.id);
            });
            
            tbody.appendChild(tr);
        });
    });
}

/**
 * Update pagination controls
 */
function updatePagination(data, currentPage) {
    const paginationInfo = document.getElementById('measurements-pagination-info');
    const prevPageBtn = document.getElementById('measurements-prev-page');
    const nextPageBtn = document.getElementById('measurements-next-page');
    
    if (!paginationInfo || !prevPageBtn || !nextPageBtn) return;
    
    // Update pagination info text
    const totalPages = Math.ceil(data.count / data.results.length) || 1;
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update button states
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Store current page for pagination functions
    prevPageBtn.dataset.page = currentPage - 1;
    nextPageBtn.dataset.page = currentPage + 1;
}

/**
 * Load previous page of measurements
 */
function loadPreviousPage() {
    const prevPageBtn = document.getElementById('measurements-prev-page');
    if (!prevPageBtn || prevPageBtn.disabled) return;
    
    const page = parseInt(prevPageBtn.dataset.page) || 1;
    const pageSize = getSelectedPageSize();
    const filter = getFilter();
    
    loadMeasurementHistory(page, pageSize, filter);
}

/**
 * Load next page of measurements
 */
function loadNextPage() {
    const nextPageBtn = document.getElementById('measurements-next-page');
    if (!nextPageBtn || nextPageBtn.disabled) return;
    
    const page = parseInt(nextPageBtn.dataset.page) || 2;
    const pageSize = getSelectedPageSize();
    const filter = getFilter();
    
    loadMeasurementHistory(page, pageSize, filter);
}

/**
 * Get selected page size from dropdown
 */
function getSelectedPageSize() {
    const pageSizeSelect = document.getElementById('measurements-page-size');
    return pageSizeSelect ? parseInt(pageSizeSelect.value) : 10;
}

/**
 * Get filter value
 */
function getFilter() {
    const filterInput = document.getElementById('measurements-filter');
    return filterInput ? filterInput.value.trim() : '';
}

/**
 * Filter measurements based on input
 */
function filterMeasurements() {
    const filter = getFilter();
    const pageSize = getSelectedPageSize();
    loadMeasurementHistory(1, pageSize, filter);
}

/**
 * Change page size
 */
function changePageSize() {
    const pageSize = getSelectedPageSize();
    const filter = getFilter();
    loadMeasurementHistory(1, pageSize, filter);
}

// Measurement functions are now handled by measurements.js
// Remove duplicate implementations to avoid conflicts

/**
 * Helper function to get auth headers for API requests
 */
function getAuthHeaders() {
    // Get JWT token from localStorage or cookie
    const token = localStorage.getItem('token') || getCookie('token');
    
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Helper function to get cookie value by name
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Add lightbox CSS
function addLightboxStyles() {
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

/**
 * Client Measurements JavaScript - API Driven Implementation
 * Handles client-side functionality for managing measurements
 */

// Global variables
let measurementsData = [];
let progressChart = null;
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let totalCount = 0;
let currentSearch = '';
let currentOrdering = '-date';

/**
 * Initialize page on document load
 */
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

/**
 * Initialize the measurements page
 */
function initializePage() {
    // Set up UI components
    setupUIComponents();
    
    // Load measurements from API
    loadMeasurements();
    
    // Initialize chart if canvas exists
    const chartCanvas = document.getElementById('measurement-chart');
    if (chartCanvas) {
        progressChart = initChart(chartCanvas);
    }
    
    // Add measurement button
    const addMeasurementBtn = document.getElementById('add-measurement-btn');
    if (addMeasurementBtn) {
        addMeasurementBtn.addEventListener('click', showAddMeasurementModal);
    }
    
    // Set up BMI calculation in the form
    setupBmiCalculation();
}

/**
 * Set up UI components
 */
function setupUIComponents() {
    // Set today's date as default for new measurements
    initializeDatePicker();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up BMI calculation
    setupBmiCalculation();
}

/**
 * Initialize date picker with today's date
 */
function initializeDatePicker() {
    const dateInput = document.getElementById('measurement-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.max = today; // Prevent future dates
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Set up form validation
    const form = document.getElementById('add-measurement-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (form.checkValidity()) {
                saveMeasurement();
            }
            form.classList.add('was-validated');
        });
    }
    
    // Add measurement button
    const addMeasurementBtn = document.getElementById('add-measurement-btn');
    if (addMeasurementBtn) {
        addMeasurementBtn.addEventListener('click', function() {
            // Reset form to create mode
            const form = document.getElementById('add-measurement-form');
            if (form) {
                form.setAttribute('data-measurement-id', '');
                form.reset();
                form.classList.remove('was-validated');
            }
            
            // Update modal title and button text
            const modalTitle = document.querySelector('#addMeasurementModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Add New Measurement';
            }
            
            const saveBtn = document.getElementById('save-measurement-btn');
            if (saveBtn) {
                saveBtn.textContent = 'Save';
            }
            
            const modalElement = document.getElementById('addMeasurementModal');
            const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
            
            // Add event listener for modal cleanup
            modalElement.addEventListener('hidden.bs.modal', function() {
                // Remove backdrop if it exists
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.remove();
                }
                // Ensure body classes are cleaned up
                document.body.classList.remove('modal-open');
                document.body.style.removeProperty('overflow');
                document.body.style.removeProperty('padding-right');
            }, { once: true });
            
            modal.show();
        });
    }
    
    // Save measurement button
    const saveMeasurementBtn = document.getElementById('save-measurement-btn');
    if (saveMeasurementBtn) {
        saveMeasurementBtn.addEventListener('click', saveMeasurement);
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-measurements');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchValue = this.value.trim();
                loadMeasurements(1, searchValue, currentOrdering);
            }, 500); // Debounce search by 500ms
        });
    }
    
    // Sort functionality
    const sortSelect = document.getElementById('sort-measurements');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const ordering = this.value;
            loadMeasurements(1, currentSearch, ordering);
        });
    }
    
    // Page size functionality
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            loadMeasurements(1, currentSearch, currentOrdering);
        });
    }
    
    // Compare measurements button
    const compareBtn = document.getElementById('compare-measurements-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', function() {
            openComparisonModal();
        });
    }
    
    // Comparison modal event listeners
    const compareSelect1 = document.getElementById('compare-measurement-1');
    const compareSelect2 = document.getElementById('compare-measurement-2');
    
    if (compareSelect1 && compareSelect2) {
        compareSelect1.addEventListener('change', updateComparison);
        compareSelect2.addEventListener('change', updateComparison);
    }
    
    // Chart metric buttons
    const metricButtons = document.querySelectorAll('[data-metric]');
    metricButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            metricButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update chart with selected metric
            const metric = this.getAttribute('data-metric');
            updateChartMetric(metric);
        });
    });
    
    // Add measurement button
    const addBtn = document.getElementById('add-measurement-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showAddMeasurementModal);
    }
    
    // Set up action button listeners
    setupMeasurementActionListeners();
}

/**
 * Set up listeners for measurement action buttons
 */
function setupMeasurementActionListeners() {
    // View measurement
    document.querySelectorAll('.view-measurement').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            viewMeasurement(id);
        });
    });
    
    // Edit measurement
    document.querySelectorAll('.edit-measurement').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            editMeasurement(id);
        });
    });
    
    // Delete measurement
    document.querySelectorAll('.delete-measurement').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            deleteMeasurement(id);
        });
    });
}

/**
 * Show the add measurement modal
 */
function showAddMeasurementModal() {
    const modalElement = document.getElementById('addMeasurementModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    const form = document.getElementById('add-measurement-form');
    
    if (form) {
        form.reset();
        form.classList.remove('was-validated');
        
        // Reset date to today
        const dateInput = document.getElementById('measurement-date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }
    
    // Add event listener for modal cleanup
    modalElement.addEventListener('hidden.bs.modal', function() {
        // Remove backdrop if it exists
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        // Ensure body classes are cleaned up
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }, { once: true });
    
    modal.show();
}

/**
 * Setup BMI calculation event listeners
 */
function setupBmiCalculation() {
    const weightInput = document.getElementById('measurement-weight');
    const heightInput = document.getElementById('measurement-height');
    const calculateBmiBtn = document.getElementById('calculate-bmi');
    
    // Auto-calculate BMI when weight or height changes
    if (weightInput) {
        weightInput.addEventListener('input', calculateBmi);
    }
    
    if (heightInput) {
        heightInput.addEventListener('input', calculateBmi);
    }
    
    // Manual calculation with button
    if (calculateBmiBtn) {
        calculateBmiBtn.addEventListener('click', calculateBmi);
    }
}

/**
 * Calculate and display BMI
 */
function calculateBmi() {
    const weightInput = document.getElementById('measurement-weight');
    const heightInput = document.getElementById('measurement-height');
    const bmiInput = document.getElementById('measurement-bmi');
    const bmiFeedback = document.getElementById('bmi-feedback');
    
    if (!weightInput || !heightInput || !bmiInput) return;
    
    const weight = parseFloat(weightInput.value);
    const height = parseFloat(heightInput.value) / 100; // Convert cm to m
    
    if (weight && height) {
        const bmi = (weight / (height * height)).toFixed(1);
        bmiInput.value = bmi;
        
        // Add BMI category feedback if element exists
        if (bmiFeedback) {
            let category = '';
            let colorClass = '';
            
            if (bmi < 18.5) {
                category = 'Underweight';
                colorClass = 'text-info';
            } else if (bmi < 25) {
                category = 'Normal weight';
                colorClass = 'text-success';
            } else if (bmi < 30) {
                category = 'Overweight';
                colorClass = 'text-warning';
            } else {
                category = 'Obese';
                colorClass = 'text-danger';
            }
            
            bmiFeedback.innerHTML = `BMI: <strong class="${colorClass}">${bmi}</strong> (${category})`;
        }
    } else {
        bmiInput.value = '';
        if (bmiFeedback) bmiFeedback.textContent = '';
    }
}

/**
 * Save a new measurement or update existing one
 */
async function saveMeasurement() {
    const form = document.getElementById('add-measurement-form');
    if (!form || !form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    const saveBtn = document.getElementById('save-measurement-btn');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : 'Save';
    
    try {
        // Show loading state
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        }
        
        // Gather form data (now returns FormData)
        const formData = getFormData();
        
        // Check if we're in update mode
        const measurementId = form.getAttribute('data-measurement-id');
        const isUpdateMode = measurementId && measurementId !== '';
        
        console.log('Save measurement - Update mode:', isUpdateMode, 'Measurement ID:', measurementId);
        
        // Determine URL and method based on whether we're updating or creating
        const url = isUpdateMode 
            ? `/profiles/api/v1/client-measurements/${measurementId}/`
            : '/profiles/api/v1/client-measurements/';
        const method = isUpdateMode ? 'PUT' : 'POST';
        
        console.log(`${method} request to ${url}`);
        
        // We need to use direct fetch for FormData uploads instead of fetchAPI
        const response = await fetch(url, {
            method: method,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Failed to ${isUpdateMode ? 'update' : 'save'} measurement`);
        }
        
        const result = await response.json();
        
        if (!result) {
            throw new Error(`Failed to ${isUpdateMode ? 'update' : 'save'} measurement`);
        }
        
        // Show success message
        showSuccess(`Measurement ${isUpdateMode ? 'updated' : 'saved'} successfully`);
        
        // Close modal and refresh data
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMeasurementModal'));
        if (modal) modal.hide();
        
        // Reset update mode
        form.setAttribute('data-measurement-id', '');
        
        // Reload measurements
        await loadMeasurements();
        
    } catch (error) {
        console.error('Error saving/updating measurement:', error);
        showError(error.message || 'An error occurred while saving the measurement');
    } finally {
        // Reset button state
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    }
}

/**
 * Get form data for saving a measurement
 */
function getFormData() {
    // Create FormData object to handle file uploads
    const formData = new FormData();
    
    // Basic information
    const dateInput = document.getElementById('measurement-date');
    const weightInput = document.getElementById('measurement-weight');
    const heightInput = document.getElementById('measurement-height');
    
    if (dateInput) formData.append('date', dateInput.value);
    if (weightInput) formData.append('weight', weightInput.value);
    if (heightInput) formData.append('height', heightInput.value);
    
    // Body composition
    const bodyFatInput = document.getElementById('measurement-body-fat');
    const muscleMassInput = document.getElementById('measurement-muscle-mass');
    const waterPercentageInput = document.getElementById('measurement-water-percentage');
    const boneMassInput = document.getElementById('measurement-bone-mass');
    const visceralFatInput = document.getElementById('measurement-visceral-fat');
    const metabolicAgeInput = document.getElementById('measurement-metabolic-age');
    
    if (bodyFatInput && bodyFatInput.value) formData.append('body_fat_percentage', bodyFatInput.value);
    if (muscleMassInput && muscleMassInput.value) formData.append('muscle_mass', muscleMassInput.value);
    if (waterPercentageInput && waterPercentageInput.value) formData.append('body_water_percentage', waterPercentageInput.value);
    if (boneMassInput && boneMassInput.value) formData.append('bone_mass', boneMassInput.value);
    if (visceralFatInput && visceralFatInput.value) formData.append('visceral_fat', visceralFatInput.value);
    if (metabolicAgeInput && metabolicAgeInput.value) formData.append('metabolic_age', metabolicAgeInput.value);
    
    // Body measurements
    const neckInput = document.getElementById('measurement-neck');
    const shouldersInput = document.getElementById('measurement-shoulders');
    const chestInput = document.getElementById('measurement-chest');
    const waistInput = document.getElementById('measurement-waist');
    const hipsInput = document.getElementById('measurement-hips');
    const upperArmsInput = document.getElementById('measurement-upper-arms');
    const forearmsInput = document.getElementById('measurement-forearms');
    const thighsInput = document.getElementById('measurement-thighs');
    const calvesInput = document.getElementById('measurement-calves');
    
    if (neckInput && neckInput.value) formData.append('neck', neckInput.value);
    if (shouldersInput && shouldersInput.value) formData.append('shoulders', shouldersInput.value);
    if (chestInput && chestInput.value) formData.append('chest', chestInput.value);
    if (waistInput && waistInput.value) formData.append('waist', waistInput.value);
    if (hipsInput && hipsInput.value) formData.append('hips', hipsInput.value);
    if (upperArmsInput && upperArmsInput.value) formData.append('upper_arms', upperArmsInput.value);
    if (forearmsInput && forearmsInput.value) formData.append('forearms', forearmsInput.value);
    if (thighsInput && thighsInput.value) formData.append('thighs', thighsInput.value);
    if (calvesInput && calvesInput.value) formData.append('calves', calvesInput.value);
    
    // Photo uploads
    const frontPhotoInput = document.getElementById('measurement-front-photo');
    const sidePhotoInput = document.getElementById('measurement-side-photo');
    const backPhotoInput = document.getElementById('measurement-back-photo');
    
    if (frontPhotoInput && frontPhotoInput.files.length > 0) {
        formData.append('front_photo', frontPhotoInput.files[0]);
    }
    
    if (sidePhotoInput && sidePhotoInput.files.length > 0) {
        formData.append('side_photo', sidePhotoInput.files[0]);
    }
    
    if (backPhotoInput && backPhotoInput.files.length > 0) {
        formData.append('back_photo', backPhotoInput.files[0]);
    }
    
    // Notes
    const notesInput = document.getElementById('measurement-notes');
    if (notesInput && notesInput.value) formData.append('notes', notesInput.value);
    
    // Add client ID if available
    const clientId = document.body.getAttribute('data-client-id');
    if (clientId) formData.append('client', clientId);
    
    return formData;
}

/**
 * Load measurements from the API with pagination support
 */
async function loadMeasurements(page = 1, search = '', ordering = '-date') {
    try {
        showLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams({
            page: page,
            page_size: pageSize,
            ordering: ordering
        });
        
        if (search) {
            params.append('search', search);
        }
        
        // Use fetchAPI utility to ensure authentication headers are included
        const data = await fetchAPI(`client-measurements/?${params.toString()}`);
        if (!data) {
            throw new Error('Failed to load measurements');
        }
        
        // Update pagination state
        currentPage = page;
        currentSearch = search;
        currentOrdering = ordering;
        totalCount = data.count || 0;
        totalPages = Math.ceil(totalCount / pageSize);
        
        // Store results array (paginated API returns {count, next, previous, results})
        measurementsData = data.results || data;
        
        displayMeasurements(measurementsData);
        updatePaginationControls();
        
        // Update the Latest Measurements section (use first item if available)
        updateLatestMeasurements(measurementsData);
        
        // Update chart if it exists
        if (progressChart) {
            updateChart(measurementsData);
        }
        
    } catch (error) {
        console.error('Error loading measurements:', error);
        showError('Failed to load measurements. Please try again.');
        displayEmptyState();
    } finally {
        showLoading(false);
    }
}

/**
 * Show or hide loading state
 */
function showLoading(show) {
    const loadingElement = document.getElementById('measurements-loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
}

/**
 * Display empty state when no measurements are found
 */
function displayEmptyState() {
    const tableBody = document.getElementById('measurements-table-body');
    const noMeasurementsDiv = document.getElementById('no-measurements');
    const paginationContainer = document.getElementById('pagination-container');
    
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    if (noMeasurementsDiv) {
        noMeasurementsDiv.style.display = 'block';
    }
    
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

/**
 * Update pagination controls based on current state
 */
function updatePaginationControls() {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('pagination-info');
    const paginationControls = document.getElementById('pagination-controls');
    const noMeasurementsDiv = document.getElementById('no-measurements');
    
    if (!paginationContainer || !paginationInfo || !paginationControls) {
        return;
    }
    
    // Hide empty state if we have data
    if (noMeasurementsDiv && totalCount > 0) {
        noMeasurementsDiv.style.display = 'none';
    }
    
    // Show pagination if we have data
    if (totalCount > 0) {
        paginationContainer.style.display = 'flex';
        
        // Update info text
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalCount);
        paginationInfo.textContent = `Showing ${startItem} - ${endItem} of ${totalCount} measurements`;
        
        // Generate pagination buttons
        let paginationHTML = '';
        
        // Previous button
        const prevDisabled = currentPage <= 1 ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" onclick="changePage(${currentPage - 1})" ${prevDisabled ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>`;
        
        // Page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page and ellipsis
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(1)">1</a></li>`;
            if (startPage > 2) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<li class="page-item ${activeClass}"><a class="page-link" href="#" onclick="changePage(${i})">${i}</a></li>`;
        }
        
        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${totalPages})">${totalPages}</a></li>`;
        }
        
        // Next button
        const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" onclick="changePage(${currentPage + 1})" ${nextDisabled ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>`;
        
        paginationControls.innerHTML = paginationHTML;
    } else {
        paginationContainer.style.display = 'none';
    }
}

/**
 * Change to a specific page
 */
function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    loadMeasurements(page, currentSearch, currentOrdering);
}

/**
 * Display measurements in the table
 */
function displayMeasurements(measurements) {
    const tableBody = document.getElementById('measurements-table-body');
    const noMeasurementsDiv = document.getElementById('no-measurements');
    
    if (!tableBody) return;
    
    // Hide empty state
    if (noMeasurementsDiv) {
        noMeasurementsDiv.style.display = 'none';
    }
    
    if (!measurements || measurements.length === 0) {
        displayEmptyState();
        return;
    }
    
    // Use measurements as returned by API (already sorted by backend)
    let html = '';
    measurements.forEach(measurement => {
        const bmi = calculateBmiFromMeasurement(measurement);
        
        // Determine BMI class for color-coding
        let bmiClass = '';
        if (bmi) {
            if (bmi < 18.5) bmiClass = 'text-info';
            else if (bmi < 25) bmiClass = 'text-success';
            else if (bmi < 30) bmiClass = 'text-warning';
            else bmiClass = 'text-danger';
        }
        
        html += `
            <tr data-id="${measurement.id}">
                <td><span class="fw-medium">${formatDate(measurement.date)}</span></td>
                <td>${formatWithUnit(measurement.weight, ' kg')}</td>
                <td>${formatWithUnit(measurement.height, ' cm')}</td>
                <td><span class="${bmiClass}">${bmi || '-'}</span></td>
                <td>${formatWithUnit(measurement.body_fat_percentage, '%')}</td>
                <td>${formatWithUnit(measurement.muscle_mass, ' kg')}</td>
                <td>${formatWithUnit(measurement.body_water_percentage, '%')}</td>
                <td>${formatWithUnit(measurement.bone_mass, ' kg')}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-sm btn-primary view-measurement" data-id="${measurement.id}" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary edit-measurement" data-id="${measurement.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger delete-measurement" data-id="${measurement.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    });
    
    tableBody.innerHTML = html;
    
    // Set up action buttons
    setupMeasurementActionListeners();
}

/**
 * View a measurement's details
 */
function viewMeasurement(measurementId) {
    try {
        // Find measurement in our data
        const measurement = measurementsData.find(m => m.id.toString() === measurementId.toString());
        if (!measurement) {
            throw new Error('Measurement not found');
        }
        
        // Get modal elements
        const modalBody = document.getElementById('measurement-modal-body');
        if (!modalBody) return;
        
        // Show loading state
        modalBody.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('measurementModal'));
        modal.show();
        
        // Determine BMI and BMI class
        const bmi = calculateBmiFromMeasurement(measurement);
        let bmiClass = '';
        let bmiCategory = '';
        
        if (bmi) {
            if (bmi < 18.5) {
                bmiClass = 'text-info';
                bmiCategory = 'Underweight';
            } else if (bmi < 25) {
                bmiClass = 'text-success';
                bmiCategory = 'Normal weight';
            } else if (bmi < 30) {
                bmiClass = 'text-warning';
                bmiCategory = 'Overweight';
            } else {
                bmiClass = 'text-danger';
                bmiCategory = 'Obese';
            }
        }
        
        // Create HTML for measurement details
        let html = `
            <div class="row">
                <div class="col-12 mb-4 text-center">
                    <h5 class="fw-bold">Measurements on ${formatDate(measurement.date)}</h5>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h6 class="mb-0">Basic Information</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6"><strong>Weight:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.weight, ' kg')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Height:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.height, ' cm')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>BMI:</strong></div>
                                <div class="col-6"><span class="${bmiClass}">${bmi || '-'} ${bmi ? `(${bmiCategory})` : ''}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h6 class="mb-0">Body Composition</h6>
                        </div>
                        <div class="card-body">
                            <div class="row mb-2">
                                <div class="col-6"><strong>Body Fat:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.body_fat_percentage, '%')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Muscle Mass:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.muscle_mass, ' kg')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Body Water:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.body_water_percentage, '%')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Bone Mass:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.bone_mass, ' kg')}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Visceral Fat:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.visceral_fat)}</div>
                            </div>
                            <div class="row mb-2">
                                <div class="col-6"><strong>Metabolic Age:</strong></div>
                                <div class="col-6">${formatWithUnit(measurement.metabolic_age)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <div class="card mb-4">
                        <div class="card-header bg-light">
                            <h6 class="mb-0">Body Measurements (cm)</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Neck:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.neck, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Shoulders:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.shoulders, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Chest:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.chest, ' cm')}</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Waist:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.waist, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Hips:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.hips, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Upper Arms:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.upper_arms, ' cm') || formatWithUnit(measurement.arms, ' cm')}</div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Forearms:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.forearms, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Thighs:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.thighs, ' cm')}</div>
                                    </div>
                                    <div class="row mb-2">
                                        <div class="col-6"><strong>Calves:</strong></div>
                                        <div class="col-6">${formatWithUnit(measurement.calves, ' cm')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add photos if available
        if (measurement.front_photo || measurement.side_photo || measurement.back_photo) {
            html += `
                <div class="row">
                    <div class="col-12">
                        <div class="card mb-4">
                            <div class="card-header bg-light">
                                <h6 class="mb-0">Progress Photos</h6>
                            </div>
                            <div class="card-body">
                                <div class="row">
            `;
            
            if (measurement.front_photo) {
                html += `
                    <div class="col-md-4 mb-3 text-center">
                        <h6>Front</h6>
                        <img src="${measurement.front_photo}" class="img-fluid rounded" alt="Front view">
                    </div>
                `;
            }
            
            if (measurement.side_photo) {
                html += `
                    <div class="col-md-4 mb-3 text-center">
                        <h6>Side</h6>
                        <img src="${measurement.side_photo}" class="img-fluid rounded" alt="Side view">
                    </div>
                `;
            }
            
            if (measurement.back_photo) {
                html += `
                    <div class="col-md-4 mb-3 text-center">
                        <h6>Back</h6>
                        <img src="${measurement.back_photo}" class="img-fluid rounded" alt="Back view">
                    </div>
                `;
            }
            
            html += `
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add notes if available
        if (measurement.notes) {
            html += `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header bg-light">
                                <h6 class="mb-0">Notes</h6>
                            </div>
                            <div class="card-body">
                                <p>${measurement.notes}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        modalBody.innerHTML = html;
    } catch (error) {
        console.error('Error viewing measurement:', error);
        showError(error.message || 'Failed to load measurement details');
    }
}

/**
 * Edit a measurement
 */
function editMeasurement(measurementId) {
    try {
        // Find measurement in our data
        const measurement = measurementsData.find(m => m.id.toString() === measurementId.toString());
        if (!measurement) {
            throw new Error('Measurement not found');
        }
        
        console.log('Editing measurement:', measurement);
        
        // Get form and show modal
        const form = document.getElementById('add-measurement-form');
        if (!form) return;
        
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        
        // Set form in update mode - store the measurement ID
        form.setAttribute('data-measurement-id', measurementId);
        
        // Update modal title to indicate edit mode
        const modalTitle = document.querySelector('#addMeasurementModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Edit Measurement';
        }
        
        // Update save button text
        const saveBtn = document.getElementById('save-measurement-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Update';
        }
        
        // Populate form with measurement data
        // Basic information
        if (measurement.date) document.getElementById('measurement-date').value = measurement.date;
        if (measurement.weight) document.getElementById('measurement-weight').value = measurement.weight;
        if (measurement.height) document.getElementById('measurement-height').value = measurement.height;
        
        // Calculate BMI
        calculateBmi();
        
        // Body composition
        if (measurement.body_fat_percentage) document.getElementById('measurement-body-fat').value = measurement.body_fat_percentage;
        if (measurement.muscle_mass) document.getElementById('measurement-muscle-mass').value = measurement.muscle_mass;
        if (measurement.body_water_percentage) document.getElementById('measurement-water-percentage').value = measurement.body_water_percentage;
        if (measurement.bone_mass) document.getElementById('measurement-bone-mass').value = measurement.bone_mass;
        if (measurement.visceral_fat) document.getElementById('measurement-visceral-fat').value = measurement.visceral_fat;
        if (measurement.metabolic_age) document.getElementById('measurement-metabolic-age').value = measurement.metabolic_age;
        
        // Body measurements
        if (measurement.neck) document.getElementById('measurement-neck').value = measurement.neck;
        if (measurement.shoulders) document.getElementById('measurement-shoulders').value = measurement.shoulders;
        if (measurement.chest) document.getElementById('measurement-chest').value = measurement.chest;
        if (measurement.waist) document.getElementById('measurement-waist').value = measurement.waist;
        if (measurement.hips) document.getElementById('measurement-hips').value = measurement.hips;
        if (measurement.upper_arms) document.getElementById('measurement-upper-arms').value = measurement.upper_arms;
        if (measurement.forearms) document.getElementById('measurement-forearms').value = measurement.forearms;
        if (measurement.thighs) document.getElementById('measurement-thighs').value = measurement.thighs;
        if (measurement.calves) document.getElementById('measurement-calves').value = measurement.calves;
        
        // Notes
        if (measurement.notes) document.getElementById('measurement-notes').value = measurement.notes;
        
        // Show modal with proper cleanup
        const modalElement = document.getElementById('addMeasurementModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        
        // Add event listener for modal cleanup
        modalElement.addEventListener('hidden.bs.modal', function() {
            // Remove backdrop if it exists
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            // Ensure body classes are cleaned up
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
        }, { once: true });
        
        modal.show();
    } catch (error) {
        console.error('Error editing measurement:', error);
        showError(error.message || 'Failed to load measurement for editing');
    }
}

/**
 * Delete a measurement
 */
async function deleteMeasurement(measurementId) {
    const confirmed = await utils.confirm({ title: 'Delete Measurement', message: 'Are you sure you want to delete this measurement?', confirmText: 'Delete', variant: 'danger' });
    if (!confirmed) {
        return;
    }
    
    try {
        showLoading(true);
        
        // Use fetchAPI utility to ensure authentication headers are included
        const result = await fetchAPI(`client-measurements/${measurementId}/`, 'DELETE');
        
        // For DELETE operations, even an empty result is fine as long as no error was thrown
        
        // Show success message
        showSuccess('Measurement deleted successfully');
        
        // Reload measurements
        await loadMeasurements();
        
    } catch (error) {
        console.error('Error deleting measurement:', error);
        showError(error.message || 'An error occurred while deleting the measurement');
    } finally {
        showLoading(false);
    }
}

/**
 * Open comparison modal and populate with measurements
 */
function openComparisonModal() {
    try {
        // Check if we have measurements data
        if (!measurementsData || measurementsData.length < 2) {
            showError('You need at least 2 measurements to compare. Please add more measurements first.');
            return;
        }
        
        // Populate comparison dropdowns
        populateComparisonDropdowns();
        
        // Reset comparison results
        resetComparisonResults();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('compareMeasurementsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error opening comparison modal:', error);
        showError('Failed to open comparison modal');
    }
}

/**
 * Populate comparison dropdowns with measurements
 */
function populateComparisonDropdowns() {
    const select1 = document.getElementById('compare-measurement-1');
    const select2 = document.getElementById('compare-measurement-2');
    
    if (!select1 || !select2 || !measurementsData) return;
    
    // Sort measurements by date (newest first)
    const sortedMeasurements = [...measurementsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Clear existing options (except the first placeholder)
    select1.innerHTML = '<option value="" selected disabled>Select first measurement</option>';
    select2.innerHTML = '<option value="" selected disabled>Select second measurement</option>';
    
    // Add measurement options
    sortedMeasurements.forEach(measurement => {
        const option1 = document.createElement('option');
        const option2 = document.createElement('option');
        
        const optionText = `${formatDate(measurement.date)} - ${formatWithUnit(measurement.weight, ' kg')}`;
        
        option1.value = measurement.id;
        option1.textContent = optionText;
        option2.value = measurement.id;
        option2.textContent = optionText;
        
        select1.appendChild(option1);
        select2.appendChild(option2);
    });
}

/**
 * Update comparison when selections change
 */
function updateComparison() {
    const select1 = document.getElementById('compare-measurement-1');
    const select2 = document.getElementById('compare-measurement-2');
    const warningDiv = document.getElementById('comparison-warning');
    const warningMessage = document.getElementById('warning-message');
    
    if (!select1 || !select2) return;
    
    const id1 = select1.value;
    const id2 = select2.value;
    
    // Hide warning initially
    if (warningDiv) {
        warningDiv.classList.add('d-none');
    }
    
    // Check if both measurements are selected
    if (!id1 || !id2) {
        resetComparisonResults();
        return;
    }
    
    // Check if same measurement is selected
    if (id1 === id2) {
        if (warningDiv && warningMessage) {
            warningMessage.textContent = 'Please select two different measurements to compare.';
            warningDiv.classList.remove('d-none');
        }
        resetComparisonResults();
        return;
    }
    
    // Find the measurements
    const measurement1 = measurementsData.find(m => m.id.toString() === id1);
    const measurement2 = measurementsData.find(m => m.id.toString() === id2);
    
    if (!measurement1 || !measurement2) {
        showError('Selected measurements not found');
        return;
    }
    
    // Perform comparison
    displayComparison(measurement1, measurement2);
}

/**
 * Display comparison results
 */
function displayComparison(measurement1, measurement2) {
    const resultsDiv = document.getElementById('comparison-results');
    if (!resultsDiv) return;
    
    // Determine which is older/newer for better comparison context
    const date1 = new Date(measurement1.date);
    const date2 = new Date(measurement2.date);
    const isM1Newer = date1 > date2;
    
    const older = isM1Newer ? measurement2 : measurement1;
    const newer = isM1Newer ? measurement1 : measurement2;
    
    // Calculate differences
    const differences = calculateDifferences(older, newer);
    
    // Generate comparison HTML
    const html = `
        <div class="comparison-header mb-4">
            <div class="row text-center">
                <div class="col-5">
                    <div class="card bg-light">
                        <div class="card-body py-3">
                            <h6 class="card-title mb-1">Earlier Measurement</h6>
                            <p class="card-text text-muted mb-0">${formatDate(older.date)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-2 d-flex align-items-center justify-content-center">
                    <i class="fas fa-arrow-right text-primary fa-2x"></i>
                </div>
                <div class="col-5">
                    <div class="card bg-light">
                        <div class="card-body py-3">
                            <h6 class="card-title mb-1">Later Measurement</h6>
                            <p class="card-text text-muted mb-0">${formatDate(newer.date)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="comparison-metrics">
            <div class="row g-3">
                ${generateComparisonMetric('Weight', older.weight, newer.weight, 'kg', 'fas fa-weight')}
                ${generateComparisonMetric('Height', older.height, newer.height, 'cm', 'fas fa-ruler-vertical')}
                ${generateComparisonMetric('Body Fat %', older.body_fat_percentage, newer.body_fat_percentage, '%', 'fas fa-percentage')}
                ${generateComparisonMetric('Muscle Mass', older.muscle_mass, newer.muscle_mass, 'kg', 'fas fa-dumbbell')}
            </div>
            
            <div class="row g-3 mt-2">
                ${generateComparisonMetric('Waist', older.waist, newer.waist, 'cm', 'fas fa-circle')}
                ${generateComparisonMetric('Chest', older.chest, newer.chest, 'cm', 'fas fa-circle')}
                ${generateComparisonMetric('Hips', older.hips, newer.hips, 'cm', 'fas fa-circle')}
                ${generateComparisonMetric('Upper Arms', older.upper_arms, newer.upper_arms, 'cm', 'fas fa-circle')}
            </div>
        </div>
        
        <div class="comparison-summary mt-4">
            <div class="card border-primary">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0"><i class="fas fa-chart-line me-2"></i>Progress Summary</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-success">Improvements:</h6>
                            <ul class="list-unstyled mb-0">
                                ${generateImprovementsList(differences, true)}
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-warning">Areas to Focus:</h6>
                            <ul class="list-unstyled mb-0">
                                ${generateImprovementsList(differences, false)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
}

/**
 * Generate comparison metric HTML
 */
function generateComparisonMetric(label, oldValue, newValue, unit, icon) {
    if (oldValue === null || oldValue === undefined || newValue === null || newValue === undefined) {
        return `
            <div class="col-md-3 col-sm-6">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <i class="${icon} text-muted mb-2"></i>
                        <h6 class="card-title">${label}</h6>
                        <p class="text-muted mb-0">No data</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    const difference = newValue - oldValue;
    const percentageChange = oldValue !== 0 ? ((difference / oldValue) * 100).toFixed(1) : 0;
    
    let changeClass = 'text-muted';
    let changeIcon = 'fas fa-minus';
    let changeText = 'No change';
    
    if (difference > 0) {
        changeClass = label === 'Body Fat %' ? 'text-danger' : 'text-success';
        changeIcon = 'fas fa-arrow-up';
        changeText = `+${difference.toFixed(1)}${unit} (+${percentageChange}%)`;
    } else if (difference < 0) {
        changeClass = label === 'Body Fat %' ? 'text-success' : 'text-danger';
        changeIcon = 'fas fa-arrow-down';
        changeText = `${difference.toFixed(1)}${unit} (${percentageChange}%)`;
    }
    
    return `
        <div class="col-md-3 col-sm-6">
            <div class="card h-100">
                <div class="card-body text-center">
                    <i class="${icon} text-primary mb-2"></i>
                    <h6 class="card-title">${label}</h6>
                    <div class="mb-2">
                        <small class="text-muted">${oldValue}${unit} → ${newValue}${unit}</small>
                    </div>
                    <div class="${changeClass}">
                        <i class="${changeIcon} me-1"></i>
                        <strong>${changeText}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Calculate differences between measurements
 */
function calculateDifferences(older, newer) {
    const fields = [
        { key: 'weight', label: 'Weight', unit: 'kg', lowerIsBetter: true },
        { key: 'body_fat_percentage', label: 'Body Fat %', unit: '%', lowerIsBetter: true },
        { key: 'muscle_mass', label: 'Muscle Mass', unit: 'kg', lowerIsBetter: false },
        { key: 'waist', label: 'Waist', unit: 'cm', lowerIsBetter: true },
        { key: 'chest', label: 'Chest', unit: 'cm', lowerIsBetter: false },
        { key: 'hips', label: 'Hips', unit: 'cm', lowerIsBetter: true }
    ];
    
    return fields.map(field => {
        const oldVal = older[field.key];
        const newVal = newer[field.key];
        
        if (oldVal === null || oldVal === undefined || newVal === null || newVal === undefined) {
            return null;
        }
        
        const difference = newVal - oldVal;
        const isImprovement = field.lowerIsBetter ? difference < 0 : difference > 0;
        
        return {
            ...field,
            difference,
            isImprovement,
            oldValue: oldVal,
            newValue: newVal
        };
    }).filter(item => item !== null);
}

/**
 * Generate improvements list HTML
 */
function generateImprovementsList(differences, showImprovements) {
    const filtered = differences.filter(diff => diff.isImprovement === showImprovements);
    
    if (filtered.length === 0) {
        return `<li class="text-muted"><i class="fas fa-info-circle me-1"></i>None identified</li>`;
    }
    
    return filtered.map(diff => {
        const icon = showImprovements ? 'fas fa-check text-success' : 'fas fa-exclamation-triangle text-warning';
        const changeText = diff.difference > 0 ? `+${diff.difference.toFixed(1)}` : diff.difference.toFixed(1);
        return `<li><i class="${icon} me-1"></i>${diff.label}: ${changeText}${diff.unit}</li>`;
    }).join('');
}

/**
 * Reset comparison results to initial state
 */
function resetComparisonResults() {
    const resultsDiv = document.getElementById('comparison-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = `
        <div class="text-center text-muted py-5">
            <i class="fas fa-balance-scale fa-3x d-block mb-3 text-muted"></i>
            <h5>Select two measurements to compare</h5>
            <p class="mb-0">Choose different dates to see your progress over time</p>
        </div>
    `;
}

/**
 * Initialize chart
 */
function initChart(canvas) {
    return new Chart(canvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (kg)',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

/**
 * Update chart with measurements data
 */
function updateChart(measurements) {
    if (!progressChart || !measurements || measurements.length === 0) return;
    
    // Sort by date
    const sorted = [...measurements].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get labels and data points
    const labels = sorted.map(m => formatDate(m.date));
    const weightData = sorted.map(m => m.weight || null);
    
    // Update chart
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = weightData;
    progressChart.update();
}

/**
 * Update latest measurements card
 */
function updateLatestMeasurements(measurements) {
    const latestMeasurementsContainer = document.getElementById('latest-measurements');
    if (!latestMeasurementsContainer || !measurements || measurements.length === 0) return;
    
    // Get the latest measurement (we know the data is already sorted newest first from displayMeasurements)
    const latest = measurements[0];
    
    // Calculate BMI
    const bmi = calculateBmiFromMeasurement(latest);
    
    // Create the HTML content for latest measurements
    let html = `
        <div class="measurement-overview">
            <div class="row mb-3">
                <div class="col-12 text-center">
                    <div class="text-muted">Last updated</div>
                    <h5>${formatDate(latest.date)}</h5>
                </div>
            </div>
            <div class="row mb-3">
                <div class="col-4 text-center">
                    <div class="text-muted">Weight</div>
                    <h4>${formatWithUnit(latest.weight, ' kg')}</h4>
                </div>
                <div class="col-4 text-center">
                    <div class="text-muted">Height</div>
                    <h4>${formatWithUnit(latest.height, ' cm')}</h4>
                </div>
                <div class="col-4 text-center">
                    <div class="text-muted">BMI</div>
                    <h4>${bmi || '-'}</h4>
                </div>
            </div>
            <div class="row">
                <div class="col-6 text-center">
                    <div class="text-muted">Body Fat</div>
                    <h4>${formatWithUnit(latest.body_fat_percentage, '%')}</h4>
                </div>
                <div class="col-6 text-center">
                    <div class="text-muted">Muscle Mass</div>
                    <h4>${formatWithUnit(latest.muscle_mass, ' kg')}</h4>
                </div>
            </div>
        </div>
    `;
    
    latestMeasurementsContainer.innerHTML = html;
}

/**
 * Format a value with unit
 */
function formatWithUnit(value, unit = '') {
    if (value === null || value === undefined || value === '') return '-';
    return `${value}${unit}`;
}

/**
 * Format a date as a readable string
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Update chart to display different metrics
 */
function updateChartMetric(metric) {
    if (!progressChart || !measurementsData || measurementsData.length === 0) return;
    
    // Sort by date
    const sorted = [...measurementsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get labels (dates for x-axis)
    const labels = sorted.map(m => formatDate(m.date));
    
    // Prepare data based on selected metric
    let dataPoints;
    let label;
    let borderColor;
    
    switch(metric) {
        case 'weight':
            dataPoints = sorted.map(m => m.weight || null);
            label = 'Weight (kg)';
            borderColor = '#4e73df';
            break;
        case 'body_fat':
            dataPoints = sorted.map(m => m.body_fat_percentage || null);
            label = 'Body Fat (%)';
            borderColor = '#e74a3b';
            break;
        case 'muscle_mass':
            dataPoints = sorted.map(m => m.muscle_mass || null);
            label = 'Muscle Mass (kg)';
            borderColor = '#1cc88a';
            break;
        default:
            dataPoints = sorted.map(m => m.weight || null);
            label = 'Weight (kg)';
            borderColor = '#4e73df';
    }
    
    // Update chart
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = dataPoints;
    progressChart.data.datasets[0].label = label;
    progressChart.data.datasets[0].borderColor = borderColor;
    progressChart.update();
}

/**
 * Calculate BMI from a measurement object
 */
function calculateBmiFromMeasurement(measurement) {
    if (!measurement || !measurement.weight || !measurement.height) return null;
    
    const weight = parseFloat(measurement.weight);
    const height = parseFloat(measurement.height) / 100; // Convert cm to m
    
    if (weight && height) {
        return (weight / (height * height)).toFixed(1);
    }
    
    return null;
}

/**
 * Show notification message
 */
function showNotification(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type} text-white`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const header = document.createElement('div');
    header.className = 'toast-header bg-white text-dark';
    header.innerHTML = `
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    `;
    
    const body = document.createElement('div');
    body.className = 'toast-body';
    body.textContent = message;
    
    toast.appendChild(header);
    toast.appendChild(body);
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    // Add close button functionality
    const closeBtn = toast.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });
    }
}

/**
 * Get CSRF token from the page
 */
function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Implement success notification
    console.log('Success:', message);
    
    // Create alert if not exists
    let alert = document.getElementById('success-alert');
    if (!alert) {
        alert = document.createElement('div');
        alert.id = 'success-alert';
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3';
        alert.setAttribute('role', 'alert');
        document.body.appendChild(alert);
    }
    
    // Set content
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    // Implement error notification
    console.error('Error:', message);
    
    // Update error container if it exists
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    } else {
        // Create alert
        let alert = document.getElementById('error-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'error-alert';
            alert.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3';
            alert.setAttribute('role', 'alert');
            document.body.appendChild(alert);
        }
        
        // Set content
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    }
}

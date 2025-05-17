/**
 * Client Measurements JavaScript - API Driven Implementation
 * Handles client-side functionality for managing measurements
 */

// Global variables
let measurementsData = [];
let progressChart = null;

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
 * Set up all event listeners
 */
function setupEventListeners() {
    // Form submission
    const form = document.getElementById('add-measurement-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveMeasurement();
        });
    }
    
    // Save measurement button
    const saveBtn = document.getElementById('save-measurement-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMeasurement);
    }
    
    // Compare measurements button
    const compareBtn = document.getElementById('compare-measurements-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', function() {
            showNotification('info', 'Coming soon!', 'Measurement comparison feature will be available soon.');
        });
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
    const modal = new bootstrap.Modal(document.getElementById('addMeasurementModal'));
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
 * Save a new measurement
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
        
        // We need to use direct fetch for FormData uploads instead of fetchAPI
        const response = await fetch('/profiles/api/v1/client-measurements/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to save measurement');
        }
        
        const result = await response.json();
        
        if (!result) {
            throw new Error('Failed to save measurement');
        }
        
        // Show success message
        showSuccess('Measurement saved successfully');
        
        // Close modal and refresh data
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMeasurementModal'));
        if (modal) modal.hide();
        
        // Reload measurements
        await loadMeasurements();
        
    } catch (error) {
        console.error('Error saving measurement:', error);
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
 * Load measurements from the API
 */
async function loadMeasurements() {
    try {
        showLoading(true);
        
        // Use fetchAPI utility to ensure authentication headers are included
        const data = await fetchAPI('client-measurements/');
        if (!data) {
            throw new Error('Failed to load measurements');
        }
        
        measurementsData = data;
        displayMeasurements(measurementsData);
        
        // Update the Latest Measurements section
        updateLatestMeasurements(measurementsData);
        
        // Update chart if it exists
        if (progressChart) {
            updateChart(measurementsData);
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading measurements:', error);
        showError(error.message || 'An error occurred while loading measurements');
        showLoading(false);
    }
}

/**
 * Show or hide loading state
 */
function showLoading(show) {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'block' : 'none';
    }
}

/**
 * Display measurements in the table
 */
function displayMeasurements(measurements) {
    const tableBody = document.getElementById('measurements-table-body');
    if (!tableBody) return;
    
    if (!measurements || measurements.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <p class="mb-0 text-muted">No measurements found. Click "Add Measurement" to get started.</p>
                </td>
            </tr>`;
        return;
    }
    
    // Sort measurements by date (newest first)
    measurements.sort((a, b) => new Date(b.date) - new Date(a.date));
    
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
        
        // Get form and show modal
        const form = document.getElementById('add-measurement-form');
        if (!form) return;
        
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        
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
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addMeasurementModal'));
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
    if (!confirm('Are you sure you want to delete this measurement?')) {
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

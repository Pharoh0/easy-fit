/**
 * Body Measurements JavaScript
 * Handles all the functionality for the Body Measurements page including:
 * - API calls with JWT authentication
 * - Interactive body diagram
 * - Data tables for measurement history
 * - Charts for measurement progress
 * - CRUD operations for measurements
 */

// Global variables
let bodyParts = [];
let measurementData = {
    latest: {},
    history: {
        results: [],
        count: 0,
        next: null,
        previous: null
    },
    chart: {}
};
let currentPage = 1;
let pageSize = 10;
let filterBodyPart = '';
let progressChart = null;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date pickers
    initializeDatePickers();
    
    // Initialize modals
    initializeModals();
    
    // Initialize event listeners
    setupEventListeners();
    
    // Load data
    loadData();
});

/**
 * Auth and API Functions
 */

// Get JWT token from localStorage or cookies
function getJWTToken() {
    let token = localStorage.getItem('access_token');  // Updated to access_token
    
    // If not in localStorage, try to get from cookies
    if (!token) {
        // Try old token name for backward compatibility
        token = localStorage.getItem('token');
        
        if (!token) {
            const tokenCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('access_token=') || row.startsWith('token='));
            
            if (tokenCookie) {
                token = tokenCookie.split('=')[1];
            }
        }
    }
    
    return token;
}

// Create headers with JWT token
function createAuthHeaders() {
    const token = getJWTToken();
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `JWT ${token}`;
    }
    
    return headers;
}

// API fetch wrapper with error handling
async function fetchAPI(url, options = {}) {
    try {
        // Add auth headers if not provided
        if (!options.headers) {
            options.headers = createAuthHeaders();
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized (token expired)
                showAlert('Your session has expired. Please log in again.', 'warning');
                // Could redirect to login page here
                return null;
            }
            
            const errorText = await response.text();
            throw new Error(`API error ${response.status}: ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API fetch error:', error);
        showAlert(`Failed to fetch data: ${error.message}`, 'danger');
        return null;
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Check if alert container exists, if not create it
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.className = 'position-fixed top-0 start-50 translate-middle-x p-3';
        alertContainer.style.zIndex = '1050';
        document.body.appendChild(alertContainer);
    }
    
    // Create alert element
    const alertId = `alert-${Date.now()}`;
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.id = alertId;
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to container
    alertContainer.appendChild(alertElement);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alertToRemove = document.getElementById(alertId);
        if (alertToRemove) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alertToRemove);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Initialization Functions
 */

// Initialize date pickers using flatpickr
function initializeDatePickers() {
    const dateElements = document.querySelectorAll('input[type="date"]');
    dateElements.forEach(element => {
        flatpickr(element, {
            dateFormat: "Y-m-d",
            maxDate: "today"
        });
    });
}

// Initialize modal functionality
function initializeModals() {
    // Add measurement modal
    const addMeasurementModal = document.getElementById('addMeasurementModal');
    if (addMeasurementModal) {
        const modal = new bootstrap.Modal(addMeasurementModal);
        
        // Handle measurement type selection
        const measurementTypeSelect = document.getElementById('measurement-type');
        if (measurementTypeSelect) {
            measurementTypeSelect.addEventListener('change', function() {
                const singleContainer = document.getElementById('single-measurement-container');
                const multipleContainer = document.getElementById('multiple-measurement-container');
                
                if (this.value === 'single') {
                    singleContainer.style.display = 'block';
                    multipleContainer.style.display = 'none';
                } else {
                    singleContainer.style.display = 'none';
                    multipleContainer.style.display = 'block';
                    if (bodyParts.length > 0) {
                        renderBodyPartCheckboxes();
                    }
                }
            });
        }
    }
    
    // Edit measurement modal
    const editMeasurementModal = document.getElementById('editMeasurementModal');
    if (editMeasurementModal) {
        new bootstrap.Modal(editMeasurementModal);
    }
}

// Set up all event listeners
/**
 * Save a new body measurement
 */
function saveMeasurement() {
    // Get form data
    const date = document.getElementById('measurement-date').value;
    const bodyPartId = document.getElementById('measurement-body-part').value;
    const value = document.getElementById('measurement-value').value;
    const unit = document.getElementById('measurement-unit').value;
    const notes = document.getElementById('measurement-notes').value;
    
    if (!date || !bodyPartId || !value) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    const measurementData = {
        date: date,
        body_parts: [
            {
                body_part_id: bodyPartId,
                value: value,
                unit: unit,
                notes: notes
            }
        ]
    };
    
    // Send data to API
    secureApiFetch(`/profiles/api/v1/client/enhanced-measurements/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(measurementData)
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to add measurement');
    })
    .then(data => {
        // Close modal and refresh data
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMeasurementModal'));
        modal.hide();
        
        // Reset form
        document.getElementById('add-measurement-form').reset();
        
        // Show success message
        showAlert('Measurement added successfully', 'success');
        
        // Refresh data
        loadLatestMeasurements();
        loadMeasurementHistory();
        loadChartData();
    })
    .catch(error => {
        console.error('Error adding measurement:', error);
        showAlert('Failed to add measurement', 'danger');
    });
}

/**
 * Update an existing measurement
 */
function updateMeasurement() {
    // Get form data
    const measurementId = document.getElementById('edit-measurement-id').value;
    const bodyPartId = document.getElementById('edit-body-part-id').value;
    const value = document.getElementById('edit-measurement-value').value;
    const unit = document.getElementById('edit-measurement-unit').value;
    const date = document.getElementById('edit-measurement-date').value;
    const notes = document.getElementById('edit-measurement-notes').value;
    
    if (!measurementId || !bodyPartId || !value || !date) {
        showAlert('Missing required data for update', 'danger');
        return;
    }
    
    const updateData = {
        date: date,
        body_parts: [
            {
                body_part_id: bodyPartId,
                value: value,
                unit: unit,
                notes: notes
            }
        ]
    };
    
    // Send update to API
    secureApiFetch(`/profiles/api/v1/client/body-part-measurements/${measurementId}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Failed to update measurement');
    })
    .then(data => {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editMeasurementModal'));
        modal.hide();
        
        // Show success message
        showAlert('Measurement updated successfully', 'success');
        
        // Refresh data
        loadLatestMeasurements();
        loadMeasurementHistory();
        loadChartData();
    })
    .catch(error => {
        console.error('Error updating measurement:', error);
        showAlert('Failed to update measurement', 'danger');
    });
}

/**
 * Delete a measurement
 */
function deleteMeasurement() {
    // Get measurement ID
    const measurementId = document.getElementById('edit-measurement-id').value;
    
    if (!measurementId) {
        showAlert('Missing measurement ID', 'danger');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this measurement?')) {
        return;
    }
    
    // Send delete request to API
    secureApiFetch(`/profiles/api/v1/client/body-part-measurements/${measurementId}/`, {
        method: 'DELETE',
    })
    .then(response => {
        if (response.ok) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editMeasurementModal'));
            modal.hide();
            
            // Show success message
            showAlert('Measurement deleted successfully', 'success');
            
            // Refresh data
            loadLatestMeasurements();
            loadMeasurementHistory();
            loadChartData();
            return true;
        }
        throw new Error('Failed to delete measurement');
    })
    .catch(error => {
        console.error('Error deleting measurement:', error);
        showAlert('Failed to delete measurement', 'danger');
    });
}

function setupEventListeners() {
    // Add measurement button
    const addMeasurementBtn = document.getElementById('add-measurement-btn');
    if (addMeasurementBtn) {
        addMeasurementBtn.addEventListener('click', function() {
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('addMeasurementModal'));
            modal.show();
        });
    }
    
    // Save measurement button
    const saveMeasurementBtn = document.getElementById('save-measurement-btn');
    if (saveMeasurementBtn) {
        saveMeasurementBtn.addEventListener('click', saveMeasurement);
    }
    
    // Update measurement button
    const updateMeasurementBtn = document.getElementById('update-measurement-btn');
    if (updateMeasurementBtn) {
        updateMeasurementBtn.addEventListener('click', updateMeasurement);
    }
    
    // Delete measurement button
    const deleteMeasurementBtn = document.getElementById('delete-measurement-btn');
    if (deleteMeasurementBtn) {
        deleteMeasurementBtn.addEventListener('click', deleteMeasurement);
    }
    
    // Refresh history button
    const refreshHistoryBtn = document.getElementById('refresh-history');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', function() {
            loadMeasurementHistory();
        });
    }
    
    // Chart body part select
    const chartBodyPartSelect = document.getElementById('chart-body-part');
    if (chartBodyPartSelect) {
        chartBodyPartSelect.addEventListener('change', function() {
            loadChartData();
        });
    }
    
    // Chart time range select
    const chartTimeRangeSelect = document.getElementById('chart-time-range');
    if (chartTimeRangeSelect) {
        chartTimeRangeSelect.addEventListener('change', function() {
            loadChartData();
        });
    }
    
    // Export buttons
    const exportCsvBtn = document.getElementById('export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportData('csv');
        });
    }
    
    const exportPdfBtn = document.getElementById('export-pdf');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportData('pdf');
        });
    }
    
    // Body part selection change for add measurement form
    const bodyPartSelect = document.getElementById('measurement-body-part');
    if (bodyPartSelect) {
        bodyPartSelect.addEventListener('change', function() {
            updateCategoryForBodyPart(this.value);
        });
    }
}

/**
 * Data Loading Functions
 */

// Load data from API and initialize components
async function loadData() {
    await loadBodyParts();
    loadLatestMeasurements();
    // Load measurement history first, then initialize DataTables
    await loadMeasurementHistory();
    initializeMeasurementsTable();
    initializeBodyDiagram();
    initializeProgressChart();
}

// Load body parts list from API
async function loadBodyParts() {
    const data = await fetchAPI('/profiles/api/v1/client/body-parts/');
    if (data && Array.isArray(data)) {
        bodyParts = data;
        populateBodyPartDropdowns();
        renderBodyPartCheckboxes();
    }
}

// Populate body part dropdowns with data
function populateBodyPartDropdowns() {
    const bodyPartSelects = document.querySelectorAll('select[data-body-part-select]');
    
    if (bodyPartSelects.length === 0) {
        return;
    }
    
    bodyPartSelects.forEach(select => {
        // Clear existing options except the first one (placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add body parts as options
        bodyParts.forEach(part => {
            const option = document.createElement('option');
            option.value = part.id;
            option.textContent = part.name;
            select.appendChild(option);
        });
    });
}

// Render checkboxes for body part selection in the UI
function renderBodyPartCheckboxes() {
    const container = document.getElementById('body-part-checkboxes');
    if (!container) return;
    
    // Clear the container
    container.innerHTML = '';
    
    // Add checkboxes for each body part
    bodyParts.forEach(part => {
        const div = document.createElement('div');
        div.className = 'form-check';
        
        const input = document.createElement('input');
        input.className = 'form-check-input';
        input.type = 'checkbox';
        input.id = `body-part-${part.id}`;
        input.value = part.id;
        input.name = 'selected-body-parts';
        
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = `body-part-${part.id}`;
        label.textContent = part.name;
        
        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Load latest measurements from API
async function loadLatestMeasurements() {
    // Get the client ID from URL or use a default if we're in the client profile section
    const clientId = getClientId();
    if (!clientId) {
        console.error('No client ID found');
        showAlert('Client ID is required to load measurements', 'warning');
        return;
    }
    
    const url = `/profiles/api/v1/client/enhanced-measurements/latest/?client_id=${clientId}`;
    const data = await fetchAPI(url);
    if (data) {
        measurementData.latest = data;
        renderLatestMeasurements();
        updateSummaryStatistics();
    }
}

// Render latest measurements in the table
function renderLatestMeasurements() {
    const container = document.getElementById('latest-measurements-content');
    if (!container) return;
    
    // Check if we have data
    if (!measurementData.latest.body_part_measurements || measurementData.latest.body_part_measurements.length === 0) {
        container.innerHTML = '<div class="text-center p-4"><p class="text-muted">No measurement data available</p></div>';
        return;
    }
    
    // Create table
    let tableHTML = `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>Body Part</th>
                    <th>Measurement</th>
                    <th>Unit</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add rows for each measurement
    measurementData.latest.body_part_measurements.forEach(measurement => {
        const bodyPart = bodyParts.find(part => part.id === measurement.body_part) || { name: 'Unknown', category: 'Other' };
        
        tableHTML += `
            <tr>
                <td>${bodyPart.name}</td>
                <td>${measurement.value}</td>
                <td>${measurement.unit}</td>
                <td>${bodyPart.category || 'N/A'}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
    
    // Update the date information
    const dateElement = document.getElementById('latest-measurements-date');
    if (dateElement && measurementData.latest.date) {
        const measurementDate = new Date(measurementData.latest.date);
        dateElement.textContent = `Last updated: ${measurementDate.toLocaleDateString()}`;
    }
}

// Initialize measurements table with DataTables
function initializeMeasurementsTable() {
    const table = document.getElementById('measurements-table');
    // Initialize DataTable after all rows are added
    // Use setTimeout to ensure DOM is fully updated before initialization
    setTimeout(() => {
        $(table).DataTable({
            processing: true,
            serverSide: false, // We handle server side manually
            searching: true,  // Enable basic searching
            ordering: true,
            paging: true,     // Enable pagination
            pageLength: 10,   // Show 10 records per page
            lengthMenu: [5, 10, 25, 50],
            info: true,       // Show info about records
            language: {
                emptyTable: "No measurements found",
                processing: "Loading measurements..."
            },
            columns: [
                { data: null, title: 'Date' },  // These are just for initialization
                { data: null, title: 'Body Part' },
                { data: null, title: 'Value' },
                { data: null, title: 'Unit' },
                { data: null, title: 'Change' },
                { data: null, title: 'Notes' },
                { data: null, title: 'Actions', orderable: false }
            ],
            // Use this for better mobile responsiveness
            responsive: true,
            // Initialize with empty data to avoid errors
            data: []
        });
    }, 100); // Short delay to ensure DOM is ready
}

// Helper function to get client ID from URL or context
function getClientId() {
    // Try to get from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    let clientId = urlParams.get('client_id');
    
    // If not in URL, try to get from path (assuming URL structure like /profiles/client/123/...)
    if (!clientId) {
        const pathParts = window.location.pathname.split('/');
        const clientIndex = pathParts.indexOf('client');
        if (clientIndex !== -1 && clientIndex < pathParts.length - 1) {
            const potentialId = pathParts[clientIndex + 1];
            if (potentialId && !isNaN(potentialId)) {
                clientId = potentialId;
            }
        }
    }
    
    // If still not found, check if we're in client profile context
    if (!clientId) {
        // This is a fallback - for the demo, we'll assume we're working with client ID 1
        // In a production app, you'd get this from user context or session
        clientId = '1'; 
    }
    
    return clientId;
}

// Load measurement history from API
async function loadMeasurementHistory() {
    const clientId = getClientId();
    if (!clientId) {
        console.error('No client ID found');
        showAlert('Client ID is required to load measurements', 'warning');
        return;
    }
    
    const url = new URL('/profiles/api/v1/client/enhanced-measurements/', window.location.origin);
    url.searchParams.append('page', currentPage);
    url.searchParams.append('page_size', pageSize);
    url.searchParams.append('client_id', clientId);
    
    if (filterBodyPart) {
        url.searchParams.append('body_part', filterBodyPart);
    }
    
    const data = await fetchAPI(url.toString());
    if (data) {
        measurementData.history = data;
        renderMeasurementHistory();
        loadChartData(); // Load data for progress chart after history is loaded
    }
}

// Render measurement history in the table
function renderMeasurementHistory() {
    const table = document.getElementById('measurements-table');
    if (!table) return;
    
    // Get the tbody element
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    // Check if we already initialized DataTable - if so, destroy it first
    let dataTable = $(table).DataTable();
    if (dataTable) {
        dataTable.destroy();
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Check if we have data
    const results = measurementData.history.results || [];
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No measurement records found</td></tr>';
        return;
    }
    
    // Add rows for each measurement
    results.forEach(item => {
        item.body_part_measurements.forEach(measurement => {
            const bodyPart = bodyParts.find(part => part.id === measurement.body_part) || { name: 'Unknown' };
            const date = new Date(item.date).toLocaleDateString();
            
            // Calculate change if possible
            let changeHTML = '<span>-</span>';
            if (measurement.previous_value !== null) {
                const change = measurement.value - measurement.previous_value;
                const changePercent = measurement.previous_value !== 0 ? 
                    ((change / Math.abs(measurement.previous_value)) * 100).toFixed(1) : 0;
                
                const changeClass = change < 0 ? 'change-negative' : (change > 0 ? 'change-positive' : 'change-neutral');
                changeHTML = `<span class="change-value ${changeClass}">${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)</span>`;
            }
            
            // Create row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${date}</td>
                <td>${bodyPart.name}</td>
                <td>${measurement.value}</td>
                <td>${measurement.unit}</td>
                <td>${changeHTML}</td>
                <td>${measurement.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-measurement" data-id="${measurement.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-measurement" data-id="${measurement.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners to buttons
            const editBtn = row.querySelector('.edit-measurement');
            if (editBtn) {
                editBtn.addEventListener('click', function() {
                    openEditModal(measurement, item.date);
                });
            }
            
            const deleteBtn = row.querySelector('.delete-measurement');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    confirmDeleteMeasurement(measurement.id);
                });
            }
            
            tbody.appendChild(row);
        });
    });
    
    // Initialize or refresh DataTable if it exists
    if (typeof $.fn.DataTable !== 'undefined' && $.fn.DataTable.isDataTable(table)) {
        $(table).DataTable().draw();
    }
}

// Update summary statistics from latest measurements
function updateSummaryStatistics() {
    // This function will update the summary statistics based on latest measurements
    // and potentially goal values (which would come from user profile)
    
    // Example statistic update for demonstration
    const weightCurrent = document.getElementById('weight-current');
    const bodyfatCurrent = document.getElementById('bodyfat-current');
    const waistCurrent = document.getElementById('waist-current');
    
    if (!measurementData.latest.body_part_measurements) return;
    
    // Find measurements for specific body parts
    const weightMeasurement = measurementData.latest.body_part_measurements.find(m => {
        const bodyPart = bodyParts.find(part => part.id === m.body_part);
        return bodyPart && bodyPart.name.toLowerCase().includes('weight');
    });
    
    const bodyfatMeasurement = measurementData.latest.body_part_measurements.find(m => {
        const bodyPart = bodyParts.find(part => part.id === m.body_part);
        return bodyPart && (bodyPart.name.toLowerCase().includes('body fat') || 
                          bodyPart.name.toLowerCase().includes('bodyfat'));
    });
    
    const waistMeasurement = measurementData.latest.body_part_measurements.find(m => {
        const bodyPart = bodyParts.find(part => part.id === m.body_part);
        return bodyPart && bodyPart.name.toLowerCase().includes('waist');
    });
    
    // Update UI if measurements found
    if (weightCurrent && weightMeasurement) {
        weightCurrent.textContent = `${weightMeasurement.value}${weightMeasurement.unit}`;
    }
    
    if (bodyfatCurrent && bodyfatMeasurement) {
        bodyfatCurrent.textContent = `${bodyfatMeasurement.value}${bodyfatMeasurement.unit}`;
    }
    
    if (waistCurrent && waistMeasurement) {
        waistCurrent.textContent = `${waistMeasurement.value}${waistMeasurement.unit}`;
    }
}

// Initialize and render the body diagram
function initializeBodyDiagram() {
    // This would typically involve loading an SVG or image and adding markers
    const bodyDiagramContainer = document.getElementById('body-diagram-container');
    const bodyDiagram = document.getElementById('body-diagram');
    
    if (!bodyDiagramContainer || !bodyDiagram || !bodyParts.length) return;
    
    // Sample positions for body parts (these would be defined per body part)
    const bodyPartPositions = {
        'Chest': { x: 50, y: 25 },
        'Waist': { x: 50, y: 40 },
        'Biceps': { x: 25, y: 30 },
        'Thighs': { x: 50, y: 60 },
        'Calves': { x: 50, y: 80 }
    };
    
    // Create markers for each body part that has a defined position
    bodyParts.forEach(part => {
        const position = bodyPartPositions[part.name];
        if (position) {
            createBodyPartMarker(part, position.x, position.y);
        }
    });
}

// Initialize progress chart
function initializeProgressChart() {
    const chartCanvas = document.getElementById('progress-chart');
    if (!chartCanvas) return;
    
    // Create initial empty chart
    progressChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Measurement Progress',
                data: [],
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#0d6efd',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const unit = measurementData.chart.unit || '';
                            return `${context.dataset.label}: ${value} ${unit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Measurement'
                    },
                    beginAtZero: false
                }
            }
        }
    });
    
    // Load initial chart data if body part is selected
    const chartBodyPartSelect = document.getElementById('chart-body-part');
    if (chartBodyPartSelect && chartBodyPartSelect.value) {
        loadChartData();
    }
}

// Load data for progress chart
async function loadChartData() {
    const chartBodyPartSelect = document.getElementById('chart-body-part');
    const chartTimeRangeSelect = document.getElementById('chart-time-range');
    
    if (!chartBodyPartSelect || !chartBodyPartSelect.value) {
        showChartNoDataMessage();
        return;
    }
    
    const bodyPartId = chartBodyPartSelect.value;
    const timeRange = chartTimeRangeSelect ? chartTimeRangeSelect.value : '30';
    
    // Create URL for API request
    const url = new URL('/api/v1/client-profile/body-part-measurements/', window.location.origin);
    url.searchParams.append('body_part', bodyPartId);
    
    if (timeRange !== 'all') {
        const daysAgo = parseInt(timeRange);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - daysAgo);
        url.searchParams.append('from_date', fromDate.toISOString().split('T')[0]);
    }
    
    // Fetch data
    const data = await fetchAPI(url.toString());
    if (!data || !data.results || data.results.length === 0) {
        showChartNoDataMessage();
        return;
    }
    
    // Process data for the chart
    const chartData = processChartData(data.results, bodyPartId);
    updateProgressChart(chartData);
}

// Process data for chart display
function processChartData(measurements, bodyPartId) {
    // Sort by date
    measurements.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Extract dates and values
    const dates = [];
    const values = [];
    let unit = '';
    
    measurements.forEach(measurement => {
        // Format date
        const date = new Date(measurement.date);
        const formattedDate = date.toLocaleDateString();
        
        // Get value for the selected body part
        const value = measurement.value;
        if (value !== null && value !== undefined) {
            dates.push(formattedDate);
            values.push(value);
            unit = measurement.unit || '';
        }
    });
    
    // Find the body part name for the label
    const bodyPart = bodyParts.find(part => part.id === parseInt(bodyPartId));
    const bodyPartName = bodyPart ? bodyPart.name : 'Measurement';
    
    return {
        dates,
        values,
        unit,
        bodyPartName
    };
}

// Update the chart with new data
function updateProgressChart(chartData) {
    if (!progressChart) return;
    
    const noDataElement = document.getElementById('no-chart-data');
    const chartContainer = document.querySelector('.chart-container');
    
    // Show/hide no data message
    if (chartData.dates.length === 0) {
        if (noDataElement) noDataElement.style.display = 'block';
        if (chartContainer) chartContainer.style.display = 'none';
        return;
    } else {
        if (noDataElement) noDataElement.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'block';
    }
    
    // Update chart data
    progressChart.data.labels = chartData.dates;
    progressChart.data.datasets[0].data = chartData.values;
    progressChart.data.datasets[0].label = chartData.bodyPartName;
    
    // Store unit for tooltip
    measurementData.chart.unit = chartData.unit;
    
    // Update y-axis title
    progressChart.options.scales.y.title.text = `Measurement (${chartData.unit})`;
    
    // Update the chart
    progressChart.update();
}

// Show no data message for chart
function showChartNoDataMessage() {
    const noDataElement = document.getElementById('no-chart-data');
    const chartContainer = document.querySelector('.chart-container');
    
    if (noDataElement) noDataElement.style.display = 'block';
    if (chartContainer) chartContainer.style.display = 'none';
}

// Create a body part marker on the diagram
function createBodyPartMarker(bodyPart, xPercent, yPercent) {
    const bodyDiagramContainer = document.getElementById('body-diagram-container');
    if (!bodyDiagramContainer) return;
    
    // Create the marker element
    const marker = document.createElement('div');
    marker.className = 'body-part-marker';
    marker.dataset.bodyPartId = bodyPart.id;
    marker.dataset.bodyPartName = bodyPart.name;
    
    // Position the marker as a percentage of the container
    marker.style.left = `${xPercent}%`;
    marker.style.top = `${yPercent}%`;
    
    // Add tooltip with tippy.js if available
    if (typeof tippy !== 'undefined') {
        tippy(marker, {
            content: `<div class="measurement-tooltip">
                <div class="tooltip-title">${bodyPart.name}</div>
                <div class="tooltip-value">
                    <span>Current:</span>
                    <span id="tooltip-${bodyPart.id}-current">Loading...</span>
                </div>
                <div class="tooltip-value">
                    <span>Previous:</span>
                    <span id="tooltip-${bodyPart.id}-previous">-</span>
                </div>
            </div>`,
            allowHTML: true,
            theme: 'measurement',
            placement: 'right',
            interactive: true
        });
    }
    
    // Add click event to show data for this body part
    marker.addEventListener('click', function() {
        // Set the body part in the chart dropdown
        const chartBodyPartSelect = document.getElementById('chart-body-part');
        if (chartBodyPartSelect) {
            chartBodyPartSelect.value = bodyPart.id;
            chartBodyPartSelect.dispatchEvent(new Event('change'));
        }
        
        // Highlight this marker
        document.querySelectorAll('.body-part-marker').forEach(m => {
            m.classList.remove('active');
        });
        marker.classList.add('active');
    });
    
    // Add the marker to the container
    bodyDiagramContainer.appendChild(marker);
}

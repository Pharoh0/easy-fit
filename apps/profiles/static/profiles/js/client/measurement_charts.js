/**
 * Measurement Chart Module
 * Provides visualization of body measurements over time
 */

class MeasurementCharts {
    constructor(apiBaseUrl = '/profiles/api/v1/client/') {
        this.apiBaseUrl = apiBaseUrl;
        this.charts = {};
        this.colors = {
            primary: '#4e73df',
            success: '#1cc88a',
            info: '#36b9cc',
            warning: '#f6c23e',
            danger: '#e74a3b',
            secondary: '#858796',
            light: '#f8f9fc',
            dark: '#5a5c69'
        };
        // Default chart options
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        precision: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        };
    }

    /**
     * Initialize charts for the measurement dashboard
     * @param {string} clientId - The client ID for which to load measurements
     */
    async initializeCharts(clientId) {
        try {
            // Fetch historical measurement data for this client
            const measurements = await this.fetchMeasurementHistory(clientId);
            if (!measurements || measurements.length === 0) {
                console.warn('No measurement history available');
                document.getElementById('no-measurements-message').classList.remove('d-none');
                document.getElementById('measurement-charts-container').classList.add('d-none');
                return;
            }
            
            document.getElementById('no-measurements-message')?.classList.add('d-none');
            document.getElementById('measurement-charts-container')?.classList.remove('d-none');
            
            // Process measurements for charts
            const chartData = this.processMeasurementsForCharts(measurements);
            
            // Create charts for different measurement categories
            this.createWeightChart(chartData.weightData);
            this.createBodyCompositionChart(chartData.bodyCompData);
            this.createCircumferenceCharts(chartData.circumferenceData);
            
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }
    
    /**
     * Fetch measurement history for a client
     * @param {string} clientId - The client ID 
     * @returns {Array} - Array of measurement records
     */
    async fetchMeasurementHistory(clientId) {
        try {
            // Use the fetchAPI function from api.js
            const url = `${this.apiBaseUrl}enhanced-measurements/history/?client_id=${clientId}`;
            return await window.fetchAPI(url, 'GET');
        } catch (error) {
            console.error('Error fetching measurement history:', error);
            return [];
        }
    }
    
    /**
     * Process raw measurement data into chart-friendly format
     * @param {Array} measurements - Raw measurement data
     * @returns {Object} - Processed data for different chart types
     */
    processMeasurementsForCharts(measurements) {
        // Sort measurements by date
        const sortedMeasurements = [...measurements].sort((a, b) => {
            return new Date(a.measurement_date) - new Date(b.measurement_date);
        });
        
        // Extract dates for x-axis
        const dates = sortedMeasurements.map(m => {
            const date = new Date(m.measurement_date);
            return date.toLocaleDateString();
        });
        
        // Process weight data
        const weightData = {
            labels: dates,
            datasets: [{
                label: 'Weight (kg)',
                data: sortedMeasurements.map(m => m.weight),
                borderColor: this.colors.primary,
                backgroundColor: this.hexToRgba(this.colors.primary, 0.2),
                tension: 0.4,
                fill: true
            }]
        };
        
        // Process body composition data
        const bodyCompData = {
            labels: dates,
            datasets: [
                {
                    label: 'Body Fat %',
                    data: sortedMeasurements.map(m => m.body_fat_percentage),
                    borderColor: this.colors.danger,
                    backgroundColor: this.hexToRgba(this.colors.danger, 0.1),
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Muscle Mass %',
                    data: sortedMeasurements.map(m => m.muscle_mass_percentage),
                    borderColor: this.colors.success,
                    backgroundColor: this.hexToRgba(this.colors.success, 0.1),
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'BMI',
                    data: sortedMeasurements.map(m => m.bmi),
                    borderColor: this.colors.info,
                    backgroundColor: this.hexToRgba(this.colors.info, 0.1),
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        };
        
        // Process circumference data
        // Group by body parts
        const circumferenceData = {};
        const bodyParts = ['chest', 'waist', 'hips', 'thigh', 'arm'];
        
        bodyParts.forEach(part => {
            circumferenceData[part] = {
                labels: dates,
                datasets: [{
                    label: `${part.charAt(0).toUpperCase() + part.slice(1)} (cm)`,
                    data: sortedMeasurements.map(m => m[part] || null),
                    borderColor: this.getColorForBodyPart(part),
                    backgroundColor: this.hexToRgba(this.getColorForBodyPart(part), 0.2),
                    tension: 0.4,
                    fill: true
                }]
            };
        });
        
        return {
            weightData,
            bodyCompData,
            circumferenceData
        };
    }
    
    /**
     * Create weight chart
     * @param {Object} data - Weight chart data
     */
    createWeightChart(data) {
        const ctx = document.getElementById('weight-chart')?.getContext('2d');
        if (!ctx) {
            console.warn('Weight chart canvas not found');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.charts.weight) {
            this.charts.weight.destroy();
        }
        
        // Create new chart
        this.charts.weight = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: 'Weight Progression'
                    }
                }
            }
        });
    }
    
    /**
     * Create body composition chart
     * @param {Object} data - Body composition chart data
     */
    createBodyCompositionChart(data) {
        const ctx = document.getElementById('body-composition-chart')?.getContext('2d');
        if (!ctx) {
            console.warn('Body composition chart canvas not found');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.charts.bodyComp) {
            this.charts.bodyComp.destroy();
        }
        
        // Create new chart
        this.charts.bodyComp = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                ...this.defaultOptions,
                scales: {
                    y: {
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: 'BMI'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: 'Body Composition'
                    }
                }
            }
        });
    }
    
    /**
     * Create circumference charts for different body parts
     * @param {Object} data - Circumference data by body part
     */
    createCircumferenceCharts(data) {
        // Create a chart for each body part or a combined chart
        const bodyParts = Object.keys(data);
        
        // Option 1: Combined chart for all circumference measurements
        const ctx = document.getElementById('circumference-chart')?.getContext('2d');
        if (!ctx) {
            console.warn('Circumference chart canvas not found');
            return;
        }
        
        // Destroy existing chart if it exists
        if (this.charts.circumference) {
            this.charts.circumference.destroy();
        }
        
        // Prepare combined data
        const combinedData = {
            labels: data[bodyParts[0]].labels,
            datasets: bodyParts.map(part => data[part].datasets[0])
        };
        
        // Create new chart
        this.charts.circumference = new Chart(ctx, {
            type: 'line',
            data: combinedData,
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        display: true,
                        text: 'Body Measurements'
                    }
                }
            }
        });
    }
    
    /**
     * Get a color for a body part (for consistent coloring)
     * @param {string} bodyPart - Name of the body part
     * @returns {string} - Hex color code
     */
    getColorForBodyPart(bodyPart) {
        const colorMap = {
            'chest': this.colors.primary,
            'waist': this.colors.danger,
            'hips': this.colors.success,
            'thigh': this.colors.warning,
            'arm': this.colors.info,
            'default': this.colors.secondary
        };
        
        return colorMap[bodyPart] || colorMap.default;
    }
    
    /**
     * Convert hex color to rgba for transparency
     * @param {string} hex - Hex color code
     * @param {number} alpha - Alpha transparency value (0-1)
     * @returns {string} - RGBA color string
     */
    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the measurements page
    const measurementChartsContainer = document.getElementById('measurement-charts-container');
    if (measurementChartsContainer) {
        const charts = new MeasurementCharts();
        
        // Get client ID from page data attribute or URL
        const clientId = getClientId();
        if (clientId) {
            charts.initializeCharts(clientId);
        } else {
            console.error('Client ID not found');
        }
    }
});

/**
 * Helper function to get client ID from various sources
 * @returns {string|null} - Client ID or null if not found
 */
function getClientId() {
    // Try to get from page data attribute
    const clientIdElement = document.querySelector('[data-client-id]');
    if (clientIdElement && clientIdElement.dataset.clientId) {
        return clientIdElement.dataset.clientId;
    }
    
    // Try to get from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('client_id')) {
        return urlParams.get('client_id');
    }
    
    // Try to extract from URL path (e.g., /profiles/client/123/)
    const pathMatch = window.location.pathname.match(/\/client(?:\/|-)(\d+)/);
    if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
    }
    
    return null;
}

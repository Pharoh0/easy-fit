// Progress Reports JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize progress charts
    initProgressChart();

    // Initialize chart type selector
    initChartTypeSelector();

    // Auto dismiss alerts after 5 seconds
    dismissAlerts();
});

/**
 * Initialize the main progress chart
 */
function initProgressChart() {
    const ctx = document.getElementById('weightProgressChart');
    
    if (!ctx) return;
    
    // Default to weight data
    const labels = progressData.dates;
    const weightData = progressData.weights;
    
    // Create gradient for chart
    const chartContext = ctx.getContext('2d');
    const gradient = chartContext.createLinearGradient(0, 0, 0, ctx.height);
    gradient.addColorStop(0, 'rgba(58, 143, 254, 0.6)');
    gradient.addColorStop(1, 'rgba(58, 143, 254, 0.1)');
    
    // Create the chart
    window.progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: weightData,
                borderColor: '#3a8ffe',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3a8ffe',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#3a8ffe',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        color: '#6c757d'
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        color: '#6c757d',
                        precision: 1
                    }
                }
            }
        }
    });
}

/**
 * Initialize the chart type selector
 */
function initChartTypeSelector() {
    const chartTypeBtns = document.querySelectorAll('.chart-selector .btn');
    
    chartTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            chartTypeBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update the chart with the selected data type
            updateChartData(this.getAttribute('data-chart-type'));
        });
    });
}

/**
 * Update the chart data based on the selected type
 */
function updateChartData(dataType) {
    const chart = window.progressChart;
    if (!chart) return;
    
    let dataValues, label;
    
    // Get the correct data array and label based on the selected type
    switch(dataType) {
        case 'weight':
            dataValues = progressData.weights;
            label = 'Weight (kg)';
            break;
        case 'bmi':
            dataValues = progressData.bmis;
            label = 'BMI';
            break;
        case 'body_fat':
            dataValues = progressData.body_fats;
            label = 'Body Fat (%)';
            break;
        default:
            dataValues = progressData.weights;
            label = 'Weight (kg)';
    }
    
    // Create a min value that makes the chart look good (not starting at 0)
    const minValue = Math.floor(Math.min(...dataValues.filter(v => v !== null && v !== undefined)) * 0.95);
    
    // Update the chart data
    chart.data.datasets[0].data = dataValues;
    chart.data.datasets[0].label = label;
    
    // Update scales
    chart.options.scales.y.beginAtZero = false;
    
    // Set min value only for weight and body fat
    if (dataType === 'weight' || dataType === 'body_fat') {
        chart.options.scales.y.min = minValue;
    }
    
    // For BMI, we can start near 0
    if (dataType === 'bmi') {
        chart.options.scales.y.min = undefined;
    }
    
    // Update tooltip callback
    chart.options.plugins.tooltip.callbacks.label = function(context) {
        let label = context.dataset.label || '';
        if (label) {
            label += ': ';
        }
        if (context.parsed.y !== null) {
            label += context.parsed.y;
            
            // Add unit based on data type
            if (dataType === 'weight') {
                label += ' kg';
            } else if (dataType === 'body_fat') {
                label += '%';
            }
        }
        return label;
    };
    
    // Update the chart
    chart.update();
    
    // Add animation effect
    animateChart(chart);
}

/**
 * Add animation to chart when changing data
 */
function animateChart(chart) {
    const originalDatasets = chart.data.datasets;
    
    // Temporarily set data to 0 to animate
    chart.data.datasets.forEach(dataset => {
        const originalData = [...dataset.data];
        dataset.data = dataset.data.map(() => null);
        
        // Update without animation
        chart.update('none');
        
        // Restore data with animation
        setTimeout(() => {
            dataset.data = originalData;
            chart.update({
                duration: 800,
                easing: 'easeOutCubic'
            });
        }, 50);
    });
}

/**
 * Auto-dismiss alerts after a timeout
 */
function dismissAlerts() {
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
}

/**
 * Handle form submissions
 */
document.addEventListener('DOMContentLoaded', function() {
    const responseForm = document.querySelector('form[action*="add_report_response"]');
    const editResponseForm = document.querySelector('form[action*="edit_report_response"]');
    
    if (responseForm) {
        responseForm.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.classList.add('was-validated');
        });
    }
    
    if (editResponseForm) {
        editResponseForm.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.classList.add('was-validated');
        });
    }
});

/**
 * Progress Reports JavaScript for Client
 * Handles the client-side functionality for viewing and responding to progress reports
 */

// DOM Elements
let progressReportsContainer;
let progressReportDetailContainer;
let commentForm;
let loadingSpinner;
let errorContainer;
let subscriptionId;

// Initialize the progress reports list page
function initProgressReportsList() {
    progressReportsContainer = document.getElementById('progress-reports-list');
    loadingSpinner = document.getElementById('loading-spinner');
    errorContainer = document.getElementById('error-container');
    subscriptionId = progressReportsContainer.dataset.subscriptionId;
    
    // Fetch progress reports for this subscription
    fetchProgressReports();
}

// Initialize the progress report detail page
function initProgressReportDetail() {
    progressReportDetailContainer = document.getElementById('progress-report-detail');
    commentForm = document.getElementById('comment-form');
    loadingSpinner = document.getElementById('loading-spinner');
    errorContainer = document.getElementById('error-container');
    
    // Get the report ID from the container data attribute
    const reportId = progressReportDetailContainer.dataset.reportId;
    
    // Fetch the report details
    fetchProgressReportDetail(reportId);
    
    // Set up form submission for comments
    if (commentForm) {
        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitComment(reportId);
        });
    }
    
    // Initialize charts if measurement data exists
    if (window.progressData && progressData.dates.length > 0) {
        initCharts();
    }
}

// Fetch all progress reports for a subscription
async function fetchProgressReports() {
    if (!subscriptionId) return;
    
    showLoading(true);
    
    try {
        const reports = await progressReportService.getReportsBySubscription(subscriptionId);
        renderProgressReportsList(reports);
    } catch (error) {
        showError('Failed to load progress reports. Please try again later.');
        console.error('Error fetching progress reports:', error);
    } finally {
        showLoading(false);
    }
}

// Fetch a single progress report detail
async function fetchProgressReportDetail(reportId) {
    if (!reportId) return;
    
    showLoading(true);
    
    try {
        const report = await progressReportService.getReport(reportId);
        renderProgressReportDetail(report);
    } catch (error) {
        showError('Failed to load progress report details. Please try again later.');
        console.error('Error fetching progress report:', error);
    } finally {
        showLoading(false);
    }
}

// Submit a comment on a progress report
async function submitComment(reportId) {
    const commentTextarea = document.getElementById('client-comment');
    const comment = commentTextarea.value.trim();
    
    if (!comment) {
        showError('Please enter a comment before submitting.');
        return;
    }
    
    showLoading(true);
    
    try {
        const updatedReport = await progressReportService.addComment(reportId, comment);
        
        // Show success message
        showSuccess('Your comment has been submitted successfully!');
        
        // Optionally update the UI with the submitted comment
        document.getElementById('current-comment').textContent = comment;
        
        // Reset the form
        commentForm.reset();
        
        // Hide the form if needed
        // commentForm.classList.add('d-none');
    } catch (error) {
        showError('Failed to submit your comment. Please try again later.');
        console.error('Error submitting comment:', error);
    } finally {
        showLoading(false);
    }
}

// Render the list of progress reports
function renderProgressReportsList(reports) {
    if (!progressReportsContainer) return;
    
    // Clear the container
    progressReportsContainer.innerHTML = '';
    
    if (!reports || reports.length === 0) {
        progressReportsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h5>No Progress Reports Found</h5>
                <p>Your coach hasn't added any progress reports for this subscription yet.</p>
            </div>
        `;
        return;
    }
    
    // Create report cards
    reports.forEach(report => {
        const reportCard = document.createElement('div');
        reportCard.className = 'report-card';
        reportCard.innerHTML = `
            <div class="report-header">
                <div class="report-title">
                    <h5>Week ${report.week_number} Progress Report</h5>
                    <span class="report-date">${formatDate(report.report_date)}</span>
                </div>
                <div class="report-rating">
                    ${generateStarRating(report.overall_progress)}
                </div>
            </div>
            <div class="report-body">
                <div class="report-stats">
                    <div class="stat">
                        <span class="stat-label">Workout Adherence</span>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: ${report.workout_adherence * 20}%" 
                                aria-valuenow="${report.workout_adherence}" aria-valuemin="0" aria-valuemax="5"></div>
                        </div>
                        <span class="stat-value">${report.workout_adherence}/5</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Diet Adherence</span>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: ${report.diet_adherence * 20}%" 
                                aria-valuenow="${report.diet_adherence}" aria-valuemin="0" aria-valuemax="5"></div>
                        </div>
                        <span class="stat-value">${report.diet_adherence}/5</span>
                    </div>
                </div>
                ${report.measurement ? `
                <div class="measurement-info">
                    <div class="measurement-item">
                        <i class="fas fa-weight"></i>
                        <span>${report.measurement.weight} kg</span>
                    </div>
                    ${report.measurement.bmi ? `
                    <div class="measurement-item">
                        <i class="fas fa-calculator"></i>
                        <span>BMI: ${report.measurement.bmi}</span>
                    </div>` : ''}
                    ${report.measurement.body_fat_percentage ? `
                    <div class="measurement-item">
                        <i class="fas fa-percentage"></i>
                        <span>Body Fat: ${report.measurement.body_fat_percentage}%</span>
                    </div>` : ''}
                </div>` : ''}
            </div>
            <div class="report-footer">
                <a href="/profiles/client/progress-report/${report.id}/" class="btn btn-primary">
                    <i class="fas fa-eye"></i> View Details
                </a>
                ${report.client_comment ? `
                <span class="badge bg-success">
                    <i class="fas fa-comment"></i> You responded
                </span>` : ''}
            </div>
        `;
        progressReportsContainer.appendChild(reportCard);
    });
}

// Render a single progress report detail
function renderProgressReportDetail(report) {
    if (!progressReportDetailContainer) return;
    
    // Update the report details
    document.getElementById('report-week').textContent = `Week ${report.week_number}`;
    document.getElementById('report-date').textContent = formatDate(report.report_date);
    document.getElementById('report-overall-progress').innerHTML = generateStarRating(report.overall_progress);
    document.getElementById('report-workout-adherence').textContent = `${report.workout_adherence}/5`;
    document.getElementById('report-diet-adherence').textContent = `${report.diet_adherence}/5`;
    document.getElementById('coach-comment').textContent = report.coach_comment || 'No comments provided.';
    
    // Handle client comment section
    const currentCommentElement = document.getElementById('current-comment');
    if (currentCommentElement) {
        if (report.client_comment) {
            currentCommentElement.textContent = report.client_comment;
            document.getElementById('comment-status').classList.remove('d-none');
            
            // Show edit button instead of comment form if there's already a comment
            const editButton = document.getElementById('edit-comment-btn');
            if (editButton) {
                editButton.classList.remove('d-none');
                commentForm.classList.add('d-none');
                
                // Add event listener to edit button
                editButton.addEventListener('click', function() {
                    // Show form and pre-fill with existing comment
                    commentForm.classList.remove('d-none');
                    document.getElementById('client-comment').value = report.client_comment;
                    editButton.classList.add('d-none');
                });
            }
        } else {
            document.getElementById('comment-status').classList.add('d-none');
            commentForm.classList.remove('d-none');
        }
    }
    
    // Update measurement data if available
    if (report.measurement) {
        const measurementElement = document.getElementById('measurement-data');
        if (measurementElement) {
            measurementElement.innerHTML = `
                <div class="measurement-item">
                    <i class="fas fa-weight"></i>
                    <span>Weight: ${report.measurement.weight} kg</span>
                </div>
                ${report.measurement.height ? `
                <div class="measurement-item">
                    <i class="fas fa-ruler-vertical"></i>
                    <span>Height: ${report.measurement.height} cm</span>
                </div>` : ''}
                ${report.measurement.bmi ? `
                <div class="measurement-item">
                    <i class="fas fa-calculator"></i>
                    <span>BMI: ${report.measurement.bmi}</span>
                </div>` : ''}
                ${report.measurement.body_fat_percentage ? `
                <div class="measurement-item">
                    <i class="fas fa-percentage"></i>
                    <span>Body Fat: ${report.measurement.body_fat_percentage}%</span>
                </div>` : ''}
                ${report.measurement.muscle_mass ? `
                <div class="measurement-item">
                    <i class="fas fa-dumbbell"></i>
                    <span>Muscle Mass: ${report.measurement.muscle_mass} kg</span>
                </div>` : ''}
            `;
            measurementElement.classList.remove('d-none');
        }
    } else {
        const measurementElement = document.getElementById('measurement-data');
        if (measurementElement) {
            measurementElement.classList.add('d-none');
        }
    }
}

// Initialize charts for the progress report detail
function initCharts() {
    // Weight chart
    const weightChartCanvas = document.getElementById('weight-chart');
    if (weightChartCanvas && progressData.weights.length > 0) {
        new Chart(weightChartCanvas, {
            type: 'line',
            data: {
                labels: progressData.dates,
                datasets: [{
                    label: 'Weight (kg)',
                    data: progressData.weights,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // BMI chart
    const bmiChartCanvas = document.getElementById('bmi-chart');
    if (bmiChartCanvas && progressData.bmis.length > 0) {
        new Chart(bmiChartCanvas, {
            type: 'line',
            data: {
                labels: progressData.dates,
                datasets: [{
                    label: 'BMI',
                    data: progressData.bmis,
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // Body fat chart
    const bodyFatChartCanvas = document.getElementById('body-fat-chart');
    if (bodyFatChartCanvas && progressData.body_fats.length > 0) {
        new Chart(bodyFatChartCanvas, {
            type: 'line',
            data: {
                labels: progressData.dates,
                datasets: [{
                    label: 'Body Fat (%)',
                    data: progressData.body_fats,
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}

// Helper function to generate star rating HTML
function generateStarRating(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    return starsHtml;
}

// Helper function to format dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Show loading spinner
function showLoading(show) {
    if (loadingSpinner) {
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

// Show error message
function showError(message) {
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    // Create success alert if it doesn't exist
    let successAlert = document.getElementById('success-alert');
    if (!successAlert) {
        successAlert = document.createElement('div');
        successAlert.id = 'success-alert';
        successAlert.className = 'alert alert-success alert-dismissible fade show';
        successAlert.setAttribute('role', 'alert');
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Close');
        
        successAlert.appendChild(closeButton);
        document.querySelector('.container').prepend(successAlert);
    }
    
    // Update message and show alert
    successAlert.innerHTML = message + successAlert.innerHTML.substring(successAlert.innerHTML.indexOf('<button'));
    
    // Hide after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(successAlert);
        bsAlert.close();
    }, 5000);
}

// Document ready function to initialize appropriate page functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and initialize accordingly
    if (document.getElementById('progress-reports-list')) {
        initProgressReportsList();
    } else if (document.getElementById('progress-report-detail')) {
        initProgressReportDetail();
    }
});

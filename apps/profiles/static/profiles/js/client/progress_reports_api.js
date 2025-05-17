/**
 * Progress Reports API JavaScript
 * Handles client-side functionality for fetching and displaying progress reports
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeProgressPage();
});

/**
 * Initialize the progress reports page
 */
async function initializeProgressPage() {
    // Check for progress reports list view
    const progressReportsList = document.getElementById('progress-reports-list');
    if (progressReportsList) {
        // Get subscription ID from URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const subscriptionId = urlParams.get('subscription_id');
        await loadProgressReports(subscriptionId);
    }
    
    // Check for single progress report view
    const progressReportDetail = document.getElementById('progress-report-detail');
    if (progressReportDetail) {
        const reportId = progressReportDetail.dataset.reportId;
        if (reportId) {
            await loadProgressReportDetail(reportId);
        }
    }
    
    // Set up event handlers
    setupEventHandlers();
}

/**
 * Load progress reports for a subscription
 */
async function loadProgressReports(subscriptionId) {
    try {
        showLoading(true);
        
        let endpoint = 'client-progress-reports/';
        if (subscriptionId && subscriptionId !== '0') {
            endpoint += `?subscription=${subscriptionId}`;
        }
        
        const reports = await fetchAPI(endpoint, 'GET');
        renderProgressReportsList(reports);
        
    } catch (error) {
        console.error('Error loading progress reports:', error);
        showError('Failed to load progress reports. Please try again later.');
    } finally {
        showLoading(false);
    }
}

/**
 * Load a single progress report
 */
async function loadProgressReportDetail(reportId) {
    try {
        showLoading(true);
        
        const report = await fetchAPI(`client-progress-reports/${reportId}/`, 'GET');
        renderProgressReportDetail(report);
        
    } catch (error) {
        console.error('Error loading progress report:', error);
        showError('Failed to load progress report. Please try again later.');
    } finally {
        showLoading(false);
    }
}

/**
 * Render a list of progress reports
 */
function renderProgressReportsList(reports) {
    const progressReportsList = document.getElementById('progress-reports-list');
    if (!progressReportsList) return;
    
    if (!reports || reports.length === 0) {
        progressReportsList.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h5>No Progress Reports</h5>
                <p class="text-muted">There are no progress reports available for this subscription.</p>
            </div>
        `;
        return;
    }
    
    // Sort reports by date (newest first)
    reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    let html = '';
    
    reports.forEach(report => {
        // Define status styles
        let statusClass = '';
        let statusIcon = '';
        switch (report.status) {
            case 'pending':
                statusClass = 'text-warning';
                statusIcon = 'fas fa-clock';
                break;
            case 'in_progress':
                statusClass = 'text-info';
                statusIcon = 'fas fa-spinner';
                break;
            case 'completed':
                statusClass = 'text-success';
                statusIcon = 'fas fa-check-circle';
                break;
        }
        
        html += `
            <div class="card progress-report-card mb-4">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-clipboard-list me-2"></i> 
                        Progress Report - ${formatDate(report.created_at)}
                    </h5>
                    <span class="badge ${statusClass}">
                        <i class="${statusIcon} me-1"></i> 
                        ${formatStatus(report.status)}
                    </span>
                </div>
                <div class="card-body">
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <p><strong>Coach:</strong> ${report.coach.user.first_name} ${report.coach.user.last_name}</p>
                            <p><strong>Submitted:</strong> ${formatDate(report.created_at)}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Plan:</strong> ${report.subscription.plan.name}</p>
                            <p><strong>Period:</strong> ${formatDate(report.period_start)} - ${formatDate(report.period_end)}</p>
                        </div>
                    </div>
                    <div class="progress-report-content">
                        <h6>Goals & Achievements</h6>
                        <p>${report.goals || 'No goals specified.'}</p>
                        
                        <h6>Coach's Notes</h6>
                        <p>${report.coach_notes || 'No notes from coach yet.'}</p>
                    </div>
                    <div class="text-end mt-3">
                        <a href="/profiles/client/progress-reports/report/${report.id}/" class="btn btn-primary">
                            <i class="fas fa-eye me-1"></i> View Full Report
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    
    progressReportsList.innerHTML = html;
}

/**
 * Render a single progress report detail
 */
function renderProgressReportDetail(report) {
    const progressReportDetail = document.getElementById('progress-report-detail');
    if (!progressReportDetail) return;
    
    // Define status styles
    let statusClass = '';
    let statusIcon = '';
    switch (report.status) {
        case 'pending':
            statusClass = 'text-warning';
            statusIcon = 'fas fa-clock';
            break;
        case 'in_progress':
            statusClass = 'text-info';
            statusIcon = 'fas fa-spinner';
            break;
        case 'completed':
            statusClass = 'text-success';
            statusIcon = 'fas fa-check-circle';
            break;
    }
    
    const reportHeader = document.getElementById('report-header');
    if (reportHeader) {
        reportHeader.innerHTML = `
            <h4 class="mb-0">Progress Report - ${formatDate(report.created_at)}</h4>
            <span class="badge ${statusClass}">
                <i class="${statusIcon} me-1"></i> 
                ${formatStatus(report.status)}
            </span>
        `;
    }
    
    const reportInfo = document.getElementById('report-info');
    if (reportInfo) {
        reportInfo.innerHTML = `
            <div class="info-item">
                <i class="fas fa-user-md"></i>
                <div>
                    <h6>Coach</h6>
                    <p>${report.coach.user.first_name} ${report.coach.user.last_name}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-clipboard-list"></i>
                <div>
                    <h6>Plan</h6>
                    <p>${report.subscription.plan.name}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-calendar-alt"></i>
                <div>
                    <h6>Period</h6>
                    <p>${formatDate(report.period_start)} - ${formatDate(report.period_end)}</p>
                </div>
            </div>
            <div class="info-item">
                <i class="fas fa-clock"></i>
                <div>
                    <h6>Submitted</h6>
                    <p>${formatDate(report.created_at)}</p>
                </div>
            </div>
        `;
    }
    
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
        reportContent.innerHTML = `
            <div class="report-section">
                <h5><i class="fas fa-bullseye me-2"></i>Goals & Achievements</h5>
                <div class="report-text">
                    ${report.goals || 'No goals specified.'}
                </div>
            </div>
            
            <div class="report-section">
                <h5><i class="fas fa-comment-dots me-2"></i>Coach's Notes</h5>
                <div class="report-text">
                    ${report.coach_notes || 'No notes from coach yet.'}
                </div>
            </div>
            
            <div class="report-section">
                <h5><i class="fas fa-chart-line me-2"></i>Progress Assessment</h5>
                <div class="report-text">
                    ${report.progress_assessment || 'No progress assessment available.'}
                </div>
            </div>
            
            <div class="report-section">
                <h5><i class="fas fa-tasks me-2"></i>Recommendations</h5>
                <div class="report-text">
                    ${report.recommendations || 'No recommendations available.'}
                </div>
            </div>
        `;
    }
    
    // Client response section
    const responseSection = document.getElementById('client-response-section');
    if (responseSection) {
        if (report.client_response) {
            responseSection.innerHTML = `
                <div class="client-response">
                    <h5><i class="fas fa-reply me-2"></i>Your Response</h5>
                    <div class="response-content">
                        <p>${report.client_response}</p>
                        <div class="response-date text-muted">
                            <small>Submitted on ${formatDate(report.client_response_date)}</small>
                        </div>
                    </div>
                </div>
            `;
        } else {
            responseSection.innerHTML = `
                <div class="add-response-form">
                    <h5><i class="fas fa-reply me-2"></i>Add Your Response</h5>
                    <form id="response-form">
                        <div class="mb-3">
                            <textarea class="form-control" id="client-response" rows="4" 
                                placeholder="Share your thoughts, questions, or feedback about this progress report..."></textarea>
                        </div>
                        <div class="text-end">
                            <button type="submit" class="btn btn-primary" id="submit-response-btn">
                                <i class="fas fa-paper-plane me-1"></i> Submit Response
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            // Add event listener for response form
            const responseForm = document.getElementById('response-form');
            if (responseForm) {
                responseForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    submitResponse(report.id);
                });
            }
        }
    }
}

/**
 * Submit a response to a progress report
 */
async function submitResponse(reportId) {
    const responseText = document.getElementById('client-response').value.trim();
    if (!responseText) {
        showError('Please enter your response before submitting.');
        return;
    }
    
    try {
        showLoading(true);
        
        const submitBtn = document.getElementById('submit-response-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Submitting...';
        }
        
        const result = await fetchAPI(`client-progress-reports/${reportId}/add-response/`, 'POST', {
            client_response: responseText
        });
        
        showSuccess('Your response has been submitted successfully!');
        
        // Reload the page after a short delay to show the updated report
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error submitting response:', error);
        showError('Failed to submit your response. Please try again later.');
        
        const submitBtn = document.getElementById('submit-response-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Submit Response';
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Set up event handlers
 */
function setupEventHandlers() {
    // Filter buttons for progress reports (if any)
    const filterButtons = document.querySelectorAll('.progress-filter-btn');
    if (filterButtons.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all filter buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Get filter value
                const filter = this.dataset.filter;
                
                // Apply filter to reports
                const reportCards = document.querySelectorAll('.progress-report-card');
                reportCards.forEach(card => {
                    const status = card.querySelector('.badge').textContent.trim().toLowerCase();
                    
                    if (filter === 'all' || status.includes(filter)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
}

/**
 * Format a date string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format status string
 */
function formatStatus(status) {
    if (!status) return 'Unknown';
    
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Show loading spinner
 */
function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;
    
    errorContainer.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = errorContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;
    
    errorContainer.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle me-2"></i> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    errorContainer.style.display = 'block';
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = errorContainer.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

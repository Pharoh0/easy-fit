/**
 * Plan Browse JavaScript
 * Handles plan browsing, filtering, and request functionality
 */

class PlanBrowseManager {
    constructor() {
        this.currentFilters = {};
        this.currentPage = 1;
        this.plansPerPage = 12;
        this.selectedPlan = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPlans();
    }

    bindEvents() {
        // Filter toggle
        document.getElementById('filterToggle')?.addEventListener('click', () => {
            const filtersSection = document.getElementById('filtersSection');
            filtersSection.style.display = filtersSection.style.display === 'none' ? 'block' : 'none';
        });

        // Apply filters
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Refresh plans
        document.getElementById('refreshPlans')?.addEventListener('click', () => {
            this.loadPlans();
        });

        // Plan request form
        document.getElementById('planRequestForm')?.addEventListener('submit', (e) => {
            this.handlePlanRequest(e);
        });

        // Request plan button
        document.getElementById('requestPlanBtn')?.addEventListener('click', () => {
            this.showPlanRequestModal();
        });
    }

    async loadPlans() {
        try {
            utils.showLoading('loadingSpinner');
            document.getElementById('plansContainer').innerHTML = '';
            document.getElementById('noResults').style.display = 'none';

            // Build query parameters
            const params = new URLSearchParams();
            
            // Add filters
            Object.keys(this.currentFilters).forEach(key => {
                if (this.currentFilters[key]) {
                    params.append(key, this.currentFilters[key]);
                }
            });

            // Add pagination
            params.append('page', this.currentPage);
            params.append('page_size', this.plansPerPage);

            const response = await api.get(`/plan-management/api/v1/product-plans/?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                this.renderPlans(data.results || data);
                
                if (data.results && data.results.length === 0) {
                    document.getElementById('noResults').style.display = 'block';
                }
            } else {
                utils.handleApiError(response, 'Failed to load plans');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load plans');
        } finally {
            utils.hideLoading('loadingSpinner');
        }
    }

    renderPlans(plans) {
        const container = document.getElementById('plansContainer');
        container.innerHTML = '';

        plans.forEach(plan => {
            const planCard = this.createPlanCard(plan);
            container.appendChild(planCard);
        });
    }

    createPlanCard(plan) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        col.innerHTML = `
            <div class="card h-100 plan-card" data-plan-id="${plan.id}">
                <div class="card-img-top position-relative">
                    <img src="${plan.image || '/static/images/default-plan.jpg'}" 
                         alt="${plan.name}" class="w-100" style="height: 200px; object-fit: cover;">
                    <div class="position-absolute top-0 end-0 m-2">
                        <span class="badge bg-primary">${plan.plan_type}</span>
                    </div>
                    ${plan.featured ? '<div class="position-absolute top-0 start-0 m-2"><span class="badge bg-warning">Featured</span></div>' : ''}
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${plan.name}</h5>
                    <p class="card-text text-muted flex-grow-1">${plan.description || 'No description available'}</p>
                    
                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">Coach:</small>
                            <strong>${plan.coach_name || 'Unknown'}</strong>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">Duration:</small>
                            <span>${plan.duration_days} days</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <small class="text-muted">Price:</small>
                            <strong class="text-primary">${utils.formatCurrency(plan.price)}</strong>
                        </div>
                        ${plan.rating_average ? `
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">Rating:</small>
                            <div>
                                ${this.renderStars(plan.rating_average)}
                                <small class="text-muted">(${plan.rating_count || 0})</small>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary btn-sm view-details-btn" data-plan-id="${plan.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn btn-primary btn-sm request-plan-btn" data-plan-id="${plan.id}">
                            <i class="fas fa-paper-plane"></i> Request Plan
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind events for this card
        col.querySelector('.view-details-btn').addEventListener('click', () => {
            this.showPlanDetails(plan.id);
        });

        col.querySelector('.request-plan-btn').addEventListener('click', () => {
            this.selectedPlan = plan;
            this.showPlanRequestModal();
        });

        return col;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let starsHtml = '';

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                starsHtml += '<i class="fas fa-star text-warning"></i>';
            } else if (i === fullStars && hasHalfStar) {
                starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
            } else {
                starsHtml += '<i class="far fa-star text-warning"></i>';
            }
        }

        return starsHtml;
    }

    async showPlanDetails(planId) {
        try {
            const response = await api.get(`/plan-management/api/v1/product-plans/${planId}/`);
            
            if (response.ok) {
                const plan = await response.json();
                this.renderPlanDetails(plan);
                
                const modal = new bootstrap.Modal(document.getElementById('planDetailsModal'));
                modal.show();

                // Load recent public reviews for this plan
                try {
                    await this.loadPlanReviews(plan.id);
                } catch (e) {
                    console.warn('Failed to load plan reviews', e);
                }
            } else {
                utils.handleApiError(response, 'Failed to load plan details');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load plan details');
        }
    }

    renderPlanDetails(plan) {
        const content = document.getElementById('planDetailsContent');
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <img src="${plan.image || '/static/images/default-plan.jpg'}" 
                         alt="${plan.name}" class="img-fluid rounded mb-3">
                </div>
                <div class="col-md-6">
                    <h4>${plan.name}</h4>
                    <p class="text-muted">${plan.description || 'No description available'}</p>
                    
                    <div class="mb-3">
                        <h6>Plan Details:</h6>
                        <ul class="list-unstyled">
                            <li><strong>Type:</strong> ${plan.plan_type}</li>
                            <li><strong>Duration:</strong> ${plan.duration_days} days</li>
                            <li><strong>Price:</strong> ${utils.formatCurrency(plan.price)}</li>
                            <li><strong>Coach:</strong> ${plan.coach_name}</li>
                            ${plan.rating_average ? `<li><strong>Rating:</strong> ${this.renderStars(plan.rating_average)} (${plan.rating_count} reviews)</li>` : ''}
                        </ul>
                    </div>
                </div>
            </div>
            
            ${plan.plan_items && plan.plan_items.length > 0 ? `
            <div class="mt-4">
                <h6>What's Included:</h6>
                <div class="row">
                    ${plan.plan_items.map(item => `
                        <div class="col-md-6 mb-2">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-check-circle text-success me-2"></i>
                                <span>${item.name}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="mt-4">
                <h6>Recent Reviews</h6>
                <div class="table-responsive">
                    <table id="planReviewsTable" class="table table-striped align-middle" style="width:100%">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>By</th>
                                <th>Rating</th>
                                <th>Review</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div class="text-end mt-2">
                    <a class="btn btn-outline-primary btn-sm" id="viewAllReviewsBtn" href="/plan-management/client/ratings/?tab=all-ratings&plan_id=${plan.id}" target="_self">View All Reviews</a>
                </div>
            </div>
        `;

        this.selectedPlan = plan;
    }

    async loadPlanReviews(planId) {
        const tableEl = document.getElementById('planReviewsTable');
        if (!tableEl) return;
        try {
            const resp = await api.get(`/plan-management/api/v1/plan-ratings/?public_only=true&plan_id=${planId}&page_size=5`);
            if (!resp.ok) {
                console.warn('Ratings list failed', resp.status);
                return;
            }
            const data = await resp.json();
            const items = data.results || data || [];
            const rows = items.map(r => ({
                date: utils.formatDate(r.created_at),
                by: r.client?.full_name || r.client?.username || 'Client',
                rating: r.overall_rating,
                review: (r.review_content || r.review_title || '').toString().substring(0, 180)
            }));
            // Initialize or reload DataTable
            if ($.fn.DataTable.isDataTable('#planReviewsTable')) {
                const dt = $('#planReviewsTable').DataTable();
                dt.clear().rows.add(rows).draw();
            } else {
                $('#planReviewsTable').DataTable({
                    paging: false,
                    searching: false,
                    info: false,
                    data: rows,
                    columns: [
                        { data: 'date' },
                        { data: 'by' },
                        { data: 'rating', render: (v) => this.renderStars(v) },
                        { data: 'review' }
                    ],
                    order: [[0, 'desc']]
                });
            }
        } catch (e) {
            console.warn('Failed to render plan reviews', e);
        }
    }

    async showPlanRequestModal() {
        if (!this.selectedPlan) {
            utils.showToast('Please select a plan first', 'warning');
            return;
        }

        try {
            // Pre-check for existing pending request for this plan
            const listRes = await PlanRequestsAPI.list({ plan: this.selectedPlan.id, pending_only: 'true', page_size: 1 });
            if (listRes.success && listRes.requests && listRes.requests.length > 0) {
                const pending = listRes.requests[0];
                const confirmed = await utils.confirm({
                    title: 'Pending Request Exists',
                    message: 'You already have a pending request for this plan. Do you want to cancel it and continue?',
                    confirmText: 'Cancel & Continue',
                    variant: 'danger'
                });
                if (!confirmed) return;

                const cancelRes = await PlanRequestsAPI.cancel(pending.id);
                if (!cancelRes.success) {
                    const msg = this._extractErrorMessage(cancelRes);
                    utils.showToast(msg || 'Failed to cancel existing request', 'danger');
                    return;
                }
                utils.showToast('Previous pending request cancelled. You can proceed now.', 'success');
            }

            const modal = new bootstrap.Modal(document.getElementById('planRequestModal'));
            modal.show();
        } catch (error) {
            utils.handleApiError(error, 'Failed to prepare plan request');
        }
    }

    async handlePlanRequest(e) {
        e.preventDefault();
        
        if (!this.selectedPlan) {
            utils.showToast('No plan selected', 'danger');
            return;
        }

        const formData = new FormData(e.target);
        const requestData = {
            plan_id: this.selectedPlan.id,
            message: formData.get('message'),
            goals: formData.get('goals'),
            health_conditions: formData.get('health_conditions'),
            dietary_preferences: formData.get('dietary_preferences'),
            fitness_level: formData.get('fitness_level'),
            preferred_schedule: formData.get('preferred_schedule'),
            budget_range: formData.get('budget_range')
        };

        try {
            // Create plan request via API helper (handles JWT, CSRF, refresh)
            let createRes = await PlanRequestsAPI.create(requestData);
            if (createRes.success) {
                utils.showToast('Plan request sent successfully!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('planRequestModal'));
                modal && modal.hide();
                e.target.reset();
                this.selectedPlan = null;
                setTimeout(() => { window.location.href = '/plan-management/client/dashboard/'; }, 1200);
                return;
            }

            // Handle error cases gracefully
            const errMsg = this._extractErrorMessage(createRes).toLowerCase();
            if (errMsg.includes('pending request')) {
                // Offer to cancel existing pending request then retry
                const listRes = await PlanRequestsAPI.list({ plan: this.selectedPlan.id, pending_only: 'true', page_size: 1 });
                const pending = (listRes.success && listRes.requests && listRes.requests.length) ? listRes.requests[0] : null;
                if (pending) {
                    const confirmed = await utils.confirm({
                        title: 'Pending Request Exists',
                        message: 'You already have a pending request for this plan. Cancel it and send a new one?',
                        confirmText: 'Cancel & Retry',
                        variant: 'danger'
                    });
                    if (confirmed) {
                        const cancelRes = await PlanRequestsAPI.cancel(pending.id);
                        if (cancelRes.success) {
                            utils.showToast('Previous request cancelled. Sending new request...', 'info');
                            createRes = await PlanRequestsAPI.create(requestData);
                            if (createRes.success) {
                                utils.showToast('Plan request sent successfully!', 'success');
                                const modal = bootstrap.Modal.getInstance(document.getElementById('planRequestModal'));
                                modal && modal.hide();
                                e.target.reset();
                                this.selectedPlan = null;
                                setTimeout(() => { window.location.href = '/plan-management/client/dashboard/'; }, 1200);
                                return;
                            }
                        }
                        const msg = this._extractErrorMessage(cancelRes);
                        utils.showToast(msg || 'Failed to cancel existing request', 'danger');
                        return;
                    }
                    // User declined cancellation
                    return;
                }
            }

            if (errMsg.includes('active subscription')) {
                utils.showToast('You already have an active or pending subscription for this plan.', 'warning');
                setTimeout(() => { window.location.href = '/plan-management/client/dashboard/'; }, 1200);
                return;
            }

            utils.showToast(this._extractErrorMessage(createRes) || 'Failed to send plan request', 'danger');
        } catch (error) {
            utils.handleApiError(error, 'Failed to send plan request');
        }
    }

    // Helper: extract readable error message from APIBase error responses
    _extractErrorMessage(resp) {
        if (!resp) return 'Request failed';
        const raw = resp.error || resp.message || '';
        if (!raw) return 'Request failed';
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (typeof parsed.error === 'string') return parsed.error;
                // Collect first validation error if present
                const firstKey = Object.keys(parsed)[0];
                const v = parsed[firstKey];
                if (Array.isArray(v)) return String(v[0]);
                if (typeof v === 'string') return v;
                return JSON.stringify(parsed);
            }
        } catch (_) { /* not JSON */ }
        return String(raw);
    }

    applyFilters() {
        this.currentFilters = {
            plan_type: document.getElementById('planTypeFilter').value,
            price_range: document.getElementById('priceRangeFilter').value,
            duration: document.getElementById('durationFilter').value,
            min_rating: document.getElementById('ratingFilter').value
        };

        this.currentPage = 1;
        this.loadPlans();
        
        // Hide filters section
        document.getElementById('filtersSection').style.display = 'none';
    }

    clearFilters() {
        this.currentFilters = {};
        
        // Reset filter form
        document.getElementById('planTypeFilter').value = '';
        document.getElementById('priceRangeFilter').value = '';
        document.getElementById('durationFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        
        this.currentPage = 1;
        this.loadPlans();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PlanBrowseManager();
});

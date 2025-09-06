/**
 * Ratings JavaScript
 * Handles plan ratings, reviews, and rating management functionality
 */

class RatingsManager {
    constructor() {
        this.currentTab = 'my-ratings';
        this.selectedRating = null;
        this.selectedPlan = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRatings();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('#ratingsTabs button[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.currentTab = e.target.getAttribute('data-bs-target').replace('#', '');
                this.loadRatings();
            });
        });

        // Filter and refresh buttons
        document.getElementById('filterRatingsBtn')?.addEventListener('click', () => {
            this.showFiltersModal();
        });

        document.getElementById('refreshRatingsBtn')?.addEventListener('click', () => {
            this.loadRatings();
        });

        // Rate plan form
        document.getElementById('ratePlanForm')?.addEventListener('submit', (e) => {
            this.handleRatePlan(e);
        });

        // Coach response form
        document.getElementById('coachResponseForm')?.addEventListener('submit', (e) => {
            this.handleCoachResponse(e);
        });

        // Star rating interactions
        this.initializeStarRatings();

        // Mark helpful button
        document.getElementById('markHelpfulBtn')?.addEventListener('click', () => {
            this.markRatingHelpful();
        });
    }

    initializeStarRatings() {
        document.querySelectorAll('.rating-stars').forEach(ratingContainer => {
            const stars = ratingContainer.querySelectorAll('i');
            const ratingName = ratingContainer.dataset.rating;
            const hiddenInput = document.querySelector(`input[name="${ratingName}"]`);

            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    const rating = index + 1;
                    hiddenInput.value = rating;

                    // Update star display
                    stars.forEach((s, i) => {
                        if (i < rating) {
                            s.classList.remove('far');
                            s.classList.add('fas');
                            s.classList.add('text-warning');
                        } else {
                            s.classList.remove('fas');
                            s.classList.add('far');
                            s.classList.remove('text-warning');
                        }
                    });
                });

                star.addEventListener('mouseenter', () => {
                    const hoverRating = index + 1;
                    stars.forEach((s, i) => {
                        if (i < hoverRating) {
                            s.classList.add('text-warning');
                        } else {
                            s.classList.remove('text-warning');
                        }
                    });
                });
            });

            ratingContainer.addEventListener('mouseleave', () => {
                const currentRating = parseInt(hiddenInput.value) || 0;
                stars.forEach((s, i) => {
                    if (i < currentRating) {
                        s.classList.add('text-warning');
                    } else {
                        s.classList.remove('text-warning');
                    }
                });
            });
        });
    }

    async loadRatings() {
        try {
            utils.showLoading('ratingsLoadingSpinner');
            this.hideAllContainers();

            let endpoint = '';
            let container = '';
            const urlParams = new URLSearchParams(window.location.search);
            const planIdFilter = urlParams.get('plan_id');

            switch (this.currentTab) {
                case 'my-ratings':
                    endpoint = '/plan-management/api/v1/plan-ratings/';
                    container = 'myRatingsContainer';
                    break;
                case 'pending-ratings':
                    endpoint = '/plan-management/api/v1/plan-subscriptions/?status=completed&no_rating=true';
                    container = 'pendingRatingsContainer';
                    break;
                case 'all-ratings':
                    endpoint = '/plan-management/api/v1/plan-ratings/?public_only=true' + (planIdFilter ? `&plan_id=${planIdFilter}` : '');
                    container = 'allRatingsContainer';
                    break;
            }

            const response = await api.get(endpoint);
            
            if (response.ok) {
                const data = await response.json();
                
                if (this.currentTab === 'pending-ratings') {
                    this.renderPendingRatings(data.results || data, container);
                } else {
                    this.renderRatings(data.results || data, container);
                }
                
                if ((data.results || data).length === 0) {
                    document.getElementById('noRatingsFound').style.display = 'block';
                }
            } else {
                utils.handleApiError(response, 'Failed to load ratings');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load ratings');
        } finally {
            utils.hideLoading('ratingsLoadingSpinner');
        }
    }

    hideAllContainers() {
        document.getElementById('myRatingsContainer').innerHTML = '';
        document.getElementById('pendingRatingsContainer').innerHTML = '';
        document.getElementById('allRatingsContainer').innerHTML = '';
        document.getElementById('noRatingsFound').style.display = 'none';
    }

    renderRatings(ratings, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        ratings.forEach(rating => {
            const ratingCard = this.createRatingCard(rating);
            container.appendChild(ratingCard);
        });
    }

    renderPendingRatings(subscriptions, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        subscriptions.forEach(subscription => {
            const pendingCard = this.createPendingRatingCard(subscription);
            container.appendChild(pendingCard);
        });
    }

    createRatingCard(rating) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        const userRole = authManager.getUserRole();
        const isCoach = userRole === 'coach';

        col.innerHTML = `
            <div class="card h-100 rating-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="card-title mb-1">${rating.plan_name || 'Unknown Plan'}</h6>
                            <small class="text-muted">${isCoach ? rating.client_name : rating.coach_name}</small>
                        </div>
                        <div class="text-end">
                            <div class="rating-display mb-1">
                                ${this.renderStarsDisplay(rating.overall_rating)}
                            </div>
                            <small class="text-muted">${rating.overall_rating}/5</small>
                        </div>
                    </div>

                    ${rating.review_text ? `
                    <p class="card-text small text-muted mb-3">"${rating.review_text.substring(0, 100)}${rating.review_text.length > 100 ? '...' : ''}"</p>
                    ` : ''}

                    <div class="row text-center mb-3">
                        <div class="col-6">
                            <small class="text-muted d-block">Effectiveness</small>
                            <strong>${rating.effectiveness_rating || 'N/A'}</strong>
                        </div>
                        <div class="col-6">
                            <small class="text-muted d-block">Communication</small>
                            <strong>${rating.communication_rating || 'N/A'}</strong>
                        </div>
                    </div>

                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <small class="text-muted">
                            <i class="fas fa-calendar"></i> ${utils.formatDate(rating.created_at)}
                        </small>
                        ${rating.would_recommend ? 
                            '<small class="text-success"><i class="fas fa-thumbs-up"></i> Recommended</small>' : 
                            '<small class="text-warning"><i class="fas fa-thumbs-down"></i> Not Recommended</small>'
                        }
                    </div>

                    ${rating.coach_response ? `
                    <div class="coach-response p-2 bg-light rounded mb-3">
                        <small class="fw-bold text-primary">Coach Response:</small>
                        <p class="mb-0 small">${rating.coach_response.substring(0, 100)}${rating.coach_response.length > 100 ? '...' : ''}</p>
                    </div>
                    ` : ''}

                    <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary btn-sm view-rating-btn" data-rating-id="${rating.id}">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        ${isCoach && !rating.coach_response ? `
                        <button class="btn btn-primary btn-sm respond-rating-btn" data-rating-id="${rating.id}">
                            <i class="fas fa-reply"></i> Respond
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                ${rating.helpfulness_score ? `
                <div class="card-footer text-center">
                    <small class="text-muted">
                        <i class="fas fa-thumbs-up"></i> ${rating.helpfulness_score} found this helpful
                    </small>
                </div>
                ` : ''}
            </div>
        `;

        // Bind events
        col.querySelector('.view-rating-btn').addEventListener('click', () => {
            this.viewRatingDetails(rating.id);
        });

        col.querySelector('.respond-rating-btn')?.addEventListener('click', () => {
            this.showCoachResponseModal(rating);
        });

        return col;
    }

    createPendingRatingCard(subscription) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        col.innerHTML = `
            <div class="card h-100 pending-rating-card">
                <div class="card-body">
                    <div class="text-center mb-3">
                        <i class="fas fa-star fa-2x text-warning mb-2"></i>
                        <h6 class="card-title">${subscription.product_plan.name}</h6>
                        <small class="text-muted">Coach: ${subscription.product_plan.coach_name}</small>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <small class="text-muted">Completed:</small>
                            <small>${utils.formatDate(subscription.completed_at || subscription.updated_at)}</small>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <small class="text-muted">Duration:</small>
                            <small>${subscription.product_plan.duration_days} days</small>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Price:</small>
                            <small>${utils.formatCurrency(subscription.product_plan.price)}</small>
                        </div>
                    </div>

                    <div class="d-grid">
                        <button class="btn btn-primary rate-plan-btn" data-subscription-id="${subscription.id}">
                            <i class="fas fa-star"></i> Rate This Plan
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        col.querySelector('.rate-plan-btn').addEventListener('click', () => {
            this.showRatePlanModal(subscription);
        });

        return col;
    }

    renderStarsDisplay(rating) {
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

    showRatePlanModal(subscription) {
        this.selectedPlan = subscription;
        
        // Update modal content
        document.getElementById('planToRate').textContent = subscription.product_plan.name;
        document.getElementById('coachToRate').textContent = `Coach: ${subscription.product_plan.coach_name}`;
        
        // Reset form
        document.getElementById('ratePlanForm').reset();
        document.querySelectorAll('.rating-stars i').forEach(star => {
            star.classList.remove('fas', 'text-warning');
            star.classList.add('far');
        });
        document.querySelectorAll('input[type="hidden"]').forEach(input => {
            input.value = '';
        });

        const modal = new bootstrap.Modal(document.getElementById('ratePlanModal'));
        modal.show();
    }

    async handleRatePlan(e) {
        e.preventDefault();
        
        if (!this.selectedPlan) {
            utils.showToast('No plan selected for rating', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const ratingData = {
            subscription_id: this.selectedPlan.id,
            overall_rating: parseInt(formData.get('overall_rating')),
            effectiveness_rating: parseInt(formData.get('effectiveness_rating')) || null,
            communication_rating: parseInt(formData.get('communication_rating')) || null,
            value_for_money_rating: parseInt(formData.get('value_rating')) || null,
            review_title: '',
            review_content: formData.get('review_text') || '' ,
            is_public: formData.get('is_public') === 'on'
        };

        // Validate required rating
        if (!ratingData.overall_rating) {
            utils.showToast('Please provide an overall rating', 'warning');
            return;
        }

        try {
            // Prefer global APIBase if available
            if (window.APIBase && typeof APIBase.request === 'function') {
                const res = await APIBase.request('/plan-management/api/v1/plan-ratings/', {
                    method: 'POST',
                    body: JSON.stringify(ratingData)
                });
                if (res && res.success) {
                    utils.showToast('Rating submitted successfully!', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('ratePlanModal'));
                    modal.hide();
                    e.target.reset();
                    this.selectedPlan = null;
                    this.loadRatings();
                    return;
                } else {
                    throw new Error(res?.error || 'Failed to submit rating');
                }
            }
            const response = await api.post('/plan-management/api/v1/plan-ratings/', ratingData);
            
            if (response.ok) {
                utils.showToast('Rating submitted successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('ratePlanModal'));
                modal.hide();
                
                // Reset form
                e.target.reset();
                this.selectedPlan = null;
                
                // Refresh ratings
                this.loadRatings();
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to submit rating', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to submit rating');
        }
    }

    async viewRatingDetails(ratingId) {
        try {
            const response = await api.get(`/plan-management/api/v1/plan-ratings/${ratingId}/`);
            
            if (response.ok) {
                const rating = await response.json();
                this.renderRatingDetails(rating);
                
                const modal = new bootstrap.Modal(document.getElementById('viewRatingModal'));
                modal.show();
            } else {
                utils.handleApiError(response, 'Failed to load rating details');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to load rating details');
        }
    }

    renderRatingDetails(rating) {
        const content = document.getElementById('ratingDetailsContent');
        const userRole = authManager.getUserRole();
        const currentUserId = authManager.getUser()?.id;
        const canMarkHelpful = userRole !== 'coach' && rating.client_id !== currentUserId;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h5>${rating.plan_name}</h5>
                    <p class="text-muted mb-3">Coach: ${rating.coach_name}</p>
                    
                    <div class="rating-breakdown mb-4">
                        <div class="row text-center">
                            <div class="col-md-3 mb-3">
                                <div class="rating-item">
                                    <div class="rating-stars-display mb-1">
                                        ${this.renderStarsDisplay(rating.overall_rating)}
                                    </div>
                                    <small class="text-muted">Overall</small>
                                    <div class="fw-bold">${rating.overall_rating}/5</div>
                                </div>
                            </div>
                            ${rating.effectiveness_rating ? `
                            <div class="col-md-3 mb-3">
                                <div class="rating-item">
                                    <div class="rating-stars-display mb-1">
                                        ${this.renderStarsDisplay(rating.effectiveness_rating)}
                                    </div>
                                    <small class="text-muted">Effectiveness</small>
                                    <div class="fw-bold">${rating.effectiveness_rating}/5</div>
                                </div>
                            </div>
                            ` : ''}
                            ${rating.communication_rating ? `
                            <div class="col-md-3 mb-3">
                                <div class="rating-item">
                                    <div class="rating-stars-display mb-1">
                                        ${this.renderStarsDisplay(rating.communication_rating)}
                                    </div>
                                    <small class="text-muted">Communication</small>
                                    <div class="fw-bold">${rating.communication_rating}/5</div>
                                </div>
                            </div>
                            ` : ''}
                            ${rating.value_rating ? `
                            <div class="col-md-3 mb-3">
                                <div class="rating-item">
                                    <div class="rating-stars-display mb-1">
                                        ${this.renderStarsDisplay(rating.value_rating)}
                                    </div>
                                    <small class="text-muted">Value</small>
                                    <div class="fw-bold">${rating.value_rating}/5</div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    ${rating.review_text ? `
                    <div class="mb-4">
                        <h6>Review</h6>
                        <p class="text-muted">"${rating.review_text}"</p>
                    </div>
                    ` : ''}

                    ${rating.tags ? `
                    <div class="mb-4">
                        <h6>Tags</h6>
                        <div class="d-flex flex-wrap gap-1">
                            ${rating.tags.split(',').map(tag => `
                                <span class="badge bg-light text-dark">${tag.trim()}</span>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="col-md-4">
                    <div class="rating-meta">
                        <h6>Rating Details</h6>
                        <ul class="list-unstyled">
                            <li><strong>Client:</strong> ${rating.client_name}</li>
                            <li><strong>Date:</strong> ${utils.formatDate(rating.created_at)}</li>
                            <li><strong>Verified:</strong> ${rating.is_verified ? 'Yes' : 'No'}</li>
                            <li><strong>Recommended:</strong> ${rating.would_recommend ? 'Yes' : 'No'}</li>
                            ${rating.helpfulness_score ? `<li><strong>Helpful votes:</strong> ${rating.helpfulness_score}</li>` : ''}
                        </ul>
                    </div>
                </div>
            </div>

            ${rating.coach_response ? `
            <div class="mt-4 p-3 bg-light rounded">
                <h6 class="text-primary">
                    <i class="fas fa-reply"></i> Coach Response
                </h6>
                <p class="mb-2">${rating.coach_response}</p>
                <small class="text-muted">
                    Responded on ${utils.formatDate(rating.coach_response_at)}
                </small>
            </div>
            ` : ''}
        `;

        // Show/hide helpful button
        const helpfulBtn = document.getElementById('markHelpfulBtn');
        if (canMarkHelpful) {
            helpfulBtn.style.display = 'block';
            helpfulBtn.dataset.ratingId = rating.id;
        } else {
            helpfulBtn.style.display = 'none';
        }
    }

    showCoachResponseModal(rating) {
        this.selectedRating = rating;
        
        // Reset form
        document.getElementById('coachResponseForm').reset();
        
        const modal = new bootstrap.Modal(document.getElementById('coachResponseModal'));
        modal.show();
    }

    async handleCoachResponse(e) {
        e.preventDefault();
        
        if (!this.selectedRating) {
            utils.showToast('No rating selected', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const responseData = {
            response: formData.get('response')
        };

        try {
            const response = await api.post(`/plan-management/api/v1/plan-ratings/${this.selectedRating.id}/respond/`, responseData);
            
            if (response.ok) {
                utils.showToast('Response sent successfully!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('coachResponseModal'));
                modal.hide();
                
                // Reset form
                e.target.reset();
                this.selectedRating = null;
                
                // Refresh ratings
                this.loadRatings();
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to send response', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to send response');
        }
    }

    async markRatingHelpful() {
        const ratingId = document.getElementById('markHelpfulBtn').dataset.ratingId;
        
        if (!ratingId) return;

        try {
            const response = await api.post(`/plan-management/api/v1/plan-ratings/${ratingId}/mark_helpful/`, {
                is_helpful: true
            });
            
            if (response.ok) {
                utils.showToast('Marked as helpful!', 'success');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('viewRatingModal'));
                modal.hide();
                
                // Refresh ratings
                this.loadRatings();
            } else {
                const errorData = await response.json();
                utils.showToast(errorData.error || 'Failed to mark as helpful', 'danger');
            }
        } catch (error) {
            utils.handleApiError(error, 'Failed to mark as helpful');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RatingsManager();
});

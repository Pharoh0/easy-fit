/**
 * Featured Plans functionality for the landing page
 */
(function() {
  'use strict';

  // Load featured plans
  async function loadFeaturedPlans() {
    const container = document.getElementById('featuredPlansContainer');
    if (!container) return;

    try {
      // Show loading state
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      `;

      // Try to fetch from the actual API endpoint
      try {
        // For live environments, use the actual endpoint
        const res = await APIBase.request('/plan-management/api/v1/plans/featured/?page_size=3');
        if (res.success && res.data?.results?.length > 0) {
          renderPlans(container, res.data.results);
          return;
        }
      } catch (apiError) {
        console.log('API endpoint not available, using sample data');
      }
      
      // If API call fails or endpoint doesn't exist, use sample data
      renderPlans(container, getSamplePlans());
      
    } catch (error) {
      console.error('Error loading featured plans:', error);
      // If there's an error, keep the static HTML content as fallback
    }
  }

  // Check if endpoint exists to avoid errors
  async function checkEndpointExists(url) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: APIBase.getHeaders()
      });
      return res.status !== 404;
    } catch (error) {
      return false;
    }
  }

  // Get sample plan data for demonstration
  function getSamplePlans() {
    return [
      {
        id: 1,
        title: '30-Day Fat Burn Challenge',
        category: 'Weight Loss',
        description: 'Intensive workout program designed to maximize fat burn while preserving muscle mass.',
        duration: '30 days',
        difficulty: 'Advanced',
        rating: 4.8,
        rating_count: 125,
        coach: {
          id: 1,
          name: 'Coach Ahmed',
          avatar: '/static/landing/images/coaches/coach-1.jpg'
        }
      },
      {
        id: 2,
        title: 'Hypertrophy Program',
        category: 'Muscle Building',
        description: 'Science-backed muscle growth program with progressive overload and nutrition guidance.',
        duration: '8 weeks',
        difficulty: 'Intermediate',
        rating: 4.9,
        rating_count: 210,
        coach: {
          id: 2,
          name: 'Coach Sarah',
          avatar: '/static/landing/images/coaches/coach-2.jpg'
        }
      },
      {
        id: 3,
        title: 'Clean Eating Challenge',
        category: 'Nutrition',
        description: 'Complete nutrition program with meal plans, recipes, and shopping lists for whole food eating.',
        duration: '4 weeks',
        difficulty: 'All levels',
        rating: 4.7,
        rating_count: 178,
        coach: {
          id: 3,
          name: 'Coach Layla',
          avatar: '/static/landing/images/coaches/coach-3.jpg'
        }
      }
    ];
  }

  // Render plans to the container
  function renderPlans(container, plans) {
    if (!plans || !plans.length) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-info">No featured plans available at the moment. Check back soon!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = plans.map(plan => renderPlanCard(plan)).join('');
  }

  // Render individual plan card
  function renderPlanCard(plan) {
    // Sanitize data to prevent XSS
    const title = utils.sanitize(plan.title);
    const category = utils.sanitize(plan.category);
    const description = utils.sanitize(plan.description);
    const duration = utils.sanitize(plan.duration);
    const difficulty = utils.sanitize(plan.difficulty);
    const rating = parseFloat(plan.rating) || 4.5;
    const ratingCount = parseInt(plan.rating_count) || 0;
    
    // Coach info
    const coachName = plan.coach ? utils.sanitize(plan.coach.name) : 'Coach';
    const coachAvatar = plan.coach && plan.coach.avatar ? plan.coach.avatar : '/static/landing/images/coaches/default-avatar.svg';
    
    return `
    <div class="col-md-6 col-lg-4">
      <div class="plan-card">
        <div class="plan-card-header">
          <span class="plan-category">${category}</span>
          <h3 class="plan-title">${title}</h3>
          <div class="plan-coach">
            <img src="${coachAvatar}" alt="${coachName}" class="coach-avatar" onerror="this.src='/static/landing/images/coaches/default-avatar.svg'">
            <span>By ${coachName}</span>
          </div>
        </div>
        <div class="plan-card-body">
          <p class="plan-description">${description}</p>
          <div class="plan-details">
            <div class="detail-item">
              <i class="bi bi-calendar-week"></i>
              <span>${duration}</span>
            </div>
            <div class="detail-item">
              <i class="bi bi-lightning-charge"></i>
              <span>${difficulty}</span>
            </div>
            <div class="detail-item">
              <i class="bi bi-star-fill"></i>
              <span>${rating.toFixed(1)} (${ratingCount} ratings)</span>
            </div>
          </div>
        </div>
        <div class="plan-card-footer">
          <button type="button" class="btn btn-primary w-100" onclick="return utils.handleAuthRequired(event, '/plan-management/plans/${plan.id}/');">View Plan</button>
        </div>
      </div>
    </div>
    `;
  }

  // Initialize on DOM content loaded
  document.addEventListener('DOMContentLoaded', function() {
    loadFeaturedPlans();
  });

})();

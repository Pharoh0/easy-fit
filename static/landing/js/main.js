(function() {
  'use strict';

  // Utility Functions
  function sanitize(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAvatarSrc(item) {
    if (item.avatar) return item.avatar;
    try {
      const name = (item.user && item.user.username) ? item.user.username : 'Coach';
      return AvatarGenerator.generateAvatar(name, { size: 80 });
    } catch(e) {
      return '/static/landing/images/default-avatar.svg';
    }
  }

  // Navbar scroll behavior
  function handleNavbarScroll() {
    const mainNav = document.getElementById('mainNav');
    if (mainNav) {
      if (window.scrollY > 20) {
        mainNav.classList.add('navbar-scrolled');
      } else {
        mainNav.classList.remove('navbar-scrolled');
      }
    }
  }

  // Back to Top button behavior
  function handleBackToTop() {
    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
      if (window.scrollY > 300) {
        backToTopButton.classList.add('show');
      } else {
        backToTopButton.classList.remove('show');
      }
    }
  }

  // Smooth scrolling for anchor links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        
        // Skip for '#' only links
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          const navbarHeight = document.getElementById('mainNav').offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // Load featured coaches
  async function loadFeaturedCoaches() {
    const containerId = 'featuredCoachesContainer';
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await APIBase.request('/search/api/v1/search-coaches/?page_size=6&sort_by=experience_high');
      if (!res.success) throw new Error(res.error || 'Failed to load featured coaches');
      
      const data = res.data || { results: [] };
      const coaches = Array.isArray(data.results) ? data.results : [];
      
      if (!coaches.length) {
        container.innerHTML = `
          <div class="col-12">
            <div class="alert alert-info">No coaches found yet. Check back soon!</div>
          </div>
        `;
        return;
      }
      
      container.innerHTML = coaches.map(coach => renderCoachCard(coach)).join('');
    } catch (error) {
      console.error('Error loading featured coaches:', error);
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Unable to load featured coaches. Please try again later.
          </div>
        </div>
      `;
    }
  }

  // Render a coach card
  function renderCoachCard(coach) {
    const name = (coach.user && coach.user.username) ? coach.user.username : `Coach #${coach.id}`;
    const specialty = (coach.specialties && coach.specialties.trim()) ? coach.specialties.split(',')[0] : 'Fitness';
    const location = coach.city?.name || coach.region?.name || coach.country?.name || '';
    const price = (typeof coach.hourly_rate !== 'undefined' && coach.hourly_rate !== null) 
      ? utils.formatCurrency(coach.hourly_rate) 
      : '';
    const avatar = getAvatarSrc(coach);
    const experience = coach.years_of_experience || 0;
    
    // Generate random rating between 4.0 and 5.0 for demo purposes
    const rating = (Math.random() * 1 + 4).toFixed(1);
    const ratingStars = generateRatingStars(rating);
    
    return `
      <div class="col-md-6 col-lg-4">
        <div class="coach-card">
          <div class="p-4">
            <div class="coach-card-header">
              <img src="${sanitize(avatar)}" alt="${sanitize(name)}" class="coach-avatar">
              <div class="coach-card-info">
                <h5 class="coach-card-name">${sanitize(name)}</h5>
                <div class="small text-muted">
                  <i class="bi bi-geo-alt me-1"></i> ${sanitize(location || 'Location not specified')}
                </div>
              </div>
            </div>
            <div>
              <span class="coach-specialty-badge">${sanitize(specialty)}</span>
            </div>
            <div class="mt-3">
              <div class="coach-rating">${ratingStars}</div>
              <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="small text-muted">Experience: ${experience} years</div>
                <div class="fw-bold">${price ? sanitize(price) + '/hr' : 'Price on request'}</div>
              </div>
            </div>
            <a href="/profiles/coach-profile/${coach.id}/" class="btn btn-primary w-100 mt-3">View Profile</a>
          </div>
        </div>
      </div>
    `;
  }

  // Generate star rating HTML
  function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starsHtml += '<i class="bi bi-star-fill text-warning"></i> ';
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      starsHtml += '<i class="bi bi-star-half text-warning"></i> ';
    }
    
    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += '<i class="bi bi-star text-warning"></i> ';
    }
    
    return `${starsHtml} <span class="ms-1 small">${rating}</span>`;
  }

  // Initialize all functions on DOM content loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Initialize navbar scroll behavior
    window.addEventListener('scroll', function() {
      handleNavbarScroll();
      handleBackToTop();
    });
    
    // Initialize smooth scrolling
    initSmoothScroll();
    
    // Back to top button click handler
    const backToTopButton = document.getElementById('backToTop');
    if (backToTopButton) {
      backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
    
    // Load featured coaches
    loadFeaturedCoaches();
    
    // Trigger navbar state check on page load
    handleNavbarScroll();
  });
})();

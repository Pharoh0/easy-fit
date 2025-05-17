// Diet Requests JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Status filter functionality for request list
    const filterButtons = document.querySelectorAll('.status-filter .nav-link');
    const requestCards = document.querySelectorAll('.request-card');

    if (filterButtons.length > 0 && requestCards.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Show/hide request cards based on filter
                requestCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-status') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });

                // Update count in the filter buttons
                updateFilterCounts();
            });
        });

        // Initialize filter counts
        updateFilterCounts();
    }

    // Function to update the counts in filter buttons
    function updateFilterCounts() {
        const counts = {
            all: 0,
            open: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0
        };

        // Count visible requests by status
        requestCards.forEach(card => {
            const status = card.getAttribute('data-status');
            counts.all++;
            counts[status]++;
        });

        // Update the count in each filter button
        filterButtons.forEach(button => {
            const filter = button.getAttribute('data-filter');
            const countBadge = button.querySelector('.count-badge');
            if (countBadge) {
                countBadge.textContent = counts[filter];
            }
        });
    }

    // Form validation for create request form
    const createRequestForm = document.getElementById('createRequestForm');
    if (createRequestForm) {
        createRequestForm.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.classList.add('was-validated');
        });

        // Budget input formatting
        const budgetInput = document.getElementById('id_budget');
        if (budgetInput) {
            budgetInput.addEventListener('input', function() {
                // Remove any non-digit characters
                let value = this.value.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const decimalCount = (value.match(/\./g) || []).length;
                if (decimalCount > 1) {
                    const firstDecimalIndex = value.indexOf('.');
                    value = value.substring(0, firstDecimalIndex + 1) + 
                           value.substring(firstDecimalIndex + 1).replace(/\./g, '');
                }
                
                // Ensure only two decimal places
                if (value.includes('.')) {
                    const parts = value.split('.');
                    if (parts[1].length > 2) {
                        parts[1] = parts[1].substring(0, 2);
                        value = parts.join('.');
                    }
                }
                
                this.value = value;
            });
        }

        // Toggle relevant fields based on share measurements
        const shareMeasurementsCheckbox = document.getElementById('id_share_measurements');
        const measurementRelatedFields = document.getElementById('measurementRelatedFields');
        
        if (shareMeasurementsCheckbox && measurementRelatedFields) {
            function toggleMeasurementFields() {
                if (shareMeasurementsCheckbox.checked) {
                    measurementRelatedFields.classList.remove('d-none');
                } else {
                    measurementRelatedFields.classList.add('d-none');
                }
            }
            
            // Initial state
            toggleMeasurementFields();
            
            // Listen for changes
            shareMeasurementsCheckbox.addEventListener('change', toggleMeasurementFields);
        }
    }

    // Animation for offer items
    const offerItems = document.querySelectorAll('.offer-item');
    if (offerItems.length > 0) {
        offerItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 100 * index);
        });
    }

    // Confirm accept/reject offer actions
    const acceptOfferBtns = document.querySelectorAll('.accept-offer-btn');
    const rejectOfferBtns = document.querySelectorAll('.reject-offer-btn');
    
    acceptOfferBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to accept this offer? This will close your request and decline all other offers.')) {
                e.preventDefault();
            }
        });
    });
    
    rejectOfferBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to decline this offer?')) {
                e.preventDefault();
            }
        });
    });

    // Auto dismiss alerts after 5 seconds
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

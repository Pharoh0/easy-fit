// Coach Profile Edit JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the coach profile editor
    initializeCoachProfileEditor();
});

function initializeCoachProfileEditor() {
    setupFormHandlers();
    setupLocationCascading();
    setupAvatarPreview();
    setupGalleryManagement();
    setupCertificationManagement();
}

// Main form submission handler
function setupFormHandlers() {
    const mainForm = document.getElementById('coach-profile-form');
    if (mainForm) {
        mainForm.addEventListener('submit', handleMainFormSubmit);
    }

    // Modal form handlers
    const certForm = document.getElementById('certification-form');
    if (certForm) {
        certForm.addEventListener('submit', handleCertificationSubmit);
    }

    const clientPictureForm = document.getElementById('client-picture-form');
    if (clientPictureForm) {
        clientPictureForm.addEventListener('submit', handleClientPictureSubmit);
    }

    const coachPictureForm = document.getElementById('coach-picture-form');
    if (coachPictureForm) {
        coachPictureForm.addEventListener('submit', handleCoachPictureSubmit);
    }
}

// Handle main profile form submission
async function handleMainFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(form.action || window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        // Try to parse JSON; if fails, read text and show generic error
        let payload = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            payload = await response.json();
        } else {
            const text = await response.text();
            if (!response.ok) {
                console.error('Non-JSON error response:', text);
                throw new Error('Server error');
            }
        }

        if (response.ok) {
            showSuccessMessage('Profile updated successfully!');
            setTimeout(() => { window.location.reload(); }, 1200);
        } else {
            handleFormErrors(payload || { errors: { __all__: ['Unexpected server response'] } });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
    showErrorMessage('An error occurred while updating your profile. Please try again.');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Location cascading dropdowns
function setupLocationCascading() {
    const countrySelect = document.getElementById('id_country');
    const regionSelect = document.getElementById('id_region');
    const citySelect = document.getElementById('id_city');

    if (countrySelect) {
        countrySelect.addEventListener('change', function() {
            const countryId = this.value;
            updateRegions(countryId, regionSelect, citySelect);
        });
    }

    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const regionId = this.value;
            updateCities(regionId, citySelect);
        });
    }
}

async function updateRegions(countryId, regionSelect, citySelect) {
    if (!countryId) {
        clearSelect(regionSelect, 'Select a region');
        clearSelect(citySelect, 'Select a city');
        return;
    }

    try {
    const response = await fetch(`/profiles/api/v1/regions/?country_id=${countryId}`);
        const regions = await response.json();
        
        populateSelect(regionSelect, regions, 'Select a region');
        clearSelect(citySelect, 'Select a city');
    } catch (error) {
        console.error('Error fetching regions:', error);
    }
}

async function updateCities(regionId, citySelect) {
    if (!regionId) {
        clearSelect(citySelect, 'Select a city');
        return;
    }

    try {
    const response = await fetch(`/profiles/api/v1/cities/?region_id=${regionId}`);
        const cities = await response.json();
        
        populateSelect(citySelect, cities, 'Select a city');
    } catch (error) {
        console.error('Error fetching cities:', error);
    }
}

function clearSelect(selectElement, placeholder) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
}

function populateSelect(selectElement, items, placeholder) {
    selectElement.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        selectElement.appendChild(option);
    });
}

// Avatar preview functionality
function setupAvatarPreview() {
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');

    if (imageUpload && imagePreview) {
        imageUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showErrorMessage('Image file size must be less than 5MB');
                    this.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.style.backgroundImage = `url(${e.target.result})`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Certification management
function setupCertificationManagement() {
    // Delegated click handler for delete action inside dropdowns
    document.addEventListener('click', function(e) {
        const el = e.target.closest('[data-action="delete-cert"]');
        if (el) {
            e.preventDefault();
            const id = el.getAttribute('data-id');
            if (id) {
                deleteCertification(id);
            }
        }
    });
}

// Helpers: CSRF and messaging fallbacks
function getCsrfToken() {
    const tokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
    if (tokenInput) return tokenInput.value;
    // Fallback from cookie
    const name = 'csrftoken=';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.startsWith(name)) return decodeURIComponent(c.substring(name.length));
    }
    return '';
}

function showSuccessMessage(msg) {
    if (window.utils && window.utils.showToast) return window.utils.showToast(msg, 'success');
    if (window.showToast) return window.showToast(msg, 'success');
    alert(msg);
}

function showErrorMessage(msg) {
    if (window.utils && window.utils.showToast) return window.utils.showToast(msg, 'danger');
    if (window.showToast) return window.showToast(msg, 'danger');
    alert(msg);
}

function handleFormErrors(errorData) {
    console.error('Form errors:', errorData);
    const msg = (errorData && errorData.errors) ? JSON.stringify(errorData.errors) : 'Validation error';
    showErrorMessage(msg);
}

async function handleCertificationSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Show loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/profiles/api/v1/coach-certifications/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            const certification = await response.json();
            addCertificationToList(certification);
            bootstrap.Modal.getInstance(document.getElementById('addCertificationModal')).hide();
            form.reset();
            showSuccessMessage('Certification added successfully!');
        } else {
            const errorData = await response.json();
            handleFormErrors(errorData, form);
        }
    } catch (error) {
        console.error('Error adding certification:', error);
        showErrorMessage('An error occurred while adding the certification.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteCertification(certId) {
    const ok = await confirmAction('Are you sure you want to delete this certification?', { confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;

    try {
        const response = await fetch(`/profiles/api/v1/coach-certifications/${certId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            document.querySelector(`[data-cert-id="${certId}"]`).remove();
            showSuccessMessage('Certification deleted successfully!');
        } else {
            showErrorMessage('Failed to delete certification.');
        }
    } catch (error) {
        console.error('Error deleting certification:', error);
        showErrorMessage('An error occurred while deleting the certification.');
    }
}

// Gallery management
function setupGalleryManagement() {
    // Already handled in form submissions
}

async function handleClientPictureSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/profiles/api/v1/coach-client-pictures/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            const picture = await response.json();
            addClientPictureToGallery(picture);
            bootstrap.Modal.getInstance(document.getElementById('addClientPictureModal')).hide();
            form.reset();
            showSuccessMessage('Picture added successfully!');
        } else {
            const errorData = await response.json();
            handleFormErrors(errorData, form);
        }
    } catch (error) {
        console.error('Error adding picture:', error);
        showErrorMessage('An error occurred while adding the picture.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleCoachPictureSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Uploading...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/profiles/api/v1/coach-pictures/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            const picture = await response.json();
            addCoachPictureToGallery(picture);
            bootstrap.Modal.getInstance(document.getElementById('addCoachPictureModal')).hide();
            form.reset();
            showSuccessMessage('Picture added successfully!');
        } else {
            const errorData = await response.json();
            handleFormErrors(errorData, form);
        }
    } catch (error) {
        console.error('Error adding picture:', error);
        showErrorMessage('An error occurred while adding the picture.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteClientPicture(pictureId) {
    const ok = await confirmAction('Are you sure you want to delete this picture?', { confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;

    try {
        const response = await fetch(`/profiles/api/v1/coach-client-pictures/${pictureId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            document.querySelector(`[data-client-picture-id="${pictureId}"]`).remove();
            showSuccessMessage('Picture deleted successfully!');
        } else {
            showErrorMessage('Failed to delete picture.');
        }
    } catch (error) {
        console.error('Error deleting picture:', error);
        showErrorMessage('An error occurred while deleting the picture.');
    }
}

async function deleteCoachPicture(pictureId) {
    const ok = await confirmAction('Are you sure you want to delete this picture?', { confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;

    try {
        const response = await fetch(`/profiles/api/v1/coach-pictures/${pictureId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });

        if (response.ok) {
            document.querySelector(`[data-coach-picture-id="${pictureId}"]`).remove();
            showSuccessMessage('Picture deleted successfully!');
        } else {
            showErrorMessage('Failed to delete picture.');
        }
    } catch (error) {
        console.error('Error deleting picture:', error);
        showErrorMessage('An error occurred while deleting the picture.');
    }
}

// Helper functions
function addCertificationToList(certification) {
    const certList = document.getElementById('certifications-list');
    if (certList) {
        const certHtml = `
            <div class="col-md-6 col-lg-4 mb-3" data-cert-id="${certification.id}">
                <div class="certification-item border rounded p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${certification.description || 'Certification'}</h6>
                            <small class="text-muted">Status:
                                <span class="badge ${getStatusBadgeClass(certification.status)}">${certification.status ? certification.status.charAt(0).toUpperCase() + certification.status.slice(1) : 'Pending'}</span>
                            </small>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="${certification.file}" target="_blank" rel="noopener">
                                    <i class="fas fa-eye me-1"></i>View
                                </a></li>
                                <li><a class="dropdown-item text-danger" href="#" data-action="delete-cert" data-id="${certification.id}">
                                    <i class="fas fa-trash me-1"></i>Delete
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove empty state if exists
        const emptyState = certList.querySelector('.text-center.py-4');
        if (emptyState) {
            emptyState.parentElement.remove();
        }
        
        certList.insertAdjacentHTML('beforeend', certHtml);
    }
}

// Map status to badge class
function getStatusBadgeClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'approved':
            return 'bg-success';
        case 'rejected':
            return 'bg-danger';
        default:
            return 'bg-warning text-dark';
    }
}

// Promise-based confirmation using Bootstrap modal
function confirmAction(message, opts = {}) {
    return new Promise(resolve => {
        const modalEl = document.getElementById('confirmModal');
        if (!modalEl) {
            // Fallback
            resolve(window.confirm(message));
            return;
        }
        const msgEl = modalEl.querySelector('#confirmModalMessage');
        const confirmBtn = modalEl.querySelector('#confirmModalConfirmBtn');
        const bsModal = new bootstrap.Modal(modalEl);

        msgEl.textContent = message || 'Are you sure?';
        confirmBtn.textContent = opts.confirmText || 'Confirm';
        confirmBtn.className = `btn ${opts.confirmClass || 'btn-primary'}`;

        const onHide = () => {
            cleanup();
            resolve(false);
        };
        const onConfirm = () => {
            cleanup();
            resolve(true);
        };
        const cleanup = () => {
            modalEl.removeEventListener('hidden.bs.modal', onHide);
            confirmBtn.removeEventListener('click', onConfirm);
        };

        modalEl.addEventListener('hidden.bs.modal', onHide, { once: true });
        confirmBtn.addEventListener('click', () => {
            bsModal.hide();
            onConfirm();
        }, { once: true });

        bsModal.show();
    });
}

function addClientPictureToGallery(picture) {
    const gallery = document.getElementById('client-pictures-list');
    if (gallery) {
        const pictureHtml = `
            <div class="col-md-4 col-lg-3 mb-3" data-client-picture-id="${picture.id}">
                <div class="gallery-item">
                    <img src="${picture.image}" class="img-fluid rounded" alt="${picture.description || ''}">
                    <div class="gallery-item-overlay">
                        <button class="btn btn-sm btn-light" onclick="deleteClientPicture(${picture.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ${picture.description ? `<small class="text-muted d-block mt-1">${picture.description}</small>` : ''}
                </div>
            </div>
        `;
        
        // Remove empty state if exists
        const emptyState = gallery.querySelector('.text-center.py-4');
        if (emptyState) {
            emptyState.parentElement.remove();
        }
        
        gallery.insertAdjacentHTML('beforeend', pictureHtml);
    }
}

function addCoachPictureToGallery(picture) {
    const gallery = document.getElementById('coach-pictures-list');
    if (gallery) {
        const pictureHtml = `
            <div class="col-md-4 col-lg-3 mb-3" data-coach-picture-id="${picture.id}">
                <div class="gallery-item">
                    <img src="${picture.image}" class="img-fluid rounded" alt="${picture.description || ''}">
                    <div class="gallery-item-overlay">
                        <button class="btn btn-sm btn-light" onclick="deleteCoachPicture(${picture.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ${picture.description ? `<small class="text-muted d-block mt-1">${picture.description}</small>` : ''}
                </div>
            </div>
        `;
        
        // Remove empty state if exists
        const emptyState = gallery.querySelector('.text-center.py-4');
        if (emptyState) {
            emptyState.parentElement.remove();
        }
        
        gallery.insertAdjacentHTML('beforeend', pictureHtml);
    }
}

function handleFormErrors(errorData, form = null) {
    // Clear previous errors
    document.querySelectorAll('.text-danger.small').forEach(el => {
        if (el.textContent.includes('This field') || el.textContent.includes('Error:')) {
            el.remove();
        }
    });

    if (errorData.errors) {
        for (const [field, errors] of Object.entries(errorData.errors)) {
            const fieldElement = form ? 
                form.querySelector(`[name="${field}"]`) : 
                document.querySelector(`[name="${field}"]`);
            
            if (fieldElement) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-danger small';
                errorDiv.textContent = Array.isArray(errors) ? errors[0] : errors;
                fieldElement.parentElement.appendChild(errorDiv);
            }
        }
    }
}

function showSuccessMessage(message) {
    showToast(message, 'success');
}

function showErrorMessage(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

function getAccessToken() {
    return localStorage.getItem('access_token') || '';
}

// Make functions available globally
window.deleteCertification = deleteCertification;
window.deleteClientPicture = deleteClientPicture;
window.deleteCoachPicture = deleteCoachPicture;
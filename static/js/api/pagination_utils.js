/**
 * Pagination Utilities
 * Provides shared functionality for handling paginated API responses
 */

class PaginationUtils {
    /**
     * Render pagination controls
     * @param {Object} paginationData - Pagination data from API response
     * @param {string} containerId - ID of container element for pagination controls
     * @param {Function} onPageChange - Callback function when page is changed
     */
    static renderPagination(paginationData, containerId, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Extract pagination data
        const { count, next, previous, current_page, total_pages } = paginationData;
        
        // Create pagination HTML
        let html = `
            <nav aria-label="Page navigation">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${previous ? '' : 'disabled'}">
                        <a class="page-link" href="#" data-page="${current_page - 1}" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
        `;
        
        // Add page numbers
        for (let i = 1; i <= total_pages; i++) {
            // Show first page, last page, current page, and pages around current page
            if (i === 1 || i === total_pages || 
                (i >= current_page - 2 && i <= current_page + 2)) {
                html += `
                    <li class="page-item ${i === current_page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === current_page - 3 || i === current_page + 3) {
                // Add ellipsis for skipped pages
                html += `
                    <li class="page-item disabled">
                        <a class="page-link" href="#">...</a>
                    </li>
                `;
            }
        }
        
        html += `
                    <li class="page-item ${next ? '' : 'disabled'}">
                        <a class="page-link" href="#" data-page="${current_page + 1}" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div class="text-center text-muted small">
                Showing ${count > 0 ? ((current_page - 1) * paginationData.page_size) + 1 : 0} 
                to ${Math.min(current_page * paginationData.page_size, count)} 
                of ${count} entries
            </div>
        `;
        
        // Set HTML and add event listeners
        container.innerHTML = html;
        
        // Add click event listeners to pagination links
        const pageLinks = container.querySelectorAll('.page-link');
        pageLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (!isNaN(page) && page > 0 && page <= total_pages) {
                    onPageChange(page);
                }
            });
        });
    }
    
    /**
     * Get query parameters for pagination
     * @param {number} page - Page number
     * @param {number} pageSize - Page size
     * @param {Object} filters - Additional filters
     * @returns {string} Query string
     */
    static getPaginationQueryParams(page = 1, pageSize = 10, filters = {}) {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('page_size', pageSize);
        
        // Add filters
        for (const [key, value] of Object.entries(filters)) {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        }
        
        return params.toString();
    }
    
    /**
     * Create a debounced function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }
    
    /**
     * Initialize filter controls
     * @param {Object} filterConfig - Filter configuration
     * @param {Function} onFilterChange - Callback function when filters change
     */
    static initializeFilters(filterConfig, onFilterChange) {
        const { containerId, filters } = filterConfig;
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Create filter HTML
        let html = `<div class="row g-3 mb-4">`;
        
        // Add filter inputs
        for (const filter of filters) {
            const { id, type, label, options } = filter;
            
            html += `<div class="col-md-${filter.colSize || 3}">`;
            html += `<label for="${id}" class="form-label">${label}</label>`;
            
            if (type === 'select') {
                html += `
                    <select id="${id}" class="form-select filter-control" data-filter-id="${id}">
                        <option value="">All</option>
                        ${options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                    </select>
                `;
            } else if (type === 'date') {
                html += `
                    <input type="date" id="${id}" class="form-control filter-control" data-filter-id="${id}">
                `;
            } else if (type === 'daterange') {
                html += `
                    <div class="input-group">
                        <input type="date" id="${id}_from" class="form-control filter-control" data-filter-id="${id}_from" placeholder="From">
                        <span class="input-group-text">to</span>
                        <input type="date" id="${id}_to" class="form-control filter-control" data-filter-id="${id}_to" placeholder="To">
                    </div>
                `;
            } else {
                html += `
                    <input type="${type}" id="${id}" class="form-control filter-control" data-filter-id="${id}" placeholder="${label}">
                `;
            }
            
            html += `</div>`;
        }
        
        // Add reset button
        html += `
            <div class="col-md-auto align-self-end">
                <button id="reset-filters" class="btn btn-outline-secondary">Reset Filters</button>
            </div>
        `;
        
        html += `</div>`;
        
        // Set HTML
        container.innerHTML = html;
        
        // Create debounced filter change handler
        const debouncedFilterChange = this.debounce(() => {
            const filterValues = {};
            
            // Get filter values
            const filterControls = container.querySelectorAll('.filter-control');
            filterControls.forEach(control => {
                const filterId = control.dataset.filterId;
                filterValues[filterId] = control.value;
            });
            
            // Call callback
            onFilterChange(filterValues);
        }, 500);
        
        // Add event listeners to filter controls
        const filterControls = container.querySelectorAll('.filter-control');
        filterControls.forEach(control => {
            control.addEventListener('input', debouncedFilterChange);
            control.addEventListener('change', debouncedFilterChange);
        });
        
        // Add reset button event listener
        const resetButton = container.querySelector('#reset-filters');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                // Reset filter controls
                filterControls.forEach(control => {
                    control.value = '';
                });
                
                // Call callback
                onFilterChange({});
            });
        }
    }
}

// Make available globally
window.PaginationUtils = PaginationUtils;

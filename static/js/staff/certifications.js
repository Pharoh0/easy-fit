/**
 * Staff Certifications Controller
 * Handles certifications list, filtering, and approval/rejection actions
 */
document.addEventListener('DOMContentLoaded', function() {
    let certificationsTable = null;
    
    // Initialize certifications list
    function initCertifications() {
        initFilters();
        initTable();
    }

    // Initialize filter change handlers
    function initFilters() {
        const filterStatus = document.getElementById('filterStatus');
        
        // Initialize filter change handler
        if (filterStatus) {
            filterStatus.addEventListener('change', function() {
                if (certificationsTable) {
                    certificationsTable.ajax.reload();
                }
            });
        }
    }
    
    // Get current filter values
    function getCurrentFilters() {
        const filters = {};
        
        const status = document.getElementById('filterStatus');
        if (status && status.value) {
            filters.status = status.value;
        }
        
        return filters;
    }

    // Initialize DataTable
    function initTable() {
        const tableEl = document.getElementById('certificationsTable');
        if (!tableEl) {
            console.error("CertificationsTable element not found");
            return;
        }
        
        // Destroy existing table if it exists
        if (certificationsTable) {
            certificationsTable.destroy();
            certificationsTable = null;
        }
        
        try {
            // Initialize DataTable with server-side processing
            certificationsTable = $(tableEl).DataTable({
            processing: true,
            serverSide: true,
            pageLength: 10,
            ajax: function(data, callback, settings) {
                // Map DataTables pagination to API pagination
                const page = Math.floor(data.start / data.length) + 1;
                const pageSize = data.length;
                
                // Map search
                const search = data.search.value;
                
                // Map ordering
                let ordering = '';
                if (data.order && data.order.length > 0) {
                    const columnIdx = data.order[0].column;
                    const columnName = data.columns[columnIdx].name || data.columns[columnIdx].data;
                    if (columnName) {
                        ordering = data.order[0].dir === 'desc' ? `-${columnName}` : columnName;
                    }
                }
                
                // Get current filters
                const filters = getCurrentFilters();
                
                console.log('Fetching certifications with filters:', filters);
                
                // Fetch certifications with pagination, search, ordering, and filters
                StaffAPI.certifications.list({
                    page,
                    page_size: pageSize,
                    search,
                    ordering,
                    ...filters
                })
                .then(response => {
                    console.log('Certifications API response:', response);
                    
                    // Transform data for DataTables if needed
                    const results = response.results || [];
                    
                    // Return data to DataTables
                    callback({
                        draw: parseInt(data.draw) || 1,
                        recordsTotal: response.count || 0,
                        recordsFiltered: response.count || 0,
                        data: results
                    });
                })
                .catch(error => {
                    console.error("Error fetching certifications:", error);
                    window.utils.showToast('Failed to load certifications data', 'danger');
                    
                    // Return empty data with proper draw parameter
                    callback({
                        draw: parseInt(data.draw) || 1,
                        recordsTotal: 0,
                        recordsFiltered: 0,
                        data: []
                    });
                    
                    // Show user-friendly error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'alert alert-warning mt-3';
                    errorDiv.innerHTML = `<strong>Error loading certifications data:</strong> ${error.message || 'Server error, please try again'}`;
                    
                    const tableContainer = tableEl.closest('.dataTables_wrapper');
                    if (tableContainer) {
                        // Remove any existing error messages
                        const existingErrors = tableContainer.querySelectorAll('.alert-warning');
                        existingErrors.forEach(el => el.remove());
                        
                        // Insert error message before the table
                        tableContainer.insertBefore(errorDiv, tableContainer.firstChild);
                    }
                });
            },
            columns: [
                { 
                    data: 'coach_username', 
                    name: 'coach_profile__user__username', 
                    title: 'Coach'
                },
                { 
                    data: 'description',
                    name: 'description',
                    title: 'Description',
                    render: function(data) {
                        return data || '-';
                    }
                },
                { 
                    data: 'file',
                    name: 'file',
                    title: 'File',
                    render: function(data) {
                        if (!data) return '-';
                        const filename = data.split('/').pop();
                        return `<a href="${data}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark"></i> ${filename}</a>`;
                    }
                },
                { 
                    data: 'status',
                    name: 'status',
                    title: 'Status',
                    render: function(data) {
                        const statusMap = {
                            'pending': '<span class="badge bg-warning text-dark">Pending</span>',
                            'approved': '<span class="badge bg-success">Approved</span>',
                            'rejected': '<span class="badge bg-danger">Rejected</span>'
                        };
                        return statusMap[data] || data;
                    }
                },
                { 
                    data: 'verified_at',
                    name: 'verified_at',
                    title: 'Verified At',
                    render: function(data) {
                        if (!data) return '-';
                        return new Date(data).toLocaleDateString(undefined, {
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                },
                { 
                    data: 'verified_by_username',
                    name: 'verified_by__username',
                    title: 'Verified By',
                    render: function(data) {
                        return data || '-';
                    }
                },
                { 
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        // Actions vary by status
                        if (row.status === 'pending') {
                            return `<div class="dt-actions">
                                <button class="btn btn-sm btn-success approve-cert" data-cert-id="${data}">Approve</button>
                                <button class="btn btn-sm btn-danger reject-cert" data-cert-id="${data}">Reject</button>
                            </div>`;
                        }
                        // For approved/rejected, allow revert to pending
                        return `<div class="dt-actions">
                            <button class="btn btn-sm btn-warning revert-cert" data-cert-id="${data}">Revert to Pending</button>
                        </div>`;
                    }
                }
            ],
            columnDefs: [
                { className: 'text-center', targets: [3] },
                { className: 'text-nowrap', targets: [4, 6] }
            ],
            order: [[0, 'asc']], // Default sort by coach name
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            language: {
                zeroRecords: "No certifications found",
                emptyTable: "No certifications available",
                info: "Showing _START_ to _END_ of _TOTAL_ certifications",
                infoEmpty: "Showing 0 to 0 of 0 certifications",
                infoFiltered: "(filtered from _MAX_ total certifications)"
            },
            initComplete: function() {
                // Attach event handlers after table initialization
                attachActionHandlers();
            }
        });
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            window.utils.showToast('Failed to initialize certifications table', 'danger');
        }
    }
    
    // Attach handlers for action buttons
    function attachActionHandlers() {
        const tableEl = document.getElementById('certificationsTable');
        if (!tableEl) return;
        
        // Approve certification handler
        $(tableEl).on('click', '.approve-cert', async function() {
            const certId = $(this).data('cert-id');
            
            const notes = await window.utils.prompt({
                title: 'Approve Certification',
                message: 'Add optional notes about this certification approval:',
                inputType: 'textarea',
                confirmText: 'Approve',
                variant: 'success',
                required: false
            });
            
            if (notes !== null) {
                try {
                    await StaffAPI.certifications.approve(certId, { notes: notes || '' });
                    window.utils.showToast('Certification has been approved successfully', 'success');
                    certificationsTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error approving certification:', error);
                    window.utils.showToast('Failed to approve certification', 'danger');
                }
            }
        });
        
        // Reject certification handler
        $(tableEl).on('click', '.reject-cert', async function() {
            const certId = $(this).data('cert-id');
            
            const notes = await window.utils.prompt({
                title: 'Reject Certification',
                message: 'Please provide a reason for rejection:',
                inputType: 'textarea',
                confirmText: 'Reject',
                variant: 'danger',
                required: true,
                validate: function(value) {
                    if (!value || value.trim() === '') {
                        return 'Please provide a reason for rejection';
                    }
                    return null;
                }
            });
            
            if (notes !== null) {
                try {
                    await StaffAPI.certifications.reject(certId, { notes: notes });
                    window.utils.showToast('Certification has been rejected successfully', 'success');
                    certificationsTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error rejecting certification:', error);
                    window.utils.showToast('Failed to reject certification', 'danger');
                }
            }
        });

        // Revert certification handler
        $(tableEl).on('click', '.revert-cert', async function() {
            const certId = $(this).data('cert-id');

            const confirm = await window.utils.confirm({
                title: 'Revert to Pending',
                message: 'Are you sure you want to revert this certification to pending?',
                confirmText: 'Revert',
                variant: 'warning'
            });
            if (!confirm) return;

            const notes = await window.utils.prompt({
                title: 'Optional Notes',
                message: 'Add a note for the coach (optional):',
                inputType: 'textarea',
                confirmText: 'Submit',
                required: false
            });

            try {
                await StaffAPI.certifications.revert(certId, { notes: notes || '' });
                window.utils.showToast('Certification status reverted to pending', 'warning');
                certificationsTable.ajax.reload(null, false);
            } catch (error) {
                console.error('Error reverting certification:', error);
                window.utils.showToast('Failed to revert certification', 'danger');
            }
        });
    }

    // Function to test table with sample data
    function testTableWithSampleData() {
        // Sample data for testing
        const sampleCertifications = [
            {
                id: 1,
                coach_profile: {
                    id: 1,
                    user: {
                        username: 'coach1',
                        email: 'coach1@example.com'
                    }
                },
                coach_username: 'coach1',
                description: 'Personal Training Certificate',
                file: '/media/certifications/cert1.pdf',
                status: 'pending',
                verified_at: null,
                verified_by_username: null
            },
            {
                id: 2,
                coach_profile: {
                    id: 2,
                    user: {
                        username: 'coach2',
                        email: 'coach2@example.com'
                    }
                },
                coach_username: 'coach2',
                description: 'Nutrition Certificate',
                file: '/media/certifications/cert2.pdf',
                status: 'approved',
                verified_at: '2023-03-15T10:30:00Z',
                verified_by_username: 'admin'
            },
            {
                id: 3,
                coach_profile: {
                    id: 3,
                    user: {
                        username: 'coach3',
                        email: 'coach3@example.com'
                    }
                },
                coach_username: 'coach3',
                description: 'Fitness Specialist Certificate',
                file: '/media/certifications/cert3.pdf',
                status: 'rejected',
                verified_at: '2023-03-20T14:45:00Z',
                verified_by_username: 'admin'
            }
        ];

        const tableEl = document.getElementById('certificationsTable');
        if (!tableEl) return;

        // Clear any existing DataTable
        if (certificationsTable) {
            certificationsTable.destroy();
            certificationsTable = null;
        }

        // Initialize DataTable with sample data
        certificationsTable = $(tableEl).DataTable({
            data: sampleCertifications,
            columns: [
                { 
                    data: 'coach_username', 
                    name: 'coach_profile__user__username', 
                    title: 'Coach'
                },
                { 
                    data: 'description',
                    name: 'description',
                    title: 'Description',
                    render: function(data) {
                        return data || '-';
                    }
                },
                { 
                    data: 'file',
                    name: 'file',
                    title: 'File',
                    render: function(data) {
                        if (!data) return '-';
                        const filename = data.split('/').pop();
                        return `<a href="${data}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark"></i> ${filename}</a>`;
                    }
                },
                { 
                    data: 'status',
                    name: 'status',
                    title: 'Status',
                    render: function(data) {
                        const statusMap = {
                            'pending': '<span class="badge bg-warning text-dark">Pending</span>',
                            'approved': '<span class="badge bg-success">Approved</span>',
                            'rejected': '<span class="badge bg-danger">Rejected</span>'
                        };
                        return statusMap[data] || data;
                    }
                },
                { 
                    data: 'verified_at',
                    name: 'verified_at',
                    title: 'Verified At',
                    render: function(data) {
                        if (!data) return '-';
                        return new Date(data).toLocaleDateString(undefined, {
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    }
                },
                { 
                    data: 'verified_by_username',
                    name: 'verified_by__username',
                    title: 'Verified By',
                    render: function(data) {
                        return data || '-';
                    }
                },
                { 
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        // Only show actions for pending certifications
                        if (row.status !== 'pending') {
                            return '<span class="text-muted">No actions</span>';
                        }
                        
                        return `<div class="dt-actions">
                            <button class="btn btn-sm btn-success approve-cert" data-cert-id="${data}">Approve</button>
                            <button class="btn btn-sm btn-danger reject-cert" data-cert-id="${data}">Reject</button>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']]
        });

        // Show success message
        window.utils.showToast('Test data loaded successfully', 'success');
        console.log('Sample certifications data loaded:', sampleCertifications);
        
        // Attach event handlers
        attachActionHandlers();
        
        // Add test indicator
        const testBadge = document.createElement('div');
        testBadge.className = 'alert alert-info mb-3';
        testBadge.innerHTML = '<strong>Test Mode:</strong> Table is showing sample data for testing purposes';
        tableEl.parentNode.insertBefore(testBadge, tableEl);
    }

    // For testing purposes, add a test button to the DOM
    function addTestButton() {
        const controlsArea = document.querySelector('.dt-buttons');
        if (controlsArea) {
            const testButton = document.createElement('button');
            testButton.className = 'btn btn-info ms-2';
            testButton.innerHTML = 'Test with Sample Data';
            testButton.addEventListener('click', testTableWithSampleData);
            controlsArea.appendChild(testButton);
        } else {
            const tableEl = document.getElementById('certificationsTable');
            if (tableEl) {
                const testButton = document.createElement('button');
                testButton.className = 'btn btn-info mb-3';
                testButton.innerHTML = 'Test with Sample Data';
                testButton.addEventListener('click', testTableWithSampleData);
                tableEl.parentNode.insertBefore(testButton, tableEl);
            }
        }
    }

    // Initialize
    initCertifications();
    // Add test button only in dev mode
    if (localStorage.getItem('dev_mode') === '1') {
        setTimeout(addTestButton, 500);
    }
});

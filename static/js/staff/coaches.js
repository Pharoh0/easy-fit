/**
 * Staff Coaches Controller
 * Handles coaches list, filtering, and approval/rejection actions
 */
document.addEventListener('DOMContentLoaded', function() {
    let coachesTable = null;
    
    // Initialize coaches list
    function initCoaches() {
        initFilters();
        initTable();
    }

    // Initialize filter change handlers
    function initFilters() {
        const filterApproval = document.getElementById('filterApproval');
        const filterActive = document.getElementById('filterActive');
        
        // Initialize filter change handlers with debounce
        [filterApproval, filterActive].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', function() {
                    if (coachesTable) {
                        coachesTable.ajax.reload();
                    }
                });
            }
        });
    }
    
    // Get current filter values
    function getCurrentFilters() {
        const filters = {};
        
        const status = document.getElementById('filterApproval');
        if (status && status.value) {
            filters.approval_status = status.value;
        }
        
        const active = document.getElementById('filterActive');
        if (active && active.value !== '') {
            filters.user__is_active = active.value === 'true';
        }
        
        return filters;
    }

    // Initialize DataTable
    function initTable() {
        const tableEl = document.getElementById('coachesTable');
        if (!tableEl) {
            console.error("CoachesTable element not found");
            return;
        }
        
        // Destroy existing table if it exists
        if (coachesTable) {
            coachesTable.destroy();
            coachesTable = null;
        }
        
        try {
            // Initialize DataTable with server-side processing
            coachesTable = $(tableEl).DataTable({
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
                
                console.log('Fetching coaches with filters:', filters);
                
                // Fetch coaches with pagination, search, ordering, and filters
                StaffAPI.coaches.list({
                    page,
                    page_size: pageSize,
                    search,
                    ordering,
                    ...filters
                })
                .then(response => {
                    console.log('Coaches API response:', response);
                    
                    // Transform data for DataTables if needed
                    const results = Array.isArray(response.results) ? response.results : [];
                    
                    // Return data to DataTables
                    callback({
                        draw: parseInt(data.draw) || 1,
                        recordsTotal: response.count || 0,
                        recordsFiltered: response.count || 0,
                        data: results
                    });
                })
                .catch(error => {
                    console.error("Error fetching coaches:", error);
                    window.utils.showToast('Failed to load coaches data', 'danger');
                    
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
                    errorDiv.innerHTML = `<strong>Error loading coaches data:</strong> ${error.message || 'Server error, please try again'}`;
                    
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
                    data: null, 
                    name: 'user__username',
                    title: 'Username',
                    render: function(_data, _type, row) {
                        return (row.username) ? row.username : (row.user && row.user.username ? row.user.username : '-');
                    }
                },
                { 
                    data: null,
                    name: 'user__email',
                    title: 'Email',
                    render: function(_data, _type, row) {
                        return (row.email) ? row.email : (row.user && row.user.email ? row.user.email : '-');
                    }
                },
                { 
                    data: null,
                    name: 'user__is_active',
                    title: 'Active',
                    render: function(_data, _type, row) {
                        const isActive = (typeof row.is_active === 'boolean') ? row.is_active : (row.user ? !!row.user.is_active : false);
                        return isActive ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
                    }
                },
                { 
                    data: 'approval_status',
                    name: 'approval_status',
                    title: 'Approval',
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
                    data: 'years_of_experience',
                    name: 'years_of_experience',
                    title: 'Experience',
                    render: function(data) {
                        return data ? `${data} years` : '-';
                    }
                },
                { 
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        if (row.approval_status === 'pending') {
                            return `<div class="dt-actions">
                                <button class="btn btn-sm btn-success approve-coach" data-coach-id="${row.id}">Approve</button>
                                <button class="btn btn-sm btn-danger reject-coach" data-coach-id="${row.id}">Reject</button>
                            </div>`;
                        } else {
                            return `<div class="dt-actions">
                                <button class="btn btn-sm btn-warning revert-coach" data-coach-id="${row.id}">Revert to Pending</button>
                            </div>`;
                        }
                    }
                }
            ],

            columnDefs: [
                { className: 'text-center', targets: [2, 3] },
                { className: 'text-nowrap', targets: [5] }
            ],
            order: [[0, 'asc']], // Default sort by username
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            language: {
                zeroRecords: "No coaches found",
                emptyTable: "No coaches available",
                info: "Showing _START_ to _END_ of _TOTAL_ coaches",
                infoEmpty: "Showing 0 to 0 of 0 coaches",
                infoFiltered: "(filtered from _MAX_ total coaches)"
            },
            initComplete: function() {
                // Attach event handlers after table initialization
                attachActionHandlers();
            }
        });
        } catch (error) {
            console.error('Error initializing DataTable:', error);
            window.utils.showToast('Failed to initialize coaches table', 'danger');
        }
    }
    
    // Attach handlers for action buttons
    function attachActionHandlers() {
        const tableEl = document.getElementById('coachesTable');
        if (!tableEl) return;
        
        // Approve coach handler
        $(tableEl).on('click', '.approve-coach', async function() {
            const coachId = $(this).data('coach-id');
            try {
                // Single confirm determines whether to enable the user on approval
                const enableUser = await window.utils.confirm({
                    title: 'Approve Coach',
                    message: "Approve this coach? Click 'Approve + Enable' to also enable their user account.",
                    confirmText: 'Approve + Enable',
                    variant: 'success'
                });

                await StaffAPI.coaches.approve(coachId, { enable_user: enableUser });
                window.utils.showToast('Coach has been approved successfully', 'success');
                coachesTable.ajax.reload(null, false);
            } catch (error) {
                console.error('Error approving coach:', error);
                window.utils.showToast('Failed to approve coach', 'danger');
            }
        });
        
        // Reject coach handler
        $(tableEl).on('click', '.reject-coach', async function() {
            const coachId = $(this).data('coach-id');
            
            // Ask for optional reason
            const reason = await window.utils.prompt({
                title: 'Reject Coach Profile',
                message: 'Reason (optional):',
                inputType: 'textarea',
                confirmText: 'Reject Coach',
                variant: 'danger',
                required: false
            });

            const confirmed = await window.utils.confirm({
                title: 'Confirm Rejection',
                message: 'Are you sure you want to reject this coach profile?',
                confirmText: 'Reject',
                variant: 'danger'
            });
            
            if (confirmed) {
                try {
                    await StaffAPI.coaches.reject(coachId, { notes: reason || '' });
                    window.utils.showToast('Coach has been rejected successfully', 'success');
                    coachesTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error rejecting coach:', error);
                    window.utils.showToast('Failed to reject coach', 'danger');
                }
            }
        });

        // Revert coach approval status handler
        $(tableEl).on('click', '.revert-coach', async function() {
            const coachId = $(this).data('coach-id');
            const confirmed = await window.utils.confirm({
                title: 'Revert to Pending',
                message: 'Undo approve/reject and set status back to Pending?',
                confirmText: 'Revert',
                variant: 'warning'
            });
            if (!confirmed) return;

            const notes = await window.utils.prompt({
                title: 'Optional Notes',
                message: 'Add a note for the coach (optional):',
                inputType: 'textarea',
                confirmText: 'Submit',
                required: false
            });

            try {
                await StaffAPI.coaches.revert(coachId, { notes: notes || '' });
                window.utils.showToast('Coach status reverted to pending', 'warning');
                coachesTable.ajax.reload(null, false);
            } catch (error) {
                console.error('Error reverting coach:', error);
                window.utils.showToast('Failed to revert coach status', 'danger');
            }
        });
    }

    // Function to test table with sample data
    function testTableWithSampleData() {
        // Sample data for testing
        const sampleCoaches = [
            {
                id: 1,
                user: {
                    username: 'coach1',
                    email: 'coach1@example.com',
                    is_active: true
                },
                approval_status: 'pending',
                years_of_experience: 5,
                specialization: 'Weight Loss',
                bio: 'Professional trainer with 5 years of experience'
            },
            {
                id: 2,
                user: {
                    username: 'coach2',
                    email: 'coach2@example.com',
                    is_active: true
                },
                approval_status: 'approved',
                years_of_experience: 8,
                specialization: 'Muscle Building',
                bio: 'Expert in muscle building and nutrition'
            },
            {
                id: 3,
                user: {
                    username: 'coach3',
                    email: 'coach3@example.com',
                    is_active: false
                },
                approval_status: 'rejected',
                years_of_experience: 3,
                specialization: 'Yoga',
                bio: 'Specialized in yoga and meditation techniques'
            }
        ];

        const tableEl = document.getElementById('coachesTable');
        if (!tableEl) return;

        // Clear any existing DataTable
        if (coachesTable) {
            coachesTable.destroy();
            coachesTable = null;
        }

        // Initialize DataTable with sample data
        coachesTable = $(tableEl).DataTable({
            data: sampleCoaches,
            columns: [
                { 
                    data: 'user.username', 
                    name: 'user__username',
                    title: 'Username',
                    render: function(data, type, row) {
                        return row.user ? row.user.username : '-';
                    }
                },
                { 
                    data: 'user.email',
                    name: 'user__email',
                    title: 'Email',
                    render: function(data, type, row) {
                        return row.user ? row.user.email : '-';
                    }
                },
                { 
                    data: 'user.is_active',
                    name: 'user__is_active',
                    title: 'Active',
                    render: function(data, type, row) {
                        const isActive = row.user ? row.user.is_active : false;
                        return isActive ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
                    }
                },
                { 
                    data: 'approval_status',
                    name: 'approval_status',
                    title: 'Approval',
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
                    data: 'years_of_experience',
                    name: 'years_of_experience',
                    title: 'Experience',
                    render: function(data) {
                        return data ? `${data} years` : '-';
                    }
                },
                { 
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        // Only show actions for pending coaches
                        if (row.approval_status !== 'pending') {
                            return '<span class="text-muted">No actions</span>';
                        }
                        
                        return `<div class="dt-actions">
                            <button class="btn btn-sm btn-success approve-coach" data-coach-id="${row.id}">Approve</button>
                            <button class="btn btn-sm btn-danger reject-coach" data-coach-id="${row.id}">Reject</button>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']]
        });

        // Show success message
        window.utils.showToast('Test data loaded successfully', 'success');
        console.log('Sample coaches data loaded:', sampleCoaches);
        
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
            const tableEl = document.getElementById('coachesTable');
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
    initCoaches();
    // Add test button only in dev mode
    if (localStorage.getItem('dev_mode') === '1') {
        setTimeout(addTestButton, 500);
    }
});

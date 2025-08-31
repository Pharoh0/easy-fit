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
        const filterStatus = document.getElementById('filterStatus');
        const filterActive = document.getElementById('filterActive');
        
        // Initialize filter change handlers with debounce
        [filterStatus, filterActive].forEach(filter => {
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
        
        const status = document.getElementById('filterStatus');
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
        if (!tableEl) return;
        
        // Destroy existing table if it exists
        if (coachesTable) {
            coachesTable.destroy();
            coachesTable = null;
        }
        
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
                
                // Fetch coaches with pagination, search, ordering, and filters
                StaffAPI.coaches.list({
                    page,
                    page_size: pageSize,
                    search,
                    ordering,
                    ...filters
                })
                .then(response => {
                    // Return data to DataTables
                    callback({
                        draw: settings.sAjaxDataProp,
                        recordsTotal: response.count,
                        recordsFiltered: response.count,
                        data: response.results
                    });
                })
                .catch(error => {
                    console.error("Error fetching coaches:", error);
                    window.utils.showToast('Failed to load coaches data', 'danger');
                    
                    // Return empty data
                    callback({
                        draw: settings.sAjaxDataProp,
                        recordsTotal: 0,
                        recordsFiltered: 0,
                        data: []
                    });
                });
            },
            columns: [
                { 
                    data: 'id', 
                    name: 'id', 
                    title: 'ID'
                },
                { 
                    data: 'username', 
                    name: 'username',
                    title: 'Username'
                },
                { 
                    data: 'email',
                    name: 'email',
                    title: 'Email'
                },
                { 
                    data: 'years_of_experience',
                    name: 'years_of_experience',
                    title: 'Experience (Years)',
                    render: function(data) {
                        return data || '-';
                    }
                },
                { 
                    data: 'approval_status',
                    name: 'approval_status',
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
                    data: 'is_active',
                    name: 'user__is_active',
                    title: 'User Active',
                    render: function(data) {
                        return data ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
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
            columnDefs: [
                { className: 'text-center', targets: [4, 5] },
                { className: 'text-nowrap', targets: [6] }
            ],
            order: [[1, 'asc']], // Default sort by username
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
    }
    
    // Attach handlers for action buttons
    function attachActionHandlers() {
        const tableEl = document.getElementById('coachesTable');
        if (!tableEl) return;
        
        // Approve coach handler
        $(tableEl).on('click', '.approve-coach', async function() {
            const coachId = $(this).data('coach-id');
            
            const result = await window.utils.prompt({
                title: 'Approve Coach Profile',
                message: 'Would you also like to enable this coach\'s user account?',
                confirmText: 'Approve Coach',
                variant: 'success',
                inputType: 'none',
                defaultValue: 'true' // Default to enabling the user
            });
            
            if (result !== null) {
                try {
                    // Ask if the user account should also be enabled
                    const enableUser = await window.utils.confirm({
                        title: 'Enable User Account',
                        message: 'Would you also like to enable this coach\'s user account?',
                        confirmText: 'Yes, Enable User',
                        variant: 'success'
                    });
                    
                    await StaffAPI.coaches.approve(coachId, enableUser);
                    window.utils.showToast('Coach has been approved successfully', 'success');
                    coachesTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error approving coach:', error);
                    window.utils.showToast('Failed to approve coach', 'danger');
                }
            }
        });
        
        // Reject coach handler
        $(tableEl).on('click', '.reject-coach', async function() {
            const coachId = $(this).data('coach-id');
            
            const confirmed = await window.utils.confirm({
                title: 'Reject Coach Profile',
                message: 'Are you sure you want to reject this coach profile?',
                confirmText: 'Reject Coach',
                variant: 'danger'
            });
            
            if (confirmed) {
                try {
                    await StaffAPI.coaches.reject(coachId);
                    window.utils.showToast('Coach has been rejected successfully', 'success');
                    coachesTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error rejecting coach:', error);
                    window.utils.showToast('Failed to reject coach', 'danger');
                }
            }
        });
    }

    // Initialize
    initCoaches();
});

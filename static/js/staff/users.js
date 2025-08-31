/**
 * Staff Users Controller
 * Handles users list, filtering, and actions
 */
document.addEventListener('DOMContentLoaded', function() {
    let usersTable = null;
    const userTypeOptions = [
        { value: 'client', label: 'Client' },
        { value: 'coach', label: 'Coach' },
        { value: 'staff', label: 'Staff' }
    ];
    
    // Initialize users list
    function initUsers() {
        initFilters();
        initTable();
    }

    // Initialize filter change handlers
    function initFilters() {
        const filterUserType = document.getElementById('filterUserType');
        const filterActive = document.getElementById('filterActive');
        const filterEnabled = document.getElementById('filterEnabled');
        const filterWhitelisted = document.getElementById('filterWhitelisted');
        
        // Initialize filter change handlers with debounce
        [filterUserType, filterActive, filterEnabled, filterWhitelisted].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', function() {
                    if (usersTable) {
                        usersTable.ajax.reload();
                    }
                });
            }
        });
    }
    
    // Get current filter values
    function getCurrentFilters() {
        const filters = {};
        
        const userType = document.getElementById('filterUserType');
        if (userType && userType.value) {
            filters.user_type = userType.value;
        }
        
        const active = document.getElementById('filterActive');
        if (active && active.value !== '') {
            filters.is_active = active.value === 'true';
        }
        
        const enabled = document.getElementById('filterEnabled');
        if (enabled && enabled.value !== '') {
            filters.is_enabled = enabled.value === 'true';
        }
        
        const whitelisted = document.getElementById('filterWhitelisted');
        if (whitelisted && whitelisted.value !== '') {
            filters.is_whitelisted = whitelisted.value === 'true';
        }
        
        return filters;
    }

    // Initialize DataTable
    function initTable() {
        const tableEl = document.getElementById('usersTable');
        if (!tableEl) return;
        
        // Destroy existing table if it exists
        if (usersTable) {
            usersTable.destroy();
            usersTable = null;
        }
        
        // Initialize DataTable with server-side processing
        usersTable = $(tableEl).DataTable({
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
                
                // Fetch users with pagination, search, ordering, and filters
                StaffAPI.users.list({
                    page,
                    page_size: pageSize,
                    search,
                    ordering,
                    ...filters
                })
                .then(response => {
                    // Transform data for DataTables
                    const data = response.results.map(user => {
                        return {
                            ...user,
                            userTypeFormatted: formatUserType(user.user_type),
                            actions: user.id // We just need the ID for the actions column
                        };
                    });
                    
                    // Return data to DataTables
                    callback({
                        draw: settings.sAjaxDataProp,
                        recordsTotal: response.count,
                        recordsFiltered: response.count,
                        data: data
                    });
                })
                .catch(error => {
                    console.error("Error fetching users:", error);
                    window.utils.showToast('Failed to load users data', 'danger');
                    
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
                    data: 'first_name',
                    name: 'first_name', 
                    title: 'First Name',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                { 
                    data: 'last_name',
                    name: 'last_name',
                    title: 'Last Name',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                { 
                    data: 'userTypeFormatted',
                    name: 'user_type',
                    title: 'Type'
                },
                { 
                    data: 'is_active',
                    name: 'is_active',
                    title: 'Active',
                    render: function(data) {
                        return data ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
                    }
                },
                { 
                    data: 'is_enabled',
                    name: 'is_enabled',
                    title: 'Enabled',
                    render: function(data) {
                        return data ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
                    }
                },
                { 
                    data: 'is_whitelisted',
                    name: 'is_whitelisted',
                    title: 'Whitelisted',
                    render: function(data) {
                        return data ? 
                            '<span class="badge bg-success">Yes</span>' : 
                            '<span class="badge bg-danger">No</span>';
                    }
                },
                { 
                    data: 'actions',
                    title: 'Actions',
                    orderable: false,
                    render: function(data, type, row) {
                        const blockAction = row.is_active ? 
                            `<button class="btn btn-sm btn-danger block-user" data-user-id="${row.id}">Block</button>` : 
                            `<button class="btn btn-sm btn-success unblock-user" data-user-id="${row.id}">Unblock</button>`;
                        
                        const changeTypeBtn = `<button class="btn btn-sm btn-info change-user-type" data-user-id="${row.id}" data-current-type="${row.user_type}">Change Type</button>`;
                        
                        return `<div class="dt-actions">${blockAction} ${changeTypeBtn}</div>`;
                    }
                }
            ],
            columnDefs: [
                { className: 'text-center', targets: [6, 7, 8] },
                { className: 'text-nowrap', targets: [9] }
            ],
            order: [[1, 'asc']], // Default sort by username
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            language: {
                zeroRecords: "No users found",
                emptyTable: "No users available",
                info: "Showing _START_ to _END_ of _TOTAL_ users",
                infoEmpty: "Showing 0 to 0 of 0 users",
                infoFiltered: "(filtered from _MAX_ total users)"
            },
            initComplete: function() {
                // Attach event handlers after table initialization
                attachActionHandlers();
            }
        });
    }
    
    // Format user type for display
    function formatUserType(userType) {
        const types = {
            'client': '<span class="badge bg-primary">Client</span>',
            'coach': '<span class="badge bg-success">Coach</span>',
            'staff': '<span class="badge bg-warning text-dark">Staff</span>'
        };
        return types[userType] || `<span class="badge bg-secondary">${userType}</span>`;
    }
    
    // Attach handlers for action buttons
    function attachActionHandlers() {
        const tableEl = document.getElementById('usersTable');
        if (!tableEl) return;
        
        // Block user handler
        $(tableEl).on('click', '.block-user', async function() {
            const userId = $(this).data('user-id');
            
            const confirmed = await window.utils.confirm({
                title: 'Block User',
                message: 'Are you sure you want to block this user? They will no longer be able to login.',
                confirmText: 'Block User',
                variant: 'danger'
            });
            
            if (confirmed) {
                try {
                    await StaffAPI.users.block(userId);
                    window.utils.showToast('User has been blocked successfully', 'success');
                    usersTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error blocking user:', error);
                    window.utils.showToast('Failed to block user', 'danger');
                }
            }
        });
        
        // Unblock user handler
        $(tableEl).on('click', '.unblock-user', async function() {
            const userId = $(this).data('user-id');
            
            const confirmed = await window.utils.confirm({
                title: 'Unblock User',
                message: 'Are you sure you want to unblock this user? They will be able to login again.',
                confirmText: 'Unblock User',
                variant: 'success'
            });
            
            if (confirmed) {
                try {
                    await StaffAPI.users.unblock(userId);
                    window.utils.showToast('User has been unblocked successfully', 'success');
                    usersTable.ajax.reload(null, false);
                } catch (error) {
                    console.error('Error unblocking user:', error);
                    window.utils.showToast('Failed to unblock user', 'danger');
                }
            }
        });
        
        // Change user type handler
        $(tableEl).on('click', '.change-user-type', async function() {
            const userId = $(this).data('user-id');
            const currentType = $(this).data('current-type');
            
            // Build options HTML
            const optionsHtml = userTypeOptions.map(opt => 
                `<option value="${opt.value}" ${currentType === opt.value ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
            
            const result = await window.utils.prompt({
                title: 'Change User Type',
                message: `
                    <p>Select the new user type:</p>
                    <select class="form-select" id="newUserTypeSelect">
                        ${optionsHtml}
                    </select>
                `,
                confirmText: 'Change Type',
                variant: 'primary',
                required: true,
                // Custom validation to extract the select value
                validate: function() {
                    const selectEl = document.getElementById('newUserTypeSelect');
                    return selectEl ? null : 'Please select a user type';
                }
            });
            
            if (result !== null) {
                // Get the selected value from the dropdown
                const selectEl = document.getElementById('newUserTypeSelect');
                if (!selectEl) return;
                
                const newUserType = selectEl.value;
                
                // Only proceed if the type has changed
                if (newUserType !== currentType) {
                    try {
                        await StaffAPI.users.setUserType(userId, newUserType);
                        window.utils.showToast(`User type has been changed to ${newUserType}`, 'success');
                        usersTable.ajax.reload(null, false);
                    } catch (error) {
                        console.error('Error changing user type:', error);
                        window.utils.showToast('Failed to change user type', 'danger');
                    }
                }
            }
        });
    }

    // Initialize
    initUsers();
});

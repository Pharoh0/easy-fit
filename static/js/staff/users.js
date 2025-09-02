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
        if (!tableEl) {
            console.error("UsersTable element not found");
            return;
        }
        
        // Destroy existing table if it exists
        if (usersTable) {
            usersTable.destroy();
            usersTable = null;
        }
        
        try {
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
                
                console.log('Fetching users with filters:', filters);
                
                // Fetch users with pagination, search, ordering, and filters
                StaffAPI.users.list({
                    page,
                    page_size: pageSize,
                    search,
                    ordering,
                    ...filters
                })
                .then(response => {
                    console.log('Users API response:', response);
                    
                    // Transform data for DataTables
                    const results = Array.isArray(response.results) ? response.results : [];
                    console.log('User results length:', results.length);
                    
                    // Transform data for DataTables
                    const tableData = results.map(user => {
                        return {
                            ...user,
                            userTypeFormatted: formatUserType(user.user_type),
                            actions: user.id // We just need the ID for the actions column
                        };
                    });
                    
                    // Return data to DataTables
                    callback({
                        draw: parseInt(data.draw) || 1,
                        recordsTotal: response.count || 0,
                        recordsFiltered: response.count || 0,
                        data: tableData
                    });
                })
                .catch(error => {
                    console.error("Error fetching users:", error);
                    window.utils.showToast('Failed to load users data', 'danger');
                    
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
                    errorDiv.innerHTML = `<strong>Error loading data:</strong> ${error.message || 'Server error, please try again'}`;
                    
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
                    data: 'userTypeFormatted',
                    name: 'user_type',
                    title: 'User Type'
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
                    data: 'date_joined',
                    name: 'date_joined',
                    title: 'Date Joined',
                    render: function(data) {
                        return data ? new Date(data).toLocaleDateString() : '-';
                    }
                },
                { 
                    data: 'last_login',
                    name: 'last_login',
                    title: 'Last Login',
                    render: function(data) {
                        return data ? new Date(data).toLocaleDateString() : '-';
                    }
                },
                {
                    data: 'actions',
                    name: 'actions',
                    title: 'Actions',
                    orderable: false,
                    searchable: false,
                    render: renderActions
                }
            ],
            order: [[0, 'asc']], // Default sort by username
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
        } catch (error) {
            console.error('Error initializing DataTable:', error);
        }
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
    
    // Render action buttons for each user row
    function renderActions(data, type, row) {
        if (type !== 'display') return '';
        
        const isActive = row.is_active;
        const userId = row.id;
        const userType = row.user_type;
        const username = row.username;
        
        return `
            <div class="d-flex justify-content-center">
                ${isActive ? 
                    `<button class="btn btn-sm btn-outline-danger me-1 block-user" 
                        data-user-id="${userId}" 
                        data-username="${username}">
                        <i class="bi bi-x-octagon"></i> Block
                    </button>` :
                    `<button class="btn btn-sm btn-outline-success me-1 unblock-user" 
                        data-user-id="${userId}" 
                        data-username="${username}">
                        <i class="bi bi-check-circle"></i> Unblock
                    </button>`
                }
                <button class="btn btn-sm btn-outline-primary change-user-type" 
                        data-user-id="${userId}" 
                        data-username="${username}" 
                        data-current-type="${userType || ''}">
                    <i class="bi bi-person-gear"></i> Change Type
                </button>
            </div>
        `;
    }
    
    // Attach handlers for action buttons
    function attachActionHandlers() {
        const tableEl = document.getElementById('usersTable');
        if (!tableEl) return;
        
        // Block user handler
        $(tableEl).on('click', '.block-user', async function() {
            const userId = $(this).data('user-id');
            const username = $(this).data('username');
            
            // First get block reason
            const reason = await window.utils.prompt({
                title: `Block User: ${username}`,
                message: 'Please provide a reason for blocking this user:',
                inputType: 'textarea',
                placeholder: 'Reason for blocking',
                required: true,
                confirmText: 'Continue',
                variant: 'danger'
            });
            
            if (reason === null) return; // User cancelled
            
            // Then confirm block action
            // Escape reason to avoid XSS when rendering HTML
            const safeReason = String(reason).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
            const confirmed = await window.utils.confirm({
                title: 'Confirm Block User',
                message: `Are you sure you want to block this user? They will no longer be able to login.<br><br><strong>Reason:</strong> ${safeReason}`,
                confirmText: 'Block User',
                variant: 'danger',
                allowHTML: true
            });
            
            if (confirmed) {
                try {
                    const response = await StaffAPI.users.block(userId, reason);
                    if (response.success) {
                        window.utils.showToast('User has been blocked successfully', 'success');
                        usersTable.ajax.reload(null, false);
                    } else {
                        // Prefer structured APIBase error fields
                        let errorMsg = 'Unknown error';
                        if (response.errorJSON) {
                            const ej = response.errorJSON;
                            if (typeof ej === 'string') {
                                errorMsg = ej;
                            } else if (ej.detail) {
                                errorMsg = String(ej.detail);
                            } else if (ej.error) {
                                errorMsg = String(ej.error);
                            } else if (ej.message) {
                                errorMsg = String(ej.message);
                            } else if (Array.isArray(ej)) {
                                errorMsg = ej.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(', ');
                            } else {
                                try { errorMsg = JSON.stringify(ej); } catch (_) {}
                            }
                        } else if (typeof response.error === 'string') {
                            errorMsg = response.error;
                        }

                        const lower = (errorMsg || '').toLowerCase();
                        if (lower.includes('superuser')) {
                            window.utils.showToast('Cannot block a superuser account', 'warning');
                        } else if (response.status === 403 || lower.includes('permission')) {
                            window.utils.showToast('You do not have permission to perform this action', 'warning');
                        } else {
                            window.utils.showToast(`Failed to block user: ${errorMsg}`, 'danger');
                        }
                        console.error('Error blocking user:', { status: response.status, error: response.error, errorJSON: response.errorJSON });
                    }
                } catch (error) {
                    console.error('Error blocking user:', error);
                    window.utils.showToast('Failed to block user: Network or server error', 'danger');
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
            const newUserType = await window.utils.prompt({
                title: 'Change User Type',
                message: 'Select the new user type:',
                inputType: 'select',
                selectOptions: userTypeOptions,
                defaultValue: currentType,
                confirmText: 'Change Type',
                variant: 'primary',
                required: true
            });
            if (newUserType !== null && newUserType !== currentType) {
                try {
                    const response = await StaffAPI.users.setUserType(userId, newUserType);
                    if (response.success) {
                        window.utils.showToast(`User type has been changed to ${newUserType}`, 'success');
                        usersTable.ajax.reload(null, false);
                    } else {
                        // Prefer structured APIBase error fields
                        let errorMsg = 'Unknown error';
                        if (response.errorJSON) {
                            const ej = response.errorJSON;
                            if (typeof ej === 'string') {
                                errorMsg = ej;
                            } else if (ej.detail) {
                                errorMsg = String(ej.detail);
                            } else if (ej.error) {
                                errorMsg = String(ej.error);
                            } else if (ej.message) {
                                errorMsg = String(ej.message);
                            } else if (Array.isArray(ej)) {
                                errorMsg = ej.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(', ');
                            } else {
                                try { errorMsg = JSON.stringify(ej); } catch (_) {}
                            }
                        } else if (typeof response.error === 'string') {
                            errorMsg = response.error;
                        }

                        const lower = (errorMsg || '').toLowerCase();
                        if (lower.includes('superuser')) {
                            window.utils.showToast('Cannot change type of a superuser account', 'warning');
                        } else if (response.status === 403 || lower.includes('permission')) {
                            window.utils.showToast('You do not have permission to change this user type', 'warning');
                        } else {
                            window.utils.showToast(`Failed to change user type: ${errorMsg}`, 'danger');
                        }
                        console.error('Error changing user type:', { status: response.status, error: response.error, errorJSON: response.errorJSON });
                    }
                } catch (error) {
                    console.error('Error changing user type:', error);
                    window.utils.showToast('Failed to change user type: Network or server error', 'danger');
                }
            }
        });
    }

    // Function to test table with sample data
    function testTableWithSampleData() {
        // Sample data for testing
        const sampleUsers = [
            {
                id: 1,
                username: 'test_user1',
                email: 'user1@example.com',
                first_name: 'Test',
                last_name: 'User1',
                user_type: 'client',
                is_active: true,
                is_enabled: true,
                is_whitelisted: true,
                date_joined: '2023-01-01T00:00:00Z',
                last_login: '2023-02-01T00:00:00Z'
            },
            {
                id: 2,
                username: 'test_user2',
                email: 'user2@example.com',
                first_name: 'Test',
                last_name: 'User2',
                user_type: 'coach',
                is_active: true,
                is_enabled: false,
                is_whitelisted: true,
                date_joined: '2023-01-02T00:00:00Z',
                last_login: '2023-02-02T00:00:00Z'
            },
            {
                id: 3,
                username: 'test_user3',
                email: 'user3@example.com',
                first_name: 'Test',
                last_name: 'User3',
                user_type: 'staff',
                is_active: false,
                is_enabled: false,
                is_whitelisted: false,
                date_joined: '2023-01-03T00:00:00Z',
                last_login: null
            }
        ];

        const tableEl = document.getElementById('usersTable');
        if (!tableEl) return;

        // Clear any existing DataTable
        if (usersTable) {
            usersTable.destroy();
            usersTable = null;
        }

        // Initialize DataTable with sample data
        usersTable = $(tableEl).DataTable({
            data: sampleUsers,
            columns: [
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
                    title: 'First Name'
                },
                { 
                    data: 'last_name',
                    name: 'last_name',
                    title: 'Last Name'
                },
                { 
                    data: 'user_type',
                    name: 'user_type',
                    title: 'Type',
                    render: function(data) {
                        return formatUserType(data);
                    }
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
                    data: 'date_joined',
                    name: 'date_joined',
                    title: 'Joined',
                    render: function(data) {
                        return data ? new Date(data).toLocaleDateString() : '-';
                    }
                },
                { 
                    data: 'id',
                    title: 'Actions',
                    orderable: false,
                    render: function(_data, _type, row) {
                        const blockAction = row.is_active ? 
                            `<button class="btn btn-sm btn-danger block-user" data-user-id="${row.id}">Block</button>` : 
                            `<button class="btn btn-sm btn-success unblock-user" data-user-id="${row.id}">Unblock</button>`;
                        const changeTypeBtn = `<button class="btn btn-sm btn-info change-user-type" data-user-id="${row.id}" data-current-type="${row.user_type}">Change Type</button>`;
                        return `<div class="dt-actions">${blockAction} ${changeTypeBtn}</div>`;
                    }
                }
            ],
            order: [[0, 'asc']]
        });

        // Show success message
        window.utils.showToast('Test data loaded successfully', 'success');
        console.log('Sample data loaded:', sampleUsers);
        
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
            const tableEl = document.getElementById('usersTable');
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
    initUsers();
    // Add test button only in dev mode
    if (localStorage.getItem('dev_mode') === '1') {
        setTimeout(addTestButton, 500);
    }
});

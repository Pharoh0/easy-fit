/**
 * Coach Client Measurements Manager
 * Handles client measurement viewing and analysis for coaches
 */

class CoachMeasurementsManager {
    constructor() {
        this.authManager = window.authManager;
        this.currentClient = null;
        this.measurementChart = null;
        this.currentMeasurements = [];
        this.clients = [];
        this.filteredClients = [];
        this.subscriptionsTable = null;
        this.ratingsTable = null;
        this.dayReviewsTable = null;
        this.workoutReviewsTable = null;
        this.mealReviewsTable = null;
        this.exerciseReviewsTable = null;
        this.init();
    }
    
    async init() {
        this.bindEvents();
        // Ensure clients are loaded before attempting deep-link selection
        await this.loadClients();
        await this.handleDeepLinkIfPresent();
    }
    
    bindEvents() {
        // Client search
        const searchInputEl = document.getElementById('clientSearch');
        if (searchInputEl) {
            searchInputEl.addEventListener('input', this.debounce((event) => {
                const query = event.target.value.trim();
                this.searchClients(query);
            }, 300));
        }
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn && searchInputEl) {
            searchBtn.addEventListener('click', () => {
                const query = searchInputEl.value.trim();
                this.searchClients(query);
            });
        }
        
        // Client selector
        const clientSelector = document.getElementById('clientSelector');
        if (clientSelector) {
            // Use arrow to preserve context and avoid calling .bind on undefined
            clientSelector.addEventListener('change', (e) => this.onClientSelect(e));
        }
        
        // Call the chat button initialization
        this.initChatButtons();

        // Ratings subscription filter
        const ratingsFilter = document.getElementById('ratingsSubscriptionFilter');
        if (ratingsFilter) {
            ratingsFilter.addEventListener('change', () => {
                const subId = ratingsFilter.value || '';
                const clientId = this.currentClient && this.currentClient.id;
                if (clientId) {
                    this.loadAndRenderRatings(clientId, subId);
                }
                this.loadAndRenderDayFeedback(subId);
            });
        }

        // Ratings extra filters
    const ratingsMinStars = document.getElementById('ratingsMinStars');
        if (ratingsMinStars) {
            ratingsMinStars.addEventListener('change', () => {
                const subId = (ratingsFilter && ratingsFilter.value) || '';
                const clientId = this.currentClient && this.currentClient.id;
                if (clientId) this.loadAndRenderRatings(clientId, subId);
            });
        }
        // Verified-only filter removed from UI

        // Per-day feedback filters (reduced set)
        const perDayFilterIds = ['filterDateFrom','filterDateTo','filterMinStars','filterText'];
        perDayFilterIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.applyPerDayFilters());
                el.addEventListener('change', () => this.applyPerDayFilters());
            }
        });
        const resetBtn = document.getElementById('filterResetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                perDayFilterIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') el.value = '';
                });
                this.applyPerDayFilters();
            });
        }

        // Progress Photos: simple filter select handler
        const photoFilter = document.getElementById('photoViewFilter');
        if (photoFilter) {
            photoFilter.addEventListener('change', (e) => this.filterProgressPhotos(e.target.value));
        }

        // Fix Customize Plan dropdown positioning in header
        const customizeBtn = document.querySelector('#customizePlanGroup > .dropdown-toggle');
        const customizeGroup = document.getElementById('customizePlanGroup');
        if (customizeBtn && customizeGroup) {
            // On show: ensure alignment and flip if not enough space below
            customizeBtn.addEventListener('click', () => {
                setTimeout(() => {
                    const menu = document.getElementById('customizePlanDropdown');
                    if (!menu) return;
                    // Always keep right aligned
                    menu.classList.add('dropdown-menu-end');
                    // Flip to dropup when near bottom
                    const rect = menu.getBoundingClientRect();
                    const spaceBelow = window.innerHeight - rect.top;
                    const desired = Math.min(260, menu.scrollHeight) + 24; // menu height + offset
                    if (spaceBelow < desired) {
                        customizeGroup.classList.add('dropup');
                    } else {
                        customizeGroup.classList.remove('dropup');
                    }
                }, 0);
            });
        }
    }
    
    async loadClients() {
        try {
            this.showLoading();
            
            const response = await this.authManager.apiCall('/plan-management/api/v1/coach-client-access/my_clients/', {
                method: 'GET'
            });
            
            if (response.success) {
                this.clients = response.data.clients;
                this.populateClientSelector();
            } else {
                this.showError('Failed to load clients: ' + response.error);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
            this.showError('Failed to load clients');
        } finally {
            this.hideLoading();
        }
    }
    
    // --- Missing helpers restored ---
    getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }
    
    async handleDeepLinkIfPresent() {
        try {
            // Prefer direct client deep link
            const clientIdParam = this.getQueryParam('client_id');
            if (clientIdParam) {
                const selector = document.getElementById('clientSelector');
                if (selector) {
                    // ensure option exists
                    if (!selector.querySelector(`option[value="${clientIdParam}"]`)) {
                        this.populateClientSelector();
                    }
                    selector.value = String(clientIdParam);
                    await this.onClientSelect({ target: selector });
                    return;
                }
            }

            // Fallback: resolve client from subscription_id
            const subId = this.getQueryParam('subscription_id');
            if (!subId) return;

            let subscription = null;
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/plan-subscriptions/${subId}/`, { method: 'GET' });
            if (resp && resp.success && resp.data) {
                subscription = resp.data;
            }
            const clientId = subscription && (subscription.client_id || (subscription.client && subscription.client.id));
            if (!clientId) return;

            const selector = document.getElementById('clientSelector');
            if (!selector) return;
            if (!selector.querySelector(`option[value="${clientId}"]`)) {
                this.populateClientSelector();
            }
            selector.value = String(clientId);
            await this.onClientSelect({ target: selector });
        } catch (e) {
            console.warn('Deep link handling error:', e);
        }
    }

    populateClientSelector() {
        const selector = document.getElementById('clientSelector');
        if (!selector) return;
        selector.innerHTML = '<option value="">Choose a client...</option>';
        (this.clients || []).forEach(client => {
            const opt = document.createElement('option');
            opt.value = client.id;
            opt.textContent = `${client.full_name || client.username} (${client.username || ''})`;
            opt.dataset.client = JSON.stringify(client);
            selector.appendChild(opt);
        });
    }

    async searchClients(query) {
        if (!query || query.length < 2) {
            this.populateClientSelector();
            return;
        }
        try {
            const res = await this.authManager.apiCall(`/plan-management/api/v1/coach-client-access/client_search/?q=${encodeURIComponent(query)}`, { method: 'GET' });
            if (res && res.success && res.data && Array.isArray(res.data.clients)) {
                this.clients = res.data.clients;
                this.populateClientSelector();
            }
        } catch (e) {
            console.warn('Client search failed', e);
        }
    }

    async onClientSelect(event) {
        const clientId = event && event.target ? event.target.value : null;
        if (!clientId) {
            this.hideClientData();
            return;
        }
        const selectedOpt = event.target.selectedOptions[0];
        try {
            const dataAttr = selectedOpt && selectedOpt.dataset && selectedOpt.dataset.client;
            this.currentClient = dataAttr ? JSON.parse(dataAttr) : { id: clientId };
        } catch {
            this.currentClient = { id: clientId };
        }
        await this.loadClientData(clientId);
    }

    updateClientInfo(clientInfo, totalMeasurements) {
        const details = [
            { el: document.getElementById('clientName'), val: clientInfo.full_name || clientInfo.username || '-' }
        ];
        details.forEach(x => { if (x.el) x.el.textContent = x.val; });

        // Email: show only if present to avoid rendering a lone dash
        const emailEl = document.getElementById('clientEmail');
        if (emailEl) {
            const email = clientInfo.email && String(clientInfo.email).trim();
            if (email) {
                emailEl.textContent = email;
                emailEl.style.display = '';
            } else {
                emailEl.textContent = '';
                emailEl.style.display = 'none';
            }
        }

        const avatarImg = document.getElementById('clientAvatar');
        if (avatarImg) {
            if (clientInfo.profile && clientInfo.profile.avatar) {
                avatarImg.src = clientInfo.profile.avatar;
            } else if (window.AvatarGenerator) {
                const displayName = clientInfo.full_name || clientInfo.username || 'User';
                avatarImg.src = AvatarGenerator.generateAvatar(displayName, { background: '667eea', color: 'fff', size: 64 });
            } else {
                avatarImg.src = '/static/images/default-avatar.svg';
            }
            avatarImg.onerror = () => { avatarImg.onerror = null; avatarImg.src = '/static/images/default-avatar.svg'; };
            // Simplify loading performance
            avatarImg.loading = 'lazy';
            avatarImg.decoding = 'async';
        }

        const totalEl = document.getElementById('totalMeasurements');
        if (totalEl) totalEl.textContent = totalMeasurements || 0;
        const memberEl = document.getElementById('memberSince');
        if (memberEl) {
            // Prefer subscription start with this coach when available, else fallback to join/member_since
            let since = null;
            try {
                const subsSummary = clientInfo.subscription_summary || (clientInfo.profile && clientInfo.profile.subscription_summary);
                if (subsSummary && (subsSummary.first_subscription_with_coach || subsSummary.first_with_coach)) {
                    since = subsSummary.first_subscription_with_coach || subsSummary.first_with_coach;
                }
            } catch(_) { /* ignore */ }
            if (!since) since = clientInfo.date_joined || (clientInfo.profile && clientInfo.profile.member_since);
            memberEl.textContent = since ? this.formatDate(since) : '-';
        }

        // Fill additional client badges when available
        const profile = clientInfo.profile || {};
        const ageEl = document.getElementById('clientAge');
        if (ageEl) {
            const age = profile.age || clientInfo.age;
            ageEl.textContent = `Age: ${age ? age : '—'}`;
        }
        const genderEl = document.getElementById('clientGender');
        if (genderEl) {
            const g = (profile.gender || clientInfo.gender || '').toString();
            const pretty = g ? (g.charAt(0).toUpperCase() + g.slice(1)) : '—';
            genderEl.textContent = `Gender: ${pretty}`;
        }
        const activityEl = document.getElementById('clientActivityLevel');
        if (activityEl) {
            const lvl = profile.activity_level || clientInfo.activity_level;
            activityEl.textContent = `Activity: ${lvl ? lvl : '—'}`;
        }

        // Ensure chat button has the selected client info
        const chatBtn = document.getElementById('chatWithClientBtn');
        if (chatBtn) {
            const resolvedId = clientInfo.id || (this.currentClient && this.currentClient.id) || '';
            chatBtn.dataset.clientId = resolvedId;
            chatBtn.dataset.clientName = clientInfo.full_name || clientInfo.username || 'Client';
        }

        // Update customize plan controls and subscriptions badge
        this.updateActivePlansCount(clientInfo.id);
        this.updateCustomizePlanButtons(clientInfo.id);
    }

    async updateCustomizePlanButtons(clientId) {
        const singleBtn = document.getElementById('customizePlanBtn');
        const group = document.getElementById('customizePlanGroup');
        const dropdown = document.getElementById('customizePlanDropdown');
        if (!singleBtn || !group || !dropdown || !clientId) return;
        singleBtn.style.display = 'none';
        group.style.display = 'none';
        dropdown.innerHTML = '';
        try {
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-plan-customization/client_subscriptions/?client_id=${clientId}`, { method: 'GET' });
            let subs = Array.isArray(resp?.data) ? resp.data : (resp?.data?.results || resp?.data?.subscriptions || []);
            subs = subs || [];
            const allowed = new Set(['active','pending']);
            subs = subs.filter(s => allowed.has(String(s.status || '').toLowerCase()));
            if (subs.length === 1) {
                const subId = subs[0].id;
                singleBtn.href = `/plan-management/coach/plan-customization/?subscription_id=${subId}`;
                singleBtn.style.display = 'inline-block';
            } else if (subs.length > 1) {
                subs.forEach(s => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.className = 'dropdown-item';
                    a.href = `/plan-management/coach/plan-customization/?subscription_id=${s.id}`;
                    a.textContent = (s.product_plan && s.product_plan.name) ? s.product_plan.name : `Subscription #${s.id}`;
                    li.appendChild(a);
                    dropdown.appendChild(li);
                });
                group.style.display = 'inline-block';
            }
        } catch (e) {
            console.warn('Failed to update customize plan buttons', e);
        }
    }

    async updateActivePlansCount(clientId) {
        const el = document.getElementById('activePlans');
        if (!el || !clientId) return;
        try {
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-client-access/client_profile/?client_id=${clientId}`, { method: 'GET' });
            if (resp && resp.success && resp.data && resp.data.subscription_summary) {
                el.textContent = resp.data.subscription_summary.total_subscriptions || 0;
            }
        } catch (e) {
            console.warn('Failed to fetch active plans count', e);
        }
    }
    
    async loadClientData(clientId) {
        if (!clientId) {
            this.hideClientData();
            return;
        }
        
        this.showLoading();
        
        try {
            const response = await this.authManager.apiCall(
                `/plan-management/api/v1/coach-client-access/client_measurements/?client_id=${clientId}`, {
                method: 'GET'
            });
            
            if (response.success) {
                const clientInfo = response.data.client_info;
                const measurements = response.data.measurements || [];
                const totalMeasurements = measurements.length;
                
                // Store for detail views
                this.currentMeasurements = measurements;

                this.updateClientInfo(clientInfo, totalMeasurements);
                
                const clientMeasurementsContainer = document.getElementById('clientMeasurementsContainer');
                const noDataMessage = document.getElementById('noDataMessage');
                
                if (totalMeasurements > 0) {
                    this.updateLatestMeasurements(measurements[0]);
                    // Use analytics object for progress summary
                    this.updateProgressSummary(response.data.analytics || {});
                    // Use normalized profile object for health info
                    this.updateHealthInfo(clientInfo.profile || {});
                    this.updateMeasurementTimeline(measurements);
                    // Show photos from the latest measurement
                    this.updateProgressPhotos(measurements[0]);
                    
                    if (clientMeasurementsContainer) clientMeasurementsContainer.style.display = 'block';
                    if (noDataMessage) noDataMessage.style.display = 'none';
                    
                    // Create measurement chart
                    this.createMeasurementChart(measurements);
                } else {
                    if (clientMeasurementsContainer) clientMeasurementsContainer.style.display = 'none';
                    if (noDataMessage) noDataMessage.style.display = 'block';
                }

                // Load subscriptions and ratings for this client (for this coach)
                await this.loadClientSubscriptions(clientId);
                await this.loadAndRenderRatings(clientId);
            } else {
                this.showError('Failed to load client data');
            }
        } catch (error) {
            console.error('Error loading client data:', error);
            this.showError('Failed to load client data');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadClientSubscriptions(clientId) {
        const section = document.getElementById('clientSubscriptionsSection');
        try {
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-plan-customization/client_subscriptions/?client_id=${clientId}`, { method: 'GET' });
            if (!resp || !resp.success || !resp.data) {
                if (section) section.style.display = 'none';
                return;
            }
            let subs = Array.isArray(resp.data) ? resp.data : (resp.data.results || resp.data.subscriptions || []);
            subs = subs || [];
            this.setupSubscriptionsTableIfNeeded();
            const rows = subs.map(s => ({
                subscribed: this.formatDate(s.subscribed_at),
                plan: (s.product_plan && s.product_plan.name) ? s.product_plan.name : `Subscription #${s.id}`,
                status: (s.status || '').toString(),
                actions: `<a class="btn btn-sm btn-outline-primary" href="/plan-management/coach/plan-customization/?subscription_id=${s.id}"><i class="fas fa-sliders-h me-1"></i>Customize</a>`
            }));
            const dt = this.subscriptionsTable;
            dt.clear();
            dt.rows.add(rows).draw();
            if (section) section.style.display = 'block';

            // Update "Member Since" to reflect earliest subscription with this coach
            try {
                const dates = subs
                    .map(s => s.subscribed_at)
                    .filter(Boolean)
                    .map(d => new Date(d))
                    .filter(d => !isNaN(d.getTime()));
                if (dates.length > 0) {
                    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
                    const memberEl = document.getElementById('memberSince');
                    if (memberEl) memberEl.textContent = this.formatDate(earliest);
                }
            } catch (_) { /* ignore */ }

            // Populate ratings filter with these subscriptions
            this.populateRatingsSubscriptionFilter(subs);
        } catch (e) {
            console.warn('Failed to load client subscriptions', e);
            if (section) section.style.display = 'none';
        }
    }

    setupSubscriptionsTableIfNeeded() {
        if (this.subscriptionsTable) return;
        const el = '#clientSubscriptionsTable';
        if (!$.fn.DataTable.isDataTable(el)) {
            this.subscriptionsTable = $(el).DataTable({
                paging: true,
                searching: false,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'subscribed' },
                    { data: 'plan' },
                    { data: 'status' },
                    { data: 'actions', orderable: false }
                ],
                order: [[0, 'desc']]
            });
        } else {
            this.subscriptionsTable = $(el).DataTable();
        }
    }

    populateRatingsSubscriptionFilter(subs) {
        const filter = document.getElementById('ratingsSubscriptionFilter');
        if (!filter) return;
        const current = filter.value;
        filter.innerHTML = '<option value="">All subscriptions</option>';
        subs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = (s.product_plan && s.product_plan.name) ? s.product_plan.name : `Subscription #${s.id}`;
            filter.appendChild(opt);
        });
        // Restore previous selection if still present
        if (current && [...filter.options].some(o => String(o.value) === String(current))) {
            filter.value = current;
            return; // honor user selection
        }

        // Try to honor deep link subscription_id if present
        const deepLinkedSubId = this.getQueryParam('subscription_id');
        if (deepLinkedSubId && [...filter.options].some(o => String(o.value) === String(deepLinkedSubId))) {
            filter.value = String(deepLinkedSubId);
        } else {
            // Choose a sensible default when multiple exist: prefer latest active/pending, else latest by date
            const allowed = new Set(['active', 'pending']);
            const parseDate = (s) => {
                const d = s.subscribed_at || s.start_date || s.created_at || s.updated_at || null;
                const dt = d ? new Date(d) : null;
                return (dt && !isNaN(dt.getTime())) ? dt.getTime() : 0;
            };
            let candidate = null;
            const activeOrPending = subs.filter(s => allowed.has(String(s.status || '').toLowerCase()));
            const pool = activeOrPending.length > 0 ? activeOrPending : subs;
            pool.forEach(s => {
                if (!candidate) { candidate = s; return; }
                if (parseDate(s) > parseDate(candidate)) candidate = s;
            });
            if (candidate) {
                filter.value = String(candidate.id);
            } else if (subs.length === 1) {
                filter.value = String(subs[0].id);
            }
        }

        // Trigger loads when a default was chosen
        const selectedId = filter.value || '';
        const clientId = this.currentClient && this.currentClient.id;
        if (clientId) {
            this.loadAndRenderRatings(clientId, selectedId);
        }
        if (selectedId) {
            this.loadAndRenderDayFeedback(selectedId);
        } else {
            this.loadAndRenderDayFeedback('');
        }
    }

    async loadAndRenderRatings(clientId, subscriptionId = '') {
        const section = document.getElementById('clientRatingsSection');
        try {
            let url = `/plan-management/api/v1/plan-ratings/?client_id=${clientId}&full=true`;
            if (subscriptionId) url += `&subscription_id=${subscriptionId}`;
            // Ratings filters
            const minStarsEl = document.getElementById('ratingsMinStars');
            const minStars = minStarsEl && minStarsEl.value ? parseInt(minStarsEl.value, 10) : null;
            if (minStars && minStars >= 1) url += `&min_rating=${minStars}`;
            const resp = await this.authManager.apiCall(url, { method: 'GET' });
            if (!resp || !resp.success) {
                if (section) section.style.display = 'none';
                return;
            }
            const data = resp.data;
            const items = Array.isArray(data) ? data : (data.results || data.ratings || []);
            this.setupRatingsTableIfNeeded();
            const rows = (items || []).map(r => ({
                date: this.formatDate(r.created_at),
                plan: r.plan_name || '-',
                rating: r.overall_rating,
                title: r.review_title || '',
                review: (r.review_content || '').toString().substring(0, 240),
                is_public: r.is_public ? 'Yes' : 'No'
            }));
            const dt = this.ratingsTable;
            dt.clear();
            dt.rows.add(rows).draw();
            if (section) section.style.display = 'block';
        } catch (e) {
            console.warn('Failed to load client ratings', e);
            if (section) section.style.display = 'none';
        }
    }

    setupRatingsTableIfNeeded() {
        if (this.ratingsTable) return;
        const el = '#clientRatingsTable';
        if (!$.fn.DataTable.isDataTable(el)) {
            this.ratingsTable = $(el).DataTable({
                paging: true,
                searching: false,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'date' },
                    { data: 'plan' },
                    { data: 'rating', render: v => this.renderStars(v) },
                    { data: 'title' },
                    { data: 'review' },
                    { data: 'is_public' }
                ],
                order: [[0, 'desc']]
            });
        } else {
            this.ratingsTable = $(el).DataTable();
        }
    }

    // Initialize Per-Day Feedback DataTables if needed
    setupDayFeedbackTablesIfNeeded() {
        // Day Reviews
        if (!this.dayReviewsTable && $('#dayReviewsTable').length) {
            this.dayReviewsTable = $('#dayReviewsTable').DataTable({
                paging: true,
                searching: true,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'day_number' },
                    { data: 'scheduled_date' },
                    { data: 'rating', render: v => this.renderStars(v) },
                    { data: 'feedback' }
                ],
                order: [[0, 'asc']]
            });
        }
        // Workout Reviews
        if (!this.workoutReviewsTable && $('#workoutReviewsTable').length) {
            this.workoutReviewsTable = $('#workoutReviewsTable').DataTable({
                paging: true,
                searching: true,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'day_number' },
                    { data: 'session_name' },
                    { data: 'workout_name' },
                    { data: 'effort_rating' },
                    { data: 'notes' }
                ],
                order: [[0, 'asc']]
            });
        }
        // Meal Reviews
        if (!this.mealReviewsTable && $('#mealReviewsTable').length) {
            this.mealReviewsTable = $('#mealReviewsTable').DataTable({
                paging: true,
                searching: true,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'day_number' },
                    { data: 'plan_name' },
                    { data: 'meal_name' },
                    { data: 'rating', render: v => this.renderStars(v) },
                    { data: 'notes' }
                ],
                order: [[0, 'asc']]
            });
        }
        // Exercise Difficulty
        if (!this.exerciseReviewsTable && $('#exerciseReviewsTable').length) {
            this.exerciseReviewsTable = $('#exerciseReviewsTable').DataTable({
                paging: true,
                searching: true,
                info: false,
                lengthChange: false,
                pageLength: 5,
                data: [],
                columns: [
                    { data: 'day_number' },
                    { data: 'session_name' },
                    { data: 'workout_name' },
                    { data: 'block_name' },
                    { data: 'exercise_name' },
                    { data: 'difficulty' }
                ],
                order: [[0, 'asc']]
            });
        }
    }

    // Load and render Per-Day feedback for a subscription
    async loadAndRenderDayFeedback(subscriptionId = '') {
        const section = document.getElementById('perDayFeedbackSection');
        if (!subscriptionId) {
            if (section) section.style.display = 'none';
            return;
        }
        try {
            const url = `/plan-management/api/v1/coach-plan-customization/subscription_reviews/?subscription_id=${encodeURIComponent(subscriptionId)}`;
            const resp = await this.authManager.apiCall(url, { method: 'GET' });
            if (!resp || !resp.success || !resp.data) {
                if (section) section.style.display = 'none';
                return;
            }
            this.setupDayFeedbackTablesIfNeeded();
            const { day_reviews = [], workout_reviews = [], meal_reviews = [], exercise_reviews = [] } = resp.data;
            // store originals for client-side filtering
            this.dayReviewsData = day_reviews;
            this.workoutReviewsData = workout_reviews;
            this.mealReviewsData = meal_reviews;
            this.exerciseReviewsData = exercise_reviews;
            // initial draw (unfiltered); then apply any current filters
            if (this.dayReviewsTable) { this.dayReviewsTable.clear(); this.dayReviewsTable.rows.add(day_reviews).draw(); }
            if (this.workoutReviewsTable) { this.workoutReviewsTable.clear(); this.workoutReviewsTable.rows.add(workout_reviews).draw(); }
            if (this.mealReviewsTable) { this.mealReviewsTable.clear(); this.mealReviewsTable.rows.add(meal_reviews).draw(); }
            if (this.exerciseReviewsTable) { this.exerciseReviewsTable.clear(); this.exerciseReviewsTable.rows.add(exercise_reviews).draw(); }
            if (section) section.style.display = 'block';
            // Apply UI filters if any set
            this.applyPerDayFilters();
        } catch (e) {
            console.warn('Failed to load per-day feedback', e);
            if (section) section.style.display = 'none';
        }
    }

    // Apply UI filters to per-day feedback tables
    applyPerDayFilters() {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : '';
        };
        const dateFrom = getVal('filterDateFrom') || null;
        const dateTo = getVal('filterDateTo') || null;
        const minStars = parseInt(getVal('filterMinStars'), 10) || null;
        const text = (getVal('filterText') || '').toLowerCase();

        // Helpers
        const inRange = (val, minVal, maxVal) => {
            if (minVal && val < minVal) return false;
            if (maxVal && val > maxVal) return false;
            return true;
        };
        const dateInRange = (dateStr) => {
            if (!dateStr) return true;
            if (dateFrom && dateStr < dateFrom) return false;
            if (dateTo && dateStr > dateTo) return false;
            return true;
        };
        const includesText = (fields) => {
            if (!text) return true;
            return fields.some(f => (f || '').toString().toLowerCase().includes(text));
        };

        // Day reviews
        if (this.dayReviewsTable && Array.isArray(this.dayReviewsData)) {
            const filtered = this.dayReviewsData.filter(r => {
                if (!dateInRange((r.scheduled_date || '').toString())) return false;
                if (minStars && (!r.rating || r.rating < minStars)) return false;
                if (!includesText([r.feedback, r.scheduled_date])) return false;
                return true;
            });
            this.dayReviewsTable.clear();
            this.dayReviewsTable.rows.add(filtered).draw();
        }

        // Workout reviews
        if (this.workoutReviewsTable && Array.isArray(this.workoutReviewsData)) {
            const filtered = this.workoutReviewsData.filter(r => {
                // day range and min effort removed
                if (!includesText([r.session_name, r.workout_name, r.notes])) return false;
                return true;
            });
            this.workoutReviewsTable.clear();
            this.workoutReviewsTable.rows.add(filtered).draw();
        }

        // Meal reviews
        if (this.mealReviewsTable && Array.isArray(this.mealReviewsData)) {
            const filtered = this.mealReviewsData.filter(r => {
                if (minStars && (!r.rating || r.rating < minStars)) return false;
                if (!includesText([r.plan_name, r.meal_name, r.notes])) return false;
                return true;
            });
            this.mealReviewsTable.clear();
            this.mealReviewsTable.rows.add(filtered).draw();
        }

        // Exercise reviews
        if (this.exerciseReviewsTable && Array.isArray(this.exerciseReviewsData)) {
            const filtered = this.exerciseReviewsData.filter(r => {
                // day range and min difficulty removed
                if (!includesText([r.session_name, r.workout_name, r.block_name, r.exercise_name])) return false;
                return true;
            });
            this.exerciseReviewsTable.clear();
            this.exerciseReviewsTable.rows.add(filtered).draw();
        }
    }
    
    updateLatestMeasurements(measurement) {
        const container = document.getElementById('latestMeasurements');
        container.innerHTML = '';
        
        const measurements = [
            { label: 'Weight', value: measurement.weight, unit: 'kg', icon: 'fas fa-weight' },
            { label: 'Height', value: measurement.height, unit: 'cm', icon: 'fas fa-ruler-vertical' },
            { label: 'Body Fat', value: measurement.body_fat_percentage, unit: '%', icon: 'fas fa-percentage' },
            { label: 'Chest', value: measurement.chest, unit: 'cm', icon: 'fas fa-expand-arrows-alt' },
            { label: 'Waist', value: measurement.waist, unit: 'cm', icon: 'fas fa-expand-arrows-alt' },
            { label: 'Hips', value: measurement.hips, unit: 'cm', icon: 'fas fa-expand-arrows-alt' },
            { label: 'Arms', value: measurement.arms, unit: 'cm', icon: 'fas fa-dumbbell' },
            { label: 'Thighs', value: measurement.thighs, unit: 'cm', icon: 'fas fa-expand-arrows-alt' }
        ];
        
        // Create a card for each measurement with staggered animation delay
        measurements.forEach((m, index) => {
            if (m.value !== null && m.value !== undefined && m.value !== '') {
                const card = document.createElement('div');
                card.className = 'body-part-card';
                // Add animation delay for staggered effect
                card.style.animationDelay = `${index * 0.05}s`;
                card.style.animation = 'fadeIn 0.5s ease-in forwards';
                
                card.innerHTML = `
                    <div class="body-part-value">${m.value} ${m.unit}</div>
                    <div class="body-part-label">${m.label}</div>
                `;
                container.appendChild(card);
            }
        });
        
        // If no measurements, show a message
        if (container.children.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No measurements available</p>';
        }
    }
    
    updateProgressSummary(analytics) {
        const container = document.getElementById('progressSummary');
        
        if (!analytics.progress || Object.keys(analytics.progress).length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line fa-2x mb-3"></i><p>No progress data available</p></div>';
            return;
        }
        
        let html = '';
        const importantMetrics = ['weight', 'body_fat_percentage', 'waist', 'chest'];
        
        importantMetrics.forEach((metric, index) => {
            const progress = analytics.progress[metric];
            if (progress) {
                const isPositive = progress.change > 0;
                // Determine if this is a positive or negative change based on the metric
                const progressClass = metric === 'weight' || metric === 'body_fat_percentage' || metric === 'waist' 
                    ? (isPositive ? 'progress-negative' : 'progress-positive')
                    : (isPositive ? 'progress-positive' : 'progress-negative');
                
                html += `
                    <div class="progress-item animate-on-scroll" style="animation-delay: ${index * 0.1}s">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div>
                                <h6 class="metric-name">${this.formatMetricName(metric)}</h6>
                                <div class="metric-values">
                                    <span class="current-value">${progress.latest}</span>
                                    <i class="fas fa-arrow-right mx-1 text-muted small"></i>
                                    <span class="previous-value">${progress.oldest}</span>
                                </div>
                            </div>
                            <div class="text-end">
                                <span class="change-badge ${progressClass}">
                                    ${progress.change > 0 ? '+' : ''}${progress.change}
                                    <i class="fas fa-${progress.change > 0 ? 'arrow-up' : 'arrow-down'} ms-1"></i>
                                </span>
                                <div class="percentage-change">${progress.percentage_change.toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="progress progress-slim">
                            <div class="progress-bar bg-${progressClass === 'progress-positive' ? 'success' : 'danger'}" 
                                role="progressbar" 
                                style="width: ${Math.min(Math.abs(progress.percentage_change), 100)}%" 
                                aria-valuenow="${Math.abs(progress.percentage_change)}" 
                                aria-valuemin="0" 
                                aria-valuemax="100"></div>
                        </div>
                    </div>
                `;
            }
        });
        
        if (analytics.measurement_period) {
            html += `
                <hr>
                <div class="measurement-period animate-on-scroll">
                    <div class="d-flex align-items-center justify-content-center">
                        <i class="fas fa-calendar-alt me-2"></i>
                        <span>${analytics.measurement_period.duration_days} days</span>
                    </div>
                    <div class="period-dates">
                        <span>${analytics.measurement_period.start_date}</span>
                        <i class="fas fa-long-arrow-alt-right mx-2"></i>
                        <span>${analytics.measurement_period.end_date}</span>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Trigger animations for elements that are visible
        setTimeout(() => {
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.classList.add('animated');
            });
        }, 100);
    }
    
    updateHealthInfo(profile) {
        const container = document.getElementById('healthInfo');
        
        let html = '';
        let hasInfo = false;
        
        // Define health info sections with icons, titles, and animation delays
        const sections = [
            { 
                key: 'fitness_goals', 
                icon: 'bullseye', 
                title: 'Fitness Goals',
                delay: 0,
                badgeClass: 'badge-primary'
            },
            { 
                key: 'health_conditions', 
                icon: 'heartbeat', 
                title: 'Health Conditions',
                delay: 0.1,
                badgeClass: 'badge-warning'
            },
            { 
                key: 'dietary_preferences', 
                icon: 'utensils', 
                title: 'Dietary Preferences',
                delay: 0.2,
                badgeClass: 'badge-info'
            },
            { 
                key: 'allergies', 
                icon: 'exclamation-triangle', 
                title: 'Allergies',
                delay: 0.3,
                badgeClass: 'badge-danger'
            }
        ];
        
        // Generate HTML for each section if data exists
        sections.forEach(section => {
            if (profile[section.key]) {
                hasInfo = true;
                html += `
                    <div class="health-info-item animate-on-scroll" style="animation-delay: ${section.delay}s">
                        <div class="health-info-header">
                            <span class="health-info-icon">
                                <i class="fas fa-${section.icon}"></i>
                            </span>
                            <h6 class="health-info-title">${section.title}</h6>
                        </div>
                        <div class="health-info-content">
                            ${this.formatHealthInfoContent(profile[section.key], section.key)}
                        </div>
                    </div>
                `;
            }
        });
        
        if (!hasInfo) {
            html = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list fa-2x mb-3"></i>
                    <p>No health information available</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Trigger animations
        setTimeout(() => {
            document.querySelectorAll('#healthInfo .animate-on-scroll').forEach(el => {
                el.classList.add('animated');
            });
        }, 100);
    }
    
    /**
     * Format health information content based on the type
     * @param {string} content - The content to format
     * @param {string} type - The type of health information
     * @returns {string} - Formatted HTML
     */
    formatHealthInfoContent(content, type) {
        // For allergies, split by commas and display as badges
        if (type === 'allergies' && content.includes(',')) {
            const allergies = content.split(',').map(a => a.trim()).filter(a => a);
            return allergies.map(allergy => 
                `<span class="badge bg-danger-soft me-2 mb-2">${allergy}</span>`
            ).join('');
        }
        
        // For dietary preferences, split by commas and display as badges
        if (type === 'dietary_preferences' && content.includes(',')) {
            const prefs = content.split(',').map(p => p.trim()).filter(p => p);
            return prefs.map(pref => 
                `<span class="badge bg-info-soft me-2 mb-2">${pref}</span>`
            ).join('');
        }
        
        // Default formatting
        return `<p class="info-text">${content}</p>`;
    }
    
    updateMeasurementTimeline(measurements) {
        const container = document.getElementById('measurementTimeline');
        container.innerHTML = '';
        
        if (!measurements || measurements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history fa-2x mb-3"></i>
                    <p>No measurement history available</p>
                </div>
            `;
            return;
        }
        
        // Create timeline container
        const timeline = document.createElement('div');
        timeline.className = 'timeline-container';
        container.appendChild(timeline);
        
        measurements.slice(0, 5).forEach((measurement, index) => {
            const item = document.createElement('div');
            item.className = 'timeline-item animate-on-scroll';
            item.style.animationDelay = `${index * 0.1}s`;
            
            const date = new Date(measurement.date).toLocaleDateString();
            const formattedDate = this.formatDate(measurement.date);
            const weight = (measurement.weight != null) ? `${measurement.weight} kg` : '-';
            const bodyFat = (measurement.body_fat_percentage != null) ? `${measurement.body_fat_percentage}%` : '-';
            
            // Find changes from previous measurement if available
            let weightChange = '';
            let bodyFatChange = '';
            
            if (index < measurements.length - 1) {
                const prevMeasurement = measurements[index + 1];
                if (measurement.weight != null && prevMeasurement.weight != null) {
                    const diff = (Number(measurement.weight) - Number(prevMeasurement.weight)).toFixed(1);
                    const changeClass = diff > 0 ? 'text-danger' : (diff < 0 ? 'text-success' : 'text-muted');
                    weightChange = `<span class="${changeClass} small ms-2">${diff > 0 ? '+' : ''}${diff}</span>`;
                }
                
                if (measurement.body_fat_percentage != null && prevMeasurement.body_fat_percentage != null) {
                    const diff = (Number(measurement.body_fat_percentage) - Number(prevMeasurement.body_fat_percentage)).toFixed(1);
                    const changeClass = diff > 0 ? 'text-danger' : (diff < 0 ? 'text-success' : 'text-muted');
                    bodyFatChange = `<span class="${changeClass} small ms-2">${diff > 0 ? '+' : ''}${diff}</span>`;
                }
            }
            
            item.innerHTML = `
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="timeline-header">
                            <div class="timeline-date">${formattedDate}</div>
                            <div class="timeline-metrics">
                                <div class="metric">
                                    <i class="fas fa-weight text-primary me-1"></i>
                                    <span>${weight}</span>
                                    ${weightChange}
                                </div>
                                <div class="metric">
                                    <i class="fas fa-percentage text-primary me-1"></i>
                                    <span>${bodyFat}</span>
                                    ${bodyFatChange}
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-outline-primary view-details-btn" 
                                onclick="coachMeasurements.viewMeasurementDetails('${measurement.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
            
            timeline.appendChild(item);
        });
        
        // Add "View All" button if there are more than 5 measurements
        if (measurements.length > 5) {
            const viewAllBtn = document.createElement('div');
            viewAllBtn.className = 'text-center mt-3';
            viewAllBtn.innerHTML = `
                <button class="btn btn-sm btn-outline-primary" onclick="coachMeasurements.viewAllMeasurements()">
                    <i class="fas fa-history me-1"></i> View All History
                </button>
            `;
            container.appendChild(viewAllBtn);
        }
        
        // Trigger animations
        setTimeout(() => {
            document.querySelectorAll('.timeline-item').forEach(el => {
                el.classList.add('animated');
            });
        }, 100);
    }

/**
 * Format health information content based on the type
 * @param {string} content - The content to format
 * @param {string} type - The type of health information
 * @returns {string} - Formatted HTML
 */
formatHealthInfoContent(content, type) {
    // For allergies, split by commas and display as badges
    if (type === 'allergies' && content.includes(',')) {
        const allergies = content.split(',').map(a => a.trim()).filter(a => a);
        return allergies.map(allergy => 
            `<span class="badge bg-danger-soft me-2 mb-2">${allergy}</span>`
        ).join('');
    }
        
    // For dietary preferences, split by commas and display as badges
    if (type === 'dietary_preferences' && content.includes(',')) {
        const prefs = content.split(',').map(p => p.trim()).filter(p => p);
        return prefs.map(pref => 
            `<span class="badge bg-info-soft me-2 mb-2">${pref}</span>`
        ).join('');
    }
    
    // Default formatting
    return `<p class="info-text">${content}</p>`;
}

updateProgressPhotos(measurement) {
        const container = document.getElementById('measurementPhotos');
        if (!container) return;
        container.innerHTML = '';

        if (!measurement) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images fa-2x mb-3"></i>
                    <p>No progress photos available</p>
                </div>
            `;
            return;
        }

        const photos = [
            { label: 'Front', photo: measurement.front_photo, type: 'front' },
            { label: 'Side', photo: measurement.side_photo, type: 'side' },
            { label: 'Back', photo: measurement.back_photo, type: 'back' }
        ];

        const hasPhotos = photos.some(p => p.photo);
        if (!hasPhotos) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images fa-2x mb-3"></i>
                    <p>No progress photos available</p>
                    <small class="text-muted">Photos will appear here when uploaded</small>
                </div>
            `;
            return;
        }

        // Simple grid
        const photoGrid = document.createElement('div');
        photoGrid.className = 'measurement-photos';
        container.appendChild(photoGrid);

        photos.forEach((p) => {
            const card = document.createElement('div');
            card.className = `photo-container ${p.type}-view`;
            if (p.photo) {
                card.innerHTML = `
                    <div class="photo-card">
                        <div class="photo-wrapper">
                            <img src="${p.photo}" alt="${p.label} Photo">
                        </div>
                        <div class="small text-muted mt-1">${p.label} • ${this.formatDate(measurement.date, 'short')}</div>
                    </div>
                `;
                const img = card.querySelector('img');
                if (img) {
                    img.loading = 'lazy';
                    img.decoding = 'async';
                    img.style.objectFit = 'cover';
                    img.style.width = '100%';
                    img.style.maxHeight = '220px';
                    img.onerror = () => { img.onerror = null; img.src = '/static/images/empty-state.svg'; };
                    // Simple modal view, not a lightbox gallery
                    img.addEventListener('click', () => this.viewPhotoModal(p.photo, `${p.label} — ${this.formatDate(measurement.date)}`));
                }
            } else {
                card.innerHTML = `
                    <div class="photo-card empty-photo">
                        <div class="photo-placeholder">
                            <i class="fas fa-camera fa-2x mb-2"></i>
                            <p class="mb-0">${p.label}</p>
                            <small>No photo</small>
                        </div>
                    </div>
                `;
            }
            photoGrid.appendChild(card);
        });
    }
    
    /**
     * Filter progress photos by type
     * @param {string} type - Type of photos to filter by
     */
    filterProgressPhotos(type) {
        // Filter photos by type
        if (type === 'all') {
            document.querySelectorAll('.photo-container').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            document.querySelectorAll('.photo-container').forEach(el => {
                if (el.classList.contains(`${type}-view`)) {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * View all progress photos
     */
    viewAllPhotos() {
        // Open the lightbox with all photos
        if (window.progressPhotosLightbox && this.allPhotos && this.allPhotos.length > 0) {
            window.progressPhotosLightbox.openLightbox(this.allPhotos, 0);
        }
    }
    
    /**
     * View photo in a modal
     * @param {string} photoUrl - URL of the photo
     * @param {string} label - Label of the photo
     */
    viewPhotoModal(photoUrl, label) {
        let modal = document.getElementById('photoViewerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'photoViewerModal';
            modal.className = 'modal fade';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('aria-hidden', 'true');
            
            modal.innerHTML = `
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Progress Photo</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img id="modalPhotoImg" src="" alt="Progress Photo" class="img-fluid">
                        </div>
                        <div class="modal-footer">
                            <span id="modalPhotoLabel" class="me-auto"></span>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        // Set photo and label
        document.getElementById('modalPhotoImg').src = photoUrl;
        document.getElementById('modalPhotoLabel').textContent = label;
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
    
    createMeasurementChart(measurements) {
        const chartContainer = document.getElementById('chartContainer');
        const chartCanvas = document.getElementById('measurementChart');
        
        if (!chartCanvas || typeof window.Chart === 'undefined') {
            console.warn('Chart.js not loaded or chart canvas missing; skipping chart creation');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line fa-2x mb-3"></i>
                        <p>Chart visualization unavailable</p>
                        <small class="text-muted">Chart.js library not loaded</small>
                    </div>
                `;
            }
            return;
        }
        
        if (!measurements || measurements.length < 2) {
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-line fa-2x mb-3"></i>
                        <p>Insufficient measurement data</p>
                        <small class="text-muted">At least two measurements are needed to show progress</small>
                    </div>
                `;
            }
            return;
        }
        
        const ctx = chartCanvas.getContext('2d');
        
        if (this.measurementChart) {
            this.measurementChart.destroy();
        }
        
        // Sort measurements by date (oldest to newest)
        const sortedMeasurements = measurements.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Format dates for better readability
        const labels = sortedMeasurements.map(m => this.formatDate(m.date));
        const weightData = sortedMeasurements.map(m => m.weight || null);
        const bodyFatData = sortedMeasurements.map(m => m.body_fat_percentage || null);
        
        // Add chart loading animation
        chartCanvas.style.opacity = 0;
        
        // Create gradient for weight dataset
        const weightGradient = ctx.createLinearGradient(0, 0, 0, 400);
        weightGradient.addColorStop(0, 'rgba(102, 126, 234, 0.6)');
        weightGradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');
        
        // Create gradient for body fat dataset
        const bodyFatGradient = ctx.createLinearGradient(0, 0, 0, 400);
        bodyFatGradient.addColorStop(0, 'rgba(240, 147, 251, 0.6)');
        bodyFatGradient.addColorStop(1, 'rgba(240, 147, 251, 0.1)');
        
        // Enhanced chart configuration
        this.measurementChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: weightData,
                        borderColor: '#667eea',
                        backgroundColor: weightGradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Body Fat (%)',
                        data: bodyFatData,
                        borderColor: '#f093fb',
                        backgroundColor: bodyFatGradient,
                        borderWidth: 3,
                        pointBackgroundColor: '#f093fb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    onComplete: function () { chartCanvas.style.opacity = 1; }
                },
                interaction: { mode: 'index', intersect: false },
                hover: { mode: 'nearest', intersect: true },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date',
                            font: { size: 14, weight: 'bold' },
                            padding: { top: 10, bottom: 0 }
                        },
                        ticks: { maxRotation: 45, minRotation: 45 },
                        grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Weight (kg)',
                            font: { size: 14, weight: 'bold' },
                            padding: { top: 0, bottom: 10 }
                        },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Body Fat (%)',
                            font: { size: 14, weight: 'bold' },
                            padding: { top: 0, bottom: 10 }
                        },
                        grid: { drawOnChartArea: false, color: 'rgba(0, 0, 0, 0.05)' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20, font: { size: 12 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        displayColors: true,
                        boxPadding: 3
                    }
                }
            }
        });
        
        // Add chart animation
        setTimeout(() => {
            chartCanvas.style.transition = 'opacity 0.5s ease';
            chartCanvas.style.opacity = 1;
        }, 100);
    }
    
    
    // Utility methods
    renderStars(value) {
        const v = parseInt(value, 10) || 0;
        if (v <= 0) return '-';
        const max = 5;
        let html = `<span class="rating-stars" style="color:#f5c518;letter-spacing:1px;" aria-label="${v} out of 5">`;
        for (let i = 1; i <= max; i++) {
            html += (i <= v) ? '★' : '☆';
        }
        html += '</span>';
        return html;
    }
    formatActivityLevel(level) {
        const levels = {
            'sedentary': 'Sedentary',
            'lightly_active': 'Lightly Active',
            'moderately_active': 'Moderately Active',
            'very_active': 'Very Active',
            'extremely_active': 'Extremely Active'
        };
        return levels[level] || 'Not specified';
    }
    
    formatMetricName(metric) {
        const names = {
            'weight': 'Weight',
            'body_fat_percentage': 'Body Fat',
            'chest': 'Chest',
            'waist': 'Waist',
            'hips': 'Hips',
            'arms': 'Arms',
            'thighs': 'Thighs'
        };
        return names[metric] || metric;
    }
    
    generateAvatarUrl(name) {
        // Generate a simple avatar URL based on initials
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=80`;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    showLoading() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const clientMeasurementsContainer = document.getElementById('clientMeasurementsContainer');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (loadingSpinner) loadingSpinner.style.display = 'block';
        if (clientMeasurementsContainer) clientMeasurementsContainer.style.display = 'none';
        if (noDataMessage) noDataMessage.style.display = 'none';
    }
    
    hideLoading() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
    
    hideClientData() {
        const clientMeasurementsContainer = document.getElementById('clientMeasurementsContainer');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (clientMeasurementsContainer) clientMeasurementsContainer.style.display = 'none';
        if (noDataMessage) noDataMessage.style.display = 'none';
    }
    
    showSuccess(message) {
        // Use global toast utility for notifications
        if (window.utils && typeof utils.showToast === 'function') {
            utils.showToast(message, 'success');
        } else {
            console.log('SUCCESS:', message);
        }
    }
    
    showError(message) {
        // Use global toast utility for notifications
        if (window.utils && typeof utils.showToast === 'function') {
            utils.showToast(message, 'danger');
        } else {
            console.error('ERROR:', message);
        }
    }
    
    /**
     * Format a date string into various formats
     * @param {string|Date} dateInput - The date to format
     * @param {string} style - The formatting style: short, medium, long, relative, time, datetime
     * @returns {string} - Formatted date string
     */
    formatDate(dateInput, style = 'medium') {
        if (!dateInput) return '-';
        
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return '-';
        
        // Get current date for relative formatting
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // Calculate difference in days
        const diffTime = today.getTime() - dateOnly.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        switch (style) {
            case 'short':
                // Format: MM/DD/YY
                return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
                
            case 'long':
                // Format: Month Day, Year
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
            case 'relative':
                // Format: Today, Yesterday, X days ago, or date if more than 30 days
                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 30) return `${diffDays} days ago`;
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
            case 'time':
                // Format: HH:MM AM/PM
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
            case 'datetime':
                // Format: MM/DD/YYYY, HH:MM AM/PM
                return `${date.toLocaleDateString('en-US')}, ${date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
                
            case 'medium':
            default:
                // Format: MMM DD, YYYY (e.g., Apr 27, 2024)
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
        }
    }
    
    /**
     * View detailed information about a specific measurement
     * @param {string} measurementId - ID of the measurement to view
     */
    viewMeasurementDetails(measurementId) {
        try {
            const measurement = (this.currentMeasurements || []).find(m => String(m.id) === String(measurementId));
            if (!measurement) {
                this.showError('Measurement not found');
                return;
            }
            const modalEl = document.getElementById('measurementDetailModal');
            if (!modalEl) {
                this.showError('Detail modal not found');
                return;
            }
            const titleEl = modalEl.querySelector('.modal-title');
            const bodyEl = modalEl.querySelector('.modal-body');
            if (titleEl) titleEl.textContent = `Measurement Details - ${this.formatDate(measurement.date, 'long')}`;

            const formatVal = (val, suffix = '') => (val != null && val !== '') ? `${val}${suffix}` : '-';
            const rows = [];
            rows.push({ label: 'Date', value: this.formatDate(measurement.date, 'long') });
            rows.push({ label: 'Weight', value: formatVal(measurement.weight, ' kg') });
            rows.push({ label: 'Body Fat', value: formatVal(measurement.body_fat_percentage, ' %') });
            if (measurement.bmi != null) rows.push({ label: 'BMI', value: formatVal(measurement.bmi) });
            if (measurement.chest != null) rows.push({ label: 'Chest', value: formatVal(measurement.chest, ' cm') });
            if (measurement.waist != null) rows.push({ label: 'Waist', value: formatVal(measurement.waist, ' cm') });
            if (measurement.hips != null) rows.push({ label: 'Hips', value: formatVal(measurement.hips, ' cm') });
            if (measurement.neck != null) rows.push({ label: 'Neck', value: formatVal(measurement.neck, ' cm') });
            if (measurement.notes) rows.push({ label: 'Notes', value: measurement.notes });

            const tableHtml = `
                <div class="table-responsive">
                    <table class="table table-sm">
                        <tbody>
                            ${rows.map(r => `
                                <tr>
                                    <th class="w-25">${r.label}</th>
                                    <td>${r.value}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            if (bodyEl) bodyEl.innerHTML = tableHtml;

            // Show modal
            if (window.bootstrap && window.bootstrap.Modal) {
                const modal = new window.bootstrap.Modal(modalEl);
                modal.show();
            } else {
                // Fallback: toggle via data API
                modalEl.style.display = 'block';
                modalEl.classList.add('show');
            }
        } catch (err) {
            console.error('Error showing measurement details:', err);
            this.showError('Could not open measurement details');
        }
    }
    
    /**
     * View all measurements history for the current client
     */
    viewAllMeasurements() {
        if (!this.currentClient || !this.currentClient.id) {
            this.showError('No client selected');
            return;
        }
        
        // Redirect to a full measurements history page or open a modal
        const clientId = this.currentClient.id;
        window.location.href = `/plan-management/coach/client-measurements/history/?client_id=${clientId}`;
    }
    
    /**
     * Initializes chat-related buttons throughout the interface
     */
    initChatButtons() {
        // Attach to any chat buttons by ID or class
        const buttons = document.querySelectorAll('#chatWithClientBtn, .chat-with-client-link');
        if (!buttons || buttons.length === 0) {
            console.log('No chat buttons found to initialize');
            return;
        }
        
        buttons.forEach(btn => {
            if (btn) {
                btn.removeEventListener('click', this.openClientChatBound);
                // Keep a bound reference to remove duplicates safely
                if (!this.openClientChatBound) {
                    this.openClientChatBound = this.openClientChat.bind(this);
                }
                btn.addEventListener('click', this.openClientChatBound);
            }
        });
        console.log(`Chat buttons initialized: ${buttons.length}`);
    }

    // Open chat with current client (fallback-safe)
    async openClientChat(event) {
        try {
            let clientId = null;
            let clientName = 'Client';

            if (event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.clientId) {
                clientId = event.currentTarget.dataset.clientId;
                clientName = event.currentTarget.dataset.clientName || 'Client';
            }
            if (!clientId && this.currentClient) {
                clientId = this.currentClient.id;
                clientName = this.currentClient.full_name || this.currentClient.username || 'Client';
            }

            // Try to include subscription context if available
            let subscriptionId = null;
            const ratingsFilter = document.getElementById('ratingsSubscriptionFilter');
            if (ratingsFilter && ratingsFilter.value) {
                subscriptionId = ratingsFilter.value;
            } else {
                // Fallback: try to read it from Customize Plan single button link
                const singleBtn = document.getElementById('customizePlanBtn');
                if (singleBtn && singleBtn.href) {
                    try {
                        const u = new URL(singleBtn.href, window.location.origin);
                        subscriptionId = u.searchParams.get('subscription_id') || null;
                    } catch (e) { /* ignore */ }
                }
            }

            if (!clientId) {
                this.showError('No client selected for chat');
                return;
            }

            if (window.messagingSystem && typeof window.messagingSystem.openChat === 'function') {
                // If your messagingSystem supports subscription context, pass it here
                window.messagingSystem.openChat(clientId, clientName, { plan_subscription_id: subscriptionId });
            } else {
                let url = `/messaging/chat/?participant_id=${encodeURIComponent(clientId)}`;
                if (subscriptionId) url += `&plan_subscription_id=${encodeURIComponent(subscriptionId)}`;
                window.location.href = url;
            }
        } catch (error) {
            console.error('Error opening chat:', error);
            this.showError('Could not open chat');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.authManager !== 'undefined') {
        window.coachMeasurements = new CoachMeasurementsManager();
    } else {
        console.error('Auth manager not found');
    }
});

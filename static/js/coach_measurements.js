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
            clientSelector.addEventListener('change', this.onClientSelect.bind(this));
        }
        
        // Call the chat button initialization
        this.initChatButtons();
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
    
    /**
     * Get a query parameter value from URL
     */
    getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }
    
    /**
     * Handle deep linking via subscription_id in URL by resolving client_id and auto-loading
     */
    async handleDeepLinkIfPresent() {
        try {
            // 1) Direct client deep-linking
            const clientIdParam = this.getQueryParam('client_id');
            if (clientIdParam) {
                const selector = document.getElementById('clientSelector');
                if (selector) {
                    // Ensure the selector has this client
                    if (!selector.querySelector(`option[value="${clientIdParam}"]`)) {
                        this.populateClientSelector();
                    }

                    const optionEl = selector.querySelector(`option[value="${clientIdParam}"]`);
                    if (!optionEl) {
                        // Attempt to append if client exists in loaded list
                        const clientObj = (this.clients || []).find(c => String(c.id) === String(clientIdParam));
                        if (clientObj) {
                            const opt = document.createElement('option');
                            opt.value = clientObj.id;
                            opt.textContent = `${clientObj.full_name} (${clientObj.username})`;
                            opt.dataset.client = JSON.stringify(clientObj);
                            selector.appendChild(opt);
                        }
                    }

                    selector.value = String(clientIdParam);
                    await this.onClientSelect({ target: selector });
                    return; // If client_id is present, we're done
                }
            }

            // 2) Fallback: deep-link via subscription_id
            const subId = this.getQueryParam('subscription_id');
            if (!subId) return; // No deep link

            // Fetch subscription details to resolve client_id
            let subscriptionResp = null;
            if (window.SubscriptionsAPI && typeof window.SubscriptionsAPI.getSubscription === 'function') {
                subscriptionResp = await window.SubscriptionsAPI.getSubscription(subId);
            } else if (this.authManager && typeof this.authManager.apiCall === 'function') {
                const resp = await this.authManager.apiCall(`/plan-management/api/v1/plan-subscriptions/${subId}/`, { method: 'GET' });
                if (resp && resp.success) {
                    subscriptionResp = { success: true, subscription: resp.data };
                } else {
                    subscriptionResp = resp;
                }
            }

            if (!subscriptionResp || !subscriptionResp.success || !subscriptionResp.subscription) {
                this.showError('Unable to load subscription for deep link');
                return;
            }

            const subscription = subscriptionResp.subscription;
            const clientId = subscription.client_id;
            if (!clientId) {
                this.showError('Subscription missing client information');
                return;
            }

            // Find the client in the loaded clients list and select it
            const selector = document.getElementById('clientSelector');
            if (!selector) return;

            // Ensure options are populated; populateClientSelector already ran in loadClients
            // Verify the option exists; if not, repopulate as a fallback
            if (!selector.querySelector(`option[value="${clientId}"]`)) {
                this.populateClientSelector();
            }

            const optionEl = selector.querySelector(`option[value="${clientId}"]`);
            if (!optionEl) {
                // As a last resort, attempt to append an option if client exists in memory
                const clientObj = (this.clients || []).find(c => String(c.id) === String(clientId));
                if (clientObj) {
                    const opt = document.createElement('option');
                    opt.value = clientObj.id;
                    opt.textContent = `${clientObj.full_name} (${clientObj.username})`;
                    opt.dataset.client = JSON.stringify(clientObj);
                    selector.appendChild(opt);
                }
            }

            // Select and trigger loading
            selector.value = String(clientId);
            // Trigger the same flow as manual selection
            await this.onClientSelect({ target: selector });
        } catch (err) {
            console.error('Deep link handling error:', err);
            this.showError('Failed to apply deep link');
        }
    }
    
    populateClientSelector() {
        const selector = document.getElementById('clientSelector');
        if (!selector) {
            console.warn('Client selector element not found in the DOM');
            return;
        }
        
        selector.innerHTML = '<option value="">Choose a client...</option>';
        
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.full_name} (${client.username})`;
            option.dataset.client = JSON.stringify(client);
            selector.appendChild(option);
        });
    }
    
    async searchClients(query) {
        if (query.length < 2) {
            this.populateClientSelector();
            return;
        }
        
        try {
            const response = await this.authManager.apiCall(
                `/plan-management/api/v1/coach-client-access/client_search/?q=${encodeURIComponent(query)}`, {
                method: 'GET'
            });
            
            if (response.success) {
                const selector = document.getElementById('clientSelector');
                if (!selector) {
                    console.warn('Client selector element not found in the DOM');
                    return;
                }
                
                selector.innerHTML = '<option value="">Choose a client...</option>';
                
                response.data.clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = `${client.full_name} (${client.username})`;
                    option.dataset.client = JSON.stringify(client);
                    selector.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error searching clients:', error);
        }
    }
    
    async onClientSelect(event) {
        const clientId = event.target.value;
        if (!clientId) {
            this.hideClientData();
            return;
        }
        
        const selectedOption = event.target.selectedOptions[0];
        const clientData = JSON.parse(selectedOption.dataset.client);
        
        this.currentClient = clientData;
        await this.loadClientData(clientId);
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
    
    displayClientData(data) {
        const container = document.getElementById('clientMeasurementsContainer');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (!data.measurements || data.measurements.length === 0) {
            if (container) container.style.display = 'none';
            if (noDataMessage) noDataMessage.style.display = 'block';
            return;
        }
        
        if (container) container.style.display = 'block';
        if (noDataMessage) noDataMessage.style.display = 'none';
        
        // Update client info
        this.updateClientInfo(data.client_info, data.total_measurements);
        
        // Update measurements display
        this.updateLatestMeasurements(data.measurements[0]);
        
        // Update progress summary
        this.updateProgressSummary(data.analytics);
        
        // Update health information
        this.updateHealthInfo(data.client_info.profile);
        
        // Update measurement timeline
        this.updateMeasurementTimeline(data.measurements);
        
        // Update progress photos
        this.updateProgressPhotos(data.measurements[0]);
        
        // Create measurement chart
        this.createMeasurementChart(data.measurements);
    }
    
    updateClientInfo(clientInfo, totalMeasurements) {
        const detailsElements = [
            // Client details elements with animation delays
            { el: document.getElementById('clientName'), value: clientInfo.full_name || '-', delay: 0 },
            { el: document.getElementById('clientEmail'), value: clientInfo.email || '-', delay: 0.1 },
            { el: document.getElementById('clientAge'), value: (clientInfo.age != null ? clientInfo.age : '-') , delay: 0.2 },
            { el: document.getElementById('clientGender'), value: clientInfo.gender || '-', delay: 0.3 },
            { el: document.getElementById('clientActivityLevel'), value: clientInfo.activity_level || '-', delay: 0.4 }
        ];
        
        detailsElements.forEach(item => {
            if (item.el) {
                item.el.textContent = item.value;
                item.el.classList.add('animate-slide-up');
                item.el.style.animationDelay = `${item.delay}s`;
            }
        });
        
        // Normalize profile object from clientInfo
        const profile = (clientInfo && clientInfo.profile) ? clientInfo.profile : {};
        
        // Avatar with animation
        const avatarImg = document.getElementById('clientAvatar');
        if (avatarImg) {
            // Set avatar source
            if (profile.avatar) {
                avatarImg.src = profile.avatar;
            } else {
                // Use local AvatarGenerator if available, else fallback to default avatar
                const displayName = clientInfo.full_name || clientInfo.username || 'User';
                if (window.AvatarGenerator) {
                    avatarImg.src = AvatarGenerator.generateAvatar(displayName, { background: '667eea', color: 'fff', size: 64 });
                } else {
                    avatarImg.src = '/static/images/default-avatar.svg';
                }
            }
            
            // Add animation
            avatarImg.classList.add('animate-fade-in');
            avatarImg.style.animationDelay = '0.1s';
            
            // Add pulse effect on hover
            avatarImg.classList.add('hover-pulse');
        }
        
        // Update stats with animations
        const statsElements = [
            { 
                el: document.getElementById('totalMeasurements'),
                value: totalMeasurements || 0,
                delay: 0.3
            },
            { 
                el: document.getElementById('memberSince'),
                value: (clientInfo.date_joined || profile.date_joined) ? this.formatDate(clientInfo.date_joined || profile.date_joined) : '-',
                delay: 0.4
            },
            { 
                el: document.getElementById('completionRateValue'),
                value: `${clientInfo.completion_rate || 0}%`,
                delay: 0.5
            },
            { 
                el: document.getElementById('activePlans'),
                value: '...',  // Will be updated asynchronously
                delay: 0.6
            }
        ];
        
        statsElements.forEach(item => {
            if (item.el) {
                item.el.textContent = item.value;
                item.el.classList.add('animate-count-up');
                item.el.style.animationDelay = `${item.delay}s`;
            }
        });
        
        // Update active plans count asynchronously
        this.updateActivePlansCount(clientInfo.id);
        
        // Update Customize Plan actions (button/dropdown) based on active subscriptions
        this.updateCustomizePlanButtons(clientInfo.id);
        
        // Show chat with client button with animation
        document.querySelectorAll('[id="chatWithClientBtn"]').forEach((btn, index) => {
            btn.dataset.clientId = clientInfo.id;
            btn.style.display = 'inline-block';
            btn.classList.add('animate-fade-in');
            btn.style.animationDelay = `${0.5 + (index * 0.1)}s`;
        });
        
        // Add badges for client status if available
        this.updateClientStatusBadges(clientInfo, profile);
    }
    
    /**
     * Add status badges to client info based on profile data
     * @param {Object} clientInfo - Client information
     * @param {Object} profile - Client profile
     */
    updateClientStatusBadges(clientInfo, profile) {
        const badgesContainer = document.getElementById('clientStatusBadges');
        if (!badgesContainer) return;
        
        badgesContainer.innerHTML = '';
        let badgeDelay = 0.2;
        
        // Define possible badges
        const badges = [
            {
                condition: clientInfo.is_active,
                text: 'Active',
                class: 'badge-success'
            },
            {
                condition: profile.premium_member,
                text: 'Premium',
                class: 'badge-premium'
            },
            {
                condition: clientInfo.subscription_count > 3,
                text: 'Loyal',
                class: 'badge-info'
            },
            {
                condition: clientInfo.completion_rate >= 80,
                text: 'High Adherence',
                class: 'badge-primary'
            },
            {
                condition: clientInfo.has_recent_measurement,
                text: 'Recent Update',
                class: 'badge-warning'
            }
        ];
        
        // Add badges that match conditions
        badges.forEach(badge => {
            if (badge.condition) {
                const badgeEl = document.createElement('span');
                badgeEl.className = `client-badge ${badge.class} animate-fade-in`;
                badgeEl.style.animationDelay = `${badgeDelay}s`;
                badgeEl.textContent = badge.text;
                badgesContainer.appendChild(badgeEl);
                badgeDelay += 0.1;
            }
        });
    }

    /**
     * Toggle and populate the Customize Plan button/dropdown based on active or pending subscriptions
     */
    async updateCustomizePlanButtons(clientId) {
        const singleBtn = document.getElementById('customizePlanBtn');
        const group = document.getElementById('customizePlanGroup');
        const dropdown = document.getElementById('customizePlanDropdown');
        if (!singleBtn || !group || !dropdown || !clientId) return;

        // Reset UI
        singleBtn.style.display = 'none';
        group.style.display = 'none';
        dropdown.innerHTML = '';

        try {
            // Use coach-specific endpoint filtered by client; include both active and pending
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-plan-customization/client_subscriptions/?client_id=${clientId}`, { method: 'GET' });
            if (!resp || !resp.success || !resp.data) return;

            const data = resp.data;
            let subs = Array.isArray(data) ? data : (data.results || data.subscriptions || []);
            // Allow customizing for active or pending subscriptions
            const allowedStatuses = new Set(['active', 'pending']);
            subs = subs.filter(s => allowedStatuses.has((s.status || '').toLowerCase()));

            if (subs.length === 1) {
                const s = subs[0];
                const subId = s.id;
                const url = `/plan-management/coach/plan-customization/?subscription_id=${subId}`;
                singleBtn.href = url;
                singleBtn.style.display = 'inline-block';
            } else if (subs.length > 1) {
                subs.forEach(s => {
                    const subId = s.id;
                    const name = (s.product_plan && s.product_plan.name) ? s.product_plan.name : `Subscription #${subId}`;
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.className = 'dropdown-item';
                    a.href = `/plan-management/coach/plan-customization/?subscription_id=${subId}`;
                    a.textContent = name;
                    li.appendChild(a);
                    dropdown.appendChild(li);
                });
                group.style.display = 'inline-block';
            }
        } catch (e) {
            console.warn('Failed to update Customize Plan actions', e);
        }
    }

    // Fetch and update active plans count for the client (if element present)
    async updateActivePlansCount(clientId) {
        const activePlansEl = document.getElementById('activePlans');
        if (!activePlansEl || !clientId) return;
        try {
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-client-access/client_profile/?client_id=${clientId}`, { method: 'GET' });
            if (resp && resp.success && resp.data && resp.data.subscription_summary) {
                // Show total subscriptions to match the "Subscriptions" label
                const count = resp.data.subscription_summary.total_subscriptions || 0;
                activePlansEl.textContent = count;
            }
        } catch (e) {
            console.warn('Failed to fetch active plans count', e);
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
            { label: 'Front', photo: measurement.front_photo, icon: 'user', delay: 0 },
            { label: 'Side', photo: measurement.side_photo, icon: 'user-friends', delay: 0.1 },
            { label: 'Back', photo: measurement.back_photo, icon: 'user-shield', delay: 0.2 }
        ];
        
        // Check if any photos exist
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
        
        // Create photo grid container
        const photoGrid = document.createElement('div');
        photoGrid.className = 'photo-grid';
        container.appendChild(photoGrid);
        
        photos.forEach(p => {
            const photoContainer = document.createElement('div');
            photoContainer.className = 'photo-container animate-on-scroll';
            photoContainer.style.animationDelay = `${p.delay}s`;
            
            if (p.photo) {
                photoContainer.innerHTML = `
                    <div class="photo-card">
                        <div class="photo-wrapper">
                            <img src="${p.photo}" alt="${p.label} Photo" 
                                onclick="coachMeasurements.viewPhotoModal('${p.photo}', '${p.label}')">
                            <div class="photo-overlay">
                                <button class="btn btn-sm btn-light rounded-circle">
                                    <i class="fas fa-search-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="photo-label">
                            <i class="fas fa-${p.icon} me-1"></i>
                            ${p.label}
                        </div>
                    </div>
                `;
            } else {
                photoContainer.innerHTML = `
                    <div class="photo-card empty-photo">
                        <div class="photo-placeholder">
                            <i class="fas fa-camera fa-2x mb-2"></i>
                            <p class="mb-0">${p.label}</p>
                            <small>No photo</small>
                        </div>
                        <div class="photo-label">
                            <i class="fas fa-${p.icon} me-1"></i>
                            ${p.label}
                        </div>
                    </div>
                `;
            }
            
            photoGrid.appendChild(photoContainer);
        });
        
        // Add date information if available
        if (measurement.date) {
            const dateInfo = document.createElement('div');
            dateInfo.className = 'photo-date text-center mt-3';
            dateInfo.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-calendar-alt me-1"></i>
                    Photos from ${this.formatDate(measurement.date)}
                </small>
            `;
            container.appendChild(dateInfo);
        }
        
        // Trigger animations
        setTimeout(() => {
            document.querySelectorAll('#measurementPhotos .animate-on-scroll').forEach(el => {
                el.classList.add('animated');
            });
        }, 100);
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
                    onComplete: function() {
                        chartCanvas.style.opacity = 1;
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: {top: 10, bottom: 0}
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Weight (kg)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: {top: 0, bottom: 10}
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Body Fat (%)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            padding: {top: 0, bottom: 10}
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#333',
                        bodyColor: '#666',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
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
    
    /**
     * Opens a chat conversation with the selected client
     * Uses the messaging system to start or continue a conversation
     */
    async openClientChat(event) {
        try {
            // Get client ID either from the current client object or from event target dataset
            let clientId = null;
            let clientName = 'Client';
            
            if (event && event.currentTarget && event.currentTarget.dataset) {
                clientId = event.currentTarget.dataset.clientId;
                clientName = event.currentTarget.dataset.clientName || 'Client';
            } else if (this.currentClient) {
                clientId = this.currentClient.id;
                clientName = this.currentClient.full_name || this.currentClient.username || 'Client';
            }
            
            if (!clientId) {
                this.showError('No client selected for chat');
                return;
            }
            
            // Call the messaging system to open a chat with this client
            if (window.messagingSystem && typeof window.messagingSystem.openChat === 'function') {
                window.messagingSystem.openChat(clientId, clientName);
            } else {
                // Fallback to redirect to messaging page
                window.location.href = `/messaging/chat/?participant_id=${encodeURIComponent(clientId)}`;
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

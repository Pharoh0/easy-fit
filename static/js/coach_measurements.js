/**
 * Coach Client Measurements Manager
 * Handles client measurement viewing and analysis for coaches
 */

class CoachMeasurementsManager {
    constructor() {
        this.authManager = window.authManager;
        this.currentClient = null;
        this.measurementChart = null;
        this.clients = [];
        this.filteredClients = [];
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadClients();
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
        document.getElementById('clientSelector')?.addEventListener('change', this.onClientSelect.bind(this));
        
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
    
    populateClientSelector() {
        const selector = document.getElementById('clientSelector');
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
        await this.loadClientMeasurements(clientId);
    }
    
    async loadClientMeasurements(clientId) {
        try {
            this.showLoading();
            
            const response = await this.authManager.apiCall(
                `/plan-management/api/v1/coach-client-access/client_measurements/?client_id=${clientId}&limit=20`, {
                method: 'GET'
            });
            
            if (response.success) {
                this.displayClientData(response.data);
            } else {
                this.showError('Failed to load measurements: ' + response.error);
            }
        } catch (error) {
            console.error('Error loading measurements:', error);
            this.showError('Failed to load measurements');
        } finally {
            this.hideLoading();
        }
    }
    
    displayClientData(data) {
        const container = document.getElementById('clientMeasurementsContainer');
        const noDataMessage = document.getElementById('noDataMessage');
        
        if (!data.measurements || data.measurements.length === 0) {
            container.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        }
        
        noDataMessage.style.display = 'none';
        container.style.display = 'block';
        
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
        this.currentClient = clientInfo;
        const profile = clientInfo.profile || {};
        
        // Update client name and info
        const nameEl = document.getElementById('clientName');
        if (nameEl) nameEl.textContent = clientInfo.full_name || clientInfo.username || 'Client';
        const emailEl = document.getElementById('clientEmail');
        if (emailEl) emailEl.textContent = clientInfo.email || 'No email available';
        
        // Update client details
        const ageEl = document.getElementById('clientAge');
        if (ageEl) ageEl.textContent = profile.age ? `${profile.age} years` : 'Age unknown';
        const genderEl = document.getElementById('clientGender');
        if (genderEl) genderEl.textContent = profile.gender || 'Gender unknown';
        const activityEl = document.getElementById('clientActivity');
        if (activityEl) activityEl.textContent = this.formatActivityLevel(profile.activity_level);
        
        // Avatar
        const avatarImg = document.getElementById('clientAvatar');
        if (avatarImg) {
            if (profile.avatar) {
                avatarImg.src = profile.avatar;
            } else {
                avatarImg.src = this.generateAvatarUrl(clientInfo.full_name || clientInfo.username);
            }
        }
        
        // Update stats
        const totalMeasurementsEl = document.getElementById('totalMeasurements');
        if (totalMeasurementsEl) totalMeasurementsEl.textContent = totalMeasurements || 0;
        const memberSinceEl = document.getElementById('memberSince');
        if (memberSinceEl) memberSinceEl.textContent = '-';
        // Optional completion rate element may not exist in template; guard it
        const completionRateEl = document.getElementById('completionRateValue');
        if (completionRateEl) completionRateEl.textContent = `${clientInfo.completion_rate || 0}%`;
        // Update active plans count asynchronously (if element exists)
        this.updateActivePlansCount(clientInfo.id);
        // Update Customize Plan actions (button/dropdown) based on active subscriptions
        this.updateCustomizePlanButtons(clientInfo.id);
        
        // Show chat with client button
        document.querySelectorAll('[id="chatWithClientBtn"]').forEach(btn => {
            btn.dataset.clientId = clientInfo.id;
            btn.style.display = 'inline-block';
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
        
        measurements.forEach(m => {
            if (m.value) {
                const card = document.createElement('div');
                card.className = 'body-part-card';
                card.innerHTML = `
                    <i class="${m.icon} text-primary mb-2"></i>
                    <h6 class="mb-1">${m.label}</h6>
                    <h5 class="mb-0 text-primary">${m.value} ${m.unit}</h5>
                `;
                container.appendChild(card);
            }
        });
    }
    
    updateProgressSummary(analytics) {
        const container = document.getElementById('progressSummary');
        
        if (!analytics.progress || Object.keys(analytics.progress).length === 0) {
            container.innerHTML = '<p class="text-muted">No progress data available</p>';
            return;
        }
        
        let html = '';
        const importantMetrics = ['weight', 'body_fat_percentage', 'waist', 'chest'];
        
        importantMetrics.forEach(metric => {
            const progress = analytics.progress[metric];
            if (progress) {
                const isPositive = progress.change > 0;
                const progressClass = metric === 'weight' || metric === 'body_fat_percentage' || metric === 'waist' 
                    ? (isPositive ? 'progress-negative' : 'progress-positive')
                    : (isPositive ? 'progress-positive' : 'progress-negative');
                
                html += `
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h6 class="mb-0">${this.formatMetricName(metric)}</h6>
                            <small class="text-muted">${progress.latest} → ${progress.oldest}</small>
                        </div>
                        <div class="text-end">
                            <span class="progress-indicator ${progressClass}">
                                ${progress.change > 0 ? '+' : ''}${progress.change}
                                <i class="fas fa-${progress.change > 0 ? 'arrow-up' : 'arrow-down'} ms-1"></i>
                            </span>
                            <br>
                            <small class="text-muted">${progress.percentage_change.toFixed(1)}%</small>
                        </div>
                    </div>
                `;
            }
        });
        
        if (analytics.measurement_period) {
            html += `
                <hr>
                <div class="text-center">
                    <small class="text-muted">
                        Progress over ${analytics.measurement_period.duration_days} days<br>
                        ${analytics.measurement_period.start_date} to ${analytics.measurement_period.end_date}
                    </small>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    updateHealthInfo(profile) {
        const container = document.getElementById('healthInfo');
        
        let html = '';
        
        if (profile.fitness_goals) {
            html += `
                <div class="mb-3">
                    <h6><i class="fas fa-bullseye me-2"></i>Fitness Goals</h6>
                    <p class="small text-muted">${profile.fitness_goals}</p>
                </div>
            `;
        }
        
        if (profile.health_conditions) {
            html += `
                <div class="mb-3">
                    <h6><i class="fas fa-heartbeat me-2"></i>Health Conditions</h6>
                    <p class="small text-muted">${profile.health_conditions}</p>
                </div>
            `;
        }
        
        if (profile.dietary_preferences) {
            html += `
                <div class="mb-3">
                    <h6><i class="fas fa-utensils me-2"></i>Dietary Preferences</h6>
                    <p class="small text-muted">${profile.dietary_preferences}</p>
                </div>
            `;
        }
        
        if (profile.allergies) {
            html += `
                <div class="mb-3">
                    <h6><i class="fas fa-exclamation-triangle me-2"></i>Allergies</h6>
                    <p class="small text-warning">${profile.allergies}</p>
                </div>
            `;
        }
        
        if (!html) {
            html = '<p class="text-muted">No health information available</p>';
        }
        
        container.innerHTML = html;
    }
    
    updateMeasurementTimeline(measurements) {
        const container = document.getElementById('measurementTimeline');
        container.innerHTML = '';
        
        measurements.slice(0, 5).forEach(measurement => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            const date = new Date(measurement.date).toLocaleDateString();
            const weight = measurement.weight ? `${measurement.weight} kg` : 'N/A';
            const bodyFat = measurement.body_fat_percentage ? `${measurement.body_fat_percentage}%` : 'N/A';
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${date}</h6>
                        <small class="text-muted">Weight: ${weight} | Body Fat: ${bodyFat}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary" onclick="coachMeasurements.viewMeasurementDetails('${measurement.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    updateProgressPhotos(measurement) {
        const container = document.getElementById('measurementPhotos');
        container.innerHTML = '';
        
        const photos = [
            { label: 'Front', photo: measurement.front_photo },
            { label: 'Side', photo: measurement.side_photo },
            { label: 'Back', photo: measurement.back_photo }
        ];
        
        photos.forEach(p => {
            const photoContainer = document.createElement('div');
            photoContainer.className = 'photo-container';
            
            if (p.photo) {
                photoContainer.innerHTML = `
                    <img src="${p.photo}" alt="${p.label} Photo" onclick="coachMeasurements.viewPhotoModal('${p.photo}', '${p.label}')">
                    <div class="photo-label">${p.label}</div>
                `;
            } else {
                photoContainer.innerHTML = `
                    <div class="text-center text-muted">
                        <i class="fas fa-camera fa-2x mb-2"></i>
                        <p class="mb-0">${p.label}</p>
                        <small>No photo</small>
                    </div>
                `;
            }
            
            container.appendChild(photoContainer);
        });
    }
    
    createMeasurementChart(measurements) {
        const chartCanvas = document.getElementById('measurementChart');
        if (!chartCanvas || typeof window.Chart === 'undefined') {
            console.warn('Chart.js not loaded or chart canvas missing; skipping chart creation');
            return;
        }
        const ctx = chartCanvas.getContext('2d');
        
        if (this.measurementChart) {
            this.measurementChart.destroy();
        }
        
        const sortedMeasurements = measurements.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const labels = sortedMeasurements.map(m => new Date(m.date).toLocaleDateString());
        const weightData = sortedMeasurements.map(m => m.weight || null);
        const bodyFatData = sortedMeasurements.map(m => m.body_fat_percentage || null);
        
        this.measurementChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Weight (kg)',
                        data: weightData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Body Fat (%)',
                        data: bodyFatData,
                        borderColor: '#f093fb',
                        backgroundColor: 'rgba(240, 147, 251, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Weight (kg)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Body Fat (%)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
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
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('clientMeasurementsContainer').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'none';
    }
    
    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
    
    hideClientData() {
        document.getElementById('clientMeasurementsContainer').style.display = 'none';
        document.getElementById('noDataMessage').style.display = 'none';
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
    
    viewMeasurementDetails(measurementId) {
        // Implement detailed measurement view
        console.log('View measurement details:', measurementId);
    }
    
    viewPhotoModal(photoUrl, label) {
        // Implement photo modal view
        console.log('View photo:', photoUrl, label);
    }
    
    /**
     * Initializes chat-related buttons throughout the interface
     */
    initChatButtons() {
        // Attach to any chat buttons by ID or class
        const buttons = document.querySelectorAll('#chatWithClientBtn, .chat-with-client-link');
        buttons.forEach(btn => {
            btn.removeEventListener('click', this.openClientChatBound);
            // Keep a bound reference to remove duplicates safely
            if (!this.openClientChatBound) {
                this.openClientChatBound = this.openClientChat.bind(this);
            }
            btn.addEventListener('click', this.openClientChatBound);
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
            
            if (event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.clientId) {
                // Get client ID from the button's dataset
                clientId = event.currentTarget.dataset.clientId;
                console.log('Using client ID from button dataset:', clientId);
            } else if (this.currentClient && this.currentClient.id) {
                // Get client ID from the current client object
                clientId = this.currentClient.id;
                console.log('Using client ID from current client:', clientId);
            }
            
            if (!clientId) {
                this.showError('Client information not available');
                console.error('No client ID available for chat');
                return;
            }
            
            // Find active subscription for context
        let subscriptionId = null;
        
        try {
            // Fetch subscriptions (active or pending) for chat context
            const resp = await this.authManager.apiCall(`/plan-management/api/v1/coach-plan-customization/client_subscriptions/?client_id=${clientId}`, { method: 'GET' });
            if (resp && resp.success && resp.data) {
                const data = resp.data;
                let subs = Array.isArray(data) ? data : (data.results || data.subscriptions || []);
                const active = subs.filter(s => (s.status || '').toLowerCase() === 'active');
                const pending = subs.filter(s => (s.status || '').toLowerCase() === 'pending');
                const pick = active[0] || pending[0];
                if (pick) {
                    subscriptionId = pick.id;
                }
            }
        } catch (error) {
            console.warn('Could not fetch subscription context:', error);
            // Continue without subscription context
        }
            
            // Construct URL with parameters
            let chatUrl = `/messaging/chat/?participant_id=${clientId}`;
            if (subscriptionId) {
                chatUrl += `&plan_subscription_id=${subscriptionId}`;
            }
            
            console.log('Opening chat URL:', chatUrl);
            
            // Open the messaging page
            window.location.href = chatUrl;
            
        } catch (error) {
            console.error('Error opening chat:', error);
            this.showError('Failed to open chat with client');
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

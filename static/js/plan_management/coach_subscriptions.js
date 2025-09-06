/**
 * Coach Subscriptions Management
 * Initializes the DataTable, loads subscriptions from DRF with pagination and filters,
 * and handles lifecycle actions (activate, complete, cancel) with JWT security via APIBase.
 */

(function() {
  class CoachSubscriptionsManager {
    constructor() {
      this.tableEl = document.getElementById('subscriptionsTable');
      if (!this.tableEl) return; // Guard if section not on page

      this.paginationContainerId = 'subscriptions-pagination';
      this.filtersContainerId = 'subscriptions-filters';

      this.currentPage = 1;
      this.pageSize = 10;
      this.currentStatus = '';
      this.currentIsActive = '';
      this.currentPlanType = '';

      this.dt = null; // DataTable instance

      this.bindTabEvents();
      this.initFilters();
      this.initTable();
      this.loadSubscriptions();
      this.bindActionHandlers();
    }

    bindTabEvents() {
      // Status tabs
      const tabs = document.querySelectorAll('.subscription-status-tab');
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          tabs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentStatus = btn.dataset.status || '';
          this.currentPage = 1;
          this.loadSubscriptions();
        });
      });
    }

    initFilters() {
      const container = document.getElementById(this.filtersContainerId);
      if (!container || typeof PaginationUtils === 'undefined') return;

      PaginationUtils.initializeFilters({
        containerId: this.filtersContainerId,
        filters: [
          {
            id: 'is_active',
            type: 'select',
            label: 'Active State',
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ],
            colSize: 3
          },
          {
            id: 'plan_type',
            type: 'select',
            label: 'Plan Type',
            options: [
              { value: 'workout', label: 'Workout' },
              { value: 'diet', label: 'Diet' }
            ],
            colSize: 3
          }
        ]
      }, (values) => {
        this.currentIsActive = values.is_active || '';
        this.currentPlanType = values.plan_type || '';
        this.currentPage = 1;
        this.loadSubscriptions();
      });
    }

    initTable() {
      // Initialize DataTable with local data; we control paging via DRF + PaginationUtils
      this.dt = $(this.tableEl).DataTable({
        paging: false,
        searching: true,
        info: false,
        ordering: true,
        autoWidth: false,
        columns: [
          { title: 'Client' },
          { title: 'Plan' },
          { title: 'Subscribed' },
          { title: 'Status', orderable: false },
          { title: 'Actions', orderable: false }
        ]
      });
    }

    async loadSubscriptions(page = null) {
      if (page) this.currentPage = page;
      APIBase.showLoading(this.paginationContainerId);

      const query = {
        page: this.currentPage,
        page_size: this.pageSize
      };
      if (this.currentStatus) query.status = this.currentStatus;
      if (this.currentIsActive) query.is_active = this.currentIsActive;
      if (this.currentPlanType) query.plan_type = this.currentPlanType;

      try {
        const resp = await SubscriptionsAPI.getSubscriptions(query);
        if (!resp || !resp.success) {
          return APIBase.showError(this.paginationContainerId, 'Failed to load subscriptions');
        }
        const subs = resp.subscriptions || [];
        const pagination = resp.pagination || { count: subs.length, page_size: this.pageSize, current_page: this.currentPage, total_pages: 1 };

        // Rebuild table rows
        this.dt.clear();
        for (const s of subs) {
          const clientName = (s.client && String(s.client).trim()) || 'Client';
          const avatar = (typeof AvatarGenerator !== 'undefined') ? AvatarGenerator.generateAvatar(clientName, { size: 32 }) : null;
          const clientHtml = `
            <div class="d-flex align-items-center">
              ${avatar ? `<img src="${avatar}" class="rounded-circle me-2" width="32" height="32" alt="${clientName}">` : ''}
              <span>${this.escapeHtml(clientName)}</span>
            </div>`;
          const planName = (s.product_plan && s.product_plan.name) ? s.product_plan.name : 'N/A';
          const subscribed = SubscriptionsAPI.formatDate(s.subscribed_at);
          const st = SubscriptionsAPI.formatStatus(s.status);
          const statusHtml = `<span class="${st.class}">${st.text}</span>`;

          const id = s.id;
          const planId = s.product_plan?.id;
          const clientId = s.client?.id;
          const viewUrl = `/plan-management/coach/client-measurements/?subscription_id=${id}`;
          const customizeUrl = planId && clientId ? `/plan-management/coach/plan-customization/${planId}/?client_id=${clientId}` : `/plan-management/coach/plan-customization/?subscription_id=${id}`;

          const actions = [];
          actions.push(`<a href="${viewUrl}" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-eye me-1"></i>View</a>`);
          actions.push(`<a href="${customizeUrl}" class="btn btn-sm btn-outline-success me-1"><i class="fas fa-edit me-1"></i>Customize</a>`);

          if (s.status === 'pending') {
            actions.push(`<button class="btn btn-sm btn-success me-1 btn-activate" data-id="${id}"><i class="fas fa-check me-1"></i>Activate</button>`);
            actions.push(`<button class="btn btn-sm btn-danger btn-cancel" data-id="${id}"><i class="fas fa-times me-1"></i>Cancel</button>`);
          } else if (s.status === 'active') {
            actions.push(`<button class="btn btn-sm btn-info me-1 btn-complete" data-id="${id}"><i class="fas fa-flag-checkered me-1"></i>Complete</button>`);
            actions.push(`<button class="btn btn-sm btn-danger btn-cancel" data-id="${id}"><i class="fas fa-times me-1"></i>Cancel</button>`);
          }

          const actionsHtml = `<div class="d-flex flex-wrap">${actions.join('')}</div>`;

          this.dt.row.add([
            clientHtml,
            this.escapeHtml(planName),
            this.escapeHtml(subscribed),
            statusHtml,
            actionsHtml
          ]);
        }
        this.dt.draw(false);

        // Render pagination
        PaginationUtils.renderPagination(pagination, this.paginationContainerId, (newPage) => this.loadSubscriptions(newPage));
      } catch (err) {
        console.error(err);
        APIBase.showError(this.paginationContainerId, 'Failed to load subscriptions');
      }
    }

    bindActionHandlers() {
      // Delegate action buttons
      $(this.tableEl).on('click', '.btn-activate', async (e) => {
        const btn = e.currentTarget;
        const id = Number(btn.getAttribute('data-id'));
        if (!(await utils.confirm({ title: 'Activate Subscription', message: 'Activate this subscription?', confirmText: 'Activate', variant: 'success' }))) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Activating...';
        try {
          const res = await SubscriptionsAPI.activateSubscription(id);
          if (res && res.success) {
            const msg = (res.data && res.data.detail) ? res.data.detail : 'Subscription activated';
            if (window.utils && typeof window.utils.showToast === 'function') utils.showToast(msg, 'success');
            const returnedStatus = (res.data && res.data.subscription && res.data.subscription.status) || null;
            if (returnedStatus === 'completed' && window.utils && typeof window.utils.showToast === 'function') {
              utils.showToast('Note: Plan has already ended, so the subscription was immediately marked as completed.', 'warning');
            }
            this.loadSubscriptions(this.currentPage);
          } else {
            if (window.utils && typeof utils.handleApiError === 'function') {
              utils.handleApiError(res, 'Activate failed');
            } else if (window.utils && typeof window.utils.showToast === 'function') {
              utils.showToast('Activate failed', 'danger');
            } else {
              console.error('Activate failed', res);
            }
          }
        } catch (err) {
          if (window.utils && typeof utils.handleApiError === 'function') {
            utils.handleApiError(err, 'Activate failed');
          } else if (window.utils && typeof window.utils.showToast === 'function') {
            utils.showToast('Activate failed', 'danger');
          } else {
            console.error('Activate failed', err);
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      });

      $(this.tableEl).on('click', '.btn-cancel', async (e) => {
        const btn = e.currentTarget;
        const id = Number(btn.getAttribute('data-id'));
        if (!(await utils.confirm({ title: 'Cancel Subscription', message: 'Cancel this subscription?', confirmText: 'Cancel', variant: 'danger' }))) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Cancelling...';
        try {
          const res = await SubscriptionsAPI.cancelSubscription(id);
          if (res && res.success) {
            const msg = (res.data && res.data.detail) ? res.data.detail : 'Subscription cancelled';
            if (window.utils && typeof window.utils.showToast === 'function') utils.showToast(msg, 'success');
            this.loadSubscriptions(this.currentPage);
          } else {
            if (window.utils && typeof utils.handleApiError === 'function') {
              utils.handleApiError(res, 'Cancel failed');
            } else if (window.utils && typeof window.utils.showToast === 'function') {
              utils.showToast('Cancel failed', 'danger');
            } else {
              console.error('Cancel failed', res);
            }
          }
        } catch (err) {
          if (window.utils && typeof utils.handleApiError === 'function') {
            utils.handleApiError(err, 'Cancel failed');
          } else if (window.utils && typeof window.utils.showToast === 'function') {
            utils.showToast('Cancel failed', 'danger');
          } else {
            console.error('Cancel failed', err);
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      });

      $(this.tableEl).on('click', '.btn-complete', async (e) => {
        const btn = e.currentTarget;
        const id = Number(btn.getAttribute('data-id'));
        if (!(await utils.confirm({ title: 'Complete Subscription', message: 'Mark this subscription as completed?', confirmText: 'Complete', variant: 'primary' }))) return;
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Completing...';
        try {
          const res = await SubscriptionsAPI.completeSubscription(id);
          if (res && res.success) {
            const msg = (res.data && res.data.detail) ? res.data.detail : 'Subscription completed';
            if (window.utils && typeof window.utils.showToast === 'function') utils.showToast(msg, 'success');
            this.loadSubscriptions(this.currentPage);
          } else {
            if (window.utils && typeof utils.handleApiError === 'function') {
              utils.handleApiError(res, 'Complete failed');
            } else if (window.utils && typeof window.utils.showToast === 'function') {
              utils.showToast('Complete failed', 'danger');
            } else {
              console.error('Complete failed', res);
            }
          }
        } catch (err) {
          if (window.utils && typeof utils.handleApiError === 'function') {
            utils.handleApiError(err, 'Complete failed');
          } else if (window.utils && typeof window.utils.showToast === 'function') {
            utils.showToast('Complete failed', 'danger');
          } else {
            console.error('Complete failed', err);
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = originalHtml;
        }
      });
    }

    // Utility to escape HTML for text insertions
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Guard for JWT presence; allow page to load but actions will redirect on 401 via APIBase
    try { new CoachSubscriptionsManager(); } catch (e) { console.error(e); }
  });
})();

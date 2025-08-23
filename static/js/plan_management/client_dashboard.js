'use strict';

(function() {
  let subsTable = null;
  let isLoading = false;

  function setLoading(state) {
    isLoading = state;
    const el = document.getElementById('subsLoading');
    const btn = document.getElementById('reloadSubs');
    if (el) el.style.display = state ? '' : 'none';
    if (btn) btn.disabled = state;
  }

  function showError(message) {
    const c = document.getElementById('subsError');
    if (!c) return;
    c.innerHTML = `
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <i class="bi bi-exclamation-triangle me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  }

  function initTable() {
    subsTable = $('#subscriptionsTable').DataTable({
      data: [],
      dom: "<'row mb-2'<'col-md-6'l><'col-md-6'f>>" +
           "rt" +
           "<'row mt-2'<'col-md-5'i><'col-md-7'p>>",
      language: {
        search: '',
        lengthMenu: 'Show _MENU_ entries'
      },
      columns: [
        {
          title: 'Plan',
          data: null,
          render: (row) => row?.product_plan?.name || '—'
        },
        {
          title: 'Type',
          data: null,
          render: (row) => (row?.product_plan?.plan_type || '—').toString().toUpperCase()
        },
        {
          title: 'Coach',
          data: null,
          render: (row) => row?.product_plan?.coach_info?.display_name || '—'
        },
        {
          title: 'Price',
          data: null,
          className: 'text-nowrap',
          render: (row) => {
            const p = row?.product_plan?.price;
            return (p !== undefined && p !== null)
              ? (window.utils ? window.utils.formatCurrency(p) : `$${parseFloat(p).toFixed(2)}`)
              : '—';
          }
        },
        {
          title: 'Status',
          data: 'status',
          render: (status) => {
            const s = window.SubscriptionsAPI.formatStatus(status);
            return `<span class="${s.class} status-badge">${s.text}</span>`;
          }
        },
        {
          title: 'Subscribed On',
          data: 'subscribed_at',
          className: 'text-nowrap',
          render: (d) => window.SubscriptionsAPI.formatDate(d)
        },
        {
          title: 'Actions',
          data: null,
          orderable: false,
          searchable: false,
          className: 'text-nowrap text-end',
          render: (row) => {
            const id = row.id;
            const status = (row.status || '').toString().toLowerCase();
            const canCancel = ['active','pending'].includes(status);
            const cancelBtn = canCancel
              ? `<button type="button" class="btn btn-outline-danger btn-cancel-sub" data-id="${id}" title="Cancel subscription">
                   <i class="bi bi-x-circle"></i>
                 </button>`
              : '';
            return `
              <div class="btn-group btn-group-sm" role="group">
                <a class="btn btn-outline-primary" href="/plan-management/client/plan-detail/${id}/" title="View details">
                  <i class="bi bi-eye"></i>
                </a>
                ${cancelBtn}
              </div>
            `;
          }
        }
      ],
      responsive: true,
      pageLength: 10,
      lengthChange: true,
      order: [[5, 'desc']],
      initComplete: function() {
        try {
          const $input = $('#subscriptionsTable_filter input');
          $input.attr('placeholder', 'Search subscriptions...');
        } catch (e) { /* ignore */ }
      }
    });

    // Delegated cancel handler
    $('#subscriptionsTable').on('click', '.btn-cancel-sub', async function() {
      const id = $(this).data('id');
      const proceed = await utils.confirm({ title: 'Cancel Subscription', message: 'Cancel this subscription?', confirmText: 'Cancel', variant: 'danger' });
      if (!proceed) return;
      try {
        setLoading(true);
        const resp = await window.SubscriptionsAPI.cancelSubscription(id, {});
        if (!resp.success) throw new Error(resp.error || 'Cancellation failed');
        await loadData();
      } catch (e) {
        console.error(e);
        showError(e.message || 'Failed to cancel subscription');
      } finally {
        setLoading(false);
      }
    });
  }

  async function loadData() {
    try {
      setLoading(true);
      // Read selected status; pass only if not 'all'
      const statusSel = document.getElementById('statusFilter');
      const selectedStatus = statusSel ? statusSel.value : 'all';
      const query = {
        page: 1,
        page_size: 100
      };
      if (selectedStatus && selectedStatus !== 'all') {
        query.status = selectedStatus;
      }

      const { success, subscriptions, error } = await window.SubscriptionsAPI.getSubscriptions(query);
      if (!success) throw new Error(error || 'Failed to load subscriptions');

      // Update count
      const countEl = document.getElementById('totalCount');
      if (countEl) countEl.textContent = subscriptions.length;

      // Load into table
      subsTable.clear();
      subsTable.rows.add(subscriptions || []);
      subsTable.draw();
    } catch (e) {
      console.error(e);
      showError(e.message || 'Unable to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    const reloadBtn = document.getElementById('reloadSubs');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadData());
    const statusSel = document.getElementById('statusFilter');
    if (statusSel) statusSel.addEventListener('change', () => loadData());
    const resetBtn = document.getElementById('resetFilters');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      const sel = document.getElementById('statusFilter');
      if (sel) sel.value = 'all';
      if (subsTable) subsTable.search('').draw();
      loadData();
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('subscriptionsTable')) return;
    if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
      showError('jQuery/DataTables not loaded.');
      return;
    }
    initTable();
    bindEvents();
    loadData();
  });
})();

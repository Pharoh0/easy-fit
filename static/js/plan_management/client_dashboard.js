'use strict';

(function() {
  let subsTable = null;
  let logsTable = null;
  let isLoading = false;
  let progressChart = null;
  let completionChart = null;
  let wellnessChart = null;
  let dashboardCache = null;

  function setLoading(state) {
    isLoading = state;
    const el = document.getElementById('subsLoading');
    const btn = document.getElementById('reloadSubs');
    if (el) el.style.display = state ? '' : 'none';
    if (btn) btn.disabled = state;
  }

  // ------- Measurements Snapshot -------
  async function loadMeasurementsSnapshot() {
    try {
      const user = (window.authManager && window.authManager.getUser && window.authManager.getUser()) || null;
      const clientId = user && user.id ? user.id : null;
      if (!clientId) return;
      // latest
      const latestResp = await APIBase.request(`/profiles/api/v1/client/enhanced-measurements/latest/?client_id=${clientId}&empty_ok=1`);
      if (latestResp && latestResp.success && latestResp.data) {
        const m = latestResp.data;
        setText('mWeight', m && m.weight != null ? `${m.weight} kg` : '—');
        setText('mBodyFat', m && m.body_fat_percentage != null ? `${Number(m.body_fat_percentage).toFixed(1)}%` : '—');
        const waist = (m && m.body_part_measurements || []).find(bp => (bp && (bp.body_part && (bp.body_part.name==='waist' || bp.body_part.display_name==='Waist'))));
        setText('mWaist', waist && waist.value != null ? `${waist.value} ${waist.unit || ''}`.trim() : '—');
        setText('mUpdated', m && m.date ? window.utils.formatDate(m.date) : '—');
      }
      // sparkline progress
      const progResp = await APIBase.request(`/profiles/api/v1/client/enhanced-measurements/progress/?client_id=${clientId}&empty_ok=1`);
      if (progResp && progResp.success && progResp.data && progResp.data.measurements) {
        const labels = progResp.data.measurements.map(x => x.date);
        const values = progResp.data.measurements.map(x => x.weight || null);
        const ctx = document.getElementById('measurementSparkline');
        if (ctx && window.Chart) {
          const spark = new window.Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ data: values, borderColor: 'rgba(13,110,253,0.9)', backgroundColor: 'rgba(13,110,253,0.15)', tension: 0.3, fill: true, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
          });
        }
      }
    } catch (e) {
      console.warn('Measurements snapshot failed', e);
    }
  }

  // ------- Plan Statistics & Per-plan progress -------
  function renderPlanStats(stats) {
    try {
      const counts = (stats && stats.subscription_counts) || { active: 0, completed: 0, pending: 0, cancelled: 0, expired: 0 };
      const ctx = document.getElementById('subsStatusChart');
      if (ctx && window.Chart) {
        new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Active','Completed','Pending','Cancelled','Expired'],
            datasets: [{ data: [counts.active||0, counts.completed||0, counts.pending||0, counts.cancelled||0, counts.expired||0], backgroundColor: ['#198754','#0dcaf0','#ffc107','#dc3545','#6c757d'], borderWidth: 0 }]
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: '60%' }
        });
      }
    } catch (e) { console.warn('renderPlanStats failed', e); }
  }

  function renderPerPlanTable(perPlan) {
    try {
      const $ = window.jQuery || window.$;
      if (!$ || !$.fn || typeof $.fn.DataTable !== 'function') return;
      const table = $('#progressTable').DataTable({
        destroy: true,
        data: perPlan || [],
        pageLength: 5,
        columns: [
          { data: 'plan_name' },
          { data: 'status', render: (s) => { const f = window.SubscriptionsAPI.formatStatus(s); return `<span class="${f.class}">${f.text}</span>`; } },
          { data: 'plan_type', render: (t) => (t||'').toString().toUpperCase() },
          { data: 'coach_name', render: (v) => v || '—' },
          { data: 'completion_percentage', render: (v) => `${Number(v||0).toFixed(1)}%` },
          { data: 'adherence_rate', render: (v) => `${Number(v||0).toFixed(1)}%` },
          { data: 'subscribed_at', render: (d) => window.utils.formatDate(d) },
          { data: null, orderable: false, render: (row) => `<a class="btn btn-sm btn-outline-primary" href="/plan-management/client/plan-detail/${row.subscription_id}/">Continue</a>` }
        ]
      });
    } catch (e) { console.warn('renderPerPlanTable failed', e); }
  }

  // ------- Recommendations -------
  async function loadRecommendations() {
    try {
      const container = document.getElementById('recoContainer');
      if (!container) return;
      const filters = getFiltersFromUI();
      const planType = (filters.plan_type || '').toLowerCase();
      const q = new URLSearchParams();
      q.append('is_active','true');
      if (planType) q.append('plan_type', planType === 'nutrition' ? 'diet' : (planType === 'hybrid' ? 'combined' : planType));
      q.append('page_size','10');
      const resp = await APIBase.request(`/plan-management/api/v1/product-plans/?${q.toString()}`);
      container.innerHTML = '';
      if (!resp.success) { container.innerHTML = '<div class="text-muted">No recommendations right now.</div>'; return; }
      const arr = Array.isArray(resp.data) ? resp.data : (resp.data.results || []);
      // Sort by rating_average desc then rating_count desc then total_subscribers desc
      arr.sort((a,b) => (Number(b.rating_average||0) - Number(a.rating_average||0)) || (Number(b.rating_count||0) - Number(a.rating_count||0)) || (Number(b.total_subscribers||0) - Number(a.total_subscribers||0)));
      const top = arr.slice(0,3);
      if (!top.length) { container.innerHTML = '<div class="text-muted">No recommendations right now.</div>'; return; }
      top.forEach(p => {
        const price = window.utils.formatCurrency(p.price || p.price_per_session || 0);
        const rating = (p.rating_average!=null) ? `${Number(p.rating_average).toFixed(1)} ★ (${p.rating_count||0})` : 'No ratings';
        const el = document.createElement('div');
        el.className = 'border rounded p-2';
        el.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-semibold">${p.name}</div>
              <div class="small text-muted">${(p.plan_type||'').toUpperCase()} • ${rating}</div>
            </div>
            <div class="text-nowrap ms-2">${price}</div>
          </div>
          <div class="mt-2 d-flex gap-2">
            <a class="btn btn-sm btn-outline-primary" href="/plan-management/client/plan-detail/${p.id}/">View</a>
            <a class="btn btn-sm btn-primary" href="/plan-management/client/browse-plans/">Subscribe</a>
          </div>
        `;
        container.appendChild(el);
      });
    } catch (e) {
      console.warn('loadRecommendations failed', e);
    }
  }

  // ------- Add Details for Today -------
  async function handleAddDetails() {
    try {
      const options = (dashboardCache && dashboardCache.options && dashboardCache.options.progress_options) || [];
      if (!options.length) {
        window.utils && window.utils.showToast('No subscriptions found. Browse plans to get started.', 'warning');
        return;
      }
      let progressId = null;
      if (options.length === 1) {
        progressId = options[0].progress_id;
      } else if (window.utils && window.utils.prompt) {
        const selectOptions = options.map(o => ({ value: String(o.progress_id), label: `${o.plan_name} (${(o.plan_type||'').toUpperCase()})` }));
        const val = await window.utils.prompt({
          title: 'Add Details',
          message: 'Select plan for today\'s details:',
          inputType: 'select',
          selectOptions,
          required: true,
          confirmText: 'Next'
        });
        if (!val) return;
        progressId = parseInt(val, 10);
      } else {
        progressId = options[0].progress_id;
      }

      const moodStr = await (window.utils && window.utils.prompt ? window.utils.prompt({ title: 'Mood (1-5)', message: 'How was your mood today?', inputType: 'text', placeholder: '1-5', required: false, confirmText: 'Next' }) : null);
      const energyStr = await (window.utils && window.utils.prompt ? window.utils.prompt({ title: 'Energy (1-5)', message: 'How was your energy level?', inputType: 'text', placeholder: '1-5', required: false, confirmText: 'Next' }) : null);
      const waterStr = await (window.utils && window.utils.prompt ? window.utils.prompt({ title: 'Water (L)', message: 'How many liters of water did you drink?', inputType: 'text', placeholder: 'e.g., 2.5', required: false, confirmText: 'Next' }) : null);
      const sleepStr = await (window.utils && window.utils.prompt ? window.utils.prompt({ title: 'Sleep (hours)', message: 'How many hours did you sleep?', inputType: 'text', placeholder: 'e.g., 7.5', required: false, confirmText: 'Next' }) : null);
      const caloriesStr = await (window.utils && window.utils.prompt ? window.utils.prompt({ title: 'Calories burned', message: 'Estimated calories burned today (optional):', inputType: 'text', placeholder: 'e.g., 450', required: false, confirmText: 'Save' }) : null);
      const markDone = await (window.utils && window.utils.confirm ? window.utils.confirm({ title: 'Mark today complete?', message: 'Do you want to mark today as completed?', confirmText: 'Yes', variant: 'success' }) : false);

      const body = { progress_id: progressId };
      if (moodStr) body.mood_rating = Math.min(5, Math.max(1, parseInt(moodStr, 10)));
      if (energyStr) body.energy_level = Math.min(5, Math.max(1, parseInt(energyStr, 10)));
      if (waterStr) body.water_intake_liters = parseFloat(waterStr);
      if (sleepStr) body.sleep_hours = parseFloat(sleepStr);
      if (caloriesStr) body.calories_burned = parseInt(caloriesStr, 10);
      if (markDone) body.day_completed = true;

      const resp = await APIBase.request('/plan-management/api/v1/daily-progress/log_today/', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!resp.success) throw new Error(resp.error || 'Failed to save details');
      window.utils && window.utils.showToast('Today\'s details saved.', 'success');
      await reloadLogsTable();
      await loadDashboardSummary();
    } catch (e) {
      console.error(e);
      window.utils && window.utils.showToast(e.message || 'Failed to save details', 'danger');
    }
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

  // ------- Filters state helpers -------
  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getFiltersFromUI() {
    const preset = document.getElementById('presetRange');
    const planTypeSel = document.getElementById('planTypeFilter');
    const subsSel = document.getElementById('subscriptionFilter');
    const activeOnly = document.getElementById('activeOnly');
    const inputFrom = document.getElementById('dateFrom');
    const inputTo = document.getElementById('dateTo');

    let date_from = null;
    let date_to = null;
    const today = new Date();
    const presetVal = preset ? preset.value : '30';
    if (presetVal === 'custom') {
      date_from = (inputFrom && inputFrom.value) ? inputFrom.value : null;
      date_to = (inputTo && inputTo.value) ? inputTo.value : null;
    } else {
      const days = parseInt(presetVal, 10) || 30;
      const from = new Date(today);
      from.setDate(from.getDate() - days);
      date_from = formatDate(from);
      date_to = formatDate(today);
    }

    return {
      date_from,
      date_to,
      plan_type: planTypeSel ? (planTypeSel.value || null) : null,
      subscription_id: subsSel ? (subsSel.value || null) : null,
      active_only: activeOnly && activeOnly.checked ? 'true' : null,
    };
  }

  function applyPresetRangeUI() {
    const preset = document.getElementById('presetRange');
    const inputFrom = document.getElementById('dateFrom');
    const inputTo = document.getElementById('dateTo');
    if (!preset || !inputFrom || !inputTo) return;
    const isCustom = preset.value === 'custom';
    inputFrom.disabled = !isCustom;
    inputTo.disabled = !isCustom;
  }

  function buildQuery(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qs.append(k, v);
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  // ------- Dashboard summary & charts -------
  async function loadDashboardSummary() {
    try {
      setLoading(true);
      const filters = getFiltersFromUI();
      const url = `/plan-management/api/v1/plan-progress/dashboard_summary/${buildQuery(filters)}`;
      const resp = await APIBase.request(url);
      if (!resp.success || !resp.data || resp.data.success === false) {
        throw new Error(resp.error || 'Failed to load dashboard summary');
      }
      const data = resp.data;
      dashboardCache = data;
      // KPIs
      setText('kpiActiveSubs', data?.kpis?.active_subscriptions, '--');
      setText('kpiCompletion', formatPct(data?.kpis?.completion_avg));
      setText('kpiAdherence', formatPct(data?.kpis?.adherence_rate));
      setText('kpiStreak', numberOrDash(data?.kpis?.current_streak_avg));

      // Populate subscription filter if empty
      const subsSel = document.getElementById('subscriptionFilter');
      if (subsSel && subsSel.options.length <= 1 && data?.options?.subscriptions) {
        for (const s of data.options.subscriptions) {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.name} (${(s.plan_type || '').toUpperCase()})`;
          subsSel.appendChild(opt);
        }
      }

      // Today & Week summary
      try {
        const t = data?.today || {};
        setText('todayWorkouts', `${Number(t?.workouts?.completed||0)} / ${Number(t?.workouts?.scheduled||0)}`);
        setText('todayMeals', `${Number(t?.meals?.completed||0)} / ${Number(t?.meals?.scheduled||0)}`);
        setText('todayCalories', `${Number(t?.calories?.actual||0)} / ${Number(t?.calories?.target||0)}`);
        const waterActual = (t?.water_liters?.actual!=null)? Number(t.water_liters.actual).toFixed(1): '0.0';
        const waterTarget = (t?.water_liters?.target!=null)? Number(t.water_liters.target).toFixed(1): '0.0';
        setText('todayWater', `${waterActual} / ${waterTarget} L`);
        setText('todayMood', (t?.mood!=null)? Number(t.mood).toFixed(1): '—');
        setText('todayEnergy', (t?.energy!=null)? Number(t.energy).toFixed(1): '—');
        const list = document.getElementById('todayNextActions');
        if (list) {
          list.innerHTML = '';
          const items = Array.isArray(t.next_actions) ? t.next_actions : [];
          if (!items.length) {
            list.innerHTML = '<li>All caught up for today!</li>';
          } else {
            items.slice(0,6).forEach(it => {
              const li = document.createElement('li');
              const type = (it.type||'').toString().toUpperCase();
              li.textContent = `${type}: ${it.name} (${it.plan})`;
              list.appendChild(li);
            });
          }
        }
        const w = data?.week_summary || {};
        setText('weekDays', `${Number(w.days_completed||0)} completed • ${Number(w.missed_days||0)} missed`);
        setText('weekAdherence', `${Number(w.adherence_avg||0).toFixed(1)}%`);
        setText('weekTotals', `Meals ${Number(w.total_meals_completed||0)} • Workouts ${Number(w.total_workouts_completed||0)}`);
        setText('weekBestStreak', `${Number(w.best_streak||0)} days`);
      } catch(_) { /* ignore */ }

      drawCharts(data?.charts || {});
      // Stats sections
      renderPlanStats(data?.stats || {});
      renderPerPlanTable((data?.stats && data.stats.per_plan_progress) || []);
      // If no subscriptions available, guide the user
      const subs = (data?.options?.subscriptions || []);
      if (!subs.length) {
        window.utils && window.utils.showToast('You do not have any subscriptions yet. Browse plans to get started.', 'info');
      }
    } catch (e) {
      console.error(e);
      showError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  function setText(id, value, fallback = '—') {
    const el = document.getElementById(id);
    if (el) el.textContent = (value === undefined || value === null || value === '') ? fallback : value;
  }

  function formatPct(v) {
    const n = Number(v);
    if (!isFinite(n)) return '--%';
    return `${n.toFixed(1)}%`;
  }
  function numberOrDash(v) {
    const n = Number(v);
    if (!isFinite(n)) return '--';
    return n.toFixed(0);
  }

  function destroyChart(chart) {
    try { if (chart && chart.destroy) chart.destroy(); } catch (_) { /* noop */ }
  }

  function drawCharts(charts) {
    const ChartLib = window.Chart;
    if (!ChartLib) {
      console.warn('Chart.js not available');
      return;
    }
    const completed = Number(charts?.completion_distribution?.completed || 0);
    const incomplete = Number(charts?.completion_distribution?.incomplete || 0);
    const noLogs = (completed + incomplete) === 0;

    function showChartOverlay(canvasId, message) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const wrapper = canvas.closest('.card-body') || canvas.parentElement;
      if (!wrapper) return;
      let overlay = wrapper.querySelector('.empty-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'empty-overlay text-center text-muted py-5';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'rgba(255,255,255,0.7)';
        wrapper.style.position = 'relative';
        wrapper.appendChild(overlay);
      }
      overlay.innerHTML = `<div><i class="bi bi-inbox fs-2 mb-2 d-block"></i>${message}</div>`;
      overlay.style.display = '';
    }
    function hideChartOverlay(canvasId) {
      const canvas = document.getElementById(canvasId);
      const wrapper = canvas && (canvas.closest('.card-body') || canvas.parentElement);
      const overlay = wrapper && wrapper.querySelector('.empty-overlay');
      if (overlay) overlay.style.display = 'none';
    }
    // Progress over time
    const progressCtx = document.getElementById('progressChart');
    if (progressCtx) {
      destroyChart(progressChart);
      const labels = (charts.progress_timeseries || []).map(p => p.date);
      const values = (charts.progress_timeseries || []).map(p => p.completion_rate);
      if (!labels.length || noLogs) {
        showChartOverlay('progressChart', 'No activity recorded in this period. Try logging today or changing filters.');
      } else {
        hideChartOverlay('progressChart');
      }
      progressChart = new ChartLib(progressCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Completion %',
            data: values,
            borderColor: 'rgba(13,110,253,0.9)',
            backgroundColor: 'rgba(13,110,253,0.15)',
            tension: 0.25,
            fill: true,
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });
    }

    // Completion donut
    const completionCtx = document.getElementById('completionChart');
    if (completionCtx) {
      destroyChart(completionChart);
      const dist = charts.completion_distribution || { completed: 0, incomplete: 0 };
      if ((Number(dist.completed || 0) + Number(dist.incomplete || 0)) === 0) {
        showChartOverlay('completionChart', 'No completed days yet in this period.');
      } else {
        hideChartOverlay('completionChart');
      }
      completionChart = new ChartLib(completionCtx, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'Incomplete'],
          datasets: [{
            data: [dist.completed || 0, dist.incomplete || 0],
            backgroundColor: ['rgba(25,135,84,0.8)', 'rgba(220,53,69,0.8)'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%' }
      });
    }

    // Wellness trend
    const wellnessCtx = document.getElementById('wellnessChart');
    if (wellnessCtx) {
      destroyChart(wellnessChart);
      const labels = (charts.wellness_series || []).map(p => p.date);
      const mood = (charts.wellness_series || []).map(p => p.mood ?? null);
      const energy = (charts.wellness_series || []).map(p => p.energy ?? null);
      if (!labels.length) {
        showChartOverlay('wellnessChart', 'No wellness (mood/energy) entries yet.');
      } else {
        hideChartOverlay('wellnessChart');
      }
      wellnessChart = new ChartLib(wellnessCtx, {
        type: 'line',
        data: { labels, datasets: [
          { label: 'Mood', data: mood, borderColor: 'rgba(255,193,7,0.9)', backgroundColor: 'rgba(255,193,7,0.15)', tension: 0.25, fill: true },
          { label: 'Energy', data: energy, borderColor: 'rgba(13,202,240,0.9)', backgroundColor: 'rgba(13,202,240,0.15)', tension: 0.25, fill: true }
        ] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5 } } }
      });
    }
  }

  // ------- Logs table (DataTables) -------
  async function loadLogsData() {
    const filters = getFiltersFromUI();
    // Map to API accepted params
    const query = {
      start_date: filters.date_from,
      end_date: filters.date_to,
      plan_type: filters.plan_type,
      subscription: filters.subscription_id,
      active_only: filters.active_only,
      page: 1,
      page_size: 100
    };
    const url = `/plan-management/api/v1/daily-progress/${buildQuery(query)}`;
    const resp = await APIBase.request(url);
    if (!resp.success) throw new Error(resp.error || 'Failed to load logs');
    const data = resp.data;
    const rows = Array.isArray(data) ? data : (data.results || []);
    return rows;
  }

  async function reloadLogsTable() {
    try {
      const rows = await loadLogsData();
      if (!logsTable) initLogsTable();
      logsTable.clear();
      logsTable.rows.add(rows || []);
      logsTable.draw();
    } catch (e) {
      console.error(e);
      showError(e.message || 'Unable to load logs');
    }
  }

  function initLogsTable() {
    const $ = window.jQuery || window.$;
    if (!$ || !$.fn || typeof $.fn.DataTable !== 'function') return;
    logsTable = $('#clientLogsTable').DataTable({
      data: [],
      dom: "<'row mb-2'<'col-md-6'l><'col-md-6'f>>rt<'row mt-2'<'col-md-5'i><'col-md-7'p>>",
      pageLength: 10,
      order: [[0, 'desc']],
      language: {
        emptyTable: 'No logs in this period. Click "Log Today" to add your first entry.'
      },
      columns: [
        { data: 'date', render: (d) => d || '' },
        { data: 'plan_name', render: (v) => v || '—' },
        { data: 'day_completed', render: (v) => v ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>' },
        { data: 'meals_completed' },
        { data: 'workouts_completed' },
        { data: 'calories_burned' },
        { data: 'mood_rating', render: (v) => v ?? '—' },
        { data: 'energy_level', render: (v) => v ?? '—' },
      ],
      initComplete: function() {
        try { $('#clientLogsTable_filter input').attr('placeholder', 'Search logs...'); } catch (_) {}
      }
    });
  }

  // ------- Log Today -------
  async function handleLogToday() {
    try {
      const options = (dashboardCache && dashboardCache.options && dashboardCache.options.progress_options) || [];
      if (!options.length) {
        window.utils && window.utils.showToast('No subscriptions found. Browse plans to get started.', 'warning');
        return;
      }
      let progressId = null;
      if (options.length === 1) {
        progressId = options[0].progress_id;
      } else if (window.utils && window.utils.prompt) {
        const selectOptions = options.map(o => ({ value: String(o.progress_id), label: `${o.plan_name} (${(o.plan_type||'').toUpperCase()})` }));
        const val = await window.utils.prompt({
          title: 'Log Today',
          message: 'Select the plan to log today\'s progress for:',
          inputType: 'select',
          selectOptions,
          required: true,
          confirmText: 'Log'
        });
        if (!val) return;
        progressId = parseInt(val, 10);
      } else {
        // Fallback: use first
        progressId = options[0].progress_id;
      }
      const resp = await APIBase.request('/plan-management/api/v1/daily-progress/log_today/', {
        method: 'POST',
        body: JSON.stringify({ progress_id: progressId })
      });
      if (!resp.success) throw new Error(resp.error || 'Failed to log today');
      window.utils && window.utils.showToast('Today\'s progress logged. You can update details from plan page.', 'success');
      await reloadLogsTable();
      await loadDashboardSummary();
    } catch (e) {
      console.error(e);
      window.utils && window.utils.showToast(e.message || 'Failed to log today', 'danger');
    }
  }

  // ------- Export -------
  async function performDownload(url, filename) {
    try {
      const token = APIBase.getJWTToken();
      const resp = await fetch(url, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`);
      const blob = await resp.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (e) {
      console.error(e);
      showError(e.message || 'Unable to download file');
    }
  }

  function bindExportHandlers() {
    const excelBtn = document.getElementById('btnExportExcel');
    const pdfBtn = document.getElementById('btnExportPDF');
    if (excelBtn) excelBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const f = getFiltersFromUI();
      const q = buildQuery({
        start_date: f.date_from, end_date: f.date_to,
        plan_type: f.plan_type, subscription: f.subscription_id,
        active_only: f.active_only
      });
      performDownload(`/plan-management/api/v1/daily-progress/export_excel/${q}`, 'daily_logs.xlsx');
    });
    if (pdfBtn) pdfBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const f = getFiltersFromUI();
      const q = buildQuery({
        start_date: f.date_from, end_date: f.date_to,
        plan_type: f.plan_type, subscription: f.subscription_id,
        active_only: f.active_only
      });
      performDownload(`/plan-management/api/v1/daily-progress/export_pdf/${q}`, 'daily_logs.pdf');
    });
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
    // Filters
    const preset = document.getElementById('presetRange');
    if (preset) preset.addEventListener('change', () => { applyPresetRangeUI(); });
    const applyBtn = document.getElementById('btnApplyFilters');
    if (applyBtn) applyBtn.addEventListener('click', async () => {
      await loadDashboardSummary();
      await reloadLogsTable();
      await loadRecommendations();
    });
    const resetBtn2 = document.getElementById('btnResetFilters');
    if (resetBtn2) resetBtn2.addEventListener('click', async () => {
      const presetSel = document.getElementById('presetRange');
      if (presetSel) presetSel.value = '30';
      const subsSel = document.getElementById('subscriptionFilter');
      if (subsSel) subsSel.value = '';
      const planTypeSel = document.getElementById('planTypeFilter');
      if (planTypeSel) planTypeSel.value = '';
      const activeOnly = document.getElementById('activeOnly');
      if (activeOnly) activeOnly.checked = false;
      applyPresetRangeUI();
      await loadDashboardSummary();
      await reloadLogsTable();
    });

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

    const logTodayBtn = document.getElementById('btnLogToday');
    if (logTodayBtn) logTodayBtn.addEventListener('click', handleLogToday);
    const addDetailsBtn = document.getElementById('btnAddDetails');
    if (addDetailsBtn) addDetailsBtn.addEventListener('click', handleAddDetails);
  }

  document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('subscriptionsTable')) return;
    if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
      showError('jQuery/DataTables not loaded.');
      return;
    }
    initTable();
    bindEvents();
    // Initialize dashboard pieces
    try { applyPresetRangeUI(); } catch (_) {}
    loadDashboardSummary();
    loadMeasurementsSnapshot();
    loadRecommendations();
    initLogsTable();
    reloadLogsTable();
    bindExportHandlers();
    // Existing subs table
    loadData();
  });
})();

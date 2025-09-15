'use strict';

(function() {
  let subsTable = null; // legacy (removed table)
  let plansCombinedTable = null;
  let logsTable = null;
  let isLoading = false;
  let progressChart = null;
  let completionChart = null;
  let measurementSpark = null;
  let wellnessChart = null;
  let subsStatusChart = null;
  let dashboardCache = null;
  let productPlansCache = null; // cache for price fallback in combined table

  function setLoading(state) {
    isLoading = state;
    // Disable common action buttons while loading
    const btnApply = document.getElementById('btnApplyFilters');
    const btnReset = document.getElementById('btnResetFilters');
    const btnReload = document.getElementById('reloadSubs');
    [btnApply, btnReset, btnReload].forEach((btn) => { if (btn) btn.disabled = state; });
  }

  // ------- Measurements Snapshot -------
  async function loadMeasurementsSnapshot() {
    try {
      // Prefer client-measurements endpoint; fallback to enhanced-measurements
      const user = (window.authManager && window.authManager.getUser && window.authManager.getUser()) || null;
      const clientId = user && user.id ? user.id : null;
      let declaredWeightChange = null;
      let declaredBfChange = null;
      let latestResp = null;
      try {
        const latestUrl = clientId
          ? `/profiles/api/v1/client-measurements/latest/?client_id=${clientId}&empty_ok=1`
          : `/profiles/api/v1/client-measurements/latest/?empty_ok=1`;
        latestResp = await APIBase.request(latestUrl);
        if (!latestResp || latestResp.success === false) {
          const latestUrl2 = clientId
            ? `/profiles/api/v1/client/enhanced-measurements/latest/?client_id=${clientId}&empty_ok=1`
            : `/profiles/api/v1/client/enhanced-measurements/latest/?empty_ok=1`;
          latestResp = await APIBase.request(latestUrl2);
        }
      } catch (e) {
        // fallback
        const latestUrl2 = clientId
          ? `/profiles/api/v1/client/enhanced-measurements/latest/?client_id=${clientId}&empty_ok=1`
          : `/profiles/api/v1/client/enhanced-measurements/latest/?empty_ok=1`;
        latestResp = await APIBase.request(latestUrl2);
      }
      // helper to set metric value and hide parent row when empty
      const setMetric = (id, val) => {
        const el = document.getElementById(id);
        if (!el) return;
        const parent = el.closest('[class*="col-"]') || el.parentElement;
        const hasVal = !(val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === ''));
        if (hasVal) {
          el.textContent = val;
          if (parent) parent.classList.remove('d-none');
        } else {
          el.textContent = '';
          if (parent) parent.classList.add('d-none');
        }
      };

      if (latestResp && latestResp.success && latestResp.data) {
        const m = latestResp.data;
        setMetric('mWeight', m && m.weight != null ? `${m.weight} kg` : null);
        setMetric('mBodyFat', m && m.body_fat_percentage != null ? `${Number(m.body_fat_percentage).toFixed(1)}%` : null);
        // Prefer flat schema (m.waist); fallback to nested body_part_measurements
        let waistText = null;
        if (m && m.waist != null) {
          waistText = `${m.waist}`;
        } else if (m && Array.isArray(m.body_part_measurements)) {
          const waist = m.body_part_measurements.find(bp => (bp && bp.body_part && (bp.body_part.name==='waist' || bp.body_part.display_name==='Waist')));
          if (waist && waist.value != null) waistText = `${waist.value} ${waist.unit || ''}`.trim();
        }
        setMetric('mWaist', waistText);
        const updated = (m && (m.updated_at || m.date)) ? (m.updated_at || m.date) : null;
        setMetric('mUpdated', updated ? (window.utils ? window.utils.formatDate(updated) : updated) : null);
        // Extra flat-schema fields
        setMetric('mHeight', m && m.height != null ? `${m.height} cm` : null);
        setMetric('mChest', m && m.chest != null ? `${m.chest}` : null);
        setMetric('mHips', m && m.hips != null ? `${m.hips}` : null);
        setMetric('mShoulders', m && m.shoulders != null ? `${m.shoulders}` : null);
        setMetric('mForearms', m && m.forearms != null ? `${m.forearms}` : null);
        setMetric('mThighs', m && m.thighs != null ? `${m.thighs}` : null);
        setMetric('mCalves', m && m.calves != null ? `${m.calves}` : null);
        setMetric('mNeck', m && m.neck != null ? `${m.neck}` : null);
        setMetric('mBodyWater', m && m.body_water_percentage != null ? `${Number(m.body_water_percentage).toFixed(1)}%` : null);
        setMetric('mBoneMass', m && m.bone_mass != null ? `${m.bone_mass}` : null);
        setMetric('mMuscleMass', m && m.muscle_mass != null ? `${m.muscle_mass}` : null);
        setMetric('mVisceralFat', m && m.visceral_fat != null ? `${m.visceral_fat}` : null);
        setMetric('mMetabolicAge', m && m.metabolic_age != null ? `${m.metabolic_age}` : null);
        // Photos
        const setImg = (id, url) => {
          const img = document.getElementById(id);
          if (!img) return;
          if (url) { img.src = url; img.classList.remove('d-none'); }
          else { img.src = ''; img.classList.add('d-none'); }
        };
        setImg('mFrontPhoto', m.front_photo);
        setImg('mSidePhoto', m.side_photo);
        setImg('mBackPhoto', m.back_photo);

        // Capture endpoint-declared changes if provided by API
        const pickNum = (v) => {
          if (v === null || v === undefined || v === '') return null;
          const n = Number(v);
          return isFinite(n) ? n : null;
        };
        const pickFirst = (...vals) => {
          for (const v of vals) { const n = pickNum(v); if (n !== null) return n; }
          return null;
        };
        const chObj = m.change || m.changes || null;
        const wFromObj = chObj ? pickFirst(chObj.weight, chObj.weight_kg, chObj.weight_change, chObj.delta_weight) : null;
        const bfFromObj = chObj ? pickFirst(chObj.body_fat, chObj.body_fat_percentage, chObj.body_fat_change, chObj.delta_body_fat) : null;
        declaredWeightChange = pickFirst(
          m.weight_change, m.weight_delta, m.delta_weight, m.weight_change_kg, m.weight_diff, m.weight_difference,
          wFromObj
        );
        declaredBfChange = pickFirst(
          m.body_fat_change, m.body_fat_delta, m.delta_body_fat, m.bf_change, m.body_fat_percentage_change, m.body_fat_diff,
          bfFromObj
        );
        // If endpoint provided declared changes, show them immediately; series (if present) will overwrite later
        if (declaredWeightChange !== null) {
          const sign = declaredWeightChange > 0 ? '+' : '';
          setMetric('mWeightChange', `${sign}${declaredWeightChange.toFixed(1)} kg`);
        }
        if (declaredBfChange !== null) {
          const sign = declaredBfChange > 0 ? '+' : '';
          setMetric('mBodyFatChange', `${sign}${declaredBfChange.toFixed(1)}%`);
        }
      }
      // sparkline progress (respect filters)
      let progResp = null;
      try {
        const f = getFiltersFromUI();
        const qs = new URLSearchParams();
        if (clientId) qs.append('client_id', clientId);
        if (f.date_from) qs.append('start_date', f.date_from);
        if (f.date_to) qs.append('end_date', f.date_to);
        qs.append('empty_ok','1');
        progResp = await APIBase.request(`/profiles/api/v1/client-measurements/progress/?${qs.toString()}`);
        if (!progResp || progResp.success === false) {
          // Fallback when endpoint is missing or returns error
          const qs2 = new URLSearchParams(qs.toString());
          progResp = await APIBase.request(`/profiles/api/v1/client/enhanced-measurements/progress/?${qs2.toString()}`);
        }
      } catch (e) {
        const f = getFiltersFromUI();
        const qs2 = new URLSearchParams();
        if (clientId) qs2.append('client_id', clientId);
        if (f.date_from) qs2.append('start_date', f.date_from);
        if (f.date_to) qs2.append('end_date', f.date_to);
        qs2.append('empty_ok','1');
        progResp = await APIBase.request(`/profiles/api/v1/client/enhanced-measurements/progress/?${qs2.toString()}`);
      }
      // Final fallback: use list endpoint to build series when progress endpoints are missing
      if (!progResp || progResp.success === false) {
        try {
          const f3 = getFiltersFromUI();
          const qs3 = new URLSearchParams();
          qs3.append('page', '1');
          qs3.append('page_size', '200');
          qs3.append('ordering', 'date'); // ascending for sparkline
          if (clientId) { qs3.append('client_id', clientId); qs3.append('client', clientId); }
          const listUrl = `/profiles/api/v1/client-measurements/?${qs3.toString()}`;
          const listResp = await APIBase.request(listUrl);
          // Normalize possible shapes
          let items = [];
          if (Array.isArray(listResp?.data?.results)) items = listResp.data.results;
          else if (Array.isArray(listResp?.results)) items = listResp.results;
          else if (Array.isArray(listResp?.data)) items = listResp.data;
          else if (Array.isArray(listResp)) items = listResp;
          // Filter by date range if provided
          if ((f3.date_from || f3.date_to) && Array.isArray(items)) {
            const from = f3.date_from ? new Date(f3.date_from) : null;
            const to = f3.date_to ? new Date(f3.date_to) : null;
            items = items.filter(it => {
              const d = it?.date ? new Date(it.date) : null;
              if (!d) return false;
              if (from && d < from) return false;
              if (to) {
                const toEnd = new Date(to);
                toEnd.setHours(23,59,59,999);
                if (d > toEnd) return false;
              }
              return true;
            });
          }
          // Ensure ascending by date
          if (Array.isArray(items)) {
            items.sort((a, b) => String(a?.date || '') > String(b?.date || '') ? 1 : -1);
          }
          // Wrap as a success response with array data
          if (Array.isArray(items) && items.length >= 0) {
            progResp = { success: true, data: items };
          }
        } catch (_) { /* ignore */ }
      }
      if (progResp && progResp.success) {
        // Support multiple response shapes: {measurements: [...]}, {results: [...]}, or [] directly
        let series = [];
        if (progResp.data && Array.isArray(progResp.data.measurements)) {
          series = progResp.data.measurements;
        } else if (progResp.data && Array.isArray(progResp.data.results)) {
          series = progResp.data.results;
        } else if (Array.isArray(progResp.data)) {
          series = progResp.data;
        }
        if (series && series.length) {
        const labels = series.map(x => x.date || x.created_at || x.updated_at || '');
        const values = series.map(x => (x.weight ?? x.weight_kg ?? x.weight_value ?? null));
  // Compute useful changes (last minus first)
        if (series.length >= 2) {
          const first = series[0];
          const last = series[series.length - 1];
          const lastW = (last.weight ?? last.weight_kg ?? last.weight_value);
          const firstW = (first.weight ?? first.weight_kg ?? first.weight_value);
          const lastBF = (last.body_fat_percentage ?? last.body_fat ?? last.bf_percent);
          const firstBF = (first.body_fat_percentage ?? first.body_fat ?? first.bf_percent);
          const dw = (lastW!=null && firstW!=null) ? (Number(lastW) - Number(firstW)) : null;
          const dbf = (lastBF!=null && firstBF!=null) ? (Number(lastBF) - Number(firstBF)) : null;
          setMetric('mWeightChange', dw!=null ? `${dw>0?'+':''}${dw.toFixed(1)} kg` : null);
          setMetric('mBodyFatChange', dbf!=null ? `${dbf>0?'+':''}${dbf.toFixed(1)}%` : null);
        } else if (series.length === 1) {
          const only = series[0];
          const hasW = only && (only.weight != null || only.weight_kg != null || only.weight_value != null);
          const hasBF = only && (only.body_fat_percentage != null || only.body_fat != null || only.bf_percent != null);
          if (hasW) setMetric('mWeightChange', `0.0 kg`); else if (declaredWeightChange !== null) setMetric('mWeightChange', `${declaredWeightChange>0?'+':''}${declaredWeightChange.toFixed(1)} kg`); else setMetric('mWeightChange', null);
          if (hasBF) setMetric('mBodyFatChange', `0.0%`); else if (declaredBfChange !== null) setMetric('mBodyFatChange', `${declaredBfChange>0?'+':''}${declaredBfChange.toFixed(1)}%`); else setMetric('mBodyFatChange', null);
          // If still missing, compute from latest two (all-time)
          if (declaredWeightChange === null || declaredBfChange === null) {
            try {
              const qs4 = new URLSearchParams();
              qs4.append('page', '1');
              qs4.append('page_size', '2');
              qs4.append('ordering', '-date'); // latest first
              if (clientId) { qs4.append('client_id', clientId); qs4.append('client', clientId); }
              const resp2 = await APIBase.request(`/profiles/api/v1/client-measurements/?${qs4.toString()}`);
              let arr = Array.isArray(resp2?.data?.results) ? resp2.data.results : (Array.isArray(resp2?.results) ? resp2.results : []);
              if (arr.length >= 2) {
                const last = arr[0];
                const prev = arr[1];
                const dw2 = (last.weight!=null && prev.weight!=null) ? (Number(last.weight) - Number(prev.weight)) : null;
                const dbf2 = (last.body_fat_percentage!=null && prev.body_fat_percentage!=null) ? (Number(last.body_fat_percentage) - Number(prev.body_fat_percentage)) : null;
                if (declaredWeightChange === null && dw2 !== null) setMetric('mWeightChange', `${dw2>0?'+':''}${dw2.toFixed(1)} kg`);
                if (declaredBfChange === null && dbf2 !== null) setMetric('mBodyFatChange', `${dbf2>0?'+':''}${dbf2.toFixed(1)}%`);
              }
            } catch(_) { /* ignore */ }
          }
        } else {
          // If we reached here, treat as no series
          if (declaredWeightChange !== null) setMetric('mWeightChange', `${declaredWeightChange>0?'+':''}${declaredWeightChange.toFixed(1)} kg`); else setMetric('mWeightChange', null);
          if (declaredBfChange !== null) setMetric('mBodyFatChange', `${declaredBfChange>0?'+':''}${declaredBfChange.toFixed(1)}%`); else setMetric('mBodyFatChange', null);
          // If still missing, compute from latest two (all-time)
          if (declaredWeightChange === null || declaredBfChange === null) {
            try {
              const qs4 = new URLSearchParams();
              qs4.append('page', '1');
              qs4.append('page_size', '2');
              qs4.append('ordering', '-date'); // latest first
              if (clientId) { qs4.append('client_id', clientId); qs4.append('client', clientId); }
              const resp2 = await APIBase.request(`/profiles/api/v1/client-measurements/?${qs4.toString()}`);
              let arr = Array.isArray(resp2?.data?.results) ? resp2.data.results : (Array.isArray(resp2?.results) ? resp2.results : []);
              if (arr.length >= 2) {
                const last = arr[0];
                const prev = arr[1];
                const dw2 = (last.weight!=null && prev.weight!=null) ? (Number(last.weight) - Number(prev.weight)) : null;
                const dbf2 = (last.body_fat_percentage!=null && prev.body_fat_percentage!=null) ? (Number(last.body_fat_percentage) - Number(prev.body_fat_percentage)) : null;
                if (declaredWeightChange === null && dw2 !== null) setMetric('mWeightChange', `${dw2>0?'+':''}${dw2.toFixed(1)} kg`);
                if (declaredBfChange === null && dbf2 !== null) setMetric('mBodyFatChange', `${dbf2>0?'+':''}${dbf2.toFixed(1)}%`);
              }
            } catch(_) { /* ignore */ }
          }
        }
        const ctx = document.getElementById('measurementSparkline');
        const chartWrap = ctx ? ctx.closest('.chart-container') : null;
        if (chartWrap) chartWrap.classList.remove('d-none');
        if (ctx && window.Chart) {
          try { if (measurementSpark && measurementSpark.destroy) measurementSpark.destroy(); } catch (_) {}
          measurementSpark = new window.Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ data: values, borderColor: 'rgba(13,110,253,0.9)', backgroundColor: 'rgba(13,110,253,0.15)', tension: 0.3, fill: true, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
          });
        }
        }
      } else {
        // No progress available: show zero deltas if latest measurement exists
        if (declaredWeightChange !== null) setMetric('mWeightChange', `${declaredWeightChange>0?'+':''}${declaredWeightChange.toFixed(1)} kg`); else setMetric('mWeightChange', null);
        if (declaredBfChange !== null) setMetric('mBodyFatChange', `${declaredBfChange>0?'+':''}${declaredBfChange.toFixed(1)}%`); else setMetric('mBodyFatChange', null);
        const ctx = document.getElementById('measurementSparkline');
        const chartWrap = ctx ? ctx.closest('.chart-container') : null;
        if (chartWrap) chartWrap.classList.add('d-none');
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
        if (subsStatusChart) { try { subsStatusChart.destroy(); } catch(e) {} }
        subsStatusChart = new window.Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Active','Completed','Pending','Cancelled','Expired'],
            datasets: [{ data: [counts.active||0, counts.completed||0, counts.pending||0, counts.cancelled||0, counts.expired||0], backgroundColor: ['#198754','#0dcaf0','#ffc107','#dc3545','#6c757d'], borderWidth: 0 }]
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: '60%' }
        });
        // Legend with counts
        const legend = document.getElementById('subsStatusLegend');
        if (legend) {
          legend.innerHTML = '';
          const items = [
            { label: 'Active', color: '#198754', value: counts.active||0 },
            { label: 'Completed', color: '#0dcaf0', value: counts.completed||0 },
            { label: 'Pending', color: '#ffc107', value: counts.pending||0 },
            { label: 'Cancelled', color: '#dc3545', value: counts.cancelled||0 },
            { label: 'Expired', color: '#6c757d', value: counts.expired||0 },
          ];
          legend.innerHTML = items.map(i => `
            <span class="me-3 d-inline-flex align-items-center">
              <span style="display:inline-block;width:10px;height:10px;background:${i.color};border-radius:50%;margin-right:6px"></span>
              ${i.label}: <strong class="ms-1">${i.value}</strong>
            </span>
          `).join('');
        }
      }
    } catch (e) { console.warn('renderPlanStats failed', e); }
  }

  function renderCombinedTable(perPlan, subscriptions) {
    try {
      const $ = window.jQuery || window.$;
      if (!$ || !$.fn || typeof $.fn.DataTable !== 'function') return;
      // Apply client-side filtering based on current UI filters
      const f = getFiltersFromUI();
      const wantType = (f.plan_type || '').toLowerCase();
      const wantSub = f.subscription_id ? String(f.subscription_id) : '';
      const wantStatus = (f.status || '').toLowerCase();
      // Map subscriptions by id for price and accurate status
      const subsById = {};
      (subscriptions || []).forEach(s => { subsById[s.id] = s; });
      const rows = (perPlan || [])
        .filter(p => {
          // plan type filter
          if (wantType) {
            const type = (p.plan_type || p.product_plan?.plan_type || '').toString().toLowerCase();
            if (type !== wantType) return false;
          }
          // subscription filter
          if (wantSub) {
            const sid = String(p.subscription_id || '');
            if (sid !== wantSub) return false;
          }
          // status filter (evaluate using available fields)
          if (wantStatus) {
            const sub = subsById[p.subscription_id] || {};
            const s1 = (sub.status || '').toLowerCase();
            const s2 = (p.status || '').toLowerCase();
            const s3 = (sub.subscription_status || sub.state || '').toLowerCase();
            const statusVal = s1 || s2 || s3;
            if (statusVal !== wantStatus) return false;
          }
          return true;
        })
        .map(p => {
        const sub = subsById[p.subscription_id] || null;
        // Compute price with multiple fallbacks while avoiding deeply nested ternaries
        const priceVal = (sub && sub.product_plan && sub.product_plan.price != null)
          ? sub.product_plan.price
          : (p.product_plan && p.product_plan.price != null)
            ? p.product_plan.price
            : (sub && sub.product_plan && sub.product_plan.price_per_session != null)
              ? sub.product_plan.price_per_session
              : (p.product_plan && p.product_plan.price_per_session != null)
                ? p.product_plan.price_per_session
                : (p.price != null ? p.price : null);
        let finalPrice = priceVal;
        // Extra fallback using cached product plans by id or name
        if (finalPrice == null && productPlansCache && productPlansCache.length) {
          const pid = p.product_plan?.id || p.product_plan_id || null;
          let matched = null;
          if (pid != null) {
            matched = productPlansCache.find(pp => String(pp.id) === String(pid));
          }
          if (!matched && p.plan_name) {
            matched = productPlansCache.find(pp => (pp.name || '').toLowerCase() === String(p.plan_name).toLowerCase());
          }
          if (matched) {
            finalPrice = matched.price ?? matched.price_per_session ?? matched.total_price ?? null;
          }
        }
        return {
          plan_name: p.plan_name,
          plan_type: (p.plan_type || p.product_plan?.plan_type || ''),
          coach_name: p.coach_name || p.product_plan?.coach_info?.display_name || '—',
          price: finalPrice,
          status: (sub && (sub.status || sub.subscription_status || sub.state)) ? (sub.status || sub.subscription_status || sub.state) : (p.status || ''),
          completion_percentage: p.completion_percentage,
          adherence_rate: p.adherence_rate,
          subscribed_at: sub?.subscribed_at || p.subscribed_at,
          subscription_id: p.subscription_id || sub?.id
        };
      });
      if (plansCombinedTable) { plansCombinedTable.destroy(); $('#plansCombinedTable').empty(); }
      plansCombinedTable = $('#plansCombinedTable').DataTable({
        data: rows,
        pageLength: 10,
        columns: [
          { data: 'plan_name' },
          { data: 'plan_type', render: (t) => (t||'').toString().toUpperCase() },
          { data: 'coach_name', render: (v) => v || '—' },
          { data: 'price', className: 'text-nowrap', render: (p) => (p!=null ? (window.utils? window.utils.formatCurrency(p): `EGP ${Number(p).toFixed(2)}`) : '—') },
          { data: 'status', render: (s) => { const f = window.SubscriptionsAPI.formatStatus(s); return `<span class="${f.class} status-badge">${f.text}</span>`; } },
          { data: 'completion_percentage', render: (v) => `${Number(v||0).toFixed(1)}%` },
          { data: 'adherence_rate', render: (v) => `${Number(v||0).toFixed(1)}%` },
          { data: 'subscribed_at', className: 'text-nowrap', render: (d) => window.utils.formatDate(d) },
          { data: null, orderable: false, render: (row) => `<a class="btn btn-sm btn-outline-primary" href="/plan-management/client/plan-detail/${row.subscription_id}/">Continue</a>` }
        ]
      });
      // If some rows are missing price and we have no cache, try loading cache and re-render once
      const needsPrices = rows.some(r => r.price == null);
      if (needsPrices && (!productPlansCache || productPlansCache.length < 20)) {
        ensureProductPlansCache().then(() => {
          const subsAgain = (dashboardCache?.options?.subscriptions || []);
          const perPlanAgain = (dashboardCache?.stats?.per_plan_progress || []);
          renderCombinedTable(perPlanAgain, subsAgain);
        }).catch(() => {/* ignore */});
      }
    } catch (e) { console.warn('renderPerPlanTable failed', e); }
  }

  // ------- Product plans cache for price fallback -------
  async function ensureProductPlansCache() {
    try {
      const q = new URLSearchParams();
      q.append('is_active', 'true');
      q.append('page_size', '200');
      const resp = await APIBase.request(`/plan-management/api/v1/product-plans/?${q.toString()}`);
      if (resp && resp.success) {
        productPlansCache = Array.isArray(resp.data) ? resp.data : (resp.data.results || []);
      }
    } catch (_) { /* ignore */ }
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
  // Cache for price fallback in table
  productPlansCache = arr.slice();
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
    // Coach-style time preset radios
    const presetRadios = document.querySelectorAll('input[name="timePreset"]');
    const planTypeSel = document.getElementById('planTypeFilter');
    const subsSel = document.getElementById('subscriptionFilter');
    const activeOnly = document.getElementById('activeOnly');
    const statusTop = document.getElementById('statusFilterTop');
    const inputFrom = document.getElementById('dateFrom');
    const inputTo = document.getElementById('dateTo');

    let date_from = null;
    let date_to = null;
    const today = new Date();
    let presetVal = '30';
    for (const r of presetRadios) { if (r.checked) { presetVal = r.value; break; } }
    if (presetVal === 'custom') {
      date_from = (inputFrom && inputFrom.value) ? inputFrom.value : null;
      date_to = (inputTo && inputTo.value) ? inputTo.value : null;
    } else if (presetVal === 'all') {
      date_from = null; // All time -> no bounds
      date_to = null;
    } else if (presetVal === 'year') {
      const from = new Date(today.getFullYear(), 0, 1);
      date_from = formatDate(from);
      date_to = formatDate(today);
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
      status: statusTop ? (statusTop.value || null) : null,
    };
  }

  function applyPresetRangeUI() {
    const checked = Array.from(document.querySelectorAll('input[name="timePreset"]')).find(r => r.checked);
    const inputFrom = document.getElementById('dateFrom');
    const inputTo = document.getElementById('dateTo');
    if (!checked || !inputFrom || !inputTo) return;
    const isCustom = checked.value === 'custom';
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
    // KPIs (simplified)
    setText('kpiActiveSubs', data?.kpis?.active_subscriptions, '--');
    setText('kpiCompletion', formatPct(data?.kpis?.completion_avg));
    const completedDays = Number(data?.charts?.completion_distribution?.completed || 0);
    setText('kpiCompletedDays', isFinite(completedDays) ? completedDays : '--');
    const bestStreakVal = (data?.week_summary?.best_streak != null)
    ? data.week_summary.best_streak
    : (data?.kpis?.current_streak_best != null
      ? data.kpis.current_streak_best
      : data?.kpis?.current_streak_avg);
    setText('kpiStreak', numberOrDash(bestStreakVal));

      // Active plans quick access (right card)
      try {
        const wrap = document.getElementById('activePlansQuick');
        if (wrap) {
          wrap.innerHTML = '';
          const subsAll = (data?.options?.subscriptions || []);
          const isActive = (s) => {
            const statusVal = (s.status || s.subscription_status || s.state || '').toString().toLowerCase();
            const activeFlag = s.is_active === true;
            if (activeFlag) return true;
            if (!statusVal) return false;
            if (['active', 'running', 'ongoing'].includes(statusVal)) return true;
            if (['cancelled','expired','completed','pending'].includes(statusVal)) return false;
            return false;
          };
          const subs = subsAll.filter(isActive);
          if (!subs.length) {
            // hide the entire card if empty
            const card = wrap.closest('.card');
            if (card) card.classList.add('d-none');
          } else {
            const card = wrap.closest('.card');
            if (card) card.classList.remove('d-none');
            subs.slice(0, 6).forEach(s => {
              const el = document.createElement('div');
              el.className = 'd-flex justify-content-between align-items-center border rounded p-2';
              const type = (s.plan_type || '').toString().toUpperCase();
              el.innerHTML = `
                <div>
                  <div class="fw-semibold">${s.name || s.plan_name || 'Plan'}</div>
                  <div class="small text-muted">${type}</div>
                </div>
                <a class="btn btn-sm btn-outline-primary" href="/plan-management/client/plan-detail/${s.id || s.subscription_id || ''}/">Open</a>
              `;
              wrap.appendChild(el);
            });
          }
        }
      } catch (_) { /* ignore */ }

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

      // Today & Week summary + Upcoming list
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
        // Populate upcoming items list (new card)
        const upcoming = Array.isArray(t.next_actions) ? t.next_actions : (Array.isArray(data?.upcoming) ? data.upcoming : (Array.isArray(data?.schedule?.upcoming) ? data.schedule.upcoming : []));
        const ul = document.getElementById('upcomingList');
        if (ul) {
          ul.innerHTML = '';
          if (!upcoming.length) {
            // hide the entire card if no items
            const card = ul.closest('.card');
            if (card) card.classList.add('d-none');
          } else {
            const card = ul.closest('.card');
            if (card) card.classList.remove('d-none');
            upcoming.slice(0, 8).forEach(it => {
              const li = document.createElement('li');
              li.className = 'list-group-item d-flex justify-content-between align-items-center';
              const type = (it.type || '').toString().toUpperCase();
              const icon = type === 'WORKOUT' ? 'bi-dumbbell' : (type === 'MEAL' ? 'bi-egg-fried' : 'bi-check2-square');
              li.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                  <i class="bi ${icon}"></i>
                  <div>
                    <div class="fw-semibold">${it.name || 'Item'}</div>
                    <div class="small text-muted">${type}${it.plan ? ' • ' + it.plan : ''}</div>
                  </div>
                </div>
                <a class="btn btn-sm btn-outline-secondary" href="/plan-management/client/browse-plans/">Details</a>
              `;
              ul.appendChild(li);
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
  const perPlan = (data?.stats && data.stats.per_plan_progress) || [];
  const subs = (data?.options?.subscriptions || []);
  renderCombinedTable(perPlan, subs);
      // If no subscriptions available, guide the user
      const subsOpt = (data?.options?.subscriptions || []);
      if (!subsOpt.length) {
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
    // Legacy subscriptions table removed; keep function to avoid errors.
    const tableEl = document.getElementById('subscriptionsTable');
    if (!tableEl) return;
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
              ? (window.utils ? window.utils.formatCurrency(p) : `EGP ${parseFloat(p).toFixed(2)}`)
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
      const proceed = await (window.utils && typeof window.utils.confirm === 'function'
        ? window.utils.confirm({ title: 'Cancel Subscription', message: 'Cancel this subscription?', confirmText: 'Cancel', variant: 'danger' })
        : Promise.resolve(window.confirm('Cancel this subscription?')));
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
    // Time period radios
    document.querySelectorAll('input[name="timePreset"]').forEach(r => {
      r.addEventListener('change', () => { applyPresetRangeUI(); });
    });
    // Presets dropdown
    document.querySelectorAll('[data-preset]').forEach(a => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const v = a.getAttribute('data-preset');
        const target = document.querySelector(`input[name="timePreset"][value="${v}"]`);
        if (target) { target.checked = true; applyPresetRangeUI(); }
      });
    });
    const applyBtn = document.getElementById('btnApplyFilters');
    if (applyBtn) applyBtn.addEventListener('click', async () => {
      await loadDashboardSummary();
      await reloadLogsTable();
      await loadMeasurementsSnapshot();
      await loadRecommendations();
    });
    const resetBtn2 = document.getElementById('btnResetFilters');
    if (resetBtn2) resetBtn2.addEventListener('click', async () => {
  const tp30 = document.getElementById('tp30');
  if (tp30) tp30.checked = true;
      const subsSel = document.getElementById('subscriptionFilter');
      if (subsSel) subsSel.value = '';
      const planTypeSel = document.getElementById('planTypeFilter');
      if (planTypeSel) planTypeSel.value = '';
      const activeOnly = document.getElementById('activeOnly');
      if (activeOnly) activeOnly.checked = false;
      const statusTop = document.getElementById('statusFilterTop');
      if (statusTop) statusTop.value = '';
      applyPresetRangeUI();
      await loadDashboardSummary();
      await reloadLogsTable();
      await loadMeasurementsSnapshot();
      await loadRecommendations();
    });

    const reloadBtn = document.getElementById('reloadSubs');
    if (reloadBtn) reloadBtn.addEventListener('click', () => loadData());
    const statusTop = document.getElementById('statusFilterTop');
    if (statusTop) statusTop.addEventListener('change', async () => {
      await loadDashboardSummary();
      await loadMeasurementsSnapshot();
      await loadRecommendations();
    });

    const logTodayBtn = document.getElementById('btnLogToday');
    if (logTodayBtn) logTodayBtn.addEventListener('click', handleLogToday);
    const addDetailsBtn = document.getElementById('btnAddDetails');
    if (addDetailsBtn) addDetailsBtn.addEventListener('click', handleAddDetails);
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Proceed if dashboard is present (use a reliable marker)
  if (!document.getElementById('filtersBody')) return;
    // Guard for required globals
    if (!window.SubscriptionsAPI) {
      showError('Subscriptions module not loaded.');
      return;
    }
    if (!window.APIBase) {
      showError('API module not loaded.');
      return;
    }
    if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
      showError('jQuery/DataTables not loaded.');
      return;
    }
    bindEvents();
    // Initialize dashboard pieces
    try { applyPresetRangeUI(); } catch (_) {}
    loadDashboardSummary();
    loadMeasurementsSnapshot();
    loadRecommendations();
    // Logs were removed from UI; keep calls guarded by element checks
    if (document.getElementById('clientLogsTable')) {
      initLogsTable();
      reloadLogsTable();
    }
    bindExportHandlers();
    // Legacy subs table removed
  });
})();

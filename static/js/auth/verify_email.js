// static/js/auth/verify_email.js
(function(){
  const apiVerify = '/auth-users/api/v1/verify-email/';
  const apiResend = '/auth-users/api/v1/resend-verification/';
  const apiDjangoLogout = '/auth-users/api/v1/django-session-logout/';

  function qs(sel){ return document.querySelector(sel); }

  function getInitialState() {
    const emailInput = qs('#verify-email');
    const uid = (qs('#verify-container')?.dataset?.uid) || '';
    const token = (qs('#verify-container')?.dataset?.token) || '';

    // Prefill email from template or session storage
    let email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
      try { email = sessionStorage.getItem('pending_verification_email') || ''; } catch (e) {}
      if (emailInput && email) emailInput.value = email;
    }
    return { email, uid, token };
  }

  async function verifyWithCode(email, code) {
    if (!email) {
      utils.showToast('Please enter your email', 'warning');
      return;
    }
    if (!code || String(code).trim().length < 4) {
      utils.showToast('Enter the 6-digit verification code', 'warning');
      return;
    }

    setLoading(true);
    const res = await APIBase.request(apiVerify, {
      method: 'POST',
      body: JSON.stringify({ email, code }),
      headers: { 'Content-Type': 'application/json' },
      noRedirectOn401: true
    });
    setLoading(false);

    if (!res.success) {
      const msg = (res.errorJSON && (res.errorJSON.detail || res.errorJSON.message)) || res.error || 'Verification failed';
      utils.showToast(msg, 'danger');
      return;
    }

    const data = res.data || {};
    // Store tokens
    try {
      if (data.tokens && data.tokens.access) localStorage.setItem('access_token', data.tokens.access);
      if (data.tokens && data.tokens.refresh) localStorage.setItem('refresh_token', data.tokens.refresh);
      sessionStorage.removeItem('pending_verification_email');
    } catch (e) {}

    utils.showToast('Email verified successfully. Redirecting...', 'success');
    window.location.href = data.redirect_url || '/auth-users/dashboard/';
  }

  async function verifyWithLink(uid, token) {
    setLoading(true);
    const res = await APIBase.request(apiVerify, {
      method: 'POST',
      body: JSON.stringify({ uid, token }),
      headers: { 'Content-Type': 'application/json' },
      noRedirectOn401: true
    });
    setLoading(false);

    if (!res.success) {
      const msg = (res.errorJSON && (res.errorJSON.detail || res.errorJSON.message)) || res.error || 'Verification link invalid or expired';
      utils.showToast(msg, 'danger');
      return;
    }

    const data = res.data || {};
    try {
      if (data.tokens && data.tokens.access) localStorage.setItem('access_token', data.tokens.access);
      if (data.tokens && data.tokens.refresh) localStorage.setItem('refresh_token', data.tokens.refresh);
      sessionStorage.removeItem('pending_verification_email');
    } catch (e) {}

    utils.showToast('Email verified successfully. Redirecting...', 'success');
    window.location.href = data.redirect_url || '/auth-users/dashboard/';
  }

  async function resendCode(email) {
    if (!email) {
      utils.showToast('Please enter your email to resend the code', 'warning');
      return;
    }
    setResendLoading(true);
    const res = await APIBase.request(apiResend, {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
      noRedirectOn401: true
    });
    setResendLoading(false);

    if (!res.success) {
      const msg = (res.errorJSON && (res.errorJSON.detail || res.errorJSON.message)) || res.error || 'Failed to resend code';
      utils.showToast(msg, 'danger');
      return;
    }

    utils.showToast('Verification code sent. Check your inbox.', 'info');
  }

  function setLoading(isLoading){
    const btn = qs('#verify-submit');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...' : 'Verify';
  }
  function setResendLoading(isLoading){
    const btn = qs('#resend-code-btn');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...' : 'Resend Code';
  }

  document.addEventListener('DOMContentLoaded', async function(){
    // Proactively clear local tokens
    try { if (window.APIBase && typeof APIBase.clearAllTokens === 'function') APIBase.clearAllTokens(); } catch (e) {}
    // Proactively clear Django session (fire-and-forget)
    try { fetch(apiDjangoLogout, { method: 'POST', credentials: 'same-origin' }).catch(()=>{}); } catch(e) {}

    const { email, uid, token } = getInitialState();

    // Auto-attempt verification if link params are present
    if (uid && token) {
      try { await verifyWithLink(uid, token); } catch (e) {}
    }

    const verifyForm = qs('#verify-form');
    if (verifyForm) {
      verifyForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const emailVal = (qs('#verify-email')?.value || '').trim();
        const codeVal = (qs('#verify-code')?.value || '').trim();
        await verifyWithCode(emailVal, codeVal);
      });
    }

    const resendBtn = qs('#resend-code-btn');
    if (resendBtn) {
      resendBtn.addEventListener('click', async () => {
        const emailVal = (qs('#verify-email')?.value || '').trim();
        await resendCode(emailVal);
      });
    }
  });
})();

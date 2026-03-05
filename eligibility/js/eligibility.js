const ELIG_API = (window.KLOUDY_API_BASE || '') + (window.location.pathname.includes('eligibility') ? '/eligibility/api' : '/api');
const BACKEND_API = (window.KLOUDY_API_BASE || '') + '/admin/api';
const credFetch = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' });
const isStandalone = window.location.port === '9933';
const ADMIN_URL = (window.KLOUDY_API_BASE || '') + '/admin';
const OPENEMR_URL = (window.KLOUDY_API_BASE || '') + '/openemr';
const MEDICAID_PORTAL_URL = 'https://www.medicaid.nv.gov/hcp/provider/Home/tabid/135/Default.aspx';

let lastEligibilityResult = null;

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function setStatus(text, type) {
  const el = document.getElementById('eligibility-status');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'eligibility-status' + (type ? ' ' + type : '');
}

function showManualCheckButton(show) {
  const btn = document.getElementById('btn-manual-check');
  const actions = document.getElementById('manual-check-actions');
  if (btn) btn.style.display = show ? 'inline-block' : 'none';
  if (actions) actions.style.display = show ? 'block' : 'none';
}

function renderEligibilityResults(data) {
  const container = document.getElementById('eligibility-results');
  const content = document.getElementById('eligibility-results-content');
  if (!container || !content) return;

  container.style.display = 'block';

  if (data.success) {
    let html = '';
    if (data.feeForService != null) {
      html += `<p class="${data.feeForService ? 'fee-for-service' : ''}">Fee for Service: ${data.feeForService ? 'Yes' : 'No'}</p>`;
    }
    if (data.coverageDetails) {
      html += `<pre>${escapeHtml(typeof data.coverageDetails === 'string' ? data.coverageDetails : JSON.stringify(data.coverageDetails, null, 2))}</pre>`;
    }
    if (!html) html = '<p>Eligibility verified.</p>';
    content.innerHTML = html;
    content.className = 'eligibility-results-content' + (data.feeForService ? ' fee-for-service' : '');
    showManualCheckButton(false);
  } else {
    let msg = escapeHtml(data.error || 'Check failed');
    if (data.humanFallbackRequired) {
      msg += '\n\nUse "Open Medicaid Portal (Manual Check)" below to verify eligibility manually.';
    }
    content.innerHTML = `<p class="error">${msg}</p>`;
    content.className = 'eligibility-results-content';
    showManualCheckButton(data.humanFallbackRequired === true);
  }
}

document.getElementById('eligibility-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const lastName = document.getElementById('elig-lastname')?.value?.trim();
  const firstName = document.getElementById('elig-firstname')?.value?.trim();
  const dob = document.getElementById('elig-dob')?.value?.trim();
  const effectiveFrom = document.getElementById('elig-effective')?.value?.trim();
  const recipientId = document.getElementById('elig-recipient')?.value?.trim() || null;
  const ssn = document.getElementById('elig-ssn')?.value?.trim() || null;

  if (!lastName || !firstName || !dob) {
    setStatus('Please fill required fields: Last Name, First Name, Birth Date.', 'error');
    return;
  }

  if (!recipientId && !ssn) {
    setStatus('Please provide either Recipient ID or SSN.', 'error');
    return;
  }

  const btn = document.getElementById('btn-check-eligibility');
  if (btn) {
    btn.disabled = true;
    btn.classList.add('loading');
  }
  setStatus('Checking eligibility...', 'loading');

  try {
    const res = await credFetch(`${ELIG_API}/eligibility/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastName,
        firstName,
        dob,
        effectiveFrom,
        recipientId,
        ssn,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Request failed: ${res.status}`);
    }

    lastEligibilityResult = data;
    renderEligibilityResults(data);
    setStatus(data.success ? 'Eligibility check complete.' : 'Agent could not complete. Use Manual Check if needed.');
  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
    renderEligibilityResults({
      success: false,
      error: err.message,
      humanFallbackRequired: true,
    });
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }
});

async function ensureEligibilityAppRunning() {
  try {
    const res = await credFetch(`${BACKEND_API}/eligibility/start-app`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (data.success && data.message === 'Eligibility app starting...') {
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (_) {}
}

async function openPortalForManualCheck() {
  setStatus('Opening portal... Logging in...', 'loading');
  const btn = document.getElementById('btn-manual-check');
  const btnResults = document.getElementById('btn-manual-check-results');
  if (btn) btn.disabled = true;
  if (btnResults) btnResults.disabled = true;
  try {
    let res = await credFetch(`${ELIG_API}/eligibility/open-portal`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (data.success) {
      setStatus('Browser opened on Eligibility page. Enter patient data and submit.');
    } else {
      setStatus('Error: ' + (data.error || 'Failed'), 'error');
      window.open(MEDICAID_PORTAL_URL, '_blank');
    }
  } catch (err) {
    setStatus('Starting eligibility app...', 'loading');
    await ensureEligibilityAppRunning();
    try {
      const retry = await credFetch(`${ELIG_API}/eligibility/open-portal`, { method: 'POST' });
      const data = await retry.json().catch(() => ({}));
      if (data.success) {
        setStatus('Browser opened on Eligibility page. Enter patient data and submit.');
      } else {
        setStatus('Error: ' + (data.error || err.message), 'error');
        window.open(MEDICAID_PORTAL_URL, '_blank');
      }
    } catch (_) {
      setStatus('Error: ' + err.message, 'error');
      window.open(MEDICAID_PORTAL_URL, '_blank');
    }
  } finally {
    if (btn) btn.disabled = false;
    if (btnResults) btnResults.disabled = false;
  }
}

document.getElementById('btn-manual-check')?.addEventListener('click', openPortalForManualCheck);

document.getElementById('btn-manual-check-results')?.addEventListener('click', openPortalForManualCheck);

document.getElementById('btn-open-portal')?.addEventListener('click', openPortalForManualCheck);

document.getElementById('btn-eligibility')?.addEventListener('click', () => {
  document.getElementById('eligibility-view').style.display = '';
  document.getElementById('eligibility-chat-container').style.display = '';
  document.getElementById('profiles-view').style.display = 'none';
  document.querySelector('.view-eligibility')?.classList.remove('view-profiles', 'view-chat-only');
});

document.getElementById('btn-chat')?.addEventListener('click', () => {
  window.location.href = ADMIN_URL;
});

document.getElementById('btn-profiles')?.addEventListener('click', () => {
  document.getElementById('eligibility-view').style.display = 'none';
  document.getElementById('eligibility-chat-container').style.display = 'none';
  document.getElementById('profiles-view').style.display = 'block';
  document.querySelector('.view-eligibility')?.classList.add('view-profiles');
  if (typeof loadProfiles === 'function') loadProfiles();
});

document.getElementById('btn-openemr')?.addEventListener('click', () => {
  window.open(OPENEMR_URL + '/', '_blank');
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    const res = await credFetch(`${BACKEND_API}/auth/logout`, { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    const loginUrl = data.redirect || (isStandalone ? `http://${window.location.hostname}:9902` : '/');
    window.location.href = loginUrl;
  } catch (_) {
    window.location.href = isStandalone ? `http://${window.location.hostname}:9902` : '/';
  }
});

document.getElementById('btn-export')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = document.getElementById('export-menu');
  if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', () => {
  const menu = document.getElementById('export-menu');
  if (menu) menu.style.display = 'none';
});

document.getElementById('export-menu')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const item = e.target.closest('.export-menu-item');
  if (!item) return;
  document.getElementById('export-menu').style.display = 'none';
  if (typeof runExport === 'function') runExport(item.dataset.export);
});

document.getElementById('chat-minimize-btn')?.addEventListener('click', () => {
  const area = document.getElementById('chat-input-area');
  const btn = document.getElementById('chat-minimize-btn');
  if (area && btn) {
    const isMinimized = area.classList.toggle('chat-input-minimized');
    btn.textContent = isMinimized ? 'Expand ↑' : '−';
    btn.title = isMinimized ? 'Expand input bar' : 'Minimize input bar';
  }
});

window.getLastEligibilityResult = () => lastEligibilityResult;

// TOTP code display for MFA login
const TOTP_REFRESH_MS = 10000;
let totpRefreshTimer = null;

async function fetchAndShowTotpCode(retryAfterStart = false) {
  const display = document.getElementById('totp-code-display');
  const msg = document.getElementById('totp-refresh-msg');
  if (!display) return;
  const prevCode = display.textContent;
  try {
    const res = await credFetch(`${ELIG_API}/eligibility/totp`);
    const data = await res.json().catch(() => ({}));
    if (data.success && data.code) {
      display.textContent = data.code;
      if (msg) msg.textContent = 'Refreshes every 10s';
      if (prevCode !== data.code && prevCode !== '—') {
        display.classList.add('totp-code-highlight');
        setTimeout(() => display.classList.remove('totp-code-highlight'), 800);
      }
    } else {
      display.textContent = '—';
      if (msg) msg.textContent = data.error || 'Not configured. Add NEVADA_MEDICAID_TOTP_SECRET to .env and restart.';
    }
  } catch (err) {
    if (!retryAfterStart) {
      if (msg) msg.textContent = 'Starting...';
      await ensureEligibilityAppRunning();
      return fetchAndShowTotpCode(true);
    }
    display.textContent = '—';
    if (msg) msg.textContent = 'Error loading';
  }
}

document.getElementById('totp-refresh-btn')?.addEventListener('click', () => {
  fetchAndShowTotpCode();
});

document.getElementById('totp-copy-btn')?.addEventListener('click', async () => {
  let code = document.getElementById('totp-code-display')?.textContent;
  if (!code || code === '—') {
    await fetchAndShowTotpCode();
    code = document.getElementById('totp-code-display')?.textContent;
  }
  if (code && code !== '—') {
    try {
      await navigator.clipboard.writeText(code);
      const btn = document.getElementById('totp-copy-btn');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    } catch (_) {}
  }
});

fetchAndShowTotpCode();
totpRefreshTimer = setInterval(fetchAndShowTotpCode, TOTP_REFRESH_MS);

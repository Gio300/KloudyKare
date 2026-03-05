/**
 * OpenEMR and Export for Admin Approvals page
 */
(function () {
  const API = (typeof window !== 'undefined' && window.location.pathname.startsWith('/approvals')) ? '/approvals' : '';
  let OPENEMR_BASE_URL = `http://${window.location.hostname}:9914`;
  let OPENEMR_DEFAULT_PATH = '/interface/login/login.php';
  const POPUP_NAME = 'kloudy-openemr';

  async function loadConfig() {
    try {
      const res = await fetch(`${API}/api/config`);
      const cfg = await res.json();
      return cfg;
    } catch (_) {
      return {};
    }
  }

  async function loadOpenEMRConfig() {
    const cfg = await loadConfig();
    const isStandalone = ['9982'].includes(window.location.port);
    if (isStandalone) {
      OPENEMR_BASE_URL = `http://${window.location.hostname}:9914`;
    } else if (cfg.openemr_ui_url) {
      OPENEMR_BASE_URL = cfg.openemr_ui_url;
    } else if ((window.location.port === '443' || window.location.port === '80' || !window.location.port) && window.location.protocol === 'https:') {
      OPENEMR_BASE_URL = `${window.location.origin}/openemr`;
    }
    if (cfg.openemr_ui_path) {
      OPENEMR_DEFAULT_PATH = cfg.openemr_ui_path;
    }
  }

  function getOpenEMRUrl(path) {
    const base = OPENEMR_BASE_URL.replace(/\/$/, '');
    const p = path || OPENEMR_DEFAULT_PATH;
    return p ? `${base}${p.startsWith('/') ? p : '/' + p}` : base;
  }

  function openOpenEMRPopup(path) {
    const url = getOpenEMRUrl(path);
    const win = window.open(url, POPUP_NAME, 'width=900,height=700,menubar=no,toolbar=yes,scrollbars=yes,resizable=yes');
    if (win) win.focus();
  }

  const btnOpenemr = document.getElementById('btn-openemr');
  if (btnOpenemr) {
    btnOpenemr.addEventListener('click', async () => {
      await loadOpenEMRConfig();
      openOpenEMRPopup();
    });
  }

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
      const cfg = await loadConfig();
      const backendUrl = (cfg.backend_url || `http://${window.location.hostname}:9900`).replace(/\/$/, '');
      const basePath = (cfg.base_path || 'admin').replace(/^\/|\/$/g, '');
      const logoutUrl = `${backendUrl}/${basePath}/api/auth/logout`;
      const res = await fetch(logoutUrl, { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const loginUrl = data.redirect || `http://${window.location.hostname}:9902`;
      window.location.href = loginUrl;
    } catch (_) {
      window.location.href = `http://${window.location.hostname}:9902`;
    }
  });

  document.getElementById('btn-export').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('export-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    const menu = document.getElementById('export-menu');
    if (menu) menu.style.display = 'none';
  });

  document.getElementById('export-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('.export-menu-item');
    if (!item) return;
    const action = item.dataset.export;
    document.getElementById('export-menu').style.display = 'none';
    runExport(action);
  });

  async function runExport(action) {
    const cfg = await loadConfig();
    const backendUrl = (cfg.backend_url || '').replace(/\/$/, '');
    const basePath = (cfg.base_path || 'admin').replace(/^\/|\/$/g, '');
    const exportUrl = `${backendUrl}/${basePath}/api/export/${action}`;

    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:1rem;right:1rem;padding:0.5rem 1rem;background:#1e3a5f;color:#fff;border-radius:6px;font-size:0.875rem;z-index:9999;';
    msg.textContent = `Exporting ${action}...`;
    document.body.appendChild(msg);

    try {
      let res, data;
      if (action === 'openemr') {
        res = await fetch(exportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource: 'patient' }),
          credentials: 'include',
        });
      } else if (action === 'chat' || action === 'profiles') {
        res = await fetch(exportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        });
      } else if (action === 'backup') {
        res = await fetch(exportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          credentials: 'include',
        });
      }
      data = await res.json();
      const summary = data.results
        ? data.results.map((r) => r.resource + (r.filepath ? ' ok' : '')).join(', ')
        : (data.filepath || data.messageCount || 'done');
      msg.textContent = data.ok ? `Exported: ${summary}` : (data.error || 'Failed');
      msg.style.background = data.ok ? '#059669' : '#dc2626';
    } catch (e) {
      msg.textContent = `Error: ${e.message}`;
      msg.style.background = '#dc2626';
    }
    setTimeout(() => msg.remove(), 4000);
  }
})();

let OPENEMR_BASE_URL = `http://${window.location.hostname}:9914`;
let OPENEMR_DEFAULT_PATH = '/interface/login/login.php';
const POPUP_NAME = 'kloudy-openemr';

async function loadOpenEMRConfig() {
  try {
    const res = await fetch('/admin/api/config');
    const cfg = await res.json();
    const isStandalone = ['9900', '9990'].includes(window.location.port);
    if (isStandalone) {
      // Standalone dev: use local OpenEMR port; config may point to production
      OPENEMR_BASE_URL = `http://${window.location.hostname}:9914`;
    } else if (cfg.openemr_ui_url) {
      OPENEMR_BASE_URL = cfg.openemr_ui_url;
    } else if ((window.location.port === '443' || window.location.port === '80' || !window.location.port) && window.location.protocol === 'https:') {
      OPENEMR_BASE_URL = `${window.location.origin}/openemr`;
    }
    if (cfg.openemr_ui_path) {
      OPENEMR_DEFAULT_PATH = cfg.openemr_ui_path;
    }
  } catch (_) {}
}

function getOpenEMRUrl(path = '') {
  const base = OPENEMR_BASE_URL.replace(/\/$/, '');
  const p = path || OPENEMR_DEFAULT_PATH;
  return p ? `${base}${p.startsWith('/') ? p : '/' + p}` : base;
}

function openOpenEMRPopup(path = '') {
  const url = getOpenEMRUrl(path);
  const width = 900;
  const height = 700;
  const left = Math.max(0, (screen.availWidth || 1024) - width - 50);
  const top = 50;
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=yes',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',');
  const win = window.open(url, POPUP_NAME, features);
  if (win) win.focus();
}

const btnOpenemr = document.getElementById('btn-openemr');
if (btnOpenemr) {
  btnOpenemr.addEventListener('click', async () => {
    await loadOpenEMRConfig();
    openOpenEMRPopup();
  });
}

window.openOpenEMRWithContext = function (path) {
  loadOpenEMRConfig().then(() => openOpenEMRPopup(path));
};

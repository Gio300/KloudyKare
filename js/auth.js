const API = (window.KLOUDY_API_BASE || '') + '/api';

async function fetchWithCreds(url, opts = {}) {
try {
    const res = await fetch(url, { ...opts, credentials: 'include' });
return res;
  } catch (err) {
throw err;
  }
}

async function checkAuth() {
  const res = await fetchWithCreds(`${API}/auth/me`);
  if (res.ok) {
    const data = await res.json();
    return data.user;
  }
  return null;
}

async function redirectByRole(user) {
  if (!user) {
    redirectToLogin();
    return;
  }
  const role = user.role || 'client';
  const adminApproved = user.admin_approved === 1 || user.admin_approved === true;
  const basePath = (window.KLOUDY_BASE_PATH || '').replace(/\/$/, '');
  if (role === 'admin' && adminApproved) {
    const host = window.location.hostname;
    const isGitHubPages = host.includes('github.io') || basePath;
    const isPublicDomain = host === 'kloudykare.com' || host === 'www.kloudykare.com';
    const targetUrl = isGitHubPages ? (window.location.origin + (basePath ? basePath + '/' : '') + 'admin/') : (isPublicDomain ? '/admin' : `http://${host}:9900/admin`);
    const adminConfigUrl = isGitHubPages ? ((window.KLOUDY_API_BASE || '') + '/admin/api/config') : (isPublicDomain ? '/admin/api/config' : `http://${host}:9900/admin/api/config`);
    const configRes = await fetchWithCreds(adminConfigUrl);
    if (!configRes.ok) {
      await fetchWithCreds(`${API}/auth/logout`, { method: 'POST' });
      redirectToLogin();
      return;
    }
window.location.href = targetUrl;
    return;
  }
  if (role === 'admin' && !adminApproved) {
    const chatPath = basePath ? basePath + '/chat.html?message=pending_admin' : '/chat.html?message=pending_admin';
    window.location.href = basePath ? (window.location.origin + chatPath) : chatPath;
    return;
  }
  const chatPath = basePath ? basePath + '/chat.html' : '/chat.html';
  window.location.href = basePath ? (window.location.origin + chatPath) : chatPath;
}

function redirectToLogin() {
  const base = (window.KLOUDY_BASE_PATH || window.KLOUDY_LOGIN_URL || '/KloudyKare').replace(/\/$/, '') + '/';
  window.location.href = base.startsWith('http') ? base : (window.location.origin + base);
}

async function initAuth() {
  const user = await checkAuth();
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  const base = (window.KLOUDY_BASE_PATH || '/KloudyKare').replace(/\/$/, '');
  const isLoginPage = p === '/' || p === base || window.location.pathname.endsWith('index.html');
if (user && isLoginPage) {
    await redirectByRole(user);
    return;
  }
  if (!user && !isLoginPage) {
    redirectToLogin();
    return;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      const errEl = document.getElementById('login-error');
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const res = await fetchWithCreds(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.require_totp && data.temp_token) {
          loginForm.classList.add('hidden');
          document.getElementById('totp-step').classList.remove('hidden');
          window._totpTempToken = data.temp_token;
          return;
        }
        await redirectByRole(data.user);
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  const totpForm = document.getElementById('totp-form');
  if (totpForm) {
    totpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = window._totpTempToken;
      if (!token) {
        document.getElementById('totp-error').textContent = 'Session expired. Please sign in again.';
        return;
      }
      const btn = document.getElementById('totp-btn');
      const errEl = document.getElementById('totp-error');
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const res = await fetchWithCreds(`${API}/auth/verify-totp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            temp_token: token,
            code: document.getElementById('totp-code').value,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Verification failed');
        window._totpTempToken = null;
        await redirectByRole(data.user);
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('register-btn');
      const errEl = document.getElementById('register-error');
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const res = await fetchWithCreds(`${API}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            full_name: document.getElementById('reg-name').value || null,
            role: document.getElementById('reg-role')?.value || 'client',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        await redirectByRole(data.user);
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  const showRegister = document.getElementById('show-register');
  if (showRegister) {
    showRegister.addEventListener('click', () => {
      document.getElementById('login-view').classList.add('hidden');
      document.getElementById('register-view').classList.remove('hidden');
    });
  }

  const showLogin = document.getElementById('show-login');
  if (showLogin) {
    showLogin.addEventListener('click', () => {
      document.getElementById('register-view').classList.add('hidden');
      document.getElementById('login-view').classList.remove('hidden');
    });
  }

  const totpBack = document.getElementById('totp-back');
  if (totpBack) {
    totpBack.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('totp-step').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
      window._totpTempToken = null;
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetchWithCreds(`${API}/auth/logout`, { method: 'POST' });
      redirectToLogin();
    });
  }
});

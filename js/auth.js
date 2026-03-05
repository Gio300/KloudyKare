const API = (window.KLOUDY_API_BASE || '') + '/api';
const BASE = (window.KLOUDY_BASE_PATH || '').replace(/\/$/, '');
const LOGIN_URL = BASE ? BASE + '/' : '/';
const CHAT_URL = BASE ? BASE + '/chat.html' : '/chat.html';

async function fetchWithCreds(url, opts = {}) {
  return fetch(url, { ...opts, credentials: 'include' });
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
    window.location.href = LOGIN_URL;
    return;
  }
  const role = user.role || 'client';
  const adminApproved = user.admin_approved === 1 || user.admin_approved === true;
  if (role === 'admin' && adminApproved) {
    const host = window.location.hostname;
    const isPublicDomain = host === 'kloudykare.com' || host === 'www.kloudykare.com';
    const isGitHubPages = host.includes('github.io');
    const targetUrl = isPublicDomain ? '/admin' : (BASE ? BASE + '/admin' : 'http://' + host + ':9900/admin');
    // Verify backend accepts our session before redirecting (avoids redirect loop when session stores differ)
    const adminConfigUrl = isPublicDomain ? '/admin/api/config' : (isGitHubPages ? (window.KLOUDY_API_BASE || '') + '/admin/api/config' : (BASE ? BASE + '/admin/api/config' : 'http://' + host + ':9900/admin/api/config'));
    // #region agent log
    fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:beforeAdminConfigFetch',message:'Before adminConfig fetch',data:{adminConfigUrl},hypothesisId:'H1,H4',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    let configRes;
    try {
      configRes = await fetchWithCreds(adminConfigUrl);
    } catch (e) {
      configRes = { ok: false };
    }
    // #region agent log
    fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:adminConfigResponse',message:'Admin config response',data:{status:configRes?.status,ok:configRes?.ok,statusText:configRes?.statusText},hypothesisId:'H1,H2',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!configRes.ok) {
      if (isGitHubPages) {
        window.location.href = targetUrl;
        return;
      }
      await fetchWithCreds(`${API}/auth/logout`, { method: 'POST' });
      window.location.href = LOGIN_URL;
      return;
    }
    // #region agent log
    fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:redirectByRole',message:'Admin redirect',data:{host,targetUrl,userId:user?.id},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    window.location.href = targetUrl;
    return;
  }
  if (role === 'admin' && !adminApproved) {
    window.location.href = CHAT_URL + '?message=pending_admin';
    return;
  }
  window.location.href = CHAT_URL;
}

function redirectToLogin() {
  window.location.href = LOGIN_URL;
}

async function initAuth() {
  const user = await checkAuth();
  const pathname = window.location.pathname;
  const isLoginPage = pathname === '/' || pathname === LOGIN_URL || pathname === BASE || pathname === BASE + '/' || pathname.endsWith('index.html');
  // #region agent log
  (function() {
    const payload = { sessionId: '1ffda1', hypothesisId: 'H3,H4', location: 'auth.js:initAuth', message: 'initAuth', data: { hasUser: !!user, userId: user?.id, role: user?.role, pathname: window.location.pathname, isLoginPage }, timestamp: Date.now() };
    fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '1ffda1' }, body: JSON.stringify(payload) }).catch(function() {});
  })();
  // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:loginSubmit',message:'Login submit start',data:{apiBase:API},hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      try {
        const res = await fetchWithCreds(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value,
          }),
        });
        // #region agent log
        fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:loginResponse',message:'Login response',data:{status:res.status,ok:res.ok,statusText:res.statusText},hypothesisId:'H1,H3',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.require_totp && data.temp_token) {
          loginForm.classList.add('hidden');
          document.getElementById('totp-step').classList.remove('hidden');
          window._totpTempToken = data.temp_token;
          return;
        }
        // #region agent log
        fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:beforeRedirectByRole',message:'Before redirectByRole',data:{userRole:data.user?.role,adminApproved:data.user?.admin_approved},hypothesisId:'H4',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        await redirectByRole(data.user);
      } catch (err) {
        // #region agent log
        fetch('http://127.0.0.1:7314/ingest/59c2767c-dbc2-4c1b-a071-68d6be99d2ca',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1ffda1'},body:JSON.stringify({sessionId:'1ffda1',location:'auth.js:loginCatch',message:'Login catch',data:{errMsg:err?.message,errName:err?.name},hypothesisId:'H1,H2,H3',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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

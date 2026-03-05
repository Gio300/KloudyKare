const profilePanel = document.getElementById('profile-panel');
const profileOverlay = document.getElementById('profile-overlay');
const profileForm = document.getElementById('profile-form');
const profileError = document.getElementById('profile-error');

function openProfile() {
  if (profilePanel) profilePanel.classList.add('open');
  if (profileOverlay) profileOverlay.classList.add('open');
  loadProfile();
}

function closeProfile() {
  if (profilePanel) profilePanel.classList.remove('open');
  if (profileOverlay) profileOverlay.classList.remove('open');
  if (profileError) profileError.textContent = '';
}

async function loadProfile() {
  try {
    const res = await fetchWithCreds(`${API}/profile`);
    const data = await res.json();
    if (res.status === 401) {
      window.location.href = window.KLOUDY_LOGIN_URL || "/";
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Failed to load profile');
    document.getElementById('profile-name').value = data.full_name || '';
    document.getElementById('profile-email').value = data.email || '';
    const devBadge = document.getElementById('profile-dev-badge');
    if (devBadge && data.email === 'dev@test.local') devBadge.classList.remove('hidden');
    document.getElementById('profile-new-password').value = '';
    document.getElementById('profile-current-password').value = '';

    const totpEnabled = !!data.totp_enabled;
    const statusEl = document.getElementById('profile-totp-status');
    const enableBtn = document.getElementById('profile-totp-enable');
    const disableBtn = document.getElementById('profile-totp-disable');
    if (statusEl) statusEl.textContent = totpEnabled ? '2FA is enabled.' : '2FA is not enabled.';
    if (enableBtn) {
      enableBtn.classList.toggle('hidden', totpEnabled);
    }
    if (disableBtn) {
      disableBtn.classList.toggle('hidden', !totpEnabled);
    }
  } catch (err) {
    if (profileError) profileError.textContent = err.message;
  }
}

function openTotpSetupModal() {
  const overlay = document.getElementById('totp-modal-overlay');
  const modal = document.getElementById('totp-modal');
  if (overlay) overlay.classList.add('open');
  if (modal) modal.classList.add('open');
  document.getElementById('totp-setup-code').value = '';
  document.getElementById('totp-setup-error').textContent = '';
}

function closeTotpSetupModal() {
  const overlay = document.getElementById('totp-modal-overlay');
  const modal = document.getElementById('totp-modal');
  if (overlay) overlay.classList.remove('open');
  if (modal) modal.classList.remove('open');
}

function openTotpDisableModal() {
  const overlay = document.getElementById('totp-disable-modal-overlay');
  const modal = document.getElementById('totp-disable-modal');
  if (overlay) overlay.classList.add('open');
  if (modal) modal.classList.add('open');
  document.getElementById('totp-disable-password').value = '';
  document.getElementById('totp-disable-code').value = '';
  document.getElementById('totp-disable-error').textContent = '';
}

function closeTotpDisableModal() {
  const overlay = document.getElementById('totp-disable-modal-overlay');
  const modal = document.getElementById('totp-disable-modal');
  if (overlay) overlay.classList.remove('open');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const btnProfile = document.getElementById('btn-profile');
  if (btnProfile) {
    btnProfile.addEventListener('click', openProfile);
  }

  const profileClose = document.getElementById('profile-close');
  if (profileClose) {
    profileClose.addEventListener('click', closeProfile);
  }

  if (profileOverlay) {
    profileOverlay.addEventListener('click', closeProfile);
  }

  const totpEnableBtn = document.getElementById('profile-totp-enable');
  if (totpEnableBtn) {
    totpEnableBtn.addEventListener('click', async () => {
      try {
        const res = await fetchWithCreds(`${API}/auth/totp/setup`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Setup failed');
        document.getElementById('totp-qr-img').src = data.qrDataUrl;
        document.getElementById('totp-secret-display').textContent = data.secret || '';
        openTotpSetupModal();
      } catch (err) {
        if (profileError) profileError.textContent = err.message;
      }
    });
  }

  const totpSetupVerify = document.getElementById('totp-setup-verify');
  if (totpSetupVerify) {
    totpSetupVerify.addEventListener('click', async () => {
      const code = document.getElementById('totp-setup-code').value.trim();
      const errEl = document.getElementById('totp-setup-error');
      errEl.textContent = '';
      if (!code || code.length !== 6) {
        errEl.textContent = 'Please enter the 6-digit code.';
        return;
      }
      totpSetupVerify.disabled = true;
      try {
        const res = await fetchWithCreds(`${API}/auth/totp/enable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Enable failed');
        closeTotpSetupModal();
        loadProfile();
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        totpSetupVerify.disabled = false;
      }
    });
  }

  const totpSetupCancel = document.getElementById('totp-setup-cancel');
  if (totpSetupCancel) {
    totpSetupCancel.addEventListener('click', closeTotpSetupModal);
  }

  const totpModalOverlay = document.getElementById('totp-modal-overlay');
  if (totpModalOverlay) {
    totpModalOverlay.addEventListener('click', closeTotpSetupModal);
  }

  const totpDisableBtn = document.getElementById('profile-totp-disable');
  if (totpDisableBtn) {
    totpDisableBtn.addEventListener('click', openTotpDisableModal);
  }

  const totpDisableSubmit = document.getElementById('totp-disable-submit');
  if (totpDisableSubmit) {
    totpDisableSubmit.addEventListener('click', async () => {
      const password = document.getElementById('totp-disable-password').value;
      const code = document.getElementById('totp-disable-code').value.trim();
      const errEl = document.getElementById('totp-disable-error');
      errEl.textContent = '';
      if (!password) {
        errEl.textContent = 'Please enter your password.';
        return;
      }
      if (!code || code.length !== 6) {
        errEl.textContent = 'Please enter the 6-digit authenticator code.';
        return;
      }
      totpDisableSubmit.disabled = true;
      try {
        const res = await fetchWithCreds(`${API}/auth/totp/disable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Disable failed');
        closeTotpDisableModal();
        loadProfile();
      } catch (err) {
        errEl.textContent = err.message;
      } finally {
        totpDisableSubmit.disabled = false;
      }
    });
  }

  const totpDisableCancel = document.getElementById('totp-disable-cancel');
  if (totpDisableCancel) {
    totpDisableCancel.addEventListener('click', closeTotpDisableModal);
  }

  const totpDisableOverlay = document.getElementById('totp-disable-modal-overlay');
  if (totpDisableOverlay) {
    totpDisableOverlay.addEventListener('click', closeTotpDisableModal);
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (profileError) profileError.textContent = '';
      const full_name = document.getElementById('profile-name').value.trim() || null;
      const email = document.getElementById('profile-email').value.trim();
      const new_password = document.getElementById('profile-new-password').value;
      const current_password = document.getElementById('profile-current-password').value;

      const body = { full_name, email };
      if (new_password) {
        body.new_password = new_password;
        body.current_password = current_password;
      }

      try {
        const res = await fetchWithCreds(`${API}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.status === 401) {
          window.location.href = window.KLOUDY_LOGIN_URL || "/";
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Update failed');
        closeProfile();
      } catch (err) {
        if (profileError) profileError.textContent = err.message;
      }
    });
  }
});

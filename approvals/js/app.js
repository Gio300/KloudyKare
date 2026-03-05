const API = (typeof window !== 'undefined' && window.location.pathname.includes('approvals')) ? '/KloudyKare/approvals/api' : '';

const UI_MODE_KEY = 'kloudy-ui-mode';
const CUSTOM_KEY = 'kloudy-customization';

function getCustomization() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return { textScale: 1, zoom: 1 };
    const obj = JSON.parse(raw);
    return { textScale: obj.textScale ?? 1, zoom: obj.zoom ?? 1 };
  } catch (_) {
    return { textScale: 1, zoom: 1 };
  }
}

function applyCustomization(opts, persist = true) {
  const textScale = opts.textScale ?? 1;
  const zoom = opts.zoom ?? 1;
  document.documentElement.style.setProperty('--text-scale', String(textScale));
  document.documentElement.style.setProperty('--zoom-scale', String(zoom));
  if (persist) localStorage.setItem(CUSTOM_KEY, JSON.stringify({ textScale, zoom }));
}

function updateDeviceClass() {
  const manual = document.body.dataset.uiMode;
  if (manual) {
    document.body.dataset.device = manual;
    return;
  }
  const isDesktop = window.matchMedia('(min-width: 769px)').matches;
  const isCellular = window.matchMedia('(max-width: 400px)').matches;
  document.body.dataset.device = isDesktop ? 'desktop' : (isCellular ? 'cellular' : 'mobile');
}

function getEffectiveUiMode() {
  const manual = document.body.dataset.uiMode;
  if (manual) return manual;
  const isDesktop = window.matchMedia('(min-width: 769px)').matches;
  const isCellular = window.matchMedia('(max-width: 400px)').matches;
  return isDesktop ? 'desktop' : (isCellular ? 'cellular' : 'mobile');
}

function applyUiMode(mode) {
  document.body.dataset.uiMode = mode || '';
  if (mode) localStorage.setItem(UI_MODE_KEY, mode);
  else localStorage.removeItem(UI_MODE_KEY);
  updateDeviceClass();
  updateUiModeButtons();
}

function updateUiModeButtons() {
  const effective = getEffectiveUiMode();
  const modeForButton = effective === 'cellular' ? 'mobile' : effective;
  document.querySelectorAll('.ui-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === modeForButton);
  });
}

function showCustomizationModal() {
  const modal = document.getElementById('customize-modal');
  if (!modal) return;
  const cust = getCustomization();
  const textInput = document.getElementById('customize-text-size');
  const zoomInput = document.getElementById('customize-zoom');
  const textValue = document.getElementById('customize-text-size-value');
  const zoomValue = document.getElementById('customize-zoom-value');
  if (textInput) { textInput.value = cust.textScale; if (textValue) textValue.textContent = Math.round(cust.textScale * 100) + '%'; }
  if (zoomInput) { zoomInput.value = cust.zoom; if (zoomValue) zoomValue.textContent = Math.round(cust.zoom * 100) + '%'; }
  document.querySelectorAll('.customize-device-btn').forEach((btn) => {
    const mode = document.body.dataset.uiMode || '';
    const effective = mode || (window.matchMedia('(min-width: 769px)').matches ? 'desktop' : 'mobile');
    const modeForBtn = effective === 'cellular' ? 'mobile' : effective;
    btn.classList.toggle('active', btn.dataset.mode === modeForBtn);
  });
  modal.style.display = 'flex';
}

function hideCustomizationModal() {
  applyCustomization(getCustomization()); // revert any preview
  const modal = document.getElementById('customize-modal');
  if (modal) modal.style.display = 'none';
}

document.querySelectorAll('.ui-mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    const current = document.body.dataset.uiMode;
    if (current === mode) {
      applyUiMode('');
    } else {
      applyUiMode(mode);
    }
    showCustomizationModal();
  });
});

let savedMode = localStorage.getItem(UI_MODE_KEY);
if (savedMode === 'tablet') {
  savedMode = 'desktop';
  localStorage.setItem(UI_MODE_KEY, 'desktop');
}
if (savedMode && ['mobile', 'desktop'].includes(savedMode)) {
  document.body.dataset.uiMode = savedMode;
}
updateDeviceClass();
updateUiModeButtons();
window.addEventListener('resize', () => {
  updateDeviceClass();
  updateUiModeButtons();
});

applyCustomization(getCustomization());

document.getElementById('customize-modal-close')?.addEventListener('click', hideCustomizationModal);
document.querySelector('.customize-modal-overlay')?.addEventListener('click', hideCustomizationModal);
document.getElementById('customize-apply')?.addEventListener('click', () => {
  const textScale = parseFloat(document.getElementById('customize-text-size')?.value || 1);
  const zoom = parseFloat(document.getElementById('customize-zoom')?.value || 1);
  applyCustomization({ textScale, zoom });
  hideCustomizationModal();
});
document.getElementById('customize-reset')?.addEventListener('click', () => {
  applyCustomization({ textScale: 1, zoom: 1 });
  const textInput = document.getElementById('customize-text-size');
  const zoomInput = document.getElementById('customize-zoom');
  const textValue = document.getElementById('customize-text-size-value');
  const zoomValue = document.getElementById('customize-zoom-value');
  if (textInput) { textInput.value = 1; if (textValue) textValue.textContent = '100%'; }
  if (zoomInput) { zoomInput.value = 1; if (zoomValue) zoomValue.textContent = '100%'; }
});
document.getElementById('customize-text-size')?.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  document.getElementById('customize-text-size-value').textContent = Math.round(v * 100) + '%';
  const z = parseFloat(document.getElementById('customize-zoom')?.value || 1);
  applyCustomization({ textScale: v, zoom: z }, false); // live preview
});
document.getElementById('customize-zoom')?.addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  document.getElementById('customize-zoom-value').textContent = Math.round(v * 100) + '%';
  const t = parseFloat(document.getElementById('customize-text-size')?.value || 1);
  applyCustomization({ textScale: t, zoom: v }, false); // live preview
});
document.querySelectorAll('.customize-device-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    applyUiMode(mode);
    document.querySelectorAll('.customize-device-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  });
});

async function loadPending() {
  const list = document.getElementById('approvals-list');
  const empty = document.getElementById('approvals-empty');
  try {
    const res = await fetch(`${API}/api/approvals/pending`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    if (data.length === 0) {
      list.innerHTML = '';
      empty.textContent = 'No pending admin accounts';
      empty.classList.remove('hidden');
      list.appendChild(empty);
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = data.map((u) => `
      <div class="approval-item" data-id="${u.id}">
        <div class="approval-info">
          <div class="approval-email">${escapeHtml(u.email)}</div>
          <div class="approval-name">${escapeHtml(u.full_name || '-')} · ${formatDate(u.created_at)}</div>
        </div>
        <div class="approval-actions">
          <button class="btn btn-primary btn-approve" data-id="${u.id}">Approve</button>
          <button class="btn btn-outline btn-deny" data-id="${u.id}">Deny</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.btn-approve').forEach((btn) => {
      btn.addEventListener('click', () => approve(parseInt(btn.dataset.id, 10)));
    });
    list.querySelectorAll('.btn-deny').forEach((btn) => {
      btn.addEventListener('click', () => deny(parseInt(btn.dataset.id, 10)));
    });
  } catch (err) {
    empty.textContent = err.message || 'Failed to load';
    empty.classList.remove('hidden');
    list.innerHTML = '';
  }
}

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(s) {
  if (!s) return '-';
  try {
    const d = new Date(s);
    return d.toLocaleDateString();
  } catch {
    return s;
  }
}

async function approve(userId) {
  try {
    const res = await fetch(`${API}/api/approvals/approve/${userId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    loadPending();
  } catch (err) {
    alert(err.message);
  }
}

async function deny(userId) {
  if (!confirm('Deny this admin request? They will be demoted to client.')) return;
  try {
    const res = await fetch(`${API}/api/approvals/deny/${userId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    loadPending();
  } catch (err) {
    alert(err.message);
  }
}

const chatHistory = [];
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.textContent = content;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  chatSend.disabled = true;
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'chat-msg assistant chat-thinking';
  thinkingDiv.innerHTML = '<img src="images/KloudyCareLogos.png" alt="Kloudy" class="chat-thinking-logo" onerror="this.style.display=\'none\'"><span class="thinking-dots"><span></span><span></span><span></span></span>';
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  try {
    const res = await fetch(`${API}/api/chat?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) }),
    });
    if (!res.ok) {
      const data = await res.json();
      thinkingDiv.remove();
      throw new Error(data.error || 'Chat failed');
    }

    const contentType = res.headers.get('Content-Type') || '';
    const isStream = contentType.includes('text/event-stream');

    if (isStream) {
      thinkingDiv.remove();
      const assistantDiv = document.createElement('div');
      assistantDiv.className = 'chat-msg assistant';
      assistantDiv.textContent = '';
      chatMessages.appendChild(assistantDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const match = part.match(/^data:\s*(.+)$/m);
          if (match) {
            try {
              const obj = JSON.parse(match[1]);
              if (obj.error) throw new Error(obj.error);
              if (obj.content) {
                fullContent += obj.content;
                assistantDiv.textContent = fullContent;
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }
            } catch (e) {
              if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
            }
          }
        }
      }
      if (buffer.trim()) {
        const match = buffer.match(/^data:\s*(.+)$/m);
        if (match) {
          try {
            const obj = JSON.parse(match[1]);
            if (obj.error) throw new Error(obj.error);
            if (obj.content) fullContent += obj.content;
          } catch (e) {
            if (e instanceof Error && !(e instanceof SyntaxError)) throw e;
          }
        }
      }
      assistantDiv.textContent = fullContent;
      chatHistory.push({ role: 'assistant', content: fullContent });
    } else {
      const data = await res.json();
      thinkingDiv.remove();
      appendMessage('assistant', data.content);
      chatHistory.push({ role: 'assistant', content: data.content });
    }
  } catch (err) {
    thinkingDiv.remove();
    appendMessage('assistant', 'Error: ' + err.message);
  } finally {
    chatSend.disabled = false;
  }
}

chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

document.getElementById('link-login').href = '/';

loadPending();

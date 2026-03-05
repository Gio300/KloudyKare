const API = (window.KLOUDY_API_BASE || '') + '/admin/api';
const apiFetch = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' });

function getTheme() {
  return localStorage.getItem('kloudy-theme') || 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
  localStorage.setItem('kloudy-theme', theme);
  const tt = document.getElementById('theme-toggle');
  if (tt) tt.textContent = theme === 'dark' ? 'Light' : 'Dark';
}

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(theme);
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  try {
    const res = await apiFetch(`${API}/auth/logout`, { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (data.redirect) window.location.href = data.redirect;
    else window.location.href = `http://${window.location.hostname}:9902`;
  } catch (_) {
    window.location.href = `http://${window.location.hostname}:9902`;
  }
});

setTheme(getTheme());

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

function showCustomizationModal() {
  const modal = document.getElementById('customize-modal');
  if (!modal) return;
  const cust = getCustomization();
  const textInput = document.getElementById('customize-text-size');
  const zoomInput = document.getElementById('customize-zoom');
  const textValue = document.getElementById('customize-text-size-value');
  const zoomValue = document.getElementById('customize-zoom-value');
  if (textInput) { textInput.value = cust.textScale; textValue.textContent = Math.round(cust.textScale * 100) + '%'; }
  if (zoomInput) { zoomInput.value = cust.zoom; zoomValue.textContent = Math.round(cust.zoom * 100) + '%'; }
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

const cust = getCustomization();
applyCustomization(cust);

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
  if (textInput) { textInput.value = 1; textValue.textContent = '100%'; }
  if (zoomInput) { zoomInput.value = 1; zoomValue.textContent = '100%'; }
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

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
let chatHistory = [];

let chatCustomersCache = [];

function openHelpModal() {
  const modal = document.getElementById('chat-help-modal');
  if (modal) modal.style.display = 'flex';
}

function closeHelpModal() {
  const modal = document.getElementById('chat-help-modal');
  if (modal) modal.style.display = 'none';
}

async function loadChatCustomers(limit = 200) {
  const url = `${API}/customers?limit=${limit}`;
let res;
  try {
    res = await apiFetch(`${API}/customers?limit=${limit}`);
} catch (err) {
throw err;
  }
  const customers = await res.json().catch(() => []);
  chatCustomersCache = Array.isArray(customers) ? customers : [];
  const sel = document.getElementById('chat-customer-context');
  sel.innerHTML = '<option value="">All customers</option>';
  chatCustomersCache.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.full_name || `Customer ${c.id}`;
    sel.appendChild(opt);
  });
}

async function loadChatHistory() {
  try {
    const res = await apiFetch(`${API}/chat/history?limit=50`);
    const data = await res.json();
    chatHistory = Array.isArray(data) ? data : [];
    if (!res.ok && data?.error) {
      if (res.status === 401) {
        const loginPath = window.KLOUDY_LOGIN_URL || '/KloudyKare/';
        window.location.href = loginPath.startsWith('http') ? loginPath : (window.location.origin + loginPath);
      }
      return;
    }
    renderMessages(chatHistory);
  } catch (e) {
    console.error('Load history:', e);
    chatHistory = [];
    renderMessages([]);
  }
}

function renderMessages(messages) {
  chatMessages.innerHTML = '';
  if (!Array.isArray(messages)) return;
  messages.forEach((m) => {
    const div = document.createElement('div');
    div.className = `message ${m.role}`;
    div.innerHTML = `
      <span class="message-role">${m.role}</span>
      <span class="message-content">${escapeHtml(m.content)}</span>
    `;
    if (m.role === 'assistant' && m.content) {
      const btnContainer = document.createElement('div');
      btnContainer.className = 'chat-action-buttons';
      btnContainer.style.marginTop = '0.5rem';
      btnContainer.style.display = 'flex';
      btnContainer.style.gap = '0.5rem';
      btnContainer.style.flexWrap = 'wrap';
      const expandBtn = document.createElement('button');
      expandBtn.className = 'btn btn-outline';
      expandBtn.textContent = 'Expand';
      expandBtn.onclick = () => showExpandModal(m.content);
      btnContainer.appendChild(expandBtn);
      div.appendChild(btnContainer);
    }
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/** Strip HTML tags and normalize whitespace for message preview/parsing */
function stripHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function parseMessageBody(text) {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  let out = (div.textContent || div.innerText || '');
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const quoted = out.match(/\n-{2,}\s*(?:Original message|On .+ wrote:|---)/i);
  if (quoted) {
    const idx = out.indexOf(quoted[0]);
    out = out.slice(0, idx).trim() + '\n\n' + out.slice(idx).trim();
  }
  return out.trim();
}

/** Truncate text for preview, preserving word boundaries */
function truncatePreview(text, maxLen = 80) {
  const s = stripHtml(text || '');
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen).replace(/\s+\S*$/, '');
  return cut + (cut.length < s.length ? '…' : '');
}

/** Safely parse JSON from fetch response; handles HTML error pages (backend not reached) */
async function parseJsonResponse(r) {
  const text = await r.text();
  const trimmed = text.trim();
  const hint = 'Restart the Kloudy backend: cd backend && npm start';
  if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    const msg = r.status === 404
      ? `Email endpoint not found (404). ${hint}`
      : `Email service unavailable. ${hint}`;
    throw new Error(msg);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid response from server. ${hint}`);
  }
}

function getPastedImageFile(e) {
  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
  if (!item) return null;
  const blob = item.getAsFile();
  if (!blob) return null;
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
  return new File([blob], `screenshot_${Date.now()}.${ext}`, { type: blob.type });
}

async function uploadPastedScreenshotToCustomer(file, customerId, notes) {
  const form = new FormData();
  form.append('file', file);
  if (notes) form.append('notes', notes);
  const res = await apiFetch(`${API}/documents/${customerId}`, { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  resetChatInputHeight();
  chatSend.disabled = true;
  chatSend.classList.add('loading');

  const userDiv = document.createElement('div');
  userDiv.className = 'message user';
  userDiv.innerHTML = `<span class="message-content">${escapeHtml(text)}</span>`;
  chatMessages.appendChild(userDiv);

  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message assistant thinking-message';
  thinkingDiv.id = 'thinking-indicator';
  thinkingDiv.innerHTML = `
    <div class="thinking-avatar">
      <img src="images/KloudyCareLogos.png" alt="KloudyCare" class="thinking-emoticon">
    </div>
    <div class="thinking-body">
      <span class="message-role">Assistant</span>
      <span class="message-content thinking-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
    </div>
  `;
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const historyForApi = chatHistory.slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const customerId = document.getElementById('chat-customer-context')?.value || null;
  const controller = new AbortController();
  const timeoutMs = 120000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const eligibilityContext = typeof window.getLastEligibilityResult === 'function' ? window.getLastEligibilityResult() : null;
    const res = await apiFetch(`${API}/chat?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        message: text,
        history: historyForApi,
        customer_id: customerId ? parseInt(customerId, 10) : null,
        eligibility_context: eligibilityContext || undefined,
      }),
      signal: controller.signal,
    });

    const contentType = res.headers.get('Content-Type') || '';
    const isStream = contentType.includes('text/event-stream') && res.ok;

    let data;
    let fullContent = '';

    if (isStream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
                const thinking = document.getElementById('thinking-indicator');
                if (thinking) {
                  thinking.remove();
                  const assistantDiv = document.createElement('div');
                  assistantDiv.className = 'message assistant';
                  assistantDiv.innerHTML = `<span class="message-role">Assistant</span><span class="message-content">${escapeHtml(fullContent)}</span>`;
                  chatMessages.appendChild(assistantDiv);
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                } else {
                  const contentSpan = chatMessages.querySelector('.message.assistant:last-of-type .message-content');
                  if (contentSpan) {
                    contentSpan.textContent = fullContent;
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                  }
                }
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
            if (e instanceof SyntaxError) {}
            else throw e;
          }
        }
      }
      data = { content: fullContent };
    } else {
      data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
    }

    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: data.content });

    const thinking = document.getElementById('thinking-indicator');
    if (thinking) thinking.remove();
    let assistantDiv = chatMessages.querySelector('.message.assistant:last-of-type');
    if (!assistantDiv || assistantDiv.querySelector('.chat-action-buttons')) {
      assistantDiv = document.createElement('div');
      assistantDiv.className = 'message assistant';
      assistantDiv.innerHTML = `
      <span class="message-role">Assistant</span>
      <span class="message-content">${escapeHtml(data.content)}</span>
    `;
      chatMessages.appendChild(assistantDiv);
    } else {
      const contentSpan = assistantDiv.querySelector('.message-content');
      if (contentSpan) contentSpan.textContent = data.content;
    }
    const btnContainer = document.createElement('div');
    btnContainer.className = 'chat-action-buttons';
    btnContainer.style.marginTop = '0.5rem';
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '0.5rem';
    btnContainer.style.flexWrap = 'wrap';

    const createBtn = document.createElement('button');
    createBtn.className = 'btn btn-outline chat-create-profile-btn';
    createBtn.textContent = 'Create profile from this';
    createBtn.onclick = () => createProfileFromText(data.content);
    const showCreateBtn = /extracted|create profile|save the profile|correct\?|would you like|save profile|profile for:|name:|date of birth|full name|DOB|client info|new client|provider type|PT\d/i.test(data.content);
    if (showCreateBtn) btnContainer.appendChild(createBtn);

    if (data.email_draft) {
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn';
      confirmBtn.textContent = 'Confirm Send';
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Sending...';
        try {
          const r = await apiFetch(`${API}/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: data.email_draft.customer_id,
              recipient_email: data.email_draft.recipient_email,
              subject: data.email_draft.subject,
              body: data.email_draft.body,
              sender_name: 'Kloudy',
            }),
          });
          const result = await parseJsonResponse(r);
          if (r.ok) {
            confirmBtn.textContent = 'Sent';
            confirmBtn.classList.add('btn-outline');
            refreshNotificationCount();
            const okDiv = document.createElement('div');
            okDiv.className = 'message assistant';
            okDiv.style.marginTop = '0.5rem';
            okDiv.innerHTML = `<span class="message-content">Email sent to ${escapeHtml(data.email_draft.recipient_name)}.</span>`;
            assistantDiv.parentNode.insertBefore(okDiv, assistantDiv.nextSibling);
            chatHistory.push({ role: 'assistant', content: `Email sent to ${data.email_draft.recipient_name}.` });
          } else {
            confirmBtn.textContent = 'Retry';
            confirmBtn.disabled = false;
            alert(result.error || 'Failed to send email');
          }
        } catch (err) {
          confirmBtn.textContent = 'Retry';
          confirmBtn.disabled = false;
          alert(err.message || 'Failed to send email');
        }
      };
      btnContainer.appendChild(confirmBtn);
    }

    const showAddNoteBtn = customerId && /call|notes?|payment|inquiry|informed|resolved|disposition|schedule|spoke with|contacted/i.test(data.content);
    if (showAddNoteBtn) {
      const addNoteBtn = document.createElement('button');
      addNoteBtn.className = 'btn btn-outline';
      addNoteBtn.textContent = 'Add to call notes';
      addNoteBtn.onclick = () => addCallNoteFromText(data.content, customerId);
      btnContainer.appendChild(addNoteBtn);
    }

    const showDMBtn = customerId && /direct message|send.*message|dm\b|message to|send dm|openemr message|pnote/i.test(data.content);
    if (showDMBtn) {
      const dmBtn = document.createElement('button');
      dmBtn.className = 'btn btn-outline';
      dmBtn.textContent = OPENEMR_CHAT_FEATURES_ENABLED ? 'Send Direct Message' : 'Coming soon';
      dmBtn.disabled = !OPENEMR_CHAT_FEATURES_ENABLED;
      if (OPENEMR_CHAT_FEATURES_ENABLED) {
        dmBtn.onclick = () => {
          const cust = chatCustomersCache.find((c) => c.id === parseInt(customerId, 10));
          openActionPIP('dm', cust);
        };
      }
      btnContainer.appendChild(dmBtn);
    }

    const showVcBtn = customerId && /virtual (visit|call|appointment)|telehealth|video call|start.*virtual|comlink/i.test(data.content);
    if (showVcBtn) {
      const vcBtn = document.createElement('button');
      vcBtn.className = 'btn btn-outline';
      vcBtn.textContent = OPENEMR_CHAT_FEATURES_ENABLED ? 'Start virtual call' : 'Coming soon';
      vcBtn.disabled = !OPENEMR_CHAT_FEATURES_ENABLED;
      if (OPENEMR_CHAT_FEATURES_ENABLED) {
        vcBtn.onclick = () => {
          const cust = chatCustomersCache.find((c) => c.id === parseInt(customerId, 10));
          openActionPIP('virtual_call', cust);
        };
      }
      btnContainer.appendChild(vcBtn);
    }

    const showOpenEMRBtn = /appointment|patient|schedule|encounter|openemr|today's|calendar/i.test(data.content);
    if (showOpenEMRBtn) {
      const openemrBtn = document.createElement('button');
      openemrBtn.className = 'btn btn-outline';
      openemrBtn.textContent = OPENEMR_CHAT_FEATURES_ENABLED ? 'Open in OpenEMR' : 'Coming soon';
      openemrBtn.disabled = !OPENEMR_CHAT_FEATURES_ENABLED;
      if (OPENEMR_CHAT_FEATURES_ENABLED) {
        openemrBtn.onclick = () => {
          if (window.openOpenEMRWithContext) {
            window.openOpenEMRWithContext('/interface/main/main_screen.php');
          } else {
            window.open('/openemr/', '_blank');
          }
        };
      }
      btnContainer.appendChild(openemrBtn);

      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn btn-outline';
      exportBtn.textContent = 'Export this to external drive';
      exportBtn.onclick = () => exportChatContextToDrive(data.content);
      btnContainer.appendChild(exportBtn);
    }

    const expandBtn = document.createElement('button');
    expandBtn.className = 'btn btn-outline';
    expandBtn.textContent = 'Expand';
    expandBtn.onclick = () => showExpandModal(data.content);
    btnContainer.appendChild(expandBtn);

    if (btnContainer.children.length) assistantDiv.appendChild(btnContainer);
    const thinkingEl = document.getElementById('thinking-indicator');
    if (thinkingEl) thinkingEl.remove();
    chatMessages.appendChild(assistantDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    const thinking = document.getElementById('thinking-indicator');
    if (thinking) thinking.remove();
    const errMsg = e.name === 'AbortError' ? 'Request timed out. Ollama may be slow or not running. Ensure Ollama is open with Llama 3.3.' : e.message;
    const errDiv = document.createElement('div');
    errDiv.className = 'message assistant';
    errDiv.innerHTML = `
      <span class="message-role">Error</span>
      <span class="message-content">${escapeHtml(errMsg)}</span>
    `;
    chatMessages.appendChild(errDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } finally {
    clearTimeout(timeoutId);
  }

  chatSend.disabled = false;
  chatSend.classList.remove('loading');
}

function resizeChatInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
}

function resetChatInputHeight() {
  chatInput.style.height = 'auto';
  chatInput.style.height = '48px';
}

chatInput.addEventListener('input', resizeChatInput);
chatInput.addEventListener('focus', resizeChatInput);

chatInput.addEventListener('paste', async (e) => {
  const file = getPastedImageFile(e);
  if (!file) return;
  e.preventDefault();
  const customerId = document.getElementById('chat-customer-context')?.value || null;
  if (customerId) {
    try {
      await uploadPastedScreenshotToCustomer(file, customerId, 'Screenshot from chat');
      const custName = document.getElementById('chat-customer-context')?.selectedOptions?.[0]?.textContent || 'profile';
      const div = document.createElement('div');
      div.className = 'message user';
      div.innerHTML = `<span class="message-content">Screenshot uploaded to ${escapeHtml(custName)}</span>`;
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (err) {
      console.error('Upload failed:', err);
      openUploadModal([file]);
    }
  } else {
    openUploadModal([file]);
  }
});

/* Action functions for # predictor - dm/virtual_call availability set on init */
const OPENEMR_CHAT_FEATURES_ENABLED = false; // Set true when ready to re-enable
const ACTION_FUNCTIONS = [
  { id: 'email', label: 'Email', icon: '\u2709', available: true },
  { id: 'dm', label: 'Direct Message', icon: '\u{1F4AC}', available: true },
  { id: 'set_reminder', label: 'Set Reminder', icon: '\u23F0', available: true },
  { id: 'virtual_call', label: 'Virtual Call', icon: '\u{1F4F9}', available: true },
];

/* @mention predictive dropdown */
let mentionState = { open: false, query: '', startPos: 0, selectedIndex: 0, matches: [] };

/* # function predictor */
let hashState = { open: false, query: '', startPos: 0, selectedIndex: 0, activeInput: null };

function getHashContext(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const hashMatch = before.match(/#([^\s#]*)$/);
  if (!hashMatch) return null;
  return { query: hashMatch[1].toLowerCase(), startPos: cursorPos - hashMatch[0].length };
}

function filterActionsByQuery(query) {
  if (!query) return ACTION_FUNCTIONS;
  const q = query.toLowerCase();
  return ACTION_FUNCTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
}

function resolveCustomerFromInput(text, beforeHashEnd) {
  const segment = text.slice(0, beforeHashEnd);
  const atMatch = segment.match(/@([^\s@]+)\s*$/);
  if (!atMatch) return null;
  const namePart = atMatch[1].trim().toLowerCase();
  const list = chatCustomersCache.length ? chatCustomersCache : [];
  return list.find((c) => (c.full_name || '').toLowerCase().includes(namePart) || (c.full_name || '').toLowerCase() === namePart) || null;
}

function showHashDropdown(matches, dropdownEl, inputEl) {
  const dropdown = dropdownEl || document.getElementById('chat-hash-dropdown');
  if (!dropdown) return;
  if (!matches.length) {
    dropdown.style.display = 'none';
    return;
  }
  hashState.matches = matches;
  hashState.selectedIndex = 0;
  hashState.open = true;
  hashState.activeInput = inputEl || chatInput;
  const chatHash = document.getElementById('chat-hash-dropdown');
  const expandHash = document.getElementById('expand-modal-hash-dropdown');
  if (chatHash) chatHash.style.display = dropdown.id === 'chat-hash-dropdown' ? 'block' : 'none';
  if (expandHash) expandHash.style.display = dropdown.id === 'expand-modal-hash-dropdown' ? 'block' : 'none';
  dropdown.innerHTML = `
    <div class="chat-hash-header">Choose action</div>
    ${matches.map((a, i) => `
      <div class="chat-hash-item ${i === 0 ? 'selected' : ''}" data-id="${escapeHtml(a.id)}">
        <span class="chat-hash-item-icon">${a.icon}</span>
        <span class="chat-hash-item-label">${escapeHtml(a.label)}</span>
      </div>
    `).join('')}
  `;
  dropdown.style.display = 'block';
  dropdown.querySelectorAll('.chat-hash-item').forEach((el, i) => {
    el.addEventListener('click', () => selectHashItem(i, hashState.activeInput));
  });
}

function hideHashDropdown(dropdownEl) {
  const dropdown = dropdownEl || document.getElementById('chat-hash-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  const expandDropdown = document.getElementById('expand-modal-hash-dropdown');
  if (expandDropdown) expandDropdown.style.display = 'none';
  hashState.open = false;
}

function selectHashItem(index, inputEl) {
  const input = inputEl || hashState.activeInput || chatInput;
  const matches = hashState.matches || [];
  const action = matches[index];
  if (!action || !input) return;
  const customer = resolveCustomerFromInput(input.value, hashState.startPos);
  const beforeCursor = input.value.slice(0, input.selectionStart);
  const match = beforeCursor.match(/@[^\s@]+\s*#[^\s#]*$/);
  const removeStart = match ? beforeCursor.length - match[0].length : hashState.startPos;
  const after = input.value.slice(input.selectionStart);
  input.value = input.value.slice(0, removeStart) + after;
  input.selectionStart = input.selectionEnd = removeStart;
  input.focus();
  hideHashDropdown();
  hideMentionDropdown();
  if (input === chatInput) resizeChatInput();
  if (input === document.getElementById('expand-modal-input')) closeExpandModal();
  openActionPIP(action.id, customer);
}

function openActionPIP(actionId, customer, extraOptions) {
  if (messageCenterRefreshInterval) {
    clearInterval(messageCenterRefreshInterval);
    messageCenterRefreshInterval = null;
  }
  const pip = document.getElementById('action-pip');
  const titleEl = document.getElementById('action-pip-title');
  const bodyEl = document.getElementById('action-pip-body');
  const footerEl = document.getElementById('action-pip-footer');
  if (!pip || !titleEl || !bodyEl || !footerEl) return;

  const action = ACTION_FUNCTIONS.find((a) => a.id === actionId);
  if (!action) return;

  const customerName = customer ? (customer.full_name || `Customer ${customer.id}`) : '';
  const prefill = extraOptions || {};

  if (!OPENEMR_CHAT_FEATURES_ENABLED && (actionId === 'dm' || actionId === 'virtual_call')) {
    titleEl.textContent = actionId === 'dm' ? 'Direct Message' : 'Virtual Call';
    bodyEl.innerHTML = '<p class="text-muted">Coming soon.</p>';
    footerEl.innerHTML = '';
    pip.style.display = 'flex';
    return;
  }

  if (actionId === 'email') {
    titleEl.textContent = prefill.replyTo ? `Reply to ${prefill.replyTo}` : (customerName ? `Email to ${customerName}` : 'Send Email');
    const EMAIL_TEMPLATES = [
      { id: '', label: 'Custom' },
      { id: 'appointment_reminder', label: 'Appointment reminder' },
      { id: 'welcome', label: 'Welcome' },
      { id: 'follow_up', label: 'Follow-up' },
      { id: 'thank_you', label: 'Thank you' },
      { id: 'general_inquiry', label: 'General inquiry' },
    ];
    const renderEmailBody = () => {
      const profileOptions = (chatCustomersCache || []).filter((c) => c.email).map((c) =>
        `<option value="${c.id}" data-email="${escapeHtml(c.email)}" data-name="${escapeHtml(c.full_name || '')}" data-openemr-pid="${c.openemr_pid || ''}">${escapeHtml(c.full_name || `Customer ${c.id}`)}</option>`
      ).join('');
      bodyEl.innerHTML = `
      <div class="pip-field">
        <label>To</label>
        <select id="pip-email-customer"><option value="">Select customer...</option>${profileOptions}</select>
        <input type="email" id="pip-email-custom" placeholder="Or enter custom email address" style="margin-top:0.5rem;">
        <div id="pip-email-dm-link" class="pip-email-dm-link" style="display:none;margin-top:0.5rem;"><a href="#" class="link-style">Or send via DM</a></div>
      </div>
      <div class="pip-field">
        <label>Template</label>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <select id="pip-email-template" style="flex:1;">
            ${EMAIL_TEMPLATES.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('')}
          </select>
          <button class="btn btn-outline" id="pip-email-generate" type="button">Generate</button>
        </div>
      </div>
      <div class="pip-field">
        <label>Subject</label>
        <input type="text" id="pip-email-subject" placeholder="Subject" value="${escapeHtml(prefill.subject || 'Message from Kloudy')}">
      </div>
      <div class="pip-field">
        <label>Message</label>
        <textarea id="pip-email-body" placeholder="Type your message...">${escapeHtml(prefill.body || '')}</textarea>
      </div>
    `;
      footerEl.innerHTML = '<button class="btn" id="pip-email-send">Send</button>';
      const sendBtn = footerEl.querySelector('#pip-email-send');
      const sel = bodyEl.querySelector('#pip-email-customer');
      const customInput = bodyEl.querySelector('#pip-email-custom');
      if (prefill.recipient_email) {
        sel.value = '';
        customInput.value = prefill.recipient_email;
        customInput.placeholder = prefill.recipient_email;
      } else if (customer && customer.email) {
        sel.value = String(customer.id);
        const opt = sel.querySelector(`option[value="${customer.id}"]`);
        if (!opt) {
          const newOpt = document.createElement('option');
          newOpt.value = customer.id;
          newOpt.dataset.email = customer.email;
          newOpt.dataset.name = customerName;
          newOpt.dataset.openemrPid = customer.openemr_pid || '';
          newOpt.textContent = customerName;
          sel.insertBefore(newOpt, sel.options[sel.options.length - 1]);
        }
      }
      const dmLink = bodyEl.querySelector('#pip-email-dm-link');
      const updateDmLink = () => {
        if (!dmLink) return;
        const opt = sel?.selectedOptions?.[0];
        const hasPid = opt?.dataset?.openemrPid && !customInput?.value?.trim();
        dmLink.style.display = hasPid ? 'block' : 'none';
      };
      updateDmLink();
      sel?.addEventListener('change', updateDmLink);
      customInput?.addEventListener('input', updateDmLink);
      dmLink?.querySelector('a')?.addEventListener('click', (e) => {
        e.preventDefault();
        const opt = sel?.selectedOptions?.[0];
        if (!opt?.dataset?.openemrPid) return;
        const cust = chatCustomersCache?.find((c) => c.id === parseInt(sel.value, 10));
        if (!cust?.openemr_pid) return;
        const subject = bodyEl.querySelector('#pip-email-subject')?.value || 'Message from Kloudy';
        const body = bodyEl.querySelector('#pip-email-body')?.value || '';
        closeActionPIP();
        openActionPIP('dm', cust, { title: subject, body });
      });
      bodyEl.querySelector('#pip-email-generate').addEventListener('click', async () => {
        const templateType = bodyEl.querySelector('#pip-email-template').value;
        if (!templateType) return;
        const custId = sel.value && sel.value !== '__custom__' ? parseInt(sel.value, 10) : null;
        const genBtn = bodyEl.querySelector('#pip-email-generate');
        genBtn.disabled = true;
        genBtn.textContent = 'Generating...';
        try {
          const r = await apiFetch(`${API}/email/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ template_type: templateType, customer_id: custId }),
          });
          const data = await parseJsonResponse(r);
          if (r.ok && (data.subject || data.body)) {
            bodyEl.querySelector('#pip-email-subject').value = data.subject || '';
            bodyEl.querySelector('#pip-email-body').value = data.body || '';
          } else if (!r.ok && data.error) {
            alert(data.error);
          }
        } catch (e) {
          alert(e.message || 'Failed to generate');
        }
        genBtn.disabled = false;
        genBtn.textContent = 'Generate';
      });
      const getRecipient = () => {
        const customVal = (customInput?.value || '').trim();
        if (customVal && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customVal)) {
          return { id: null, email: customVal, name: customVal };
        }
        if (!sel.value) return null;
        const opt = sel.options[sel.selectedIndex];
        return { id: parseInt(sel.value, 10), email: opt?.dataset?.email || '', name: opt?.textContent || '' };
      };
      sendBtn?.addEventListener('click', async () => {
        const rec = getRecipient();
        if (!rec || !rec.email) {
          alert('Select a customer with an email address or enter a custom email.');
          return;
        }
        const subject = bodyEl.querySelector('#pip-email-subject')?.value || 'Message from Kloudy';
        const body = bodyEl.querySelector('#pip-email-body')?.value || '';
        if (!body.trim()) {
          alert('Enter a message.');
          return;
        }
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
        try {
          const r = await apiFetch(`${API}/email/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer_id: rec.id,
              recipient_email: rec.email,
              subject,
              body: body.trim(),
              sender_name: 'Kloudy',
            }),
          });
          const result = await parseJsonResponse(r);
          if (r.ok) {
            sendBtn.textContent = 'Sent';
            refreshNotificationCount();
            setTimeout(() => closeActionPIP(), 1500);
          } else {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
            alert(result.error || 'Failed to send email');
          }
        } catch (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send';
          alert(err.message || 'Failed to send email');
        }
      });
    };
    loadChatCustomers(200).then(renderEmailBody);
  } else if (actionId === 'dm') {
    titleEl.textContent = customerName ? `Direct Message to ${customerName}` : 'Direct Message';
    bodyEl.innerHTML = '<p class="text-muted">Loading...</p>';
    footerEl.innerHTML = '';
    loadChatCustomers(200).then(() => {
      const dmCustomers = (chatCustomersCache || []).filter((c) => c.openemr_pid);
      const dmOptions = dmCustomers.map((c) =>
        `<option value="${c.id}" data-pid="${c.openemr_pid}">${escapeHtml(c.full_name || `Customer ${c.id}`)}</option>`
      ).join('');
      bodyEl.innerHTML = `
      <div class="pip-field">
        <label>To</label>
        <select id="pip-dm-customer"><option value="">Select customer (must be synced to OpenEMR)...</option>${dmOptions}</select>
        ${!dmCustomers.length ? '<p class="action-pip-placeholder-note">No customers synced to OpenEMR yet. Profiles sync automatically; if OpenEMR is configured, wait a moment and try again.</p>' : ''}
      </div>
      <div class="pip-field">
        <label>Subject</label>
        <input type="text" id="pip-dm-title" placeholder="Subject" value="Message from Kloudy">
      </div>
      <div class="pip-field">
        <label>Message</label>
        <textarea id="pip-dm-body" placeholder="Type your message..."></textarea>
      </div>
    `;
    footerEl.innerHTML = '<button class="btn" id="pip-dm-send">Send</button>';
    const dmSel = bodyEl.querySelector('#pip-dm-customer');
    if (customer && customer.openemr_pid && dmSel) dmSel.value = String(customer.id);
    const prefill = extraOptions || {};
    if (prefill.to_pid != null && dmSel) {
      const byPid = dmSel.querySelector(`option[data-pid="${prefill.to_pid}"]`);
      if (byPid) dmSel.value = byPid.value;
    }
    if (prefill.title) bodyEl.querySelector('#pip-dm-title').value = prefill.title;
    if (prefill.body) bodyEl.querySelector('#pip-dm-body').value = prefill.body;
    footerEl.querySelector('#pip-dm-send')?.addEventListener('click', async () => {
      const sel = bodyEl.querySelector('#pip-dm-customer');
      const pid = sel?.selectedOptions?.[0]?.dataset?.pid;
      const title = bodyEl.querySelector('#pip-dm-title')?.value?.trim() || 'Message from Kloudy';
      const body = bodyEl.querySelector('#pip-dm-body')?.value?.trim();
      if (!pid) {
        alert('Select a customer synced to OpenEMR.');
        return;
      }
      if (!body || body.length < 2) {
        alert('Enter a message (at least 2 characters).');
        return;
      }
      const btn = footerEl.querySelector('#pip-dm-send');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        const r = await apiFetch(`${API}/openemr/patient/${pid}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body, title, from: 'Kloudy', to: 'admin', groupname: 'Default', message_status: 'New' }),
        });
        const data = await parseJsonResponse(r);
        if (r.ok) {
          btn.textContent = 'Sent';
          refreshNotificationCount();
          setTimeout(() => closeActionPIP(), 1200);
        } else {
          btn.disabled = false;
          btn.textContent = 'Send';
          alert(data.error || 'Failed to send message');
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Send';
        alert(err.message || 'Failed to send message');
      }
    });
    });
  } else if (actionId === 'set_reminder') {
    titleEl.textContent = customerName ? `Set Reminder for ${customerName}` : 'Set Reminder';
    bodyEl.innerHTML = '<p class="text-muted">Loading...</p>';
    footerEl.innerHTML = '';
    (async () => {
      let users = [];
      try {
        const r = await apiFetch(`${API}/reminders/users`);
        const data = await parseJsonResponse(r);
        users = data.users || [];
      } catch (_) {}
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const defaultDt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(Math.ceil(now.getMinutes() / 15) * 15)}`;
      const userOpts = users.map((u) =>
        `<option value="${u.id}">${escapeHtml(u.full_name || u.email || `User ${u.id}`)} (${escapeHtml(u.role || 'user')})</option>`
      ).join('');
      bodyEl.innerHTML = `
      <div class="pip-field">
        <label>For</label>
        <select id="pip-reminder-target">
          <option value="self">Myself</option>
          ${userOpts}
        </select>
      </div>
      <div class="pip-field">
        <label>Date & Time</label>
        <input type="datetime-local" id="pip-reminder-dt" value="${defaultDt}" min="${defaultDt}">
      </div>
      <div class="pip-field">
        <label>Reminder</label>
        <textarea id="pip-reminder-text" placeholder="What should I remind you about?">${escapeHtml(customerName ? `Follow up with ${customerName}` : '')}</textarea>
      </div>
      <div class="pip-field" style="display:flex;gap:1rem;flex-wrap:wrap;">
        <div>
          <label>Alert earlier by</label>
          <select id="pip-reminder-earlier">
            <option value="0">At time</option>
            <option value="5">5 min before</option>
            <option value="10">10 min before</option>
            <option value="15">15 min before</option>
            <option value="30">30 min before</option>
          </select>
        </div>
        <div>
          <label>Number of alerts</label>
          <select id="pip-reminder-repeat">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div id="pip-reminder-interval-wrap" style="display:none;">
          <label>Minutes between</label>
          <select id="pip-reminder-interval">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="30">30</option>
          </select>
        </div>
      </div>
      `;
      footerEl.innerHTML = '<button class="btn" id="pip-reminder-schedule">Schedule</button>';
      const repeatSel = bodyEl.querySelector('#pip-reminder-repeat');
      const intervalWrap = bodyEl.querySelector('#pip-reminder-interval-wrap');
      repeatSel?.addEventListener('change', () => {
        intervalWrap.style.display = parseInt(repeatSel.value, 10) > 1 ? 'block' : 'none';
      });
      footerEl.querySelector('#pip-reminder-schedule')?.addEventListener('click', async () => {
        const targetSel = bodyEl.querySelector('#pip-reminder-target');
        const dtInput = bodyEl.querySelector('#pip-reminder-dt');
        const textInput = bodyEl.querySelector('#pip-reminder-text');
        const earlierSel = bodyEl.querySelector('#pip-reminder-earlier');
        const intervalSel = bodyEl.querySelector('#pip-reminder-interval');
        const targetVal = targetSel?.value === 'self' ? 'self' : targetSel?.value;
        const remindAt = dtInput?.value;
        const text = textInput?.value?.trim();
        if (!remindAt || !text) {
          alert('Please set date/time and reminder text.');
          return;
        }
        const btn = footerEl.querySelector('#pip-reminder-schedule');
        btn.disabled = true;
        btn.textContent = 'Scheduling...';
        try {
          const r = await apiFetch(`${API}/reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target_user_id: targetVal,
              customer_id: customer?.id || null,
              remind_at: new Date(remindAt).toISOString(),
              text,
              alert_earlier_minutes: parseInt(earlierSel?.value || '0', 10),
              repeat_count: parseInt(repeatSel?.value || '1', 10),
              repeat_interval_minutes: parseInt(intervalSel?.value || '10', 10),
            }),
          });
          const data = await parseJsonResponse(r);
          if (r.ok) {
            btn.textContent = 'Scheduled';
            refreshNotificationCount();
            setTimeout(() => closeActionPIP(), 1200);
          } else {
            btn.disabled = false;
            btn.textContent = 'Schedule';
            alert(data.error || 'Failed to schedule reminder');
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Schedule';
          alert(err.message || 'Failed to schedule reminder');
        }
      });
    })();
  } else if (actionId === 'virtual_call') {
    titleEl.textContent = customerName ? `Virtual Call with ${customerName}` : 'Virtual Call';
    bodyEl.innerHTML = '<p class="text-muted">Loading...</p>';
    footerEl.innerHTML = '';
    loadChatCustomers(200).then(async () => {
      const vcCustomers = (chatCustomersCache || []).filter((c) => c.openemr_pid);
      const vcOptions = vcCustomers.map((c) =>
        `<option value="${c.id}" data-email="${escapeHtml(c.email || '')}">${escapeHtml(c.full_name || `Customer ${c.id}`)}</option>`
      ).join('');
      bodyEl.innerHTML = `
      <div class="pip-field">
        <label>Patient</label>
        <select id="pip-vc-customer"><option value="">Select customer (must be synced to OpenEMR)...</option>${vcOptions}</select>
        ${!vcCustomers.length ? '<p class="action-pip-placeholder-note">No customers synced to OpenEMR yet. Profiles sync automatically; if OpenEMR is configured, wait a moment and try again.</p>' : ''}
      </div>
      <div class="pip-field">
        <label><input type="checkbox" id="pip-vc-send-email" checked> Send join link via email</label>
      </div>
      <hr style="margin:1rem 0;border-color:var(--border-color, #ddd);">
      <p class="action-pip-placeholder-note" style="margin-bottom:0.5rem;">Quick Virtual Call (any person, no profile required)</p>
      <div class="pip-field">
        <label>Name</label>
        <input type="text" id="pip-vc-quick-name" placeholder="Full name">
      </div>
      <div class="pip-field">
        <label>Email</label>
        <input type="email" id="pip-vc-quick-email" placeholder="email@example.com">
      </div>
      <button class="btn btn-outline" id="pip-vc-quick-start" style="margin-bottom:1rem;">Quick Call</button>
      <p class="action-pip-placeholder-note">Creates a telehealth appointment for now. Provider launches from OpenEMR calendar; patient joins via link (browser, no app). Audio-only: turn off video in the call.</p>
    `;
      footerEl.innerHTML = '<button class="btn" id="pip-vc-start">Create & Start Call</button>';
      const vcSel = bodyEl.querySelector('#pip-vc-customer');
      const sendEmailCb = bodyEl.querySelector('#pip-vc-send-email');
      if (customer && customer.openemr_pid && vcSel) {
        vcSel.value = String(customer.id);
        if (sendEmailCb) sendEmailCb.checked = !!(customer.email);
      }
      vcSel?.addEventListener('change', () => {
        const opt = vcSel?.selectedOptions?.[0];
        if (sendEmailCb && opt) sendEmailCb.checked = !!(opt.dataset?.email);
      });
      bodyEl.querySelector('#pip-vc-quick-start')?.addEventListener('click', async () => {
        const quickName = bodyEl.querySelector('#pip-vc-quick-name')?.value?.trim();
        const quickEmail = bodyEl.querySelector('#pip-vc-quick-email')?.value?.trim();
        if (!quickName || !quickEmail) {
          alert('Enter name and email for Quick Call.');
          return;
        }
        const sendInviteEmail = sendEmailCb?.checked ?? true;
        const btn = bodyEl.querySelector('#pip-vc-quick-start');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        try {
          const r = await apiFetch(`${API}/telehealth/quick-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: quickName, email: quickEmail, send_invite_email: sendInviteEmail }),
          });
          const data = await parseJsonResponse(r);
          if (r.ok) {
            btn.textContent = 'Created';
            try {
              await navigator.clipboard.writeText(data.patient_join_url);
            } catch (_) {}
            if (data.provider_launch_url) {
              window.open(data.provider_launch_url, '_blank');
            }
            let msg = `Quick call created for ${data.customer_name}. ${data.provider_launch_url ? 'OpenEMR opened.' : ''} Patient join link ${navigator.clipboard ? 'copied to clipboard.' : ': ' + data.patient_join_url}`;
            if (sendInviteEmail) {
              msg += data.email_sent ? ' Email sent.' : ' Email not sent (no address or not configured).';
            }
            bodyEl.insertAdjacentHTML('beforeend', `<p class="text-muted" style="margin-top:0.5rem;font-size:0.9rem;">${escapeHtml(msg)}</p>`);
            refreshNotificationCount();
            setTimeout(() => closeActionPIP(), 3500);
          } else {
            btn.disabled = false;
            btn.textContent = 'Quick Call';
            alert(data.error || 'Failed to create quick call');
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Quick Call';
          alert(err.message || 'Failed to create quick call');
        }
      });
      footerEl.querySelector('#pip-vc-start')?.addEventListener('click', async () => {
        const custId = vcSel?.value;
        if (!custId) {
          alert('Select a customer synced to OpenEMR.');
          return;
        }
        const sendInviteEmail = sendEmailCb?.checked ?? true;
        const btn = footerEl.querySelector('#pip-vc-start');
        btn.disabled = true;
        btn.textContent = 'Creating...';
        try {
          const r = await apiFetch(`${API}/telehealth/appointment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customer_id: custId, send_invite_email: sendInviteEmail }),
          });
          const data = await parseJsonResponse(r);
          if (r.ok) {
            btn.textContent = 'Created';
            try {
              await navigator.clipboard.writeText(data.patient_join_url);
            } catch (_) {}
            if (data.provider_launch_url) {
              window.open(data.provider_launch_url, '_blank');
            }
            let msg = `Appointment created. ${data.provider_launch_url ? 'OpenEMR opened.' : ''} Patient join link ${navigator.clipboard ? 'copied to clipboard.' : ': ' + data.patient_join_url}`;
            if (sendInviteEmail) {
              msg += data.email_sent ? ' Email sent.' : ' Email not sent (no address or not configured).';
            }
            bodyEl.insertAdjacentHTML('beforeend', `<p class="text-muted" style="margin-top:0.5rem;font-size:0.9rem;">${escapeHtml(msg)}</p>`);
            bodyEl.insertAdjacentHTML('beforeend', `<button class="btn btn-outline" id="pip-vc-send-dm" style="margin-top:0.5rem;">Send link via DM</button>`);
            bodyEl.querySelector('#pip-vc-send-dm')?.addEventListener('click', () => {
              const cust = chatCustomersCache?.find((c) => c.id === parseInt(custId, 10));
              if (cust?.openemr_pid) {
                closeActionPIP();
                openActionPIP('dm', cust, { body: `Join your telehealth session: ${data.patient_join_url}`, title: 'Telehealth session link' });
              } else {
                alert('Customer not synced to OpenEMR for DM.');
              }
            });
            refreshNotificationCount();
            setTimeout(() => closeActionPIP(), 3500);
          } else {
            btn.disabled = false;
            btn.textContent = 'Create & Start Call';
            alert(data.error || 'Failed to create appointment');
          }
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Create & Start Call';
          alert(err.message || 'Failed to create appointment');
        }
      });
    });
  }

  pip.style.display = 'flex';
}

let messageCenterRefreshInterval = null;

function closeActionPIP() {
  if (messageCenterRefreshInterval) {
    clearInterval(messageCenterRefreshInterval);
    messageCenterRefreshInterval = null;
  }
  const pip = document.getElementById('action-pip');
  if (pip) pip.style.display = 'none';
}
document.getElementById('action-pip-close')?.addEventListener('click', closeActionPIP);

async function refreshNotificationCount() {
  const dot = document.getElementById('notification-dot');
  if (!dot) return;
  try {
    const r = await apiFetch(`${API}/notifications/unread-count`);
    const data = await parseJsonResponse(r).catch(() => ({ count: 0 }));
    dot.style.display = (data.count || 0) > 0 ? 'block' : 'none';
  } catch (_) {
    dot.style.display = 'none';
  }
}

async function refreshMessageCenterIfOpen() {
  const pip = document.getElementById('action-pip');
  const titleEl = document.getElementById('action-pip-title');
  const bodyEl = document.getElementById('action-pip-body');
  const footerEl = document.getElementById('action-pip-footer');
  if (!pip || pip.style.display !== 'flex' || titleEl?.textContent !== 'Message Center' || !bodyEl || !footerEl || messageCenterView !== 'list') return;
  try {
    const r = await apiFetch(`${API}/notifications`);
    const data = await parseJsonResponse(r);
    messageCenterItems = data.items || [];
    const emails = messageCenterItems.filter((i) => i.type === 'email');
    const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
    const calls = messageCenterItems.filter((i) => i.type === 'call_note');
    const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
    const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
    renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
  } catch (_) {}
}

let messageCenterItems = [];
let messageCenterView = 'list';

let autoModeEnabled = false;

async function openMessageCenterPIP() {
  const pip = document.getElementById('action-pip');
  const titleEl = document.getElementById('action-pip-title');
  const bodyEl = document.getElementById('action-pip-body');
  const footerEl = document.getElementById('action-pip-footer');
  if (!pip || !titleEl || !bodyEl) return;
  titleEl.textContent = 'Message Center';
  bodyEl.innerHTML = '<p class="text-muted">Loading...</p>';
  footerEl.innerHTML = '';
  pip.style.display = 'flex';
  messageCenterView = 'list';
  try {
    const [notifRes, autoRes] = await Promise.all([
      apiFetch(`${API}/notifications`),
      apiFetch(`${API}/notifications/auto-mode`),
    ]);
    const data = await parseJsonResponse(notifRes);
    const autoData = await parseJsonResponse(autoRes).catch(() => ({ enabled: false }));
    autoModeEnabled = !!autoData.enabled;
    messageCenterItems = data.items || [];
    const emails = messageCenterItems.filter((i) => i.type === 'email');
    const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
    const calls = messageCenterItems.filter((i) => i.type === 'call_note');
    const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
    const toMark = messageCenterItems.filter((i) => !i.seen).map((i) => ({
      item_type: i.type,
      item_id: i.item_id,
    }));
    if (toMark.length) {
      await apiFetch(`${API}/notifications/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toMark }),
      });
    }
    refreshNotificationCount();
    const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
    renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
    if (autoModeEnabled) processAutoModeMessages(messageCenterItems);
    if (messageCenterRefreshInterval) clearInterval(messageCenterRefreshInterval);
    messageCenterRefreshInterval = setInterval(refreshMessageCenterIfOpen, 20000);
  } catch (e) {
    bodyEl.innerHTML = `<p class="text-muted">Error: ${escapeHtml(e.message)}</p>`;
  }
}

async function processAutoModeMessages(items) {
  const processable = items.filter((i) =>
    i.type === 'openemr_message' || i.type === 'email' || i.type === 'incoming_email' || i.type === 'call_note'
  );
  for (const it of processable.slice(0, 5)) {
    try {
      await apiFetch(`${API}/notifications/auto-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: it.type, item_id: it.item_id }),
      });
    } catch (_) {}
  }
  try {
    const r = await apiFetch(`${API}/notifications`);
    const data = await parseJsonResponse(r);
    messageCenterItems = data.items || [];
    const emails = messageCenterItems.filter((i) => i.type === 'email');
    const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
    const calls = messageCenterItems.filter((i) => i.type === 'call_note');
    const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
    const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
    const bodyEl = document.getElementById('action-pip-body');
    const footerEl = document.getElementById('action-pip-footer');
    if (bodyEl && footerEl && messageCenterView === 'list') {
      renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
    }
  } catch (_) {}
}

async function toggleAutoMode() {
  try {
    await apiFetch(`${API}/notifications/auto-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: autoModeEnabled }),
    });
  } catch (_) {}
  const emails = messageCenterItems.filter((i) => i.type === 'email');
  const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
  const calls = messageCenterItems.filter((i) => i.type === 'call_note');
  const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
  const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
  const bodyEl = document.getElementById('action-pip-body');
  const footerEl = document.getElementById('action-pip-footer');
  if (bodyEl && footerEl) renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
}

function renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders = []) {
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  const section = (title, list, type) => {
    if (!list.length) return `<div class="message-center-section"><h4>${title}</h4><p class="text-muted">No items</p></div>`;
    return `
      <div class="message-center-section">
        <h4>${title}</h4>
        <ul class="message-center-list">
          ${list.map((it, idx) => {
            const itemId = it.item_id || `${type}-${it.id}-${idx}`;
            const clickable = ['email', 'incoming_email', 'call_note', 'openemr_message', 'reminder'].includes(type);
            let preview;
            if (type === 'email' || type === 'incoming_email') {
              preview = truncatePreview(it.subject || it.body || '(No subject)', 60);
            } else if (type === 'call_note') {
              preview = truncatePreview(it.call_reason || it.notes || '(No details)', 60);
            } else if (type === 'reminder') {
              preview = truncatePreview(it.subject || it.body || '(Reminder)', 60);
            } else {
              preview = truncatePreview(it.title || it.body || '(No subject)', 60);
            }
            const cls = [clickable ? 'msg-item-clickable' : '', it.needs_human ? 'msg-item-needs-human' : ''].filter(Boolean).join(' ');
            const meta = it.customer_name || it.creator_name || (type === 'incoming_email' ? it.from : '') || '';
            return `<li class="${cls}" data-item-id="${escapeHtml(itemId)}" data-type="${type}">
              ${it.needs_human ? '<span class="msg-needs-human-dot" title="Needs human response"></span>' : ''}
              <span class="msg-preview">${escapeHtml(preview)}</span>
              <span class="msg-meta"> — ${escapeHtml(meta)}</span>
              <span class="msg-date">${fmt(it.date)}</span>
            </li>`;
          }).join('')}
        </ul>
      </div>`;
  };
  const autoModeHtml = `
    <div class="message-center-toolbar" style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
        <input type="checkbox" id="msg-center-auto-mode" ${autoModeEnabled ? 'checked' : ''}>
        <span>Auto Mode</span>
        ${autoModeEnabled ? '<span class="auto-mode-indicator" style="width:8px;height:8px;border-radius:50%;background:var(--teal);"></span>' : ''}
      </label>
    </div>`;
  bodyEl.innerHTML = autoModeHtml + section('Reminders', reminders, 'reminder') + section('Incoming Emails', incomingEmails, 'incoming_email') + section('Sent Emails', emails, 'email') + section('Call Notes', calls, 'call_note') + section('OpenEMR Messages', openemr, 'openemr_message');
  bodyEl.style.overflowY = 'auto';
  bodyEl.style.maxHeight = '400px';
  footerEl.innerHTML = '<button class="btn" id="msg-center-new-message">New Message</button> <button class="btn btn-outline" id="msg-center-refresh">Refresh</button>';
  footerEl.querySelector('#msg-center-new-message')?.addEventListener('click', () => {
    closeActionPIP();
    loadChatCustomers(200).then(() => {
      openActionPIP('email', null, {});
    });
  });
  bodyEl.querySelector('#msg-center-auto-mode')?.addEventListener('change', (e) => {
    autoModeEnabled = e.target.checked;
    toggleAutoMode();
  });
  footerEl.querySelector('#msg-center-refresh')?.addEventListener('click', () => {
    openMessageCenterPIP();
  });
  bodyEl.querySelectorAll('.msg-item-clickable').forEach((li) => {
    li.addEventListener('click', () => {
      const type = li.dataset.type;
      const itemId = li.dataset.itemId;
      const item = messageCenterItems.find((i) => (i.item_id || `${i.type}-${i.id}`) === itemId || i.item_id === itemId);
      if (item) showMessageDetail(bodyEl, footerEl, item);
    });
  });
}

function showMessageDetail(bodyEl, footerEl, item) {
  messageCenterView = 'detail';
  if (item.needs_human && item.item_id) {
    apiFetch(`${API}/notifications/clear-needs-human`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_type: item.type, item_id: item.item_id }),
    }).catch(() => {});
    item.needs_human = false;
    const idx = messageCenterItems.findIndex((i) => (i.item_id || `${i.type}-${i.id}`) === item.item_id && i.type === item.type);
    if (idx >= 0) messageCenterItems[idx].needs_human = false;
  }
  const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
  const pip = document.getElementById('action-pip');
  const titleEl = document.getElementById('action-pip-title');
  if (pip && titleEl) titleEl.textContent = item.type === 'email' ? 'Sent Email' : item.type === 'incoming_email' ? 'Incoming Email' : item.type === 'call_note' ? 'Call Note' : item.type === 'reminder' ? 'Reminder' : 'OpenEMR Message';
  let html = '';
  if (item.type === 'reminder') {
    const bodyText = parseMessageBody(item.body || item.subject || '');
    const alertInfo = item.repeat_count > 1 ? ` (alert ${item.alert_count || 1} of ${item.repeat_count})` : '';
    html = `
      <div class="message-detail-view">
        <div class="msg-detail-row"><label>Reminder</label><span>${escapeHtml(item.subject || item.body || '—')}</span></div>
        <div class="msg-detail-row"><label>Scheduled for</label><span>${fmt(item.date)}${alertInfo}</span></div>
        ${item.creator_name ? `<div class="msg-detail-row"><label>From</label><span>${escapeHtml(item.creator_name)}</span></div>` : ''}
        ${item.customer_name ? `<div class="msg-detail-row"><label>Customer</label><span>${escapeHtml(item.customer_name)}</span></div>` : ''}
        <div class="msg-detail-body"><pre>${escapeHtml(bodyText)}</pre></div>
      </div>`;
  } else if (item.type === 'email') {
    const bodyText = parseMessageBody(item.body || '');
    html = `
      <div class="message-detail-view">
        <div class="msg-detail-row"><label>From</label><span>Kloudy</span></div>
        <div class="msg-detail-row"><label>To</label><span>${escapeHtml(item.recipient_email || item.customer_name || '—')}</span></div>
        <div class="msg-detail-row"><label>Subject</label><span>${escapeHtml(item.subject || '(No subject)')}</span></div>
        <div class="msg-detail-row"><label>Date</label><span>${fmt(item.date)}</span></div>
        <div class="msg-detail-body"><pre>${escapeHtml(bodyText)}</pre></div>
      </div>`;
  } else if (item.type === 'incoming_email') {
    const bodyText = parseMessageBody(item.body || '');
    html = `
      <div class="message-detail-view">
        <div class="msg-detail-row"><label>From</label><span>${escapeHtml(item.from || '—')}</span></div>
        <div class="msg-detail-row"><label>To</label><span>${escapeHtml(item.to || '—')}</span></div>
        <div class="msg-detail-row"><label>Subject</label><span>${escapeHtml(item.subject || '(No subject)')}</span></div>
        <div class="msg-detail-row"><label>Date</label><span>${fmt(item.date)}</span></div>
        <div class="msg-detail-body"><pre>${escapeHtml(bodyText)}</pre></div>
      </div>`;
  } else if (item.type === 'call_note') {
    const notes = stripHtml(item.notes || '');
    const reason = item.call_reason || '—';
    const disp = item.disposition || '—';
    html = `
      <div class="message-detail-view">
        <div class="msg-detail-row"><label>Customer</label><span>${escapeHtml(item.customer_name || '—')}</span></div>
        <div class="msg-detail-row"><label>Date</label><span>${fmt(item.date)}</span></div>
        <div class="msg-detail-row"><label>Reason</label><span>${escapeHtml(reason)}</span></div>
        <div class="msg-detail-row"><label>Disposition</label><span>${escapeHtml(disp)}</span></div>
        <div class="msg-detail-body"><pre>${escapeHtml(notes || '(No notes)')}</pre></div>
      </div>`;
  } else {
    const bodyText = parseMessageBody(item.body || item.title || '');
    html = `
      <div class="message-detail-view">
        <div class="msg-detail-row"><label>From</label><span>${escapeHtml(item.from || '—')}</span></div>
        <div class="msg-detail-row"><label>To</label><span>${escapeHtml(item.to || '—')}</span></div>
        <div class="msg-detail-row"><label>Subject</label><span>${escapeHtml(item.title || '(No subject)')}</span></div>
        <div class="msg-detail-row"><label>Date</label><span>${fmt(item.date)}</span></div>
        <div class="msg-detail-body"><pre>${escapeHtml(bodyText)}</pre></div>
      </div>`;
  }
  bodyEl.innerHTML = html;
  bodyEl.style.overflowY = 'auto';
  bodyEl.style.maxHeight = '400px';
  let footerBtns = '<button class="btn btn-outline" id="msg-center-back">← Back</button>';
  if (item.type === 'email' && (item.recipient_email || item.customer_id)) {
    footerBtns += ' <button class="btn" id="msg-center-reply" data-reply-type="email">Reply</button>';
  } else if (item.type === 'incoming_email' && item.from) {
    footerBtns += ' <button class="btn" id="msg-center-reply" data-reply-type="incoming_email">Reply</button>';
  } else if (item.type === 'openemr_message' && item.pid) {
    footerBtns += ' <button class="btn" id="msg-center-reply" data-reply-type="openemr">Reply</button>';
  } else if (item.type === 'reminder') {
    footerBtns += ' <button class="btn" id="msg-center-reminder-dismiss">Dismiss</button>';
  }
  if (item.type === 'openemr_message' || item.type === 'email' || item.type === 'incoming_email' || item.type === 'call_note') {
    footerBtns += ' <button class="btn btn-outline" id="msg-center-ai-reply">AI Reply</button>';
  }
  footerBtns += ' <button class="btn" id="msg-center-new-message">New Message</button>';
  footerBtns += ' <button class="btn btn-outline" id="msg-center-refresh">Refresh</button>';
  footerEl.innerHTML = footerBtns;
  footerEl.querySelector('#msg-center-new-message')?.addEventListener('click', () => {
    closeActionPIP();
    loadChatCustomers(200).then(() => {
      openActionPIP('email', null, {});
    });
  });
  footerEl.querySelector('#msg-center-back')?.addEventListener('click', () => {
    const emails = messageCenterItems.filter((i) => i.type === 'email');
    const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
    const calls = messageCenterItems.filter((i) => i.type === 'call_note');
    const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
    const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
    renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
    const t = document.getElementById('action-pip-title');
    if (t) t.textContent = 'Message Center';
  });
  footerEl.querySelector('#msg-center-reply')?.addEventListener('click', () => {
    const replyType = footerEl.querySelector('#msg-center-reply')?.dataset?.replyType;
    if (replyType === 'openemr') {
      const reTitle = (item.title || '').trim().toLowerCase().startsWith('re:') ? item.title : `Re: ${item.title || 'Message from Kloudy'}`;
      const quotedBody = item.body ? `\n\n--- Original message ---\n${stripHtml(item.body)}` : '';
      closeActionPIP();
      loadChatCustomers(200).then(() => {
        openActionPIP('dm', null, {
          to_pid: String(item.pid),
          title: reTitle,
          body: quotedBody,
        });
      });
      return;
    }
    if (replyType === 'incoming_email') {
      const reSubject = (item.subject || '').trim().toLowerCase().startsWith('re:') ? item.subject : `Re: ${item.subject || 'Message from Kloudy'}`;
      const quotedBody = item.body ? `\n\n--- Original message ---\n${stripHtml(item.body)}` : '';
      const cust = item.customer_id ? chatCustomersCache?.find((c) => c.id === item.customer_id) : null;
      const custForEmail = cust || { id: null, email: item.from, full_name: item.from };
      closeActionPIP();
      loadChatCustomers(200).then(() => {
        openActionPIP('email', custForEmail, {
          recipient_email: item.from,
          subject: reSubject,
          body: quotedBody,
          replyTo: item.customer_name || item.from,
        });
      });
      return;
    }
    const customer = item.customer_id ? chatCustomersCache.find((c) => c.id === item.customer_id) : null;
    const cust = customer || (item.recipient_email ? {
      id: item.customer_id || null,
      email: item.recipient_email,
      full_name: item.customer_name || item.recipient_email,
    } : null);
    const reSubject = (item.subject || '').trim().toLowerCase().startsWith('re:') ? item.subject : `Re: ${item.subject || 'Message from Kloudy'}`;
    const quotedBody = item.body ? `\n\n--- Original message ---\n${stripHtml(item.body)}` : '';
    closeActionPIP();
    loadChatCustomers(200).then(() => {
      openActionPIP('email', cust, {
        recipient_email: item.recipient_email,
        subject: reSubject,
        body: quotedBody,
        replyTo: item.customer_name || item.recipient_email,
      });
    });
  });
  footerEl.querySelector('#msg-center-ai-reply')?.addEventListener('click', async () => {
    const btn = footerEl.querySelector('#msg-center-ai-reply');
    btn.disabled = true;
    btn.textContent = 'Processing...';
    try {
      const r = await apiFetch(`${API}/notifications/auto-respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: item.type, item_id: item.item_id }),
      });
      const result = await parseJsonResponse(r);
      if (result.needs_human) {
        const idx = messageCenterItems.findIndex((x) => x.item_id === item.item_id && x.type === item.type);
        if (idx >= 0) messageCenterItems[idx].needs_human = true;
        bodyEl.insertAdjacentHTML('beforeend', `<p class="msg-needs-human-notice" style="margin-top:0.5rem;color:var(--accent);font-weight:500;">Needs human response.</p>`);
      } else if (result.sent) {
        bodyEl.insertAdjacentHTML('beforeend', `<p class="text-muted" style="margin-top:0.5rem;">AI reply sent.</p>`);
        refreshNotificationCount();
      } else if (result.response) {
        bodyEl.insertAdjacentHTML('beforeend', `<p class="text-muted" style="margin-top:0.5rem;">Draft: ${escapeHtml(result.response.slice(0, 200))}${result.response.length > 200 ? '...' : ''}</p>`);
      }
    } catch (e) {
      alert(e.message || 'AI Reply failed');
    }
    btn.disabled = false;
    btn.textContent = 'AI Reply';
  });
  footerEl.querySelector('#msg-center-refresh')?.addEventListener('click', () => openMessageCenterPIP());
  footerEl.querySelector('#msg-center-reminder-dismiss')?.addEventListener('click', async () => {
    if (item.type !== 'reminder' || !item.id) return;
    try {
      await apiFetch(`${API}/reminders/${item.id}/seen`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await apiFetch(`${API}/notifications/seen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'reminder', item_id: item.item_id }),
      });
      refreshNotificationCount();
      const emails = messageCenterItems.filter((i) => i.type === 'email');
      const incomingEmails = messageCenterItems.filter((i) => i.type === 'incoming_email');
      const calls = messageCenterItems.filter((i) => i.type === 'call_note');
      const openemr = messageCenterItems.filter((i) => i.type === 'openemr_message');
      const reminders = messageCenterItems.filter((i) => i.type === 'reminder');
      const idx = messageCenterItems.findIndex((x) => x.id === item.id && x.type === 'reminder');
      if (idx >= 0) messageCenterItems[idx].seen = true;
      renderMessageCenterList(bodyEl, footerEl, emails, incomingEmails, calls, openemr, reminders);
      const t = document.getElementById('action-pip-title');
      if (t) t.textContent = 'Message Center';
      messageCenterView = 'list';
    } catch (_) {}
  });
}

document.getElementById('btn-notifications')?.addEventListener('click', openMessageCenterPIP);

function getMentionContext(text, cursorPos) {
  const before = text.slice(0, cursorPos);
  const atMatch = before.match(/@([^\s@]*)$/);
  if (!atMatch) return null;
  return { query: atMatch[1].toLowerCase(), startPos: cursorPos - atMatch[0].length };
}

function filterCustomersByQuery(query) {
  const list = chatCustomersCache.length ? chatCustomersCache : [];
  if (!query) return list.slice(0, 8);
  const q = query.toLowerCase();
  return list
    .filter((c) => (c.full_name || '').toLowerCase().includes(q))
    .slice(0, 8);
}

function showMentionDropdown(matches) {
  const dropdown = document.getElementById('chat-mention-dropdown');
  if (!dropdown) return;
  if (!matches.length) {
    dropdown.style.display = 'none';
    return;
  }
  mentionState.matches = matches;
  mentionState.selectedIndex = 0;
  dropdown.innerHTML = `
    <div class="chat-mention-header">Mention a customer</div>
    ${matches.map((c, i) => `
      <div class="chat-mention-item ${i === 0 ? 'selected' : ''}" data-id="${c.id}" data-name="${escapeHtml(c.full_name || '')}">
        <span class="chat-mention-name">${escapeHtml(c.full_name || `Customer ${c.id}`)}</span>
        ${c.phone ? `<span class="chat-mention-meta">${escapeHtml(c.phone)}</span>` : ''}
      </div>
    `).join('')}
  `;
  dropdown.style.display = 'block';
  dropdown.querySelectorAll('.chat-mention-item').forEach((el, i) => {
    el.addEventListener('click', () => selectMention(i));
  });
}

function hideMentionDropdown() {
  const dropdown = document.getElementById('chat-mention-dropdown');
  if (dropdown) dropdown.style.display = 'none';
  mentionState.open = false;
}

function selectMention(index) {
  const c = mentionState.matches[index];
  if (!c || !chatInput) return;
  const before = chatInput.value.slice(0, mentionState.startPos);
  const after = chatInput.value.slice(chatInput.selectionStart);
  const name = c.full_name || `Customer ${c.id}`;
  chatInput.value = before + '@' + name + ' ' + after;
  chatInput.focus();
  chatInput.selectionStart = chatInput.selectionEnd = before.length + name.length + 2;
  document.getElementById('chat-customer-context').value = String(c.id);
  hideMentionDropdown();
  resizeChatInput();
}

function updateMentionSelection(direction) {
  if (!mentionState.matches.length) return;
  const items = document.querySelectorAll('.chat-mention-item');
  items.forEach((el, i) => el.classList.toggle('selected', i === mentionState.selectedIndex));
  items[mentionState.selectedIndex]?.scrollIntoView({ block: 'nearest' });
}

chatInput?.addEventListener('input', () => {
  const hashCtx = getHashContext(chatInput.value, chatInput.selectionStart);
  if (hashCtx) {
    hideMentionDropdown();
    hashState.query = hashCtx.query;
    hashState.startPos = hashCtx.startPos;
    const matches = filterActionsByQuery(hashCtx.query);
    showHashDropdown(matches);
    return;
  }
  hideHashDropdown();
  const ctx = getMentionContext(chatInput.value, chatInput.selectionStart);
  if (!ctx) {
    hideMentionDropdown();
    return;
  }
  mentionState.open = true;
  mentionState.query = ctx.query;
  mentionState.startPos = ctx.startPos;
  let matches = filterCustomersByQuery(ctx.query);
  if (!chatCustomersCache.length) {
    loadChatCustomers().then(() => {
      matches = filterCustomersByQuery(ctx.query);
      showMentionDropdown(matches);
    });
  } else {
    showMentionDropdown(matches);
  }
});

chatInput?.addEventListener('keydown', (e) => {
if (hashState.open && hashState.matches?.length) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopImmediatePropagation();
      hashState.selectedIndex = (hashState.selectedIndex + 1) % hashState.matches.length;
      document.querySelectorAll('.chat-hash-item').forEach((el, i) => el.classList.toggle('selected', i === hashState.selectedIndex));
      document.querySelectorAll('.chat-hash-item')[hashState.selectedIndex]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopImmediatePropagation();
      hashState.selectedIndex = (hashState.selectedIndex - 1 + hashState.matches.length) % hashState.matches.length;
      document.querySelectorAll('.chat-hash-item').forEach((el, i) => el.classList.toggle('selected', i === hashState.selectedIndex));
      document.querySelectorAll('.chat-hash-item')[hashState.selectedIndex]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      e.stopImmediatePropagation();
      selectHashItem(hashState.selectedIndex, hashState.activeInput);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      hideHashDropdown();
      return;
    }
  }
  if (!mentionState.open || !mentionState.matches.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    e.stopImmediatePropagation();
    mentionState.selectedIndex = (mentionState.selectedIndex + 1) % mentionState.matches.length;
    updateMentionSelection(1);
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopImmediatePropagation();
    mentionState.selectedIndex = (mentionState.selectedIndex - 1 + mentionState.matches.length) % mentionState.matches.length;
    updateMentionSelection(-1);
    return;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    e.stopImmediatePropagation();
    selectMention(mentionState.selectedIndex);
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopImmediatePropagation();
    hideMentionDropdown();
  }
});

document.addEventListener('click', (e) => {
const mentionDropdown = document.getElementById('chat-mention-dropdown');
  const hashDropdown = document.getElementById('chat-hash-dropdown');
  const expandHashDropdown = document.getElementById('expand-modal-hash-dropdown');
  const inner = document.querySelector('.chat-input-inner');
  const expandChat = document.querySelector('.expand-modal-chat');
  if (mentionState.open && mentionDropdown && !mentionDropdown.contains(e.target) && !(inner && inner.contains(e.target))) {
    hideMentionDropdown();
  }
  if (hashState.open) {
    const inHash = (hashDropdown && hashDropdown.contains(e.target)) || (expandHashDropdown && expandHashDropdown.contains(e.target));
    const inInput = (inner && inner.contains(e.target)) || (expandChat && expandChat.contains(e.target));
    if (!inHash && !inInput) hideHashDropdown();
  }
});

document.getElementById('chat-upload-btn')?.addEventListener('click', () => openUploadModal());

async function openUploadModal(pastedFiles = []) {
  const modal = document.getElementById('upload-modal');
  const sel = document.getElementById('upload-modal-customer');
  const chatSel = document.getElementById('chat-customer-context');
  const drop = document.getElementById('upload-modal-drop');
  if (!modal || !sel) return;
  const res = await apiFetch(`${API}/customers?limit=100`);
  const customers = await res.json().catch(() => []);
  sel.innerHTML = '<option value="">Select a customer...</option>';
  (customers.slice ? customers : []).forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.full_name || `Customer ${c.id}`;
    sel.appendChild(opt);
  });
  const preSelected = chatSel?.value || null;
  if (preSelected) sel.value = preSelected;
  document.getElementById('upload-modal-notes').value = '';
  uploadModalSelectedFiles = pastedFiles.length ? pastedFiles : [];
  if (drop) drop.textContent = uploadModalSelectedFiles.length
    ? (uploadModalSelectedFiles.length === 1 ? uploadModalSelectedFiles[0].name : `${uploadModalSelectedFiles.length} files selected`)
    : 'Drop file here, click to select, or paste screenshot (Ctrl+V)';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  loadUploadModalDocs();
}

function closeUploadModal() {
  const modal = document.getElementById('upload-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

async function loadUploadModalDocs() {
  const customerId = document.getElementById('upload-modal-customer')?.value || null;
  const list = document.getElementById('upload-modal-doc-list');
  if (!list) return;
  list.innerHTML = '';
  if (!customerId) return;
  try {
    const res = await apiFetch(`${API}/documents/${customerId}`);
    const docs = await res.json();
    docs.forEach((d) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${escapeHtml(d.filename)}${d.notes ? ' — ' + escapeHtml(d.notes) : ''}</span>
        <a href="${API}/documents/file/${d.id}" target="_blank" class="btn btn-outline" style="padding:0.2rem 0.4rem;font-size:0.8rem;">Open</a>
      `;
      list.appendChild(li);
    });
  } catch (_) {}
}

document.getElementById('upload-modal-close')?.addEventListener('click', closeUploadModal);
document.getElementById('upload-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeUploadModal();
});
document.getElementById('upload-modal-customer')?.addEventListener('change', loadUploadModalDocs);

let uploadModalSelectedFiles = [];

const uploadDrop = document.getElementById('upload-modal-drop');
const uploadFileInput = document.getElementById('upload-modal-file');
if (uploadDrop) {
  uploadDrop.addEventListener('click', () => uploadFileInput?.click());
  uploadDrop.addEventListener('dragover', (e) => { e.preventDefault(); uploadDrop.style.borderColor = 'var(--accent)'; });
  uploadDrop.addEventListener('dragleave', () => { uploadDrop.style.borderColor = ''; });
  uploadDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDrop.style.borderColor = '';
    if (e.dataTransfer.files.length) {
      uploadModalSelectedFiles = Array.from(e.dataTransfer.files);
      uploadDrop.textContent = uploadModalSelectedFiles.length === 1
        ? uploadModalSelectedFiles[0].name
        : `${uploadModalSelectedFiles.length} files selected`;
    }
  });
}
uploadFileInput?.addEventListener('change', (e) => {
  if (e.target.files?.length) {
    uploadModalSelectedFiles = Array.from(e.target.files);
    uploadDrop.textContent = uploadModalSelectedFiles.length === 1
      ? uploadModalSelectedFiles[0].name
      : `${uploadModalSelectedFiles.length} files selected`;
  }
  e.target.value = '';
});

function addPastedFileToUploadModal(file) {
  if (!file) return;
  uploadModalSelectedFiles.push(file);
  if (uploadDrop) uploadDrop.textContent = uploadModalSelectedFiles.length === 1
    ? uploadModalSelectedFiles[0].name
    : `${uploadModalSelectedFiles.length} files selected`;
}

document.getElementById('upload-modal-drop')?.addEventListener('paste', (e) => {
  const file = getPastedImageFile(e);
  if (file) { e.preventDefault(); addPastedFileToUploadModal(file); }
});

document.getElementById('upload-modal-notes')?.addEventListener('paste', (e) => {
  const file = getPastedImageFile(e);
  if (file) { e.preventDefault(); addPastedFileToUploadModal(file); }
});

document.getElementById('upload-modal-submit')?.addEventListener('click', () => {
  if (uploadModalSelectedFiles.length) uploadDocsFromModal(uploadModalSelectedFiles);
});

async function uploadDocsFromModal(files) {
  const customerId = document.getElementById('upload-modal-customer')?.value || null;
  const notes = document.getElementById('upload-modal-notes')?.value?.trim() || null;
  const statusEl = document.getElementById('upload-modal-status');
  if (!customerId) {
    if (statusEl) { statusEl.textContent = 'Select a customer first.'; statusEl.className = 'upload-modal-status error'; }
    return;
  }
  if (statusEl) statusEl.textContent = '';
  let okCount = 0;
  for (const file of files) {
    try {
      const form = new FormData();
      form.append('file', file);
      if (notes) form.append('notes', notes);
      const res = await apiFetch(`${API}/documents/${customerId}`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      okCount++;
    } catch (err) {
      if (statusEl) { statusEl.textContent = 'Upload failed: ' + err.message; statusEl.className = 'upload-modal-status error'; }
      break;
    }
  }
  if (okCount > 0 && statusEl) {
    statusEl.textContent = okCount === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${okCount} files`;
    statusEl.className = 'upload-modal-status success';
  }
  if (statusEl) statusEl.className = 'upload-modal-status';
  document.getElementById('upload-modal-notes').value = '';
  uploadModalSelectedFiles = [];
  const drop = document.getElementById('upload-modal-drop');
  if (drop) drop.textContent = 'Drop file here, click to select, or paste screenshot (Ctrl+V)';
  loadUploadModalDocs();
  loadChatCustomers();
}

document.getElementById('chat-minimize-btn')?.addEventListener('click', () => {
  const area = document.getElementById('chat-input-area');
  const btn = document.getElementById('chat-minimize-btn');
  if (area && btn) {
    const isMinimized = area.classList.toggle('chat-input-minimized');
    btn.textContent = isMinimized ? 'Expand ↑' : '−';
    btn.title = isMinimized ? 'Expand input bar' : 'Minimize input bar';
  }
});

function initScrollToBottomButtons() {
  const chatBtn = document.getElementById('chat-scroll-to-bottom');
  const chatMsgs = document.querySelector('.chat-container .chat-messages');
  if (chatBtn && chatMsgs) {
    const updateVisibility = () => {
      const atBottom = chatMsgs.scrollTop + chatMsgs.clientHeight >= chatMsgs.scrollHeight - 20;
      chatBtn.classList.toggle('hidden', atBottom);
    };
    chatMsgs.addEventListener('scroll', updateVisibility);
    chatBtn.addEventListener('click', () => chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' }));
    updateVisibility();
  }
  const eligBtn = document.getElementById('eligibility-chat-scroll-to-bottom');
  const eligMsgs = document.querySelector('#eligibility-chat-container .chat-messages');
  if (eligBtn && eligMsgs) {
    const updateVisibility = () => {
      const atBottom = eligMsgs.scrollTop + eligMsgs.clientHeight >= eligMsgs.scrollHeight - 20;
      eligBtn.classList.toggle('hidden', atBottom);
    };
    eligMsgs.addEventListener('scroll', updateVisibility);
    eligBtn.addEventListener('click', () => eligMsgs.scrollTo({ top: eligMsgs.scrollHeight, behavior: 'smooth' }));
    updateVisibility();
  }
  const expandBtn = document.getElementById('expand-modal-scroll-to-bottom');
  const expandBody = document.getElementById('expand-modal-body');
  if (expandBtn && expandBody) {
    const updateVisibility = () => {
      const atBottom = expandBody.scrollTop + expandBody.clientHeight >= expandBody.scrollHeight - 20;
      expandBtn.classList.toggle('hidden', atBottom);
    };
    expandBody.addEventListener('scroll', updateVisibility);
    expandBtn.addEventListener('click', () => expandBody.scrollTo({ top: expandBody.scrollHeight, behavior: 'smooth' }));
    updateVisibility();
  }
}
initScrollToBottomButtons();

chatSend?.addEventListener('click', () => {
sendMessage();
});
chatInput?.addEventListener('keydown', (e) => {
if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('btn-eligibility')?.addEventListener('click', async () => {
const isStandalone = ['9900', '9990'].includes(window.location.port);
  const eligUrl = isStandalone ? `http://${window.location.hostname}:9933/` : '/eligibility/';
  try {
    const startRes = await apiFetch(`${API}/eligibility/start-app`, { method: 'POST' }).catch(() => null);
    const data = startRes?.ok ? await startRes.json().catch(() => ({})) : {};
    if (data.message === 'Eligibility app starting...') {
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (_) {}
  window.open(eligUrl, '_blank');
});

document.getElementById('btn-profiles')?.addEventListener('click', () => {
const chatContainer = document.querySelector('.chat-container');
  if (chatContainer) chatContainer.style.display = 'none';
  const profilesView = document.getElementById('profiles-view');
  if (profilesView) profilesView.style.display = 'block';
  loadProfiles();
});

document.getElementById('btn-chat')?.addEventListener('click', () => {
  const chatContainer = document.querySelector('.chat-container');
  const profilesView = document.getElementById('profiles-view');
  const profileDetail = document.getElementById('profile-detail');
  const profileList = document.getElementById('profile-list');
  if (chatContainer) chatContainer.style.display = '';
  if (profilesView) profilesView.style.display = 'none';
  if (profileDetail) profileDetail.style.display = 'none';
  if (profileList) profileList.style.display = 'block';
});

async function exportChatContextToDrive(content) {
  try {
    const res = await apiFetch(`${API}/export/chat-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Export failed');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Exported to external drive: ${escapeHtml(data.filepath || 'done')}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Export error: ${escapeHtml(e.message)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

async function addCallNoteFromText(text, customerId) {
  if (!customerId) return;
  try {
    const res = await apiFetch(`${API}/customers/${customerId}/notes/from-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const note = await res.json();
    if (!res.ok) throw new Error(note.error || 'Failed');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Call note added to profile. Open Profiles to view.</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (e) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Error: ${escapeHtml(e.message)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

async function createProfileFromText(text) {
  try {
    const res = await apiFetch(`${API}/customers/from-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const c = await res.json();
    if (!res.ok) throw new Error(c.error || 'Failed');
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Profile created for ${escapeHtml(c.full_name)}. Open Profiles to view or edit.</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    loadChatCustomers();
    return c;
  } catch (e) {
    const div = document.createElement('div');
    div.className = 'message assistant';
    div.innerHTML = `<span class="message-content">Error: ${escapeHtml(e.message)}</span>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    throw e;
  }
}

function openCreateProfileModal() {
  const modal = document.getElementById('create-profile-modal');
  const input = document.getElementById('create-profile-input');
  if (!modal || !input) return;
  const text = chatInput?.value?.trim()
    || (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'user' ? chatHistory[chatHistory.length - 1].content : '')
    || (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'assistant' ? chatHistory[chatHistory.length - 1].content : '');
  input.value = text || '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  input.focus();
}

function closeCreateProfileModal() {
  const modal = document.getElementById('create-profile-modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

document.getElementById('btn-create-profile-from-chat')?.addEventListener('click', openCreateProfileModal);
document.getElementById('create-profile-modal-close')?.addEventListener('click', closeCreateProfileModal);
document.getElementById('create-profile-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'create-profile-modal') closeCreateProfileModal();
});
document.getElementById('create-profile-submit')?.addEventListener('click', async () => {
  const input = document.getElementById('create-profile-input');
  const text = input?.value?.trim();
  if (!text) return;
  try {
    await createProfileFromText(text);
    closeCreateProfileModal();
    input.value = '';
  } catch (_) {}
});

function formatExpandContent(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const paras = withBold.split(/\n\n+/);
  const html = paras.map((p) => {
    const line = p.replace(/\n/g, ' ').trim();
    return line ? `<p>${line}</p>` : '';
  }).filter(Boolean).join('');
  return html || '<p></p>';
}

let expandModalContext = { content: null, history: [] };

function showExpandModal(content) {
  const modal = document.getElementById('expand-modal');
  const body = document.getElementById('expand-modal-body');
  const input = document.getElementById('expand-modal-input');
  if (!modal || !body) return;
  expandModalContext.content = content;
  expandModalContext.history = [{ role: 'assistant', content }];
  body.innerHTML = `<div class="expand-modal-text">${formatExpandContent(content)}</div>`;
  if (input) input.value = '';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  body.dispatchEvent(new Event('scroll'));
}

async function sendExpandModalMessage() {
  const input = document.getElementById('expand-modal-input');
  const body = document.getElementById('expand-modal-body');
  const text = input?.value?.trim();
  if (!text || !body) return;
  input.value = '';

  const customerId = document.getElementById('chat-customer-context')?.value || null;
  const historyForApi = chatHistory.slice(-15).map((m) => ({ role: m.role, content: m.content }));
  historyForApi.push(...expandModalContext.history);

  const userBlock = document.createElement('div');
  userBlock.className = 'expand-modal-q expand-modal-user';
  userBlock.innerHTML = `<strong>You:</strong> ${escapeHtml(text)}`;
  body.appendChild(userBlock);

  const thinkingBlock = document.createElement('div');
  thinkingBlock.className = 'expand-modal-q expand-modal-thinking';
  thinkingBlock.innerHTML = '<span class="expand-modal-thinking-inner"><img src="images/KloudyCareLogos.png" alt="KloudyCare" class="thinking-emoticon" onerror="this.style.display=\'none\'"><span class="thinking-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>';
  body.appendChild(thinkingBlock);
  body.scrollTop = body.scrollHeight;

  try {
    const eligibilityContext = typeof window.getLastEligibilityResult === 'function' ? window.getLastEligibilityResult() : null;
    const res = await apiFetch(`${API}/chat?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        message: text,
        history: historyForApi,
        customer_id: customerId ? parseInt(customerId, 10) : null,
        eligibility_context: eligibilityContext || undefined,
      }),
    });

    const contentType = res.headers.get('Content-Type') || '';
    const isStream = contentType.includes('text/event-stream') && res.ok;
    let fullContent = '';

    if (isStream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      thinkingBlock.remove();
      const aiBlock = document.createElement('div');
      aiBlock.className = 'expand-modal-q expand-modal-assistant';
      aiBlock.innerHTML = '<strong>Assistant:</strong><div class="expand-modal-text"></div>';
      body.appendChild(aiBlock);
      const contentDiv = aiBlock.querySelector('.expand-modal-text');

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
                contentDiv.textContent = fullContent;
                body.scrollTop = body.scrollHeight;
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
      contentDiv.innerHTML = formatExpandContent(fullContent);
    } else {
      const data = await res.json();
      thinkingBlock.remove();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      fullContent = data.content;
      const aiBlock = document.createElement('div');
      aiBlock.className = 'expand-modal-q expand-modal-assistant';
      aiBlock.innerHTML = `<strong>Assistant:</strong><div class="expand-modal-text">${formatExpandContent(fullContent)}</div>`;
      body.appendChild(aiBlock);
    }

    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: fullContent });
    expandModalContext.content = fullContent;
    expandModalContext.history.push({ role: 'user', content: text });
    expandModalContext.history.push({ role: 'assistant', content: fullContent });
    body.scrollTop = body.scrollHeight;
  } catch (e) {
    thinkingBlock.innerHTML = 'Error: ' + escapeHtml(e.message);
  }
}

function closeExpandModal() {
  const modal = document.getElementById('expand-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('expand-modal-close')?.addEventListener('click', closeExpandModal);
document.getElementById('expand-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeExpandModal();
});
document.getElementById('expand-modal-send')?.addEventListener('click', sendExpandModalMessage);
const expandModalInput = document.getElementById('expand-modal-input');
const expandModalHashDropdown = document.getElementById('expand-modal-hash-dropdown');
expandModalInput?.addEventListener('input', () => {
  const hashCtx = getHashContext(expandModalInput.value, expandModalInput.selectionStart);
  if (hashCtx) {
    hashState.query = hashCtx.query;
    hashState.startPos = hashCtx.startPos;
    const matches = filterActionsByQuery(hashCtx.query);
    showHashDropdown(matches, expandModalHashDropdown, expandModalInput);
    return;
  }
  if (expandModalHashDropdown) expandModalHashDropdown.style.display = 'none';
  hashState.open = false;
});
expandModalInput?.addEventListener('keydown', (e) => {
  if (hashState.open && hashState.matches?.length && hashState.activeInput === expandModalInput) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      hashState.selectedIndex = (hashState.selectedIndex + 1) % hashState.matches.length;
      expandModalHashDropdown?.querySelectorAll('.chat-hash-item').forEach((el, i) => el.classList.toggle('selected', i === hashState.selectedIndex));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      hashState.selectedIndex = (hashState.selectedIndex - 1 + hashState.matches.length) % hashState.matches.length;
      expandModalHashDropdown?.querySelectorAll('.chat-hash-item').forEach((el, i) => el.classList.toggle('selected', i === hashState.selectedIndex));
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectHashItem(hashState.selectedIndex, expandModalInput);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      hideHashDropdown();
      return;
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendExpandModalMessage();
  }
});
document.getElementById('expand-modal-input')?.addEventListener('paste', (e) => {
  const file = getPastedImageFile(e);
  if (!file) return;
  e.preventDefault();
  const customerId = document.getElementById('chat-customer-context')?.value || null;
  if (customerId) {
    uploadPastedScreenshotToCustomer(file, customerId, 'Screenshot from expand chat').then(() => {
      const body = document.getElementById('expand-modal-body');
      if (body) {
        const div = document.createElement('div');
        div.className = 'expand-modal-q expand-modal-user';
        div.innerHTML = '<strong>You:</strong> Screenshot uploaded to profile.';
        body.appendChild(div);
        body.scrollTop = body.scrollHeight;
      }
    }).catch(() => openUploadModal([file]));
  } else {
    openUploadModal([file]);
  }
});

document.getElementById('create-profile-input')?.addEventListener('paste', (e) => {
  const file = getPastedImageFile(e);
  if (file) { e.preventDefault(); closeCreateProfileModal(); openUploadModal([file]); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.getElementById('expand-modal')?.style.display === 'flex') closeExpandModal();
    if (document.getElementById('upload-modal')?.style.display === 'flex') closeUploadModal();
  }
});

loadChatCustomers();
loadChatHistory();
refreshNotificationCount();
document.getElementById('chat-help-btn')?.addEventListener('click', openHelpModal);
document.getElementById('help-float-btn')?.addEventListener('click', openHelpModal);
document.getElementById('chat-help-modal-close')?.addEventListener('click', closeHelpModal);
document.querySelector('.chat-help-modal-overlay')?.addEventListener('click', closeHelpModal);
setInterval(refreshNotificationCount, 30000);

(function initNotificationStream() {
  let evtSource = null;
  function connect() {
    try {
      evtSource = new EventSource(`${API}/notifications/stream`);
      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data || '{}');
          if (data.type === 'new_messages') {
            refreshNotificationCount();
            refreshMessageCenterIfOpen();
          }
        } catch (_) {}
      };
      evtSource.onerror = () => {
        evtSource?.close();
        evtSource = null;
        setTimeout(connect, 5000);
      };
    } catch (_) {}
  }
  connect();
})();


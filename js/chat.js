function showPendingAdminBannerIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('message') === 'pending_admin') {
    const banner = document.getElementById('pending-admin-banner');
    if (banner) banner.classList.remove('hidden');
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatInputArea = document.getElementById('chat-input-area');
const chatMinimize = document.getElementById('chat-minimize');
const chatExpand = document.getElementById('chat-expand');
const chatAttach = document.getElementById('chat-attach');
const chatFileInput = document.getElementById('chat-file-input');
const chatAttachments = document.getElementById('chat-attachments');

let chatHistory = [];
let pendingAttachments = [];

const SUGGESTED_PROMPTS = [
  'Update my profile',
  'Set a reminder',
  'What documents do I have?',
  'Tell me about your programs',
];

const WELCOME_MESSAGE = "I can help you update your profile, set reminders, or answer questions about our programs. Try a suggestion below or type your question.";

const assistantRoleHtml = '<span class="message-header"><img src="/img/logo.png" alt="" class="message-avatar" onerror="this.style.display=\'none\'"><span class="message-role">Assistant</span></span>';

function autoResizeTextarea() {
  if (!chatInput) return;
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 200) + 'px';
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetchWithCreds(`${API}/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

function renderAttachments() {
  if (!chatAttachments) return;
  chatAttachments.innerHTML = '';
  pendingAttachments.forEach((doc, i) => {
    const tag = document.createElement('span');
    tag.className = 'chat-attachment-tag';
    tag.innerHTML = `
      <span>${escapeHtml(doc.filename)}</span>
      <button type="button" data-index="${i}" title="Remove">×</button>
    `;
    tag.querySelector('button').addEventListener('click', () => {
      pendingAttachments.splice(i, 1);
      renderAttachments();
    });
    chatAttachments.appendChild(tag);
  });
}

function toggleChatMinimize() {
  if (!chatInputArea) return;
  chatInputArea.classList.toggle('minimized');
  if (chatInputArea.classList.contains('minimized')) {
    if (chatMinimize) {
      chatMinimize.textContent = '+';
      chatMinimize.title = 'Expand';
    }
  } else {
    if (chatMinimize) {
      chatMinimize.textContent = '−';
      chatMinimize.title = 'Minimize';
    }
    if (chatInput) chatInput.focus();
  }
}

function renderSuggestedPrompts() {
  const container = document.getElementById('chat-suggested-prompts');
  if (!container) return;
  container.innerHTML = '';
  SUGGESTED_PROMPTS.forEach((prompt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-prompt-chip';
    btn.textContent = prompt;
    btn.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
        autoResizeTextarea();
      }
    });
    container.appendChild(btn);
  });
}

async function loadChatHistory() {
  if (!chatMessages) return;
  try {
    const res = await fetchWithCreds(`${API}/chat/history?limit=50`);
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load history');
    chatHistory = Array.isArray(data) ? data : [];
    renderMessages(chatHistory);
    if (chatHistory.length === 0) {
      const welcomeDiv = document.createElement('div');
      welcomeDiv.className = 'message assistant welcome';
      welcomeDiv.innerHTML = `${assistantRoleHtml}<span class="message-content">${escapeHtml(WELCOME_MESSAGE)}</span>`;
      chatMessages.innerHTML = '';
      chatMessages.appendChild(welcomeDiv);
    }
  } catch (e) {
    console.error('Load history:', e);
    chatHistory = [];
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'message assistant welcome';
    welcomeDiv.innerHTML = `${assistantRoleHtml}<span class="message-content">${escapeHtml(WELCOME_MESSAGE)}</span>`;
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeDiv);
  }
}

function renderMessages(messages) {
  if (!chatMessages) return;
  chatMessages.innerHTML = '';
  messages.forEach((m) => {
    const div = document.createElement('div');
    div.className = `message ${m.role}`;
    div.innerHTML = m.role === 'user'
      ? `<span class="message-role">You</span><span class="message-content">${escapeHtml(m.content)}</span>`
      : `${assistantRoleHtml}<span class="message-content">${escapeHtml(m.content)}</span>`;
    chatMessages.appendChild(div);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  if (!chatInput || !chatSend) return;
  const text = chatInput.value.trim();
  if (!text && pendingAttachments.length === 0) return;
  const attachmentNote = pendingAttachments.length > 0
    ? ' [Attached: ' + pendingAttachments.map((d) => d.filename).join(', ') + ']'
    : '';
  const messageText = (text || 'Attached documents') + attachmentNote;
  chatInput.value = '';
  pendingAttachments = [];
  renderAttachments();
  autoResizeTextarea();
  chatSend.disabled = true;
  chatSend.classList.add('loading');

  const welcomeEl = chatMessages.querySelector('.message.welcome');
  if (welcomeEl) welcomeEl.remove();
  if (chatMessages.querySelector('p') && !chatMessages.querySelector('.message')) {
    chatMessages.innerHTML = '';
  }

  const userDiv = document.createElement('div');
  userDiv.className = 'message user';
  userDiv.innerHTML = `<span class="message-content">${escapeHtml(messageText)}</span>`;
  chatMessages.appendChild(userDiv);

  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message assistant thinking';
  thinkingDiv.innerHTML = `${assistantRoleHtml}<span class="message-content thinking-dots"><span></span><span></span><span></span></span>`;
  chatMessages.appendChild(thinkingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  const historyForApi = (Array.isArray(chatHistory) ? chatHistory : []).slice(-20).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const res = await fetchWithCreds(`${API}/chat?stream=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({
        message: messageText,
        history: historyForApi,
      }),
    });
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }

    const contentType = res.headers.get('Content-Type') || '';
    const isStream = contentType.includes('text/event-stream') && res.ok;
    let fullContent = '';

    if (isStream) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      thinkingDiv.classList.remove('thinking');
      thinkingDiv.innerHTML = `${assistantRoleHtml}<span class="message-content"></span>`;
      const contentSpan = thinkingDiv.querySelector('.message-content');

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
                contentSpan.textContent = fullContent;
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
      contentSpan.textContent = fullContent;
    } else {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      fullContent = data.content;
      thinkingDiv.classList.remove('thinking');
      thinkingDiv.innerHTML = `${assistantRoleHtml}<span class="message-content">${escapeHtml(fullContent)}</span>`;
    }

    chatHistory.push({ role: 'user', content: messageText });
    chatHistory.push({ role: 'assistant', content: fullContent });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (err) {
    thinkingDiv.classList.remove('thinking');
    thinkingDiv.innerHTML = `<span class="message-header"><img src="/img/logo.png" alt="" class="message-avatar" onerror="this.style.display='none'"><span class="message-role">Error</span></span><span class="message-content" style="color: var(--error);">${escapeHtml(err.message)}</span>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } finally {
    chatSend.disabled = false;
    chatSend.classList.remove('loading');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  showPendingAdminBannerIfNeeded();
  renderSuggestedPrompts();
  if (chatMessages) loadChatHistory();

  if (chatAttach && chatFileInput) {
    chatAttach.addEventListener('click', () => chatFileInput.click());
    chatFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      for (const file of files) {
        try {
          const doc = await uploadFile(file);
          pendingAttachments.push(doc);
          renderAttachments();
        } catch (err) {
          console.error('Upload failed:', err);
          alert('Upload failed: ' + err.message);
        }
      }
    });
  }

  if (chatSend) {
    chatSend.addEventListener('click', sendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener('input', autoResizeTextarea);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
        autoResizeTextarea();
      }
    });
    chatInput.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              const doc = await uploadFile(file);
              pendingAttachments.push(doc);
              renderAttachments();
            } catch (err) {
              console.error('Paste upload failed:', err);
              alert('Failed to add screenshot: ' + err.message);
            }
          }
          break;
        }
      }
    });
  }
  if (chatMinimize) {
    chatMinimize.addEventListener('click', toggleChatMinimize);
  }
  if (chatExpand && chatInputArea) {
    chatExpand.addEventListener('click', () => {
      chatInputArea.classList.remove('minimized');
      if (chatMinimize) {
        chatMinimize.textContent = '−';
        chatMinimize.title = 'Minimize';
      }
      if (chatInput) chatInput.focus();
    });
  }

  const scrollBtn = document.getElementById('chat-scroll-to-bottom');
  if (scrollBtn && chatMessages) {
    const updateVisibility = () => {
      const atBottom = chatMessages.scrollTop + chatMessages.clientHeight >= chatMessages.scrollHeight - 20;
      scrollBtn.classList.toggle('hidden', atBottom);
    };
    chatMessages.addEventListener('scroll', updateVisibility);
    scrollBtn.addEventListener('click', () => chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' }));
    updateVisibility();
  }
});

function openHelpModal() {
  const modal = document.getElementById('chat-help-modal');
  if (modal) modal.style.display = 'flex';
}
function closeHelpModal() {
  const modal = document.getElementById('chat-help-modal');
  if (modal) modal.style.display = 'none';
}
document.getElementById('help-float-btn')?.addEventListener('click', openHelpModal);
document.getElementById('chat-help-modal-close')?.addEventListener('click', closeHelpModal);
document.querySelector('.chat-help-modal-overlay')?.addEventListener('click', closeHelpModal);

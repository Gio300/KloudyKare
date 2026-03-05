(function () {
  const WELCOME_MESSAGES = [
    "Hi! I'm here to help. We're an approved vendor by the state of Nevada.",
    "We pay $15/hour. We're an advocacy service designed to help people who have family, friends, or neighbors with fee-for-service Medicaid get paid to caregive for them.",
    "Ask me about registering, making an appointment, or our programs and services.",
  ];

  let chatHistory = [];

  function addBotMessage(text) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chatbot-msg bot';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function addUserMessage(text) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chatbot-msg user';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function addThinkingMessage() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chatbot-msg bot chatbot-thinking';
    div.innerHTML = '<img src="/img/logo.png" alt="Kloudy" class="chatbot-thinking-logo" onerror="this.style.display=\'none\'"><span class="thinking-dots"><span></span><span></span><span></span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function removeThinkingMessage(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showForm() {
    const form = document.getElementById('chatbot-form');
    if (form) form.classList.add('visible');
  }

  function hideForm() {
    const form = document.getElementById('chatbot-form');
    if (form) form.classList.remove('visible');
  }

  function openPanel() {
    const panel = document.getElementById('chatbot-panel');
    const toggle = document.getElementById('chatbot-toggle');
    if (panel) panel.classList.add('open');
    if (toggle) toggle.style.display = 'none';
    const container = document.getElementById('chatbot-messages');
    if (container && container.children.length === 0) {
      WELCOME_MESSAGES.forEach((msg) => addBotMessage(msg));
    }
  }

  function closePanel() {
    const panel = document.getElementById('chatbot-panel');
    const toggle = document.getElementById('chatbot-toggle');
    if (panel) panel.classList.remove('open');
    if (toggle) toggle.style.display = 'block';
  }

  async function sendGuestMessage(text) {
    const inputEl = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    if (!inputEl || !sendBtn) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    addUserMessage(text);
    const thinkingEl = addThinkingMessage();
    sendBtn.disabled = true;

    const historyForApi = chatHistory.slice(-10).map((h) => ({ role: h.role, content: h.content }));
    chatHistory.push({ role: 'user', content: text });

    try {
      const res = await fetch('/api/chat/guest?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message: text, history: historyForApi }),
      });
      if (res.status === 401) {
        removeThinkingMessage(thinkingEl);
        addBotMessage('Something went wrong. Please try again.');
        return;
      }

      const contentType = res.headers.get('Content-Type') || '';
      const isStream = contentType.includes('text/event-stream') && res.ok;
      let fullContent = '';

      if (isStream) {
        removeThinkingMessage(thinkingEl);
        const container = document.getElementById('chatbot-messages');
        const botDiv = document.createElement('div');
        botDiv.className = 'chatbot-msg bot';
        if (container) container.appendChild(botDiv);
        container.scrollTop = container.scrollHeight;

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
                  botDiv.textContent = fullContent;
                  if (container) container.scrollTop = container.scrollHeight;
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
        botDiv.textContent = fullContent;
        if (container) container.scrollTop = container.scrollHeight;
      } else {
        const data = await res.json();
        removeThinkingMessage(thinkingEl);
        if (res.ok) {
          fullContent = data.content || 'I could not generate a response. Please try again.';
          addBotMessage(fullContent);
        } else {
          addBotMessage(data.error || 'Something went wrong. Please try again.');
        }
      }

      if (fullContent) chatHistory.push({ role: 'assistant', content: fullContent });
    } catch (err) {
      removeThinkingMessage(thinkingEl);
      addBotMessage('Something went wrong. Please try again.');
    } finally {
      sendBtn.disabled = false;
    }
  }

  function autoResizeTextarea() {
    const el = document.getElementById('chatbot-input');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  function initChatbot() {
    const widget = document.getElementById('onboarding-chatbot');
    const toggle = document.getElementById('chatbot-toggle');
    const panel = document.getElementById('chatbot-panel');
    const closeBtn = document.getElementById('chatbot-close');
    const submitBtn = document.getElementById('chatbot-submit');
    const chatInput = document.getElementById('chatbot-input');
    const chatSend = document.getElementById('chatbot-send');
    const formToggle = document.getElementById('chatbot-form-toggle');

    if (!widget || !toggle || !panel) return;

    toggle.addEventListener('click', openPanel);
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    if (formToggle) {
      formToggle.addEventListener('click', () => {
        const form = document.getElementById('chatbot-form');
        if (form) {
          form.classList.toggle('visible');
          formToggle.textContent = form.classList.contains('visible') ? 'Hide form' : 'Want us to contact you?';
        }
      });
    }

    const scrollBtn = document.getElementById('chatbot-scroll-to-bottom');
    const messagesContainer = document.getElementById('chatbot-messages');
    if (scrollBtn && messagesContainer) {
      const updateVisibility = () => {
        const atBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 20;
        scrollBtn.classList.toggle('hidden', atBottom);
      };
      messagesContainer.addEventListener('scroll', updateVisibility);
      scrollBtn.addEventListener('click', () => messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' }));
      updateVisibility();
    }

    if (chatSend && chatInput) {
      chatSend.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) sendGuestMessage(text);
      });
      chatInput.addEventListener('input', autoResizeTextarea);
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const text = chatInput.value.trim();
          if (text) sendGuestMessage(text);
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const emailEl = document.getElementById('chatbot-email');
        const nameEl = document.getElementById('chatbot-name');
        const phoneEl = document.getElementById('chatbot-phone');
        const email = (emailEl && emailEl.value || '').trim();
        if (!email) {
          if (emailEl) emailEl.focus();
          return;
        }
        submitBtn.disabled = true;
        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: (nameEl && nameEl.value || '').trim() || null,
              email,
              phone: (phoneEl && phoneEl.value || '').trim() || null,
              consent_given: window.KloudyCookies ? window.KloudyCookies.hasConsent() : false,
              source: 'chatbot',
              visitor_id: window.KloudyCookies ? window.KloudyCookies.getVisitorId() : null,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            addBotMessage(data.message || 'Thank you! We will be in touch.');
            hideForm();
            if (formToggle) formToggle.style.display = 'none';
            if (window.KloudyCookies) window.KloudyCookies.setChatbotSeen();
          } else {
            addBotMessage(data.error || 'Something went wrong. Please try again.');
          }
        } catch (err) {
          addBotMessage('Something went wrong. Please try again.');
        } finally {
          submitBtn.disabled = false;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();

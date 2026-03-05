(function() {
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

  function applyCustomization(opts, persist) {
    if (persist === undefined) persist = true;
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
    document.querySelectorAll('.ui-mode-btn').forEach(function(btn) {
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
    document.querySelectorAll('.customize-device-btn').forEach(function(btn) {
      var mode = document.body.dataset.uiMode || '';
      var effective = mode || (window.matchMedia('(min-width: 769px)').matches ? 'desktop' : 'mobile');
      var modeForBtn = effective === 'cellular' ? 'mobile' : effective;
      btn.classList.toggle('active', btn.dataset.mode === modeForBtn);
    });
    modal.style.display = 'flex';
  }

  function hideCustomizationModal() {
    applyCustomization(getCustomization(), true); // revert any preview
    const modal = document.getElementById('customize-modal');
    if (modal) modal.style.display = 'none';
  }

  function initUiSwitcher(container) {
    if (!container) return;
    var switcher = container.querySelector('.ui-mode-switcher');
    if (!switcher) return;

    switcher.querySelectorAll('.ui-mode-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var mode = btn.dataset.mode;
        var current = document.body.dataset.uiMode;
        if (current === mode) {
          applyUiMode('');
        } else {
          applyUiMode(mode);
        }
        showCustomizationModal();
      });
    });
  }

  var savedMode = localStorage.getItem(UI_MODE_KEY);
  if (savedMode === 'tablet') {
    savedMode = 'desktop';
    localStorage.setItem(UI_MODE_KEY, 'desktop');
  }
  if (savedMode && ['mobile', 'desktop'].indexOf(savedMode) !== -1) {
    document.body.dataset.uiMode = savedMode;
  }
  updateDeviceClass();
  updateUiModeButtons();
  window.addEventListener('resize', function() {
    updateDeviceClass();
    updateUiModeButtons();
  });

  var cust = getCustomization();
  applyCustomization(cust);

  document.getElementById('customize-modal-close') && document.getElementById('customize-modal-close').addEventListener('click', hideCustomizationModal);
  var overlay = document.querySelector('.customize-modal-overlay');
  if (overlay) overlay.addEventListener('click', hideCustomizationModal);

  document.getElementById('customize-apply') && document.getElementById('customize-apply').addEventListener('click', function() {
    var textScale = parseFloat((document.getElementById('customize-text-size') && document.getElementById('customize-text-size').value) || 1);
    var zoom = parseFloat((document.getElementById('customize-zoom') && document.getElementById('customize-zoom').value) || 1);
    applyCustomization({ textScale: textScale, zoom: zoom });
    hideCustomizationModal();
  });

  document.getElementById('customize-reset') && document.getElementById('customize-reset').addEventListener('click', function() {
    applyCustomization({ textScale: 1, zoom: 1 });
    var textInput = document.getElementById('customize-text-size');
    var zoomInput = document.getElementById('customize-zoom');
    var textValue = document.getElementById('customize-text-size-value');
    var zoomValue = document.getElementById('customize-zoom-value');
    if (textInput) { textInput.value = 1; if (textValue) textValue.textContent = '100%'; }
    if (zoomInput) { zoomInput.value = 1; if (zoomValue) zoomValue.textContent = '100%'; }
  });

  document.getElementById('customize-text-size') && document.getElementById('customize-text-size').addEventListener('input', function(e) {
    var v = parseFloat(e.target.value);
    var el = document.getElementById('customize-text-size-value');
    if (el) el.textContent = Math.round(v * 100) + '%';
    var z = parseFloat((document.getElementById('customize-zoom') && document.getElementById('customize-zoom').value) || 1);
    applyCustomization({ textScale: v, zoom: z }, false); // live preview
  });
  document.getElementById('customize-zoom') && document.getElementById('customize-zoom').addEventListener('input', function(e) {
    var v = parseFloat(e.target.value);
    var el = document.getElementById('customize-zoom-value');
    if (el) el.textContent = Math.round(v * 100) + '%';
    var t = parseFloat((document.getElementById('customize-text-size') && document.getElementById('customize-text-size').value) || 1);
    applyCustomization({ textScale: t, zoom: v }, false); // live preview
  });

  document.querySelectorAll('.customize-device-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mode = btn.dataset.mode;
      applyUiMode(mode);
      document.querySelectorAll('.customize-device-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.mode === mode);
      });
    });
  });

  initUiSwitcher(document.querySelector('.login-banner'));
  initUiSwitcher(document.querySelector('.chat-header'));
})();

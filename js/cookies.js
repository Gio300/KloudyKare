(function () {
  const CONSENT_COOKIE = 'kloudy_cookie_consent';
  const VISITOR_COOKIE = 'kloudy_visitor_id';
  const CHATBOT_COOKIE = 'kloudy_chatbot_seen';
  const COOKIE_DAYS = 365;

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;max-age=' + (days * 24 * 60 * 60) + ';SameSite=Lax';
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function generateVisitorId() {
    return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
  }

  function showBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) banner.classList.add('visible');
  }

  function hideBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) banner.classList.remove('visible');
  }

  function onAccept() {
    setCookie(CONSENT_COOKIE, 'accepted', COOKIE_DAYS);
    setCookie(VISITOR_COOKIE, getCookie(VISITOR_COOKIE) || generateVisitorId(), COOKIE_DAYS);
    hideBanner();
  }

  function onDecline() {
    setCookie(CONSENT_COOKIE, 'declined', COOKIE_DAYS);
    hideBanner();
  }

  window.KloudyCookies = {
    getConsent: () => getCookie(CONSENT_COOKIE),
    getVisitorId: () => getCookie(VISITOR_COOKIE),
    hasConsent: () => getCookie(CONSENT_COOKIE) === 'accepted',
    setChatbotSeen: () => setCookie(CHATBOT_COOKIE, '1', COOKIE_DAYS),
    isChatbotSeen: () => !!getCookie(CHATBOT_COOKIE),
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (getCookie(CONSENT_COOKIE)) {
      if (getCookie(CONSENT_COOKIE) === 'accepted' && !getCookie(VISITOR_COOKIE)) {
        setCookie(VISITOR_COOKIE, generateVisitorId(), COOKIE_DAYS);
      }
      return;
    }
    showBanner();
  });

  document.addEventListener('click', (e) => {
    if (e.target.id === 'cookie-accept') onAccept();
    if (e.target.id === 'cookie-decline') onDecline();
  });
})();

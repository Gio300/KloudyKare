// API base for production (GitHub Pages frontend calls api.kloudykare.com)
window.KLOUDY_API_BASE = window.KLOUDY_API_BASE || "https://api.kloudykare.com";
// Base path for GitHub Pages (e.g. /KloudyKare). Empty for production at kloudykare.com root.
window.KLOUDY_BASE_PATH = window.KLOUDY_BASE_PATH || "/KloudyKare";
const _bp = (window.KLOUDY_BASE_PATH || "").replace(/\/$/, "");
window.KLOUDY_LOGIN_URL = _bp ? _bp + "/" : "/";

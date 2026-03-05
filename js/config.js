// API base for production: set window.KLOUDY_API_BASE = "https://api.kloudykare.com";
window.KLOUDY_API_BASE = window.KLOUDY_API_BASE || "";
// Base path for GitHub Pages (e.g. /KloudyKare). Empty for production at kloudykare.com root.
window.KLOUDY_BASE_PATH = window.KLOUDY_BASE_PATH || "/KloudyKare";
const _bp = (window.KLOUDY_BASE_PATH || "").replace(/\/$/, "");
window.KLOUDY_LOGIN_URL = _bp ? _bp + "/" : "/";

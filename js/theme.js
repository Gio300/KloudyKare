(function() {
  function getTheme() {
    return localStorage.getItem('kloudy-theme') || 'light';
  }
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
    localStorage.setItem('kloudy-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
  }
  var btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', function() {
      setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    });
  }
  setTheme(getTheme());
})();

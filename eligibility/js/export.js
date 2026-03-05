document.getElementById('btn-export').addEventListener('click', (e) => {
  e.stopPropagation();
  const menu = document.getElementById('export-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', () => {
  document.getElementById('export-menu').style.display = 'none';
});

document.getElementById('export-menu').addEventListener('click', (e) => {
  e.stopPropagation();
  const item = e.target.closest('.export-menu-item');
  if (!item) return;
  const action = item.dataset.export;
  document.getElementById('export-menu').style.display = 'none';
  runExport(action);
});

async function runExport(action) {
  const msg = document.createElement('div');
  msg.className = 'export-status';
  msg.style.cssText = 'padding:0.5rem 1rem;margin:0.5rem;background:var(--bg-2);border-radius:4px;';
  msg.textContent = `Exporting ${action}...`;
  document.body.appendChild(msg);

  try {
    let res, data;
    if (action === 'openemr') {
      res = await fetch('/admin/api/export/openemr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: 'patient' }),
      });
    } else if (action === 'chat') {
      res = await fetch('/admin/api/export/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } else if (action === 'profiles') {
      res = await fetch('/admin/api/export/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } else if (action === 'backup') {
      res = await fetch('/admin/api/export/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    }
    data = await res.json();
    const summary = data.results
      ? data.results.map((r) => r.resource + (r.filepath ? ' ok' : '')).join(', ')
      : (data.filepath || data.messageCount || 'done');
    msg.textContent = data.ok ? `Exported: ${summary}` : (data.error || 'Failed');
    msg.style.background = data.ok ? 'var(--success-bg, #d4edda)' : 'var(--error-bg, #f8d7da)';
  } catch (e) {
    msg.textContent = `Error: ${e.message}`;
    msg.style.background = 'var(--error-bg, #f8d7da)';
  }
  setTimeout(() => msg.remove(), 4000);
}

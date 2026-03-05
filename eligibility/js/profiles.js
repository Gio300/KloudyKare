let currentCustomerId = null;
let profileFilter = 'all';

async function loadProfiles() {
  const q = document.getElementById('profile-search')?.value || '';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (profileFilter === 'awaiting') params.set('needs_contact', '1');
  const res = await apiFetch(`${API}/customers?${params}`);
  const customers = await res.json();
  const list = document.getElementById('profile-list');
  list.innerHTML = '';
  list.style.display = 'block';
  document.getElementById('profile-detail').style.display = 'none';

  if (customers.length === 0) {
    list.innerHTML = '<p style="color: var(--text-muted);">No customers found.</p>';
    return;
  }

  customers.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const isActive = c.is_active !== 0;
    const needsContact = (c.current_process_step == null || c.current_process_step === 0);
    const needsInitialContact = !c.user_id && (c.source === 'chatbot');
    const badge = `<span class="profile-badge ${isActive ? 'profile-badge-active' : 'profile-badge-inactive'}">${isActive ? 'Active' : 'Inactive'}</span>`;
    const needsContactIcon = needsContact ? '<span class="icon-needs-contact" title="Awaiting first call – needs contacting">📞</span>' : '';
    const needsInitialContactBadge = needsInitialContact
      ? '<span class="needs-initial-contact-badge icon-needs-contact" title="Needs initial contact – came from chatbot, hasn\'t registered yet">👋</span>'
      : '';
    card.innerHTML = `
      <h3>${needsInitialContactBadge}${needsContactIcon} ${escapeHtml(c.full_name)} ${badge}</h3>
      <div class="meta">${c.state || ''} | ${c.provider_type || ''} | ${c.phone || ''}</div>
    `;
    card.addEventListener('click', () => showProfile(c.id));
    list.appendChild(card);
  });
}

document.querySelectorAll('.profile-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    profileFilter = btn.dataset.filter || 'all';
    loadProfiles();
  });
});

function escapeHtml(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function showProfile(id) {
  currentCustomerId = id;
  const res = await apiFetch(`${API}/customers/${id}`);
  const c = await res.json();
  if (!res.ok) return;

  document.getElementById('profile-list').style.display = 'none';
  const detail = document.getElementById('profile-detail');
  detail.style.display = 'block';
  const profileType = c.profile_type === 'caregiver' ? 'caregiver' : 'client';
  const isActive = c.is_active !== 0;
  const currentStep = c.current_process_step != null ? c.current_process_step : 0;
  const syncBadge = (c.openemr_patient_uuid || c.openemr_pid)
    ? '<span class="profile-badge profile-badge-synced" title="Synced to OpenEMR">Synced</span>'
    : '<span class="profile-badge profile-badge-not-synced" title="Not synced to OpenEMR">Not synced</span>';
  detail.innerHTML = `
    <h2>${escapeHtml(c.full_name)} ${syncBadge}</h2>
    <div class="field field-row">
      <label class="field-inline"><input type="checkbox" id="edit-active" ${isActive ? 'checked' : ''}> Active</label>
      <div class="field-inline"><label>Profile Type</label><select id="edit-profile-type"><option value="client" ${profileType === 'client' ? 'selected' : ''}>Client</option><option value="caregiver" ${profileType === 'caregiver' ? 'selected' : ''}>Caregiver</option></select></div>
    </div>
    <div class="field"><label>Full Name</label><input type="text" id="edit-name" value="${escapeHtml(c.full_name)}"></div>
    <div class="field"><label>DOB</label><input type="text" id="edit-dob" value="${escapeHtml(c.dob || '')}" placeholder="YYYY-MM-DD"></div>
    <div class="field"><label>Phone</label><input type="text" id="edit-phone" value="${escapeHtml(c.phone || '')}"></div>
    <div class="field"><label>Email</label><input type="email" id="edit-email" value="${escapeHtml(c.email || '')}"></div>
    <div class="field"><label>Address</label><input type="text" id="edit-address" value="${escapeHtml(c.address || '')}"></div>
    <div class="field"><label>City</label><input type="text" id="edit-city" value="${escapeHtml(c.city || '')}"></div>
    <div class="field"><label>State</label><input type="text" id="edit-state" value="${escapeHtml(c.state || '')}" placeholder="NV / AZ"></div>
    <div class="field"><label>Zip</label><input type="text" id="edit-zip" value="${escapeHtml(c.zip || '')}"></div>
    <div class="field"><label>Provider Type</label><input type="text" id="edit-pt" value="${escapeHtml(c.provider_type || '')}" placeholder="30, 38"></div>
    <div class="field"><label>Service Types</label><input type="text" id="edit-services" value="${escapeHtml(c.service_types || '')}" placeholder="habilitation, attendant_care, respite"></div>
    <div class="field"><label>Notes</label><textarea id="edit-notes" rows="3">${escapeHtml(c.notes || '')}</textarea></div>
    <div style="display:flex;gap:0.5rem;margin-top:1rem;flex-wrap:wrap;">
      <button class="btn" id="btn-save-profile">Save</button>
      <button class="btn btn-outline" id="btn-notes">Call Notes</button>
      <button class="btn btn-outline" id="btn-messages">Messages</button>
      ${c.openemr_pid ? '<button class="btn btn-outline" id="btn-dm" title="Send Direct Message via OpenEMR">Message</button>' : ''}
      ${c.openemr_pid ? '<button class="btn btn-outline" id="btn-vc" title="Start Virtual Call">Virtual Call</button>' : ''}
      <button class="btn btn-outline" id="btn-back-profiles">Back</button>
      <button class="btn btn-danger" id="btn-delete-profile">Delete Profile</button>
    </div>
    <div class="messages-section" id="messages-section" style="display:none;margin-top:1rem;">
      <h4>Sent Messages</h4>
      <ul class="messages-list" id="messages-list"></ul>
    </div>
    <div class="documents-section">
      <h4>Documents</h4>
      <div class="upload-area" id="upload-area">Drop file or click to upload</div>
      <input type="file" id="doc-input" style="display:none" multiple>
      <ul class="doc-list" id="doc-list"></ul>
    </div>
    <div class="process-progress-section" id="process-progress-section"></div>
  `;

  detail.querySelector('#btn-save-profile').addEventListener('click', saveProfile);
  detail.querySelector('#btn-notes').addEventListener('click', () => openNotesPopup(currentCustomerId, profileType));
  detail.querySelector('#btn-messages').addEventListener('click', () => toggleMessagesSection(currentCustomerId));
  const btnDm = detail.querySelector('#btn-dm');
  if (btnDm && typeof openActionPIP === 'function') {
    btnDm.addEventListener('click', () => {
      const cust = { id: c.id, full_name: c.full_name, openemr_pid: c.openemr_pid, email: c.email, phone: c.phone };
      if (typeof loadChatCustomers === 'function') {
        loadChatCustomers(200).then(() => {
          const found = (typeof chatCustomersCache !== 'undefined' && chatCustomersCache?.find((x) => x.id === c.id)) || cust;
          openActionPIP('dm', found);
        });
      } else {
        openActionPIP('dm', cust);
      }
    });
  }
  const btnVc = detail.querySelector('#btn-vc');
  if (btnVc && typeof openActionPIP === 'function') {
    btnVc.addEventListener('click', () => {
      const cust = { id: c.id, full_name: c.full_name, openemr_pid: c.openemr_pid, email: c.email, phone: c.phone };
      if (typeof loadChatCustomers === 'function') {
        loadChatCustomers(200).then(() => {
          const found = (typeof chatCustomersCache !== 'undefined' && chatCustomersCache?.find((x) => x.id === c.id)) || cust;
          openActionPIP('virtual_call', found);
        });
      } else {
        openActionPIP('virtual_call', cust);
      }
    });
  }
  detail.querySelector('#btn-back-profiles').addEventListener('click', () => {
    detail.style.display = 'none';
    document.getElementById('profile-list').style.display = 'block';
    loadProfiles();
  });
  detail.querySelector('#btn-delete-profile').addEventListener('click', deleteProfile);
  detail.querySelector('#edit-active').addEventListener('change', (e) => {
    apiFetch(`${API}/customers/${currentCustomerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: e.target.checked ? 1 : 0 }),
    });
  });

  const uploadArea = detail.querySelector('#upload-area');
  const docInput = detail.querySelector('#doc-input');
  uploadArea.addEventListener('click', () => docInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent)'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '';
    if (e.dataTransfer.files.length) uploadDocs(e.dataTransfer.files);
  });
  docInput.addEventListener('change', () => {
    if (docInput.files.length) uploadDocs(docInput.files);
  });

  loadDocs(currentCustomerId);
  renderProcessProgress(profileType, currentStep, detail.querySelector('#process-progress-section'));
}

async function toggleMessagesSection(customerId) {
  const section = document.getElementById('messages-section');
  const list = document.getElementById('messages-list');
  if (!section || !list) return;
  if (section.style.display === 'none') {
    section.style.display = 'block';
    list.innerHTML = '<li class="messages-loading">Loading...</li>';
    try {
      const res = await apiFetch(`${API}/email/sent?customer_id=${customerId}`);
      const messages = await res.json();
      list.innerHTML = '';
      if (!messages.length) {
        list.innerHTML = '<li class="messages-empty">No sent messages for this profile.</li>';
      } else {
        messages.forEach((m) => {
          const li = document.createElement('li');
          li.className = 'message-item';
          const date = m.sent_at ? new Date(m.sent_at).toLocaleString() : '';
          li.innerHTML = `
            <div class="message-item-header"><strong>To:</strong> ${escapeHtml(m.recipient_email)} <span class="message-item-date">${escapeHtml(date)}</span></div>
            ${m.subject ? `<div class="message-item-subject"><strong>Subject:</strong> ${escapeHtml(m.subject)}</div>` : ''}
            <div class="message-item-body">${escapeHtml((m.body || '').slice(0, 200))}${(m.body || '').length > 200 ? '...' : ''}</div>
          `;
          list.appendChild(li);
        });
      }
    } catch (e) {
      list.innerHTML = '<li class="messages-error">Failed to load messages.</li>';
    }
  } else {
    section.style.display = 'none';
  }
}

async function deleteProfile() {
  if (!confirm('Permanently delete this profile and all notes/documents?')) return;
  const res = await apiFetch(`${API}/customers/${currentCustomerId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Delete failed: ' + (err.error || res.statusText));
    return;
  }
  document.getElementById('profile-detail').style.display = 'none';
  document.getElementById('profile-list').style.display = 'block';
  loadProfiles();
}

const PROCESS_STEPS_FALLBACK = {
  client: [
    { step: 1, label: 'Initial Contact', disposition: 'Initial contact made' },
    { step: 2, label: 'Application Information Complete', disposition: 'Application submitted' },
    { step: 3, label: 'Gainwell Interview Complete', disposition: 'Gainwell interview done' },
    { step: 4, label: 'Assessment Complete (Level of Care / FA-19)', disposition: 'Assessment complete' },
    { step: 5, label: 'Transferred to NV Care Solutions Inc.', disposition: 'Transferred to agency' },
  ],
  caregiver: [
    { step: 1, label: 'Fingerprint Clearance Card', disposition: 'Fingerprint clearance received' },
    { step: 2, label: 'Signed Documents (1099, W-2, consent forms)', disposition: 'Documents signed' },
    { step: 3, label: 'Training (EVV/Sandata)', disposition: 'Training completed' },
    { step: 4, label: 'Testing Complete', disposition: 'Testing passed' },
  ],
};

let processStepsConfig = null;
async function getProcessSteps() {
  if (processStepsConfig) return processStepsConfig;
  try {
    const res = await apiFetch(`${API}/process-steps`);
    if (res.ok) {
      processStepsConfig = await res.json();
      return processStepsConfig;
    }
  } catch (_) {}
  return PROCESS_STEPS_FALLBACK;
}

function renderProcessProgress(profileType, currentStep, container) {
  if (!container) return;
  container.innerHTML = '<h4>Process Progress</h4><div class="process-timeline-loading">Loading...</div>';
  getProcessSteps().then((cfg) => {
    const steps = (profileType === 'caregiver' ? (cfg.caregiver || PROCESS_STEPS_FALLBACK.caregiver) : (cfg.client || PROCESS_STEPS_FALLBACK.client)) || [];
    if (!steps.length) {
      container.innerHTML = '<h4>Process Progress</h4><p class="text-muted">No steps defined.</p>';
      return;
    }
    container.innerHTML = `
      <h4>Process Progress</h4>
      <div class="process-timeline">
        ${steps.map((s, i) => {
          const stepNum = s.step;
          const maxStepNum = steps[steps.length - 1].step;
          const isCompleted = currentStep >= stepNum;
          const nextStep = currentStep >= maxStepNum ? maxStepNum : currentStep + 1;
          const isCurrent = stepNum === nextStep;
          const state = isCompleted ? 'completed' : (isCurrent ? 'current' : 'future');
          return `
            <div class="process-step ${state}">
              <div class="process-node-row">
                <div class="process-node"></div>
                ${i < steps.length - 1 ? '<div class="process-line"></div>' : ''}
              </div>
              <div class="process-label">
                <strong>${escapeHtml(s.label)}</strong>
                <span class="process-desc">${escapeHtml(s.disposition || '')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  });
}

async function saveProfile() {
  const payload = {
    full_name: document.getElementById('edit-name').value.trim(),
    dob: document.getElementById('edit-dob').value.trim() || null,
    phone: document.getElementById('edit-phone').value.trim() || null,
    email: document.getElementById('edit-email').value.trim() || null,
    address: document.getElementById('edit-address').value.trim() || null,
    city: document.getElementById('edit-city').value.trim() || null,
    state: document.getElementById('edit-state').value.trim() || null,
    zip: document.getElementById('edit-zip').value.trim() || null,
    provider_type: document.getElementById('edit-pt').value.trim() || null,
    service_types: document.getElementById('edit-services').value.trim() || null,
    notes: document.getElementById('edit-notes').value.trim() || null,
    profile_type: document.getElementById('edit-profile-type').value,
    is_active: document.getElementById('edit-active').checked ? 1 : 0,
  };
  const res = await apiFetch(`${API}/customers/${currentCustomerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert('Save failed: ' + (err.error || res.statusText));
    return;
  }
  showProfile(currentCustomerId);
}

async function loadDocs(customerId) {
  const res = await apiFetch(`${API}/documents/${customerId}`);
  const docs = await res.json();
  const ul = document.getElementById('doc-list');
  ul.innerHTML = '';
  docs.forEach((d) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${escapeHtml(d.filename)}</span>
      <a href="${API}/documents/file/${d.id}" target="_blank" class="btn btn-outline" style="padding:0.25rem 0.5rem;font-size:0.8rem;">Open</a>
    `;
    ul.appendChild(li);
  });
}

async function uploadDocs(files) {
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    await apiFetch(`${API}/documents/${currentCustomerId}`, {
      method: 'POST',
      body: form,
    });
  }
  loadDocs(currentCustomerId);
}

document.getElementById('btn-new-profile')?.addEventListener('click', () => {
  const name = prompt('Full name for new customer:');
  if (!name) return;
  apiFetch(`${API}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: name }),
  })
    .then((r) => r.json())
    .then((c) => {
      loadProfiles();
      showProfile(c.id);
    });
});

document.getElementById('btn-sync-openemr')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-sync-openemr');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  try {
    const r = await apiFetch(`${API}/openemr/sync-profiles`, { method: 'POST' });
    const data = await r.json();
    if (r.ok) {
      const msg = data.failed > 0
        ? `Synced ${data.synced} profile(s). ${data.failed} failed.${data.hint ? ' ' + data.hint : ''}`
        : `Synced ${data.synced} profile(s) to OpenEMR.`;
      alert(msg);
      loadProfiles();
    } else {
      alert(data.error || 'Sync failed');
    }
  } catch (e) {
    alert(e.message || 'Sync failed');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sync to OpenEMR';
  }
});

document.getElementById('profile-search')?.addEventListener('input', debounce(loadProfiles, 300));

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

let notesCustomerId = null;

let notesProfileType = 'client';

let editingNoteId = null;

async function openNotesPopup(customerId, profileType) {
  notesCustomerId = customerId;
  editingNoteId = null;
  if (!profileType) {
    try {
      const r = await apiFetch(`${API}/customers/${customerId}`);
      const c = await r.json();
      profileType = c.profile_type === 'caregiver' ? 'caregiver' : 'client';
    } catch (_) {}
  }
  notesProfileType = profileType || 'client';
  document.getElementById('notes-modal').style.display = 'flex';
  document.getElementById('note-call-reason').value = '';
  document.getElementById('note-body').value = '';
  document.getElementById('ai-suggestions').innerHTML = '';
  populateNotesStepDropdowns(notesProfileType);
  document.getElementById('note-process-step').value = '';
  document.getElementById('note-disposition').value = '';
  const addBtn = document.getElementById('btn-add-note');
  if (addBtn) addBtn.textContent = 'Add Note';
  loadNotesList();
}

async function populateNotesStepDropdowns(profileType) {
  const cfg = await getProcessSteps();
  const steps = profileType === 'caregiver' ? cfg.caregiver : cfg.client;
  const stepSel = document.getElementById('note-process-step');
  const dispSel = document.getElementById('note-disposition');
  stepSel.innerHTML = '<option value="">— Select step —</option>';
  dispSel.innerHTML = '<option value="">— Select —</option>';
  steps.forEach((s) => {
    stepSel.appendChild(new Option(s.label, s.step));
    dispSel.appendChild(new Option(s.disposition, s.step));
  });
  dispSel.onchange = () => { const v = dispSel.value; if (v) stepSel.value = v; };
  stepSel.onchange = () => { const v = stepSel.value; if (v) dispSel.value = v; };
}

function closeNotesPopup() {
  document.getElementById('notes-modal').style.display = 'none';
}

function startEditNote(n) {
  editingNoteId = n.id;
  document.getElementById('note-call-reason').value = n.call_reason || '';
  document.getElementById('note-body').value = n.notes || '';
  const stepSel = document.getElementById('note-process-step');
  const dispSel = document.getElementById('note-disposition');
  if (n.process_step != null) {
    const stepVal = String(n.process_step);
    if (stepSel) stepSel.value = stepVal;
    if (dispSel) dispSel.value = stepVal;
  } else {
    if (stepSel) stepSel.value = '';
    if (dispSel) dispSel.value = '';
  }
  document.getElementById('btn-add-note').textContent = 'Update';
}

async function deleteNote(noteId) {
  if (!confirm('Delete this note?')) return;
  const res = await apiFetch(`${API}/customers/${notesCustomerId}/notes/${noteId}`, { method: 'DELETE' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Delete failed');
    return;
  }
  if (editingNoteId === noteId) {
    editingNoteId = null;
    document.getElementById('note-call-reason').value = '';
    document.getElementById('note-body').value = '';
    document.getElementById('note-process-step').value = '';
    document.getElementById('note-disposition').value = '';
    document.getElementById('btn-add-note').textContent = 'Add Note';
  }
  loadNotesList();
  const detail = document.getElementById('profile-detail');
  if (detail && detail.style.display !== 'none') {
    const r = await apiFetch(`${API}/customers/${notesCustomerId}`);
    const c = await r.json();
    if (c.current_process_step != null) {
      renderProcessProgress(notesProfileType, c.current_process_step, detail.querySelector('#process-progress-section'));
    }
  }
}

async function loadNotesList() {
  const res = await apiFetch(`${API}/customers/${notesCustomerId}/notes`);
  const notes = await res.json();
  const list = document.getElementById('notes-list');
  list.innerHTML = '';
  notes.forEach((n) => {
    const div = document.createElement('div');
    div.className = 'note-entry';
    const dt = n.created_at ? new Date(n.created_at).toLocaleString() : '';
    const stepInfo = n.process_step ? `Step ${n.process_step}` : '';
    div.innerHTML = `
      <div class="note-meta">
        <span class="note-meta-text">${escapeHtml(dt)} | ${escapeHtml(n.call_reason || '-')} | ${escapeHtml(n.disposition || '-')} ${stepInfo ? '| ' + stepInfo : ''}</span>
        <span class="note-actions">
          <button type="button" class="btn btn-outline btn-sm note-edit-btn" data-note-id="${n.id}" title="Edit">Edit</button>
          <button type="button" class="btn btn-outline btn-sm note-delete-btn" data-note-id="${n.id}" title="Delete">Delete</button>
        </span>
      </div>
      <div class="note-text">${escapeHtml(n.notes || '')}</div>
    `;
    div.querySelector('.note-edit-btn')?.addEventListener('click', () => startEditNote(n));
    div.querySelector('.note-delete-btn')?.addEventListener('click', () => deleteNote(n.id));
    list.appendChild(div);
  });
}

document.getElementById('btn-close-notes')?.addEventListener('click', closeNotesPopup);
document.getElementById('btn-add-note')?.addEventListener('click', async () => {
  const callReason = document.getElementById('note-call-reason').value.trim();
  const dispSel = document.getElementById('note-disposition');
  const stepSel = document.getElementById('note-process-step');
  const processStep = stepSel.value ? parseInt(stepSel.value, 10) : null;
  const disposition = dispSel.value ? (dispSel.options[dispSel.selectedIndex]?.text || '') : '';
  const notes = document.getElementById('note-body').value.trim();
  if (editingNoteId) {
    const res = await apiFetch(`${API}/customers/${notesCustomerId}/notes/${editingNoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_reason: callReason, disposition, notes, process_step: processStep }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Update failed');
      return;
    }
    editingNoteId = null;
    document.getElementById('btn-add-note').textContent = 'Add Note';
  } else {
    await apiFetch(`${API}/customers/${notesCustomerId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_reason: callReason, disposition, notes, process_step: processStep }),
    });
  }
  document.getElementById('note-call-reason').value = '';
  stepSel.value = '';
  dispSel.value = '';
  document.getElementById('note-body').value = '';
  document.getElementById('ai-suggestions').innerHTML = '';
  loadNotesList();
  const detail = document.getElementById('profile-detail');
  if (detail.style.display !== 'none') {
    const res = await apiFetch(`${API}/customers/${notesCustomerId}`);
    const c = await res.json();
    if (c.current_process_step != null) {
      renderProcessProgress(notesProfileType, c.current_process_step, detail.querySelector('#process-progress-section'));
    }
  }
});

document.getElementById('notes-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'notes-modal') closeNotesPopup();
});

function getPastedImageFromEvent(e) {
  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
  if (!item) return null;
  const blob = item.getAsFile();
  if (!blob) return null;
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'png';
  return new File([blob], `screenshot_${Date.now()}.${ext}`, { type: blob.type });
}

document.getElementById('btn-ai-suggest')?.addEventListener('click', async () => {
  const noteBody = document.getElementById('note-body').value.trim();
  const container = document.getElementById('ai-suggestions');
  container.innerHTML = '<span class="ai-suggestions-thinking"><img src="images/KloudyCareLogos.png" alt="" class="thinking-emoticon" onerror="this.style.display=\'none\'"><span class="thinking-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></span>';
  try {
    const res = await apiFetch(`${API}/customers/${notesCustomerId}/notes/suggest-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteBody }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const text = data.suggestions || '';
    container.innerHTML = text ? `<div class="ai-suggestions-text">${escapeHtml(text)}</div>` : '<em>No suggestions.</em>';
  } catch (err) {
    container.innerHTML = `<em class="error">${escapeHtml(err.message)}</em>`;
  }
});

['note-call-reason', 'note-body'].forEach((id) => {
  document.getElementById(id)?.addEventListener('paste', async (e) => {
    const file = getPastedImageFromEvent(e);
    if (!file || !notesCustomerId) return;
    e.preventDefault();
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('notes', 'Screenshot from call notes');
      await apiFetch(`${API}/documents/${notesCustomerId}`, { method: 'POST', body: form });
      document.getElementById('note-body').value = (document.getElementById('note-body').value || '') + ' [Screenshot attached]';
    } catch (err) {
      console.error('Screenshot upload failed:', err);
    }
  });
});

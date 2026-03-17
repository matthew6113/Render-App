// SF Reels Dashboard — Client App

const API = '';
let currentSlug = null;
let currentConfig = null;
let projects = [];
let previewSection = 0; // 0=hook, 1=map, 2=breakdown
let previewImageIndex = 0;
let previewAutoplay = null;
let unsavedChanges = false;

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  setupUploadZone();
  setupLivePreview();
  setupKeyboardShortcuts();
});

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Projects ────────────────────────────────────────────────────────────────

async function loadProjects() {
  try {
    projects = await api('/api/projects');
    renderProjectList();
  } catch (e) {
    console.error('Failed to load projects:', e);
  }
}

function renderProjectList() {
  const list = document.getElementById('projectList');
  if (projects.length === 0) {
    list.innerHTML = '<li style="color:var(--text-dim); font-size:13px; padding:8px;">No projects yet</li>';
    return;
  }
  list.innerHTML = projects.map(p => `
    <li class="project-item ${p.slug === currentSlug ? 'active' : ''}"
        onclick="selectProject('${p.slug}')">
      <span>${escapeHtml(p.projectName)}</span>
      <span style="font-size:11px; color:${p.slug === currentSlug ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)'}">
        ${p.renderImages?.length || 0} img
      </span>
    </li>
  `).join('');
}

async function selectProject(slug) {
  if (unsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
  try {
    const data = await api(`/api/projects/${slug}`);
    currentSlug = slug;
    currentConfig = data;
    unsavedChanges = false;
    populateEditor(data);
    renderProjectList();
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('renderBtn').disabled = false;
    document.getElementById('saveIndicator').style.display = 'none';
    loadProjectImages(slug);
    checkRenderStatus(slug);
  } catch (e) {
    toast('Failed to load project', 'error');
  }
}

function showNewProject() {
  if (unsavedChanges && !confirm('You have unsaved changes. Discard?')) return;
  currentSlug = null;
  currentConfig = null;
  unsavedChanges = false;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('editorTitle').textContent = 'New Project';
  document.getElementById('saveIndicator').style.display = 'none';
  clearEditor();
  renderProjectList();
  document.getElementById('renderBtn').disabled = true;
}

function populateEditor(config) {
  document.getElementById('editorTitle').textContent = config.projectName;
  document.getElementById('projectName').value = config.projectName || '';
  document.getElementById('hookText').value = config.hookText || '';
  document.getElementById('script').value = config.script || '';
  document.getElementById('lat').value = config.location?.lat || '';
  document.getElementById('lng').value = config.location?.lng || '';
  document.getElementById('neighborhood').value = config.location?.neighborhood || '';
  document.getElementById('address').value = config.location?.address || '';
  document.getElementById('hookFontSize').value = config.style?.hookFontSize || 64;
  document.getElementById('captionFontSize').value = config.style?.captionFontSize || 32;
  document.getElementById('accentColor').value = config.style?.accentColor || '#FF6B35';

  // Voiceover
  const mode = config.voiceover === 'auto' ? 'auto' : 'upload';
  document.getElementById('voiceoverMode').value = mode;
  toggleVoiceoverUpload();
  if (mode === 'upload') {
    document.getElementById('audioFileName').textContent = config.voiceover || '';
  }

  // Captions
  renderCaptions(config.captions || []);

  // Preview
  previewSection = 0;
  previewImageIndex = 0;
  updatePreview();
}

function clearEditor() {
  ['projectName', 'hookText', 'script', 'lat', 'lng', 'neighborhood', 'address'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('hookFontSize').value = 64;
  document.getElementById('captionFontSize').value = 32;
  document.getElementById('accentColor').value = '#FF6B35';
  document.getElementById('voiceoverMode').value = 'auto';
  document.getElementById('captionsList').innerHTML = '';
  document.getElementById('imageGrid').innerHTML = '';
  document.getElementById('downloadArea').style.display = 'none';
  document.getElementById('renderStatus').style.display = 'none';
  toggleVoiceoverUpload();
  updatePreview();
}

function markUnsaved() {
  unsavedChanges = true;
  document.getElementById('saveIndicator').style.display = 'inline';
}

function gatherConfig() {
  return {
    projectName: document.getElementById('projectName').value.trim(),
    hookText: document.getElementById('hookText').value.trim(),
    script: document.getElementById('script').value.trim(),
    location: {
      lat: parseFloat(document.getElementById('lat').value) || 0,
      lng: parseFloat(document.getElementById('lng').value) || 0,
      neighborhood: document.getElementById('neighborhood').value.trim(),
      address: document.getElementById('address').value.trim(),
    },
    renderImages: currentConfig?.renderImages || [],
    captions: gatherCaptions(),
    voiceover: document.getElementById('voiceoverMode').value === 'auto'
      ? 'auto'
      : (currentConfig?.voiceover || 'auto'),
    style: {
      hookFontSize: parseInt(document.getElementById('hookFontSize').value) || 64,
      captionFontSize: parseInt(document.getElementById('captionFontSize').value) || 32,
      accentColor: document.getElementById('accentColor').value || '#FF6B35',
    },
  };
}

async function saveProject() {
  const config = gatherConfig();
  if (!config.projectName) {
    toast('Project name is required', 'error');
    return;
  }

  try {
    let result;
    if (currentSlug) {
      result = await api(`/api/projects/${currentSlug}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    } else {
      result = await api('/api/projects', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    }

    currentSlug = result.slug;
    currentConfig = result.config || config;
    unsavedChanges = false;
    document.getElementById('saveIndicator').style.display = 'none';
    document.getElementById('renderBtn').disabled = false;
    toast('Project saved!', 'success');
    await loadProjects();
    document.getElementById('editorTitle').textContent = config.projectName;
  } catch (e) {
    toast('Failed to save: ' + e.message, 'error');
  }
}

async function deleteProject() {
  if (!currentSlug) return;
  if (!confirm(`Delete "${currentConfig?.projectName}"? This cannot be undone.`)) return;

  try {
    await api(`/api/projects/${currentSlug}`, { method: 'DELETE' });
    currentSlug = null;
    currentConfig = null;
    unsavedChanges = false;
    document.getElementById('editor').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    toast('Project deleted', 'success');
    await loadProjects();
  } catch (e) {
    toast('Failed to delete: ' + e.message, 'error');
  }
}

// ─── Live Preview Updates ────────────────────────────────────────────────────

function setupLivePreview() {
  // Watch form fields for changes and update preview live
  const liveFields = ['hookText', 'neighborhood', 'address', 'hookFontSize', 'captionFontSize', 'accentColor'];
  liveFields.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      updatePreview();
      markUnsaved();
    });
  });

  // Other fields just mark unsaved
  ['projectName', 'script', 'lat', 'lng'].forEach(id => {
    document.getElementById(id).addEventListener('input', markUnsaved);
  });
}

// ─── Image Upload ────────────────────────────────────────────────────────────

function setupUploadZone() {
  const zone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const audioInput = document.getElementById('audioInput');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadFiles(e.target.files);
    e.target.value = '';
  });

  audioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadFiles(e.target.files);
    e.target.value = '';
  });
}

async function uploadFiles(fileList) {
  if (!currentSlug) {
    toast('Save the project first before uploading files', 'error');
    return;
  }

  const formData = new FormData();
  for (const file of fileList) {
    formData.append('files', file);
  }

  // Show upload indicator
  const zone = document.getElementById('uploadZone');
  const origHTML = zone.innerHTML;
  zone.innerHTML = '<div style="padding:20px; color:var(--accent);">Uploading...</div>';

  try {
    const result = await fetch(`${API}/api/projects/${currentSlug}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error);

    toast(`Uploaded ${data.uploaded.length} file(s)`, 'success');
    await selectProject(currentSlug);
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
    zone.innerHTML = origHTML;
  }
}

async function loadProjectImages(slug) {
  try {
    const data = await api(`/api/projects/${slug}/images`);
    renderImageGrid(data.images);
  } catch (e) {
    console.error('Failed to load images:', e);
  }
}

function renderImageGrid(images) {
  const grid = document.getElementById('imageGrid');
  if (images.length === 0) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = images.map((img, i) => `
    <div class="image-card" draggable="true" data-index="${i}"
         ondragstart="dragImage(event, ${i})" ondragover="event.preventDefault()"
         ondrop="dropImage(event, ${i})">
      <img src="${img.url}" alt="${img.filename}" loading="lazy">
      <button class="remove-btn" onclick="removeImage(${i})" title="Remove">&times;</button>
      <div class="image-label">#${i + 1}</div>
    </div>
  `).join('');
}

// Drag-to-reorder images
let dragSourceIndex = null;
function dragImage(e, index) {
  dragSourceIndex = index;
  e.dataTransfer.effectAllowed = 'move';
}
function dropImage(e, targetIndex) {
  e.preventDefault();
  if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;
  if (!currentConfig?.renderImages) return;

  const images = [...currentConfig.renderImages];
  const [moved] = images.splice(dragSourceIndex, 1);
  images.splice(targetIndex, 0, moved);
  currentConfig.renderImages = images;

  // Update captions indices
  currentConfig.captions = (currentConfig.captions || []).map(c => {
    if (c.imageIndex === dragSourceIndex) return { ...c, imageIndex: targetIndex };
    if (dragSourceIndex < targetIndex) {
      if (c.imageIndex > dragSourceIndex && c.imageIndex <= targetIndex) return { ...c, imageIndex: c.imageIndex - 1 };
    } else {
      if (c.imageIndex >= targetIndex && c.imageIndex < dragSourceIndex) return { ...c, imageIndex: c.imageIndex + 1 };
    }
    return c;
  });

  markUnsaved();
  saveProject();
  dragSourceIndex = null;
}

function removeImage(index) {
  if (!currentConfig) return;
  currentConfig.renderImages.splice(index, 1);
  currentConfig.captions = (currentConfig.captions || []).filter(c => c.imageIndex !== index);
  currentConfig.captions.forEach(c => {
    if (c.imageIndex > index) c.imageIndex--;
  });
  saveProject();
}

// ─── Captions ────────────────────────────────────────────────────────────────

function renderCaptions(captions) {
  const container = document.getElementById('captionsList');
  if (!captions.length) {
    container.innerHTML = '<div style="color:var(--text-dim); font-size:13px;">No captions yet</div>';
    return;
  }
  container.innerHTML = captions.map((c, i) => `
    <div class="caption-item">
      <select onchange="updateCaption(${i}, 'imageIndex', parseInt(this.value))">
        ${(currentConfig?.renderImages || []).map((_, idx) =>
          `<option value="${idx}" ${c.imageIndex === idx ? 'selected' : ''}>#${idx + 1}</option>`
        ).join('')}
      </select>
      <input type="text" value="${escapeHtml(c.text)}" placeholder="Caption text..."
             oninput="updateCaption(${i}, 'text', this.value); markUnsaved(); updatePreview();">
      <button onclick="removeCaption(${i})">&times;</button>
    </div>
  `).join('');
}

function addCaption() {
  if (!currentConfig) currentConfig = gatherConfig();
  if (!currentConfig.captions) currentConfig.captions = [];
  currentConfig.captions.push({ text: '', imageIndex: currentConfig.captions.length });
  renderCaptions(currentConfig.captions);
  markUnsaved();
}

function updateCaption(index, field, value) {
  if (!currentConfig?.captions?.[index]) return;
  currentConfig.captions[index][field] = value;
}

function removeCaption(index) {
  if (!currentConfig?.captions) return;
  currentConfig.captions.splice(index, 1);
  renderCaptions(currentConfig.captions);
  markUnsaved();
}

function gatherCaptions() {
  const items = document.querySelectorAll('#captionsList .caption-item');
  return Array.from(items).map(item => ({
    imageIndex: parseInt(item.querySelector('select')?.value) || 0,
    text: item.querySelector('input')?.value.trim() || '',
  })).filter(c => c.text);
}

// ─── Voiceover ───────────────────────────────────────────────────────────────

function toggleVoiceoverUpload() {
  const mode = document.getElementById('voiceoverMode').value;
  document.getElementById('voiceoverUploadArea').style.display =
    mode === 'upload' ? 'block' : 'none';
  markUnsaved();
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function updatePreview() {
  const config = currentConfig || gatherConfig();
  const container = document.getElementById('previewContainer');
  const accentColor = document.getElementById('accentColor')?.value || config.style?.accentColor || '#FF6B35';
  const hookFontSize = parseInt(document.getElementById('hookFontSize')?.value) || config.style?.hookFontSize || 64;
  const captionFontSize = parseInt(document.getElementById('captionFontSize')?.value) || config.style?.captionFontSize || 32;
  const hookText = document.getElementById('hookText')?.value || config.hookText || '';
  const neighborhood = document.getElementById('neighborhood')?.value || config.location?.neighborhood || '';
  const address = document.getElementById('address')?.value || config.location?.address || '';
  const images = config.renderImages || [];
  const captions = config.captions || [];

  // Section tabs
  const tabsHtml = `
    <div class="preview-tabs">
      <button class="preview-tab ${previewSection === 0 ? 'active' : ''}" onclick="setPreviewSection(0)">Hook</button>
      <button class="preview-tab ${previewSection === 1 ? 'active' : ''}" onclick="setPreviewSection(1)">Map</button>
      <button class="preview-tab ${previewSection === 2 ? 'active' : ''}" onclick="setPreviewSection(2)">Breakdown</button>
      <button class="preview-tab preview-play" onclick="toggleAutoplay()" title="Auto-cycle sections">
        ${previewAutoplay ? '&#9724;' : '&#9654;'}
      </button>
    </div>
  `;

  let sectionHtml = '';

  if (previewSection === 0) {
    // Hook section preview
    const bgUrl = images.length > 0 ? `/assets/${images[0]}` : '';
    sectionHtml = `
      <div class="preview-frame">
        ${bgUrl ? `<img src="${bgUrl}" class="preview-bg" onerror="this.style.display='none'">` : ''}
        <div class="preview-overlay" style="background:rgba(0,0,0,0.35);"></div>
        <div class="preview-center">
          <div class="preview-hook-box">
            <div style="font-size:${Math.max(Math.min(hookFontSize * 0.4, 32), 14)}px;
                        font-weight:800; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.7);
                        text-align:center; line-height:1.2;">
              ${escapeHtml(hookText) || '<span style="opacity:0.4">Hook text</span>'}
            </div>
          </div>
        </div>
        <div class="preview-section-label">HOOK — ~3s</div>
      </div>
    `;
  } else if (previewSection === 1) {
    // Map section preview
    sectionHtml = `
      <div class="preview-frame" style="background:linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);">
        <div class="preview-center" style="flex-direction:column; gap:8px;">
          <div style="font-size:40px;">&#128205;</div>
          <div style="font-size:18px; font-weight:700; color:#fff;">
            ${escapeHtml(neighborhood) || '<span style="opacity:0.4">Neighborhood</span>'}
          </div>
          <div style="font-size:12px; color:rgba(255,255,255,0.7);">
            ${escapeHtml(address) || '<span style="opacity:0.4">Address</span>'}
          </div>
        </div>
        <div class="preview-section-label">MAP FLY-IN — ~4s</div>
      </div>
    `;
  } else if (previewSection === 2) {
    // Breakdown section preview
    const imgIdx = Math.min(previewImageIndex, images.length - 1);
    const bgUrl = images.length > 0 ? `/assets/${images[Math.max(imgIdx, 0)]}` : '';
    const caption = captions.find(c => c.imageIndex === imgIdx);

    // Image navigation dots
    const dotsHtml = images.length > 1 ? `
      <div class="preview-dots">
        ${images.map((_, i) => `
          <button class="preview-dot ${i === imgIdx ? 'active' : ''}"
                  onclick="setPreviewImage(${i})" style="--accent:${accentColor}"></button>
        `).join('')}
      </div>
    ` : '';

    sectionHtml = `
      <div class="preview-frame">
        ${bgUrl ? `<img src="${bgUrl}" class="preview-bg" onerror="this.style.display='none'">` : ''}
        <div class="preview-overlay" style="background:linear-gradient(transparent 50%, rgba(0,0,0,0.6));"></div>
        ${caption ? `
          <div class="preview-caption" style="border-left-color:${accentColor};">
            <span style="font-size:${Math.max(captionFontSize * 0.4, 10)}px;">
              ${escapeHtml(caption.text)}
            </span>
          </div>
        ` : ''}
        ${dotsHtml}
        <div class="preview-section-label">BREAKDOWN — slide ${imgIdx + 1}/${images.length || '?'}</div>
      </div>
    `;
  }

  container.innerHTML = tabsHtml + sectionHtml;

  // Update timeline bar
  updateTimeline(config);
}

function setPreviewSection(section) {
  previewSection = section;
  previewImageIndex = 0;
  updatePreview();
}

function setPreviewImage(index) {
  previewImageIndex = index;
  updatePreview();
}

function toggleAutoplay() {
  if (previewAutoplay) {
    clearInterval(previewAutoplay);
    previewAutoplay = null;
  } else {
    previewAutoplay = setInterval(() => {
      const config = currentConfig || gatherConfig();
      const images = config.renderImages || [];

      if (previewSection === 2 && images.length > 1 && previewImageIndex < images.length - 1) {
        previewImageIndex++;
      } else {
        previewSection = (previewSection + 1) % 3;
        previewImageIndex = 0;
      }
      updatePreview();
    }, 2000);
  }
  updatePreview();
}

function updateTimeline(config) {
  const images = config.renderImages || [];
  const scriptWords = (document.getElementById('script')?.value || config.script || '').trim().split(/\s+/).filter(Boolean).length;
  const estDuration = Math.min(Math.max((scriptWords / 150) * 60 + 1, 10), 59);
  const hookPct = (3 / estDuration) * 100;
  const mapPct = (4 / estDuration) * 100;
  const breakdownPct = 100 - hookPct - mapPct;

  const el = document.getElementById('timelineBar');
  if (el) {
    el.innerHTML = `
      <div style="display:flex; height:6px; border-radius:3px; overflow:hidden; margin-top:8px;">
        <div style="width:${hookPct}%; background:${config.style?.accentColor || '#FF6B35'}" title="Hook: ~3s"></div>
        <div style="width:${mapPct}%; background:#3b82f6;" title="Map: ~4s"></div>
        <div style="width:${breakdownPct}%; background:#8b5cf6;" title="Breakdown: ~${Math.round(estDuration - 7)}s"></div>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:10px; color:var(--text-dim);">
        <span>~${Math.round(estDuration)}s total</span>
        <span>${images.length} slides</span>
      </div>
    `;
  }
}

// ─── Keyboard Shortcuts ──────────────────────────────────────────────────────

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveProject();
    }
    // Ctrl/Cmd+Enter to render
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!document.getElementById('renderBtn').disabled) startRender();
    }
  });
}

// ─── Render ──────────────────────────────────────────────────────────────────

let renderPollInterval = null;

async function startRender() {
  if (!currentSlug) return;

  // Auto-save before rendering
  if (unsavedChanges) {
    await saveProject();
  }

  const btn = document.getElementById('renderBtn');
  btn.disabled = true;
  btn.textContent = 'Rendering...';

  document.getElementById('renderStatus').style.display = 'block';
  document.getElementById('downloadArea').style.display = 'none';
  document.getElementById('statusText').textContent = 'Starting render...';
  document.getElementById('progressFill').style.width = '0%';

  try {
    const result = await api(`/api/render/${currentSlug}`, { method: 'POST' });
    toast(`Render started! (~${result.durationSec?.toFixed(0) || '?'}s video, ${result.totalFrames || '?'} frames)`, 'success');
    startPolling();
  } catch (e) {
    toast('Render failed: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '&#127916; Render Reel';
  }
}

function startPolling() {
  if (renderPollInterval) clearInterval(renderPollInterval);
  renderPollInterval = setInterval(() => checkRenderStatus(currentSlug), 2000);
}

async function checkRenderStatus(slug) {
  try {
    const status = await api(`/api/render/${slug}/status`);
    const statusEl = document.getElementById('renderStatus');
    const statusText = document.getElementById('statusText');
    const progressFill = document.getElementById('progressFill');
    const btn = document.getElementById('renderBtn');
    const downloadArea = document.getElementById('downloadArea');

    statusEl.style.display = 'block';

    if (status.status === 'rendering') {
      statusText.textContent = `Rendering... ${status.progress}%`;
      progressFill.style.width = `${status.progress}%`;
    } else if (status.status === 'complete') {
      statusText.textContent = 'Render complete!';
      statusText.style.color = 'var(--success)';
      progressFill.style.width = '100%';
      progressFill.style.background = 'var(--success)';
      btn.disabled = false;
      btn.innerHTML = '&#127916; Re-render Reel';

      downloadArea.style.display = 'block';
      const link = document.getElementById('downloadLink');
      link.href = status.outputPath;
      link.textContent = '\u2B07 Download MP4';

      if (renderPollInterval) {
        clearInterval(renderPollInterval);
        renderPollInterval = null;
      }
    } else if (status.status === 'error') {
      statusText.textContent = 'Render failed';
      statusText.style.color = 'var(--error)';
      progressFill.style.width = '0%';
      btn.disabled = false;
      btn.innerHTML = '&#127916; Retry Render';

      // Show error details
      if (status.error) {
        const errEl = document.getElementById('renderError');
        if (errEl) {
          errEl.textContent = status.error;
          errEl.style.display = 'block';
        }
      }

      if (renderPollInterval) {
        clearInterval(renderPollInterval);
        renderPollInterval = null;
      }
    } else if (status.status === 'idle') {
      statusEl.style.display = 'none';
    }
  } catch (e) {
    // ignore polling errors
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

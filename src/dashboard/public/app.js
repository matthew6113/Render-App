// SF Reels Dashboard — Client App

const API = '';
let currentSlug = null;
let currentConfig = null;
let projects = [];

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  setupUploadZone();
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
  list.innerHTML = projects.map(p => `
    <li class="project-item ${p.slug === currentSlug ? 'active' : ''}"
        onclick="selectProject('${p.slug}')">
      ${escapeHtml(p.projectName)}
    </li>
  `).join('');
}

async function selectProject(slug) {
  try {
    const data = await api(`/api/projects/${slug}`);
    currentSlug = slug;
    currentConfig = data;
    populateEditor(data);
    renderProjectList();
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('editor').style.display = 'block';
    document.getElementById('renderBtn').disabled = false;
    loadProjectImages(slug);
    checkRenderStatus(slug);
  } catch (e) {
    toast('Failed to load project', 'error');
  }
}

function showNewProject() {
  currentSlug = null;
  currentConfig = null;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('editorTitle').textContent = 'New Project';
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
  updatePreview(config);
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
  document.getElementById('previewContainer').innerHTML =
    '<div class="placeholder">Save your project to see a preview</div>';
  document.getElementById('downloadArea').style.display = 'none';
  document.getElementById('renderStatus').style.display = 'none';
  toggleVoiceoverUpload();
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
    toast('Project saved!', 'success');
    await loadProjects();
    selectProject(currentSlug);
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
    document.getElementById('editor').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    toast('Project deleted', 'success');
    await loadProjects();
  } catch (e) {
    toast('Failed to delete: ' + e.message, 'error');
  }
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

  try {
    const result = await fetch(`${API}/api/projects/${currentSlug}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error);

    toast(`Uploaded ${data.uploaded.length} file(s)`, 'success');

    // Refresh config to get updated image paths
    await selectProject(currentSlug);
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
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
  grid.innerHTML = images.map((img, i) => `
    <div class="image-card">
      <img src="${img.url}" alt="${img.filename}" loading="lazy">
      <button class="remove-btn" onclick="removeImage(${i})" title="Remove">&times;</button>
      <div class="image-label">#${i + 1} — ${img.filename}</div>
    </div>
  `).join('');
}

function removeImage(index) {
  if (!currentConfig) return;
  currentConfig.renderImages.splice(index, 1);
  // Also remove captions referencing this index
  currentConfig.captions = currentConfig.captions.filter(c => c.imageIndex !== index);
  currentConfig.captions.forEach(c => {
    if (c.imageIndex > index) c.imageIndex--;
  });
  saveProject();
}

// ─── Captions ────────────────────────────────────────────────────────────────

function renderCaptions(captions) {
  const container = document.getElementById('captionsList');
  container.innerHTML = captions.map((c, i) => `
    <div class="caption-item">
      <select onchange="updateCaption(${i}, 'imageIndex', parseInt(this.value))">
        ${(currentConfig?.renderImages || []).map((_, idx) =>
          `<option value="${idx}" ${c.imageIndex === idx ? 'selected' : ''}>#${idx + 1}</option>`
        ).join('')}
      </select>
      <input type="text" value="${escapeHtml(c.text)}" placeholder="Caption text..."
             onchange="updateCaption(${i}, 'text', this.value)">
      <button onclick="removeCaption(${i})">&times;</button>
    </div>
  `).join('');
}

function addCaption() {
  if (!currentConfig) currentConfig = gatherConfig();
  if (!currentConfig.captions) currentConfig.captions = [];
  currentConfig.captions.push({ text: '', imageIndex: 0 });
  renderCaptions(currentConfig.captions);
}

function updateCaption(index, field, value) {
  if (!currentConfig?.captions?.[index]) return;
  currentConfig.captions[index][field] = value;
}

function removeCaption(index) {
  if (!currentConfig?.captions) return;
  currentConfig.captions.splice(index, 1);
  renderCaptions(currentConfig.captions);
}

function gatherCaptions() {
  const items = document.querySelectorAll('#captionsList .caption-item');
  return Array.from(items).map(item => ({
    imageIndex: parseInt(item.querySelector('select').value) || 0,
    text: item.querySelector('input').value.trim(),
  })).filter(c => c.text);
}

// ─── Voiceover ───────────────────────────────────────────────────────────────

function toggleVoiceoverUpload() {
  const mode = document.getElementById('voiceoverMode').value;
  document.getElementById('voiceoverUploadArea').style.display =
    mode === 'upload' ? 'block' : 'none';
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function updatePreview(config) {
  const container = document.getElementById('previewContainer');

  if (!config.renderImages?.length) {
    container.innerHTML = '<div class="placeholder">Upload render images to see a preview</div>';
    return;
  }

  // Show a mini preview mockup with the first image and hook text
  const firstImage = config.renderImages[0];
  const imageUrl = `/assets/${firstImage}`;

  container.innerHTML = `
    <div style="position:relative; width:100%; height:100%;">
      <img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;"
           onerror="this.parentElement.innerHTML='<div class=placeholder>Image not found</div>'">
      <div style="position:absolute; inset:0; background:rgba(0,0,0,0.35);"></div>
      <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div style="background:rgba(0,0,0,0.55); border-radius:12px; padding:16px 24px; text-align:center;">
          <div style="font-family:Inter,sans-serif; font-size:${Math.min(config.style?.hookFontSize || 64, 28)}px;
                      font-weight:800; color:#fff; text-shadow:0 2px 8px rgba(0,0,0,0.5);">
            ${escapeHtml(config.hookText || 'Hook text')}
          </div>
        </div>
      </div>
      <div style="position:absolute; bottom:8px; left:8px; right:8px;">
        <div style="background:rgba(0,0,0,0.7); border-left:3px solid ${config.style?.accentColor || '#FF6B35'};
                    border-radius:6px; padding:6px 12px;">
          <span style="font-size:10px; color:#fff; font-family:Inter,sans-serif;">
            ${escapeHtml(config.captions?.[0]?.text || 'Caption preview')}
          </span>
        </div>
      </div>
    </div>
  `;
}

// ─── Render ──────────────────────────────────────────────────────────────────

let renderPollInterval = null;

async function startRender() {
  if (!currentSlug) return;

  const btn = document.getElementById('renderBtn');
  btn.disabled = true;
  btn.textContent = 'Rendering...';

  document.getElementById('renderStatus').style.display = 'block';
  document.getElementById('downloadArea').style.display = 'none';
  document.getElementById('statusText').textContent = 'Starting render...';
  document.getElementById('progressFill').style.width = '0%';

  try {
    await api(`/api/render/${currentSlug}`, { method: 'POST' });
    toast('Render started!', 'success');
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
      progressFill.style.width = '100%';
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
      statusText.textContent = 'Render failed: ' + (status.error || 'Unknown error');
      progressFill.style.width = '0%';
      btn.disabled = false;
      btn.innerHTML = '&#127916; Retry Render';

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

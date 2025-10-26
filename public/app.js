async function fetchFiles() {
  const res = await fetch('/files');
  return res.json();
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function rowFor(file) {
  const tr = document.createElement('tr');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'fileCheckbox';
  checkbox.dataset.name = file.name;

  const nameDisplay = file.name.split('_').slice(1).join('_') || file.name;

  tr.innerHTML = `
    <td></td>
    <td>${escapeHtml(nameDisplay)}</td>
    <td>${fmtSize(file.size)}</td>
    <td>${new Date(file.mtime).toLocaleString()}</td>
    <td></td>
  `;
  tr.querySelector('td').appendChild(checkbox);

  const actionsTd = tr.querySelectorAll('td')[4];
  const dl = document.createElement('a');
  dl.href = '/download/' + encodeURIComponent(file.name);
  dl.textContent = 'Download';
  dl.className = 'linkBtn';
  actionsTd.appendChild(dl);

  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.className = 'linkBtn danger';
  del.addEventListener('click', async () => {
    if (!confirm('Delete this file?')) return;
    const r = await fetch('/files/' + encodeURIComponent(file.name), { method: 'DELETE' });
    if (r.ok) refresh(); else alert('Delete failed');
  });
  actionsTd.appendChild(del);

  return tr;
}

function escapeHtml(s) {
  return s.replace(/[&<>"] /g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',' ':' ' })[c] || c);
}

async function refresh() {
  const tbody = document.querySelector('#filesTable tbody');
  tbody.innerHTML = '';
  const files = await fetchFiles();
  files.forEach(f => tbody.appendChild(rowFor(f)));
}

async function uploadFiles() {
  const input = document.getElementById('fileInput');
  if (!input.files.length) return alert('Select files first');

  const files = Array.from(input.files);
  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  const progressContainer = document.getElementById('uploadProgressContainer');
  const progressEl = document.getElementById('totalProgress');
  const progressText = document.getElementById('progressText');
  const progressDetails = document.getElementById('progressDetails');

  progressContainer.style.display = 'block';
  progressEl.value = 0;
  progressText.textContent = '0%';
  progressDetails.textContent = fmtSize(totalBytes) + ' total';

  const form = new FormData();
  for (const f of files) form.append('files', f);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload');

    xhr.upload.addEventListener('progress', (e) => {
      const loaded = e.loaded || 0;
      // e.total may include overhead; compare to our calculated total
      const denom = Math.max(e.total || 0, totalBytes);
      const pct = denom ? Math.min(100, Math.round((loaded / denom) * 100)) : 0;
      progressEl.value = pct;
      progressText.textContent = pct + '%';
      progressDetails.textContent = fmtSize(loaded) + ' / ' + fmtSize(totalBytes);
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          input.value = '';
          refresh();
          setTimeout(() => { progressContainer.style.display = 'none'; }, 700);
          resolve();
        } else {
          alert('Upload failed');
          progressContainer.style.display = 'none';
          reject(new Error('Upload failed: ' + xhr.status));
        }
      }
    };

    xhr.onerror = () => {
      alert('Upload failed (network)');
      progressContainer.style.display = 'none';
      reject(new Error('network'));
    };

    xhr.send(form);
  });
}

function getSelectedNames() {
  return Array.from(document.querySelectorAll('.fileCheckbox'))
    .filter(cb => cb.checked)
    .map(cb => cb.dataset.name);
}

async function deleteSelected() {
  const names = getSelectedNames();
  if (!names.length) return alert('Select files to delete');
  if (!confirm(`Delete ${names.length} file(s)?`)) return;
  const res = await fetch('/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) });
  if (res.ok) refresh(); else alert('Delete failed');
}

async function downloadSelected() {
  const names = getSelectedNames();
  if (!names.length) return alert('Select files to download');
  if (names.length === 1) {
    // direct link will trigger
    const link = document.createElement('a');
    link.href = '/download/' + encodeURIComponent(names[0]);
    link.click();
    return;
  }
  // multiple -> request zip
  const res = await fetch('/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names }) });
  if (!res.ok) return alert('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'files.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toggleSelectAll(checked) {
  document.querySelectorAll('.fileCheckbox').forEach(cb => cb.checked = checked);
}

document.getElementById('uploadBtn').addEventListener('click', uploadFiles);
document.getElementById('refreshBtn').addEventListener('click', refresh);
document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
document.getElementById('downloadBtn').addEventListener('click', downloadSelected);
document.getElementById('selectAll').addEventListener('change', e => toggleSelectAll(e.target.checked));

// initial load
refresh();

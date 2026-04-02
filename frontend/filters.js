const logoutBtn = document.getElementById('logout-btn');
const docSelect = document.getElementById('doc-select');
const scopeSelect = document.getElementById('scope-select');
const pageInput = document.getElementById('page-input');
const tagToggle = document.getElementById('tag-toggle');
const tagMenu = document.getElementById('tag-menu');
const runFilterBtn = document.getElementById('run-filter');
const exportTxtBtn = document.getElementById('export-txt');
const exportCsvBtn = document.getElementById('export-csv');
const docsInput = document.getElementById('docs-input');
const docsUploadBtn = document.getElementById('docs-upload-btn');
const docsMode = document.getElementById('docs-mode');
const sourcesInput = document.getElementById('sources-input');
const sourcesUploadBtn = document.getElementById('sources-upload-btn');
const sourcesMode = document.getElementById('sources-mode');
const statusEl = document.getElementById('status');
const resultsMeta = document.getElementById('results-meta');
const resultsEl = document.getElementById('results');

const TAGS = [
  { label: '@ selecție traducere', token: '@' },
  { label: '$ sursă manuscris', token: '$' },
  { label: '%BPH comentariu BPH', token: '%BPH' },
  { label: '%VC comentariu VC', token: '%VC' },
  { label: '[gap] lipsă imagine', token: '[gap]' },
  { label: '# întrebare', token: '#' },
  { label: '€ răspuns', token: '€' },
  { label: '& participanți ședință spiritism', token: '&' },
  { label: '© comentariu editor', token: '©' },
];

let currentUser = null;
let selectedTokens = new Set(['@', '€', '$']);
let filterRows = [];
let filterColumns = [];
let pagesCache = {};
let sourceFilesCache = [];
let uploadedDocs = [];
let standaloneDocText = '';

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.style.color = isError ? '#b91c1c' : '#4b5563';
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function apiJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Neautentificat');
  }
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

function updateTagToggleLabel() {
  if (!selectedTokens.size) {
    tagToggle.textContent = 'Alege filtre';
    return;
  }
  const labels = TAGS
    .filter(t => selectedTokens.has(t.token))
    .map(t => t.label.split(' ').slice(0, 2).join(' '));
  tagToggle.textContent = labels.join(', ');
}

function buildTagMenu() {
  tagMenu.innerHTML = '';
  TAGS.forEach(t => {
    const label = document.createElement('label');
    label.className = 'filter-menu-item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = t.token;
    cb.checked = selectedTokens.has(t.token);
    cb.addEventListener('change', () => {
      if (cb.checked) selectedTokens.add(t.token);
      else selectedTokens.delete(t.token);
      updateTagToggleLabel();
    });

    const span = document.createElement('span');
    span.textContent = t.label;

    label.appendChild(cb);
    label.appendChild(span);
    tagMenu.appendChild(label);
  });
  updateTagToggleLabel();
}

function extractTags(text) {
  const src = text || '';
  const results = [];

  const covered = new Array(src.length).fill(false);
  const markRange = (a, b) => {
    const start = Math.max(0, a);
    const end = Math.min(src.length, b);
    for (let i = start; i < end; i += 1) covered[i] = true;
  };
  const isInside = (idx) => covered[idx] === true;

  TAGS.forEach(tag => {
    const token = tag.token;
    const re = new RegExp(escapeRegex(token) + '([\\s\\S]*?)' + escapeRegex(token), 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const content = m[1] || '';
      if (content.trim()) {
        results.push({ token, content: content.trim(), start, end });
        markRange(start, end);
      }
      if (m.index === re.lastIndex) re.lastIndex += 1;
    }
  });

  const allTokens = TAGS.map(t => t.token).sort((a, b) => b.length - a.length);
  const nextTokenPos = (from) => {
    let min = -1;
    allTokens.forEach(tok => {
      const p = src.indexOf(tok, from);
      if (p !== -1 && (min === -1 || p < min)) min = p;
    });
    return min;
  };

  TAGS.forEach(tag => {
    const token = tag.token;
    let pos = src.indexOf(token);
    while (pos !== -1) {
      const prev = pos > 0 ? src[pos - 1] : '\n';
      if (!isInside(pos) && /\s|[\n\r\t\[\(]/.test(prev)) {
        const contentStart = pos + token.length;
        let end = nextTokenPos(contentStart);
        if (end === -1) end = src.length;
        const content = src.slice(contentStart, end).trim();
        if (content) {
          results.push({ token, content, start: pos, end });
          markRange(pos, end);
        }
      }
      pos = src.indexOf(token, pos + token.length);
    }
  });

  results.sort((a, b) => a.start - b.start);
  return results;
}

async function loadFiles() {
  const [pdfData, docData] = await Promise.all([
    apiJson('/files'),
    apiJson('/sources/docs'),
  ]);
  const files = pdfData.files || [];
  uploadedDocs = docData.docs || [];
  docSelect.innerHTML = '';
  files.forEach(name => {
    const opt = document.createElement('option');
    opt.value = `pdf:${name}`;
    opt.textContent = `${name} (PDF)`;
    docSelect.appendChild(opt);
  });
  uploadedDocs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = `txt:${d.doc_id}`;
    opt.textContent = `${d.doc_id} (TXT)`;
    docSelect.appendChild(opt);
  });
  if (!files.length) {
    resultsMeta.textContent = 'Nu există documente încărcate.';
  }
}

async function loadSourcesForDoc() {
  const selected = docSelect.value || '';
  if (!selected.startsWith('pdf:')) {
    sourceFilesCache = [];
    return;
  }
  const doc = selected.slice(4);
  const data = await apiJson(`/sources/${encodeURIComponent(doc)}`);
  sourceFilesCache = data.files || [];
}

async function loadProgressPagesForDoc() {
  pagesCache = {};
  standaloneDocText = '';
  if (!currentUser) return;
  const selected = docSelect.value || '';
  if (selected.startsWith('txt:')) {
    const docId = selected.slice(4);
    try {
      const d = await apiJson(`/sources/doc/${encodeURIComponent(docId)}`);
      standaloneDocText = d.text || '';
    } catch (_) {
      standaloneDocText = '';
    }
    return;
  }
  try {
    const progress = await apiJson(`/progress/${encodeURIComponent(currentUser)}/progress.json`);
    const selectedDoc = selected.startsWith('pdf:') ? selected.slice(4) : '';
    if (progress.file === selectedDoc && progress.pages && typeof progress.pages === 'object') {
      pagesCache = progress.pages;
    }
  } catch (_) {
    pagesCache = {};
  }
}

async function reloadDocContext() {
  await loadSourcesForDoc();
  await loadProgressPagesForDoc();
}

function buildRows(selected) {
  const entries = [];
  const selectedValue = docSelect.value || '';
  const isPdf = selectedValue.startsWith('pdf:');
  const selectedDoc = isPdf ? selectedValue.slice(4) : (selectedValue.startsWith('txt:') ? selectedValue.slice(4) : '-');
  const scope = scopeSelect.value;
  const pageValue = Math.max(1, parseInt(pageInput.value || '1', 10));

  const addFromText = (doc, page, text) => {
    const parts = extractTags(text || '');
    parts.forEach(p => {
      if (selected.includes(p.token)) {
        entries.push({ doc, page, token: p.token, content: p.content });
      }
    });
  };

  if (!isPdf) {
    if (scope === 'page') {
      const re = new RegExp(`---\\\\s*PAGINA\\\\s+${pageValue}\\\\s*---([\\\\s\\\\S]*?)(?=---\\\\s*PAGINA\\\\s+\\\\d+\\\\s*---|$)`, 'i');
      const m = re.exec(standaloneDocText);
      addFromText(selectedDoc, pageValue, m ? m[1] : '');
    } else {
      addFromText(selectedDoc, 'txt', standaloneDocText);
    }
  } else if (scope === 'page') {
    addFromText(selectedDoc, pageValue, pagesCache[String(pageValue)] || '');
  } else {
    Object.keys(pagesCache).forEach(p => addFromText(selectedDoc, Number(p), pagesCache[p] || ''));
  }

  if (isPdf) {
    sourceFilesCache.forEach(src => {
      addFromText(selectedDoc, `sursa:${src.name}`, src.text || '');
    });
  }

  const grouped = new Map();
  entries.forEach(e => {
    const key = `${e.doc}||${e.page}`;
    if (!grouped.has(key)) grouped.set(key, { doc: e.doc, page: e.page });
    const row = grouped.get(key);
    row[e.token] = row[e.token] ? `${row[e.token]}\n\n${e.content}` : e.content;
  });

  filterColumns = TAGS
    .filter(t => selected.includes(t.token))
    .map(t => ({ token: t.token, label: t.label }));
  filterRows = Array.from(grouped.values());
  return entries.length;
}

function renderRows(totalEntries) {
  if (!filterRows.length) {
    resultsMeta.textContent = 'Nu există rezultate pentru filtrele selectate.';
    resultsEl.innerHTML = '';
    return;
  }

  resultsMeta.textContent = `Rezultate: ${totalEntries} fragmente | ${filterRows.length} rânduri`;
  let html = '<table class="filter-table"><thead><tr><th>Document</th><th>Pagină</th>';
  html += filterColumns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('');
  html += '</tr></thead><tbody>';

  filterRows.forEach(r => {
    html += '<tr>';
    html += `<td>${escapeHtml(r.doc)}</td>`;
    html += `<td>${escapeHtml(r.page)}</td>`;
    html += filterColumns.map(c => `<td class="content-cell">${escapeHtml(r[c.token] || '')}</td>`).join('');
    html += '</tr>';
  });

  html += '</tbody></table>';
  resultsEl.innerHTML = html;
}

function download(name, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function exportTxt() {
  if (!filterRows.length) {
    alert('Nu există rezultate de exportat.');
    return;
  }
  const body = filterRows.map((r, i) => {
    const cols = filterColumns.map(c => `${c.label}:\n${r[c.token] || ''}`).join('\n\n');
    return `${i + 1}. Document: ${r.doc}\nPagină: ${r.page}\n\n${cols}\n`;
  }).join('\n--------------------\n\n');
  download('filtrare_etichete.txt', body);
}

function exportCsv() {
  if (!filterRows.length) {
    alert('Nu există rezultate de exportat.');
    return;
  }
  const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const header = ['"Document"', '"Pagina"'].concat(filterColumns.map(c => esc(c.label)));
  const lines = [header.join(',')];
  filterRows.forEach(r => {
    const row = [esc(r.doc), esc(r.page)].concat(filterColumns.map(c => esc(r[c.token] || '')));
    lines.push(row.join(','));
  });
  download('filtrare_etichete.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

async function runFilter() {
  const selected = TAGS.filter(t => selectedTokens.has(t.token)).map(t => t.token);
  if (!selected.length) {
    alert('Alege cel puțin un filtru.');
    return;
  }
  setStatus('Rulez filtrarea...');
  await reloadDocContext();
  const totalEntries = buildRows(selected);
  renderRows(totalEntries);
  setStatus('Filtrare finalizată.');
}

async function uploadSources() {
  const files = sourcesInput.files;
  const selected = docSelect.value || '';
  if (!selected.startsWith('pdf:')) {
    alert('Alege documentul mai întâi.');
    return;
  }
  const doc = selected.slice(4);
  if (!files || !files.length) return;

  const fd = new FormData();
  fd.append('file', doc);
  fd.append('mode', sourcesMode.value || 'merge');
  Array.from(files).forEach(f => fd.append('files', f));

  setStatus('Upload surse...');
  try {
    const res = await fetch('/sources/upload', { method: 'POST', body: fd });
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload eșuat');
    setStatus(`Surse încărcate: ${data.count}`);
    sourcesInput.value = '';
    await reloadDocContext();
  } catch (e) {
    setStatus(e.message || 'Upload eșuat.', true);
  }
}

async function uploadDocumentsTxt() {
  const files = docsInput.files;
  if (!files || !files.length) return;
  const fd = new FormData();
  fd.append('mode', docsMode.value || 'merge');
  Array.from(files).forEach(f => fd.append('files', f));

  setStatus('Upload documente TXT...');
  try {
    const res = await fetch('/sources/upload_docs', { method: 'POST', body: fd });
    if (res.status === 401) {
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload eșuat');
    setStatus(`Documente încărcate: ${data.count}`);
    docsInput.value = '';
    await loadFiles();
    await reloadDocContext();
  } catch (e) {
    setStatus(e.message || 'Upload eșuat.', true);
  }
}

async function boot() {
  try {
    const me = await apiJson('/me');
    currentUser = me.user;
  } catch (_) {
    window.location.href = '/';
    return;
  }

  buildTagMenu();
  await loadFiles();
  await reloadDocContext();
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  window.location.href = '/';
});

tagToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  tagMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!tagMenu.contains(e.target) && e.target !== tagToggle) {
    tagMenu.classList.add('hidden');
  }
});

docSelect.addEventListener('change', async () => {
  await reloadDocContext();
});

runFilterBtn.addEventListener('click', async () => {
  await runFilter();
});

exportTxtBtn.addEventListener('click', exportTxt);
exportCsvBtn.addEventListener('click', exportCsv);

sourcesUploadBtn.addEventListener('click', () => sourcesInput.click());
sourcesInput.addEventListener('change', async () => {
  await uploadSources();
});

docsUploadBtn.addEventListener('click', () => docsInput.click());
docsInput.addEventListener('change', async () => {
  await uploadDocumentsTxt();
});

boot();

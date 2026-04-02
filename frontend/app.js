const loginForm = document.getElementById('login-form');
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const viewerSection = document.getElementById('viewer-section');
const loginError = document.getElementById('login-error');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-input');
const sourceTxtBtn = document.getElementById('source-txt-btn');
const sourceTxtInput = document.getElementById('source-txt-input');
const bulkTxtBtn = document.getElementById('bulk-txt-btn');
const bulkTxtInput = document.getElementById('bulk-txt-input');
const fileList = document.getElementById('file-list');
const logoutBtn = document.getElementById('logout-btn');

const pdfCanvas = document.getElementById('pdf-canvas');
const viewer = document.querySelector('.viewer');
const selectionEl = document.getElementById('selection');
const ocrOutput = document.getElementById('ocr-output');
const ocrHighlight = document.getElementById('ocr-highlight');
const scanHits = document.getElementById('scan-hits');
const exportLink = document.getElementById('export-link');
const exportJsonLink = document.getElementById('export-json-link');

const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const pageInfo = document.getElementById('page-info');
const scanPageBtn = document.getElementById('scan-page');
const exportHiddenBtn = document.getElementById('export-hidden');
const exportJsonBtn = document.getElementById('export-json');
const rotLeftBtn = document.getElementById('rot-left');
const rotRightBtn = document.getElementById('rot-right');
const rotResetBtn = document.getElementById('rot-reset');
const gotoInput = document.getElementById('goto-page');
const gotoBtn = document.getElementById('goto-btn');
const fitWidthBtn = document.getElementById('fit-width');
const resetViewBtn = document.getElementById('reset-view');
const focusSelBtn = document.getElementById('focus-sel');
const splitter = document.getElementById('splitter');
const leftPane = document.querySelector('.pane.left');
const rightPane = document.querySelector('.pane.right');
const splitMain = document.getElementById('split-main');
const filterPanel = document.getElementById('filter-panel');
const viewerSectionEl = document.getElementById('viewer-section');
const textZoomIn = document.getElementById('text-zoom-in');
const textZoomOut = document.getElementById('text-zoom-out');
const findOcrBtn = document.getElementById('find-ocr');
const normTextBtn = document.getElementById('norm-text');
const cleanTextBtn = document.getElementById('clean-text');
const uploadTxtBtn = document.getElementById('upload-txt-btn');
const uploadTxtInput = document.getElementById('upload-txt-input');
const saveLocalTxtBtn = document.getElementById('save-local-txt');
const findSelBtn = document.getElementById('find-sel');
const saveSelBtn = document.getElementById('save-sel');
const saveProgressBtn = document.getElementById('save-progress');
const ocrHqRoBtn = document.getElementById('ocr-hq-ro');
const ocrHqFrBtn = document.getElementById('ocr-hq-fr');
const tagSelect = document.getElementById('tag-select');
const tagFilterToggle = document.getElementById('tag-filter-toggle');
const tagFilterMenu = document.getElementById('tag-filter-menu');
const tagFilterScope = document.getElementById('tag-filter-scope');
const tagFilterRunBtn = document.getElementById('tag-filter-run');
const tagFilterResults = document.getElementById('tag-filter-results');
const filterZoomInBtn = document.getElementById('filter-zoom-in');
const filterZoomOutBtn = document.getElementById('filter-zoom-out');
const filterSpaceIncBtn = document.getElementById('filter-space-inc');
const filterSpaceDecBtn = document.getElementById('filter-space-dec');
const filterExportTxtBtn = document.getElementById('filter-export-txt');
const filterExportCsvBtn = document.getElementById('filter-export-csv');
const filterSplitter = document.getElementById('filter-splitter');
const frCharSelect = document.getElementById('fr-char-select');
const specialCharSelect = document.getElementById('special-char-select');
const spellLangSelect = document.getElementById('spell-lang');
const spellRunBtn = document.getElementById('spell-run');
const spellSuggestionsEl = document.getElementById('spell-suggestions');
let isAuthenticated = false;

function setAuthenticatedState(authenticated) {
  isAuthenticated = !!authenticated;
  if (isAuthenticated) {
    loginSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    viewerSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    appSection.classList.remove('locked-ui');
    viewerSection.classList.remove('locked-ui');
    document.body.classList.remove('login-only');
  } else {
    loginSection.classList.remove('hidden');
    appSection.classList.add('hidden');
    viewerSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    appSection.classList.add('locked-ui');
    viewerSection.classList.add('locked-ui');
    document.body.classList.add('login-only');
  }
}

let pdfDoc = null;
let totalPages = 0;
let currentPage = 1;
let scale = 1.2;
const PDF_ZOOM_STEP = 1.1;
let currentFile = null;
let currentPageImage = null;
let sel = null; // {x,y,w,h} in canvas coords
let rotation = 0;
let textZoom = 14;
let activeHighlight = null; // { term, range: {start,end} | null }
let spellRanges = []; // absolute ranges in full text
let spellMatches = []; // [{offset,length,bad,suggestions,lang}]
const pageTexts = new Map();
const TAGS = [
  { label: '@ selecție traducere', token: '@', className: 'tag-atrad' },
  { label: '$ sursă manuscris', token: '$', className: 'tag-ms' },
  { label: '%BPH comentariu BPH', token: '%BPH', className: 'tag-bph' },
  { label: '%VC comentariu VC', token: '%VC', className: 'tag-vc' },
  { label: '[gap] lipsă imagine', token: '[gap]', className: 'tag-gap' },
  { label: '# întrebare', token: '#', className: 'tag-q' },
  { label: '€ răspuns', token: '€', className: 'tag-a' },
  { label: '& participanți ședință spiritism', token: '&', className: 'tag-part' },
  { label: '© comentariu editor', token: '©', className: 'tag-editor' },
];

const FR_CHARS = [
  'é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'ç', 'œ', 'æ',
  'É', 'È', 'Ê', 'Ë', 'À', 'Â', 'Î', 'Ï', 'Ô', 'Ù', 'Û', 'Ü', 'Ç', 'Œ', 'Æ',
];

const SPECIAL_CHARS = ['„', '”', '«', '»', '—'];
let filterZoom = 13;
let filterRows = [];
let filterColumns = [];
let filterHeight = 220;
const selectedFilterTokens = new Set();

function initTagSelect() {
  if (!tagSelect) return;
  TAGS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.token;
    opt.textContent = t.label;
    tagSelect.appendChild(opt);
  });
}

function updateFilterToggleLabel() {
  if (!tagFilterToggle) return;
  if (!selectedFilterTokens.size) {
    tagFilterToggle.textContent = 'Alege filtre';
    return;
  }
  const labels = TAGS
    .filter(t => selectedFilterTokens.has(t.token))
    .map(t => t.label.split(' ').slice(0, 2).join(' '));
  tagFilterToggle.textContent = labels.join(', ');
}

function initTagFilterMenu() {
  if (!tagFilterMenu) return;
  tagFilterMenu.innerHTML = '';
  TAGS.forEach(t => {
    const label = document.createElement('label');
    label.className = 'filter-menu-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = t.token;
    cb.checked = selectedFilterTokens.has(t.token);
    cb.addEventListener('change', () => {
      if (cb.checked) selectedFilterTokens.add(t.token);
      else selectedFilterTokens.delete(t.token);
      updateFilterToggleLabel();
    });
    const span = document.createElement('span');
    span.textContent = t.label;
    label.appendChild(cb);
    label.appendChild(span);
    tagFilterMenu.appendChild(label);
  });
  updateFilterToggleLabel();
}

function initCharSelect(selectEl, chars) {
  if (!selectEl) return;
  chars.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch;
    opt.textContent = ch;
    selectEl.appendChild(opt);
  });
}

function insertTextAtCursor(textToInsert) {
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  const current = ocrOutput.value;
  ocrOutput.value = `${current.slice(0, start)}${textToInsert}${current.slice(end)}`;
  const nextPos = start + textToInsert.length;
  ocrOutput.focus();
  ocrOutput.setSelectionRange(nextPos, nextPos);
  renderHighlight();
  saveCurrentPageText();
}

function normalizeRotation(r) {
  const v = ((r % 360) + 360) % 360;
  return v;
}

async function checkAuth() {
  try {
    const res = await fetch('/me');
    if (res.ok) {
      const me = await res.json();
      if (me.dictionary_only) {
        window.location.href = '/dictionary';
        return;
      }
      setAuthenticatedState(true);
      await refreshFiles();
      return;
    }
  } catch (_) {}
  setAuthenticatedState(false);
}

async function refreshFiles() {
  const res = await fetch('/files');
  if (!res.ok) return;
  const data = await res.json();
  fileList.innerHTML = '';
  data.files.forEach(f => {
    const li = document.createElement('li');
    li.className = 'file-item';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = f;
    a.onclick = async () => {
      saveCurrentPageText();
      currentFile = f;
      await loadPdf();
    };
    const del = document.createElement('button');
    del.className = 'file-delete';
    del.textContent = 'Șterge';
    del.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = confirm(`Ștergi fișierul "${f}"?`);
      if (!ok) return;
      const res = await fetch(`/files/${encodeURIComponent(f)}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('Ștergere eșuată.');
        return;
      }
      if (currentFile === f) {
        currentFile = null;
        pdfDoc = null;
        totalPages = 0;
        currentPage = 1;
        clearSelection();
        ocrOutput.value = '';
        renderHighlight();
        scanHits.innerHTML = '';
        pdfCanvas.width = 0;
        pdfCanvas.height = 0;
        pageInfo.textContent = 'Page 0';
      }
      await refreshFiles();
    };
    li.appendChild(a);
    li.appendChild(del);
    fileList.appendChild(li);
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const form = new FormData(loginForm);
  const res = await fetch('/login', { method: 'POST', body: form });
  if (!res.ok) {
    loginError.textContent = 'Login eșuat.';
    return;
  }
  const data = await res.json();
  if (data.redirect_to) {
    window.location.href = data.redirect_to;
    return;
  }
  setAuthenticatedState(true);
  await refreshFiles();
});

uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) return;
  const files = Array.from(fileInput.files);
  let ok = 0;
  for (const f of files) {
    const form = new FormData();
    form.append('file', f);
    const res = await fetch('/upload', { method: 'POST', body: form });
    if (res.ok) ok += 1;
  }
  fileInput.value = '';
  await refreshFiles();
  alert(`Upload finalizat: ${ok}/${files.length} fișiere.`);
});

if (bulkTxtBtn && bulkTxtInput) {
  bulkTxtBtn.addEventListener('click', () => {
    bulkTxtInput.click();
  });

  bulkTxtInput.addEventListener('change', async () => {
    if (!bulkTxtInput.files || !bulkTxtInput.files.length) return;
    if (!currentFile || !totalPages) {
      alert('Selectează mai întâi un PDF din listă.');
      bulkTxtInput.value = '';
      return;
    }

    const startPageRaw = prompt('Pagina de start pentru import (mapare în ordine):', String(currentPage || 1));
    if (startPageRaw === null) {
      bulkTxtInput.value = '';
      return;
    }
    const startPage = Math.max(1, parseInt(startPageRaw, 10) || 1);
    const mapByFilename = confirm('Mapare după numere din numele fișierelor?\nOK = Da\nCancel = În ordine de la pagina de start');
    let pageOffset = 0;
    if (mapByFilename) {
      const offsetRaw = prompt(
        'Offset pagină pentru mapare după nume.\nFormula: pagina_pdf = nume_fisier + offset\nEx: fișier 1 -> pagina 11 => offset 10',
        '0'
      );
      if (offsetRaw === null) {
        bulkTxtInput.value = '';
        return;
      }
      pageOffset = parseInt(offsetRaw, 10) || 0;
    }
    const overwrite = confirm('Suprascrie paginile existente?\nOK = Overwrite\nCancel = Merge');

    const form = new FormData();
    Array.from(bulkTxtInput.files).forEach(f => form.append('files', f));
    form.append('start_page', String(startPage));
    form.append('map_mode', mapByFilename ? 'filename' : 'order');
    form.append('page_offset', String(pageOffset));
    form.append('mode', overwrite ? 'overwrite' : 'merge');
    form.append('file', currentFile || '');

    try {
      const res = await fetch('/import/txt_bulk', { method: 'POST', body: form });
      if (!res.ok) {
        const t = await res.text();
        alert(`Bulk import eșuat: ${t}`);
        return;
      }
      const data = await res.json();
      const importedPages = data.pages || {};
      if (overwrite) {
        Array.from(pageTexts.keys()).forEach(k => {
          if (k.startsWith(`${currentFile}::`)) pageTexts.delete(k);
        });
      }
      Object.entries(importedPages).forEach(([p, txt]) => {
        const pageNum = parseInt(p, 10);
        if (!Number.isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          pageTexts.set(`${currentFile}::${pageNum}`, txt || '');
        }
      });
      loadCurrentPageText();
      const skipped = (data.skipped || []).length;
      alert(`Import finalizat.\nPagini importate: ${data.imported_count || 0}\nFișiere ignorate: ${skipped}`);
    } catch (e) {
      alert(`Bulk import eșuat: ${e}`);
    } finally {
      bulkTxtInput.value = '';
    }
  });
}

if (sourceTxtBtn && sourceTxtInput) {
  sourceTxtBtn.addEventListener('click', () => sourceTxtInput.click());
  sourceTxtInput.addEventListener('change', async () => {
    const files = Array.from(sourceTxtInput.files || []);
    if (!files.length) return;
    if (!currentFile) {
      alert('Selectează mai întâi documentul PDF din listă.');
      sourceTxtInput.value = '';
      return;
    }
    const overwrite = confirm('Suprascrii sursele TXT existente pentru acest document?\nOK = Da\nCancel = Adaugă (merge)');
    const form = new FormData();
    form.append('file', currentFile);
    form.append('mode', overwrite ? 'overwrite' : 'merge');
    files.forEach(f => form.append('files', f));
    const res = await fetch('/sources/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const t = await res.text();
      alert(`Upload surse eșuat: ${t}`);
      sourceTxtInput.value = '';
      return;
    }
    const data = await res.json();
    alert(`Surse încărcate: ${data.count || 0}`);
    sourceTxtInput.value = '';
  });
}

logoutBtn.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  setAuthenticatedState(false);
});

async function loadPdf() {
  try {
    const res = await fetch(`/pdf/meta/${encodeURIComponent(currentFile)}`);
    if (!res.ok) {
      throw new Error('meta load failed');
    }
    const data = await res.json();
    totalPages = data.pages || 0;
    pdfDoc = null;
    currentPage = 1;
    await fitWidth();
    await renderPage();
    loadCurrentPageText();
  } catch (err) {
    console.error('PDF load error', err);
    alert('Nu pot încărca PDF-ul. Verifică consola pentru detalii.');
  }
}

async function renderPage() {
  if (!currentFile || !totalPages) return;
  try {
    const img = await loadPageImage(currentPage, 1.9);
    currentPageImage = img;
    const rot = normalizeRotation(rotation);
    const off = document.createElement('canvas');
    off.width = img.width * scale;
    off.height = img.height * scale;
    const offCtx = off.getContext('2d');
    offCtx.drawImage(img, 0, 0, off.width, off.height);

    const rad = (rot * Math.PI) / 180;
    const w = off.width;
    const h = off.height;
    const newW = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    const newH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    pdfCanvas.width = Math.ceil(newW);
    pdfCanvas.height = Math.ceil(newH);
    const ctx = pdfCanvas.getContext('2d');
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    ctx.save();
    ctx.translate(pdfCanvas.width / 2, pdfCanvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(off, -w / 2, -h / 2);
    ctx.restore();
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
    clearSelection();
  } catch (err) {
    console.error('Render error', err);
    alert('Nu pot randa pagina. Verifică consola pentru detalii.');
  }
}

async function loadPageImage(page, scaleParam = 1.9) {
  const src = `/pdf/page_image/${encodeURIComponent(currentFile)}/${page}?scale=${scaleParam}`;
  const blob = await fetch(src, { cache: 'force-cache' }).then(r => {
    if (!r.ok) throw new Error('image load failed');
    return r.blob();
  });
  const img = new Image();
  const objUrl = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = objUrl;
  });
  URL.revokeObjectURL(objUrl);
  return img;
}

function clearSelection() {
  sel = null;
  selectionEl.style.width = '0px';
  selectionEl.style.height = '0px';
  selectionEl.innerHTML = '';
  scanHits.innerHTML = '';
}

function pageTextKey() {
  return `${currentFile || ''}::${currentPage}`;
}

function saveCurrentPageText() {
  if (!currentFile) return;
  const key = pageTextKey();
  const txt = ocrOutput.value || '';
  if (txt.trim()) {
    pageTexts.set(key, txt);
  } else {
    pageTexts.delete(key);
  }
}

function loadCurrentPageText() {
  if (!currentFile) return;
  const key = pageTextKey();
  ocrOutput.value = pageTexts.get(key) || '';
  activeHighlight = null;
  renderHighlight();
}

function parseTxtByPages(rawText) {
  const content = String(rawText || '');
  const re = /(?:^|\n)\s*---\s*PAGINA\s+(\d+)\s*---\s*\n/g;
  const pages = {};
  let lastIndex = 0;
  let m;
  let currentPageNum = null;

  while ((m = re.exec(content)) !== null) {
    const markerStart = m.index + (m[0].startsWith('\n') ? 1 : 0);
    if (currentPageNum !== null) {
      pages[currentPageNum] = content.slice(lastIndex, markerStart).trim();
    }
    currentPageNum = parseInt(m[1], 10);
    lastIndex = re.lastIndex;
  }

  if (currentPageNum !== null) {
    pages[currentPageNum] = content.slice(lastIndex).trim();
  }

  const hasMarkers = Object.keys(pages).length > 0;
  return { hasMarkers, pages, raw: content };
}

function stripRtfSimple(text) {
  const src = String(text || '');
  if (!src.slice(0, 200).toLowerCase().includes('{\\rtf')) return src;
  return src
    .replace(/\\'[0-9a-fA-F]{2}/g, (m) => String.fromCharCode(parseInt(m.slice(2), 16)))
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function saveTextLocal(defaultName, textContent) {
  const content = String(textContent || '');
  const fileName = (defaultName || 'document.txt').endsWith('.txt')
    ? (defaultName || 'document.txt')
    : `${defaultName || 'document'}.txt`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  return true;
}

// Selection handling
let isSelecting = false;
let startX = 0;
let startY = 0;
let dragMode = null; // 'new' | 'move' | 'resize'
let activeHandle = null;

function canvasOffset() {
  const canvasRect = pdfCanvas.getBoundingClientRect();
  const viewerRect = viewer.getBoundingClientRect();
  return {
    offsetX: canvasRect.left - viewerRect.left + viewer.scrollLeft,
    offsetY: canvasRect.top - viewerRect.top + viewer.scrollTop,
  };
}

function renderSelectionHandles() {
  if (!sel) return;
  selectionEl.innerHTML = `
    <div class="handle nw" data-h="nw"></div>
    <div class="handle ne" data-h="ne"></div>
    <div class="handle sw" data-h="sw"></div>
    <div class="handle se" data-h="se"></div>
  `;
}

pdfCanvas.addEventListener('mousedown', (e) => {
  scanHits.innerHTML = '';
  const rect = pdfCanvas.getBoundingClientRect();
  isSelecting = true;
  dragMode = 'new';
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  const { offsetX, offsetY } = canvasOffset();
  selectionEl.style.left = `${startX + offsetX}px`;
  selectionEl.style.top = `${startY + offsetY}px`;
  selectionEl.style.width = '0px';
  selectionEl.style.height = '0px';
  selectionEl.innerHTML = '';
});

pdfCanvas.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  const rect = pdfCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const { offsetX, offsetY } = canvasOffset();
  if (dragMode === 'new') {
    const w = x - startX;
    const h = y - startY;
    selectionEl.style.left = `${Math.min(x, startX) + offsetX}px`;
    selectionEl.style.top = `${Math.min(y, startY) + offsetY}px`;
    selectionEl.style.width = `${Math.abs(w)}px`;
    selectionEl.style.height = `${Math.abs(h)}px`;
  } else if (dragMode === 'move' && sel) {
    const dx = x - startX;
    const dy = y - startY;
    sel.x += dx;
    sel.y += dy;
    startX = x;
    startY = y;
    selectionEl.style.left = `${sel.x + offsetX}px`;
    selectionEl.style.top = `${sel.y + offsetY}px`;
  } else if (dragMode === 'resize' && sel) {
    let { x: sx, y: sy, w: sw, h: sh } = sel;
    if (activeHandle === 'nw') {
      sw += sx - x; sh += sy - y; sx = x; sy = y;
    } else if (activeHandle === 'ne') {
      sw = x - sx; sh += sy - y; sy = y;
    } else if (activeHandle === 'sw') {
      sw += sx - x; sx = x; sh = y - sy;
    } else if (activeHandle === 'se') {
      sw = x - sx; sh = y - sy;
    }
    sel = { x: sx, y: sy, w: Math.max(5, sw), h: Math.max(5, sh) };
    selectionEl.style.left = `${sel.x + offsetX}px`;
    selectionEl.style.top = `${sel.y + offsetY}px`;
    selectionEl.style.width = `${sel.w}px`;
    selectionEl.style.height = `${sel.h}px`;
  }
});

pdfCanvas.addEventListener('mouseup', (e) => {
  if (!isSelecting) return;
  isSelecting = false;
  if (dragMode === 'new') {
    const rect = pdfCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const left = Math.min(x, startX);
    const top = Math.min(y, startY);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);
    sel = { x: left, y: top, w: width, h: height };
  }
  dragMode = null;
  activeHandle = null;
  if (sel) {
    const { offsetX, offsetY } = canvasOffset();
    selectionEl.style.left = `${sel.x + offsetX}px`;
    selectionEl.style.top = `${sel.y + offsetY}px`;
    selectionEl.style.width = `${sel.w}px`;
    selectionEl.style.height = `${sel.h}px`;
    renderSelectionHandles();
  }
});

selectionEl.addEventListener('mousedown', (e) => {
  if (!sel) return;
  const rect = pdfCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const handle = e.target.dataset.h;
  isSelecting = true;
  startX = x;
  startY = y;
  if (handle) {
    dragMode = 'resize';
    activeHandle = handle;
  } else {
    dragMode = 'move';
  }
  e.stopPropagation();
});

window.addEventListener('mouseup', () => {
  if (isSelecting) {
    isSelecting = false;
    dragMode = null;
    activeHandle = null;
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    clearSelection();
  }
});

prevPageBtn.addEventListener('click', async () => {
  if (!totalPages || currentPage <= 1) return;
  saveCurrentPageText();
  currentPage -= 1;
  await renderPage();
  loadCurrentPageText();
});

nextPageBtn.addEventListener('click', async () => {
  if (!totalPages || currentPage >= totalPages) return;
  saveCurrentPageText();
  currentPage += 1;
  await renderPage();
  loadCurrentPageText();
});

gotoBtn.addEventListener('click', async () => {
  if (!totalPages) return;
  saveCurrentPageText();
  const val = parseInt(gotoInput.value, 10);
  if (!val || val < 1 || val > totalPages) return;
  currentPage = val;
  await renderPage();
  loadCurrentPageText();
});

zoomInBtn.addEventListener('click', async () => {
  scale *= PDF_ZOOM_STEP;
  await renderPage();
});

zoomOutBtn.addEventListener('click', async () => {
  scale /= PDF_ZOOM_STEP;
  await renderPage();
});

rotLeftBtn.addEventListener('click', async () => {
  rotation = normalizeRotation(rotation - 1);
  await renderPage();
});

rotRightBtn.addEventListener('click', async () => {
  rotation = normalizeRotation(rotation + 1);
  await renderPage();
});

rotResetBtn.addEventListener('click', async () => {
  rotation = 0;
  await renderPage();
});

// Splitter drag
let isResizing = false;
splitter.addEventListener('mousedown', () => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
});
window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const rect = splitter.parentElement.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const leftPct = Math.max(30, Math.min(70, (x / rect.width) * 100));
  leftPane.style.width = `${leftPct}%`;
  rightPane.style.width = `${100 - leftPct}%`;
});
window.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = 'default';
  }
});

// Fit width / reset / focus selection
async function fitWidth() {
  if (!currentFile || !totalPages) return;
  const img = await loadPageImage(currentPage, 1.0);
  const viewerWidth = viewer.clientWidth;
  scale = viewerWidth / img.width;
}

if (fitWidthBtn) {
  fitWidthBtn.addEventListener('click', async () => {
    await fitWidth();
    await renderPage();
  });
}

if (resetViewBtn) {
  resetViewBtn.addEventListener('click', async () => {
    scale = 1.2;
    rotation = 0;
    await renderPage();
  });
}

if (focusSelBtn) {
  focusSelBtn.addEventListener('click', async () => {
    if (!sel || !currentFile || !totalPages) return;
    // scale so selection fits viewer width
    const viewerWidth = viewer.clientWidth;
    const targetScale = (viewerWidth / sel.w) * scale;
    scale = Math.max(0.3, Math.min(6, targetScale));
    await renderPage();
    // scroll to selection
    const { offsetX, offsetY } = canvasOffset();
    viewer.scrollLeft = sel.x + offsetX - 20;
    viewer.scrollTop = sel.y + offsetY - 20;
  });
}


// Text zoom
textZoomIn.addEventListener('click', () => {
  textZoom = Math.min(72, textZoom + 2);
  setTextZoom(textZoom);
});
textZoomOut.addEventListener('click', () => {
  textZoom = Math.max(10, textZoom - 2);
  setTextZoom(textZoom);
});

async function getSelectionBlob() {
  const rect = pdfCanvas.getBoundingClientRect();
  const viewerRect = viewer.getBoundingClientRect();
  // derive from selection box if sel missing
  if (!sel || sel.w <= 0 || sel.h <= 0) {
    const selRect = selectionEl.getBoundingClientRect();
    if (selRect.width <= 2 || selRect.height <= 2) return null;
    const x = selRect.left - rect.left;
    const y = selRect.top - rect.top;
    sel = { x, y, w: selRect.width, h: selRect.height };
  }
  if (!sel) return null;
  const ctx = pdfCanvas.getContext('2d');
  const imageData = ctx.getImageData(sel.x, sel.y, sel.w, sel.h);
  const tmp = document.createElement('canvas');
  tmp.width = sel.w;
  tmp.height = sel.h;
  tmp.getContext('2d').putImageData(imageData, 0, 0);
  return new Promise((resolve) => tmp.toBlob(resolve, 'image/png'));
}

async function getSelectionOrFullPageBlob() {
  const blob = await getSelectionBlob();
  if (blob) return blob;
  if (!currentFile || !totalPages) return null;
  return await renderPageToBlob(2.4);
}

async function getViewerViewportBlob() {
  if (!pdfCanvas.width || !pdfCanvas.height) return null;
  const { offsetX, offsetY } = canvasOffset();

  const viewLeft = viewer.scrollLeft;
  const viewTop = viewer.scrollTop;
  const viewRight = viewLeft + viewer.clientWidth;
  const viewBottom = viewTop + viewer.clientHeight;

  const canvasLeft = offsetX;
  const canvasTop = offsetY;
  const canvasRight = canvasLeft + pdfCanvas.width;
  const canvasBottom = canvasTop + pdfCanvas.height;

  const interLeft = Math.max(viewLeft, canvasLeft);
  const interTop = Math.max(viewTop, canvasTop);
  const interRight = Math.min(viewRight, canvasRight);
  const interBottom = Math.min(viewBottom, canvasBottom);

  if (interRight <= interLeft || interBottom <= interTop) return null;

  const sx = interLeft - canvasLeft;
  const sy = interTop - canvasTop;
  const sw = interRight - interLeft;
  const sh = interBottom - interTop;

  const tmp = document.createElement('canvas');
  tmp.width = Math.max(1, Math.floor(sw));
  tmp.height = Math.max(1, Math.floor(sh));
  const tctx = tmp.getContext('2d');
  tctx.drawImage(
    pdfCanvas,
    sx, sy, sw, sh,
    0, 0, tmp.width, tmp.height
  );
  return new Promise((resolve) => tmp.toBlob(resolve, 'image/png'));
}

async function autoExportHidden(blob) {
  if (!blob) return;
  const form = new FormData();
  form.append('image', blob, 'selection.png');
  form.append('visible', 'false');
  const res = await fetch('/export/add', { method: 'POST', body: form });
  if (!res.ok) return;
  const data = await res.json();
  if (data.path) {
    exportLink.href = data.path;
    exportLink.textContent = 'Deschide PDF exportat';
    exportLink.classList.remove('hidden');
  }
}

async function renderPageToBlob(mult = 2.0) {
  if (!currentFile || !totalPages) return null;
  const img = await loadPageImage(currentPage, mult);
  const off = document.createElement('canvas');
  off.width = img.width;
  off.height = img.height;
  const offCtx = off.getContext('2d');
  offCtx.drawImage(img, 0, 0);

  const rot = normalizeRotation(rotation);
  if (rot === 0) {
    return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  }
  const rad = (rot * Math.PI) / 180;
  const w = off.width;
  const h = off.height;
  const newW = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
  const newH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = Math.ceil(newW);
  rotCanvas.height = Math.ceil(newH);
  const ctx = rotCanvas.getContext('2d');
  ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(off, -w / 2, -h / 2);
  return new Promise((resolve) => rotCanvas.toBlob(resolve, 'image/png'));
}

scanPageBtn.addEventListener('click', async () => {
  if (!currentFile || !currentPage) { alert('Selectează un PDF.'); return; }
  const blob = await getViewerViewportBlob();
  if (!blob) { alert('Nu pot captura view-ul curent.'); return; }

  const form = new FormData();
  form.append('image', blob, 'viewport.png');
  form.append('auto_export', 'true');
  const res = await fetch('/scan/view', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('Scan page eșuat: ' + t);
    return;
  }
  const data = await res.json();
  const existing = ocrOutput.value || '';
  const incoming = data.text || '';
  if (incoming) {
    ocrOutput.value = existing
      ? `${existing.replace(/\s*$/, '')}\n\n${incoming}`
      : incoming;
  }
  renderHighlight();
  saveCurrentPageText();
  if (data.path) {
    exportLink.href = data.path;
    exportLink.textContent = 'Deschide PDF exportat';
    exportLink.classList.remove('hidden');
  }
  if (!data.text) {
    alert('Scan page: nu s-a detectat text.');
  }
});

exportHiddenBtn.addEventListener('click', async () => {
  const blob = await getSelectionBlob();
  if (!blob) { alert('Selectează o zonă'); return; }
  const form = new FormData();
  form.append('image', blob, 'selection.png');
  form.append('visible', 'false');
  const res = await fetch('/export/add', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('Export eșuat: ' + t);
    return;
  }
  const data = await res.json();
  if (data.path) {
    exportLink.href = data.path;
    exportLink.textContent = 'Deschide PDF exportat';
    exportLink.classList.remove('hidden');
  }
});

function normalizeWord(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9ăâîșțàáâäãåæçèéêëìíîïñòóôöõœùúûüÿßœ]/gi, '');
}

function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildAutoSnippetName(text) {
  const src = (text || '').trim();
  const sessionMatch = src.match(/^\s*(\d{1,4})\b/m);
  const session = sessionMatch ? sessionMatch[1] : 'S';

  // Examples handled:
  // "6 decembrie [18]90"
  // "28-29 august 1891"
  const dateMatch = src.match(
    /(\d{1,2}(?:\s*-\s*\d{1,2})?)\s+([A-Za-zĂÂÎȘȚăâîșțÉÈÊËÀÙÛÔÇéèêëàùûôç\[\]]+)\s*(?:[\[<]?\s*(\d{2})\s*[\]>]?)?\s*(\d{2,4})/u
  );

  let datePart = 'nodata';
  if (dateMatch) {
    const day = dateMatch[1].replace(/\s+/g, '');
    const month = stripDiacritics(dateMatch[2]).toLowerCase().replace(/[\[\]]/g, '');
    const p1 = dateMatch[3] || '';
    const p2 = dateMatch[4] || '';
    let year = p2;
    if (p1 && p2.length === 2) year = `${p1}${p2}`;
    if (year.length === 2) year = `18${year}`;
    datePart = `${day}${month}${year}`;
  }

  return `${session}_${datePart}_FR_VOL1`;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/ /g, '&nbsp;');
}

function buildHighlightHtml(text, ranges) {
  if (!text) return '';
  if (!ranges || !ranges.length) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
  let out = '';
  let idx = 0;
  ranges.forEach(r => {
    out += escapeHtml(text.slice(idx, r.start)).replace(/\n/g, '<br>');
    out += `<mark>${escapeHtml(text.slice(r.start, r.end)).replace(/\n/g, '<br>')}</mark>`;
    idx = r.end;
  });
  out += escapeHtml(text.slice(idx)).replace(/\n/g, '<br>');
  return out;
}

function findAllRanges(text, term, range = null, caseSensitive = false) {
  if (!term) return [];
  const src = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? term : term.toLowerCase();
  const start = range ? range.start : 0;
  const end = range ? range.end : text.length;
  const ranges = [];
  let idx = src.indexOf(needle, start);
  while (idx !== -1 && idx + needle.length <= end) {
    ranges.push({ start: idx, end: idx + needle.length });
    idx = src.indexOf(needle, idx + 1);
  }
  return ranges;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getTagRanges(text) {
  const ranges = [];
  const tags = extractTags(text || '');
  tags.forEach(t => {
    const meta = TAGS.find(x => x.token === t.token);
    if (!meta) return;
    ranges.push({ start: t.start, end: t.end, className: meta.className });
  });
  return ranges;
}

function buildCombinedHighlight(text, term, range) {
  const tagRanges = getTagRanges(text);
  const searchRanges = term ? findAllRanges(text, term, range, false).map(r => ({ ...r, className: 'search-hit' })) : [];
  const spell = spellRanges.map(r => ({ ...r, className: 'spell-hit' }));
  const allRanges = [...tagRanges, ...searchRanges, ...spell];
  if (!allRanges.length) {
    return buildHighlightHtml(text, []);
  }

  const points = new Set([0, text.length]);
  allRanges.forEach(r => {
    points.add(r.start);
    points.add(r.end);
  });
  const sorted = Array.from(points).sort((a, b) => a - b);

  let html = '';
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];
    if (start === end) continue;
    const segment = text.slice(start, end);
    const classes = [];
    for (const r of allRanges) {
      if (r.start <= start && r.end >= end) {
        classes.push(r.className);
      }
    }
    const escaped = escapeHtml(segment).replace(/\n/g, '<br>');
    if (!classes.length) {
      html += escaped;
    } else {
      const uniq = Array.from(new Set(classes));
      const classStr = uniq.map(c => {
        if (c === 'search-hit' || c === 'spell-hit') return c;
        return `tag ${c}`;
      }).join(' ');
      html += `<span class="${classStr}">${escaped}</span>`;
    }
  }
  return html;
}

function renderHighlight() {
  const text = ocrOutput.value || '';
  if (!activeHighlight || !activeHighlight.term) {
    ocrHighlight.innerHTML = buildCombinedHighlight(text, null, null);
    return;
  }
  const ranges = findAllRanges(text, activeHighlight.term, activeHighlight.range, false);
  ocrHighlight.innerHTML = buildCombinedHighlight(text, activeHighlight.term, activeHighlight.range);
  if (ranges.length) {
    ocrOutput.focus();
    ocrOutput.setSelectionRange(ranges[0].start, ranges[0].end);
  }
}

function normalizeSentences(text) {
  if (!text) return text;
  const DOT_MARK = '§§DOT§§';
  const ABBR = [
    'M.', 'Dr.', 'etc.', 'nr.', 'inv.', 'Arh.', 'Arb.', 'Muz.', 'Mem.',
    'dl.', 'dna.', 'd-na.', 'ms.', 'vol.', 'pag.', 'p.', 'pp.', 'ff.'
  ];

  function protectAbbreviations(src) {
    let out = src;
    // Protect chained initials: B.P. / A.I.C.
    for (let i = 0; i < 6; i++) {
      const next = out.replace(
        /\b([A-ZĂÂÎȘȚ])\.\s*([A-ZĂÂÎȘȚ])\./g,
        `$1${DOT_MARK}$2${DOT_MARK}`
      );
      if (next === out) break;
      out = next;
    }
    // Protect common abbreviations
    ABBR.forEach(a => {
      const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      out = out.replace(new RegExp(escaped, 'g'), a.replace(/\./g, DOT_MARK));
    });
    return out;
  }

  function restoreAbbreviations(src) {
    return src.replace(new RegExp(DOT_MARK, 'g'), '.');
  }

  // 1) normalize EOL + hyphen line-breaks
  let t = text.replace(/\r\n/g, '\n');
  t = t.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\s*\n\s*([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1$2');

  // 2) conservative line merge (avoid breaking references/citations)
  const lines = t.split('\n').map(l => l.trim());
  const merged = [];
  const isAbbrevEnd = (s) => /\b([A-ZĂÂÎȘȚ]\.|[A-Za-zÀ-ÖØ-öø-ÿ]{1,4}\.)$/.test(s);
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (!merged.length) {
      merged.push(line);
      continue;
    }
    const prev = merged[merged.length - 1];
    const prevEndsSentence = /[.!?]["»”')\]]*$/.test(prev) && !isAbbrevEnd(prev);
    const currStartsLower = /^[a-zà-öø-ÿ]/u.test(line);
    const currStartsNumber = /^[0-9]/.test(line);
    const forceJoinByPrev = /[,;:\-–—(\[]$/.test(prev) || isAbbrevEnd(prev);
    if (!prevEndsSentence || currStartsLower || currStartsNumber || forceJoinByPrev) {
      merged[merged.length - 1] = `${prev} ${line}`.replace(/\s+/g, ' ').trim();
    } else {
      merged.push(line);
    }
  }

  // 3) sentence-per-line split, but abbreviation-safe
  const out = [];
  for (const paragraph of merged) {
    let p = protectAbbreviations(paragraph);
    const chunks = p
      .split(/(?<=[.!?])\s+(?=[A-ZĂÂÎȘȚ„«"(\[])/u)
      .map(s => restoreAbbreviations(s).trim())
      .filter(Boolean);
    if (chunks.length) out.push(...chunks);
    else out.push(restoreAbbreviations(p));
  }
  return out.join('\n');
}

function setTextZoom(size) {
  ocrOutput.style.fontSize = `${size}px`;
  ocrHighlight.style.fontSize = `${size}px`;
}

function clearSpellState() {
  spellRanges = [];
  spellMatches = [];
  if (spellSuggestionsEl) spellSuggestionsEl.innerHTML = '';
}

function replaceRange(start, end, replacement) {
  const src = ocrOutput.value || '';
  ocrOutput.value = `${src.slice(0, start)}${replacement}${src.slice(end)}`;
  ocrOutput.focus();
  const caret = start + replacement.length;
  ocrOutput.setSelectionRange(caret, caret);
  saveCurrentPageText();
  renderHighlight();
}

function renderSpellSuggestions() {
  if (!spellSuggestionsEl) return;
  if (!spellMatches.length) {
    spellSuggestionsEl.innerHTML = '';
    return;
  }
  const rows = [];
  rows.push(`<div><strong>Sugestii spell (${spellMatches.length})</strong></div>`);
  spellMatches.slice(0, 25).forEach((m, idx) => {
    const sug = (m.suggestions || []).slice(0, 4);
    const sugBtns = sug.length
      ? sug.map(s => `<button data-i="${idx}" data-s="${encodeURIComponent(s)}">${escapeHtml(s)}</button>`).join(' ')
      : '<em>fără sugestii</em>';
    rows.push(`<div class="spell-row"><span class="spell-bad">${escapeHtml(m.bad)}</span> → ${sugBtns}</div>`);
  });
  spellSuggestionsEl.innerHTML = rows.join('');
  spellSuggestionsEl.querySelectorAll('button[data-i][data-s]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.getAttribute('data-i'), 10);
      const rep = decodeURIComponent(btn.getAttribute('data-s') || '');
      const m = spellMatches[i];
      if (!m || !rep) return;
      replaceRange(m.offset, m.offset + m.length, rep);
      clearSpellState();
    });
  });
}

async function runSpellcheck() {
  const fullText = ocrOutput.value || '';
  if (!fullText.trim()) {
    alert('Nu există text pentru spellcheck.');
    return;
  }
  const selStart = ocrOutput.selectionStart;
  const selEnd = ocrOutput.selectionEnd;
  const hasSel = selStart !== selEnd;
  const scopeText = hasSel ? fullText.slice(selStart, selEnd) : fullText;
  const mode = (spellLangSelect && spellLangSelect.value) ? spellLangSelect.value : 'auto';

  const res = await fetch('/spellcheck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: scopeText, mode }),
  });
  if (!res.ok) {
    const t = await res.text();
    alert(`Spellcheck eșuat: ${t}`);
    return;
  }
  const data = await res.json();
  const matches = (data.matches || []).map(m => ({
    ...m,
    offset: hasSel ? (m.offset + selStart) : m.offset,
  }));
  spellMatches = matches;
  spellRanges = matches.map(m => ({ start: m.offset, end: m.offset + m.length }));
  renderHighlight();
  renderSpellSuggestions();
  if (!matches.length) {
    alert('Nu am găsit erori de spelling pentru limba selectată.');
  }
}

function applySpellLang(mode) {
  ocrOutput.spellcheck = true;
  if (mode === 'ro') {
    ocrOutput.setAttribute('lang', 'ro-RO');
    return;
  }
  if (mode === 'fr') {
    ocrOutput.setAttribute('lang', 'fr-FR');
    return;
  }
  // auto -> browser default language model
  ocrOutput.setAttribute('lang', 'ro-RO');
}

ocrOutput.addEventListener('scroll', () => {
  ocrHighlight.scrollTop = ocrOutput.scrollTop;
  ocrHighlight.scrollLeft = ocrOutput.scrollLeft;
});

ocrOutput.addEventListener('input', () => {
  clearSpellState();
  renderHighlight();
});

findOcrBtn.addEventListener('click', () => {
  const term = prompt('Caută în OCR:');
  if (!term) return;
  activeHighlight = { term, range: null };
  renderHighlight();
  const text = ocrOutput.value || '';
  const count = findAllRanges(text, term).length;
  if (!count) {
    alert('Nu s-a găsit termenul.');
  } else {
    alert(`Găsite ${count} ocurențe.`);
  }
});

if (normTextBtn) {
  normTextBtn.addEventListener('click', () => {
    const start = ocrOutput.selectionStart;
    const end = ocrOutput.selectionEnd;
    if (start !== end) {
      const src = ocrOutput.value;
      const selected = src.slice(start, end);
      const normalized = normalizeSentences(selected);
      ocrOutput.value = `${src.slice(0, start)}${normalized}${src.slice(end)}`;
      ocrOutput.focus();
      ocrOutput.setSelectionRange(start, start + normalized.length);
    } else {
      ocrOutput.value = normalizeSentences(ocrOutput.value || '');
    }
    renderHighlight();
    saveCurrentPageText();
  });
}

function cleanTextBasic(text) {
  if (!text) return text;
  let t = text.replace(/\r\n/g, '\n');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

if (cleanTextBtn) {
  cleanTextBtn.addEventListener('click', () => {
    const start = ocrOutput.selectionStart;
    const end = ocrOutput.selectionEnd;
    if (start !== end) {
      const src = ocrOutput.value;
      const selected = src.slice(start, end);
      const cleaned = cleanTextBasic(selected);
      ocrOutput.value = `${src.slice(0, start)}${cleaned}${src.slice(end)}`;
      ocrOutput.focus();
      ocrOutput.setSelectionRange(start, start + cleaned.length);
    } else {
      ocrOutput.value = cleanTextBasic(ocrOutput.value || '');
    }
    renderHighlight();
    saveCurrentPageText();
  });
}

findSelBtn.addEventListener('click', async () => {
  const term = prompt('Caută în selecție (scan):');
  if (!term) return;
  const blob = await getSelectionBlob();
  if (!blob) { alert('Selectează o zonă'); return; }
  const form = new FormData();
  form.append('image', blob, 'selection.png');
  const res = await fetch('/ocr/google_boxes', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('Find eșuat: ' + t);
    return;
  }
  const data = await res.json();
  const boxes = data.boxes || [];
  const termWords = term.split(/\s+/).map(normalizeWord).filter(Boolean);
  if (!termWords.length) {
    alert('Termen invalid.');
    return;
  }

  const hits = [];
  if (termWords.length === 1) {
    const target = termWords[0];
    boxes.forEach(([word, x, y, w, h]) => {
      const norm = normalizeWord(word);
      if (norm && norm.includes(target)) {
        hits.push({ x, y, w, h });
      }
    });
  } else {
    const norms = boxes.map(b => normalizeWord(b[0]));
    for (let i = 0; i <= norms.length - termWords.length; i++) {
      let ok = true;
      for (let j = 0; j < termWords.length; j++) {
        if (norms[i + j] !== termWords[j]) { ok = false; break; }
      }
      if (ok) {
        for (let j = 0; j < termWords.length; j++) {
          const [, x, y, w, h] = boxes[i + j];
          hits.push({ x, y, w, h });
        }
      }
    }
  }

  scanHits.innerHTML = '';
  if (!hits.length) {
    alert('Nu s-a găsit termenul în selecție.');
    return;
  }
  const scaleX = sel.w / data.width;
  const scaleY = sel.h / data.height;
  const { offsetX, offsetY } = canvasOffset();
  hits.forEach(h => {
    const div = document.createElement('div');
    div.className = 'scan-hit';
    div.style.left = `${sel.x + offsetX + (h.x * scaleX)}px`;
    div.style.top = `${sel.y + offsetY + (h.y * scaleY)}px`;
    div.style.width = `${h.w * scaleX}px`;
    div.style.height = `${h.h * scaleY}px`;
    scanHits.appendChild(div);
  });
  alert(`Găsite ${hits.length} ocurențe în selecție.`);
});

saveSelBtn.addEventListener('click', async () => {
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  if (start === end) {
    alert('Selectează un text pentru salvare.');
    return;
  }
  const text = ocrOutput.value.substring(start, end);
  const autoName = buildAutoSnippetName(text);
  const name = prompt('Denumire fișier (fără extensie):', autoName);
  if (!name) return;
  const form = new FormData();
  form.append('name', name);
  form.append('text', text);
  const res = await fetch('/save/selection', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('Salvare eșuată: ' + t);
    return;
  }
  const data = await res.json();
  const apiPath = data.path || '';
  let folderHint = '';
  const m = apiPath.match(/^\/snippets\/([^/]+)\//);
  if (m) {
    folderHint = `/Users/aliceilie/Documents/New project/webapp/data/snippets/${m[1]}/`;
  }
  alert(`Selecția a fost salvată.\nAPI path: ${apiPath}\nFolder: ${folderHint}`);
});

saveProgressBtn.addEventListener('click', async () => {
  saveCurrentPageText();
  const form = new FormData();
  form.append('text', ocrOutput.value || '');
  form.append('file', currentFile || '');
  form.append('page', String(currentPage || 1));
  const pagesPayload = {};
  pageTexts.forEach((v, k) => {
    const [fname, p] = k.split('::');
    if (fname === currentFile) {
      pagesPayload[p] = v;
    }
  });
  form.append('pages_json', JSON.stringify(pagesPayload));
  const res = await fetch('/save/progress', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('Salvare progres eșuată: ' + t);
    return;
  }
  alert('Progres salvat (full.txt + progress.json).');
});

exportJsonBtn.addEventListener('click', async () => {
  const text = ocrOutput.value || '';
  const tags = extractTags(text);
  const payload = {
    file: currentFile || '',
    page: currentPage || 1,
    text,
    tags,
  };
  const res = await fetch('/export/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    alert('Export JSON eșuat: ' + t);
    return;
  }
  const data = await res.json();
  if (data.path) {
    exportJsonLink.href = data.path;
    exportJsonLink.textContent = 'Deschide JSON exportat';
    exportJsonLink.classList.remove('hidden');
  }
});

function extractTags(text) {
  const src = String(text || '');
  const results = [];
  const occupied = [];

  const isInside = (idx) => occupied.some(r => idx >= r.start && idx < r.end);
  const markRange = (start, end) => occupied.push({ start, end });

  // 1) standard paired tags: TOKEN ... TOKEN
  TAGS.forEach(tag => {
    const token = tag.token;
    const re = new RegExp(escapeRegex(token) + '([\\s\\S]*?)' + escapeRegex(token), 'g');
    let m;
    while ((m = re.exec(src)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const content = m[1] || '';
      if (content.trim()) {
        results.push({ label: tag.label, token: tag.token, start, end, content });
        markRange(start, end);
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  });

  // 2) fallback for unclosed tags: TOKEN ... (until next TOKEN start or end)
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
          results.push({
            label: tag.label,
            token: tag.token,
            start: pos,
            end,
            content,
          });
          markRange(pos, end);
        }
      }
      pos = src.indexOf(token, pos + token.length);
    }
  });

  results.sort((a, b) => a.start - b.start);
  return results;
}

async function renderTagFilterResults() {
  if (!tagFilterResults) return;
  saveCurrentPageText();
  // Re-sync selected tokens from DOM checkboxes to avoid stale state.
  if (tagFilterMenu) {
    const checked = Array.from(tagFilterMenu.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    selectedFilterTokens.clear();
    checked.forEach(v => selectedFilterTokens.add(v));
    updateFilterToggleLabel();
  }
  const selectedTokens = TAGS.filter(t => selectedFilterTokens.has(t.token)).map(t => t.token);
  if (!selectedTokens.length) {
    alert('Alege cel puțin un filtru din dropdown.');
    return;
  }
  const scope = tagFilterScope ? tagFilterScope.value : 'page';

  const entries = [];
  const addRowsFromText = (docName, pageNum, text) => {
    const tags = extractTags(text || '');
    tags.forEach(t => {
      if (selectedTokens.includes(t.token)) {
        entries.push({
          doc: docName || '-',
          page: pageNum || '-',
          token: t.token,
          content: t.content || '',
        });
      }
    });
  };

  if (scope === 'document' && currentFile) {
    const pageRows = [];
    pageTexts.forEach((txt, key) => {
      const [fname, p] = key.split('::');
      if (fname === currentFile && typeof txt === 'string' && txt.trim()) {
        pageRows.push([parseInt(p, 10), txt]);
      }
    });
    pageRows.sort((a, b) => a[0] - b[0]);
    pageRows.forEach(([p, txt]) => addRowsFromText(currentFile, p, txt));
    try {
      const srcRes = await fetch(`/sources/${encodeURIComponent(currentFile)}`);
      if (srcRes.ok) {
        const srcData = await srcRes.json();
        (srcData.files || []).forEach(src => {
          addRowsFromText(currentFile, `sursa:${src.name}`, src.text || '');
        });
      }
    } catch (_) {}
  } else {
    addRowsFromText(currentFile || '-', currentPage || '-', ocrOutput.value || '');
  }

  if (!entries.length) {
    filterRows = [];
    filterColumns = [];
    tagFilterResults.innerHTML = '<div class="meta">Nu există rezultate pentru filtrul ales.</div>';
    return;
  }

  const groupMap = new Map();
  entries.forEach(e => {
    const key = `${e.doc}||${e.page}`;
    if (!groupMap.has(key)) groupMap.set(key, { doc: e.doc, page: e.page });
    const row = groupMap.get(key);
    row[e.token] = row[e.token] ? `${row[e.token]}\n\n${e.content}` : e.content;
  });

  filterColumns = TAGS
    .filter(t => selectedTokens.includes(t.token))
    .map(t => ({ token: t.token, label: t.label }));
  filterRows = Array.from(groupMap.values());

  let html = `<div class="meta">Rezultate: ${entries.length} fragmente | ${filterRows.length} rânduri</div>`;
  html += `
    <table class="filter-table">
      <thead>
        <tr>
          <th>Document</th>
          <th>Pagină</th>
          ${filterColumns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;
  filterRows.forEach(r => {
    html += `
      <tr>
        <td>${escapeHtml(String(r.doc))}</td>
        <td>${escapeHtml(String(r.page))}</td>
        ${filterColumns.map(c => `<td class="content-cell">${escapeHtml(String(r[c.token] || ''))}</td>`).join('')}
      </tr>
    `;
  });
  html += '</tbody></table>';
  tagFilterResults.innerHTML = html;
}

function setFilterZoom(size) {
  const clamped = Math.max(10, Math.min(22, size));
  filterZoom = clamped;
  if (tagFilterResults) {
    tagFilterResults.style.fontSize = `${clamped}px`;
  }
}

function setFilterHeight(h) {
  const clamped = Math.max(140, Math.min(900, h));
  filterHeight = clamped;
  applyViewerLayout();
}

function downloadTextFile(fileName, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function exportFilterTxt() {
  if (!filterRows.length) {
    alert('Nu există rezultate de exportat. Rulează întâi filtrarea.');
    return;
  }
  const body = filterRows.map((r, i) => {
    const cols = filterColumns.map(c => `${c.label}:\n${r[c.token] || ''}`).join('\n\n');
    return `${i + 1}. Document: ${r.doc}\nPagină: ${r.page}\n\n${cols}\n`;
  }).join('\n--------------------\n\n');
  downloadTextFile('filtrare_etichete.txt', body);
}

function exportFilterCsv() {
  if (!filterRows.length) {
    alert('Nu există rezultate de exportat. Rulează întâi filtrarea.');
    return;
  }
  const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const header = ['"Document"', '"Pagina"'].concat(filterColumns.map(c => esc(c.label)));
  const lines = [header.join(',')];
  filterRows.forEach(r => {
    const row = [esc(r.doc), esc(r.page)].concat(filterColumns.map(c => esc(r[c.token] || '')));
    lines.push(row.join(','));
  });
  downloadTextFile('filtrare_etichete.csv', lines.join('\n'), 'text/csv;charset=utf-8');
}

function wrapSelectionWithToken(token) {
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  if (start === end) {
    alert('Selectează textul pe care vrei să-l etichetezi.');
    return;
  }
  const text = ocrOutput.value;
  const before = text.slice(0, start);
  const selText = text.slice(start, end);
  const after = text.slice(end);
  ocrOutput.value = `${before}${token}${selText}${token}${after}`;
  ocrOutput.focus();
  ocrOutput.setSelectionRange(start, start + token.length + selText.length + token.length);
  renderHighlight();
}

tagSelect.addEventListener('change', () => {
  const token = tagSelect.value;
  if (!token) return;
  wrapSelectionWithToken(token);
  tagSelect.value = '';
});

if (tagFilterRunBtn) {
  tagFilterRunBtn.addEventListener('click', async () => {
    await renderTagFilterResults();
  });
}

if (tagFilterToggle && tagFilterMenu) {
  tagFilterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    tagFilterMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!tagFilterMenu.contains(e.target) && e.target !== tagFilterToggle) {
      tagFilterMenu.classList.add('hidden');
    }
  });
}

if (filterZoomInBtn) {
  filterZoomInBtn.addEventListener('click', () => {
    setFilterZoom(filterZoom + 1);
  });
}

if (filterZoomOutBtn) {
  filterZoomOutBtn.addEventListener('click', () => {
    setFilterZoom(filterZoom - 1);
  });
}

if (filterSpaceIncBtn) {
  filterSpaceIncBtn.addEventListener('click', () => {
    setFilterHeight(filterHeight + 40);
  });
}

if (filterSpaceDecBtn) {
  filterSpaceDecBtn.addEventListener('click', () => {
    setFilterHeight(filterHeight - 40);
  });
}

if (filterExportTxtBtn) {
  filterExportTxtBtn.addEventListener('click', () => {
    exportFilterTxt();
  });
}

if (filterExportCsvBtn) {
  filterExportCsvBtn.addEventListener('click', () => {
    exportFilterCsv();
  });
}

if (filterSplitter) {
  let dragFilter = false;
  let startY = 0;
  let startH = filterHeight;
  filterSplitter.addEventListener('mousedown', (e) => {
    dragFilter = true;
    startY = e.clientY;
    startH = filterHeight;
    document.body.style.cursor = 'row-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragFilter) return;
    const dy = startY - e.clientY;
    setFilterHeight(startH + dy);
  });
  window.addEventListener('mouseup', () => {
    if (!dragFilter) return;
    dragFilter = false;
    document.body.style.cursor = 'default';
  });
}

function applyViewerLayout() {
  if (!tagFilterResults) return;
  tagFilterResults.style.maxHeight = `${Math.max(140, filterHeight)}px`;
}

if (frCharSelect) {
  frCharSelect.addEventListener('change', () => {
    const ch = frCharSelect.value;
    if (!ch) return;
    insertTextAtCursor(ch);
    frCharSelect.value = '';
  });
}

if (specialCharSelect) {
  specialCharSelect.addEventListener('change', () => {
    const ch = specialCharSelect.value;
    if (!ch) return;
    insertTextAtCursor(ch);
    specialCharSelect.value = '';
  });
}

if (spellLangSelect) {
  spellLangSelect.addEventListener('change', () => {
    applySpellLang(spellLangSelect.value);
  });
}

if (spellRunBtn) {
  spellRunBtn.addEventListener('click', async () => {
    await runSpellcheck();
  });
}

if (uploadTxtBtn && uploadTxtInput) {
  uploadTxtBtn.addEventListener('click', () => uploadTxtInput.click());
  uploadTxtInput.addEventListener('change', async () => {
    const file = uploadTxtInput.files && uploadTxtInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const cleaned = stripRtfSimple(text).replace(/\u0000/g, '');
      const parsed = parseTxtByPages(cleaned);
      if (currentFile && parsed.hasMarkers) {
        Object.entries(parsed.pages).forEach(([p, v]) => {
          const pageNum = parseInt(p, 10);
          if (!Number.isNaN(pageNum)) {
            pageTexts.set(`${currentFile}::${pageNum}`, v || '');
          }
        });
        loadCurrentPageText();
      } else {
        ocrOutput.value = parsed.raw;
        renderHighlight();
        saveCurrentPageText();
      }
      alert(`TXT încărcat: ${file.name}`);
    } catch (e) {
      alert(`Nu pot citi fișierul TXT: ${e}`);
    } finally {
      uploadTxtInput.value = '';
    }
  });
}

if (saveLocalTxtBtn) {
  saveLocalTxtBtn.addEventListener('click', async () => {
    const text = ocrOutput.value || '';
    if (!text.trim()) {
      alert('Nu există text de salvat.');
      return;
    }
    const base = currentFile ? currentFile.replace(/\.[^.]+$/, '') : 'editor';
    await saveTextLocal(`${base}_page${currentPage || 1}.txt`, text);
  });
}

async function ocrTesseract(lang) {
  const blob = await getSelectionOrFullPageBlob();
  if (!blob) { alert('Selectează o zonă sau încarcă pagina.'); return; }
  const form = new FormData();
  form.append('image', blob, 'selection.png');
  form.append('lang', lang);
  form.append('correct', 'true');
  const res = await fetch('/ocr/tesseract', { method: 'POST', body: form });
  if (!res.ok) {
    const t = await res.text();
    alert('OCR HQ eșuat: ' + t);
    return;
  }
  const data = await res.json();
  ocrOutput.value = data.text || '';
  renderHighlight();
  saveCurrentPageText();
  await autoExportHidden(blob);
}

if (ocrHqRoBtn) ocrHqRoBtn.addEventListener('click', () => ocrTesseract('ron'));
if (ocrHqFrBtn) ocrHqFrBtn.addEventListener('click', () => ocrTesseract('fra'));

initTagSelect();
initTagFilterMenu();
initCharSelect(frCharSelect, FR_CHARS);
initCharSelect(specialCharSelect, SPECIAL_CHARS);
applySpellLang(spellLangSelect ? spellLangSelect.value : 'auto');
if (tagFilterResults) {
  tagFilterResults.innerHTML = '<div class="meta">Apasă „Filtrează” pentru a vedea selecțiile etichetate.</div>';
}
setFilterZoom(filterZoom);
setFilterHeight(filterHeight);
window.addEventListener('resize', applyViewerLayout);
setTimeout(applyViewerLayout, 0);

setAuthenticatedState(false);
checkAuth();
setTextZoom(textZoom);

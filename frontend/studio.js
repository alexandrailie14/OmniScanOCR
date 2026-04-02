const authPanel = document.getElementById('auth-panel');
const studioApp = document.getElementById('studio-app');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userPill = document.getElementById('user-pill');
const fileCount = document.getElementById('file-count');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileSelect = document.getElementById('file-select');
const adminProgressPanel = document.getElementById('admin-progress-panel');
const adminProgressUserFilter = document.getElementById('admin-progress-user-filter');
const adminProgressDocFilter = document.getElementById('admin-progress-doc-filter');
const adminProgressSelect = document.getElementById('admin-progress-select');
const adminProgressLoadBtn = document.getElementById('admin-progress-load');
const loadLatestSplitBtn = document.getElementById('load-latest-split');
const deleteCurrentFileBtn = document.getElementById('delete-current-file');
const pageInput = document.getElementById('page-input');
const rangeStartInput = document.getElementById('range-start');
const rangeEndInput = document.getElementById('range-end');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const rotatePageLeft90Btn = document.getElementById('rotate-page-left-90');
const rotatePageRight90Btn = document.getElementById('rotate-page-right-90');
const cleanPageImageBtn = document.getElementById('clean-page-image');
const zoomRange = document.getElementById('zoom-range');
const zoomLabel = document.getElementById('zoom-label');
const toggleSplitToolsBtn = document.getElementById('toggle-split-tools');
const splitTools = document.getElementById('split-tools');
const splitShiftInput = document.getElementById('split-shift');
const splitSelectionPdfBtn = document.getElementById('split-selection-pdf');
const splitPdfBtn = document.getElementById('split-pdf');
const removeSplitPagesBtn = document.getElementById('remove-split-pages');
const rotationInput = document.getElementById('rotation-input');
const rotMinus5Btn = document.getElementById('rot-minus-5');
const rotMinus1Btn = document.getElementById('rot-minus-1');
const rotPlus1Btn = document.getElementById('rot-plus-1');
const rotPlus5Btn = document.getElementById('rot-plus-5');
const rotResetBtn = document.getElementById('rot-reset');
const ocrMode = document.getElementById('ocr-mode');
const runOcrBtn = document.getElementById('run-ocr');
const rerunOcrBtn = document.getElementById('rerun-ocr');
const pageImage = document.getElementById('page-image');
const splitGuide = document.getElementById('split-guide');
const previewStage = document.getElementById('preview-stage');
const previewEmpty = document.getElementById('preview-empty');
const docMeta = document.getElementById('doc-meta');
const pageBadge = document.getElementById('page-badge');
const ocrStatus = document.getElementById('ocr-status');
const ocrOutput = document.getElementById('ocr-output');
const copyTextBtn = document.getElementById('copy-text');
const undoTextBtn = document.getElementById('undo-text');
const redoTextBtn = document.getElementById('redo-text');
const normTextBtn = document.getElementById('norm-text');
const cleanTextBtn = document.getElementById('clean-text');
const runSelectionOcrBtn = document.getElementById('run-selection-ocr');
const runDocumentOcrBtn = document.getElementById('run-document-ocr');
const importTxtBtn = document.getElementById('import-txt');
const importTxtInput = document.getElementById('import-txt-input');
const exportArticlesBtn = document.getElementById('export-articles');
const saveProgressBtn = document.getElementById('save-progress');
const exportJsonBtn = document.getElementById('export-json');
const exportLink = document.getElementById('export-link');
const jsonLink = document.getElementById('json-link');
const articlesStatus = document.getElementById('articles-status');
const articlesActions = document.getElementById('articles-actions');
const viewExportedDocsBtn = document.getElementById('view-exported-docs');
const exportedArticlesWrap = document.getElementById('exported-articles-wrap');
const articlesFolder = document.getElementById('articles-folder');
const exportedArticlesList = document.getElementById('exported-articles-list');
const ocrProgressBlock = document.getElementById('ocr-progress-block');
const ocrProgressLabel = document.getElementById('ocr-progress-label');
const ocrProgressValue = document.getElementById('ocr-progress-value');
const ocrProgressBar = document.getElementById('ocr-progress-bar');

let files = [];
let currentUser = '';
let isAdmin = false;
let currentFile = '';
let totalPages = 0;
let currentPage = 1;
let currentPageBox = null;
const pageTexts = new Map();
let activeJobId = null;
let activeJobTimer = null;
let lastExportedArticles = [];
let lastExportedDocId = '';
let lastExportedFolder = '';
const SHIFT_PRESET_STORAGE_KEY = 'studioSplitShiftByFile';
const textUndoStack = [];
const textRedoStack = [];
let suppressHistory = false;
let adminProgressEntries = [];

function sortNatural(values) {
  return [...values].sort((left, right) => left.localeCompare(right, 'ro', { numeric: true, sensitivity: 'base' }));
}

function fillSelectOptions(selectEl, options, placeholder, selectedValue = '') {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  selectEl.appendChild(placeholderOption);

  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (value === selectedValue) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });

  if (!options.some((item) => item.value === selectedValue)) {
    selectEl.value = '';
  }
}

function getFilteredAdminProgressEntries() {
  const selectedOwner = adminProgressUserFilter?.value || '';
  const selectedFile = adminProgressDocFilter?.value || '';
  return adminProgressEntries.filter((entry) => {
    if (selectedOwner && entry.owner !== selectedOwner) return false;
    if (selectedFile && entry.file !== selectedFile) return false;
    return true;
  });
}

function setStudioVisible(isVisible) {
  authPanel.classList.toggle('hidden', isVisible);
  studioApp.classList.toggle('hidden', !isVisible);
}

function setStatus(message) {
  ocrStatus.textContent = message;
}

function slugifyFileName(value) {
  return String(value || 'text')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'text';
}

function setArticlesStatus(message) {
  articlesStatus.textContent = message || '';
}

function renderAdminProgressEntries() {
  if (!adminProgressSelect) return;
  const selectedOwner = adminProgressUserFilter?.value || '';
  const selectedFile = adminProgressDocFilter?.value || '';
  const previousSelection = adminProgressSelect.value;

  const owners = sortNatural(
    Array.from(new Set(adminProgressEntries.map((entry) => entry.owner).filter(Boolean)))
  ).map((owner) => ({ value: owner, label: owner }));

  fillSelectOptions(
    adminProgressUserFilter,
    owners,
    owners.length ? 'Toți utilizatorii' : 'Fără utilizatori',
    selectedOwner
  );

  const filePool = adminProgressEntries.filter((entry) => !adminProgressUserFilter?.value || entry.owner === adminProgressUserFilter.value);
  const filesForFilter = sortNatural(
    Array.from(new Set(filePool.map((entry) => entry.file).filter(Boolean)))
  ).map((file) => ({ value: file, label: file }));

  fillSelectOptions(
    adminProgressDocFilter,
    filesForFilter,
    filesForFilter.length ? 'Toate documentele' : 'Fără documente',
    selectedFile
  );

  adminProgressSelect.innerHTML = '';
  const filteredEntries = getFilteredAdminProgressEntries();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = filteredEntries.length ? 'Alege un progres salvat' : 'Nu există progres pentru filtrele alese';
  placeholder.disabled = true;
  placeholder.selected = true;
  adminProgressSelect.appendChild(placeholder);

  filteredEntries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = JSON.stringify({ owner: entry.owner, file: entry.file });
    option.textContent = `${entry.owner} · ${entry.label} · p.${entry.page || 1}`;
    adminProgressSelect.appendChild(option);
  });

  const hasPreviousSelection = filteredEntries.some((entry) => {
    try {
      const parsed = JSON.parse(previousSelection);
      return parsed.owner === entry.owner && parsed.file === entry.file;
    } catch (_) {
      return false;
    }
  });
  if (hasPreviousSelection) {
    adminProgressSelect.value = previousSelection;
  }
  adminProgressLoadBtn.disabled = !filteredEntries.length;
}

async function refreshAdminProgressEntries() {
  if (!isAdmin || !adminProgressPanel) return;
  try {
    const res = await fetch('/admin/progress_index');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut încărca progresul utilizatorilor.');
    }
    adminProgressEntries = Array.isArray(data.entries) ? data.entries.filter((item) => item.file) : [];
    renderAdminProgressEntries();
  } catch (err) {
    setStatus(err.message || 'Nu am putut încărca progresul utilizatorilor.');
  }
}

function updateTextHistoryButtons() {
  undoTextBtn.disabled = textUndoStack.length === 0;
  redoTextBtn.disabled = textRedoStack.length === 0;
}

function pushUndoState() {
  const currentValue = ocrOutput.value || '';
  if (textUndoStack.length && textUndoStack[textUndoStack.length - 1] === currentValue) {
    updateTextHistoryButtons();
    return;
  }
  textUndoStack.push(currentValue);
  if (textUndoStack.length > 100) {
    textUndoStack.shift();
  }
  textRedoStack.length = 0;
  updateTextHistoryButtons();
}

function setEditorText(value) {
  suppressHistory = true;
  ocrOutput.value = value;
  suppressHistory = false;
  storeCurrentText();
}

function applyUndo() {
  if (!textUndoStack.length) return;
  textRedoStack.push(ocrOutput.value || '');
  const nextValue = textUndoStack.pop();
  setEditorText(nextValue);
  updateTextHistoryButtons();
}

function applyRedo() {
  if (!textRedoStack.length) return;
  textUndoStack.push(ocrOutput.value || '');
  const nextValue = textRedoStack.pop();
  setEditorText(nextValue);
  updateTextHistoryButtons();
}

function resetArticlesExportUi() {
  lastExportedArticles = [];
  lastExportedDocId = '';
  lastExportedFolder = '';
  articlesActions.classList.add('hidden');
  exportedArticlesWrap.classList.add('hidden');
  articlesFolder.textContent = '';
  exportedArticlesList.innerHTML = '';
}

function renderExportedArticles() {
  exportedArticlesList.innerHTML = '';
  if (!lastExportedArticles.length || !lastExportedDocId) {
    exportedArticlesWrap.classList.add('hidden');
    return;
  }
  articlesFolder.textContent = `Folder export: ${lastExportedFolder}`;
  lastExportedArticles.forEach((file) => {
    const link = document.createElement('a');
    link.className = 'ghost-link exported-article-link';
    link.href = `/articles/file/${encodeURIComponent(lastExportedDocId)}/${encodeURIComponent(file.name)}`;
    link.target = '_blank';
    link.textContent = file.name;
    exportedArticlesList.appendChild(link);
  });
  exportedArticlesWrap.classList.remove('hidden');
}

function setProgress(percent, label) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  ocrProgressBlock.classList.remove('hidden');
  ocrProgressBar.style.width = `${safePercent}%`;
  ocrProgressValue.textContent = `${safePercent}%`;
  ocrProgressLabel.textContent = label;
}

function resetProgress() {
  ocrProgressBar.style.width = '0%';
  ocrProgressValue.textContent = '0%';
  ocrProgressLabel.textContent = 'Se pregătește OCR-ul...';
  ocrProgressBlock.classList.add('hidden');
}

function stopJobPolling() {
  if (activeJobTimer) {
    clearTimeout(activeJobTimer);
    activeJobTimer = null;
  }
}

function setDocMeta() {
  if (!currentFile) {
    docMeta.textContent = 'Alege un PDF pentru a incepe.';
    pageBadge.textContent = 'Pagina -';
    updateContextActions();
    return;
  }
  docMeta.textContent = `${currentFile} • ${totalPages} pagini`;
  pageBadge.textContent = `Pagina ${currentPage} / ${totalPages}`;
  updateContextActions();
}

function updateContextActions() {
  const hasFile = Boolean(currentFile);
  const isSplitMaster = hasFile && currentFile.toLowerCase().endsWith('_split_master.pdf');
  removeSplitPagesBtn.disabled = !isSplitMaster;
  rotatePageLeft90Btn.disabled = !hasFile;
  rotatePageRight90Btn.disabled = !hasFile;
  cleanPageImageBtn.disabled = !hasFile;
}

function getRotationValue() {
  return Number(rotationInput.value || 0);
}

function setRotationValue(value) {
  const clamped = Math.max(-30, Math.min(30, Math.round(Number(value || 0) * 10) / 10));
  rotationInput.value = String(clamped);
}

function loadShiftPresets() {
  try {
    return JSON.parse(localStorage.getItem(SHIFT_PRESET_STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function saveShiftPresetForCurrentFile() {
  if (!currentFile) return;
  const store = loadShiftPresets();
  store[currentFile] = Number(splitShiftInput.value || 0);
  localStorage.setItem(SHIFT_PRESET_STORAGE_KEY, JSON.stringify(store));
}

function loadShiftPresetForCurrentFile() {
  if (!currentFile) return;
  const store = loadShiftPresets();
  if (store[currentFile] !== undefined) {
    splitShiftInput.value = String(store[currentFile]);
  }
}

function updateSplitGuide() {
  if (splitTools.classList.contains('hidden') || !currentPageBox || !currentPageBox.width || pageImage.classList.contains('hidden')) {
    splitGuide.classList.add('hidden');
    return;
  }
  const shift = Number(splitShiftInput.value || 0);
  const ratio = 0.5 + (shift / Number(currentPageBox.width || 1));
  const clamped = Math.max(0.01, Math.min(0.99, ratio));
  const imageRect = pageImage.getBoundingClientRect();
  const stageRect = previewStage.getBoundingClientRect();
  const left = previewStage.scrollLeft + (imageRect.left - stageRect.left) + (imageRect.width * clamped);
  splitGuide.style.left = `${left}px`;
  splitGuide.classList.remove('hidden');
}

function syncRangeInputs() {
  const maxPages = Math.max(1, totalPages || 1);
  rangeStartInput.max = String(maxPages);
  rangeEndInput.max = String(maxPages);
  pageInput.max = String(maxPages);

  const start = Math.max(1, Math.min(maxPages, Number(rangeStartInput.value || 1)));
  let end = Math.max(1, Math.min(maxPages, Number(rangeEndInput.value || maxPages)));
  if (end < start) end = start;

  rangeStartInput.value = String(start);
  rangeEndInput.value = String(end);
}

function getSelectedRange() {
  const maxPages = Math.max(1, totalPages || 1);
  const start = Math.max(1, Math.min(maxPages, Number(rangeStartInput.value || 1)));
  const end = Math.max(start, Math.min(maxPages, Number(rangeEndInput.value || maxPages)));
  return { start, end };
}

function normalizeSentences(text) {
  if (!text) return text;
  const DOT_MARK = '§§DOT§§';
  const ABBR = [
    'M.', 'Dr.', 'etc.', 'nr.', 'inv.', 'Arh.', 'Arb.', 'Muz.', 'Mem.',
    'dl.', 'dna.', 'd-na.', 'ms.', 'vol.', 'pag.', 'p.', 'pp.', 'ff.'
  ];
  const MONTHS = [
    'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
    'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
    'janvier', 'fevrier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'aout', 'août', 'septembre', 'octobre', 'novembre', 'decembre', 'décembre'
  ];

  function normalizeBracketedDateText(value) {
    return String(value || '').replace(/\[/g, '').replace(/\]/g, '');
  }

  function isArticleNumberLine(line) {
    return /^\d{3,4}\*?$/.test(line.trim());
  }

  function isDateLine(line) {
    const src = normalizeBracketedDateText(line).trim().toLowerCase();
    if (!src) return false;
    if (src === 'nedatat') return true;
    if (!/\d/.test(src)) return false;
    return MONTHS.some((month) => src.includes(month));
  }

  function isArchiveLineStart(line) {
    const src = line.trim();
    return /^\(.*arh/i.test(src);
  }

  function normalizeFreeTextBlock(blockText) {
    if (!blockText.trim()) return '';

    function protectAbbreviations(src) {
      let out = src;
      for (let i = 0; i < 6; i += 1) {
        const next = out.replace(/\b([A-ZĂÂÎȘȚ])\.\s*([A-ZĂÂÎȘȚ])\./g, `$1${DOT_MARK}$2${DOT_MARK}`);
        if (next === out) break;
        out = next;
      }
      ABBR.forEach((abbr) => {
        const escaped = abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(escaped, 'g'), abbr.replace(/\./g, DOT_MARK));
      });
      return out;
    }

    function restoreAbbreviations(src) {
      return src.replace(new RegExp(DOT_MARK, 'g'), '.');
    }

    let t = blockText.replace(/\r\n/g, '\n');
    t = t.replace(/([A-Za-zÀ-ÖØ-öø-ÿ])-\s*\n\s*([A-Za-zÀ-ÖØ-öø-ÿ])/g, '$1$2');

    const lines = t.split('\n').map((line) => line.trim());
    const merged = [];
    const isAbbrevEnd = (value) => /\b([A-ZĂÂÎȘȚ]\.|[A-Za-zÀ-ÖØ-öø-ÿ]{1,4}\.)$/.test(value);
    lines.forEach((raw) => {
      const line = raw.replace(/\s+/g, ' ').trim();
      if (!line) return;
      if (!merged.length) {
        merged.push(line);
        return;
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
    });

    const out = [];
    merged.forEach((paragraph) => {
      const protectedText = protectAbbreviations(paragraph);
      const chunks = protectedText
        .split(/(?<=[.!?])\s+(?=[A-ZĂÂÎȘȚ„«"(\[])/u)
        .map((value) => restoreAbbreviations(value).trim())
        .filter(Boolean);
      if (chunks.length) out.push(...chunks);
      else out.push(restoreAbbreviations(protectedText));
    });
    return out.join('\n');
  }

  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  const normalizedLines = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const current = rawLines[i].replace(/\s+/g, ' ').trim();
    const next = i + 1 < rawLines.length ? rawLines[i + 1].replace(/\s+/g, ' ').trim() : '';
    if (isDateLine(current) && isArticleNumberLine(next)) {
      normalizedLines.push(next);
      normalizedLines.push(current);
      i += 1;
      continue;
    }
    normalizedLines.push(rawLines[i]);
  }
  const blocks = [];
  let buffer = [];

  function flushBuffer() {
    const joined = buffer.join('\n').trim();
    if (joined) {
      blocks.push({ type: 'text', value: normalizeFreeTextBlock(joined) });
    }
    buffer = [];
  }

  for (let i = 0; i < normalizedLines.length; i += 1) {
    const line = normalizedLines[i].replace(/\s+/g, ' ').trim();
    if (!line) {
      buffer.push('');
      continue;
    }

    if (isArticleNumberLine(line) || isDateLine(line)) {
      flushBuffer();
      blocks.push({ type: 'protected', value: line });
      continue;
    }

    if (isArchiveLineStart(line)) {
      flushBuffer();
      const archiveLines = [line];
      while (!archiveLines[archiveLines.length - 1].includes(')') && i + 1 < normalizedLines.length) {
        i += 1;
        archiveLines.push(normalizedLines[i].replace(/\s+/g, ' ').trim());
      }
      blocks.push({ type: 'protected', value: archiveLines.join('\n').trim() });
      continue;
    }

    buffer.push(line);
  }

  flushBuffer();
  const out = [];
  blocks.forEach((block, index) => {
    const value = block.value?.trim?.() || '';
    if (!value) return;
    const prev = out.length ? out[out.length - 1] : '';
    const startsNewFicha = isArticleNumberLine(value);
    if (startsNewFicha && prev) {
      out.push('');
    }
    out.push(value);
  });
  return out.join('\n');
}

function storeCurrentText() {
  if (!currentFile) return;
  pageTexts.set(currentPage, ocrOutput.value);
}

function restoreCurrentText() {
  ocrOutput.value = pageTexts.get(currentPage) || '';
  textUndoStack.length = 0;
  textRedoStack.length = 0;
  updateTextHistoryButtons();
}

function renderFiles() {
  fileSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = files.length ? 'Alege un document' : 'Nu există documente';
  placeholder.disabled = true;
  placeholder.selected = !currentFile;
  fileSelect.appendChild(placeholder);

  files.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    option.selected = name === currentFile;
    fileSelect.appendChild(option);
  });
  fileCount.textContent = `${files.length} fișiere`;
  fileSelect.disabled = !files.length;
  deleteCurrentFileBtn.disabled = !currentFile;
  loadLatestSplitBtn.disabled = !files.length;
}

async function refreshFiles() {
  const res = await fetch('/files');
  if (!res.ok) return;
  const data = await res.json();
  files = Array.isArray(data.files) ? data.files : [];
  renderFiles();
}

async function selectFile(name) {
  if (!name) return;
  storeCurrentText();
  currentFile = name;
  currentPage = 1;
  pageTexts.clear();
  resetArticlesExportUi();
  setArticlesStatus('');
  loadShiftPresetForCurrentFile();
  exportLink.classList.add('hidden');
  jsonLink.classList.add('hidden');
  await loadMeta();
  await loadSavedProgress();
  await loadPreview();
  renderFiles();
}

async function loadSavedProgress() {
  if (!currentFile) return;
  try {
    const query = new URLSearchParams({ file: currentFile });
    const res = await fetch(`/progress/load?${query.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.found || !data.payload) return;
    const payload = data.payload;
    const pages = payload.pages && typeof payload.pages === 'object' ? payload.pages : {};
    pageTexts.clear();
    Object.entries(pages).forEach(([pageNo, text]) => {
      pageTexts.set(Number(pageNo), typeof text === 'string' ? text : '');
    });
    if (payload.page) {
      currentPage = Math.max(1, Math.min(totalPages || Number(payload.page), Number(payload.page)));
      pageInput.value = String(currentPage);
    }
    setStatus(`Am încărcat progresul salvat pentru ${currentFile}.`);
  } catch (_) {
    // fail silently and keep normal flow
  }
}

function applyProgressPayload(payload) {
  const pages = payload.pages && typeof payload.pages === 'object' ? payload.pages : {};
  pageTexts.clear();
  Object.entries(pages).forEach(([pageNo, text]) => {
    pageTexts.set(Number(pageNo), typeof text === 'string' ? text : '');
  });
  if (payload.page) {
    currentPage = Math.max(1, Math.min(totalPages || Number(payload.page), Number(payload.page)));
    pageInput.value = String(currentPage);
  }
}

async function deleteFile(name) {
  if (!name) return;
  if (!confirm(`Șterg ${name}?`)) return;
  const res = await fetch(`/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || 'Nu am putut șterge documentul.');
    return;
  }
  if (currentFile === name) {
    currentFile = '';
    totalPages = 0;
    currentPage = 1;
    currentPageBox = null;
    pageTexts.clear();
    resetArticlesExportUi();
    setArticlesStatus('');
    ocrOutput.value = '';
    pageImage.classList.add('hidden');
    previewEmpty.textContent = 'Selectează un document și apoi o pagină.';
    previewEmpty.classList.remove('hidden');
    splitGuide.classList.add('hidden');
    exportLink.classList.add('hidden');
    jsonLink.classList.add('hidden');
    setDocMeta();
  }
  await refreshFiles();
  await refreshAdminProgressEntries();
  setStatus(`Document șters: ${name}`);
}

async function loadMeta() {
  if (!currentFile) return;
  const res = await fetch(`/pdf/meta/${encodeURIComponent(currentFile)}`);
  if (!res.ok) throw new Error('Nu am putut citi metadatele PDF.');
  const data = await res.json();
  totalPages = Number(data.pages || 0);
  if (!totalPages) throw new Error('PDF-ul nu are pagini disponibile.');
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  pageInput.value = String(currentPage);
  if (!rangeStartInput.value || Number(rangeStartInput.value) > totalPages) {
    rangeStartInput.value = '1';
  }
  if (!rangeEndInput.value || Number(rangeEndInput.value) > totalPages) {
    rangeEndInput.value = String(totalPages);
  }
  syncRangeInputs();
  setDocMeta();
}

async function loadPreview() {
  if (!currentFile) return;
  setDocMeta();
  const zoom = Number(zoomRange.value) / 100;
  try {
    const boxRes = await fetch(`/pdf/page_box/${encodeURIComponent(currentFile)}/${currentPage}`);
    if (boxRes.ok) {
      currentPageBox = await boxRes.json();
    } else {
      currentPageBox = null;
    }
  } catch (_) {
    currentPageBox = null;
  }
  pageImage.src = `/pdf/page_image/${encodeURIComponent(currentFile)}/${currentPage}?scale=${zoom}&rotation=${encodeURIComponent(getRotationValue())}&t=${Date.now()}`;
  pageImage.onload = () => {
    previewEmpty.classList.add('hidden');
    pageImage.classList.remove('hidden');
    updateSplitGuide();
  };
  pageImage.onerror = () => {
    previewEmpty.textContent = 'Preview-ul nu a putut fi încărcat pentru pagina selectată.';
    previewEmpty.classList.remove('hidden');
    pageImage.classList.add('hidden');
    splitGuide.classList.add('hidden');
  };
  restoreCurrentText();
  if (!pageTexts.has(currentPage)) {
    try {
      const mode = ocrMode.value === 'scan_page' ? 'scan' : 'document';
      const query = new URLSearchParams({
        file: currentFile,
        page: String(currentPage),
        rotation: String(getRotationValue()),
        mode,
      });
      const res = await fetch(`/ocr/cache?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.found) {
        setEditorText(data.text || '');
        pageTexts.set(currentPage, data.text || '');
        setStatus(`Am încărcat OCR-ul salvat pentru pagina ${currentPage}.`);
        return;
      }
    } catch (_) {
      // fall back to empty editor state
    }
  }
  setStatus('Preview încărcat. Poți rula OCR pe pagina curentă.');
}

async function loadSession() {
  const res = await fetch('/me');
  if (!res.ok) {
    setStudioVisible(false);
    return;
  }
  const data = await res.json();
  currentUser = data.user || '';
  isAdmin = Boolean(data.is_admin);
  userPill.textContent = currentUser ? `Utilizator: ${currentUser}` : '';
  setStudioVisible(true);
  adminProgressPanel?.classList.toggle('hidden', !isAdmin);
  await refreshFiles();
  await refreshAdminProgressEntries();
}

async function runOcr(force = false) {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }

  if (!force) {
    if (pageTexts.has(currentPage) && (pageTexts.get(currentPage) || '').trim()) {
      setEditorText(pageTexts.get(currentPage) || '');
      setStatus(`Am folosit OCR-ul deja disponibil pentru pagina ${currentPage}.`);
      return;
    }
    try {
      const mode = ocrMode.value === 'scan_page' ? 'scan' : 'document';
      const query = new URLSearchParams({
        file: currentFile,
        page: String(currentPage),
        rotation: String(getRotationValue()),
        mode,
      });
      const res = await fetch(`/ocr/cache?${query.toString()}`);
      const data = await res.json();
      if (res.ok && data.found) {
        setEditorText(data.text || '');
        pageTexts.set(currentPage, data.text || '');
        setStatus(`Am folosit OCR-ul salvat pentru pagina ${currentPage}.`);
        return;
      }
    } catch (_) {
      // fall through to OCR execution
    }
  }

  storeCurrentText();
  setStatus(force ? 'Refac OCR pe pagina curentă...' : 'Rulez OCR pe pagina curentă...');
  runOcrBtn.disabled = true;
  rerunOcrBtn.disabled = true;

  const form = new FormData();
  form.append('file', currentFile);
  form.append('page', String(currentPage));
  form.append('rotation', String(getRotationValue()));
  form.append('auto_export', 'true');

  const route = ocrMode.value === 'scan_page' ? '/scan/page' : '/ocr/google_page';

  try {
    const res = await fetch(route, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'OCR failed');
    }
    ocrOutput.value = data.text || '';
    storeCurrentText();
    setStatus(`OCR finalizat pentru pagina ${currentPage}.`);
    if (data.path) {
      exportLink.href = data.path;
      exportLink.classList.remove('hidden');
    }
  } catch (err) {
    setStatus(err.message || 'OCR failed.');
  } finally {
    runOcrBtn.disabled = false;
    rerunOcrBtn.disabled = false;
  }
}

async function startDocumentJob(start, end, labelPrefix) {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }

  const mode = ocrMode.value === 'scan_page' ? 'scan' : 'document';
  setStatus(`${labelPrefix} ${start}-${end}...`);
  stopJobPolling();
  activeJobId = null;
  runDocumentOcrBtn.disabled = true;
  runSelectionOcrBtn.disabled = true;
  runOcrBtn.disabled = true;
  setProgress(0, `Se pornește jobul pentru paginile ${start}-${end}...`);

  const form = new FormData();
  form.append('file', currentFile);
  form.append('rotation', String(getRotationValue()));
  form.append('mode', mode);
  form.append('start_page', String(start));
  form.append('end_page', String(end));

  try {
    const res = await fetch('/ocr/google_document_async', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'OCR document failed');
    }
    activeJobId = data.job_id;
    pollJobStatus();
  } catch (err) {
    resetProgress();
    setStatus(err.message || 'OCR document failed.');
    runDocumentOcrBtn.disabled = false;
    runSelectionOcrBtn.disabled = false;
    runOcrBtn.disabled = false;
  }
}

async function runSelectionOcr() {
  const { start, end } = getSelectedRange();
  await startDocumentJob(start, end, 'Rulez OCR pentru selecția');
}

async function runDocumentOcr() {
  await startDocumentJob(1, totalPages, 'Rulez OCR pentru tot PDF-ul');
}

async function pollJobStatus() {
  if (!activeJobId) return;
  try {
    const res = await fetch(`/ocr/job/${encodeURIComponent(activeJobId)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut citi progresul jobului.');
    }

    const total = Number(data.total_pages || totalPages || 0);
    const current = Number(data.current_page || 0);
    const start = Number(data.start_page || 1);
    const end = Number(data.end_page || total);
    setProgress(data.progress || 0, `Pagina ${current} din intervalul ${start}-${end}`);

    if (data.status === 'done') {
      stopJobPolling();
      pageTexts.clear();
      const incomingPages = data.pages && typeof data.pages === 'object' ? data.pages : {};
      Object.entries(incomingPages).forEach(([pageNo, text]) => {
        pageTexts.set(Number(pageNo), typeof text === 'string' ? text : '');
      });
      ocrOutput.value = data.text || '';
      setProgress(100, `OCR complet pentru intervalul ${start}-${end}.`);
      setStatus(`OCR complet finalizat pentru paginile ${start}-${end}.`);
      runDocumentOcrBtn.disabled = false;
      runSelectionOcrBtn.disabled = false;
      runOcrBtn.disabled = false;
      activeJobId = null;
      return;
    }

    if (data.status === 'error') {
      stopJobPolling();
      setStatus(data.error || 'OCR document failed.');
      runDocumentOcrBtn.disabled = false;
      runSelectionOcrBtn.disabled = false;
      runOcrBtn.disabled = false;
      activeJobId = null;
      return;
    }

    if (data.text) {
      ocrOutput.value = data.text;
    }
    activeJobTimer = setTimeout(pollJobStatus, 1200);
  } catch (err) {
    stopJobPolling();
    setStatus(err.message || 'Nu am putut citi progresul.');
    runDocumentOcrBtn.disabled = false;
    runSelectionOcrBtn.disabled = false;
    runOcrBtn.disabled = false;
    activeJobId = null;
  }
}

async function saveProgress() {
  if (!currentFile) return;
  storeCurrentText();
  const pages = {};
  for (const [pageNo, text] of pageTexts.entries()) {
    if (typeof text === 'string' && text.trim()) {
      pages[String(pageNo)] = text;
    }
  }

  const form = new FormData();
  form.append('text', ocrOutput.value);
  form.append('file', currentFile);
  form.append('page', String(currentPage));
  form.append('pages_json', JSON.stringify(pages));

  const res = await fetch('/save/progress', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || 'Nu am putut salva progresul.');
    return;
  }
  await refreshAdminProgressEntries();
  setStatus('Progres salvat.');
}

async function exportJson() {
  if (!currentFile) return;
  storeCurrentText();
  const pages = {};
  for (const [pageNo, text] of pageTexts.entries()) {
    if (typeof text === 'string' && text.trim()) {
      pages[String(pageNo)] = text;
    }
  }

  const payload = {
    file: currentFile,
    user: currentUser,
    page: currentPage,
    pages,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch('/export/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    setStatus(data.detail || 'Nu am putut exporta JSON.');
    return;
  }
  jsonLink.href = data.path;
  jsonLink.classList.remove('hidden');
  setStatus('JSON exportat.');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const form = new FormData(loginForm);
  const res = await fetch('/login', { method: 'POST', body: form });
  if (!res.ok) {
    loginError.textContent = 'Autentificare eșuată.';
    return;
  }
  await loadSession();
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  currentFile = '';
  files = [];
  pageTexts.clear();
  resetArticlesExportUi();
  setArticlesStatus('');
  ocrOutput.value = '';
  renderFiles();
  setStudioVisible(false);
});

uploadBtn.addEventListener('click', async () => {
  if (!fileInput.files.length) {
    setStatus('Alege cel puțin un PDF pentru upload.');
    return;
  }
  uploadBtn.disabled = true;
  try {
    let lastUploadedName = '';
    for (const file of Array.from(fileInput.files)) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Upload failed for ${file.name}`);
      lastUploadedName = data.filename || file.name;
    }
    fileInput.value = '';
    await refreshFiles();
    if (lastUploadedName) {
      await selectFile(lastUploadedName);
      setStatus(`Upload finalizat. Document activ: ${lastUploadedName}. Split master-ul lui va fi separat.`);
    } else {
      setStatus('Upload finalizat.');
    }
    await refreshAdminProgressEntries();
  } catch (err) {
    setStatus(err.message || 'Upload failed.');
  } finally {
    uploadBtn.disabled = false;
  }
});

fileSelect.addEventListener('change', async () => {
  if (!fileSelect.value) return;
  await selectFile(fileSelect.value);
});

deleteCurrentFileBtn.addEventListener('click', async () => {
  if (!currentFile) return;
  await deleteFile(currentFile);
});

loadLatestSplitBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/files/latest_split');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu există PDF splitat disponibil.');
    }
    await selectFile(data.filename);
    setStatus(`Am deschis ultimul split: ${data.filename}`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut încărca ultimul split.');
  }
});

pageInput.addEventListener('change', async () => {
  if (!currentFile || !totalPages) return;
  const nextPage = Math.max(1, Math.min(totalPages, Number(pageInput.value || currentPage)));
  storeCurrentText();
  currentPage = nextPage;
  pageInput.value = String(currentPage);
  await loadPreview();
});

rangeStartInput.addEventListener('change', () => {
  syncRangeInputs();
});

rangeEndInput.addEventListener('change', () => {
  syncRangeInputs();
});

splitShiftInput.addEventListener('input', () => {
  updateSplitGuide();
  saveShiftPresetForCurrentFile();
});

prevPageBtn.addEventListener('click', async () => {
  if (!currentFile || currentPage <= 1) return;
  storeCurrentText();
  currentPage -= 1;
  pageInput.value = String(currentPage);
  await loadPreview();
});

nextPageBtn.addEventListener('click', async () => {
  if (!currentFile || currentPage >= totalPages) return;
  storeCurrentText();
  currentPage += 1;
  pageInput.value = String(currentPage);
  await loadPreview();
});

zoomRange.addEventListener('input', () => {
  zoomLabel.textContent = `${zoomRange.value}%`;
});

zoomRange.addEventListener('change', async () => {
  if (!currentFile) return;
  await loadPreview();
});

rotationInput.addEventListener('change', async () => {
  if (!currentFile) return;
  await loadPreview();
});

rotMinus5Btn.addEventListener('click', async () => {
  setRotationValue(getRotationValue() - 5);
  if (currentFile) await loadPreview();
});

rotMinus1Btn.addEventListener('click', async () => {
  setRotationValue(getRotationValue() - 1);
  if (currentFile) await loadPreview();
});

rotPlus1Btn.addEventListener('click', async () => {
  setRotationValue(getRotationValue() + 1);
  if (currentFile) await loadPreview();
});

rotPlus5Btn.addEventListener('click', async () => {
  setRotationValue(getRotationValue() + 5);
  if (currentFile) await loadPreview();
});

rotResetBtn.addEventListener('click', async () => {
  setRotationValue(0);
  if (currentFile) await loadPreview();
});

document.querySelectorAll('#split-presets .preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    splitShiftInput.value = btn.dataset.shift || '0';
    updateSplitGuide();
    saveShiftPresetForCurrentFile();
  });
});

toggleSplitToolsBtn.addEventListener('click', () => {
  const nextHidden = !splitTools.classList.contains('hidden');
  splitTools.classList.toggle('hidden', nextHidden);
  toggleSplitToolsBtn.textContent = nextHidden ? 'Arată unelte split' : 'Ascunde unelte split';
  updateSplitGuide();
});

pageImage.addEventListener('click', (event) => {
  if (!currentPageBox || !currentPageBox.width || pageImage.classList.contains('hidden')) return;
  const rect = pageImage.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ratio = x / Math.max(rect.width, 1);
  const shift = (ratio - 0.5) * Number(currentPageBox.width);
  splitShiftInput.value = String(Math.round(shift));
  updateSplitGuide();
  saveShiftPresetForCurrentFile();
});

runOcrBtn.addEventListener('click', runOcr);
rerunOcrBtn.addEventListener('click', async () => {
  await runOcr(true);
});
runSelectionOcrBtn.addEventListener('click', runSelectionOcr);
runDocumentOcrBtn.addEventListener('click', runDocumentOcr);
saveProgressBtn.addEventListener('click', saveProgress);
exportJsonBtn.addEventListener('click', exportJson);

copyTextBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(ocrOutput.value || '');
    setStatus('Text copiat.');
  } catch (_) {
    setStatus('Clipboard indisponibil în acest browser.');
  }
});

undoTextBtn.addEventListener('click', () => {
  applyUndo();
});

redoTextBtn.addEventListener('click', () => {
  applyRedo();
});

normTextBtn.addEventListener('click', () => {
  pushUndoState();
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  if (start !== end) {
    const src = ocrOutput.value || '';
    const normalized = normalizeSentences(src.slice(start, end));
    ocrOutput.value = `${src.slice(0, start)}${normalized}${src.slice(end)}`;
    ocrOutput.focus();
    ocrOutput.setSelectionRange(start, start + normalized.length);
  } else {
    ocrOutput.value = normalizeSentences(ocrOutput.value || '');
  }
  storeCurrentText();
  setStatus('Text normalizat.');
  updateTextHistoryButtons();
});

cleanTextBtn.addEventListener('click', async () => {
  try {
    pushUndoState();
    const res = await fetch('/text/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ocrOutput.value || '' }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut curăța textul.');
    }
    setEditorText(data.text || '');
    setStatus('Text curățat pe pași de antete, ștampile și paginare editorială.');
    updateTextHistoryButtons();
  } catch (err) {
    setStatus(err.message || 'Nu am putut curăța textul.');
  }
});

exportArticlesBtn.addEventListener('click', async () => {
  const text = ocrOutput.value || '';
  if (!text.trim()) {
    setStatus('Nu există text pentru export.');
    return;
  }
  const suggestedName = `${slugifyFileName(currentFile || 'ocr-corectat')}.txt`;
  const chosenName = window.prompt('Numele fișierului TXT:', suggestedName);
  if (chosenName === null) {
    setStatus('Exportul TXT a fost anulat.');
    return;
  }
  const safeName = String(chosenName).trim() || suggestedName;
  const finalName = safeName.toLowerCase().endsWith('.txt') ? safeName : `${safeName}.txt`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = finalName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  setStatus(`TXT exportat: ${finalName}.`);
});

importTxtBtn.addEventListener('click', () => {
  importTxtInput.click();
});

importTxtInput.addEventListener('change', async () => {
  const file = importTxtInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    pushUndoState();
    setEditorText(text);
    storeCurrentText();
    setStatus(`TXT importat în editor: ${file.name}`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut importa TXT-ul.');
  } finally {
    importTxtInput.value = '';
  }
});

adminProgressLoadBtn?.addEventListener('click', async () => {
  if (!adminProgressSelect.value) return;
  try {
    const { owner, file } = JSON.parse(adminProgressSelect.value);
    const query = new URLSearchParams({ file, owner });
    const res = await fetch(`/progress/load?${query.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.found || !data.payload) {
      throw new Error(data.detail || 'Nu am putut încărca progresul selectat.');
    }
    await selectFile(file);
    applyProgressPayload(data.payload);
    await loadPreview();
    setStatus(`Admin: progres încărcat pentru ${owner} / ${file}.`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut încărca progresul selectat.');
  }
});

adminProgressUserFilter?.addEventListener('change', () => {
  if (adminProgressDocFilter) {
    adminProgressDocFilter.value = '';
  }
  renderAdminProgressEntries();
});

adminProgressDocFilter?.addEventListener('change', () => {
  renderAdminProgressEntries();
});

ocrOutput.addEventListener('input', () => {
  if (suppressHistory) return;
  storeCurrentText();
});

async function submitSplitPdf(start, end) {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }
  const activeBeforeSplit = currentFile;
  const form = new FormData();
  form.append('file', currentFile);
  form.append('start_page', String(start));
  form.append('end_page', String(end));
  form.append('shift', String(splitShiftInput.value || '18'));
  form.append('rotation', String(getRotationValue()));

  splitPdfBtn.disabled = true;
  splitSelectionPdfBtn.disabled = true;
  try {
    saveShiftPresetForCurrentFile();
    const res = await fetch('/pdf/split', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut face split pentru PDF.');
    }
    await refreshFiles();
    const sourceToKeep = data.source_file || activeBeforeSplit;
    await selectFile(sourceToKeep);
    const appended = Number(data.appended_pages || 0);
    const total = Number(data.pages || 0);
    setStatus(`Split PDF actualizat: ${data.filename}. Am adăugat ${appended} pagini noi, total ${total}. Ai rămas pe documentul sursă pentru a continua cu următoarele pagini.`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut face split pentru PDF.');
  } finally {
    splitPdfBtn.disabled = false;
    splitSelectionPdfBtn.disabled = false;
  }
}

async function removePagesFromSplitMaster(start, end) {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }
  if (!currentFile.toLowerCase().endsWith('_split_master.pdf')) {
    setStatus('Deschide mai întâi documentul split master din care vrei să ștergi pagini.');
    return;
  }
  if (!confirm(`Șterg paginile ${start}-${end} din ${currentFile}?`)) {
    return;
  }

  removeSplitPagesBtn.disabled = true;
  try {
    const form = new FormData();
    form.append('file', currentFile);
    form.append('start_page', String(start));
    form.append('end_page', String(end));

    const res = await fetch('/pdf/remove_pages', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut șterge paginile din split master.');
    }
    await refreshFiles();
    await selectFile(data.filename);
    currentPage = Math.max(1, Math.min(Number(data.current_page || 1), Number(data.pages || 1)));
    pageInput.value = String(currentPage);
    await loadPreview();
    setStatus(`Am șters paginile ${start}-${end} din ${data.filename}. Au rămas ${data.pages} pagini.`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut șterge paginile din split master.');
  } finally {
    removeSplitPagesBtn.disabled = false;
  }
}

async function rotateCurrentPageBy(angle) {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }
  const normalized = Number(angle || 0);
  if (![90, -90, 180, -180].includes(normalized)) {
    setStatus('Unghi invalid pentru rotația paginii.');
    return;
  }

  rotatePageLeft90Btn.disabled = true;
  rotatePageRight90Btn.disabled = true;
  try {
    const form = new FormData();
    form.append('file', currentFile);
    form.append('page', String(currentPage));
    form.append('angle', String(normalized));

    const res = await fetch('/pdf/rotate_page', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut roti pagina selectată.');
    }
    rotationInput.value = '0';
    await loadPreview();
    setStatus(`Pagina ${currentPage} a fost rotită cu ${normalized}° în ${data.filename}.`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut roti pagina selectată.');
  } finally {
    updateContextActions();
  }
}

async function cleanCurrentPageImage() {
  if (!currentFile) {
    setStatus('Selectează mai întâi un PDF.');
    return;
  }

  cleanPageImageBtn.disabled = true;
  try {
    const form = new FormData();
    form.append('file', currentFile);
    form.append('page', String(currentPage));

    const res = await fetch('/pdf/clean_page', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Nu am putut curăța pagina selectată.');
    }
    rotationInput.value = '0';
    await loadPreview();
    setStatus(`Pagina ${currentPage} a fost curățată vizual în ${data.filename}.`);
  } catch (err) {
    setStatus(err.message || 'Nu am putut curăța pagina selectată.');
  } finally {
    updateContextActions();
  }
}

splitSelectionPdfBtn.addEventListener('click', async () => {
  const { start, end } = getSelectedRange();
  await submitSplitPdf(start, end);
});

splitPdfBtn.addEventListener('click', async () => {
  await submitSplitPdf(1, totalPages);
});

removeSplitPagesBtn.addEventListener('click', async () => {
  const { start, end } = getSelectedRange();
  await removePagesFromSplitMaster(start, end);
});

rotatePageLeft90Btn.addEventListener('click', async () => {
  await rotateCurrentPageBy(-90);
});

rotatePageRight90Btn.addEventListener('click', async () => {
  await rotateCurrentPageBy(90);
});

cleanPageImageBtn.addEventListener('click', async () => {
  await cleanCurrentPageImage();
});

window.addEventListener('resize', updateSplitGuide);
previewStage.addEventListener('scroll', updateSplitGuide);

loadSession();
updateTextHistoryButtons();

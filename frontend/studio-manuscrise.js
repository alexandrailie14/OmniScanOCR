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
const previewGrid = document.querySelector('.preview-grid');
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
const toggleAnnotationFocusBtn = document.getElementById('toggle-annotation-focus');
const exportArticlesBtn = document.getElementById('export-articles');
const importJsonBtn = document.getElementById('import-json');
const importJsonInput = document.getElementById('import-json-input');
const saveProgressBtn = document.getElementById('save-progress');
const exportJsonBtn = document.getElementById('export-json');
const finishAnnotationBtn = document.getElementById('finish-annotation');
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
const annotationTagSelect = document.getElementById('annotation-tag-select');
const annotationTagInput = document.getElementById('annotation-tag-input');
const annotationTagColor = document.getElementById('annotation-tag-color');
const annotationTagAddBtn = document.getElementById('annotation-tag-add');
const annotationApplyTagBtn = document.getElementById('annotation-apply-tag');
const annotationRemoveTagBtn = document.getElementById('annotation-remove-tag');
const annotationUndoTagBtn = document.getElementById('annotation-undo-tag');
const annotationGroupMainSelect = document.getElementById('annotation-group-main-select');
const annotationPreview = document.getElementById('annotation-preview');
const annotationRecords = document.getElementById('annotation-records');
const annotationCount = document.getElementById('annotation-count');
const annotationQuickPanel = document.getElementById('annotation-quick-panel');
const annotationSelectionLabel = document.getElementById('annotation-selection-label');
const annotationGroupSelect = document.getElementById('annotation-group-select');
const annotationCodeSelect = document.getElementById('annotation-code-select');
const annotationQuickAddBtn = document.getElementById('annotation-quick-add');
const annotationSeverity = document.getElementById('annotation-severity');
const annotationLevel = document.getElementById('annotation-level');
const annotationCause = document.getElementById('annotation-cause');
const annotationDifficulty = document.getElementById('annotation-difficulty');
const annotationConfidence = document.getElementById('annotation-confidence');
const annotationActiveLabel = document.getElementById('annotation-active-label');

let files = [];
let currentUser = '';
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
const CUSTOM_ANNOTATION_TAGS_STORAGE_KEY = 'studioManuscriseCustomTags';
const AUTOSAVE_STORAGE_KEY = 'studioManuscriseAutosave';
const MANUAL_DOCUMENT_KEY = '__manual_workspace__';
const textUndoStack = [];
const textRedoStack = [];
let suppressHistory = false;
const ANNOTATION_TAXONOMY = [
  {
    category: 'Ortografie și grafie',
    color: '#d8574f',
    items: [
      { code: 'ORT-DIAC', label: 'Diacritice', description: 'Lipsa sau folosirea greșită a diacriticelor.' },
      { code: 'ORT-LIT', label: 'Literă greșită', description: 'Literă greșită în interiorul cuvântului.' },
      { code: 'ORT-OMIS', label: 'Omisie literă', description: 'Omiterea unei litere sau silabe.' },
      { code: 'ORT-ADAOS', label: 'Adaos literă', description: 'Adăugarea unei litere sau silabe.' },
      { code: 'ORT-DUBL', label: 'Dublare', description: 'Dublare nejustificată de literă.' },
      { code: 'ORT-SEG', label: 'Segmentare', description: 'Segmentare greșită a cuvintelor.' },
      { code: 'ORT-MAJ', label: 'Majuscule', description: 'Majusculă sau minusculă greșită.' },
      { code: 'ORT-APO', label: 'Apostrof / semne', description: 'Apostrof ori semne grafice folosite impropriu.' },
      { code: 'ORT-HIF', label: 'Cratimă', description: 'Cratimă omisă sau greșită.' },
      { code: 'ORT-FON', label: 'Scriere fonetică', description: 'Scriere după pronunțare.' },
    ],
  },
  {
    category: 'Punctuație',
    color: '#e0873f',
    items: [
      { code: 'PUNC-PUNCT', label: 'Punct final', description: 'Lipsa punctului final sau segmentare greșită de enunț.' },
      { code: 'PUNC-VIRG', label: 'Virgulă', description: 'Virgulă omisă sau plasată greșit.' },
      { code: 'PUNC-ENUM', label: 'Enumerație', description: 'Punctuație defectuoasă în enumerații.' },
      { code: 'PUNC-INT', label: 'Interogativ / exclamativ', description: 'Semn de întrebare ori exclamare greșit sau lipsă.' },
      { code: 'PUNC-CIT', label: 'Ghilimele / dialog', description: 'Ghilimele, două puncte sau linie de dialog folosite greșit.' },
    ],
  },
  {
    category: 'Morfologie nominală',
    color: '#d0a23d',
    items: [
      { code: 'MORF-GEN', label: 'Gen gramatical', description: 'Gen gramatical greșit.' },
      { code: 'MORF-NR', label: 'Număr', description: 'Număr greșit.' },
      { code: 'MORF-CAZ', label: 'Caz', description: 'Formă de caz greșită.' },
      { code: 'MORF-ART-H', label: 'Articol hotărât', description: 'Articol hotărât greșit.' },
      { code: 'MORF-ART-N', label: 'Articol nehotărât', description: 'Articol nehotărât greșit.' },
      { code: 'MORF-ART-ZERO', label: 'Articol omis', description: 'Omiterea articolului când este necesar.' },
      { code: 'MORF-DEM', label: 'Demonstrativ', description: 'Demonstrativ greșit.' },
      { code: 'MORF-POS', label: 'Posesiv', description: 'Posesiv greșit.' },
      { code: 'MORF-PRON', label: 'Pronume', description: 'Pronume personal sau reflexiv greșit.' },
      { code: 'MORF-CLIT', label: 'Clitic', description: 'Clitice pronominale greșite sau omise.' },
    ],
  },
  {
    category: 'Acord',
    color: '#95b54a',
    items: [
      { code: 'ACORD-SN', label: 'Acord grup nominal', description: 'Neacord în grupul nominal.' },
      { code: 'ACORD-ADJ', label: 'Acord adjectiv', description: 'Adjectiv neacordat cu substantivul.' },
      { code: 'ACORD-NP', label: 'Acord subiect-predicat', description: 'Acord subiect-predicat greșit.' },
      { code: 'ACORD-PN', label: 'Acord nume predicativ', description: 'Acord greșit în nume predicativ.' },
    ],
  },
  {
    category: 'Sistem verbal',
    color: '#4fa967',
    items: [
      { code: 'VERB-CONJ', label: 'Conjugare', description: 'Conjugare greșită.' },
      { code: 'VERB-PERS', label: 'Persoană verbală', description: 'Persoană verbală greșită.' },
      { code: 'VERB-TIMP', label: 'Timp verbal', description: 'Timp verbal greșit.' },
      { code: 'VERB-MOD', label: 'Mod verbal', description: 'Mod verbal greșit.' },
      { code: 'VERB-AUX', label: 'Auxiliar', description: 'Auxiliar greșit sau omis.' },
      { code: 'VERB-INF-SUBJ', label: 'Infinitiv / subjonctiv', description: 'Infinitivul și subjonctivul folosite greșit.' },
      { code: 'VERB-REFL', label: 'Reflexiv verbal', description: 'Verb reflexiv folosit greșit.' },
      { code: 'VERB-PART', label: 'Participiu', description: 'Participiu greșit.' },
      { code: 'VERB-SUPIN', label: 'Supin', description: 'Supin sau construcție verbală neadecvată.' },
      { code: 'VERB-COP', label: 'Copulă', description: 'Copula „a fi” omisă sau greșită.' },
    ],
  },
  {
    category: 'Prepoziții și regim',
    color: '#39a59c',
    items: [
      { code: 'PREP-ALEG', label: 'Alegere prepoziție', description: 'Prepoziție nepotrivită.' },
      { code: 'PREP-OMIS', label: 'Prepoziție omisă', description: 'Omiterea prepoziției.' },
      { code: 'PREP-ADAOS', label: 'Prepoziție adăugată', description: 'Prepoziție adăugată inutil.' },
      { code: 'PREP-REG', label: 'Regim prepozițional', description: 'Regim prepozițional greșit al verbului sau adjectivului.' },
      { code: 'PREP-PE', label: 'Pe', description: 'Folosirea greșită a lui „pe”.' },
    ],
  },
  {
    category: 'Sintaxă propozițională',
    color: '#4d8fc7',
    items: [
      { code: 'SINT-TOP', label: 'Topică', description: 'Topică nefirească sau negramaticală.' },
      { code: 'SINT-NEG', label: 'Negație', description: 'Negație greșită.' },
      { code: 'SINT-INT', label: 'Interogativ', description: 'Structură interogativă defectuoasă.' },
      { code: 'SINT-SUB', label: 'Subiect', description: 'Subiect omis sau exprimat nepotrivit.' },
      { code: 'SINT-OBJ', label: 'Complement', description: 'Complement construit defectuos.' },
      { code: 'SINT-REL', label: 'Relativă', description: 'Propoziție relativă greșită.' },
      { code: 'SINT-CONJ', label: 'Conector subordonare', description: 'Conector sau subordonator nepotrivit.' },
      { code: 'SINT-ELIP', label: 'Elipsă', description: 'Elipsă nepermisă care afectează gramaticalitatea.' },
    ],
  },
  {
    category: 'Lexic și selecție lexicală',
    color: '#7565cb',
    items: [
      { code: 'LEX-CALC', label: 'Calc lexical', description: 'Calc lexical sau structural după limba maternă.' },
      { code: 'LEX-CONF', label: 'Confuzie formală', description: 'Confuzie între cuvinte apropiate formal.' },
      { code: 'LEX-POLI', label: 'Polisemie', description: 'Sens greșit al unui cuvânt polisemantic.' },
      { code: 'LEX-COL', label: 'Colocație', description: 'Colocație nenaturală.' },
      { code: 'LEX-REG', label: 'Registru', description: 'Registru nepotrivit.' },
      { code: 'LEX-REP', label: 'Repetiție', description: 'Repetiție lexicală excesivă.' },
      { code: 'LEX-OMIS', label: 'Omis lexical', description: 'Omiterea unui item lexical obligatoriu.' },
      { code: 'LEX-INVENT', label: 'Cuvânt inventat', description: 'Cuvânt inventat sau românizat impropriu.' },
    ],
  },
  {
    category: 'Semantică și adecvare',
    color: '#ad5fb9',
    items: [
      { code: 'SEM-INCOH', label: 'Incoerență semantică', description: 'Enunț semantic incoerent.' },
      { code: 'SEM-AMB', label: 'Ambiguitate', description: 'Ambiguitate neintenționată.' },
      { code: 'SEM-RED', label: 'Redundanță', description: 'Redundanță semantică.' },
      { code: 'SEM-LOG', label: 'Relație logică', description: 'Relație logică greșită între propoziții.' },
    ],
  },
  {
    category: 'Coeziune și discurs',
    color: '#c55d8f',
    items: [
      { code: 'DISC-CON', label: 'Conector discursiv', description: 'Conector discursiv nepotrivit.' },
      { code: 'DISC-REF', label: 'Referință anaforică', description: 'Referință anaforică neclară.' },
      { code: 'DISC-TEMP', label: 'Succesiune temporală', description: 'Succesiune temporală inconsistentă.' },
      { code: 'DISC-TEMA', label: 'Progresie tematică', description: 'Ruptură tematică sau lipsă de progresie.' },
      { code: 'DISC-GEN', label: 'Gen textual', description: 'Nerespectarea convențiilor genului textual.' },
    ],
  },
  {
    category: 'Interferență și strategii',
    color: '#9a5a6d',
    items: [
      { code: 'INT-L1', label: 'Transfer L1', description: 'Transfer direct din limba maternă.' },
      { code: 'INT-L2', label: 'Transfer L2', description: 'Transfer din altă limbă străină cunoscută.' },
      { code: 'HIPER', label: 'Hipercorectitudine', description: 'Hipercorectitudine.' },
      { code: 'EVIT', label: 'Evitare', description: 'Evitare structurală vizibilă.' },
    ],
  },
];
let customAnnotationTags = [];
const annotationsByPage = new Map();
const annotationHistoryByPage = new Map();
let activeAnnotationCode = 'ORT-DIAC';
let currentSelectionRange = null;
let annotationGuideCache = null;
let isAnnotationFocusMode = false;
let manualSessionLabel = 'Sesiune manuală';
let autosaveTimer = null;
let isRestoringAutosave = false;

function getBaseAnnotationGroups() {
  return ANNOTATION_TAXONOMY.map((group) => ({
    key: String(group.items[0]?.code || '').split('-')[0] || group.category,
    category: group.category,
    color: sanitizeAnnotationColor(group.color),
    items: group.items.map((item) => ({
      ...item,
      color: sanitizeAnnotationColor(item.color || group.color),
      category: group.category,
    })),
  }));
}

function getBaseAnnotationGroupByKey(groupKey) {
  return getBaseAnnotationGroups().find((group) => group.key === groupKey) || null;
}

function loadCustomAnnotationTags() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_ANNOTATION_TAGS_STORAGE_KEY) || '[]');
    if (Array.isArray(raw)) {
      return raw
        .map((value) => {
          if (typeof value === 'string') {
            const code = sanitizeAnnotationCode(value);
            const groupKey = String(code || '').split('-')[0] || 'CUSTOM';
            const baseGroup = getBaseAnnotationGroupByKey(groupKey);
            return code ? {
              code,
              label: formatAnnotationLabel(code),
              color: '#a8573b',
              groupKey,
              category: baseGroup?.category || 'Personalizate',
              description: 'Etichetă personalizată.',
            } : null;
          }
          const code = sanitizeAnnotationCode(value?.code || value?.id || value?.name);
          if (!code) return null;
          const groupKey = sanitizeAnnotationCode(value?.groupKey || String(code).split('-')[0] || 'CUSTOM');
          const baseGroup = getBaseAnnotationGroupByKey(groupKey);
          return {
            code,
            label: String(value?.label || formatAnnotationLabel(code)),
            color: sanitizeAnnotationColor(value?.color),
            groupKey,
            category: String(value?.category || baseGroup?.category || 'Personalizate'),
            description: String(value?.description || 'Etichetă personalizată.'),
          };
        })
        .filter(Boolean);
    }
  } catch (_) {
    return [];
  }
  return [];
}

function saveCustomAnnotationTags() {
  localStorage.setItem(CUSTOM_ANNOTATION_TAGS_STORAGE_KEY, JSON.stringify(customAnnotationTags));
  scheduleAutosave();
}

function sanitizeAnnotationCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeAnnotationColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim()) ? String(value).trim() : '#a8573b';
}

function formatAnnotationLabel(value) {
  const normalized = sanitizeAnnotationCode(value).replace(/[_:.-]+/g, ' ').trim().toLowerCase();
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function hexToRgba(hex, alpha) {
  const normalized = sanitizeAnnotationColor(hex).replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getAllAnnotationTags() {
  const map = new Map();
  getBaseAnnotationGroups().forEach((group) => {
    group.items.forEach((item) => {
      map.set(item.code, {
        ...item,
        color: sanitizeAnnotationColor(item.color || group.color),
        category: group.category,
      });
    });
  });
  customAnnotationTags.forEach((item) => {
    map.set(item.code, {
      ...item,
      color: sanitizeAnnotationColor(item.color),
    });
  });
  return Array.from(map.values());
}

function getAnnotationTagMeta(code) {
  const normalized = sanitizeAnnotationCode(code);
  return getAllAnnotationTags().find((tag) => tag.code === normalized) || null;
}

function getAnnotationGroups() {
  const groups = getBaseAnnotationGroups();
  customAnnotationTags.forEach((item) => {
    const groupKey = sanitizeAnnotationCode(item.groupKey || String(item.code).split('-')[0]);
    const targetGroup = groups.find((group) => group.key === groupKey);
    const normalizedItem = {
      ...item,
      groupKey,
      color: sanitizeAnnotationColor(item.color),
      category: item.category || targetGroup?.category || 'Personalizate',
    };
    if (targetGroup) {
      if (!targetGroup.items.some((existing) => existing.code === normalizedItem.code)) {
        targetGroup.items.push(normalizedItem);
      }
      return;
    }
    groups.push({
      key: groupKey || 'CUSTOM',
      category: normalizedItem.category || 'Personalizate',
      color: normalizedItem.color,
      items: [normalizedItem],
    });
  });
  return groups;
}

function getAnnotationGroupByKey(groupKey) {
  return getAnnotationGroups().find((group) => group.key === groupKey) || getAnnotationGroups()[0] || null;
}

function getAnnotationGroupKeyByCode(code) {
  return getAnnotationGroups().find((group) => group.items.some((item) => item.code === code))?.key || '';
}

function fillAnnotationGroupSelect(selectNode, selectedKey) {
  if (!selectNode) return;
  const groups = getAnnotationGroups();
  selectNode.innerHTML = '';
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = group.key;
    option.textContent = group.key;
    option.selected = group.key === selectedKey;
    selectNode.appendChild(option);
  });
  if (!selectNode.value && groups.length) {
    selectNode.value = selectedKey || groups[0].key;
  }
}

function fillAnnotationCodeSelect(selectNode, groupKey, selectedCode) {
  if (!selectNode) return '';
  const group = getAnnotationGroupByKey(groupKey);
  const items = group?.items || [];
  selectNode.innerHTML = '';
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.code;
    option.textContent = item.code;
    option.selected = item.code === selectedCode;
    selectNode.appendChild(option);
  });
  const nextCode = items.some((item) => item.code === selectedCode)
    ? selectedCode
    : (items[0]?.code || '');
  if (nextCode) {
    selectNode.value = nextCode;
  }
  return nextCode;
}

function syncQuickAnnotationSelectors(preferredCode = activeAnnotationCode, preferredGroupKey = '') {
  if (!annotationGroupSelect || !annotationCodeSelect || !annotationGroupMainSelect || !annotationTagSelect) return;
  const groups = getAnnotationGroups();
  const fallbackGroupKey = groups[0]?.key || '';
  const resolvedGroupKey = preferredGroupKey || getAnnotationGroupKeyByCode(preferredCode) || fallbackGroupKey;

  fillAnnotationGroupSelect(annotationGroupMainSelect, resolvedGroupKey);
  fillAnnotationGroupSelect(annotationGroupSelect, resolvedGroupKey);

  const resolvedCode = fillAnnotationCodeSelect(annotationTagSelect, resolvedGroupKey, preferredCode);
  fillAnnotationCodeSelect(annotationCodeSelect, resolvedGroupKey, resolvedCode);

  activeAnnotationCode = annotationCodeSelect.value || annotationTagSelect.value || resolvedCode || activeAnnotationCode;
  annotationTagSelect.value = activeAnnotationCode;
  annotationCodeSelect.value = activeAnnotationCode;
}

function renderAnnotationTags() {
  if (!annotationTagSelect) return;
  const tags = getAllAnnotationTags();
  if (!annotationTagSelect.value && tags.length) {
    annotationTagSelect.value = tags[0].code;
  }
  activeAnnotationCode = annotationTagSelect.value || activeAnnotationCode;
  const activeMeta = getAnnotationTagMeta(activeAnnotationCode);
  annotationActiveLabel.textContent = activeMeta ? activeMeta.code : 'Alege un cod';
  syncQuickAnnotationSelectors(activeAnnotationCode);
}

function refreshActiveAnnotationLabel() {
  const activeMeta = getAnnotationTagMeta(activeAnnotationCode);
  if (annotationActiveLabel) {
    annotationActiveLabel.textContent = activeMeta ? activeMeta.code : 'Alege un cod';
  }
}

function getPageAnnotationKey(fileName = getActiveDocumentId(), pageNo = currentPage) {
  return fileName ? `${fileName}::${pageNo}` : '';
}

function cloneAnnotations(items) {
  return items.map((item) => ({ ...item }));
}

function getCurrentAnnotations() {
  const key = getPageAnnotationKey();
  return key ? (annotationsByPage.get(key) || []) : [];
}

function setCurrentAnnotations(items) {
  const key = getPageAnnotationKey();
  if (!key) return;
  annotationsByPage.set(key, cloneAnnotations(items));
  scheduleAutosave();
}

function getAnnotationHistory(key = getPageAnnotationKey()) {
  return annotationHistoryByPage.get(key) || [];
}

function pushAnnotationHistory() {
  const key = getPageAnnotationKey();
  if (!key) return;
  const history = getAnnotationHistory(key);
  history.push(cloneAnnotations(getCurrentAnnotations()));
  if (history.length > 100) history.shift();
  annotationHistoryByPage.set(key, history);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sortAnnotations(items) {
  return cloneAnnotations(items).sort((a, b) => a.start - b.start || a.end - b.end);
}

function hasOverlap(start, end, annotations, ignoreId = '') {
  return annotations.some((item) => {
    if (ignoreId && item.id === ignoreId) return false;
    return !(end <= item.start || start >= item.end);
  });
}

function getSelectedAnnotationMeta() {
  return {
    severity: annotationSeverity?.value || 'medie',
    level: annotationLevel?.value || 'cuvant',
    cause: annotationCause?.value || 'transfer_l1',
    difficulty: annotationDifficulty?.value || 'mediu',
    confidence: annotationConfidence?.value || 'cert',
  };
}

function renderAnnotationPreview() {
  if (!annotationPreview) return;
  const source = ocrOutput.value || '';
  const annotations = sortAnnotations(getCurrentAnnotations());
  if (!source.trim()) {
    annotationPreview.innerHTML = '<p class="annotation-empty">Textul OCR va apărea aici împreună cu highlight-urile de adnotare.</p>';
    return;
  }
  if (!annotations.length) {
    annotationPreview.innerHTML = escapeHtml(source);
    return;
  }

  const boundaries = new Set([0, source.length]);
  annotations.forEach((item) => {
    boundaries.add(Math.max(0, Math.min(source.length, item.start)));
    boundaries.add(Math.max(0, Math.min(source.length, item.end)));
  });
  const points = Array.from(boundaries).sort((a, b) => a - b);
  const chunks = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    if (segStart === segEnd) continue;
    const segment = source.slice(segStart, segEnd);
    const active = annotations.filter((item) => item.start < segEnd && item.end > segStart);
    if (!active.length) {
      chunks.push(escapeHtml(segment));
      continue;
    }
    const stops = active.map((item, index) => {
      const from = (index * 100) / active.length;
      const to = ((index + 1) * 100) / active.length;
      return `${hexToRgba(item.color, 0.24)} ${from}% ${to}%`;
    }).join(', ');
    const title = active.map((item) => `${item.code} — ${item.label}`).join(' | ');
    chunks.push(`<mark class="annotation-mark" style="--mark-bg:linear-gradient(90deg, ${stops})" title="${escapeHtml(title)}">${escapeHtml(segment)}</mark>`);
  }
  annotationPreview.innerHTML = chunks.join('');
}

function renderAnnotationRecords() {
  if (!annotationRecords) return;
  const annotations = sortAnnotations(getCurrentAnnotations());
  if (!annotations.length) {
    annotationRecords.innerHTML = '<p class="annotation-empty">Nu există încă adnotări pe pagina curentă.</p>';
    return;
  }
  annotationRecords.innerHTML = '';
  annotations.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'annotation-record';
    card.style.setProperty('--tag-bg', hexToRgba(item.color, 0.18));
    const currentExcerpt = (ocrOutput.value || '').slice(item.start, item.end) || item.text;
    card.innerHTML = `
      <div class="annotation-record-head">
        <div class="annotation-record-title">
          <span class="annotation-record-code">${item.code}</span>
          <strong>${item.label}</strong>
        </div>
        <button type="button" data-annotation-delete="${item.id}">Șterge</button>
      </div>
      <p>${escapeHtml(currentExcerpt)}</p>
      <p class="muted">${escapeHtml(item.description || '')}</p>
      <div class="annotation-record-meta">
        <span>${item.category}</span>
        <span>gravitate: ${item.severity}</span>
        <span>nivel: ${item.level}</span>
        <span>cauză: ${item.cause}</span>
        <span>corectabilitate: ${item.difficulty}</span>
        <span>siguranță: ${item.confidence}</span>
      </div>
    `;
    annotationRecords.appendChild(card);
  });
  annotationRecords.querySelectorAll('[data-annotation-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeAnnotationById(btn.dataset.annotationDelete);
    });
  });
}

function updateAnnotationCounters() {
  if (annotationCount) {
    annotationCount.textContent = `${getCurrentAnnotations().length} adnotări`;
  }
  if (annotationUndoTagBtn) {
    annotationUndoTagBtn.disabled = getAnnotationHistory().length === 0;
  }
}

function renderAnnotationState() {
  renderAnnotationTags();
  renderAnnotationPreview();
  renderAnnotationRecords();
  updateAnnotationCounters();
}

function updateSelectionDrivenUi() {
  if (!annotationQuickPanel || !ocrOutput) return;
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  if (start === end) {
    currentSelectionRange = null;
    annotationQuickPanel.classList.add('hidden');
    annotationSelectionLabel.textContent = 'Selectează un fragment';
    return;
  }
  currentSelectionRange = { start, end };
  const selected = (ocrOutput.value || '').slice(start, end).replace(/\s+/g, ' ').trim();
  annotationSelectionLabel.textContent = selected ? `"${selected.slice(0, 80)}${selected.length > 80 ? '…' : ''}"` : 'Selecție activă';
  annotationQuickPanel.classList.remove('hidden');
  syncQuickAnnotationSelectors();
}

function addAnnotationFromSelection() {
  const meta = getAnnotationTagMeta(annotationCodeSelect?.value || annotationTagSelect.value || activeAnnotationCode);
  if (!meta) {
    setStatus('Alege mai întâi o etichetă din taxonomie.');
    return;
  }
  const start = currentSelectionRange?.start ?? ocrOutput.selectionStart;
  const end = currentSelectionRange?.end ?? ocrOutput.selectionEnd;
  const source = ocrOutput.value || '';
  if (start === end) {
    setStatus('Selectează mai întâi un fragment de text pentru adnotare.');
    return;
  }
  const text = source.slice(start, end);
  const existing = getCurrentAnnotations();
  pushAnnotationHistory();
  const annotation = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    code: meta.code,
    label: meta.label,
    description: meta.description,
    category: meta.category,
    color: meta.color,
    start,
    end,
    text,
    ...getSelectedAnnotationMeta(),
  };
  setCurrentAnnotations(sortAnnotations([...existing, annotation]));
  renderAnnotationState();
  currentSelectionRange = null;
  annotationQuickPanel?.classList.add('hidden');
  setStatus(`Adnotare adăugată: ${meta.code} — ${meta.label}.`);
}

function removeAnnotationById(id) {
  const existing = getCurrentAnnotations();
  const target = existing.find((item) => item.id === id);
  if (!target) return;
  pushAnnotationHistory();
  setCurrentAnnotations(existing.filter((item) => item.id !== id));
  renderAnnotationState();
  setStatus(`Adnotare ștearsă: ${target.code} — ${target.label}.`);
}

function removeAnnotationFromSelection() {
  const start = ocrOutput.selectionStart;
  const end = ocrOutput.selectionEnd;
  const existing = getCurrentAnnotations();
  const matches = existing.filter((item) => {
    if (start === end) {
      return start >= item.start && start <= item.end;
    }
    return !(end <= item.start || start >= item.end);
  });
  if (!matches.length) {
    setStatus('Nu există o adnotare pe selecția curentă.');
    return;
  }
  pushAnnotationHistory();
  const ids = new Set(matches.map((item) => item.id));
  setCurrentAnnotations(existing.filter((item) => !ids.has(item.id)));
  renderAnnotationState();
  setStatus(matches.length === 1 ? `Adnotare ștearsă: ${matches[0].code}.` : `Au fost șterse ${matches.length} adnotări.`);
}

function undoAnnotationChange() {
  const key = getPageAnnotationKey();
  const history = getAnnotationHistory(key);
  if (!history.length) return;
  const previous = history.pop();
  annotationHistoryByPage.set(key, history);
  setCurrentAnnotations(previous);
  renderAnnotationState();
  setStatus('Ultima adnotare a fost anulată.');
}

function setStudioVisible(isVisible) {
  authPanel.classList.toggle('hidden', isVisible);
  studioApp.classList.toggle('hidden', !isVisible);
}

function setStatus(message) {
  ocrStatus.textContent = message;
}

function setArticlesStatus(message) {
  articlesStatus.textContent = message || '';
}

function setAnnotationFocusMode(isActive) {
  isAnnotationFocusMode = Boolean(isActive);
  previewGrid?.classList.toggle('annotation-focus', isAnnotationFocusMode);
  if (toggleAnnotationFocusBtn) {
    toggleAnnotationFocusBtn.textContent = isAnnotationFocusMode ? 'Revino la PDF' : 'Începe adnotarea';
  }
  scheduleAutosave();
}

function getActiveDocumentId() {
  return currentFile || MANUAL_DOCUMENT_KEY;
}

function getActiveDocumentLabel() {
  return currentFile || manualSessionLabel;
}

function hasManualWorkspaceContent() {
  if (currentFile) return false;
  if ((ocrOutput.value || '').trim()) return true;
  if (pageTexts.size) return true;
  return Array.from(annotationsByPage.keys()).some((key) => key.startsWith(`${MANUAL_DOCUMENT_KEY}::`));
}

function loadAutosaveSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTOSAVE_STORAGE_KEY) || 'null');
  } catch (_) {
    return null;
  }
}

function persistAutosaveNow() {
  if (isRestoringAutosave) return;
  try {
    const payload = buildAnnotationSessionPayload();
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {
    // ignore autosave failures silently
  }
}

function scheduleAutosave() {
  if (isRestoringAutosave) return;
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    persistAutosaveNow();
  }, 700);
}

function clearAutosaveSession() {
  try {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
  } catch (_) {
    // ignore clear failures
  }
}

function slugifyFileName(value) {
  return String(value || 'raport')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'raport';
}

function getAnnotationsForCurrentFile() {
  const documentId = getActiveDocumentId();
  return Array.from(annotationsByPage.entries())
    .filter(([key]) => key.startsWith(`${documentId}::`))
    .flatMap(([key, items]) => {
      const page = Number(key.split('::')[1] || 0);
      return (items || []).map((item) => ({ ...item, page }));
    })
    .sort((a, b) => a.page - b.page || a.start - b.start || a.end - b.end);
}

async function loadAnnotationGuideData() {
  if (annotationGuideCache) return annotationGuideCache;
  const fallback = new Map();
  getAllAnnotationTags().forEach((item) => {
    fallback.set(item.code, {
      code: item.code,
      category: item.category,
      description: item.description,
      original: '',
      correction: '',
      explanation: '',
    });
  });
  try {
    const res = await fetch('/static/ghid_adnotare_erori.html');
    if (!res.ok) throw new Error('Nu am putut încărca ghidul.');
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('tbody tr')).filter((row) => !row.classList.contains('section-row'));
    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim());
      if (cells.length < 6) return;
      fallback.set(cells[0], {
        code: cells[0],
        category: cells[1],
        description: cells[2],
        original: cells[3],
        correction: cells[4],
        explanation: cells[5],
      });
    });
  } catch (_) {
    // fall back to taxonomy descriptions only
  }
  annotationGuideCache = fallback;
  return annotationGuideCache;
}

function getTeachingRecommendations(code) {
  const prefix = String(code || '').split('-')[0];
  const recommendations = {
    ORT: {
      focus: 'automatizarea normei grafice și a relației dintre pronunțare și scriere',
      strategies: [
        'lucrează pe perechi minim diferite și contraste cu/fără diacritice',
        'cere copiere controlată și autocorectare cu legendă de reguli',
        'folosește microdicționare personale pentru cuvintele recurente greșite',
      ],
      exercises: [
        'dictare scurtă cu auto-verificare pe diacritice și cratimă',
        'rescrierea unui paragraf fără diacritice în forma standard',
        'sortare de forme corecte vs. forme grafice eronate',
      ],
    },
    PUNC: {
      focus: 'segmentarea enunțului și marcarea relațiilor sintactice',
      strategies: [
        'marchează verbal unde se încheie ideea înainte de a insera semnul',
        'lucrează cu fraze scurte și extinde treptat complexitatea',
        'compară variante cu și fără virgulă și discută diferența de sens',
      ],
      exercises: [
        'punctuație ghidată pe enunțuri fără semne',
        'reordonare de propoziții și introducere de virgule în subordonate',
        'transformarea afirmațiilor în întrebări și exclamații',
      ],
    },
    MORF: {
      focus: 'fixarea paradigmelor nominale și a valorilor de gen, număr, caz și articol',
      strategies: [
        'lucrează cu tabele-model și familii de exemple foarte apropiate',
        'asociază fiecare substantiv problematic cu determinant și adjectiv',
        'antrenează contraste explicite între forme corecte și forme transferate din L1',
      ],
      exercises: [
        'completare de articol și flexiune în contexte scurte',
        'transformări singular-plural și nominativ-genitiv',
        'alegere multiplă între forme aproape identice',
      ],
    },
    ACORD: {
      focus: 'integrarea trăsăturilor gramaticale în acordul intern și extern',
      strategies: [
        'evidențiază vizual nucleul și elementele care trebuie să se acorde',
        'lucrează progresiv de la grup nominal la propoziție completă',
        'folosește coduri de culoare pentru gen, număr și persoană',
      ],
      exercises: [
        'potrivire substantiv-adjectiv în serii minimale',
        'corectarea acordului subiect-predicat în propoziții scurte',
        'expansiune de grup nominal cu verificare finală a acordului',
      ],
    },
    VERB: {
      focus: 'stabilizarea paradigmelor verbale și a valorilor de timp, mod și auxiliar',
      strategies: [
        'grupează verbele pe modele productive și exersează-le contrastiv',
        'leagă timpul verbal de marcatori temporali expliciți',
        'izolează formele neregulate și repetă-le în mini-dialoguri',
      ],
      exercises: [
        'conjugare contextualizată pe persoane',
        'transformare prezent-trecut-viitor în propoziții controlate',
        'completarea auxiliarului sau a formei corecte de participiu',
      ],
    },
    PREP: {
      focus: 'învățarea regimului lexical și a selecției corecte de prepoziție',
      strategies: [
        'predă verbele împreună cu prepoziția lor, nu izolat',
        'construiește liste scurte de regimuri frecvente și revino recurent la ele',
        'compară exemple corecte și exemple cu supramarcare',
      ],
      exercises: [
        'completare de prepoziții în contexte autentice',
        'asociere verb/adjectiv cu regimul corect',
        'detectarea și eliminarea prepozițiilor adăugate inutil',
      ],
    },
    SINT: {
      focus: 'organizarea propoziției și controlul relațiilor dintre constituenți',
      strategies: [
        'lucrează pe scheme de ordine a cuvintelor și propoziții-model',
        'pornește de la structuri canonice și abia apoi introduce variația',
        'fă vizibile rolurile sintactice înainte de reformulare',
      ],
      exercises: [
        'reordonare de cuvinte pentru propoziții corecte',
        'completare de relativ, subiect sau conector lipsă',
        'corectare de întrebări, negații și subordonate defectuoase',
      ],
    },
    LEX: {
      focus: 'selecția lexicală adecvată, colocațiile și evitarea transferului direct',
      strategies: [
        'predă itemii lexicali în contexte și combinații, nu ca liste izolate',
        'compară explicit cuvântul dorit cu falsul prieten sau calcul problematic',
        'lucrează pe reformulare și pe extinderea rețelei lexicale',
      ],
      exercises: [
        'alegere de colocatie corectă din mai multe variante',
        'înlocuire de calc sau termen impropriu cu variantă idiomatică',
        'reformulare pentru evitare de repetiție lexicală',
      ],
    },
    SEM: {
      focus: 'claritatea sensului și relațiile logice dintre idei',
      strategies: [
        'verifică intenția comunicativă înainte de corectare',
        'folosește parafrazarea ca instrument de dezambiguizare',
        'leagă explicit conectorii de relația logică exprimată',
      ],
      exercises: [
        'alegere a conectorului logic adecvat',
        'reformulare a enunțurilor ambigue sau incoerente',
        'identificare și eliminare a redundanțelor',
      ],
    },
    DISC: {
      focus: 'coeziunea textuală și organizarea discursului pe termen mai lung',
      strategies: [
        'lucrează cu planuri de text și funcția fiecărui paragraf',
        'urmărește referințele și timpurile verbale pe întregul text',
        'compară modele de texte bine organizate cu texte instabile',
      ],
      exercises: [
        'inserare de conectori discursivi potriviți',
        'rescriere pentru clarificarea referințelor anaforice',
        'aranjarea paragrafelor într-o progresie tematică coerentă',
      ],
    },
    INT: {
      focus: 'conștientizarea transferului și dezvoltarea strategiilor de evitare productive',
      strategies: [
        'discută explicit sursa probabilă a erorii și diferența față de română',
        'transformă comparația interlingvistică într-un instrument de reflecție',
        'încurajează resurse compensatorii fără simplificare excesivă',
      ],
      exercises: [
        'contrast L1-română pe structuri similare dar neechivalente',
        'reformulare de enunțuri transferate literal',
        'extinderea propozițiilor prea simple pentru a evita evitarea structurală',
      ],
    },
    HIPER: {
      focus: 'stabilizarea normei fără supracorectare',
      strategies: [
        'clarifică diferența dintre formă standard, formă tolerată și formă greșită',
        'lucrează cu exemple de hipercorectitudine frecvente',
        'încurajează verificarea cu modele autentice',
      ],
      exercises: [
        'alegere între formă standard și formă hipercorectată',
        'corectare ghidată de enunțuri supranormate',
        'mini-explicații metalingvistice după fiecare corectare',
      ],
    },
    EVIT: {
      focus: 'extinderea controlată a complexității structurale',
      strategies: [
        'pornește de la forma simplă produsă de student și adaugă treptat complexitate',
        'lucrează pe reformulare asistată, nu pe penalizarea simplificării',
        'setează obiective de producere pentru o singură structură nouă la un moment dat',
      ],
      exercises: [
        'dezvoltarea unei propoziții simple într-una cu subordonată',
        'rescriere cu introducerea acordului, a conectorilor sau a relativelor',
        'exerciții de expansiune controlată a textului',
      ],
    },
  };
  return recommendations[prefix] || recommendations.INT;
}

function buildDonutSvg(segments, size = 280, strokeWidth = 44) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = circumference * segment.ratio;
    const arc = `
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${radius}"
        fill="none"
        stroke="${segment.color}"
        stroke-width="${strokeWidth}"
        stroke-dasharray="${length} ${circumference - length}"
        stroke-dashoffset="${-offset}"
        stroke-linecap="butt"
        transform="rotate(-90 ${size / 2} ${size / 2})"
      />`;
    offset += length;
    return arc;
  }).join('');
  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#eadfd1" stroke-width="${strokeWidth}" />
      ${arcs}
    </svg>
  `;
}

function openReportDocument(html, fileName) {
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (reportWindow) {
    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1500);
}

async function finishAnnotationWorkflow() {
  if (!currentFile && !hasManualWorkspaceContent()) {
    setStatus('Încarcă un text, un PDF sau importă un JSON înainte de a genera raportul.');
    return;
  }

  const annotations = getAnnotationsForCurrentFile();
  if (!annotations.length) {
    setStatus('Nu există încă adnotări pentru raportul final.');
    return;
  }

  finishAnnotationBtn.disabled = true;
  try {
    const guideMap = await loadAnnotationGuideData();
    const total = annotations.length;
    const grouped = new Map();

    annotations.forEach((item) => {
      const meta = getAnnotationTagMeta(item.code) || {};
      const guide = guideMap.get(item.code) || {};
      if (!grouped.has(item.code)) {
        grouped.set(item.code, {
          code: item.code,
          label: meta.label || item.label || item.code,
          category: guide.category || meta.category || item.category || '',
          description: guide.description || meta.description || item.description || '',
          example: guide.original || '',
          correction: guide.correction || '',
          explanation: guide.explanation || '',
          color: meta.color || item.color || '#a8573b',
          items: [],
        });
      }
      grouped.get(item.code).items.push(item);
    });

    const summary = Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        count: entry.items.length,
        ratio: entry.items.length / total,
        percentage: ((entry.items.length / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    const topIssues = summary.slice(0, 3);
    const topBars = summary.slice(0, 8);
    const donutSvg = buildDonutSvg(summary.map((item) => ({ color: item.color, ratio: item.ratio })));
    const createdAt = new Date().toLocaleString('ro-RO', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const pageCoverage = new Set(annotations.map((item) => item.page)).size;

    const categorySummary = Array.from(summary.reduce((acc, item) => {
      const key = item.category || 'Altă categorie';
      const current = acc.get(key) || { label: key, count: 0, color: item.color };
      current.count += item.count;
      acc.set(key, current);
      return acc;
    }, new Map()).values())
      .map((item) => ({
        ...item,
        ratio: item.count / total,
        percentage: ((item.count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const severitySummary = Array.from(annotations.reduce((acc, item) => {
      const key = item.severity || 'medie';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map()).entries())
      .map(([label, count]) => ({
        label,
        count,
        ratio: count / total,
        percentage: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);

    const legendItems = summary.map((item) => `
      <div class="legend-item">
        <span class="legend-swatch" style="background:${item.color}"></span>
        <div>
          <strong>${escapeHtml(item.code)}</strong>
          <div>${escapeHtml(item.label)} · ${item.percentage}% · ${item.count} ocurențe</div>
        </div>
      </div>
    `);
    const middleLegendIndex = Math.ceil(legendItems.length / 2);
    const legendLeftHtml = legendItems.slice(0, middleLegendIndex).join('');
    const legendRightHtml = legendItems.slice(middleLegendIndex).join('');

    const topBarsHtml = topBars.map((item) => `
      <div class="bar-row">
        <div class="bar-label">
          <strong>${escapeHtml(item.code)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </div>
        <div class="bar-track">
          <span class="bar-fill" style="width:${Math.max(item.ratio * 100, 4)}%; background:${item.color}"></span>
        </div>
        <div class="bar-value">${item.percentage}%</div>
      </div>
    `).join('');

    const categoryBarsHtml = categorySummary.map((item) => `
      <div class="bar-row compact-row">
        <div class="bar-label">
          <strong>${escapeHtml(item.label)}</strong>
        </div>
        <div class="bar-track">
          <span class="bar-fill" style="width:${Math.max(item.ratio * 100, 4)}%; background:${item.color}"></span>
        </div>
        <div class="bar-value">${item.percentage}%</div>
      </div>
    `).join('');

    const severityHtml = severitySummary.map((item) => `
      <div class="severity-card">
        <span class="muted">${escapeHtml(item.label)}</span>
        <strong>${item.count}</strong>
        <span>${item.percentage}%</span>
      </div>
    `).join('');

    const issueSectionsHtml = summary.map((item) => {
      const recommendations = getTeachingRecommendations(item.code);
      const excerpts = item.items.slice(0, 5).map((annotation) => `
        <li>
          <strong>p. ${annotation.page}</strong>:
          <span>„${escapeHtml((annotation.text || '').replace(/\s+/g, ' ').trim())}”</span>
          <span class="micro-meta">gravitate ${escapeHtml(annotation.severity)}, nivel ${escapeHtml(annotation.level)}</span>
        </li>
      `).join('');
      return `
        <section class="issue-card">
          <div class="issue-head">
            <div>
              <span class="issue-chip" style="background:${hexToRgba(item.color, 0.18)}; color:${item.color}; border-color:${hexToRgba(item.color, 0.34)}">${escapeHtml(item.code)}</span>
              <h3>${escapeHtml(item.label)}</h3>
            </div>
            <strong>${item.percentage}%</strong>
          </div>
          <p><strong>Categorie:</strong> ${escapeHtml(item.category)}</p>
          <p><strong>Descriere:</strong> ${escapeHtml(item.description || 'Descriere indisponibilă în ghidul curent.')}</p>
          <p><strong>Explicație posibilă:</strong> ${escapeHtml(item.explanation || 'De verificat contextual în raport cu profilul lingvistic al studentului.')}</p>
          <p><strong>Exemplu-model din ghid:</strong> ${escapeHtml(item.example || 'Nu există exemplu disponibil.')}</p>
          <p><strong>Formă corectă-model:</strong> ${escapeHtml(item.correction || 'Se stabilește contextual.')}</p>
          <p><strong>Focalizare didactică:</strong> ${escapeHtml(recommendations.focus)}</p>
          <div class="two-col">
            <div>
              <h4>Fragmente adnotate</h4>
              <ul>${excerpts || '<li>Nu există fragmente salvate.</li>'}</ul>
            </div>
            <div>
              <h4>Strategii de lucru</h4>
              <ul>${recommendations.strategies.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>
            </div>
          </div>
          <div>
            <h4>Exerciții țintite</h4>
            <ul>${recommendations.exercises.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>
          </div>
        </section>
      `;
    }).join('');

    const html = `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Raport de adnotare - ${escapeHtml(getActiveDocumentLabel())}</title>
  <style>
    :root {
      --bg: #f7f1e8;
      --paper: #fffdfa;
      --ink: #2d2219;
      --muted: #6f6257;
      --line: #e1d6c8;
      --accent: #a8573b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top, rgba(168,87,59,0.12), transparent 28%),
        linear-gradient(180deg, #fbf7f1, var(--bg));
      padding: 34px;
    }
    .report-shell {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }
    .hero, .card, .issue-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 26px;
      box-shadow: 0 18px 42px rgba(87, 66, 42, 0.08);
    }
    .hero {
      padding: 28px 30px;
      display: grid;
      gap: 18px;
    }
    h1, h2, h3, h4 { margin: 0; }
    h1 { font-size: 40px; margin-bottom: 10px; }
    h2 { font-size: 28px; margin-bottom: 8px; }
    h3 { font-size: 24px; }
    h4 { font-size: 18px; margin-bottom: 8px; }
    p { margin: 8px 0 0; line-height: 1.6; }
    .hero p { max-width: 65ch; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .meta-box {
      padding: 14px 16px;
      border-radius: 18px;
      background: #f6ede3;
      border: 1px solid #eadfd1;
    }
    .meta-box strong {
      display: block;
      font-size: 24px;
      margin-top: 6px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .chart-canvas {
      display: grid;
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 26px;
      align-items: start;
      padding: 24px;
    }
    .chart-panel {
      display: grid;
      justify-items: center;
      align-content: start;
      gap: 14px;
    }
    .chart-wrap {
      position: relative;
      width: 280px;
      height: 280px;
    }
    .chart-center {
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      width: 150px;
    }
    .chart-center strong {
      display: block;
      font-size: 42px;
    }
    .chart-stack {
      display: grid;
      gap: 18px;
    }
    .legend-head {
      display: grid;
      gap: 6px;
    }
    .legend-columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .legend-column {
      display: grid;
      gap: 10px;
    }
    .legend-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: 18px;
      background: #faf4ec;
      border: 1px solid #eadfd1;
      min-height: 100%;
    }
    .legend-swatch {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      margin-top: 5px;
      flex: 0 0 auto;
    }
    .summary-card, .issue-card {
      padding: 24px;
    }
    .summary-list, .issue-card ul {
      margin: 10px 0 0;
      padding-left: 20px;
    }
    .overview-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 18px;
    }
    .mini-card {
      padding: 22px 24px;
    }
    .bar-list {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }
    .bar-row {
      display: grid;
      grid-template-columns: minmax(170px, 220px) minmax(0, 1fr) 70px;
      gap: 12px;
      align-items: center;
    }
    .compact-row {
      grid-template-columns: minmax(180px, 1fr) minmax(0, 1fr) 70px;
    }
    .bar-label {
      display: grid;
      gap: 2px;
    }
    .bar-label span {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.35;
    }
    .bar-track {
      position: relative;
      height: 12px;
      border-radius: 999px;
      background: #efe4d7;
      overflow: hidden;
    }
    .bar-fill {
      display: block;
      height: 100%;
      border-radius: inherit;
    }
    .bar-value {
      text-align: right;
      font-weight: 700;
      white-space: nowrap;
    }
    .severity-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 14px;
    }
    .severity-card {
      padding: 16px 18px;
      border-radius: 18px;
      border: 1px solid #eadfd1;
      background: #faf4ec;
      display: grid;
      gap: 6px;
    }
    .severity-card strong {
      font-size: 30px;
    }
    .issue-grid {
      display: grid;
      gap: 16px;
    }
    .issue-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .issue-chip {
      display: inline-flex;
      align-items: center;
      padding: 7px 12px;
      border-radius: 999px;
      border: 1px solid;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      margin-bottom: 10px;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 14px;
    }
    .micro-meta {
      display: block;
      color: var(--muted);
      font-size: 13px;
      margin-top: 4px;
    }
    .muted {
      color: var(--muted);
    }
    @media print {
      body { background: white; padding: 0; }
      .hero, .card, .issue-card { box-shadow: none; }
    }
    @media (max-width: 980px) {
      .metrics-grid,
      .chart-canvas,
      .legend-columns,
      .overview-grid,
      .two-col {
        grid-template-columns: 1fr;
      }
      .bar-row, .compact-row, .severity-grid { grid-template-columns: 1fr; }
      .chart-wrap { margin-bottom: 8px; }
    }
  </style>
</head>
<body>
  <div class="report-shell">
    <section class="hero">
      <div>
        <h1>Raport de adnotare pedagogică</h1>
        <p>Document generat automat după etichetarea manuală a erorilor din <strong>${escapeHtml(getActiveDocumentLabel())}</strong>. Raportul sintetizează profilul de erori al studentului și propune direcții de intervenție didactică țintită.</p>
        <div class="metrics-grid">
          <div class="meta-box"><span class="muted">Document</span><strong>${escapeHtml(getActiveDocumentLabel())}</strong></div>
          <div class="meta-box"><span class="muted">Generat la</span><strong>${escapeHtml(createdAt)}</strong></div>
          <div class="meta-box"><span class="muted">Adnotări totale</span><strong>${total}</strong></div>
          <div class="meta-box"><span class="muted">Pagini cu erori</span><strong>${pageCoverage}</strong></div>
        </div>
      </div>
    </section>

    <section class="card chart-canvas">
      <div class="chart-panel">
        <div class="chart-wrap">
            ${donutSvg}
          <div class="chart-center">
            <span class="muted">Tipuri distincte</span>
            <strong>${summary.length}</strong>
          </div>
        </div>
        <div class="legend-head">
          <h2>Raport vizual al erorilor</h2>
          <p class="muted">Canvas-ul de mai jos pune în paralel imaginea globală din donut chart și lista de coduri, afișată pe coloane, fără comprimări verticale.</p>
        </div>
      </div>
      <div class="chart-stack">
        <div class="legend-head">
          <h2>Distribuția erorilor</h2>
          <p class="muted">Fiecare card arată codul, descrierea scurtă, procentul și numărul de ocurențe din textul adnotat.</p>
        </div>
        <div class="legend-columns">
          <div class="legend-column">${legendLeftHtml}</div>
          <div class="legend-column">${legendRightHtml}</div>
        </div>
      </div>
    </section>

    <section class="overview-grid">
      <section class="card mini-card">
        <h2>Top erori adnotate</h2>
        <p class="muted">Barele orizontale arată rapid care sunt codurile dominante în textul studentului.</p>
        <div class="bar-list">${topBarsHtml}</div>
      </section>
      <section class="card mini-card">
        <h2>Distribuție pe categorii</h2>
        <p class="muted">Această vedere agregă erorile la nivel de categorie mare, utilă pentru decizii pedagogice rapide.</p>
        <div class="bar-list">${categoryBarsHtml}</div>
        <h2 style="margin-top:22px;">Gravitatea erorilor</h2>
        <div class="severity-grid">${severityHtml}</div>
      </section>
    </section>

    <section class="card summary-card">
      <h2>Sumar interpretativ</h2>
      <ul class="summary-list">
        ${topIssues.map((item) => `<li><strong>${escapeHtml(item.code)}</strong> (${item.percentage}%) este una dintre dificultățile dominante și indică nevoie de lucru țintit pe ${escapeHtml(item.category.toLowerCase() || item.label.toLowerCase())}.</li>`).join('')}
        <li>Profilul actual sugerează intervenții scurte și concentrate pe regularitățile cele mai frecvente, urmate de reformulare ghidată și reapariție controlată în contexte apropiate.</li>
        <li>Pentru prezentarea la atelier, raportul poate funcționa ca punte între adnotarea manuală și proiectarea imediată a unor exerciții personalizate pentru student.</li>
      </ul>
    </section>

    <section class="issue-grid">
      ${issueSectionsHtml}
    </section>
  </div>
</body>
</html>`;

    const fileName = `${slugifyFileName(getActiveDocumentLabel())}-raport-adnotare.html`;
    openReportDocument(html, fileName);
    setStatus('Raportul final a fost generat și descărcat.');
  } catch (error) {
    setStatus(error.message || 'Nu am putut genera raportul final.');
  } finally {
    finishAnnotationBtn.disabled = false;
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
  renderAnnotationState();
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
    if (hasManualWorkspaceContent()) {
      const pages = Math.max(1, totalPages || pageTexts.size || 1);
      docMeta.textContent = `${getActiveDocumentLabel()} • sesiune text / adnotare`;
      pageBadge.textContent = `Pagina ${currentPage} / ${pages}`;
    } else {
      docMeta.textContent = 'Alege un PDF sau importă un JSON pentru a începe.';
      pageBadge.textContent = 'Pagina -';
    }
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
  pageTexts.set(currentPage, ocrOutput.value);
  scheduleAutosave();
}

function restoreCurrentText() {
  ocrOutput.value = pageTexts.get(currentPage) || '';
  textUndoStack.length = 0;
  textRedoStack.length = 0;
  updateTextHistoryButtons();
  renderAnnotationState();
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
  await loadPreview();
  renderFiles();
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
    renderAnnotationState();
  }
  await refreshFiles();
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
  userPill.textContent = currentUser ? `Utilizator: ${currentUser}` : '';
  setStudioVisible(true);
  await refreshFiles();

  const autosave = loadAutosaveSession();
  if (autosave && Object.keys(autosave.pages || {}).length) {
    const shouldRestore = window.confirm('Am găsit o sesiune autosalvată. Vrei să continui de unde ai rămas?');
    if (shouldRestore) {
      restoreAutosavePayload(autosave);
      setStatus('Sesiunea autosalvată a fost restaurată.');
    }
  }
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
      renderAnnotationState();
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
  if (!currentFile) {
    setStatus('Pentru sesiuni fără PDF, folosește Export JSON ca să salvezi local munca.');
    return;
  }
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
  setStatus('Progres salvat.');
}

function buildAnnotationSessionPayload() {
  storeCurrentText();
  const documentId = getActiveDocumentId();
  const pages = {};
  for (const [pageNo, text] of pageTexts.entries()) {
    if (typeof text === 'string') {
      pages[String(pageNo)] = text;
    }
  }
  if (!Object.keys(pages).length) {
    pages[String(currentPage || 1)] = ocrOutput.value || '';
  }

  return {
    version: 1,
    document_id: documentId,
    document_label: getActiveDocumentLabel(),
    user: currentUser,
    page: currentPage,
    total_pages: Math.max(totalPages || 0, Object.keys(pages).length || 1),
    pages,
    annotations: Object.fromEntries(
      Array.from(annotationsByPage.entries())
        .filter(([key]) => key.startsWith(`${documentId}::`))
        .map(([key, value]) => [key.split('::')[1], value])
    ),
    custom_annotation_tags: customAnnotationTags,
    annotation_focus_mode: isAnnotationFocusMode,
    updated_at: new Date().toISOString(),
  };
}

async function exportJson() {
  const payload = buildAnnotationSessionPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const fileName = `${slugifyFileName(payload.document_label || 'sesiune-adnotare')}.json`;
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  jsonLink.href = objectUrl;
  jsonLink.download = fileName;
  jsonLink.textContent = `Descarcă din nou ${fileName}`;
  jsonLink.classList.remove('hidden');
  setStatus('Sesiunea de adnotare a fost exportată în JSON.');
}

async function importJsonSession(file) {
  if (!file) return;
  const raw = await file.text();
  const payload = JSON.parse(raw);
  if (!payload || typeof payload !== 'object') {
    throw new Error('Fișierul JSON nu are un format valid.');
  }
  restoreAutosavePayload(payload);
  setStatus(`Sesiune JSON importată: ${String(payload.document_label || 'Sesiune importată')}.`);
}

function restoreAutosavePayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return false;
  const pages = payload.pages && typeof payload.pages === 'object' ? payload.pages : {};
  const importedAnnotations = payload.annotations && typeof payload.annotations === 'object' ? payload.annotations : {};
  const importedLabel = String(payload.document_label || 'Sesiune recuperată');
  const keepCurrentFile = Boolean(options.keepCurrentFile);
  const targetDocumentKey = keepCurrentFile && currentFile ? currentFile : MANUAL_DOCUMENT_KEY;

  isRestoringAutosave = true;
  try {
    pageTexts.clear();
    Object.entries(pages).forEach(([pageNo, text]) => {
      pageTexts.set(Number(pageNo), typeof text === 'string' ? text : '');
    });

    Array.from(annotationsByPage.keys())
      .filter((key) => key.startsWith(`${targetDocumentKey}::`) || key.startsWith(`${MANUAL_DOCUMENT_KEY}::`))
      .forEach((key) => annotationsByPage.delete(key));
    Array.from(annotationHistoryByPage.keys())
      .filter((key) => key.startsWith(`${targetDocumentKey}::`) || key.startsWith(`${MANUAL_DOCUMENT_KEY}::`))
      .forEach((key) => annotationHistoryByPage.delete(key));

    Object.entries(importedAnnotations).forEach(([pageNo, items]) => {
      annotationsByPage.set(`${targetDocumentKey}::${pageNo}`, cloneAnnotations(Array.isArray(items) ? items : []));
    });

    if (Array.isArray(payload.custom_annotation_tags)) {
      customAnnotationTags = payload.custom_annotation_tags
        .map((item) => {
          const code = sanitizeAnnotationCode(item?.code || item?.id || item?.name);
          if (!code) return null;
          const groupKey = sanitizeAnnotationCode(item?.groupKey || String(code).split('-')[0] || 'CUSTOM');
          const baseGroup = getBaseAnnotationGroupByKey(groupKey);
          return {
            code,
            label: String(item?.label || formatAnnotationLabel(code)),
            color: sanitizeAnnotationColor(item?.color),
            groupKey,
            category: String(item?.category || baseGroup?.category || 'Personalizate'),
            description: String(item?.description || 'Etichetă personalizată recuperată.'),
          };
        })
        .filter(Boolean);
      localStorage.setItem(CUSTOM_ANNOTATION_TAGS_STORAGE_KEY, JSON.stringify(customAnnotationTags));
    }

    if (!keepCurrentFile) {
      currentFile = '';
      manualSessionLabel = importedLabel;
      totalPages = Math.max(Number(payload.total_pages || 0), pageTexts.size || 1);
    }
    currentPage = Math.max(1, Number(payload.page || Object.keys(pages)[0] || 1));
    restoreCurrentText();
    setAnnotationFocusMode(Boolean(payload.annotation_focus_mode));
    setDocMeta();
    renderFiles();
    renderAnnotationState();
    return true;
  } finally {
    isRestoringAutosave = false;
    scheduleAutosave();
  }
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
  persistAutosaveNow();
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
  const maxPages = Math.max(totalPages || 0, pageTexts.size || 1);
  if (!currentFile && !hasManualWorkspaceContent()) return;
  const nextPage = Math.max(1, Math.min(maxPages, Number(pageInput.value || currentPage)));
  storeCurrentText();
  currentPage = nextPage;
  pageInput.value = String(currentPage);
  if (currentFile) {
    await loadPreview();
    return;
  }
  restoreCurrentText();
  setDocMeta();
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
  if ((!currentFile && !hasManualWorkspaceContent()) || currentPage <= 1) return;
  storeCurrentText();
  currentPage -= 1;
  pageInput.value = String(currentPage);
  if (currentFile) {
    await loadPreview();
    return;
  }
  restoreCurrentText();
  setDocMeta();
});

nextPageBtn.addEventListener('click', async () => {
  const maxPages = Math.max(totalPages || 0, pageTexts.size || 1);
  if ((!currentFile && !hasManualWorkspaceContent()) || currentPage >= maxPages) return;
  storeCurrentText();
  currentPage += 1;
  pageInput.value = String(currentPage);
  if (currentFile) {
    await loadPreview();
    return;
  }
  restoreCurrentText();
  setDocMeta();
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
toggleAnnotationFocusBtn?.addEventListener('click', () => {
  setAnnotationFocusMode(!isAnnotationFocusMode);
  setStatus(isAnnotationFocusMode
    ? 'Mod adnotare activ: preview-ul PDF este ascuns pentru lucru pe text.'
    : 'Ai revenit la vizualizarea completă cu preview PDF.');
});
importJsonBtn?.addEventListener('click', () => {
  importJsonInput?.click();
});
importJsonInput?.addEventListener('change', async () => {
  const file = importJsonInput.files?.[0];
  if (!file) return;
  try {
    await importJsonSession(file);
  } catch (error) {
    setStatus(error.message || 'Nu am putut importa sesiunea JSON.');
  } finally {
    importJsonInput.value = '';
  }
});
saveProgressBtn.addEventListener('click', saveProgress);
exportJsonBtn.addEventListener('click', exportJson);
finishAnnotationBtn?.addEventListener('click', finishAnnotationWorkflow);

window.addEventListener('beforeunload', () => {
  persistAutosaveNow();
});

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
  const suggestedName = `${slugifyFileName(getActiveDocumentLabel() || 'text-adnotat')}.txt`;
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

annotationTagAddBtn?.addEventListener('click', () => {
  const selectedGroupKey = sanitizeAnnotationCode(annotationGroupMainSelect?.value || getAnnotationGroupKeyByCode(activeAnnotationCode) || 'CUSTOM');
  const rawTag = sanitizeAnnotationCode(annotationTagInput.value);
  const color = sanitizeAnnotationColor(annotationTagColor?.value);
  if (!rawTag) {
    setStatus('Introdu un nume de tag valid.');
    return;
  }
  const normalizedSuffix = rawTag.startsWith(`${selectedGroupKey}-`) ? rawTag.slice(selectedGroupKey.length + 1) : rawTag;
  const tag = rawTag.includes('-') ? rawTag : `${selectedGroupKey}-${normalizedSuffix}`;
  const baseGroup = getBaseAnnotationGroupByKey(selectedGroupKey);
  if (!getAnnotationTagMeta(tag)) {
    customAnnotationTags.push({
      code: tag,
      label: formatAnnotationLabel(tag),
      color,
      groupKey: selectedGroupKey,
      category: baseGroup?.category || 'Personalizate',
      description: `Cod personalizat definit de adnotator în grupul ${selectedGroupKey}.`,
    });
    saveCustomAnnotationTags();
  }
  annotationTagInput.value = '';
  activeAnnotationCode = tag;
  syncQuickAnnotationSelectors(tag, selectedGroupKey);
  refreshActiveAnnotationLabel();
  setStatus(`Cod nou disponibil în grupul ${selectedGroupKey}: ${tag}.`);
});

annotationTagInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    annotationTagAddBtn.click();
  }
});

annotationTagSelect?.addEventListener('change', () => {
  activeAnnotationCode = annotationTagSelect.value;
  syncQuickAnnotationSelectors(activeAnnotationCode);
  refreshActiveAnnotationLabel();
});

annotationGroupMainSelect?.addEventListener('change', () => {
  syncQuickAnnotationSelectors('', annotationGroupMainSelect.value);
  refreshActiveAnnotationLabel();
});

annotationGroupSelect?.addEventListener('change', () => {
  syncQuickAnnotationSelectors('', annotationGroupSelect.value);
  refreshActiveAnnotationLabel();
});

annotationCodeSelect?.addEventListener('change', () => {
  activeAnnotationCode = annotationCodeSelect.value;
  syncQuickAnnotationSelectors(activeAnnotationCode);
  annotationTagSelect.value = activeAnnotationCode;
  refreshActiveAnnotationLabel();
});

annotationTagSelect?.addEventListener('input', () => {
  activeAnnotationCode = annotationTagSelect.value;
  syncQuickAnnotationSelectors(activeAnnotationCode);
  refreshActiveAnnotationLabel();
});

annotationCodeSelect?.addEventListener('input', () => {
  activeAnnotationCode = annotationCodeSelect.value;
  syncQuickAnnotationSelectors(activeAnnotationCode);
  refreshActiveAnnotationLabel();
});

annotationApplyTagBtn?.addEventListener('click', () => {
  addAnnotationFromSelection();
});

annotationQuickAddBtn?.addEventListener('click', () => {
  addAnnotationFromSelection();
});

annotationRemoveTagBtn?.addEventListener('click', () => {
  removeAnnotationFromSelection();
});

annotationUndoTagBtn?.addEventListener('click', () => {
  undoAnnotationChange();
});

ocrOutput.addEventListener('input', () => {
  if (suppressHistory) return;
  storeCurrentText();
  renderAnnotationPreview();
  renderAnnotationRecords();
  updateSelectionDrivenUi();
});

ocrOutput.addEventListener('mouseup', updateSelectionDrivenUi);
ocrOutput.addEventListener('keyup', updateSelectionDrivenUi);

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
customAnnotationTags = loadCustomAnnotationTags();
renderAnnotationState();

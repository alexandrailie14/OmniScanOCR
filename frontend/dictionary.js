const statsGrid = document.getElementById("statsGrid");
const totalEntries = document.getElementById("totalEntries");
const lemmaEntries = document.getElementById("lemmaEntries");
const variantEntries = document.getElementById("variantEntries");
const statusText = document.getElementById("statusText");
const fileMeta = document.getElementById("fileMeta");
const docxMeta = document.getElementById("docxMeta");
const entriesBody = document.getElementById("entriesBody");
const termSearch = document.getElementById("termSearch");
const typeFilterAll = document.getElementById("typeFilterAll");
const typeFilterLemma = document.getElementById("typeFilterLemma");
const typeFilterVariant = document.getElementById("typeFilterVariant");
const sortDictionaryAsc = document.getElementById("sortDictionaryAsc");
const sortDictionaryDesc = document.getElementById("sortDictionaryDesc");
const sortFirstAttestationAsc = document.getElementById("sortFirstAttestationAsc");
const sortFirstAttestationDesc = document.getElementById("sortFirstAttestationDesc");
const lengthDonut = document.getElementById("lengthDonut");
const lengthHoverTerm = document.getElementById("lengthHoverTerm");
const lengthHoverWords = document.getElementById("lengthHoverWords");
const lengthHoverMeta = document.getElementById("lengthHoverMeta");
const lengthFilterAll = document.getElementById("lengthFilterAll");
const lengthFilterLemma = document.getElementById("lengthFilterLemma");
const lengthFilterVariant = document.getElementById("lengthFilterVariant");
const posPanel = document.getElementById("posPanel");
const posFilters = document.getElementById("posFilters");
const posDonut = document.getElementById("posDonut");
const posLegend = document.getElementById("posLegend");
const wordCloudPreviewA = document.getElementById("wordCloudPreviewA");
const wordCloudPreviewB = document.getElementById("wordCloudPreviewB");
const wordCloudPreviewC = document.getElementById("wordCloudPreviewC");
const chronologyYears = document.getElementById("chronologyYears");
const chronologyFirstAttestations = document.getElementById("chronologyFirstAttestations");
const firstAttestationScatter = document.getElementById("firstAttestationScatter");
const firstAttestationTooltip = document.getElementById("firstAttestationTooltip");
const scatterModal = document.getElementById("scatterModal");
const scatterModalStage = document.getElementById("scatterModalStage");
const scatterModalSvg = document.getElementById("scatterModalSvg");
const scatterModalTooltip = document.getElementById("scatterModalTooltip");
const closeScatterModalButton = document.getElementById("closeScatterModal");
const scatterExportButton = document.getElementById("scatterExportButton");
const scatterZoomInButton = document.getElementById("scatterZoomInButton");
const scatterZoomOutButton = document.getElementById("scatterZoomOutButton");
const scatterResetButton = document.getElementById("scatterResetButton");
const chronologyYearHoverTitle = document.getElementById("chronologyYearHoverTitle");
const chronologyYearHoverMeta = document.getElementById("chronologyYearHoverMeta");
const chronologyYearHoverTerms = document.getElementById("chronologyYearHoverTerms");
const trendsTermInput = document.getElementById("trendsTermInput");
const trendsTermOptions = document.getElementById("trendsTermOptions");
const trendsAddButton = document.getElementById("trendsAddButton");
const trendsSelected = document.getElementById("trendsSelected");
const trendsChart = document.getElementById("trendsChart");
const logoutButton = document.getElementById("logoutButton");
const homeLink = document.getElementById("homeLink");
const articleModal = document.getElementById("articleModal");
const articleModalTitle = document.getElementById("articleModalTitle");
const articleModalMeta = document.getElementById("articleModalMeta");
const articleModalBody = document.getElementById("articleModalBody");
const closeArticleModalButton = document.getElementById("closeArticleModal");

let currentEntries = [];
let activePosFilters = new Set();
let activeSubtypeFilters = new Set();
let currentPosStats = [];
let expandedPosGroups = new Set();
let activeSearchQuery = "";
let currentLengthStats = null;
let activeLengthType = "all";
let activeEntryType = "all";
let activeSort = { field: null, direction: null };
let firstAttestationScatterData = null;
let scatterModalState = { viewX: 0, viewY: 0, viewWidth: 1100, viewHeight: 320, dragging: false, dragX: 0, dragY: 0 };
let selectedTrendTerms = [];
let currentWordCloudData = null;

const donutPalette = [
  "#b45c3d",
  "#d08a4d",
  "#2d6a4f",
  "#6a625b",
  "#8f3b2e",
  "#5b7c99",
  "#8b6fb3",
  "#3d8a8c",
  "#c76d7b",
  "#897441",
];

const posDisplayOrder = [
  "substantiv",
  "adjectiv",
  "verb",
  "adverb",
  "conjuncție",
  "interjecție",
  "prepoziție",
  "element de compunere",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withSuperscriptIndex(term) {
  return String(term).replace(/([123])(?=-|$)/g, (_, digit) => {
    if (digit === "1") return "¹";
    if (digit === "2") return "²";
    return "³";
  });
}

function formatDisplayTerm(term) {
  return escapeHtml(withSuperscriptIndex(term || "—"));
}

function formatPossibleLemmas(entry) {
  if (entry.lema_tinta) {
    return withSuperscriptIndex(entry.lema_tinta);
  }
  if (entry.leme_posibile?.length) {
    return entry.leme_posibile.map((item) => withSuperscriptIndex(item)).join(", ");
  }
  return "—";
}

function normalizeForSearch(value) {
  return String(value || "")
    .replaceAll("¹", "1")
    .replaceAll("²", "2")
    .replaceAll("³", "3")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ș", "s")
    .replaceAll("ş", "s")
    .replaceAll("ț", "t")
    .replaceAll("ţ", "t");
}

function sortPosStatsForDisplay(posStats) {
  return [...(posStats || [])].sort((a, b) => {
    const ai = posDisplayOrder.indexOf(a.eticheta);
    const bi = posDisplayOrder.indexOf(b.eticheta);
    const ao = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bo = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (ao !== bo) return ao - bo;
    return a.eticheta.localeCompare(b.eticheta, "ro");
  });
}

function getLengthColor(index, total) {
  const hue = (index * (360 / Math.max(total, 1))) % 360;
  return `hsl(${hue} 58% 52%)`;
}

function getCloudColor(index, total) {
  const palette = [
    "#d85f54",
    "#de8a3a",
    "#d1b23f",
    "#7fb34d",
    "#4fa78f",
    "#4b8bc8",
    "#7d6dc0",
    "#b468b5",
    "#c77a8f",
    "#8b8f98",
  ];
  return palette[index % palette.length];
}

function getCloudPalette(style) {
  if (style === "editorial") {
    return ["#5c7cfa", "#51cf66", "#f59f00", "#e64980", "#845ef7", "#339af0", "#94d82d", "#ff8787", "#22b8cf", "#868e96"];
  }
  if (style === "pastel") {
    return ["#7c8bd6", "#98c379", "#e5b567", "#d3869b", "#8ec6c5", "#c3a6ff", "#f2a7a7", "#9bb1c8", "#a3be8c", "#d8a657"];
  }
  return ["#d85f54", "#de8a3a", "#d1b23f", "#7fb34d", "#4fa78f", "#4b8bc8", "#7d6dc0", "#b468b5", "#c77a8f", "#8b8f98"];
}

function closeFilterDropdown(button) {
  const details = button?.closest("details");
  if (details) {
    details.removeAttribute("open");
  }
}

function getDictionarySortLabel(entry) {
  if (entry.articol_header) {
    return entry.articol_header.replace(/\s(?=(?:s\.|adj\.|vb\.|adv\.|prep\.|conj\.|interj\.|elem\.|pron\.|art\.|num\.|expr\.))/i, "\n").split("\n")[0];
  }
  if (entry.articole_candidate?.length) {
    return entry.articole_candidate[0].replace(/\s(?=(?:s\.|adj\.|vb\.|adv\.|prep\.|conj\.|interj\.|elem\.|pron\.|art\.|num\.|expr\.))/i, "\n").split("\n")[0];
  }
  return entry.termen || "";
}

function compareEntries(a, b) {
  if (activeSort.field === "dictionary") {
    const left = normalizeForSearch(getDictionarySortLabel(a));
    const right = normalizeForSearch(getDictionarySortLabel(b));
    const order = left.localeCompare(right, "ro");
    if (order !== 0) {
      return activeSort.direction === "desc" ? -order : order;
    }
  }

  if (activeSort.field === "first_attestation") {
    const left = Number.isFinite(a.prima_atestare) ? a.prima_atestare : Number.POSITIVE_INFINITY;
    const right = Number.isFinite(b.prima_atestare) ? b.prima_atestare : Number.POSITIVE_INFINITY;
    if (left !== right) {
      const order = left - right;
      return activeSort.direction === "desc" ? -order : order;
    }
  }

  return normalizeForSearch(a.termen).localeCompare(normalizeForSearch(b.termen), "ro");
}

function updateSortButtons() {
  sortDictionaryAsc.classList.toggle("active", activeSort.field === "dictionary" && activeSort.direction === "asc");
  sortDictionaryDesc.classList.toggle("active", activeSort.field === "dictionary" && activeSort.direction === "desc");
  sortFirstAttestationAsc.classList.toggle("active", activeSort.field === "first_attestation" && activeSort.direction === "asc");
  sortFirstAttestationDesc.classList.toggle("active", activeSort.field === "first_attestation" && activeSort.direction === "desc");
}

function renderChronologyHover(titleNode, metaNode, termsNode, title, meta, terms) {
  if (titleNode) titleNode.textContent = title;
  if (metaNode) metaNode.textContent = meta;
  if (termsNode) {
    const list = (terms || []).slice(0, 10);
    termsNode.innerHTML = list.length
      ? list.map((term) => `<span class="chrono-term-chip">${formatDisplayTerm(term)}</span>`).join("")
      : '<span class="status-text">Nu există termeni disponibili.</span>';
  }
}

function renderVerticalChronologyChart(container, items, options = {}) {
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = "";
    return;
  }

  const maxValue = Math.max(...items.map((item) => item[options.valueKey] || 0), 1);
  const color = options.color || "linear-gradient(135deg, var(--accent), var(--accent-2))";
  container.innerHTML = items.map((item, index) => {
    const label = escapeHtml(String(item[options.labelKey]));
    const value = Number(item[options.valueKey] || 0);
    const height = Math.max((value / maxValue) * 180, 24);
    return `
      <div class="chrono-bar" data-chrono-index="${index}">
        <div class="chrono-bubble">${value}</div>
        <div class="chrono-stick-wrap">
          <div class="chrono-stick" style="height:${height}px; background:${color}"></div>
        </div>
        <div class="chrono-label">${label}</div>
      </div>
    `;
  }).join("");

  const applyHover = options.onHover;
  if (applyHover) {
    container.querySelectorAll("[data-chrono-index]").forEach((node) => {
      const target = options.hoverTargetSelector ? node.querySelector(options.hoverTargetSelector) || node : node;
      target.addEventListener("mouseenter", () => {
        const item = items[Number(node.dataset.chronoIndex)];
        applyHover(item);
      });
    });
    applyHover(items[0]);
  }
}

function buildFirstAttestationScatterData(entries) {
  const points = (entries || [])
    .filter((entry) => entry.tip === "lemă" && Number.isFinite(entry.prima_atestare))
    .sort((a, b) => a.prima_atestare - b.prima_atestare || normalizeForSearch(a.termen).localeCompare(normalizeForSearch(b.termen), "ro"));

  if (!points.length) {
    return null;
  }

  const width = 1100;
  const height = 320;
  const padding = { top: 20, right: 24, bottom: 48, left: 28 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const minYear = Math.min(...points.map((item) => item.prima_atestare));
  const maxYear = Math.max(...points.map((item) => item.prima_atestare));
  const yearSpan = Math.max(maxYear - minYear, 1);
  const stackByYear = new Map();
  const levels = 12;

  const positioned = points.map((item) => {
    const key = String(item.prima_atestare);
    const current = stackByYear.get(key) || 0;
    stackByYear.set(key, current + 1);
    const x = padding.left + ((item.prima_atestare - minYear) / yearSpan) * plotWidth;
    const level = current % levels;
    const y = padding.top + plotHeight - ((level + 1) / (levels + 1)) * plotHeight;
    return { ...item, x, y };
  });

  const tickCount = 8;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = Math.round(minYear + (index / tickCount) * yearSpan);
    const x = padding.left + (index / tickCount) * plotWidth;
    return { value, x };
  });

  return { width, height, padding, plotWidth, plotHeight, ticks, positioned };
}

function buildScatterMarkup(scatterData, modal = false) {
  return `
    <g class="scatter-grid">
    ${scatterData.ticks.map((tick) => `
      <line x1="${tick.x}" y1="${scatterData.padding.top}" x2="${tick.x}" y2="${scatterData.padding.top + scatterData.plotHeight}" stroke="rgba(88, 62, 30, 0.12)" stroke-width="1"></line>
      <text x="${tick.x}" y="${scatterData.height - 16}" text-anchor="middle" fill="#6d5a43" font-size="11" font-weight="700">${tick.value}</text>
    `).join("")}
    ${Array.from({ length: 5 }, (_, index) => {
      const y = scatterData.padding.top + (index / 4) * scatterData.plotHeight;
      return `<line x1="${scatterData.padding.left}" y1="${y}" x2="${scatterData.width - scatterData.padding.right}" y2="${y}" stroke="rgba(88, 62, 30, 0.08)" stroke-width="1"></line>`;
    }).join("")}
    </g>
    <g class="scatter-points">
    ${scatterData.positioned.map((item, index) => `
      <circle
        class="scatter-point${modal ? " modal-point" : ""}"
        data-point-index="${index}"
        cx="${item.x}"
        cy="${item.y}"
        r="4.6"
        fill="#d45d47"
        stroke="rgba(255, 250, 241, 0.96)"
        stroke-width="1.5"
      ></circle>
    `).join("")}
    </g>
  `;
}

function attachScatterHover(svgNode, tooltipNode, shellNode, scatterData) {
  const showTooltip = (item, event) => {
    tooltipNode.hidden = false;
    tooltipNode.innerHTML = `
      <strong>${formatDisplayTerm(item.termen)}</strong>
      <span>${item.prima_atestare}</span>
    `;
    const rect = shellNode.getBoundingClientRect();
    const left = Math.min(Math.max(event.clientX - rect.left + 12, 12), rect.width - 180);
    const top = Math.min(Math.max(event.clientY - rect.top - 18, 12), rect.height - 54);
    tooltipNode.style.left = `${left}px`;
    tooltipNode.style.top = `${top}px`;
  };

  svgNode.querySelectorAll(".scatter-point").forEach((node) => {
    node.addEventListener("mouseenter", (event) => {
      const item = scatterData.positioned[Number(node.dataset.pointIndex)];
      showTooltip(item, event);
    });
    node.addEventListener("mousemove", (event) => {
      const item = scatterData.positioned[Number(node.dataset.pointIndex)];
      showTooltip(item, event);
    });
    node.addEventListener("mouseleave", () => {
      tooltipNode.hidden = true;
    });
  });
}

function updateScatterModalViewBox() {
  if (!scatterModalSvg) return;
  scatterModalSvg.setAttribute(
    "viewBox",
    `${scatterModalState.viewX} ${scatterModalState.viewY} ${scatterModalState.viewWidth} ${scatterModalState.viewHeight}`,
  );
}

function resetScatterView() {
  if (!firstAttestationScatterData) return;
  scatterModalState = {
    viewX: 0,
    viewY: 0,
    viewWidth: firstAttestationScatterData.width,
    viewHeight: firstAttestationScatterData.height,
    dragging: false,
    dragX: 0,
    dragY: 0,
  };
  updateScatterModalViewBox();
}

function renderFirstAttestationScatter(entries) {
  if (!firstAttestationScatter || !firstAttestationTooltip) return;

  const scatterData = buildFirstAttestationScatterData(entries);
  firstAttestationScatterData = scatterData;
  if (!scatterData) {
    firstAttestationScatter.innerHTML = "";
    firstAttestationTooltip.hidden = true;
    return;
  }

  firstAttestationScatter.innerHTML = buildScatterMarkup(scatterData, false);
  attachScatterHover(firstAttestationScatter, firstAttestationTooltip, chronologyFirstAttestations, scatterData);
}

function openScatterModal() {
  if (!scatterModal || !scatterModalSvg || !firstAttestationScatterData) return;
  scatterModalSvg.innerHTML = buildScatterMarkup(firstAttestationScatterData, true);
  scatterModal.hidden = false;
  document.body.classList.add("modal-open");
  resetScatterView();
  attachScatterHover(scatterModalSvg, scatterModalTooltip, scatterModalStage, firstAttestationScatterData);
}

function closeScatterModal() {
  if (!scatterModal) return;
  scatterModal.hidden = true;
  scatterModalState.dragging = false;
  scatterModalStage?.classList.remove("is-dragging");
  if (scatterModalTooltip) scatterModalTooltip.hidden = true;
  document.body.classList.remove("modal-open");
}

async function exportScatterAsPng() {
  if (!firstAttestationScatterData || !scatterModalSvg) return;
  const clone = scatterModalSvg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "2200");
  clone.setAttribute("height", "640");
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 2200;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  context.fillStyle = "#fffaf3";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const link = document.createElement("a");
  link.download = "prima-atestare-leme.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function clampScatterViewBox() {
  const maxWidth = firstAttestationScatterData?.width || 1100;
  const maxHeight = firstAttestationScatterData?.height || 320;
  scatterModalState.viewWidth = Math.min(Math.max(scatterModalState.viewWidth, 180), maxWidth);
  scatterModalState.viewHeight = Math.min(Math.max(scatterModalState.viewHeight, 120), maxHeight);
  scatterModalState.viewX = Math.min(Math.max(scatterModalState.viewX, 0), maxWidth - scatterModalState.viewWidth);
  scatterModalState.viewY = Math.min(Math.max(scatterModalState.viewY, 0), maxHeight - scatterModalState.viewHeight);
}

function zoomScatter(factor, anchorX = 0.5, anchorY = 0.5) {
  const centerX = scatterModalState.viewX + scatterModalState.viewWidth * anchorX;
  const centerY = scatterModalState.viewY + scatterModalState.viewHeight * anchorY;
  scatterModalState.viewWidth /= factor;
  scatterModalState.viewHeight /= factor;
  scatterModalState.viewX = centerX - scatterModalState.viewWidth * anchorX;
  scatterModalState.viewY = centerY - scatterModalState.viewHeight * anchorY;
  clampScatterViewBox();
  updateScatterModalViewBox();
}

function panScatter(deltaX, deltaY) {
  if (!scatterModalStage) return;
  const rect = scatterModalStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  scatterModalState.viewX -= (deltaX / rect.width) * scatterModalState.viewWidth;
  scatterModalState.viewY -= (deltaY / rect.height) * scatterModalState.viewHeight;
  clampScatterViewBox();
  updateScatterModalViewBox();
}

function renderChronology(chronology, entries) {
  if (!chronology) return;

  renderFirstAttestationScatter(entries);
  renderVerticalChronologyChart(
    chronologyYears,
    chronology.top_ani_productivi || [],
    {
      labelKey: "an",
      valueKey: "numar",
      color: "linear-gradient(180deg, #ffbe63, #f18a2a)",
      hoverTargetSelector: ".chrono-bubble",
      onHover: (item) => renderChronologyHover(
        chronologyYearHoverTitle,
        chronologyYearHoverMeta,
        chronologyYearHoverTerms,
        String(item.an),
        `${item.numar} intrări menționează acest an. Mai jos vezi primele 10.`,
        item.termeni,
      ),
    },
  );
}

function renderTrendOptions(entries) {
  if (!trendsTermOptions) return;
  const terms = entries
    .map((entry) => entry.termen)
    .filter(Boolean)
    .sort((a, b) => normalizeForSearch(a).localeCompare(normalizeForSearch(b), "ro"));
  trendsTermOptions.innerHTML = terms
    .map((term) => `<option value="${escapeHtml(term)}"></option>`)
    .join("");
}

function renderSingleWordCloud(container, wordCloudData, options = {}) {
  if (!container) return;
  currentWordCloudData = wordCloudData;
  const items = (wordCloudData?.top || []).slice(0, 110);
  if (!items.length) {
    container.innerHTML = '<p class="status-text">Nu există suficiente date pentru norul de cuvinte.</p>';
    return;
  }

  const width = Math.max(container.clientWidth || 360, 360);
  const height = options.height || 280;
  const maxCount = Math.max(...items.map((item) => item.numar), 1);
  const minCount = Math.min(...items.map((item) => item.numar), maxCount);
  const logSpread = Math.max(Math.log(maxCount + 1) - Math.log(minCount + 1), 0.0001);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const placements = [];
  const palette = getCloudPalette(options.palette);
  const fontFamily = options.fontFamily || 'Fraunces, Georgia, serif';
  const minFont = options.minFont || 14;
  const maxFont = options.maxFont || 42;
  const rotateEvery = options.rotateEvery ?? 12;
  const allowVertical = options.allowVertical ?? false;
  const spiralStretch = options.spiralStretch || 0.78;

  const intersects = (a, b) => !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );

  items.forEach((item, index) => {
    const weight = (Math.log(item.numar + 1) - Math.log(minCount + 1)) / logSpread;
    const fontSize = minFont + weight * (maxFont - minFont);
    const rotateDeg = allowVertical && index % 17 === 0 ? 90 : index % rotateEvery === 0 ? -8 : index % Math.max(rotateEvery - 2, 6) === 0 ? 8 : 0;
    const label = withSuperscriptIndex(item.termen);
    context.font = `700 ${fontSize}px ${fontFamily}`;
    const measuredWidth = Math.max(context.measureText(label).width, fontSize * 1.6);
    const boxWidth = rotateDeg === 90 ? fontSize * 1.25 : measuredWidth + 10;
    const boxHeight = rotateDeg === 90 ? measuredWidth : fontSize * 1.22 + 8;
    const centerX = width / 2;
    const centerY = height / 2;
    let placed = null;

    for (let step = 0; step < 2600; step += 1) {
      const angle = step * 0.32;
      const radius = 5.4 * Math.sqrt(step);
      const x = centerX + Math.cos(angle) * radius - boxWidth / 2;
      const y = centerY + Math.sin(angle) * radius * spiralStretch - boxHeight / 2;
      const candidate = { x, y, width: boxWidth, height: boxHeight };
      if (x < 16 || y < 16 || x + boxWidth > width - 16 || y + boxHeight > height - 16) {
        continue;
      }
      if (placements.some((entry) => intersects(candidate, entry))) {
        continue;
      }
      placed = candidate;
      break;
    }

    if (!placed) return;
    placements.push({
      ...placed,
      term: item.termen,
      label,
      count: item.numar,
      fontSize,
      rotateDeg,
      color: palette[index % palette.length],
    });
  });

  container.style.minHeight = `${height}px`;
  container.innerHTML = placements.map((item) => `
    <button
      class="cloud-term cloud-term-positioned"
      type="button"
      data-cloud-term="${escapeHtml(item.term)}"
      title="${escapeHtml(item.label)} (${item.count} cuvinte)"
      style="left:${item.x.toFixed(1)}px; top:${item.y.toFixed(1)}px; width:${item.width.toFixed(1)}px; height:${item.height.toFixed(1)}px; font-size:${item.fontSize.toFixed(1)}px; color:${item.color}; transform:rotate(${item.rotateDeg}deg); opacity:${(0.72 + Math.min(item.fontSize / 70, 0.22)).toFixed(2)}; font-family:${fontFamily};"
    >
      ${escapeHtml(item.label)}
    </button>
  `).join("");
}

function renderWordCloudPreviews(wordCloudData) {
  renderSingleWordCloud(wordCloudPreviewA, wordCloudData, {
    palette: "default",
    height: 280,
    minFont: 14,
    maxFont: 40,
    rotateEvery: 15,
    allowVertical: false,
    spiralStretch: 0.86,
    fontFamily: 'Fraunces, Georgia, serif',
  });
  renderSingleWordCloud(wordCloudPreviewB, wordCloudData, {
    palette: "editorial",
    height: 280,
    minFont: 13,
    maxFont: 38,
    rotateEvery: 20,
    allowVertical: true,
    spiralStretch: 0.72,
    fontFamily: 'Manrope, system-ui, sans-serif',
  });
  renderSingleWordCloud(wordCloudPreviewC, wordCloudData, {
    palette: "pastel",
    height: 280,
    minFont: 14,
    maxFont: 44,
    rotateEvery: 18,
    allowVertical: false,
    spiralStretch: 0.82,
    fontFamily: 'Fraunces, Georgia, serif',
  });
}

function addTrendTerm(term) {
  const normalizedTerm = normalizeForSearch(term);
  if (!normalizedTerm) return;
  const entry = currentEntries.find((item) => normalizeForSearch(item.termen) === normalizedTerm);
  if (!entry || selectedTrendTerms.some((item) => normalizeForSearch(item) === normalizedTerm)) return;
  selectedTrendTerms.push(entry.termen);
  if (selectedTrendTerms.length > 5) {
    selectedTrendTerms = selectedTrendTerms.slice(-5);
  }
  renderTrends(currentEntries);
}

function removeTrendTerm(term) {
  selectedTrendTerms = selectedTrendTerms.filter((item) => normalizeForSearch(item) !== normalizeForSearch(term));
  renderTrends(currentEntries);
}

function renderTrends(entries) {
  if (!trendsSelected || !trendsChart) return;

  trendsSelected.innerHTML = selectedTrendTerms.map((term, index) => `
    <button class="trend-chip" type="button" data-trend-remove="${escapeHtml(term)}">
      <span class="trend-swatch" style="background:${donutPalette[index % donutPalette.length]}"></span>
      <span>${formatDisplayTerm(term)}</span>
      <span class="trend-chip-x">×</span>
    </button>
  `).join("");

  if (!selectedTrendTerms.length) {
    trendsChart.innerHTML = `
      <text x="550" y="160" text-anchor="middle" fill="#6d5a43" font-size="18" font-weight="700">
        Adaugă 1-5 termeni pentru a vedea distribuția lor în cronologie.
      </text>
    `;
    return;
  }

  const selectedEntries = selectedTrendTerms
    .map((term) => entries.find((entry) => normalizeForSearch(entry.termen) === normalizeForSearch(term)))
    .filter(Boolean);
  const series = selectedEntries.map((entry, index) => {
    const counts = new Map();
    (entry.ani_atestare || []).forEach((year) => {
      counts.set(year, (counts.get(year) || 0) + 1);
    });
    return {
      term: entry.termen,
      color: donutPalette[index % donutPalette.length],
      counts,
    };
  });

  const allYears = [...new Set(series.flatMap((item) => [...item.counts.keys()]))].sort((a, b) => a - b);
  if (!allYears.length) {
    trendsChart.innerHTML = `
      <text x="550" y="160" text-anchor="middle" fill="#6d5a43" font-size="18" font-weight="700">
        Termenii selectați nu au ani extrași pentru cronologie.
      </text>
    `;
    return;
  }

  const width = 1100;
  const height = 320;
  const padding = { top: 20, right: 24, bottom: 44, left: 118 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const minYear = allYears[0];
  const maxYear = allYears[allYears.length - 1];
  const yearSpan = Math.max(maxYear - minYear, 1);
  const laneHeight = plotHeight / Math.max(series.length, 1);
  const xForYear = (year) => padding.left + ((year - minYear) / yearSpan) * plotWidth;

  trendsChart.innerHTML = `
    <g>
      ${Array.from({ length: 8 }, (_, index) => {
        const year = Math.round(minYear + (index / 7) * yearSpan);
        const x = xForYear(year);
        return `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotHeight}" stroke="rgba(88,62,30,0.08)" stroke-width="1"></line>`;
      }).join("")}
      ${series.map((item, seriesIndex) => {
        const laneTop = padding.top + seriesIndex * laneHeight;
        const laneBottom = laneTop + laneHeight;
        const baselineY = laneBottom - 12;
        const maxCount = Math.max(...item.counts.values(), 1);
        const amplitude = Math.max(laneHeight - 26, 18);
        const points = [...item.counts.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([year, count]) => {
            const x = xForYear(year);
            const y = baselineY - (count / maxCount) * amplitude;
            return { year, count, x, y };
          });

        return `
          <line x1="${padding.left}" y1="${laneTop}" x2="${width - padding.right}" y2="${laneTop}" stroke="rgba(88,62,30,0.05)" stroke-width="1"></line>
          <line x1="${padding.left}" y1="${baselineY}" x2="${width - padding.right}" y2="${baselineY}" stroke="rgba(88,62,30,0.12)" stroke-width="1"></line>
          <text x="${padding.left - 12}" y="${laneTop + laneHeight / 2 - 4}" text-anchor="end" fill="${item.color}" font-size="12" font-weight="800">${escapeHtml(withSuperscriptIndex(item.term))}</text>
          <text x="${padding.left - 12}" y="${laneTop + laneHeight / 2 + 12}" text-anchor="end" fill="#8a765e" font-size="10" font-weight="700">max ${maxCount}/an</text>
          <polyline fill="none" stroke="${item.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points.map((point) => `${point.x},${point.y}`).join(" ")}"></polyline>
          ${points.map((point) => `
            <circle cx="${point.x}" cy="${point.y}" r="4.5" fill="${item.color}">
              <title>${escapeHtml(withSuperscriptIndex(item.term))}: ${point.year} (${point.count})</title>
            </circle>
          `).join("")}
        `;
      }).join("")}
      ${Array.from({ length: 8 }, (_, index) => {
        const year = Math.round(minYear + (index / 7) * yearSpan);
        const x = xForYear(year);
        return `
          <text x="${x}" y="${height - 14}" text-anchor="middle" fill="#6d5a43" font-size="11" font-weight="700">${year}</text>
        `;
      }).join("")}
    </g>
  `;
}

function openArticleModal(entry) {
  if (!entry?.articol_html) return;
  articleModalTitle.innerHTML = formatDisplayTerm(entry.termen);
  articleModalMeta.textContent = entry.informatie_gramaticala || "";
  articleModalBody.innerHTML = entry.articol_html;
  articleModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeArticleModal() {
  articleModal.hidden = true;
  articleModalBody.innerHTML = "";
  document.body.classList.remove("modal-open");
}

function renderLengthRanking(lengthData) {
  currentLengthStats = lengthData;
  if (!lengthData?.clasament?.length) {
    lengthDonut.innerHTML = "";
    return;
  }

  const filteredRanking = lengthData.clasament
    .filter((item) => {
      if (activeLengthType === "lemma") return item.tip === "lemă";
      if (activeLengthType === "variant") return item.tip === "variantă";
      return true;
    })
    .sort((a, b) => b.cuvinte - a.cuvinte || b.caractere - a.caractere || b.pagini - a.pagini || a.termen.localeCompare(b.termen));

  if (!filteredRanking.length) {
    lengthDonut.innerHTML = "";
    return;
  }

  const total = filteredRanking.reduce((sum, item) => sum + Math.max(item.cuvinte, 1), 0);
  let cumulative = 0;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const segments = filteredRanking.map((item, index) => {
    const weight = Math.max(item.cuvinte, 1);
    const start = cumulative / total;
    cumulative += weight;
    const end = cumulative / total;
    return { ...item, start, end, color: getLengthColor(index, filteredRanking.length) };
  });

  lengthDonut.innerHTML = `
    <svg viewBox="0 0 240 240" class="donut-svg" aria-label="Lungimea intrărilor">
      <circle cx="120" cy="120" r="${radius}" fill="none" stroke="#eadbc6" stroke-width="28"></circle>
      ${segments.map((segment, index) => {
        const dash = Math.max((segment.end - segment.start) * circumference, 1.2);
        const gap = Math.max(circumference - dash, 0);
        return `<circle data-length-index="${index}" cx="120" cy="120" r="${radius}" fill="none" stroke="${segment.color}" stroke-width="28" stroke-linecap="butt" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-segment.start * circumference}" transform="rotate(-90 120 120)"></circle>`;
      }).join("")}
      <text x="120" y="114" text-anchor="middle" class="donut-total-label">Intrări</text>
      <text x="120" y="140" text-anchor="middle" class="donut-total-value">${filteredRanking.length}</text>
    </svg>
  `;

  const updateHoverCard = (item) => {
    lengthHoverTerm.innerHTML = formatDisplayTerm(item.termen);
    lengthHoverWords.textContent = `${item.cuvinte} cuvinte`;
    lengthHoverMeta.textContent = `${item.tip} · ${item.pagini} pagini`;
  };

  updateHoverCard(filteredRanking[0]);

  lengthDonut.querySelectorAll("[data-length-index]").forEach((node) => {
    node.addEventListener("mouseenter", () => {
      updateHoverCard(filteredRanking[Number(node.dataset.lengthIndex)]);
    });
  });

  lengthFilterAll.classList.toggle("active", activeLengthType === "all");
  lengthFilterLemma.classList.toggle("active", activeLengthType === "lemma");
  lengthFilterVariant.classList.toggle("active", activeLengthType === "variant");
}

function renderEntries(entries) {
  currentEntries = entries;
  entriesBody.innerHTML = "";

  const visibleEntries = entries.filter((entry) => {
    const posOk = !activePosFilters.size || entry.parti_de_vorbire?.some((label) => activePosFilters.has(label));
    const subtypeLabels = Object.values(entry.subtipuri_pos || {}).flat();
    const subtypeOk = !activeSubtypeFilters.size || subtypeLabels.some((label) => activeSubtypeFilters.has(label));
    const searchOk = !activeSearchQuery || [
      entry.termen,
      entry.trimitere_la,
      entry.lema_tinta,
      ...(entry.leme_posibile || []),
    ].some((value) => normalizeForSearch(value).includes(activeSearchQuery));
    const typeOk = activeEntryType === "all" || entry.tip === activeEntryType;
    return posOk && subtypeOk && searchOk && typeOk;
  });

  visibleEntries.sort(compareEntries);

  visibleEntries.forEach((entry) => {
    const entryIndex = entries.indexOf(entry);
    const candidateTitles = entry.articole_candidate?.map((candidate) => {
      const titleOnly = candidate.replace(/\s(?=(?:s\.|adj\.|vb\.|adv\.|prep\.|conj\.|interj\.|elem\.|pron\.|art\.|num\.|expr\.))/i, "\n").split("\n")[0];
      return formatDisplayTerm(titleOnly);
    });

    const articleCell = entry.articol_html
      ? `<button class="open-article-button" type="button" data-entry-index="${entryIndex}">${formatDisplayTerm(entry.termen)}</button>`
      : candidateTitles?.length
        ? `<span class="candidate-list">${candidateTitles.join(" | ")}</span>`
        : "—";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${articleCell}</td>
      <td><div class="grammar-cell">${escapeHtml(entry.informatie_gramaticala || "—")}</div></td>
      <td>${entry.prima_atestare || "—"}</td>
      <td><span class="type-pill ${entry.tip === "variantă" ? "variant" : "lemma"}">${entry.tip}</span></td>
      <td>${formatDisplayTerm(entry.trimitere_la || "—")}</td>
    `;
    entriesBody.appendChild(row);
  });

  statusText.textContent = activePosFilters.size
    || activeSubtypeFilters.size
    || activeSearchQuery
    || activeEntryType !== "all"
    ? `Afișez ${visibleEntries.length} intrări filtrate.`
    : `Am încărcat ${entries.length} intrări.`;

  typeFilterAll.classList.toggle("active", activeEntryType === "all");
  typeFilterLemma.classList.toggle("active", activeEntryType === "lemă");
  typeFilterVariant.classList.toggle("active", activeEntryType === "variantă");
  updateSortButtons();
}

function renderPosFilters(posStats) {
  currentPosStats = sortPosStatsForDisplay(posStats);
  posFilters.innerHTML = "";
  currentPosStats.forEach((item) => {
    const group = document.createElement("div");
    group.className = "pos-group";

    if (item.subtipuri?.length) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pos-chip pos-chip-expandable${activePosFilters.has(item.eticheta) ? " active" : ""}`;
      button.innerHTML = `
        <span>${escapeHtml(item.eticheta)} (${item.numar})</span>
        <span class="pos-chevron">${expandedPosGroups.has(item.eticheta) ? "▾" : "▸"}</span>
      `;
      button.addEventListener("click", () => {
        if (activePosFilters.has(item.eticheta)) {
          activePosFilters.delete(item.eticheta);
        } else {
          activePosFilters.add(item.eticheta);
        }

        if (expandedPosGroups.has(item.eticheta)) {
          expandedPosGroups.delete(item.eticheta);
        } else {
          expandedPosGroups.add(item.eticheta);
        }

        renderPosFilters(posStats);
        renderEntries(currentEntries);
      });
      group.appendChild(button);

      const subtypeWrap = document.createElement("div");
      subtypeWrap.className = `pos-subtypes-inline${expandedPosGroups.has(item.eticheta) ? " open" : ""}`;

      const subtypeList = document.createElement("div");
      subtypeList.className = "pos-subtype-list";
      item.subtipuri.forEach((subtype) => {
        const subtypeButton = document.createElement("button");
        subtypeButton.type = "button";
        subtypeButton.className = `pos-chip subtype${activeSubtypeFilters.has(subtype.eticheta) ? " active" : ""}`;
        subtypeButton.textContent = `${subtype.eticheta} (${subtype.numar})`;
        subtypeButton.addEventListener("click", () => {
          if (activeSubtypeFilters.has(subtype.eticheta)) {
            activeSubtypeFilters.delete(subtype.eticheta);
          } else {
            activeSubtypeFilters.add(subtype.eticheta);
          }
          renderPosFilters(currentPosStats);
          renderEntries(currentEntries);
        });
        subtypeList.appendChild(subtypeButton);
      });
      subtypeWrap.appendChild(subtypeList);
      group.appendChild(subtypeWrap);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `pos-chip pos-chip-simple${activePosFilters.has(item.eticheta) ? " active" : ""}`;
      button.textContent = `${item.eticheta} (${item.numar})`;
      button.addEventListener("click", () => {
        if (activePosFilters.has(item.eticheta)) {
          activePosFilters.delete(item.eticheta);
        } else {
          activePosFilters.add(item.eticheta);
        }
        renderPosFilters(currentPosStats);
        renderEntries(currentEntries);
      });
      group.appendChild(button);
    }

    posFilters.appendChild(group);
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "pos-chip reset";
  resetButton.textContent = "Resetează filtrul";
  resetButton.addEventListener("click", () => {
    activePosFilters = new Set();
    activeSubtypeFilters = new Set();
    renderPosFilters(currentPosStats);
    renderEntries(currentEntries);
  });
  posFilters.appendChild(resetButton);
}

function renderPosDonut(posStats) {
  const displayStats = sortPosStatsForDisplay(posStats);
  const total = displayStats.reduce((sum, item) => sum + item.numar, 0);
  if (!total) {
    posDonut.innerHTML = "";
    posLegend.innerHTML = "";
    return;
  }

  let cumulative = 0;
  const segments = displayStats.map((item, index) => {
    const start = cumulative / total;
    cumulative += item.numar;
    const end = cumulative / total;
    return { ...item, start, end, color: donutPalette[index % donutPalette.length] };
  });

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  posDonut.innerHTML = `
    <svg viewBox="0 0 240 240" class="donut-svg" aria-label="Distribuție părți de vorbire">
      <circle cx="120" cy="120" r="${radius}" fill="none" stroke="#eadbc6" stroke-width="28"></circle>
      ${segments.map((segment, index) => {
        const dash = (segment.end - segment.start) * circumference;
        const gap = circumference - dash;
        return `<circle class="donut-segment" data-dash="${dash}" data-gap="${gap}" data-offset="${-segment.start * circumference}" data-delay="${index * 60}" cx="120" cy="120" r="${radius}" fill="none" stroke="${segment.color}" stroke-width="28" stroke-linecap="butt" stroke-dasharray="0 ${circumference}" stroke-dashoffset="0" transform="rotate(-90 120 120)"></circle>`;
      }).join("")}
      <text x="120" y="114" text-anchor="middle" class="donut-total-label">POS</text>
      <text x="120" y="140" text-anchor="middle" class="donut-total-value">${total}</text>
    </svg>
  `;

  requestAnimationFrame(() => {
    posDonut.querySelectorAll(".donut-segment").forEach((node) => {
      const dash = node.dataset.dash;
      const gap = node.dataset.gap;
      const offset = node.dataset.offset;
      const delay = Number(node.dataset.delay || 0) * 2 + 120;
      window.setTimeout(() => {
        node.style.strokeDasharray = `${dash} ${gap}`;
        node.style.strokeDashoffset = offset;
      }, delay);
    });
  });

  posLegend.innerHTML = "";
  segments.forEach((segment) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <span class="legend-swatch" style="background:${segment.color}"></span>
      <span>${segment.eticheta}</span>
      <strong>${segment.numar}</strong>
    `;
    posLegend.appendChild(item);
  });
}

async function ensureAuth() {
  const response = await fetch("/me");
  if (!response.ok) {
    window.location.href = "/";
    return false;
  }
  const me = await response.json();
  if (me.dictionary_only && homeLink) {
    homeLink.hidden = true;
  }
  return true;
}

async function loadDictionarySummary() {
  statusText.textContent = "Încarc și mapez dicționarul...";
  try {
    const response = await fetch("/api/dictionary-summary");
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Nu am putut încărca dicționarul.");
    }

    totalEntries.textContent = payload.statistica.total_intrari;
    lemmaEntries.textContent = payload.statistica.leme;
    variantEntries.textContent = payload.statistica.variante;
    fileMeta.textContent = `Listă: ${payload.fisier}`;
    docxMeta.textContent = `Dicționar: ${payload.docx.fisier} | articole: ${payload.docx.total_articole} | mapate unic: ${payload.docx.articole_mapate_unic} | candidați multipli: ${payload.docx.articole_cu_candidati_multipli}`;
    renderPosFilters(payload.statistica.parti_de_vorbire || []);
    renderPosDonut(payload.statistica.parti_de_vorbire || []);
    renderLengthRanking(payload.statistica.extindere_articole);
    renderWordCloudPreviews(payload.statistica.nor_cuvinte);
    renderChronology(payload.statistica.cronologie, payload.intrari);
    posPanel.hidden = false;
    renderTrendOptions(payload.intrari);
    renderTrends(payload.intrari);
    renderEntries(payload.intrari);
    statsGrid.hidden = false;
  } catch (error) {
    statusText.textContent = error.message;
  }
}

entriesBody.addEventListener("click", (event) => {
  const button = event.target.closest(".open-article-button");
  if (!button) return;
  openArticleModal(currentEntries[Number(button.dataset.entryIndex)]);
});

closeArticleModalButton.addEventListener("click", closeArticleModal);
articleModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeArticleModal();
  }
});
chronologyFirstAttestations.addEventListener("click", openScatterModal);
closeScatterModalButton.addEventListener("click", closeScatterModal);
scatterModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeScatterModal === "true") {
    closeScatterModal();
  }
});
scatterExportButton.addEventListener("click", () => {
  exportScatterAsPng();
});
scatterZoomInButton.addEventListener("click", () => {
  zoomScatter(1.2);
});
scatterZoomOutButton.addEventListener("click", () => {
  zoomScatter(1 / 1.2);
});
scatterResetButton.addEventListener("click", () => {
  resetScatterView();
});
scatterModalStage.addEventListener("wheel", (event) => {
  if (scatterModal.hidden) return;
  event.preventDefault();
  const rect = scatterModalStage.getBoundingClientRect();
  const anchorX = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
  const anchorY = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;
  zoomScatter(event.deltaY < 0 ? 1.12 : 1 / 1.12, anchorX, anchorY);
}, { passive: false });
scatterModalStage.addEventListener("mousedown", (event) => {
  if (scatterModal.hidden) return;
  event.preventDefault();
  scatterModalState.dragging = true;
  scatterModalState.dragX = event.clientX;
  scatterModalState.dragY = event.clientY;
  scatterModalStage.classList.add("is-dragging");
});
window.addEventListener("mousemove", (event) => {
  if (!scatterModalState.dragging) return;
  const deltaX = event.clientX - scatterModalState.dragX;
  const deltaY = event.clientY - scatterModalState.dragY;
  scatterModalState.dragX = event.clientX;
  scatterModalState.dragY = event.clientY;
  panScatter(deltaX, deltaY);
});
window.addEventListener("mouseup", () => {
  if (!scatterModalState.dragging) return;
  scatterModalState.dragging = false;
  scatterModalStage.classList.remove("is-dragging");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !articleModal.hidden) {
    closeArticleModal();
  }
  if (event.key === "Escape" && !scatterModal.hidden) {
    closeScatterModal();
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  window.location.href = "/";
});

termSearch.addEventListener("input", (event) => {
  activeSearchQuery = normalizeForSearch(event.target.value.trim());
  renderEntries(currentEntries);
});

trendsAddButton?.addEventListener("click", () => {
  addTrendTerm(trendsTermInput.value.trim());
  trendsTermInput.value = "";
});

trendsTermInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addTrendTerm(trendsTermInput.value.trim());
    trendsTermInput.value = "";
  }
});

trendsSelected?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-trend-remove]");
  if (!button) return;
  removeTrendTerm(button.dataset.trendRemove);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cloud-term]");
  if (!button) return;
  termSearch.value = button.dataset.cloudTerm;
  activeSearchQuery = normalizeForSearch(button.dataset.cloudTerm);
  renderEntries(currentEntries);
});

window.addEventListener("resize", () => {
  if (!currentWordCloudData) return;
  renderWordCloudPreviews(currentWordCloudData);
});

typeFilterAll.addEventListener("click", () => {
  activeEntryType = "all";
  renderEntries(currentEntries);
  closeFilterDropdown(typeFilterAll);
});

typeFilterLemma.addEventListener("click", () => {
  activeEntryType = "lemă";
  renderEntries(currentEntries);
  closeFilterDropdown(typeFilterLemma);
});

typeFilterVariant.addEventListener("click", () => {
  activeEntryType = "variantă";
  renderEntries(currentEntries);
  closeFilterDropdown(typeFilterVariant);
});

lengthFilterAll.addEventListener("click", () => {
  activeLengthType = "all";
  renderLengthRanking(currentLengthStats);
  closeFilterDropdown(lengthFilterAll);
});

lengthFilterLemma.addEventListener("click", () => {
  activeLengthType = "lemma";
  renderLengthRanking(currentLengthStats);
  closeFilterDropdown(lengthFilterLemma);
});

lengthFilterVariant.addEventListener("click", () => {
  activeLengthType = "variant";
  renderLengthRanking(currentLengthStats);
  closeFilterDropdown(lengthFilterVariant);
});

sortDictionaryAsc.addEventListener("click", () => {
  activeSort = { field: "dictionary", direction: "asc" };
  renderEntries(currentEntries);
});

sortDictionaryDesc.addEventListener("click", () => {
  activeSort = { field: "dictionary", direction: "desc" };
  renderEntries(currentEntries);
});

sortFirstAttestationAsc.addEventListener("click", () => {
  activeSort = { field: "first_attestation", direction: "asc" };
  renderEntries(currentEntries);
});

sortFirstAttestationDesc.addEventListener("click", () => {
  activeSort = { field: "first_attestation", direction: "desc" };
  renderEntries(currentEntries);
});

window.addEventListener("load", async () => {
  const ok = await ensureAuth();
  if (ok) {
    await loadDictionarySummary();
  }
});

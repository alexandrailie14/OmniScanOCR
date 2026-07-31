const totalEntries = document.getElementById("totalEntries");
const roEntries = document.getElementById("roEntries");
const geEntries = document.getElementById("geEntries");
const variantEntries = document.getElementById("variantEntries");
const posBars = document.getElementById("posBars");
const lengthBars = document.getElementById("lengthBars");
const directionTabs = document.getElementById("directionTabs");
const insightGrid = document.getElementById("insightGrid");
const properNamesNote = document.getElementById("properNamesNote");
const properNameSearch = document.getElementById("properNameSearch");
const properNameTypeFilter = document.getElementById("properNameTypeFilter");
const properCategoryBars = document.getElementById("properCategoryBars");
const properNamesCanvas = document.getElementById("properNamesCanvas");
const translationTechniquesNote = document.getElementById("translationTechniquesNote");
const translationTechniquesSource = document.getElementById("translationTechniquesSource");
const translationTechniqueCards = document.getElementById("translationTechniqueCards");
const germanElementsNote = document.getElementById("germanElementsNote");
const germanElementsDonut = document.getElementById("germanElementsDonut");
const germanElementsLegend = document.getElementById("germanElementsLegend");
const thematicZonesNote = document.getElementById("thematicZonesNote");
const thematicZonesDonut = document.getElementById("thematicZonesDonut");
const thematicZonesLegend = document.getElementById("thematicZonesLegend");
const nounDeclensionCoverage = document.getElementById("nounDeclensionCoverage");
const nounDeclensionDetail = document.getElementById("nounDeclensionDetail");
const nounDeclensionBars = document.getElementById("nounDeclensionBars");
const verbGroupCoverage = document.getElementById("verbGroupCoverage");
const verbGroupDetail = document.getElementById("verbGroupDetail");
const verbGroupBars = document.getElementById("verbGroupBars");
const entriesBody = document.getElementById("entriesBody");
const searchInput = document.getElementById("searchInput");
const directionFilter = document.getElementById("directionFilter");
const typeFilter = document.getElementById("typeFilter");
const posFilter = document.getElementById("posFilter");
const verbGroupFilter = document.getElementById("verbGroupFilter");
const statusText = document.getElementById("statusText");
const logoutButton = document.getElementById("logoutButton");
const articleDialog = document.getElementById("articleDialog");
const dialogMeta = document.getElementById("dialogMeta");
const dialogTitle = document.getElementById("dialogTitle");
const dialogText = document.getElementById("dialogText");
const closeDialog = document.getElementById("closeDialog");
const termsDialog = document.getElementById("termsDialog");
const termsDialogMeta = document.getElementById("termsDialogMeta");
const termsDialogTitle = document.getElementById("termsDialogTitle");
const termsDialogSource = document.getElementById("termsDialogSource");
const termsDialogFeatured = document.getElementById("termsDialogFeatured");
const termsDialogList = document.getElementById("termsDialogList");
const closeTermsDialog = document.getElementById("closeTermsDialog");

let payload = null;
let entries = [];
let activeStatsDirection = "all";

const DONUT_COLORS = ["#246b5f", "#a5563f", "#d08a4d", "#7d9d74", "#43546f", "#8a6a3f", "#b76575"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ș", "s")
    .replaceAll("ş", "s")
    .replaceAll("ț", "t")
    .replaceAll("ţ", "t");
}

function formatNumber(value) {
  return new Intl.NumberFormat("ro-RO").format(Number(value || 0));
}

function renderBars(target, rows) {
  const max = Math.max(1, ...rows.map((row) => row.numar || 0));
  target.innerHTML = rows.map((row) => {
    const percent = Math.max(2, Math.round(((row.numar || 0) / max) * 100));
    return `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(row.eticheta)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></span>
        <strong>${formatNumber(row.numar)}</strong>
      </div>
    `;
  }).join("");
}

function setMorphRing(target, percent, color, softColor) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  target.style.setProperty("--ring-percent", `${safePercent}%`);
  target.style.setProperty("--ring-color", color);
  target.style.setProperty("--ring-soft", softColor);
}

function renderMorphPills(target, rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.numar || 0), 0);
  target.innerHTML = rows.map((row, index) => {
    const count = Number(row.numar || 0);
    const percent = total ? Math.round((count / total) * 100) : 0;
    return `
      <span class="morph-pill" style="--pill-delay:${index * 45}ms">
        <strong>${escapeHtml(row.eticheta)}</strong>
        <span>${formatNumber(count)} · ${percent}%</span>
      </span>
    `;
  }).join("");
}

function renderDonut(chartTarget, legendTarget, analysisKey, rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.numar || 0), 0);
  if (!chartTarget || !legendTarget || !total) return;

  let cursor = 0;
  const segments = rows.map((row, index) => {
    const value = Number(row.numar || 0);
    const start = cursor;
    const end = cursor + (value / total) * 100;
    cursor = end;
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}% ${end}%`;
  });

  chartTarget.style.setProperty("--donut-bg", `conic-gradient(${segments.join(", ")})`);
  chartTarget.innerHTML = `
    <div class="donut-center">
      <strong>${formatNumber(total)}</strong>
      <span>intrări</span>
    </div>
  `;

  legendTarget.innerHTML = rows.map((row, index) => {
    const percent = Math.round((Number(row.numar || 0) / total) * 100);
    return `
      <button class="donut-legend-row" type="button" data-analysis="${escapeHtml(analysisKey)}" data-category-index="${index}">
        <span class="legend-dot" style="background:${DONUT_COLORS[index % DONUT_COLORS.length]}"></span>
        <span>${escapeHtml(row.eticheta)}</span>
        <strong>${formatNumber(row.numar)} · ${percent}%</strong>
      </button>
    `;
  }).join("");
}

function renderInterpretiveStats() {
  const german = payload.analize?.elemente_germane || {};
  const themes = payload.analize?.zone_tematice || {};
  germanElementsNote.textContent = german.nota || "";
  thematicZonesNote.textContent = themes.nota || "";
  renderDonut(germanElementsDonut, germanElementsLegend, "elemente_germane", german.categorii || []);
  renderDonut(thematicZonesDonut, thematicZonesLegend, "zone_tematice", themes.categorii || []);
}

function renderMorphologyStats() {
  const morph = payload.morfologie_ro_de || {};
  const nouns = morph.substantive || {};
  const verbs = morph.verbe || {};
  const nounPercent = nouns.procent_cu_declinare || 0;
  const verbPercent = verbs.procent_cu_conjugare || 0;

  nounDeclensionCoverage.innerHTML = `
    <div class="morph-ring-center">
      <strong>${nounPercent}%</strong>
      <span>${formatNumber(nouns.cu_declinare)} / ${formatNumber(nouns.total)}</span>
    </div>
  `;
  nounDeclensionDetail.textContent = `${formatNumber(nouns.cu_declinare)} substantive cu declinare explicită; ${formatNumber(nouns.fara_declinare)} fără marcaj.`;
  setMorphRing(nounDeclensionCoverage, nounPercent, "#246b5f", "#e1eee8");

  verbGroupCoverage.innerHTML = `
    <div class="morph-ring-center">
      <strong>${verbPercent}%</strong>
      <span>${formatNumber(verbs.cu_conjugare)} / ${formatNumber(verbs.total)}</span>
    </div>
  `;
  verbGroupDetail.textContent = `${formatNumber(verbs.cu_conjugare)} verbe cu grupă de conjugare; ${formatNumber(verbs.fara_conjugare)} fără marcaj.`;
  setMorphRing(verbGroupCoverage, verbPercent, "#a5563f", "#f0dfd5");

  renderMorphPills(nounDeclensionBars, nouns.gen_decl || nouns.declinari || []);
  renderMorphPills(verbGroupBars, verbs.grupe || []);
}

function statsForDirection(direction) {
  if (!payload) return null;
  if (direction === "RO-DE") return payload.statistica.pe_directii["RO-DE"];
  if (direction === "DE-RO") return payload.statistica.pe_directii["DE-RO"];
  return payload.statistica;
}

function renderStats() {
  const stats = payload.statistica;
  totalEntries.textContent = formatNumber(stats.total_intrari);
  roEntries.textContent = formatNumber(stats.pe_directii["RO-DE"].total_intrari);
  geEntries.textContent = formatNumber(stats.pe_directii["DE-RO"].total_intrari);
  variantEntries.textContent = formatNumber(stats.variante);

  const scoped = statsForDirection(activeStatsDirection);
  renderBars(posBars, scoped.parti_de_vorbire || []);
  renderBars(lengthBars, scoped.lungime_intrari || []);
}

function renderDocuments() {
  if (insightGrid) {
    insightGrid.innerHTML = (payload.profil?.idei || []).map((item) => `
      <article class="insight-card">
        <h3>${escapeHtml(item.titlu)}</h3>
        <p>${escapeHtml(item.text)}</p>
        <span class="source-note">${escapeHtml(item.sursa)}</span>
      </article>
    `).join("");
  }
  properNamesNote.textContent = payload.nume_proprii?.nota || "";
  renderProperNameTypeFilter();
  renderBars(properCategoryBars, payload.nume_proprii?.categorii || []);
  renderTranslationTechniques();
  renderProperNames();
}

function renderTranslationTechniques() {
  const techniques = payload.procedee_traducere_nume || {};
  const rows = techniques.categorii || [];
  translationTechniquesNote.textContent = techniques.nota || "";
  translationTechniquesSource.textContent = techniques.sursa || "";
  translationTechniqueCards.innerHTML = rows.map((item, index) => {
    const examples = (item.exemple || []).slice(0, 4).map((example) => `
      <button class="technique-example" type="button" data-proper-term="${escapeHtml(example.termen)}">
        <strong>${escapeHtml(example.termen)}</strong>
        <span>${escapeHtml((example.articol_text || "").slice(0, 96))}</span>
      </button>
    `).join("");
    return `
      <article class="translation-technique-card" style="--tech-color:${DONUT_COLORS[index % DONUT_COLORS.length]}">
        <div class="technique-stat">
          <strong>${formatNumber(item.numar)}</strong>
          <span>${item.procent}%</span>
        </div>
        <div class="technique-copy">
          <h5>${escapeHtml(item.eticheta)}</h5>
          <p>${escapeHtml(item.descriere)}</p>
        </div>
        <div class="technique-examples">
          ${examples}
        </div>
      </article>
    `;
  }).join("");
}

function renderProperNameTypeFilter() {
  const categories = [...new Set((payload.nume_proprii?.intrari || []).map((item) => item.categorie))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ro"));
  properNameTypeFilter.innerHTML = [
    '<option value="all">Toate tipurile</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`),
  ].join("");
}

function renderProperNames() {
  const query = normalize(properNameSearch.value);
  const category = properNameTypeFilter.value;
  const rows = (payload.nume_proprii?.intrari || []).filter((item) => {
    if (category !== "all" && item.categorie !== category) return false;
    if (!query) return true;
    return normalize([item.termen, item.categorie, item.articol_text].join(" ")).includes(query);
  });
  properNamesCanvas.innerHTML = rows.map((item) => {
    const preview = item.articol_text ? item.articol_text.slice(0, 180) : "";
    return `
      <button class="proper-name-card" type="button" data-proper-term="${escapeHtml(item.termen)}">
        <strong>${escapeHtml(item.termen)}</strong>
        <span>${escapeHtml(item.categorie)}</span>
        <small>${escapeHtml(preview)}</small>
      </button>
    `;
  }).join("");
}

function renderPosFilter() {
  const labels = [...new Set(entries.flatMap((entry) => entry.parti_de_vorbire || []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ro"));
  posFilter.innerHTML = [
    '<option value="all">Toate</option>',
    ...labels.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`),
  ].join("");
}

function renderVerbGroupFilter() {
  const groups = [...new Set(entries.map((entry) => entry.grupa_verb).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  verbGroupFilter.innerHTML = [
    '<option value="all">Toate</option>',
    ...groups.map((group) => `<option value="${escapeHtml(group)}">Grupa ${escapeHtml(group)}</option>`),
  ].join("");
}

function filteredEntries() {
  const query = normalize(searchInput.value);
  const direction = directionFilter.value;
  const type = typeFilter.value;
  const pos = posFilter.value;
  const verbGroup = verbGroupFilter.value;
  return entries.filter((entry) => {
    if (direction !== "all" && entry.directie !== direction) return false;
    if (type !== "all" && entry.tip !== type) return false;
    if (pos !== "all" && !(entry.parti_de_vorbire || []).includes(pos)) return false;
    if (verbGroup !== "all" && entry.grupa_verb !== verbGroup) return false;
    if (!query) return true;
    const haystack = normalize([
      entry.termen,
      entry.lema,
      entry.informatie_gramaticala,
      entry.articol_text,
      entry.parti_de_vorbire?.join(" "),
    ].join(" "));
    return haystack.includes(query);
  });
}

function renderEntries() {
  const rows = filteredEntries();
  statusText.textContent = "";
  entriesBody.innerHTML = rows.map((entry, index) => {
    const article = entry.articol_text || "";
    const preview = article.length > 220 ? `${article.slice(0, 220)}...` : article;
    const lemmaCell = entry.lema
      ? `<button class="lemma-link" type="button" data-lemma="${escapeHtml(entry.lema)}">${escapeHtml(entry.lema)}</button>`
      : "—";
    return `
      <tr>
        <td>${escapeHtml(entry.directie)}</td>
        <td class="term-cell">${escapeHtml(entry.termen)}</td>
        <td>${escapeHtml(entry.tip)}</td>
        <td>${lemmaCell}</td>
        <td>${escapeHtml((entry.parti_de_vorbire || []).join(", "))}</td>
        <td>${entry.grupa_verb ? `Grupa ${escapeHtml(entry.grupa_verb)}` : "—"}</td>
        <td>
          <div class="article-preview">${escapeHtml(preview || "Articol negăsit în Word/PDF.")}</div>
          ${article ? `<button class="article-button" type="button" data-entry-index="${index}">Vezi articol</button>` : ""}
        </td>
      </tr>
    `;
  }).join("");
}

function openArticle(entry) {
  dialogTitle.textContent = entry.termen;
  dialogMeta.textContent = `${entry.directie} · ${entry.tip}${entry.pagina ? ` · p. ${entry.pagina}` : ""}`;
  dialogText.textContent = entry.articol_text || "Articolul nu a fost găsit în Word.";
  articleDialog.showModal();
}

function findLemmaEntry(lemma, variantEntry) {
  const normalizedLemma = normalize(lemma);
  const sameDirection = entries.find((entry) =>
    entry.directie === variantEntry.directie
    && entry.tip === "lemă"
    && normalize(entry.termen) === normalizedLemma
  );
  if (sameDirection) return sameDirection;
  return entries.find((entry) =>
    entry.tip === "lemă"
    && normalize(entry.termen) === normalizedLemma
  );
}

function openTermsDialog(analysisKey, categoryIndex) {
  const analysis = payload.analize?.[analysisKey];
  const category = analysis?.categorii?.[Number(categoryIndex)];
  if (!category) return;

  const terms = category.termeni || [];
  const firstTerms = terms.slice(0, 5);
  const restTerms = terms.slice(5);
  termsDialogMeta.textContent = analysis.titlu || "Termeni";
  termsDialogTitle.textContent = `${category.eticheta} · ${formatNumber(category.numar)} intrări`;
  termsDialogSource.textContent = category.sursa || analysis.nota || "";
  termsDialogFeatured.innerHTML = firstTerms.map((item) => `
    <button class="term-pop-card" type="button" data-dialog-term="${escapeHtml(item.termen)}">
      <strong>${escapeHtml(item.termen)}</strong>
      <span>${escapeHtml([item.directie, item.tip].filter(Boolean).join(" · "))}</span>
      <small>${escapeHtml((item.articol_text || "").slice(0, 160))}</small>
    </button>
  `).join("");
  termsDialogList.innerHTML = restTerms.map((item) => `
    <button class="term-list-row" type="button" data-dialog-term="${escapeHtml(item.termen)}">
      <span>${escapeHtml(item.termen)}</span>
      <small>${escapeHtml([item.directie, item.tip].filter(Boolean).join(" · "))}</small>
    </button>
  `).join("");
  termsDialog.showModal();
}

async function loadSession() {
  const response = await fetch("/me");
  if (!response.ok) {
    window.location.href = "/";
  }
}

async function loadPayload() {
  await loadSession();
  const response = await fetch("/api/clemens-summary");
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Nu am putut încărca datele Clemens.");
  }
  payload = await response.json();
  entries = payload.intrari || [];
  renderPosFilter();
  renderVerbGroupFilter();
  renderStats();
  renderInterpretiveStats();
  renderMorphologyStats();
  renderDocuments();
  renderEntries();
}

directionTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-direction]");
  if (!button) return;
  activeStatsDirection = button.dataset.direction;
  directionTabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
  renderStats();
});

document.querySelectorAll(".donut-legend").forEach((legend) => {
  legend.addEventListener("click", (event) => {
    const row = event.target.closest("button[data-analysis]");
    if (!row) return;
    openTermsDialog(row.dataset.analysis, row.dataset.categoryIndex);
  });
});

[searchInput, directionFilter, typeFilter, posFilter, verbGroupFilter].forEach((control) => {
  control.addEventListener("input", renderEntries);
  control.addEventListener("change", renderEntries);
});

properNameSearch.addEventListener("input", renderProperNames);
properNameTypeFilter.addEventListener("change", renderProperNames);

properNamesCanvas.addEventListener("click", (event) => {
  const card = event.target.closest("button[data-proper-term]");
  if (!card) return;
  searchInput.value = card.dataset.properTerm || "";
  directionFilter.value = "all";
  typeFilter.value = "all";
  posFilter.value = "all";
  verbGroupFilter.value = "all";
  renderEntries();
  document.querySelector(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

translationTechniqueCards.addEventListener("click", (event) => {
  const card = event.target.closest("button[data-proper-term]");
  if (!card) return;
  searchInput.value = card.dataset.properTerm || "";
  directionFilter.value = "all";
  typeFilter.value = "all";
  posFilter.value = "all";
  verbGroupFilter.value = "all";
  renderEntries();
  document.querySelector(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

entriesBody.addEventListener("click", (event) => {
  const lemmaButton = event.target.closest("button[data-lemma]");
  if (lemmaButton) {
    const lemma = lemmaButton.dataset.lemma || "";
    const rows = filteredEntries();
    const row = lemmaButton.closest("tr");
    const rowIndex = row ? Array.from(entriesBody.children).indexOf(row) : -1;
    const variantEntry = rows[rowIndex];
    const lemmaEntry = findLemmaEntry(lemma, variantEntry || {});
    if (lemmaEntry) {
      openArticle(lemmaEntry);
    } else {
      dialogTitle.textContent = lemma;
      dialogMeta.textContent = "Lemă";
      dialogText.textContent = "Nu am găsit intrarea completă pentru această lemă.";
      articleDialog.showModal();
    }
    return;
  }
  const button = event.target.closest("button[data-entry-index]");
  if (!button) return;
  const rows = filteredEntries();
  const entry = rows[Number(button.dataset.entryIndex)];
  if (entry) openArticle(entry);
});

closeDialog.addEventListener("click", () => articleDialog.close());
closeTermsDialog.addEventListener("click", () => termsDialog.close());

termsDialog.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-dialog-term]");
  if (!button) return;
  searchInput.value = button.dataset.dialogTerm || "";
  directionFilter.value = "all";
  typeFilter.value = "all";
  posFilter.value = "all";
  verbGroupFilter.value = "all";
  renderEntries();
  termsDialog.close();
  document.querySelector(".table-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

logoutButton.addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  window.location.href = "/";
});

loadPayload().catch((error) => {
  statusText.textContent = error.message;
});

from __future__ import annotations

import csv
import re
import statistics
import unicodedata
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

from docx import Document

try:
    from PyPDF2 import PdfReader
except ModuleNotFoundError:  # local tooling may provide pypdf while the container provides PyPDF2
    from pypdf import PdfReader


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
SS_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

W = {"w": W_NS}
SS = {"ss": SS_NS}

ROMANIAN_POS_PATTERNS = [
    ("substantiv", re.compile(r"(^|[,\s])(?:m|f|c)\.\s*(?:[12]\.)?", re.IGNORECASE)),
    ("verb", re.compile(r"(^|[,\s])(?:[1-4]\.)", re.IGNORECASE)),
    ("adjectiv", re.compile(r"\b(?:adj\.|eigenschaftsw)", re.IGNORECASE)),
    ("adverb", re.compile(r"\b(?:adv\.|avv\.|adverb)", re.IGNORECASE)),
    ("prepoziție", re.compile(r"\b(?:prep\.|präposition)", re.IGNORECASE)),
    ("articol", re.compile(r"\bartikel\b", re.IGNORECASE)),
    ("numeral", re.compile(r"\b(?:zahlwort|num\.)", re.IGNORECASE)),
]

GERMAN_POS_PATTERNS = [
    ("substantiv", re.compile(r",\s*(?:der|die|das)\b|(?:^|\s)c\.", re.IGNORECASE)),
    ("verb", re.compile(r"^[a-zäöüß][^,]*en\b|^[a-zäöüß][^,]*eln\b|^[a-zäöüß][^,]*ern\b")),
    ("adjectiv", re.compile(r"\big\b|lich\b|isch\b|bar\b|haft\b|sam\b", re.IGNORECASE)),
    ("adverb", re.compile(r"\babends\b|\babermal\b|\babermals\b|\bwegs\b", re.IGNORECASE)),
]

KEYWORDS = {
    "nume proprii": ["nume proprii", "antroponim", "toponim", "onomastic", "proper"],
    "elemente germane": ["elemente germane", "influența germană", "germană", "germanism", "împrumut"],
    "dicționar bilingv": ["dicționar bilingv", "bilingv", "walachisch-deutsch", "deutsch-walachisch"],
    "instrument pedagogic": ["instrument pedagogic", "pedagogic", "gramatică", "învăța limba română"],
    "cuib lexical": ["cuib lexical", "cuiburi lexicale", "familie lexicală"],
    "transcriere": ["transcriere", "alfabet latin", "ortografiere"],
}

THEMATIC_RULES = [
    ("religie și calendar", ["dumnezeu", "christ", "christos", "sfânt", "sfant", "biserică", "biserica", "preot", "paște", "paste", "crăciun", "craciun", "sărbătoare", "sarbatoare", "gott", "kirche", "heilig", "ostern", "weihnacht"]),
    ("administrație și viață juridică", ["judec", "lege", "domn", "împărat", "imparat", "oraș", "oras", "sat", "țară", "tara", "vornic", "boier", "recht", "gesetz", "richter", "stadt", "land"]),
    ("gospodărie și viață domestică", ["casă", "casa", "masă", "masa", "pâine", "paine", "mâncare", "mancare", "haină", "haina", "pat", "ușă", "usa", "küche", "haus", "tisch", "brot"]),
    ("corp și viață biologică", ["cap", "ochi", "gură", "gura", "mână", "mana", "picior", "inimă", "inima", "sânge", "sange", "krank", "herz", "hand", "kopf", "auge"]),
    ("natură și agricultură", ["apă", "apa", "foc", "pământ", "pamant", "lemn", "copac", "iarbă", "iarba", "grâu", "grau", "vie", "cal", "bou", "vacă", "vaca", "wasser", "feuer", "baum", "feld", "pferd"]),
    ("meserii și statut social", ["meșter", "mester", "slugă", "sluga", "preot", "doctor", "învățător", "invatator", "soldat", "negustor", "handwerk", "meister", "knecht", "lehrer", "soldat"]),
    ("nume proprii și geografie", ["nume", "munten", "mold", "ungar", "sibiu", "brașov", "brasov", "kronstadt", "toponim", "antroponim"]),
]

GERMAN_ELEMENT_RULES = [
    ("grafii germane specifice", ["ä", "ö", "ü", "ß"]),
    ("religie în echivalare germană", ["gott", "kirche", "heilig", "christ", "ostern", "weihnacht", "himmel"]),
    ("administrație și viață civică", ["recht", "gesetz", "richter", "herr", "stadt", "land", "amt", "bürger"]),
    ("viață domestică și materială", ["haus", "tisch", "brot", "küche", "kleid", "bett", "geld", "wagen"]),
    ("natură și agricultură", ["wasser", "feuer", "baum", "wald", "feld", "pferd", "kuh", "ochs"]),
    ("echivalențe multiple", []),
]


def _normalize_key(value: str | None) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFD", str(value).strip().lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.translate(str.maketrans({"ș": "s", "ş": "s", "ț": "t", "ţ": "t"}))
    return re.sub(r"[^a-z0-9äöüß]+", "", text)


def _clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _read_docx_paragraphs(path: Path) -> list[str]:
    if not path.exists():
        return []
    doc = Document(path)
    paragraphs = []
    for paragraph in doc.paragraphs:
        text = _clean_text(paragraph.text)
        if text:
            paragraphs.append(text)
    return paragraphs


def _xlsx_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    values = []
    for si in root.findall("ss:si", SS):
        pieces = [node.text or "" for node in si.findall(".//ss:t", SS)]
        values.append("".join(pieces))
    return values


def _xlsx_sheet_path(zf: zipfile.ZipFile) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    first_sheet = workbook.find("ss:sheets/ss:sheet", SS)
    if first_sheet is None:
        return "xl/worksheets/sheet1.xml"
    rel_id = first_sheet.attrib.get(f"{{{REL_NS}}}id")
    if not rel_id:
        return "xl/worksheets/sheet1.xml"
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    for rel in rels:
        if rel.attrib.get("Id") == rel_id:
            target = rel.attrib.get("Target", "worksheets/sheet1.xml")
            return "xl/" + target.lstrip("/")
    return "xl/worksheets/sheet1.xml"


def _xlsx_cell_value(cell: ET.Element, shared: list[str]) -> str:
    value_node = cell.find("ss:v", SS)
    if value_node is None or value_node.text is None:
        inline = cell.find("ss:is/ss:t", SS)
        return inline.text if inline is not None and inline.text else ""
    raw = value_node.text
    if cell.attrib.get("t") == "s":
        try:
            return shared[int(raw)]
        except (ValueError, IndexError):
            return raw
    return raw


def _read_xlsx_rows(path: Path, sheet_name: str | None = None) -> list[list[str]]:
    if not path.exists():
        return []
    with zipfile.ZipFile(path) as zf:
        shared = _xlsx_shared_strings(zf)
        sheet_path = _xlsx_sheet_path(zf)
        if sheet_name:
            try:
                workbook = ET.fromstring(zf.read("xl/workbook.xml"))
                rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
                rel_map = {rel.attrib.get("Id"): rel.attrib.get("Target", "") for rel in rels}
                for sheet in workbook.findall("ss:sheets/ss:sheet", SS):
                    if sheet.attrib.get("name") == sheet_name:
                        rel_id = sheet.attrib.get(f"{{{REL_NS}}}id")
                        target = rel_map.get(rel_id, "worksheets/sheet1.xml")
                        sheet_path = "xl/" + target.lstrip("/")
                        break
            except Exception:
                pass
        sheet = ET.fromstring(zf.read(sheet_path))
        rows = []
        for row in sheet.findall(".//ss:row", SS):
            values = [_xlsx_cell_value(cell, shared) for cell in row.findall("ss:c", SS)]
            rows.append(values)
        return rows


def _read_ro_mapping(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = _read_xlsx_rows(path)
    if not rows:
        return []
    header = [str(item).strip().lower() for item in rows[0]]
    records = []
    for row in rows[1:]:
        padded = row + [""] * (len(header) - len(row))
        data = {header[i]: padded[i] for i in range(len(header))}
        term = _clean_text(data.get("word"))
        if not term:
            continue
        records.append({
            "term": term,
            "page": _safe_int(data.get("pages")),
            "is_variant": bool(_clean_text(data.get("variantă"))),
            "lemma": _clean_text(data.get("lema")),
        })
    return records


def _read_ge_mapping(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records = []
    with path.open(newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        for row in reader:
            if not row or not _clean_text(row[0]):
                continue
            records.append({
                "term": _clean_text(row[0]),
                "page": _safe_int(row[1] if len(row) > 1 else None),
                "is_variant": False,
                "lemma": "",
            })
    return records


def _safe_int(value) -> int | None:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def _candidate_terms(entry: dict) -> list[str]:
    term = entry["term"]
    candidates = [term]
    if "," in term:
        candidates.append(term.split(",", 1)[0].strip())
    if " und " in term:
        candidates.extend(part.strip() for part in term.split(" und ") if part.strip())
    return [candidate for candidate in candidates if candidate]


def _paragraph_index(paragraphs: list[str]) -> dict[str, list[str]]:
    index = defaultdict(list)
    for text in paragraphs:
        head = text.split(",", 1)[0].split(" ", 1)[0]
        index[_normalize_key(head)].append(text)
    return index


def _find_article(entry: dict, paragraphs: list[str], index: dict[str, list[str]]) -> str:
    normalized_terms = [_normalize_key(term) for term in _candidate_terms(entry)]
    for key in normalized_terms:
        for candidate in index.get(key, []):
            if _normalize_key(candidate).startswith(key):
                return candidate
    for key in normalized_terms:
        if not key:
            continue
        for paragraph in paragraphs:
            if _normalize_key(paragraph).startswith(key):
                return paragraph
    return ""


def _extract_ro_grammar(term: str, article: str) -> str:
    if not article:
        return ""
    rest = article[len(term):].strip() if article.lower().startswith(term.lower()) else article
    match = re.match(r"(?P<grammar>(?:(?:m|f|c)\.?\s*\d?\.?|[1-4]\.|und|von|avv\.|adj\.)[^,;.]*)", rest, re.IGNORECASE)
    if match:
        return _clean_text(match.group("grammar").strip(" ,"))
    first = rest.split(",", 1)[0].strip()
    return first if len(first) <= 32 else ""


def _extract_ro_reference_lemma(term: str, article: str) -> str:
    if not article:
        return ""
    rest = article[len(term):].strip() if article.lower().startswith(term.lower()) else article
    match = re.match(r"^\(?\s*S\.\s*(?P<lemma>[^),.;]+)", rest, re.IGNORECASE)
    if not match:
        return ""
    lemma = _clean_text(match.group("lemma")).strip(" ,.;:()[]")
    return lemma


def _extract_ro_verb_group(term: str, article: str, pos: list[str]) -> str:
    if "verb" not in pos or not article:
        return ""
    rest = article[len(term):].strip() if article.lower().startswith(term.lower()) else article
    match = re.match(r"^(?P<group>[1-4])\.", rest)
    return match.group("group") if match else ""


def _extract_ro_noun_declension(term: str, article: str) -> dict:
    if not article:
        return {}
    rest = article[len(term):].strip() if article.lower().startswith(term.lower()) else article
    match = re.match(r"^(?P<gen>[mfc])\.\s*(?P<decl>[12])\.?", rest, re.IGNORECASE)
    if not match:
        return {}
    return {
        "gen": match.group("gen").lower(),
        "declinare": match.group("decl"),
    }


def _extract_ge_grammar(term: str) -> str:
    if "," in term:
        grammar = term.split(",", 1)[1].strip()
        return grammar[:40]
    return ""


def _strip_ni(label: str) -> str:
    return re.sub(r"\s*\(n\.i\.\)\s*$", "", str(label or "")).strip()


def _with_ni(label: str) -> str:
    clean = _strip_ni(label)
    return f"{clean} (n.i.)" if clean else "neclasificat (n.i.)"


def _infer_pos_ni(direction: str, term: str, grammar: str, article: str) -> list[str]:
    if direction == "RO-DE":
        normalized_term = _normalize_key(term)
        if normalized_term in {"adoa", "adoao"} or re.search(r"\b(?:zwey|zwei|drei|vier|fünf|funf|sechs|sieben|acht|neun|zehn|zahlwort)\b", (article or "").lower()):
            return [_with_ni("numeral")]
        if normalized_term in {"am", "avem", "avea", "aavea", "aibiam", "aibi"} or "S. am" in (article or "") or "haben" in (article or "").lower():
            return [_with_ni("verb")]
        if re.match(r"^\s*a\s+\S*[àá]\s*$", term or "", re.IGNORECASE):
            return [_with_ni("verb")]
    return ["neclasificat"]


def _pos_for_entry(direction: str, term: str, grammar: str, article: str, inference_text: str = "") -> list[str]:
    source = " ".join([term, grammar, article[:120]])
    patterns = ROMANIAN_POS_PATTERNS if direction == "RO-DE" else GERMAN_POS_PATTERNS
    labels = [label for label, pattern in patterns if pattern.search(source)]
    if direction == "RO-DE" and "substantiv" in labels and "verb" in labels:
        grammar_start = grammar.strip().lower()
        if re.match(r"^(?:m|f|c)\.?\s*\d?\.?", grammar_start):
            labels = [label for label in labels if label != "verb"]
    if labels:
        return sorted(set(labels))
    return _infer_pos_ni(direction, term, grammar, inference_text or source)


def _entry_length_bucket(word_count: int) -> str:
    if word_count <= 8:
        return "scurtă"
    if word_count <= 22:
        return "medie"
    if word_count <= 55:
        return "amplă"
    return "foarte amplă"


def _page_number_from_pdf_text(text: str, fallback: int) -> int:
    match = re.match(r"\s*(?:ANDREAS CLEMENS\s+|KLEINES[^0-9]+)?(?P<page>\d{1,3})\b", text or "", flags=re.IGNORECASE)
    return _safe_int(match.group("page")) if match else fallback


def _read_dictionary_pdf_pages(path: Path) -> dict[int, str]:
    if not path.exists():
        return {}
    reader = PdfReader(str(path))
    pages = {}
    for index, page in enumerate(reader.pages, start=1):
        try:
            text = _clean_text(page.extract_text() or "")
        except Exception:
            continue
        if not text:
            continue
        printed_page = _page_number_from_pdf_text(text, index)
        pages[printed_page] = text
    return pages


def _find_fragment_on_pdf_page(entry: dict, pdf_pages: dict[int, str]) -> str:
    page = entry.get("page")
    if not page or page not in pdf_pages:
        return ""
    page_text = pdf_pages.get(page, "")
    terms = _candidate_terms(entry)
    if entry.get("lemma"):
        terms.append(entry["lemma"])
    normalized_page = normalize_for_offsets(page_text)
    for term in terms:
        normalized_term = normalize_for_offsets(term)
        if not normalized_term:
            continue
        index = normalized_page.find(normalized_term)
        if index < 0:
            continue
        start = max(0, index - 220)
        end = min(len(page_text), index + 760)
        fragment = page_text[start:end].strip()
        if start > 0:
            fragment = "..." + fragment
        if end < len(page_text):
            fragment = fragment + "..."
        return fragment
    return ""


def normalize_for_offsets(value: str | None) -> str:
    return _normalize_key(value)


def _build_entries(direction: str, mappings: list[dict], paragraphs: list[str], pdf_pages: dict[int, str] | None = None) -> list[dict]:
    index = _paragraph_index(paragraphs)
    pdf_pages = pdf_pages or {}
    entries = []
    for item in mappings:
        article = _find_article(item, paragraphs, index)
        source = "Word"
        if not article:
            article = _find_fragment_on_pdf_page(item, pdf_pages)
            if article:
                source = "PDF"
        reference_lemma = _extract_ro_reference_lemma(item["term"], article) if direction == "RO-DE" else ""
        lemma = item.get("lemma") or reference_lemma
        is_variant = bool(item.get("is_variant") or reference_lemma)
        grammar = _extract_ro_grammar(item["term"], article) if direction == "RO-DE" else _extract_ge_grammar(item["term"])
        pos_source = "" if (source == "PDF" and is_variant) or reference_lemma else article
        inference_source = "" if source == "PDF" and is_variant else article
        pos = _pos_for_entry(direction, item["term"], grammar, pos_source, inference_text=inference_source)
        verb_group = _extract_ro_verb_group(item["term"], article, pos) if direction == "RO-DE" else ""
        noun_declension = _extract_ro_noun_declension(item["term"], article) if direction == "RO-DE" else {}
        word_count = len(re.findall(r"\w+", article or item["term"], flags=re.UNICODE))
        entries.append({
            "directie": direction,
            "termen": item["term"],
            "tip": "variantă" if is_variant else "lemă",
            "lema": lemma,
            "pagina": item.get("page"),
            "informatie_gramaticala": grammar,
            "parti_de_vorbire": pos,
            "grupa_verb": verb_group,
            "declinare_substantiv": noun_declension.get("declinare", ""),
            "gen_substantiv": noun_declension.get("gen", ""),
            "articol_text": article,
            "articol_gasit": bool(article),
            "sursa_articol": source if article else "",
            "numar_cuvinte": word_count,
            "lungime": _entry_length_bucket(word_count),
        })
    return entries


def _parse_audit_pos(value: str) -> list[str]:
    text = _clean_text(value)
    if not text:
        return []
    parts = [part.strip() for part in re.split(r"[,;/]", text) if part.strip()]
    return parts or [text]


def _read_pos_audit_overrides(clemens_dir: Path) -> dict[int, dict]:
    path = clemens_dir.parent / "clemens_exports" / "clemens_pos_audit.xlsx"
    rows = _read_xlsx_rows(path, sheet_name="Audit POS")
    if not rows:
        return {}
    header = [str(item).strip() for item in rows[0]]
    overrides = {}
    for row in rows[1:]:
        padded = row + [""] * (len(header) - len(row))
        data = {header[i]: padded[i] for i in range(len(header))}
        entry_id = _safe_int(data.get("id"))
        if not entry_id:
            continue
        patch = {}
        pos_value = _clean_text(data.get("pos_corect_de_completat"))
        group_value = _clean_text(data.get("grupa_verb_corecta"))
        if pos_value:
            patch["parti_de_vorbire"] = _parse_audit_pos(pos_value)
            patch["pos_corectat_din_audit"] = True
        if group_value and re.fullmatch(r"[1-4]", group_value):
            patch["grupa_verb"] = group_value
        if patch:
            overrides[entry_id] = patch
    return overrides


def _apply_pos_audit_overrides(entries: list[dict], overrides: dict[int, dict]) -> list[dict]:
    for index, entry in enumerate(entries, start=1):
        patch = overrides.get(index)
        if not patch:
            continue
        if "parti_de_vorbire" in patch:
            entry["parti_de_vorbire"] = patch["parti_de_vorbire"]
            entry["pos_corectat_din_audit"] = True
        if "grupa_verb" in patch:
            entry["grupa_verb"] = patch["grupa_verb"]
    return entries


def _dedupe_entries(entries: list[dict]) -> list[dict]:
    seen = set()
    result = []
    for entry in entries:
        key = (
            entry.get("directie") or "",
            _normalize_key(entry.get("termen") or ""),
            entry.get("tip") or "",
            _normalize_key(entry.get("lema") or ""),
            _normalize_key((entry.get("articol_text") or "")[:260]),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(entry)
    return result


def _base_pos_labels(entry: dict) -> set[str]:
    return {_strip_ni(pos) for pos in entry.get("parti_de_vorbire") or []}


def _morphology_stats(ro_entries: list[dict]) -> dict:
    nouns = [entry for entry in ro_entries if "substantiv" in _base_pos_labels(entry)]
    verbs = [entry for entry in ro_entries if "verb" in _base_pos_labels(entry)]
    noun_with_decl = [entry for entry in nouns if entry.get("declinare_substantiv")]
    verb_with_group = [entry for entry in verbs if re.fullmatch(r"[1-4]", str(entry.get("grupa_verb") or ""))]
    noun_decl_counts = Counter(entry.get("declinare_substantiv") for entry in noun_with_decl)
    noun_gender_decl_counts = Counter(
        f"{entry.get('gen_substantiv')}. {entry.get('declinare_substantiv')}"
        for entry in noun_with_decl
    )
    verb_group_counts = Counter(entry.get("grupa_verb") for entry in verb_with_group)

    def pct(part: int, total: int) -> float:
        return round((part / total) * 100, 1) if total else 0

    return {
        "substantive": {
            "total": len(nouns),
            "cu_declinare": len(noun_with_decl),
            "fara_declinare": max(0, len(nouns) - len(noun_with_decl)),
            "procent_cu_declinare": pct(len(noun_with_decl), len(nouns)),
            "declinari": [{"eticheta": f"Declinarea {k}", "numar": v} for k, v in sorted(noun_decl_counts.items())],
            "gen_decl": [{"eticheta": k, "numar": v} for k, v in noun_gender_decl_counts.most_common()],
        },
        "verbe": {
            "total": len(verbs),
            "cu_conjugare": len(verb_with_group),
            "fara_conjugare": max(0, len(verbs) - len(verb_with_group)),
            "procent_cu_conjugare": pct(len(verb_with_group), len(verbs)),
            "grupe": [{"eticheta": f"Grupa {k}", "numar": v} for k, v in sorted(verb_group_counts.items(), key=lambda item: int(item[0]))],
        },
    }


def _stats_for_entries(entries: list[dict]) -> dict:
    pos_counts = Counter()
    length_counts = Counter()
    missing_articles = 0
    for entry in entries:
        for pos in entry["parti_de_vorbire"]:
            pos_counts[pos] += 1
        length_counts[entry["lungime"]] += 1
        if not entry["articol_gasit"]:
            missing_articles += 1
    word_counts = [entry["numar_cuvinte"] for entry in entries if entry["numar_cuvinte"]]
    return {
        "total_intrari": len(entries),
        "leme": sum(1 for entry in entries if entry["tip"] == "lemă"),
        "variante": sum(1 for entry in entries if entry["tip"] == "variantă"),
        "articole_gasite": sum(1 for entry in entries if entry["articol_gasit"]),
        "articole_lipsa": missing_articles,
        "parti_de_vorbire": [{"eticheta": k, "numar": v} for k, v in pos_counts.most_common()],
        "lungime_intrari": [{"eticheta": k, "numar": v} for k, v in length_counts.most_common()],
        "media_cuvinte": round(statistics.mean(word_counts), 1) if word_counts else 0,
        "mediana_cuvinte": round(statistics.median(word_counts), 1) if word_counts else 0,
    }


def _read_pdf_text(path: Path, max_pages: int | None = None) -> tuple[int, str]:
    if not path.exists():
        return 0, ""
    reader = PdfReader(str(path))
    limit = len(reader.pages) if max_pages is None else min(max_pages, len(reader.pages))
    pieces = []
    for i in range(limit):
        try:
            pieces.append(reader.pages[i].extract_text() or "")
        except Exception:
            continue
    return len(reader.pages), "\n".join(pieces)


def _document_stats(clemens_dir: Path) -> list[dict]:
    docs = [
        ("Ediția filologică", clemens_dir / "Andreas_Clemens_Editie_filologica.pdf"),
        ("Specificul dicționarului", clemens_dir / "specific_Clemens.docx"),
        ("Inventarul numelor proprii", clemens_dir / "Inventarul_numelor_proprii_din_Kleines_W.pdf"),
        ("Elementele germane", clemens_dir / "Elementele_germane_din_lucrarea_Kleines.pdf"),
        ("Clemens între gramatică și dicționar", clemens_dir / "Importanta_lui_Andreas_Clemens.pdf"),
        ("Kleines walachisch-deutsch", clemens_dir / "Andreas_Clemens_Kleines_walachisch_deuts.pdf"),
    ]
    result = []
    for label, path in docs:
        if path.suffix.lower() == ".docx":
            paragraphs = _read_docx_paragraphs(path)
            text = "\n".join(paragraphs)
            pages = None
        else:
            pages, text = _read_pdf_text(path, max_pages=80)
        lowered = text.lower()
        keyword_hits = {
            group: sum(lowered.count(keyword.lower()) for keyword in keywords)
            for group, keywords in KEYWORDS.items()
        }
        result.append({
            "titlu": label,
            "fisier": path.name,
            "pagini": pages,
            "cuvinte": len(re.findall(r"\w+", text, flags=re.UNICODE)),
            "indicatori": [{"eticheta": k, "numar": v} for k, v in sorted(keyword_hits.items(), key=lambda item: (-item[1], item[0])) if v],
            "rezumat": _summary_for_document(label),
        })
    return result


def _summary_for_document(label: str) -> str:
    summaries = {
        "Ediția filologică": "Textul de bază al ediției, util pentru raportarea paginilor și verificarea formei tipărite.",
        "Specificul dicționarului": "Descrie structurile lexicografice: articole simple, cuiburi lexicale, variante, grafii și dificultăți de lematizare.",
        "Inventarul numelor proprii": "Document de lucru pentru analiza elementelor enciclopedice și a numelor proprii din Kleines Wörterbuch.",
        "Elementele germane": "Fundal pentru analiza influenței germane și a împrumuturilor în materialul românesc.",
        "Clemens între gramatică și dicționar": "Contextualizează dicționarul ca instrument pedagogic și ca anexă a gramaticii lui Clemens.",
        "Kleines walachisch-deutsch": "Studiu contextual despre dicționar și practica traducerii în epoca modernizării culturale.",
    }
    return summaries.get(label, "")


def _looks_like_ro_proper_name(entry: dict) -> bool:
    if entry.get("directie") != "RO-DE":
        return False
    term = str(entry.get("termen") or "").strip()
    if not term or not term[0].isupper():
        return False
    return not re.search(r"\b(?:S\.|von|und)\b", term)


def _proper_name_category(entry: dict) -> str:
    term = str(entry.get("termen") or "")
    article = str(entry.get("articol_text") or "")
    source = f"{term} {article}".lower()
    if re.search(r"africa|gal[ií]ț|ungar|mold|munten|sibiu|braș|kronstadt|brenndorf|țar|land|stadt", source):
        return "toponime / etnonime"
    if re.search(r"aaron|adam|avraam|iustin|agnes|august|albert|maria|ioan|alex", source):
        return "antroponime"
    if re.search(r"dumnezeu|christ|christos|sf[âa]nt|teonim|gott", source):
        return "teonime / termeni religioși"
    if re.search(r"paște|crăciun|sărbătoare|himmelfahrt", source):
        return "nume de sărbători"
    return "alte nume proprii"


def _proper_name_inventory(entries: list[dict]) -> dict:
    candidates = [entry for entry in entries if _looks_like_ro_proper_name(entry)]
    category_counts = Counter(_proper_name_category(entry) for entry in candidates)
    rows = []
    for entry in candidates:
        rows.append({
            "termen": entry["termen"],
            "categorie": _proper_name_category(entry),
            "directie": entry["directie"],
            "lema": entry.get("lema") or "",
            "pagina": entry.get("pagina"),
            "articol_text": entry.get("articol_text") or "",
        })
    return {
        "total_candidati": len(candidates),
        "categorii": [{"eticheta": k, "numar": v} for k, v in category_counts.most_common()],
        "intrari": sorted(rows, key=lambda item: _normalize_key(item["termen"]))[:500],
        "nota": "Inventarul de specialitate menționează cca 500 de intrări onomastice; lista de aici este un canvas de lucru extras automat din intrările RO-DE cu inițială majusculă.",
    }


TRANSLATION_TECHNIQUE_DEFINITIONS = [
    {
        "id": "acomodare_formala",
        "label": "Acomodare formală",
        "note": "Numele este adaptat grafic sau morfologic la sistemul românesc: transcriere, aproximare fonetică sau transliterare.",
    },
    {
        "id": "calc",
        "label": "Calc",
        "note": "Structura numelui este redată cuvânt cu cuvânt, total sau parțial.",
    },
    {
        "id": "traducere_literala",
        "label": "Traducere literală / transpunere",
        "note": "Procedeu vizibil mai ales la toponime și astronime, când numele este transferat semantic.",
    },
    {
        "id": "paranteza_explicativa",
        "label": "Paranteză explicativă",
        "note": "Articolul adaugă informație enciclopedică: oraș, munte, regiune, reședință etc.",
    },
    {
        "id": "echivalenta_totala",
        "label": "Echivalență totală",
        "note": "Echivalent formal și conceptual, frecvent la sărbători și referenți culturali.",
    },
    {
        "id": "substituire",
        "label": "Substituire",
        "note": "Un referent este redat printr-un nume consacrat sau printr-o denumire echivalentă în tradiția țintă.",
    },
]


def _proper_translation_technique(entry: dict) -> str:
    term = str(entry.get("termen") or "")
    article = str(entry.get("articol_text") or "")
    probe = _normalize_key(f"{term} {article}")
    low = f"{term} {article}".lower()

    if re.search(r"\([^)]*(?:stadt|hauptstadt|residenzstadt|marktfleck|berg|flu[ßs]|oesterreich|land|königreich|herzogthum|regiune|oraș)[^)]*\)", low):
        return "paranteza_explicativa"
    if any(key in probe for key in ["tarabirsii", "apoldamare", "cinculmare", "burzenland", "grosspolden", "grossschenk"]):
        return "calc"
    if any(key in probe for key in ["cetatedebalta", "lacbodamicesc", "bodensee", "kokelburg"]):
        return "traducere_literala"
    if any(key in probe for key in ["palmsontag", "himmelfahrt", "rusalie", "pfingsten", "duminecaflorilor", "inaltariilaceriu"]):
        return "echivalenta_totala"
    if any(key in probe for key in ["afrodisis", "venus", "dumnezeu", "gott", "tarigrad", "konstantinopel", "taraturceasca", "turkey", "tarafranceasca", "frankreich", "walachey", "valahia"]):
        return "substituire"
    return "acomodare_formala"


def _proper_name_translation_techniques(entries: list[dict]) -> dict:
    candidates = [entry for entry in entries if _looks_like_ro_proper_name(entry)]
    by_id = {item["id"]: {**item, "count": 0, "examples": []} for item in TRANSLATION_TECHNIQUE_DEFINITIONS}

    for entry in candidates:
        technique_id = _proper_translation_technique(entry)
        bucket = by_id[technique_id]
        bucket["count"] += 1
        if len(bucket["examples"]) < 8:
            bucket["examples"].append({
                "termen": entry.get("termen") or "",
                "articol_text": entry.get("articol_text") or "",
            })

    total = max(1, len(candidates))
    return {
        "total": len(candidates),
        "sursa": "Mariana Nastasia, „Procedee de traducere a numelor proprii din dicționarul lui Andreas Clemens”, 2025.",
        "nota": "Clasificarea de mai jos transpune procedeele discutate în studiu într-o lectură automată a intrărilor onomastice. Exemplele sunt selectate din articolele dicționarului.",
        "categorii": [
            {
                "id": item["id"],
                "eticheta": item["label"],
                "descriere": item["note"],
                "numar": by_id[item["id"]]["count"],
                "procent": round((by_id[item["id"]]["count"] / total) * 100, 1),
                "exemple": by_id[item["id"]]["examples"],
            }
            for item in TRANSLATION_TECHNIQUE_DEFINITIONS
        ],
    }


def _entry_probe(entry: dict) -> str:
    return " ".join([
        str(entry.get("termen") or ""),
        str(entry.get("lema") or ""),
        str(entry.get("informatie_gramaticala") or ""),
        str(entry.get("articol_text") or ""),
    ])


def _keyword_hit(text: str, keywords: list[str]) -> bool:
    low = text.lower()
    normalized = _normalize_key(text)
    for keyword in keywords:
        if not keyword:
            continue
        if keyword.lower() in low or _normalize_key(keyword) in normalized:
            return True
    return False


def _compact_term_sample(entries: list[dict], limit: int = 120) -> list[dict]:
    seen = set()
    sample = []
    for entry in sorted(entries, key=lambda item: _normalize_key(item.get("termen") or "")):
        term = str(entry.get("termen") or "").strip()
        if not re.search(r"[A-Za-zăâîșțĂÂÎȘȚäöüßÄÖÜ]", term):
            continue
        key = _normalize_key(term)
        if not key or key in seen:
            continue
        seen.add(key)
        sample.append({
            "termen": entry.get("termen") or "",
            "directie": entry.get("directie") or "",
            "tip": entry.get("tip") or "",
            "lema": entry.get("lema") or "",
            "articol_text": entry.get("articol_text") or "",
        })
        if len(sample) >= limit:
            break
    return sample


def _thematic_profile(entries: list[dict]) -> dict:
    ro_entries = [entry for entry in entries if entry.get("directie") == "RO-DE"]
    categories = []
    for label, keywords in THEMATIC_RULES:
        matches = [entry for entry in ro_entries if _keyword_hit(_entry_probe(entry), keywords)]
        if not matches:
            continue
        categories.append({
            "eticheta": label,
            "numar": len(matches),
            "termeni": _compact_term_sample(matches),
            "sursa": "Categorii inspirate din studiile despre specificul dicționarului, inventarul numelor proprii și analiza elementelor germane; termenii sunt extrași automat din intrările RO-DE.",
        })
    return {
        "titlu": "Zone tematice",
        "nota": "Grupează intrările după câmpuri tematice utile pentru lectura dicționarului, nu după o clasificare editorială definitivă.",
        "categorii": sorted(categories, key=lambda item: item["numar"], reverse=True),
    }


def _german_element_profile(entries: list[dict]) -> dict:
    ro_entries = [entry for entry in entries if entry.get("directie") == "RO-DE"]
    categories = []
    for label, keywords in GERMAN_ELEMENT_RULES:
        if label == "grafii germane specifice":
            matches = [entry for entry in ro_entries if re.search(r"[äöüßÄÖÜ]", _entry_probe(entry))]
        elif label == "echivalențe multiple":
            matches = [
                entry for entry in ro_entries
                if (entry.get("articol_text") or "").count(",") >= 3 or ";" in (entry.get("articol_text") or "")
            ]
        else:
            matches = [entry for entry in ro_entries if _keyword_hit(_entry_probe(entry), keywords)]
        if not matches:
            continue
        categories.append({
            "eticheta": label,
            "numar": len(matches),
            "termeni": _compact_term_sample(matches),
            "sursa": "Categorii inspirate din studiul despre elementele germane; valorile sunt calculate automat pe intrările RO-DE și echivalările din articol.",
        })
    return {
        "titlu": "Elemente germane",
        "nota": "Evidențiază zone în care echivalarea germană sau contactul lexical devin vizibile în articole.",
        "categorii": sorted(categories, key=lambda item: item["numar"], reverse=True),
    }


def _interpretive_statistics(entries: list[dict]) -> dict:
    return {
        "elemente_germane": _german_element_profile(entries),
        "zone_tematice": _thematic_profile(entries),
    }


def _research_profile(entries: list[dict]) -> dict:
    ro_count = sum(1 for entry in entries if entry["directie"] == "RO-DE")
    ge_count = sum(1 for entry in entries if entry["directie"] == "DE-RO")
    complex_nests = [
        entry for entry in entries
        if entry["directie"] == "RO-DE" and (
            ";" in (entry.get("articol_text") or "")
            or len(re.findall(r"\b[a-zA-ZăâîșțĂÂÎȘȚ]+\s+[a-zA-ZăâîșțĂÂÎȘȚ]+\b", entry.get("termen") or "")) > 0
        )
    ]
    german_equivalence_chains = [
        entry for entry in entries
        if entry["directie"] == "RO-DE" and (entry.get("articol_text") or "").count(",") >= 4
    ]
    return {
        "idei": [
            {
                "titlu": "Dicționar bilingv în două direcții",
                "text": f"Interfața tratează separat partea român-germană ({ro_count} intrări) și partea german-română ({ge_count} intrări), fiindcă cele două părți nu organizează materialul identic.",
                "sursa": "specific Clemens.docx; ediția filologică",
            },
            {
                "titlu": "Instrument pedagogic",
                "text": "Sursele descriu dicționarul ca anexă a gramaticii lui Clemens și ca instrument destinat învățării limbii române de către comunitatea germană din Transilvania.",
                "sursa": "specific Clemens.docx; Importanța lui Andreas Clemens...",
            },
            {
                "titlu": "Cuiburi lexicale și dificultăți de lematizare",
                "text": f"Am marcat {len(complex_nests)} intrări RO-DE ca posibile structuri complexe, unde lema, variantele și construcțiile pot fi amestecate în același articol.",
                "sursa": "specific Clemens.docx",
            },
            {
                "titlu": "Lanțuri de echivalențe",
                "text": f"{len(german_equivalence_chains)} articole RO-DE au multe segmente separate prin virgulă, semn că echivalarea germană poate funcționa ca lanț sinonimic sau aproximație semantică.",
                "sursa": "specific Clemens.docx",
            },
            {
                "titlu": "Nume proprii ca strat enciclopedic",
                "text": "Inventarul numelor proprii semnalează antroponime, toponime, astronime, teonime, nume de sărbători, titluri de cărți și creaturi mitologice.",
                "sursa": "Inventarul numelor proprii...",
            },
            {
                "titlu": "Elemente germane",
                "text": "Studiul despre elementele germane oferă context pentru împrumuturi, contact lingvistic și diferențierea între elemente săsești și influență germană literară.",
                "sursa": "Elementele germane din lucrarea Kleines...",
            },
        ],
        "structuri": [
            {"eticheta": "articole simple", "descriere": "cuvânt-titlu, informație gramaticală, grafie latină, echivalent german/român"},
            {"eticheta": "articole cu exemplificări", "descriere": "contexte de utilizare, îmbinări stabile, paradigme de conjugare sau declinare"},
            {"eticheta": "cuiburi lexicale", "descriere": "mai multe lexeme sau construcții tratate sub un nucleu comun"},
            {"eticheta": "variante", "descriere": "forme grafice sau lexicale care trebuie legate de lema principală"},
        ],
    }


def _combined_stats(ro_entries: list[dict], ge_entries: list[dict]) -> dict:
    all_entries = ro_entries + ge_entries
    by_direction = {
        "RO-DE": _stats_for_entries(ro_entries),
        "DE-RO": _stats_for_entries(ge_entries),
    }
    pos_counts = Counter()
    length_counts = Counter()
    for entry in all_entries:
        for pos in entry["parti_de_vorbire"]:
            pos_counts[pos] += 1
        length_counts[entry["lungime"]] += 1
    return {
        "total_intrari": len(all_entries),
        "leme": sum(1 for entry in all_entries if entry["tip"] == "lemă"),
        "variante": sum(1 for entry in all_entries if entry["tip"] == "variantă"),
        "pe_directii": by_direction,
        "parti_de_vorbire": [{"eticheta": k, "numar": v} for k, v in pos_counts.most_common()],
        "lungime_intrari": [{"eticheta": k, "numar": v} for k, v in length_counts.most_common()],
    }


def build_clemens_payload(clemens_dir: Path) -> dict:
    ro_mapping = _read_ro_mapping(clemens_dir / "RO-DE.xlsx")
    ge_mapping = _read_ge_mapping(clemens_dir / "GE-RO_Clemens_mapping.csv")
    ro_paragraphs = _read_docx_paragraphs(clemens_dir / "Clemens_RO-GE_CLRE.docx")
    ge_paragraphs = _read_docx_paragraphs(clemens_dir / "Clemens_GE-RO_CLRE.docx")
    pdf_pages = _read_dictionary_pdf_pages(clemens_dir / "Andreas_Clemens_Editie_filologica.pdf")

    ro_entries = _build_entries("RO-DE", ro_mapping, ro_paragraphs, pdf_pages)
    ge_entries = _build_entries("DE-RO", ge_mapping, ge_paragraphs, pdf_pages)
    entries = ro_entries + ge_entries
    _apply_pos_audit_overrides(entries, _read_pos_audit_overrides(clemens_dir))
    entries = _dedupe_entries(entries)
    ro_entries = [entry for entry in entries if entry["directie"] == "RO-DE"]
    ge_entries = [entry for entry in entries if entry["directie"] == "DE-RO"]

    variants_by_lemma = defaultdict(list)
    for entry in ro_entries:
        if entry["tip"] == "variantă" and entry["lema"]:
            variants_by_lemma[entry["lema"]].append(entry["termen"])

    return {
        "titlu": "Andreas Clemens. Kleines Walachisch-Deutsch und Deutsch-Walachisches Wörterbuch",
        "surse": {
            "ro_de": "RO-DE.xlsx + Clemens_RO-GE_CLRE.docx",
            "de_ro": "GE-RO_Clemens_mapping.csv + Clemens_GE-RO_CLRE.docx",
        },
        "statistica": _combined_stats(ro_entries, ge_entries),
        "morfologie_ro_de": _morphology_stats(ro_entries),
        "intrari": entries,
        "variante_pe_lema": [
            {"lema": lemma, "variante": sorted(set(variants))}
            for lemma, variants in sorted(variants_by_lemma.items(), key=lambda item: item[0].lower())
        ],
        "profil": _research_profile(entries),
        "nume_proprii": _proper_name_inventory(entries),
        "procedee_traducere_nume": _proper_name_translation_techniques(entries),
        "analize": _interpretive_statistics(entries),
    }

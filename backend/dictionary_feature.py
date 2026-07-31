from __future__ import annotations

import re
import unicodedata
import zipfile
from html import escape, unescape
from pathlib import Path
from xml.etree import ElementTree as ET


W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = {"w": W_NS}
LINE_YEAR_PATTERN = re.compile(
    r"^\s*(?:<|ante\s+|post\s+|c\.\s*|cca\.?\s*|circa\s+)?(?P<start>\d{4})(?:\s*[–-]\s*(?P<end>\d{4}))?",
    flags=re.IGNORECASE,
)
PHRASEOLOGY_LINE_PATTERN = re.compile(
    r"^\s*[✧⋆*]?\s*(?P<kind>E\s*x\s*p\s*r|P\s*r\s*o\s*v|L\s*o\s*c)\s*\.\s*(?P<body>.+?)\s*$",
    flags=re.IGNORECASE,
)
REGISTER_MARKERS = [
    ("Arg.", re.compile(r"(?<!\w)arg\.(?!\w)", flags=re.IGNORECASE)),
    ("Fam.", re.compile(r"(?<!\w)fam\.(?!\w)", flags=re.IGNORECASE)),
    ("Pop.", re.compile(r"(?<!\w)pop\.(?!\w)", flags=re.IGNORECASE)),
    ("Reg.", re.compile(r"(?<!\w)reg\.(?!\w)", flags=re.IGNORECASE)),
    ("Fig.", re.compile(r"(?<!\w)fig\.(?!\w)", flags=re.IGNORECASE)),
    ("Înv.", re.compile(r"(?<!\w)[iî]nv\.(?!\w)", flags=re.IGNORECASE)),
    ("Rar.", re.compile(r"(?<!\w)rar\.(?!\w)", flags=re.IGNORECASE)),
]
REGISTER_PREFIX_PATTERN = re.compile(
    r"^\s*(?P<prefix>(?:(?:arg|fam|pop|reg|fig|[iî]nv|rar)\.\s*,?\s*)+)(?P<rest>.+?)\s*$",
    flags=re.IGNORECASE,
)
FIRST_ATTESTATION_OVERRIDES = {
    "CACERDISÍ": 1907,
    "CA1": 1551,
    "CA2": 1559,
    "CÁCIOR1, -Ă": 1593,
    "CADORISÍ": 1924,
    "CADÚC2, -Ă": 1683,
    "CADÚCUM": 1898,
}
TARGET_ENTRY_OVERRIDES = {
    "cacior1": "CÁCIOR1, -Ă",
    "cacior2": "CÁCIOR2, -Ă",
    "cabalist": "CABALÍST, -Ă",
    "cabazlicos": "CABAZLICÓS, -OÁSĂ",
    "cabazlacar": "CABAZLÂCÁR, -Ă",
    "cacochim": "CACOCHÍM, -Ă",
    "cadavros": "CADAVRÓS, -OÁSĂ",
    "cadaveros": "CADAVERÓS, -OÁSĂ",
    "cadanesc": "CADÂNÉSC, -EÁSCĂ",
    "cadrilat": "CADRILÁT, -Ă",
    "caducar": "CADUCÁR, -Ă",
}


def _first_attestation_override_for_term(term: str | None) -> int | None:
    if not term:
        return None
    normalized = str(term).replace("¹", "1").replace("²", "2").replace("³", "3")
    return FIRST_ATTESTATION_OVERRIDES.get(normalized)


def _w_tag(name: str) -> str:
    return f"{{{W_NS}}}{name}"


def _strip_homonym_suffix(term: str) -> str:
    return re.sub(r"\d+$", "", term).strip()


def _normalize_surface_key(term: str) -> str:
    normalized = unicodedata.normalize("NFC", term.strip().lower())
    translation = str.maketrans({
        "ş": "ș",
        "ţ": "ț",
        "Ş": "Ș",
        "Ţ": "Ț",
        "¹": "1",
        "²": "2",
        "³": "3",
    })
    normalized = normalized.translate(translation)
    return normalized.replace(",", "").replace(" ", "")


def _superscript_display(term: str | None) -> str | None:
    if term is None:
        return None
    return re.sub(
        r"([123])(?=(?:,|\s|-|$))",
        lambda match: {"1": "¹", "2": "²", "3": "³"}[match.group(1)],
        str(term),
    )


def _normalize_dictionary_key(term: str) -> str:
    stripped = term.replace("¹", "1").replace("²", "2").replace("³", "3")
    stripped = _strip_homonym_suffix(stripped).strip().lower()
    decomposed = unicodedata.normalize("NFD", stripped)
    without_diacritics = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return without_diacritics.replace(",", "").replace(" ", "")


def _normalize_dictionary_key_exact(term: str) -> str:
    stripped = term.replace("¹", "1").replace("²", "2").replace("³", "3").strip().lower()
    decomposed = unicodedata.normalize("NFD", stripped)
    without_diacritics = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return without_diacritics.replace(",", "").replace(" ", "")


def _registers_from_text(text: str) -> list[str]:
    return [label for label, pattern in REGISTER_MARKERS if pattern.search(text or "")]


def _split_phraseology_body(body: str) -> list[dict]:
    parts = [part.strip() for part in body.split("|")]
    if not parts:
        return []

    groups: list[dict] = []
    current_registers = []
    current_prefix = ""
    current_parts: list[str] = []

    def flush() -> None:
        if not current_parts:
            return
        text = " | ".join(part.strip() for part in current_parts if part.strip()).strip()
        if text:
            if current_prefix:
                text = f"{current_prefix} {text}".strip()
            groups.append({
                "text": text,
                "registre": list(current_registers),
            })
        current_parts.clear()

    for raw_part in parts:
        if not raw_part:
            continue
        prefix_match = REGISTER_PREFIX_PATTERN.match(raw_part)
        if prefix_match:
            detected_registers = _registers_from_text(prefix_match.group("prefix"))
            prefix_text = prefix_match.group("prefix").strip()
            remainder = prefix_match.group("rest").strip()
            if current_parts:
                flush()
            current_registers = detected_registers
            current_prefix = prefix_text
            if remainder:
                current_parts.append(remainder)
            continue
        current_parts.append(raw_part)

    flush()
    return groups or [{"text": body.strip(), "registre": []}]


def _extract_dictionary_entry(line: str):
    cleaned = " ".join(line.split())
    if not cleaned:
        return None

    page_match = re.search(r"\s-\s*(\d+)\s*(?:\(([^)]*)\))?\s*$", cleaned)
    if not page_match:
        return None

    page = int(page_match.group(1))
    note = page_match.group(2)
    body = cleaned[: page_match.start()].strip()
    if not body:
        return None

    variant_match = re.search(r"\bv\.\s*(.+?)\.\s*$", body, flags=re.IGNORECASE)
    variant_target = variant_match.group(1).strip() if variant_match else None

    body_without_variant = body[: variant_match.start()].strip() if variant_match else body
    grammar_match = re.search(
        r"\s(?=(?:s\.|adj\.|vb\.|adv\.|prep\.|conj\.|interj\.|elem\.|pron\.|art\.|num\.|expr\.))",
        body_without_variant,
        flags=re.IGNORECASE,
    )
    if not grammar_match:
        return None

    term = body_without_variant[: grammar_match.start()].strip()
    grammar = body_without_variant[grammar_match.start() :].strip()
    if ";" in grammar:
        if " (" in grammar:
            grammar = grammar.split(" (", 1)[0].strip()
        else:
            grammar = grammar.split(";", 1)[0].strip()
    return {
        "termen": term,
        "tip": "variantă" if variant_target else "lemă",
        "informatie_gramaticala": grammar,
        "pagina": page,
        "trimitere_la": variant_target,
        "nota": note,
    }


def _extract_pos_metadata(grammar: str) -> dict:
    if not grammar:
        return {"main": [], "subtypes": {}}

    grammar_lower = grammar.lower()
    pos_map = [
        ("vb.", "verb"),
        ("adj.", "adjectiv"),
        ("adv.", "adverb"),
        ("prep.", "prepoziție"),
        ("conj.", "conjuncție"),
        ("interj.", "interjecție"),
        ("pron.", "pronume"),
        ("num.", "numeral"),
        ("expr.", "expresie"),
        ("elem. comp.", "element de compunere"),
    ]

    found = []
    for marker, label in pos_map:
        if marker in grammar_lower and label not in found:
            found.append(label)

    subtypes = {}

    noun_gender_labels = []
    if "s. m. și f." in grammar_lower or "s. m. si f." in grammar_lower:
        noun_gender_labels.extend(["s. m.", "s. f."])
    if "s. f. și m." in grammar_lower or "s. f. si m." in grammar_lower:
        noun_gender_labels.extend(["s. f.", "s. m."])
    if "s. m." in grammar_lower:
        noun_gender_labels.append("s. m.")
    if "s. f." in grammar_lower:
        noun_gender_labels.append("s. f.")
    if "s. n." in grammar_lower:
        noun_gender_labels.append("s. n.")

    noun_patterns = ["s. m.", "s. f.", "s. n.", "s."]
    if any(pattern in grammar_lower for pattern in noun_patterns):
        found.append("substantiv")
        subtypes["substantiv"] = []
        for label in noun_gender_labels:
            if label not in subtypes["substantiv"]:
                subtypes["substantiv"].append(label)

    verb_classes = []
    for match in re.finditer(r"\bvb\.\s*([IVX]+)\b", grammar, flags=re.IGNORECASE):
        label = f"vb. {match.group(1).upper()}"
        if label not in verb_classes:
            verb_classes.append(label)
    if verb_classes:
        subtypes["verb"] = verb_classes

    return {"main": found, "subtypes": subtypes}


def _extract_docx_article_header(line: str):
    cleaned = " ".join(line.split())
    if not cleaned:
        return None

    if re.fullmatch(r"[A-ZĂÂÎȘŞȚŢ0-9-]+-", cleaned):
        return {
            "termen": cleaned,
            "tip": "lemă",
            "informatie_gramaticala": "",
            "trimitere_la": None,
            "header_text": cleaned,
        }

    grammar_match = re.search(
        r"\s(?=(?:s\.|adj\.|vb\.|adv\.|prep\.|conj\.|interj\.|elem\.|pron\.|art\.|num\.|expr\.))",
        cleaned,
        flags=re.IGNORECASE,
    )
    if not grammar_match:
        return None

    term = cleaned[: grammar_match.start()].strip()
    if not term or not re.match(r"^[A-ZĂÂÎȘŞȚŢ].*", term):
        return None
    if re.search(r"[a-zăâîșşțţ]", term):
        return None
    if term.startswith(("Referin", "Din ", "Lat. ", "Pl.:", "Pronunțat:")):
        return None

    grammar_and_rest = cleaned[grammar_match.start() :].strip()
    variant_match = re.search(r"\bv\.\s*(.+?)\.\s*$", grammar_and_rest, flags=re.IGNORECASE)
    variant_target = variant_match.group(1).strip() if variant_match else None

    return {
        "termen": term,
        "tip": "variantă" if variant_target else "lemă",
        "informatie_gramaticala": grammar_and_rest if not variant_match else grammar_and_rest[: variant_match.start()].strip(),
        "trimitere_la": variant_target,
        "header_text": cleaned,
    }


def _docx_paragraph_text(paragraph: ET.Element) -> str:
    parts = []
    for node in paragraph.iter():
        if node.tag == _w_tag("t"):
            parts.append(node.text or "")
        elif node.tag == _w_tag("tab"):
            parts.append("\t")
        elif node.tag in {_w_tag("br"), _w_tag("cr")}:
            parts.append("\n")
    return "".join(parts).strip()


def _docx_run_html(run: ET.Element) -> str:
    fragments = []
    for child in run:
        if child.tag == _w_tag("t"):
            fragments.append(escape(child.text or ""))
        elif child.tag == _w_tag("tab"):
            fragments.append('<span class="docx-tab"></span>')
        elif child.tag in {_w_tag("br"), _w_tag("cr")}:
            fragments.append("<br>")
        elif child.tag == _w_tag("sym"):
            char_value = child.attrib.get(_w_tag("char"))
            if char_value:
                try:
                    fragments.append(escape(chr(int(char_value, 16))))
                except ValueError:
                    pass

    html = "".join(fragments)
    if not html:
        return ""

    run_pr = run.find("w:rPr", W)
    style_bits = []
    if run_pr is not None:
        spacing = run_pr.find("w:spacing", W)
        if spacing is not None:
            spacing_val = spacing.attrib.get(_w_tag("val"))
            if spacing_val and spacing_val.lstrip("-").isdigit():
                style_bits.append(f"letter-spacing:{int(spacing_val)/24:.2f}pt")
        if run_pr.find("w:b", W) is not None:
            html = f"<strong>{html}</strong>"
        if run_pr.find("w:i", W) is not None:
            html = f"<em>{html}</em>"
        vert_align = run_pr.find("w:vertAlign", W)
        if vert_align is not None:
            vert_value = vert_align.attrib.get(_w_tag("val"))
            if vert_value == "superscript":
                html = f"<sup>{html}</sup>"
            elif vert_value == "subscript":
                html = f"<sub>{html}</sub>"
    if style_bits:
        html = f'<span style="{";".join(style_bits)}">{html}</span>'
    return html


def _docx_paragraph_html(paragraph: ET.Element) -> str:
    pieces = []
    for child in paragraph:
        if child.tag == _w_tag("r"):
            pieces.append(_docx_run_html(child))
        elif child.tag == _w_tag("hyperlink"):
            for run in child.findall("w:r", W):
                pieces.append(_docx_run_html(run))

    inner = "".join(pieces).strip()
    if not inner:
        return ""

    has_num = paragraph.find("./w:pPr/w:numPr", W) is not None
    classes = ["docx-paragraph"]
    if has_num:
        classes.append("docx-list-item")
        inner = f'<span class="docx-bullet">•</span><span class="docx-content">{inner}</span>'
    return f'<div class="{" ".join(classes)}">{inner}</div>'


def _wrap_docx_line_html(line_html: str, has_num: bool) -> str:
    inner = line_html.strip()
    if not inner:
        return ""
    classes = ["docx-paragraph"]
    if has_num:
        classes.append("docx-list-item")
        inner = f'<span class="docx-bullet">•</span><span class="docx-content">{inner}</span>'
    return f'<div class="{" ".join(classes)}">{inner}</div>'


def _docx_paragraph_segments(paragraph: ET.Element) -> list[tuple[str, str]]:
    has_num = paragraph.find("./w:pPr/w:numPr", W) is not None
    text_lines: list[str] = []
    html_lines: list[str] = []
    current_text: list[str] = []
    current_html: list[str] = []

    def flush_line() -> None:
        text_value = "".join(current_text).strip()
        html_value = "".join(current_html).strip()
        if text_value or html_value:
            text_lines.append(text_value)
            html_lines.append(_wrap_docx_line_html(html_value, has_num))
        current_text.clear()
        current_html.clear()

    for child in paragraph:
        nodes = [child]
        if child.tag == _w_tag("hyperlink"):
            nodes = child.findall("w:r", W)

        for node in nodes:
            if node.tag != _w_tag("r"):
                continue
            run_html_parts = []
            run_text_parts = []
            run_pr = node.find("w:rPr", W)

            def wrap_run_html(fragment: str) -> str:
                html = fragment
                style_bits = []
                if run_pr is not None:
                    spacing = run_pr.find("w:spacing", W)
                    if spacing is not None:
                        spacing_val = spacing.attrib.get(_w_tag("val"))
                        if spacing_val and spacing_val.lstrip("-").isdigit():
                            style_bits.append(f"letter-spacing:{int(spacing_val)/24:.2f}pt")
                    if run_pr.find("w:b", W) is not None:
                        html = f"<strong>{html}</strong>"
                    if run_pr.find("w:i", W) is not None:
                        html = f"<em>{html}</em>"
                    vert_align = run_pr.find("w:vertAlign", W)
                    if vert_align is not None:
                        vert_value = vert_align.attrib.get(_w_tag("val"))
                        if vert_value == "superscript":
                            html = f"<sup>{html}</sup>"
                        elif vert_value == "subscript":
                            html = f"<sub>{html}</sub>"
                if style_bits:
                    html = f'<span style="{";".join(style_bits)}">{html}</span>'
                return html

            def flush_run_fragment() -> None:
                if run_text_parts or run_html_parts:
                    current_text.append("".join(run_text_parts))
                    current_html.append(wrap_run_html("".join(run_html_parts)))
                    run_text_parts.clear()
                    run_html_parts.clear()

            for run_child in node:
                if run_child.tag == _w_tag("t"):
                    text_piece = run_child.text or ""
                    run_text_parts.append(text_piece)
                    run_html_parts.append(escape(text_piece))
                elif run_child.tag == _w_tag("tab"):
                    run_text_parts.append("\t")
                    run_html_parts.append('<span class="docx-tab"></span>')
                elif run_child.tag == _w_tag("sym"):
                    char_value = run_child.attrib.get(_w_tag("char"))
                    if char_value:
                        try:
                            symbol = chr(int(char_value, 16))
                            run_text_parts.append(symbol)
                            run_html_parts.append(escape(symbol))
                        except ValueError:
                            pass
                elif run_child.tag in {_w_tag("br"), _w_tag("cr")}:
                    flush_run_fragment()
                    flush_line()
            flush_run_fragment()

    flush_line()
    return list(zip(text_lines, html_lines))


def _docx_paragraph_page_breaks(paragraph: ET.Element) -> int:
    rendered = len(paragraph.findall(".//w:lastRenderedPageBreak", W))
    explicit = len(paragraph.findall(".//w:br[@w:type='page']", W))
    return rendered + explicit


def _read_dictionary_entries(txt_path: Path):
    entries = []
    for line in txt_path.read_text(encoding="utf-8").splitlines():
        parsed = _extract_dictionary_entry(line)
        if parsed:
            entries.append(parsed)

    lemma_index = {}
    lemma_index_exact = {}
    all_index = {}
    all_index_exact = {}
    for entry in entries:
        all_index.setdefault(_normalize_dictionary_key(entry["termen"]), []).append(entry["termen"])
        all_index_exact.setdefault(_normalize_dictionary_key_exact(entry["termen"]), []).append(entry["termen"])
        if entry["tip"] == "lemă":
            lemma_index.setdefault(_normalize_dictionary_key(entry["termen"]), []).append(entry["termen"])
            lemma_index_exact.setdefault(_normalize_dictionary_key_exact(entry["termen"]), []).append(entry["termen"])

    for entry in entries:
        target = entry["trimitere_la"]
        if not target:
            entry["lema_tinta"] = None
            entry["leme_posibile"] = []
            entry["trimitere_tinta_exacta"] = None
            continue

        override_target = TARGET_ENTRY_OVERRIDES.get(_normalize_dictionary_key_exact(target))
        target_matches = [override_target] if override_target and override_target in lemma_index_exact.get(_normalize_dictionary_key_exact(override_target), []) + lemma_index.get(_normalize_dictionary_key(override_target), []) else lemma_index_exact.get(_normalize_dictionary_key_exact(target), [])
        if not target_matches:
            target_matches = lemma_index.get(_normalize_dictionary_key(target), [])
        entry["lema_tinta"] = target_matches[0] if len(target_matches) == 1 else None
        entry["leme_posibile"] = target_matches

        exact_target_matches = [override_target] if override_target else all_index_exact.get(_normalize_dictionary_key_exact(target), [])
        if not exact_target_matches:
            exact_target_matches = all_index.get(_normalize_dictionary_key(target), [])
        entry["trimitere_tinta_exacta"] = exact_target_matches[0] if len(exact_target_matches) == 1 else None

    return entries


def _read_docx_articles(docx_path: Path):
    with zipfile.ZipFile(docx_path) as archive:
        xml_bytes = archive.read("word/document.xml")
    root = ET.fromstring(xml_bytes)
    paragraphs = root.findall(".//w:body/w:p", W)

    articles = []
    current = None
    for paragraph in paragraphs:
        paragraph_page_breaks = _docx_paragraph_page_breaks(paragraph)
        segments = _docx_paragraph_segments(paragraph)
        if not segments:
            plain_text = _docx_paragraph_text(paragraph)
            paragraph_html = _docx_paragraph_html(paragraph)
            segments = [(plain_text, paragraph_html)]

        for segment_index, (plain_text, paragraph_html) in enumerate(segments):
            header = _extract_docx_article_header(plain_text)

            if header:
                if current:
                    current["articol_text"] = "\n".join(current["articol_linii"]).strip()
                    current["articol_html"] = "".join(current["articol_html_linii"]).strip()
                    articles.append(current)

                current = {
                    **header,
                    "articol_linii": [plain_text],
                    "articol_html_linii": [paragraph_html] if paragraph_html else [],
                    "page_breaks": paragraph_page_breaks if segment_index == len(segments) - 1 else 0,
                }
                continue

            if current is not None:
                current["articol_linii"].append(plain_text)
                if paragraph_html:
                    current["articol_html_linii"].append(paragraph_html)
                if segment_index == len(segments) - 1:
                    current["page_breaks"] += paragraph_page_breaks

    if current:
        current["articol_text"] = "\n".join(current["articol_linii"]).strip()
        current["articol_html"] = "".join(current["articol_html_linii"]).strip()
        articles.append(current)

    for article in articles:
        article.pop("articol_linii", None)
        article["pagini"] = max(1, int(article.pop("page_breaks", 0)) + 1)

    surface_index = {}
    exact_index = {}
    base_index = {}
    for article in articles:
        surface_index.setdefault(_normalize_surface_key(article["termen"]), []).append(article)
        exact_index.setdefault(_normalize_dictionary_key_exact(article["termen"]), []).append(article)
        base_index.setdefault(_normalize_dictionary_key(article["termen"]), []).append(article)
    return articles, surface_index, exact_index, base_index


def _select_article_matches(entry: dict, surface_index: dict, exact_index: dict, base_index: dict) -> list[dict]:
    surface_matches = surface_index.get(_normalize_surface_key(entry["termen"]), [])
    if surface_matches:
        return surface_matches

    exact_matches = exact_index.get(_normalize_dictionary_key_exact(entry["termen"]), [])
    if len(exact_matches) <= 1:
        return exact_matches

    grammar_surface = _normalize_surface_key(entry["informatie_gramaticala"])
    filtered_exact = [
        article
        for article in exact_matches
        if _normalize_surface_key(article["informatie_gramaticala"]) == grammar_surface
    ]
    if filtered_exact:
        return filtered_exact

    base_matches = base_index.get(_normalize_dictionary_key(entry["termen"]), [])
    if len(base_matches) <= 1:
        return base_matches

    filtered_base = [
        article
        for article in base_matches
        if _normalize_surface_key(article["informatie_gramaticala"]) == grammar_surface
    ]
    if filtered_base:
        return filtered_base

    return exact_matches or base_matches


def _article_body_text(article_text: str, header_text: str) -> str:
    if not article_text:
        return ""
    lines = article_text.splitlines()
    if lines and lines[0].strip() == (header_text or "").strip():
        return "\n".join(lines[1:]).strip()
    return article_text.strip()


def _article_body_line_pairs(article_text: str, header_text: str, article_html_lines: list[str] | None) -> list[tuple[str, str]]:
    text_lines = article_text.splitlines() if article_text else []
    html_lines = list(article_html_lines or [])
    if text_lines and text_lines[0].strip() == (header_text or "").strip():
        text_lines = text_lines[1:]
        if html_lines:
            html_lines = html_lines[1:]
    return list(zip(text_lines, html_lines))


def _html_to_plain_text(html: str) -> str:
    if not html:
        return ""
    plain = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    plain = re.sub(r"<[^>]+>", "", plain)
    plain = unescape(plain)
    return re.sub(r"\s+", " ", plain).strip()


def _normalize_phraseology_compare(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFD", text.lower())
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = normalized.replace("ş", "s").replace("ș", "s").replace("ţ", "t").replace("ț", "t")
    normalized = normalized.replace("¹", "1").replace("²", "2").replace("³", "3")
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"[^a-z0-9 ]+", "", normalized)
    return normalized.strip()


def _match_phraseology_html(
    html_lines: list[str],
    start_index: int,
    expected_kind: str,
    expected_body: str,
) -> tuple[str | None, int]:
    target = _normalize_phraseology_compare(expected_body)
    if not html_lines:
        return None, start_index

    for index in range(start_index, len(html_lines)):
        html_line = html_lines[index]
        plain = _html_to_plain_text(html_line)
        match = PHRASEOLOGY_LINE_PATTERN.match(plain)
        if not match:
            continue
        html_kind = match.group("kind").replace(" ", "").lower()
        if html_kind != expected_kind:
            continue
        html_body = _normalize_phraseology_compare(match.group("body").strip())
        if html_body == target:
            return html_line, index + 1
    return None, start_index


def _article_length_stats(entries: list[dict]) -> dict:
    ranking = []
    for entry in entries:
        if not entry.get("articol_text"):
            continue
        body_text = _article_body_text(entry["articol_text"], entry.get("articol_header") or "")
        words = re.findall(r"\b[\wĂÂÎȘŞȚŢăâîșşțţÀ-ÿ-]+\b", body_text, flags=re.UNICODE)
        ranking.append({
            "termen": entry["termen"],
            "tip": entry["tip"],
            "pagini": max(1, int(entry.get("pagini_articol") or 1)),
            "cuvinte": len(words),
            "caractere": len(body_text),
        })

    by_length = sorted(ranking, key=lambda item: (-item["pagini"], -item["cuvinte"], -item["caractere"], item["termen"]))
    ranking.sort(key=lambda item: _normalize_surface_key(item["termen"]))
    if not ranking:
        return {
            "clasament": [],
            "cea_mai_lunga": None,
            "cea_mai_scurta": None,
            "medie_pagini": 0,
        }

    return {
        "clasament": ranking,
        "cea_mai_lunga": by_length[0],
        "cea_mai_scurta": min(by_length, key=lambda item: (item["pagini"], item["cuvinte"], item["caractere"], item["termen"])),
        "medie_pagini": round(sum(item["pagini"] for item in ranking) / len(ranking), 1),
    }


def _extract_article_years(article_text: str, header_text: str) -> list[int]:
    body_text = _article_body_text(article_text, header_text)
    relevant_lines = []
    for line in body_text.splitlines():
        normalized_line = unicodedata.normalize("NFD", line.strip().lower())
        normalized_line = "".join(ch for ch in normalized_line if not unicodedata.combining(ch))
        if normalized_line.startswith("referinte bibliografice"):
            break
        if normalized_line.startswith("din "):
            continue
        relevant_lines.append(line)
    years = []
    for line in relevant_lines:
        match = LINE_YEAR_PATTERN.match(line)
        if not match:
            continue
        start_year = int(match.group("start"))
        if 1400 <= start_year <= 2099:
            years.append(start_year)
        end_year = match.group("end")
        if end_year:
            end_year_int = int(end_year)
            if 1400 <= end_year_int <= 2099:
                years.append(end_year_int)
    return years


def _to_roman(number: int) -> str:
    numerals = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ]
    result = []
    remaining = number
    for value, symbol in numerals:
        while remaining >= value:
            result.append(symbol)
            remaining -= value
    return "".join(result)


def _article_year_stats(entries: list[dict]) -> dict:
    year_counts: dict[int, int] = {}
    year_terms: dict[int, list[str]] = {}
    first_attestation_years: dict[int, int] = {}
    first_attestation_terms: dict[int, list[str]] = {}
    first_attestation_entries = []

    for entry in entries:
        if not entry.get("articol_text"):
            continue

        years = _extract_article_years(entry["articol_text"], entry.get("articol_header") or "")
        if not years:
            continue

        unique_years = sorted(set(years))
        for year in unique_years:
            year_counts[year] = year_counts.get(year, 0) + 1
            year_terms.setdefault(year, []).append(entry["termen"])

        first_year = min(unique_years)
        if entry["tip"] == "lemă":
            first_year = _first_attestation_override_for_term(entry["termen"]) or first_year
            first_attestation_years[first_year] = first_attestation_years.get(first_year, 0) + 1
            first_attestation_terms.setdefault(first_year, []).append(entry["termen"])
            first_attestation_entries.append({
                "termen": entry["termen"],
                "an": first_year,
            })

    top_years = [
        {
            "an": year,
            "numar": count,
            "termeni": sorted(year_terms.get(year, []), key=_normalize_surface_key),
        }
        for year, count in sorted(year_counts.items(), key=lambda item: (-item[1], item[0]))[:12]
    ]
    first_attestation_histogram = [
        {
            "eticheta": str(year),
            "numar": count,
            "an": year,
            "termeni": sorted(first_attestation_terms.get(year, []), key=_normalize_surface_key),
        }
        for year, count in sorted(first_attestation_years.items(), key=lambda item: item[0])
    ]
    oldest_lemmas = [
        item
        for item in sorted(first_attestation_entries, key=lambda item: (item["an"], _normalize_surface_key(item["termen"])))[:8]
    ]

    return {
        "top_ani_productivi": top_years,
        "prima_atestare_leme": first_attestation_histogram,
        "cele_mai_vechi_leme": oldest_lemmas,
        "ani_unici": len(year_counts),
    }


def _extract_phraseology(article_text: str, header_text: str, article_html_lines: list[str] | None = None) -> dict:
    result = {"expr": [], "prov": [], "loc": []}
    html_lines = list(article_html_lines or [])
    if html_lines:
        html_header_plain = _html_to_plain_text(html_lines[0])
        if html_header_plain.strip() == (header_text or "").strip():
            html_lines = html_lines[1:]
        html_lines = [line for line in html_lines if _html_to_plain_text(line)]
    html_cursor = 0

    text_lines = article_text.splitlines() if article_text else []
    if text_lines and text_lines[0].strip() == (header_text or "").strip():
        text_lines = text_lines[1:]

    for raw_line in text_lines:
        line = raw_line.strip()
        if not line:
            continue
        match = PHRASEOLOGY_LINE_PATTERN.match(line)
        if not match:
            continue

        kind = match.group("kind").replace(" ", "").lower()
        bucket = "expr" if kind == "expr" else "prov" if kind == "prov" else "loc"
        body = match.group("body").strip()
        matched_html, html_cursor = _match_phraseology_html(html_lines, html_cursor, kind, body)
        split_items = _split_phraseology_body(body)
        single_item = len(split_items) == 1
        for item in split_items:
            register_source = " ".join(
                part for part in [item["text"], _html_to_plain_text(matched_html or "") if single_item else ""]
                if part
            ).strip()
            registers = list(dict.fromkeys(item["registre"] + _registers_from_text(register_source)))
            result[bucket].append({
                "text": item["text"],
                "html": matched_html if single_item else None,
                "registre": registers,
            })

    result["rezumat"] = {
        "expr": len(result["expr"]),
        "prov": len(result["prov"]),
        "loc": len(result["loc"]),
        "total": len(result["expr"]) + len(result["prov"]) + len(result["loc"]),
    }
    return result


def _word_cloud_stats(entries: list[dict]) -> dict:
    ranked = []
    for entry in entries:
        term = (entry.get("termen") or "").strip()
        if not term:
            continue
        if entry.get("articol_text"):
            body_text = _article_body_text(entry["articol_text"], entry.get("articol_header") or "")
            words = re.findall(r"\b[\wĂÂÎȘŞȚŢăâîșşțţÀ-ÿ-]+\b", body_text, flags=re.UNICODE)
            weight = len(words)
        else:
            weight = 1
        ranked.append({
            "termen": term,
            "numar": weight,
        })

    ranked.sort(key=lambda item: (-item["numar"], _normalize_surface_key(item["termen"])))

    return {
        "top": ranked,
        "total_termeni_unici": len(ranked),
    }


def build_dictionary_payload(txt_path: Path, docx_path: Path):
    entries = _read_dictionary_entries(txt_path)
    articles, surface_index, exact_index, base_index = _read_docx_articles(docx_path)
    pos_counts = {}
    pos_subtype_counts = {}

    for entry in entries:
        pos_meta = _extract_pos_metadata(entry["informatie_gramaticala"])
        pos_labels = pos_meta["main"]
        entry["parti_de_vorbire"] = pos_labels
        entry["subtipuri_pos"] = pos_meta["subtypes"]
        for pos_label in pos_labels:
            pos_counts[pos_label] = pos_counts.get(pos_label, 0) + 1
        for group, subtype_labels in pos_meta["subtypes"].items():
            bucket = pos_subtype_counts.setdefault(group, {})
            for subtype_label in subtype_labels:
                bucket[subtype_label] = bucket.get(subtype_label, 0) + 1

        article_matches = _select_article_matches(entry, surface_index, exact_index, base_index)

        entry["articol_gasit"] = bool(article_matches)
        entry["articol_header"] = article_matches[0]["header_text"] if len(article_matches) == 1 else None
        entry["articol_text"] = article_matches[0]["articol_text"] if len(article_matches) == 1 else None
        entry["articol_html"] = article_matches[0]["articol_html"] if len(article_matches) == 1 else None
        entry["pagini_articol"] = article_matches[0]["pagini"] if len(article_matches) == 1 else None
        article_years = (
            _extract_article_years(entry["articol_text"], entry["articol_header"])
            if entry["articol_text"] and entry["articol_header"]
            else []
        )
        phraseology = (
            _extract_phraseology(
                entry["articol_text"],
                entry["articol_header"],
                article_matches[0].get("articol_html_linii") if len(article_matches) == 1 else None,
            )
            if entry["articol_text"] and entry["articol_header"]
            else {"expr": [], "prov": [], "loc": [], "rezumat": {"expr": 0, "prov": 0, "loc": 0, "total": 0}}
        )
        entry["ani_atestare"] = sorted(article_years)
        entry["prima_atestare"] = _first_attestation_override_for_term(entry["termen"]) or (min(article_years) if article_years else None)
        entry["frazeologie"] = phraseology
        entry["articole_candidate"] = [article["header_text"] for article in article_matches]
        entry["termen"] = _superscript_display(entry["termen"])
        entry["trimitere_la"] = _superscript_display(entry["trimitere_la"])
        entry["trimitere_tinta_exacta"] = _superscript_display(entry.get("trimitere_tinta_exacta"))
        entry["lema_tinta"] = _superscript_display(entry["lema_tinta"])
        entry["leme_posibile"] = [_superscript_display(item) for item in entry["leme_posibile"]]
        entry["articol_header"] = _superscript_display(entry["articol_header"])
        entry["articole_candidate"] = [_superscript_display(item) for item in entry["articole_candidate"]]

    length_stats = _article_length_stats(entries)
    year_stats = _article_year_stats(entries)
    word_cloud_stats = _word_cloud_stats(entries)

    return {
        "fisier": str(txt_path),
        "statistica": {
            "total_intrari": len(entries),
            "leme": sum(1 for entry in entries if entry["tip"] == "lemă"),
            "variante": sum(1 for entry in entries if entry["tip"] == "variantă"),
            "parti_de_vorbire": [
                {
                    "eticheta": label,
                    "numar": count,
                    "subtipuri": [
                        {"eticheta": subtype_label, "numar": subtype_count}
                        for subtype_label, subtype_count in sorted(
                            pos_subtype_counts.get(label, {}).items(),
                            key=lambda item: (-item[1], item[0]),
                        )
                    ],
                }
                for label, count in sorted(pos_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "extindere_articole": length_stats,
            "nor_cuvinte": word_cloud_stats,
            "cronologie": year_stats,
        },
        "docx": {
            "fisier": str(docx_path),
            "total_articole": len(articles),
            "articole_mapate_unic": sum(1 for entry in entries if entry["articol_text"]),
            "articole_cu_candidati_multipli": sum(
                1 for entry in entries if not entry["articol_text"] and entry["articole_candidate"]
            ),
        },
        "intrari": entries,
    }

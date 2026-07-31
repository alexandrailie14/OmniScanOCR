from __future__ import annotations

import html
import re
import zipfile
from collections import Counter
from pathlib import Path

from clemens_feature import build_clemens_payload


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = (BASE_DIR / ".." / "data").resolve()
CLEMENS_DIR = DATA_DIR / "clemens"
OUT_DIR = DATA_DIR / "clemens_exports"
OUT_PATH = OUT_DIR / "clemens_pos_audit.xlsx"


def _col_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _cell_ref(row: int, col: int) -> str:
    return f"{_col_name(col)}{row}"


def _clean(value) -> str:
    text = str(value or "")
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _cell_xml(row: int, col: int, value) -> str:
    if value is None:
        value = ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{_cell_ref(row, col)}"><v>{value}</v></c>'
    text = html.escape(_clean(value), quote=False)
    return f'<c r="{_cell_ref(row, col)}" t="inlineStr"><is><t>{text}</t></is></c>'


def _sheet_xml(rows: list[list], widths: list[int] | None = None, freeze_row: int = 1, autofilter: bool = True) -> str:
    max_cols = max((len(row) for row in rows), default=1)
    widths = widths or [14] * max_cols
    cols = "".join(
        f'<col min="{idx}" max="{idx}" width="{width}" customWidth="1"/>'
        for idx, width in enumerate(widths[:max_cols], start=1)
    )
    sheet_rows = []
    for row_idx, row in enumerate(rows, start=1):
        cells = "".join(_cell_xml(row_idx, col_idx, value) for col_idx, value in enumerate(row, start=1))
        style = ' s="1"' if row_idx == 1 else ""
        sheet_rows.append(f'<row r="{row_idx}"{style}>{cells}</row>')
    dimension = f"A1:{_col_name(max_cols)}{len(rows)}"
    pane = ""
    if freeze_row:
        pane = (
            '<sheetViews><sheetView workbookViewId="0">'
            f'<pane ySplit="{freeze_row}" topLeftCell="A{freeze_row + 1}" activePane="bottomLeft" state="frozen"/>'
            "</sheetView></sheetViews>"
        )
    filter_xml = f'<autoFilter ref="{dimension}"/>' if autofilter and rows else ""
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<dimension ref=\"{dimension}\"/>"
        f"{pane}"
        f"<cols>{cols}</cols>"
        f"<sheetData>{''.join(sheet_rows)}</sheetData>"
        f"{filter_xml}"
        "</worksheet>"
    )


def _write_xlsx(path: Path, sheets: list[tuple[str, list[list], list[int]]]) -> None:
    content_types = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    ]
    for idx in range(1, len(sheets) + 1):
        content_types.append(
            f'<Override PartName="/xl/worksheets/sheet{idx}.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        )
    content_types.append("</Types>")

    workbook_sheets = "".join(
        f'<sheet name="{html.escape(name, quote=True)}" sheetId="{idx}" r:id="rId{idx}"/>'
        for idx, (name, _, _) in enumerate(sheets, start=1)
    )
    rels = "".join(
        f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{idx}.xml"/>'
        for idx in range(1, len(sheets) + 1)
    )
    rels += (
        f'<Relationship Id="rId{len(sheets) + 1}" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    )

    styles = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
        '<font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>'
        '<fills count="2"><fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FF246B5F"/><bgColor indexed="64"/></patternFill></fill></fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        '<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>'
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        '</styleSheet>'
    )

    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", "".join(content_types))
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        zf.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f"<sheets>{workbook_sheets}</sheets></workbook>",
        )
        zf.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f"{rels}</Relationships>",
        )
        zf.writestr("xl/styles.xml", styles)
        for idx, (_, rows, widths) in enumerate(sheets, start=1):
            zf.writestr(f"xl/worksheets/sheet{idx}.xml", _sheet_xml(rows, widths))


def main() -> None:
    payload = build_clemens_payload(CLEMENS_DIR)
    entries = payload["intrari"]
    audit_header = [
        "id",
        "directie",
        "termen",
        "tip",
        "lema_detectata",
        "pos_detectat",
        "pos_corect_de_completat",
        "grupa_verb_detectata",
        "grupa_verb_corecta",
        "informatie_gramaticala",
        "pagina",
        "articol_gasit",
        "sursa_articol",
        "fragment_articol",
        "note_corectura",
    ]
    audit_rows = [audit_header]
    for idx, entry in enumerate(entries, start=1):
        article = _clean(entry.get("articol_text"))[:900]
        audit_rows.append([
            idx,
            entry.get("directie"),
            entry.get("termen"),
            entry.get("tip"),
            entry.get("lema"),
            ", ".join(entry.get("parti_de_vorbire") or []),
            "",
            entry.get("grupa_verb"),
            "",
            entry.get("informatie_gramaticala"),
            entry.get("pagina"),
            "da" if entry.get("articol_gasit") else "nu",
            entry.get("sursa_articol"),
            article,
            "",
        ])

    pos_counts = Counter()
    for entry in entries:
        for pos in entry.get("parti_de_vorbire") or []:
            pos_counts[pos] += 1
    summary_rows = [
        ["POS detectat", "numar_intrari"],
        *[[label, count] for label, count in pos_counts.most_common()],
    ]

    instructions = [
        ["Cum se corecteaza"],
        ["Completeaza coloana pos_corect_de_completat numai unde POS-ul detectat e gresit."],
        ["Marcajul (n.i.) inseamna nota informaticianului / interventia noastra lexicografica, nu notatia autorului."],
        ["Poti folosi etichete precum substantiv, verb, adjectiv, adverb, prepozitie, articol, numeral, interjectie, expresie, neclasificat."],
        ["Daca o intrare are mai multe valori, separa-le prin virgula."],
        ["Nu modifica id-ul; il voi folosi ca reper cand importam corecturile inapoi in aplicatie."],
    ]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if OUT_PATH.exists():
        backup_path = OUT_PATH.with_name(f"{OUT_PATH.stem}_backup_before_regen{OUT_PATH.suffix}")
        backup_path.write_bytes(OUT_PATH.read_bytes())
    _write_xlsx(
        OUT_PATH,
        [
            ("Audit POS", audit_rows, [8, 12, 28, 14, 28, 22, 28, 18, 18, 30, 10, 13, 14, 90, 32]),
            ("Rezumat POS", summary_rows, [26, 14]),
            ("Instructiuni", instructions, [120]),
        ],
    )
    print(OUT_PATH)


if __name__ == "__main__":
    main()

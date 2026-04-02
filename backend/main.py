import os
import io
import json
import zipfile
import threading
import importlib.util
from pathlib import Path
from typing import List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Response, Request
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse, JSONResponse
from fastapi.exception_handlers import http_exception_handler
from fastapi.staticfiles import StaticFiles
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime

from PIL import Image
import pytesseract
import pypdfium2 as pdfium
from google.cloud import vision
from google.oauth2 import service_account
import language_tool_python
import numpy as np
import cv2
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PyPDF2 import PdfReader, PdfWriter
from dictionary_feature import build_dictionary_payload

APP_DIR = Path(__file__).resolve().parent
DATA_DIR = (APP_DIR / ".." / "data").resolve()
UPLOAD_DIR = DATA_DIR / "uploads"
EXPORT_DIR = DATA_DIR / "exports"
PROGRESS_DIR = DATA_DIR / "progress"
OCR_CACHE_DIR = DATA_DIR / "ocr_cache"
SNIPPETS_DIR = DATA_DIR / "snippets"
PREVIEW_DIR = DATA_DIR / "previews"
SOURCES_DIR = DATA_DIR / "sources"
FILTER_DOCS_DIR = DATA_DIR / "filter_docs"
ARTICLES_DIR = DATA_DIR / "articles"
DICTIONARY_DIR = DATA_DIR / "dictionary"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
PROGRESS_DIR.mkdir(parents=True, exist_ok=True)
OCR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
SNIPPETS_DIR.mkdir(parents=True, exist_ok=True)
PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
SOURCES_DIR.mkdir(parents=True, exist_ok=True)
FILTER_DOCS_DIR.mkdir(parents=True, exist_ok=True)
ARTICLES_DIR.mkdir(parents=True, exist_ok=True)
DICTIONARY_DIR.mkdir(parents=True, exist_ok=True)

DICTIONARY_TXT_PATH = DICTIONARY_DIR / "lista_noua.txt"
DICTIONARY_DOCX_PATH = DICTIONARY_DIR / "dlr_c_dictionary.docx"

ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "admin123")
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
USERS_FILE = DATA_DIR / "users.json"
USER_FILES_FILE = DATA_DIR / "user_files.json"
_users_lock = threading.Lock()
_files_lock = threading.Lock()
_jobs_lock = threading.Lock()
_ocr_jobs = {}

serializer = URLSafeSerializer(SECRET_KEY, salt="session")

app = FastAPI(title="OCR Web App")

# Static frontend
_frontend_env = os.environ.get("FRONTEND_DIR")
if _frontend_env:
    FRONTEND_DIR = Path(_frontend_env).resolve()
else:
    default_frontend = (APP_DIR / ".." / "frontend").resolve()
    if default_frontend.exists():
        FRONTEND_DIR = default_frontend
    else:
        FRONTEND_DIR = (APP_DIR / "frontend").resolve()

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

DICTIONARY_ONLY_USERS = {"isabelle"}
DICTIONARY_ALLOWED_PATHS = (
    "/dictionary",
    "/api/dictionary-summary",
    "/login",
    "/logout",
    "/me",
    "/static/",
)


@app.exception_handler(HTTPException)
async def app_http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        path = request.url.path or "/"
        accepts = request.headers.get("accept", "")
        wants_html = "text/html" in accepts or accepts in ("", "*/*")
        if wants_html and not path.startswith("/api/") and path not in {"/me"}:
            return RedirectResponse(url="/", status_code=303)
    return await http_exception_handler(request, exc)


def _discover_workbench_dir() -> Path | None:
    configured = os.environ.get("IMG_OCR_WORKBENCH_DIR")
    candidates = []
    if configured:
        candidates.append(Path(configured).resolve())
    candidates.extend(
        [
            (APP_DIR / ".." / ".." / "pdf-ocr-workbench").resolve(),
            (APP_DIR / "pdf-ocr-workbench").resolve(),
        ]
    )

    for candidate in candidates:
        if (candidate / "backend" / "main.py").exists():
            return candidate
    return None


def _mount_img_ocr_workbench() -> None:
    workbench_dir = _discover_workbench_dir()
    if workbench_dir is None:
        return

    backend_path = workbench_dir / "backend" / "main.py"
    if not backend_path.exists():
        return

    spec = importlib.util.spec_from_file_location("img_ocr_workbench_app", backend_path)
    if spec is None or spec.loader is None:
        return

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    mounted_app = getattr(module, "app", None)
    if mounted_app is not None:
        app.mount("/img-ocr", mounted_app, name="img-ocr")


_mount_img_ocr_workbench()


def _load_users() -> dict:
    with _users_lock:
        if not USERS_FILE.exists():
            users = {
                ADMIN_USER: ADMIN_PASS,
                "editor": "editor123",
            }
            USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")
            return users
        try:
            raw = json.loads(USERS_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                users = {str(k): v for k, v in raw.items() if str(k).strip()}
                if ADMIN_USER not in users:
                    users[ADMIN_USER] = ADMIN_PASS
                return users
        except Exception:
            pass
        users = {
            ADMIN_USER: ADMIN_PASS,
            "editor": "editor123",
        }
        USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")
        return users


def _is_expired(expiry_value) -> bool:
    if not expiry_value:
        return False
    try:
        exp_dt = datetime.fromisoformat(str(expiry_value))
    except Exception:
        return False
    return datetime.now(exp_dt.tzinfo) > exp_dt


def _load_user_files() -> dict:
    with _files_lock:
        if not USER_FILES_FILE.exists():
            USER_FILES_FILE.write_text("{}", encoding="utf-8")
            return {}
        try:
            raw = json.loads(USER_FILES_FILE.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                cleaned = {}
                for k, v in raw.items():
                    if not str(k).strip():
                        continue
                    if isinstance(v, list):
                        cleaned[str(k)] = [str(x) for x in v if str(x).strip()]
                    else:
                        cleaned[str(k)] = []
                return cleaned
        except Exception:
            pass
        USER_FILES_FILE.write_text("{}", encoding="utf-8")
        return {}


def _save_user_files(data: dict) -> None:
    with _files_lock:
        USER_FILES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _grant_file(user: str, filename: str) -> None:
    data = _load_user_files()
    files = set(data.get(user, []))
    files.add(filename)
    data[user] = sorted(files)
    _save_user_files(data)


def _revoke_file(filename: str) -> None:
    data = _load_user_files()
    changed = False
    for u, files in list(data.items()):
        if filename in files:
            data[u] = [f for f in files if f != filename]
            changed = True
    if changed:
        _save_user_files(data)


def _user_can_access(user: str, filename: str) -> bool:
    if user == ADMIN_USER:
        return True
    data = _load_user_files()
    return filename in data.get(user, [])


def _assert_user_can_access(user: str, filename: str) -> None:
    if not _user_can_access(user, filename):
        raise HTTPException(status_code=403, detail="Access denied")


def _set_job_state(job_id: str, **kwargs):
    with _jobs_lock:
        state = _ocr_jobs.setdefault(job_id, {})
        state.update(kwargs)
        return dict(state)


def _get_job_state(job_id: str):
    with _jobs_lock:
        state = _ocr_jobs.get(job_id)
        return dict(state) if state else None


def _normalize_page_range(start_page: int, end_page: int, total_pages: int):
    start = max(1, int(start_page or 1))
    end = max(1, int(end_page or total_pages))
    if total_pages <= 0:
        raise HTTPException(status_code=400, detail="PDF has no pages")
    if start > total_pages:
        raise HTTPException(status_code=400, detail=f"start_page must be between 1 and {total_pages}")
    if end > total_pages:
        end = total_pages
    if end < start:
        raise HTTPException(status_code=400, detail="end_page must be greater than or equal to start_page")
    return start, end


def _cleanup_editorial_text(text: str) -> str:
    import re
    t = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(
        r"\s*--- PAGINA \d+ ---(?:\s+\d{1,3})?(?:\s+ARHIVA SPIRITIST[ĂA]\s*-\s*Vol\.\s*[IVXLC0-9]+)?\s*",
        "\n",
        t,
        flags=re.IGNORECASE,
    )

    page_re = re.compile(r"(?m)^--- PAGINA (\d+) ---(?:\s+\d{1,3})?\s*$")
    matches = list(page_re.finditer(t))
    if not matches:
        t = re.sub(r"(?m)^--- PAGINA \d+ ---(?:\s+\d{1,3})?\s*$", "", t)
        blocks = [t]
    else:
        blocks = []
        for idx, match in enumerate(matches):
            start = match.end()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(t)
            blocks.append(t[start:end])

    def normalize_match_line(line: str) -> str:
        compact = re.sub(r"\s+", " ", str(line or "")).strip()
        compact = compact.replace("[", "").replace("]", "")
        upper = compact.upper()
        upper = upper.replace("Ă", "A").replace("Â", "A").replace("Î", "I").replace("Ș", "S").replace("Ş", "S").replace("Ț", "T").replace("Ţ", "T")
        return upper

    def is_date_like(line: str) -> bool:
        src = _normalize_bracketed_date_text(line).strip().lower()
        if not src:
            return False
        if src == "nedatat":
            return True
        if not re.search(r"\d", src):
            return False
        months = [
            "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
            "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
            "janvier", "fevrier", "février", "mars", "avril", "juin",
            "juillet", "aout", "août", "septembre", "octobre", "novembre", "decembre", "décembre",
        ]
        return any(month in src for month in months)

    def is_editorial_header(line: str) -> bool:
        compact = re.sub(r"\s+", " ", line).strip()
        upper = normalize_match_line(compact)
        if not compact:
            return True
        if "ARHIVA SPIRITIST" in upper:
            return True
        if "B.C.U." in upper or "M. EMINESCU" in upper or "IASI" in upper:
            return True
        normalized_hasdeu = upper.replace(".", "").replace('"', "").replace("“", "").replace("”", "").replace("„", "")
        if normalized_hasdeu in {"B P HASDEU", "BP HASDEU"}:
            return True
        return False

    cleaned_pages = []
    for block in blocks:
        raw_lines = block.split("\n")
        lines = [re.sub(r"\s+", " ", ln).strip() for ln in raw_lines]

        idx = 0
        while idx < len(lines) and not lines[idx]:
            idx += 1

        # Step 1: remove only the editorial/header junk from the top of each page.
        while idx < len(lines) and is_editorial_header(lines[idx]):
            idx += 1

        # Remove only the top page number, but keep article numbers that are followed by a date.
        while idx < len(lines):
            current = lines[idx].strip()
            next_non_empty = ""
            for probe in lines[idx + 1:]:
                if probe.strip():
                    next_non_empty = probe.strip()
                    break
            if re.fullmatch(r"\d{1,3}", current) and not is_date_like(next_non_empty):
                idx += 1
                continue
            if is_editorial_header(current):
                idx += 1
                continue
            break

        kept = []
        for ln in lines[idx:]:
            if ln is None:
                continue
            stripped = ln.strip()
            if not stripped:
                kept.append("")
                continue
            normalized = normalize_match_line(stripped)
            normalized_hasdeu = normalized.replace(".", "").replace('"', "").replace("“", "").replace("”", "").replace("„", "")
            if normalized_hasdeu in {"B P HASDEU", "BP HASDEU"}:
                continue
            if "ARHIVA SPIRITIST" in normalized:
                continue
            kept.append(stripped)
        page_text = "\n".join(kept).strip()
        if page_text:
            cleaned_pages.append(page_text)

    # Step 2: after page-level cleanup, drop the synthetic page separators.
    cleaned = "\n\n".join(cleaned_pages)
    cleaned = re.sub(r"(?m)^--- PAGINA \d+ ---(?:\s+\d{1,3})?\s*$", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _slug_date(text: str) -> str:
    import re
    src = _normalize_bracketed_date_text(text).lower()
    src = src.replace("ă", "a").replace("â", "a").replace("î", "i").replace("ș", "s").replace("ş", "s").replace("ț", "t").replace("ţ", "t")
    src = re.sub(r"[^a-z0-9]+", "", src)
    return src[:80] or "nedatat"


def _normalize_bracketed_date_text(text: str) -> str:
    src = str(text or "")
    return src.replace("[", "").replace("]", "")


def _filename_article_number(text: str) -> str:
    import re
    src = re.sub(r"\*", "", str(text or ""))
    return re.sub(r"\s+", "", src).strip()


def _volume_suffix(file_name: str, text: str) -> str:
    import re
    file_probe = str(file_name or "")
    m = re.search(r"VOL(?:UMUL)?[.\s_-]*([IVXLC0-9]+)", file_probe, re.IGNORECASE)
    if not m:
        text_probe = str(text or "")
        m = re.search(r"VOL(?:UMUL)?[.\s_-]*([IVXLC0-9]+)", text_probe, re.IGNORECASE)
    if not m:
        return "FR_VOL"
    token = m.group(1).upper()
    roman_map = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6}
    num = roman_map.get(token, token)
    return f"FR_VOL{num}"


def _split_articles(text: str):
    import re
    src = _cleanup_editorial_text(text)
    if not src:
        return []

    lines = src.split("\n")
    starts = []

    def is_article_number(line: str) -> bool:
        return bool(re.fullmatch(r"\d{3,4}\*?", re.sub(r"\s+", " ", line).strip()))

    def is_date_line(line: str) -> bool:
        normalized_probe_date = _normalize_bracketed_date_text(line)
        low = normalized_probe_date.lower()
        return low == "nedatat" or (bool(re.search(r"\d", normalized_probe_date)) and any(
            month in low for month in [
                "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
                "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
                "janvier", "fevrier", "février", "mars", "avril", "juin",
                "juillet", "aout", "août", "septembre", "octobre", "novembre", "decembre", "décembre"
            ]
        ))

    i = 0
    while i < len(lines) - 1:
        line = re.sub(r"\s+", " ", lines[i]).strip()
        next_line = re.sub(r"\s+", " ", lines[i + 1]).strip() if i + 1 < len(lines) else ""
        next_next = re.sub(r"\s+", " ", lines[i + 2]).strip() if i + 2 < len(lines) else ""

        if re.fullmatch(r"\d{1,2}", line) and is_article_number(next_line):
            probe_date = next_next
            if probe_date:
                lines[i] = ""
                line = ""

        if is_article_number(line):
            if is_date_line(next_line):
                starts.append(i)
                i += 2
                continue
        if is_date_line(line) and is_article_number(next_line):
            starts.append(i)
            i += 2
            continue
        i += 1

    articles = []
    end_re = re.compile(r"\(Arhivele\s+Na[țt]ionale\.[\s\S]*?\)", re.IGNORECASE)
    for idx, start_idx in enumerate(starts):
        end_idx = starts[idx + 1] if idx + 1 < len(starts) else len(lines)
        article_lines = lines[start_idx:end_idx]
        if len(article_lines) < 2:
            continue
        first_line = re.sub(r"\s+", " ", article_lines[0]).strip()
        second_line = re.sub(r"\s+", " ", article_lines[1]).strip()
        if is_date_line(first_line) and is_article_number(second_line):
            article_no = second_line
            article_date = first_line
            article_lines = [article_no, article_date] + article_lines[2:]
        else:
            article_no = first_line
            article_date = second_line
        chunk = "\n".join(article_lines).strip()
        end_match = None
        for candidate in end_re.finditer(chunk):
            end_match = candidate
        if end_match:
            chunk = chunk[:end_match.end()].strip()
        articles.append({
            "number": article_no,
            "date": article_date,
            "text": chunk,
        })
    return articles


def create_session(username: str) -> str:
    return serializer.dumps({"u": username})


def get_current_user(request: Request) -> str:
    token = request.cookies.get("session")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = serializer.loads(token)
        return data.get("u")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")


def _is_dictionary_only_user(user: str | None) -> bool:
    return bool(user and user in DICTIONARY_ONLY_USERS)


@app.middleware("http")
async def restrict_dictionary_only_users(request: Request, call_next):
    path = request.url.path or "/"
    token = request.cookies.get("session")
    user = None
    if token:
        try:
            data = serializer.loads(token)
            user = data.get("u")
        except BadSignature:
            user = None

    if _is_dictionary_only_user(user):
        allowed = path == "/" or any(path == prefix or path.startswith(prefix) for prefix in DICTIONARY_ALLOWED_PATHS)
        if not allowed:
            if path.startswith("/api/") or request.headers.get("accept", "").startswith("application/json"):
                return JSONResponse({"detail": "Access denied"}, status_code=403)
            return RedirectResponse(url="/dictionary", status_code=303)

    return await call_next(request)


def _google_client():
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        if not os.path.exists(creds_path) or os.path.isdir(creds_path):
            raise RuntimeError(f"Invalid GOOGLE_APPLICATION_CREDENTIALS: {creds_path}")
        creds = service_account.Credentials.from_service_account_file(creds_path)
        return vision.ImageAnnotatorClient(credentials=creds)
    return vision.ImageAnnotatorClient()

def _safe_name(name: str) -> str:
    keep = []
    for ch in name:
        if ch.isalnum() or ch in ("-", "_"):
            keep.append(ch)
        elif ch.isspace():
            keep.append("_")
    safe = "".join(keep).strip("_")
    return safe or "snippet"


def _safe_doc_id(name: str) -> str:
    base = Path(name or "").stem
    return _safe_name(base) or "document"


def _split_master_name(name: str) -> str:
    base = _safe_name(Path(name or "").stem) or "document"
    return f"{base}_split_master.pdf"


def _split_source_name(name: str) -> str:
    safe_name = Path(name or "").name
    suffix = "_split_master.pdf"
    if safe_name.lower().endswith(suffix):
        return f"{safe_name[:-len(suffix)]}.pdf"
    return safe_name


def _largest_image(images: List[Image.Image]) -> Image.Image | None:
    if not images:
        return None
    return max(images, key=lambda img: img.size[0] * img.size[1])


def _pdf_page_from_image(page_img: Image.Image, dpi: float = 300.0):
    img = page_img.convert("RGB")
    w_px, h_px = img.size
    w_pt = max(36.0, w_px * 72.0 / dpi)
    h_pt = max(36.0, h_px * 72.0 / dpi)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(w_pt, h_pt))
    c.drawImage(ImageReader(img), 0, 0, width=w_pt, height=h_pt)
    c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def _decode_text_bytes(raw: bytes) -> str:
    for enc in ("utf-8", "utf-8-sig", "utf-16", "utf-16le", "utf-16be", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except Exception:
            continue
    return raw.decode("utf-8", errors="replace")


def _strip_rtf_simple(text: str) -> str:
    t = text or ""
    if "{\\rtf" not in t[:200].lower():
        return t
    import re
    t = re.sub(r"\\'[0-9a-fA-F]{2}", lambda m: bytes.fromhex(m.group(0)[2:]).decode("latin-1", errors="ignore"), t)
    t = re.sub(r"\\par[d]?", "\n", t)
    t = re.sub(r"\\tab", "\t", t)
    t = re.sub(r"\\[a-zA-Z]+-?\d* ?", "", t)
    t = t.replace("{", "").replace("}", "")
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _extract_page_from_name(name: str):
    stem = Path(name).stem
    import re
    m = re.search(r"(\d{1,5})", stem)
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def _preview_file_key(filename: str) -> str:
    src = UPLOAD_DIR / Path(filename).name
    if not src.exists():
        return "missing"
    stat = src.stat()
    return f"{Path(filename).name}_{int(stat.st_mtime)}_{stat.st_size}"


def _render_pdf_page(filename: str, page: int, scale: float = 2.0) -> Image.Image:
    safe_name = Path(filename).name
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    doc = pdfium.PdfDocument(str(pdf_path))
    page_count = len(doc)
    if page < 1 or page > page_count:
        raise HTTPException(status_code=400, detail=f"Invalid page. Must be 1..{page_count}")
    p = doc[page - 1]
    bitmap = p.render(scale=scale)
    pil = bitmap.to_pil()
    doc.close()
    return pil

def _camscanner_bw(pil_img: Image.Image) -> Image.Image:
    # simplu alb-negru pentru OCR/export
    gray = pil_img.convert("L")
    # contrast
    bw = gray.point(lambda x: 0 if x < 160 else 255, "1")
    return bw.convert("RGB")


def _order_quad_points(pts: np.ndarray) -> np.ndarray:
    # pts shape: (4,2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect


def _scan_look(img_bgr: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    bg = cv2.GaussianBlur(gray, (0, 0), 25)
    norm = cv2.divide(gray, bg, scale=255)
    th = cv2.adaptiveThreshold(
        norm, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 12
    )
    den = cv2.medianBlur(th, 3)
    return cv2.cvtColor(den, cv2.COLOR_GRAY2BGR)


def _extract_scanned_pages(pil_img: Image.Image):
    img = cv2.cvtColor(np.array(pil_img.convert("RGB")), cv2.COLOR_RGB2BGR)
    H, W = img.shape[:2]

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 160)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    quads = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < (W * H * 0.06):
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2).astype("float32")
            rect = _order_quad_points(pts)
            quads.append((area, rect))

    # fallback: detect bright page regions and split by half
    if not quads:
        mask = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY)[1]
        cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts:
            x, y, w, h = cv2.boundingRect(c)
            area = w * h
            if area < (W * H * 0.08):
                continue
            rect = np.array(
                [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                dtype="float32",
            )
            quads.append((area, rect))

    if not quads:
        # last fallback: existing crop
        return _crop_pages_by_ocr_boxes(pil_img)

    # keep up to 2 largest (for spread pages)
    quads = sorted(quads, key=lambda q: q[0], reverse=True)[:2]
    quads = sorted(quads, key=lambda q: q[1][:, 0].mean())

    pages = []
    for _, rect in quads:
        (tl, tr, br, bl) = rect
        widthA = np.linalg.norm(br - bl)
        widthB = np.linalg.norm(tr - tl)
        maxW = int(max(widthA, widthB))
        heightA = np.linalg.norm(tr - br)
        heightB = np.linalg.norm(tl - bl)
        maxH = int(max(heightA, heightB))
        if maxW < 200 or maxH < 200:
            continue

        dst = np.array(
            [[0, 0], [maxW - 1, 0], [maxW - 1, maxH - 1], [0, maxH - 1]],
            dtype="float32",
        )
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (maxW, maxH), flags=cv2.INTER_CUBIC)

        # Portrait normalization
        if warped.shape[1] > warped.shape[0]:
            warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

        clean = _scan_look(warped)
        pages.append(Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)))

    if not pages:
        return _crop_pages_by_ocr_boxes(pil_img)
    return pages


def _ocr_tesseract(pil_img: Image.Image, lang: str):
    config = "--oem 3 --psm 6 -c preserve_interword_spaces=1"
    text = pytesseract.image_to_string(pil_img, lang=lang, config=config)
    return text.strip()


def _auto_crop_pages(pil_img: Image.Image):
    # Auto-crop to non-dark area (page) and split if it looks like two pages
    gray = pil_img.convert("L")
    # create a mask for light pixels
    mask = gray.point(lambda x: 255 if x > 30 else 0)
    bbox = mask.getbbox()
    if bbox:
        x1, y1, x2, y2 = bbox
        # add small padding
        pad = 5
        x1 = max(0, x1 - pad)
        y1 = max(0, y1 - pad)
        x2 = min(pil_img.width, x2 + pad)
        y2 = min(pil_img.height, y2 + pad)
        pil_img = pil_img.crop((x1, y1, x2, y2))
    w, h = pil_img.size
    if h == 0:
        return [pil_img]
    # If it looks like two pages, split in half
    if (w / h) >= 1.2:
        mid = w // 2
        left = pil_img.crop((0, 0, mid, h))
        right = pil_img.crop((mid, 0, w, h))
        return [left, right]
    return [pil_img]


def _crop_pages_by_ocr_boxes(pil_img: Image.Image):
    # Detect full paper area (not only text), so exported page keeps normal size.
    def _find_page_bbox(img: Image.Image):
        w0, h0 = img.size
        if w0 < 20 or h0 < 20:
            return None

        # Downscale only for detection speed.
        max_side = 1100
        scale = min(1.0, float(max_side) / float(max(w0, h0)))
        if scale < 1.0:
            w = max(1, int(w0 * scale))
            h = max(1, int(h0 * scale))
            probe = img.resize((w, h), Image.BILINEAR).convert("L")
        else:
            probe = img.convert("L")
            w, h = w0, h0

        px = probe.load()
        col_hits = [0] * w
        row_hits = [0] * h

        # Paper is generally brighter than background.
        thr = 55
        for y in range(h):
            rh = 0
            for x in range(w):
                if px[x, y] > thr:
                    rh += 1
                    col_hits[x] += 1
            row_hits[y] = rh

        def _range_from_hits(hits, denom, ratio):
            idx = [i for i, v in enumerate(hits) if (v / max(1, denom)) >= ratio]
            if not idx:
                return None
            return idx[0], idx[-1]

        xr = _range_from_hits(col_hits, h, 0.09) or _range_from_hits(col_hits, h, 0.06)
        yr = _range_from_hits(row_hits, w, 0.09) or _range_from_hits(row_hits, w, 0.06)
        if not xr or not yr:
            return None

        x1s, x2s = xr
        y1s, y2s = yr
        if (x2s - x1s) < 20 or (y2s - y1s) < 20:
            return None

        # Map back to original coordinates
        inv = 1.0 / scale
        x1 = int(x1s * inv)
        y1 = int(y1s * inv)
        x2 = int((x2s + 1) * inv)
        y2 = int((y2s + 1) * inv)

        # Keep small margin around page.
        pad_x = int((x2 - x1) * 0.03)
        pad_y = int((y2 - y1) * 0.03)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w0, x2 + pad_x)
        y2 = min(h0, y2 + pad_y)
        if (x2 - x1) < 80 or (y2 - y1) < 80:
            return None
        return (x1, y1, x2, y2)

    w, h = pil_img.size
    pages = []

    # Spread handling: detect each half separately, to get two output PDF pages.
    if (w / max(h, 1)) >= 1.15:
        mid = w // 2
        left_img = pil_img.crop((0, 0, mid, h))
        right_img = pil_img.crop((mid, 0, w, h))
        left_box = _find_page_bbox(left_img)
        right_box = _find_page_bbox(right_img)

        if left_box:
            lx1, ly1, lx2, ly2 = left_box
            pages.append(pil_img.crop((lx1, ly1, lx2, ly2)))
        if right_box:
            rx1, ry1, rx2, ry2 = right_box
            pages.append(pil_img.crop((mid + rx1, ry1, mid + rx2, ry2)))

    if pages:
        return pages

    # Single page fallback.
    box = _find_page_bbox(pil_img)
    if box:
        x1, y1, x2, y2 = box
        return [pil_img.crop((x1, y1, x2, y2))]

    # Last fallback if detection fails.
    return _auto_crop_pages(pil_img)


_lt_ro = None
_lt_fr = None


def _correct_text(text: str, lang: str) -> str:
    global _lt_ro, _lt_fr
    if not text:
        return text
    try:
        if lang == "ro":
            if _lt_ro is None:
                _lt_ro = language_tool_python.LanguageTool("ro")
            return _lt_ro.correct(text)
        if lang == "fr":
            if _lt_fr is None:
                _lt_fr = language_tool_python.LanguageTool("fr")
            return _lt_fr.correct(text)
    except Exception:
        return text
    return text


def _get_lt(lang: str):
    global _lt_ro, _lt_fr
    if lang == "ro":
        if _lt_ro is None:
            _lt_ro = language_tool_python.LanguageTool("ro")
        return _lt_ro
    if lang == "fr":
        if _lt_fr is None:
            _lt_fr = language_tool_python.LanguageTool("fr")
        return _lt_fr
    raise ValueError("Unsupported language")


def _is_spelling_match(match_obj) -> bool:
    issue = (getattr(match_obj, "ruleIssueType", "") or "").lower()
    rule_id = (getattr(match_obj, "ruleId", "") or "").upper()
    return issue == "misspelling" or "MORFOLOGIK" in rule_id


def _spell_matches(text: str, lang: str):
    tool = _get_lt(lang)
    matches = []
    for m in tool.check(text):
        if not _is_spelling_match(m):
            continue
        off = int(getattr(m, "offset", 0))
        ln = int(getattr(m, "errorLength", 0))
        if ln <= 0:
            continue
        bad = text[off:off + ln]
        if not bad.strip():
            continue
        reps = []
        for r in (getattr(m, "replacements", None) or []):
            v = str(r).strip()
            if v and v not in reps:
                reps.append(v)
        matches.append({
            "offset": off,
            "length": ln,
            "bad": bad,
            "suggestions": reps[:8],
            "lang": lang,
        })
    return matches


def _ocr_google_with_boxes(pil_img: Image.Image):
    client = _google_client()
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    image = vision.Image(content=buf.getvalue())
    image_context = vision.ImageContext(language_hints=["fr", "ro"])
    response = client.document_text_detection(image=image, image_context=image_context)
    if response.error.message:
        raise RuntimeError(response.error.message)
    annotation = response.full_text_annotation
    if not annotation or not annotation.pages:
        return "", []
    full_text = annotation.text.strip() if annotation.text else ""
    boxes = []
    for page in annotation.pages:
        for block in page.blocks:
            for para in block.paragraphs:
                for word in para.words:
                    word_text = "".join([sym.text for sym in word.symbols])
                    verts = word.bounding_box.vertices
                    xs = [v.x for v in verts]
                    ys = [v.y for v in verts]
                    x1, x2 = min(xs), max(xs)
                    y1, y2 = min(ys), max(ys)
                    boxes.append((word_text, x1, y1, x2 - x1, y2 - y1))
    return full_text, boxes


def _append_export_pages(user: str, pages: List[Image.Image], visible: bool = False) -> str:
    out_path = EXPORT_DIR / f"{user}_export.pdf"
    writer = PdfWriter()
    if out_path.exists():
        existing = PdfReader(out_path)
        for p in existing.pages:
            writer.add_page(p)

    for page_img in pages:
        clean = _camscanner_bw(page_img)
        text, boxes = _ocr_google_with_boxes(page_img)
        if not text:
            continue

        w_px, h_px = clean.size
        dpi = 300.0
        w_pt = w_px * 72.0 / dpi
        h_pt = h_px * 72.0 / dpi

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(w_pt, h_pt))
        c.drawImage(ImageReader(clean), 0, 0, width=w_pt, height=h_pt)

        def font_size_from_h(h_px):
            size = (h_px * 72.0 / dpi) * 0.7
            return max(4, min(24, size))

        if visible:
            for word, x, y, w, h in boxes:
                if not word:
                    continue
                fs = font_size_from_h(h)
                c.setFont("Helvetica", fs)
                c.drawString(x * 72.0 / dpi, h_pt - (y * 72.0 / dpi) - fs, word)
        else:
            for word, x, y, w, h in boxes:
                if not word:
                    continue
                fs = font_size_from_h(h)
                tx = c.beginText()
                tx.setTextRenderMode(3)
                tx.setFont("Helvetica", fs)
                tx.setTextOrigin(x * 72.0 / dpi, h_pt - (y * 72.0 / dpi) - fs)
                tx.textOut(word)
                c.drawText(tx)

        c.showPage()
        c.save()
        buf.seek(0)
        new_pdf = PdfReader(buf)
        writer.add_page(new_pdf.pages[0])

    with out_path.open("wb") as f:
        writer.write(f)
    return f"/export/{out_path.name}"


def _write_progress_files(user: str, file: str, current_page: int, pages_payload: dict, text_override: str | None = None):
    user_dir = PROGRESS_DIR / user
    user_dir.mkdir(parents=True, exist_ok=True)
    full_txt = user_dir / "full.txt"
    full_json = user_dir / "progress.json"

    items = []
    for k, v in pages_payload.items():
        if isinstance(v, str) and v.strip():
            try:
                pnum = int(k)
            except Exception:
                continue
            items.append((pnum, v))
    items.sort(key=lambda x: x[0])

    if text_override is not None:
        full_text = text_override
    else:
        full_text = "\n\n".join([f"--- PAGINA {p} ---\n\n{t}" for p, t in items]).strip()

    full_txt.write_text(full_text, encoding="utf-8")
    payload = {
        "user": user,
        "file": file,
        "page": current_page,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "text": full_text,
        "pages": pages_payload,
    }
    full_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _progress_doc_id(file: str) -> str:
    return _safe_doc_id(file or "manual")


def _progress_doc_dir(user: str, file: str) -> Path:
    path = PROGRESS_DIR / user / _progress_doc_id(file)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _progress_paths(user: str, file: str) -> tuple[Path, Path]:
    doc_dir = _progress_doc_dir(user, file)
    return doc_dir / "full.txt", doc_dir / "progress.json"


def _read_progress_payload(owner: str, file: str) -> dict | None:
    _, full_json = _progress_paths(owner, file)
    if not full_json.exists():
        return None
    try:
        return json.loads(full_json.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_document_progress_files(user: str, file: str, current_page: int, pages_payload: dict, text_override: str | None = None):
    full_txt, full_json = _progress_paths(user, file)

    items = []
    for k, v in pages_payload.items():
        if isinstance(v, str) and v.strip():
            try:
                pnum = int(k)
            except Exception:
                continue
            items.append((pnum, v))
    items.sort(key=lambda x: x[0])

    if text_override is not None:
        full_text = text_override
    else:
        full_text = "\n\n".join([f"--- PAGINA {p} ---\n\n{t}" for p, t in items]).strip()

    full_txt.write_text(full_text, encoding="utf-8")
    payload = {
        "user": user,
        "file": file,
        "page": current_page,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "text": full_text,
        "pages": pages_payload,
    }
    full_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    _write_progress_files(user, file, current_page, pages_payload, text_override=full_text)


def _ocr_cache_key(file: str, page: int, rotation: float, mode: str) -> str:
    safe_file = _safe_doc_id(file)
    rot_key = str(int(round(float(rotation or 0) * 10)))
    mode_key = "scan" if str(mode).strip().lower() == "scan" else "document"
    return f"{safe_file}_p{int(page)}_r{rot_key}_{mode_key}.json"


def _ocr_cache_path(user: str, file: str, page: int, rotation: float, mode: str) -> Path:
    user_dir = OCR_CACHE_DIR / user
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / _ocr_cache_key(file, page, rotation, mode)


def _load_ocr_cache(user: str, file: str, page: int, rotation: float, mode: str):
    path = _ocr_cache_path(user, file, page, rotation, mode)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(payload, dict):
        return None
    return payload


def _save_ocr_cache(user: str, file: str, page: int, rotation: float, mode: str, text: str):
    path = _ocr_cache_path(user, file, page, rotation, mode)
    payload = {
        "file": Path(file).name,
        "page": int(page),
        "rotation": float(rotation or 0),
        "mode": "scan" if str(mode).strip().lower() == "scan" else "document",
        "text": str(text or ""),
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _process_pdf_page(file: str, page: int, rotation: float, mode: str):
    pil = _render_pdf_page(file, page, scale=3.0).convert("RGB")
    rot = float(rotation or 0) % 360
    if rot:
        pil = pil.rotate(-rot, expand=True)

    if mode == "scan":
        pages = _extract_scanned_pages(pil)
    else:
        pages = _crop_pages_by_ocr_boxes(pil)

    texts = []
    for p in pages:
        t, _ = _ocr_google_with_boxes(p)
        if t:
            texts.append(t.strip())
    return "\n\n".join(texts), pages


def _run_document_ocr_job(
    job_id: str,
    user: str,
    safe_name: str,
    total_pages: int,
    rotation: int,
    mode: str,
    start_page: int,
    end_page: int,
):
    try:
        pages_payload = {}
        normalized_mode = "scan" if str(mode).strip().lower() == "scan" else "document"
        target_count = max(0, end_page - start_page + 1)
        completed = 0
        for page_no in range(start_page, end_page + 1):
            page_text, _processed_pages = _process_pdf_page(safe_name, page_no, rotation, normalized_mode)
            clean_text = page_text.strip()
            pages_payload[str(page_no)] = clean_text
            _save_ocr_cache(user, safe_name, page_no, rotation, normalized_mode, clean_text)
            completed += 1
            assembled_text = "\n\n".join(
                [f"--- PAGINA {p} ---\n\n{txt}" for p, txt in sorted(
                    ((int(k), v) for k, v in pages_payload.items()),
                    key=lambda item: item[0],
                ) if txt.strip()]
            ).strip()
            _write_document_progress_files(user, safe_name, page_no, pages_payload, text_override=assembled_text)
            _set_job_state(
                job_id,
                status="running",
                current_page=page_no,
                total_pages=total_pages,
                start_page=start_page,
                end_page=end_page,
                progress=int((completed / max(target_count, 1)) * 100),
                text=assembled_text,
                pages=pages_payload,
            )

        _set_job_state(
            job_id,
            status="done",
            current_page=end_page,
            total_pages=total_pages,
            start_page=start_page,
            end_page=end_page,
            progress=100,
            file=safe_name,
        )
    except Exception as exc:
        _set_job_state(job_id, status="error", error=str(exc))


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    token = request.cookies.get("session")
    if token:
        try:
            data = serializer.loads(token)
            if _is_dictionary_only_user(data.get("u")):
                return RedirectResponse(url="/dictionary", status_code=303)
        except BadSignature:
            pass
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/studio", response_class=HTMLResponse)
def studio():
    return FileResponse(FRONTEND_DIR / "studio.html")


@app.get("/studio-manuscrise", response_class=HTMLResponse)
def studio_manuscrise():
    return FileResponse(FRONTEND_DIR / "studio-manuscrise.html")


@app.get("/filters", response_class=HTMLResponse)
def filters_page(user: str = Depends(get_current_user)):
    _ = user
    return FileResponse(FRONTEND_DIR / "filters.html")


@app.get("/dictionary", response_class=HTMLResponse)
def dictionary_page(request: Request):
    try:
        _ = get_current_user(request)
    except HTTPException:
        return RedirectResponse(url="/", status_code=303)
    return FileResponse(
        FRONTEND_DIR / "dictionary.html",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@app.get("/api/dictionary-summary")
def dictionary_summary(user: str = Depends(get_current_user)):
    _ = user
    if not DICTIONARY_TXT_PATH.exists() or not DICTIONARY_DOCX_PATH.exists():
        raise HTTPException(status_code=404, detail="Fișierele de dicționar nu sunt disponibile pe server.")
    return build_dictionary_payload(DICTIONARY_TXT_PATH, DICTIONARY_DOCX_PATH)


@app.post("/login")
def login(response: Response, username: str = Form(...), password: str = Form(...)):
    users = _load_users()
    entry = users.get(username)
    if entry is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if isinstance(entry, dict):
        if _is_expired(entry.get("expires")):
            raise HTTPException(status_code=401, detail="User expired")
        if entry.get("password") != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    else:
        if entry != password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_session(username)
    response.set_cookie("session", token, httponly=True, samesite="lax")
    redirect_to = "/dictionary" if _is_dictionary_only_user(username) else None
    return {"ok": True, "redirect_to": redirect_to}


@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}


@app.get("/me")
def me(user: str = Depends(get_current_user)):
    return {
        "user": user,
        "is_admin": user == ADMIN_USER,
        "dictionary_only": _is_dictionary_only_user(user),
        "home": "/dictionary" if _is_dictionary_only_user(user) else "/",
    }


@app.post("/admin/create_user")
def admin_create_user(
    username: str = Form(...),
    password: str = Form(...),
    user: str = Depends(get_current_user),
):
    if user != ADMIN_USER:
        raise HTTPException(status_code=403, detail="Admin only")
    clean_user = username.strip()
    if not clean_user:
        raise HTTPException(status_code=400, detail="Username required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 chars")
    users = _load_users()
    users[clean_user] = password
    with _users_lock:
        USERS_FILE.write_text(json.dumps(users, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "username": clean_user}


@app.post("/upload")
async def upload(file: UploadFile = File(...), user: str = Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file")
    safe_name = Path(file.filename).name
    dest = UPLOAD_DIR / safe_name
    with dest.open("wb") as f:
        f.write(await file.read())
    _grant_file(user, safe_name)
    # Invalidate old preview cache entries for same filename
    prefix = f"{safe_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()
    return {"ok": True, "filename": safe_name}


@app.get("/files")
def list_files(user: str = Depends(get_current_user)):
    all_files = [p.name for p in UPLOAD_DIR.iterdir() if p.is_file()]
    if user == ADMIN_USER:
        files = sorted(all_files)
    else:
        allowed = set(_load_user_files().get(user, []))
        files = sorted([f for f in all_files if f in allowed])
    return {"files": files}


@app.get("/files/latest_split")
def latest_split_file(user: str = Depends(get_current_user)):
    _ = user
    candidates = []
    allowed = None
    if user != ADMIN_USER:
        allowed = set(_load_user_files().get(user, []))
    for path in UPLOAD_DIR.iterdir():
        if not path.is_file():
            continue
        if allowed is not None and path.name not in allowed:
            continue
        name = path.name.lower()
        if path.suffix.lower() != ".pdf":
            continue
        if "_split_" in name or name.startswith("split_") or "split_pages" in name:
            candidates.append(path)
    if not candidates:
        raise HTTPException(status_code=404, detail="Nu există PDF splitat disponibil.")
    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    return {"filename": latest.name}


@app.get("/files/{name}")
def get_file(name: str, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    _assert_user_can_access(user, safe_name)
    path = UPLOAD_DIR / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@app.delete("/files/{name}")
def delete_file(name: str, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    _assert_user_can_access(user, safe_name)
    path = UPLOAD_DIR / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    path.unlink()
    _revoke_file(safe_name)

    prefix = f"{safe_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()

    return {"ok": True, "filename": safe_name}


@app.get("/pdf/meta/{name}")
def pdf_meta(name: str, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    doc = pdfium.PdfDocument(str(pdf_path))
    page_count = len(doc)
    doc.close()
    return {"pages": page_count}


@app.get("/pdf/page_box/{name}/{page}")
def pdf_page_box(name: str, page: int, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    if page < 1 or page > total_pages:
        raise HTTPException(status_code=400, detail=f"Invalid page. Must be 1..{total_pages}")
    box = reader.pages[page - 1].mediabox
    return {
        "width": float(box.right) - float(box.left),
        "height": float(box.top) - float(box.bottom),
    }


@app.get("/pdf/page_image/{name}/{page}")
def pdf_page_image(name: str, page: int, scale: float = 1.6, rotation: float = 0, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    _assert_user_can_access(user, safe_name)
    cache_key = _preview_file_key(safe_name)
    scale_key = int(scale * 100)
    rot_key = int(float(rotation or 0) * 10)
    page_dir = PREVIEW_DIR / cache_key
    page_dir.mkdir(parents=True, exist_ok=True)
    out_path = page_dir / f"p{page}_s{scale_key}_r{rot_key}.jpg"
    if not out_path.exists():
        pil = _render_pdf_page(safe_name, page, scale=scale)
        rot = float(rotation or 0) % 360
        if rot:
            pil = pil.rotate(-rot, expand=True)
        pil = pil.convert("RGB")
        pil.save(out_path, format="JPEG", quality=88, optimize=True)
    return FileResponse(out_path, media_type="image/jpeg")


@app.post("/pdf/split")
async def split_pdf(
    file: str = Form(...),
    start_page: int = Form(1),
    end_page: int = Form(0),
    shift: float = Form(18.0),
    rotation: float = Form(0),
    user: str = Depends(get_current_user),
):
    requested_name = Path(file).name
    safe_name = _split_source_name(requested_name)
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    start_page, end_page = _normalize_page_range(start_page, end_page or total_pages, total_pages)

    shift_value = float(shift or 0)
    render_scale = 2.5
    buf = io.BytesIO()
    pdf_canvas = None
    appended_pages = 0

    for page_no in range(start_page - 1, end_page):
        src_page = reader.pages[page_no]
        box = src_page.mediabox
        x0, x1 = float(box.left), float(box.right)

        pil = _render_pdf_page(safe_name, page_no + 1, scale=render_scale).convert("RGB")
        rot = float(rotation or 0) % 360
        if rot:
            pil = pil.rotate(-rot, expand=True)
        mid_px = int((pil.width / 2.0) + (shift_value * render_scale))
        mid_px = max(1, min(pil.width - 1, mid_px))

        left_img = pil.crop((0, 0, mid_px, pil.height))
        right_img = pil.crop((mid_px, 0, pil.width, pil.height))

        page_width_pt = max(1.0, (x1 - x0) / 2.0)
        left_width_pt = page_width_pt + shift_value
        right_width_pt = page_width_pt - shift_value
        left_width_pt = max(36.0, left_width_pt)
        right_width_pt = max(36.0, right_width_pt)
        page_height_pt = max(36.0, pil.height / render_scale)

        for img, width_pt in ((left_img, left_width_pt), (right_img, right_width_pt)):
            if pdf_canvas is None:
                pdf_canvas = canvas.Canvas(buf, pagesize=(width_pt, page_height_pt))
            else:
                pdf_canvas.setPageSize((width_pt, page_height_pt))
            pdf_canvas.drawImage(ImageReader(img), 0, 0, width=width_pt, height=page_height_pt)
            pdf_canvas.showPage()
            appended_pages += 1

    out_name = _split_master_name(safe_name)
    out_path = UPLOAD_DIR / out_name
    if pdf_canvas is None:
        raise HTTPException(status_code=400, detail="Nu s-au putut genera pagini splitate.")
    pdf_canvas.save()

    new_reader = PdfReader(io.BytesIO(buf.getvalue()))
    writer = PdfWriter()

    if out_path.exists():
        existing_reader = PdfReader(str(out_path))
        for page in existing_reader.pages:
            writer.add_page(page)

    for page in new_reader.pages:
        writer.add_page(page)

    with out_path.open("wb") as fh:
        writer.write(fh)
    _grant_file(user, out_name)

    prefix = f"{out_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()

    final_reader = PdfReader(str(out_path))
    total_split_pages = len(final_reader.pages)

    return {
        "ok": True,
        "source_file": safe_name,
        "filename": out_name,
        "pages": total_split_pages,
        "appended_pages": appended_pages,
        "source_pages": end_page - start_page + 1,
    }


@app.post("/pdf/remove_pages")
async def pdf_remove_pages(
    file: str = Form(...),
    start_page: int = Form(...),
    end_page: int = Form(...),
    user: str = Depends(get_current_user),
):
    safe_name = Path(file).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    if not safe_name.lower().endswith("_split_master.pdf"):
        raise HTTPException(status_code=400, detail="Poți șterge pagini doar dintr-un split master.")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    start_page, end_page = _normalize_page_range(start_page, end_page or total_pages, total_pages)

    if start_page == 1 and end_page == total_pages:
        raise HTTPException(status_code=400, detail="Nu poți șterge toate paginile din split master dintr-un singur pas.")

    writer = PdfWriter()
    kept_pages = 0
    for page_index, page in enumerate(reader.pages, start=1):
        if start_page <= page_index <= end_page:
            continue
        writer.add_page(page)
        kept_pages += 1

    with pdf_path.open("wb") as fh:
        writer.write(fh)

    prefix = f"{safe_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()

    next_page = min(start_page, kept_pages) if kept_pages else 1
    return {
        "ok": True,
        "filename": safe_name,
        "pages": kept_pages,
        "current_page": next_page,
        "removed_pages": end_page - start_page + 1,
    }


@app.post("/pdf/rotate_page")
async def pdf_rotate_page(
    file: str = Form(...),
    page: int = Form(...),
    angle: int = Form(...),
    user: str = Depends(get_current_user),
):
    safe_name = Path(file).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    if angle not in {-180, -90, 90, 180}:
        raise HTTPException(status_code=400, detail="Unghiul trebuie să fie multiplu de 90.")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    if page < 1 or page > total_pages:
        raise HTTPException(status_code=400, detail=f"Pagina trebuie să fie între 1 și {total_pages}.")
    normalized_angle = angle % 360

    writer = PdfWriter()
    for page_index, src_page in enumerate(reader.pages, start=1):
        if page_index == page:
            src_page.rotate(normalized_angle)
        writer.add_page(src_page)

    with pdf_path.open("wb") as fh:
        writer.write(fh)

    prefix = f"{safe_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()

    return {"ok": True, "filename": safe_name, "page": page, "angle": normalized_angle}


@app.post("/pdf/clean_page")
async def pdf_clean_page(
    file: str = Form(...),
    page: int = Form(...),
    user: str = Depends(get_current_user),
):
    safe_name = Path(file).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    if page < 1 or page > total_pages:
        raise HTTPException(status_code=400, detail=f"Pagina trebuie să fie între 1 și {total_pages}.")

    pil = _render_pdf_page(safe_name, page, scale=2.5).convert("RGB")
    cropped_candidates = _crop_pages_by_ocr_boxes(pil)
    cleaned = _largest_image(cropped_candidates)
    if cleaned is None:
        raise HTTPException(status_code=400, detail="Nu am putut detecta automat zona utilă a paginii.")

    replacement_page = _pdf_page_from_image(cleaned)
    writer = PdfWriter()
    for page_index, src_page in enumerate(reader.pages, start=1):
        if page_index == page:
            writer.add_page(replacement_page)
        else:
            writer.add_page(src_page)

    with pdf_path.open("wb") as fh:
        writer.write(fh)

    prefix = f"{safe_name}_"
    for p in PREVIEW_DIR.glob(f"{prefix}*"):
        if p.is_dir():
            for child in p.glob("*"):
                child.unlink(missing_ok=True)
            p.rmdir()

    return {"ok": True, "filename": safe_name, "page": page}


@app.get("/ocr/cache")
def get_ocr_cache(
    file: str,
    page: int,
    rotation: float = 0,
    mode: str = "document",
    user: str = Depends(get_current_user),
):
    _assert_user_can_access(user, Path(file).name)
    payload = _load_ocr_cache(user, file, page, rotation, mode)
    if not payload:
        return {"ok": True, "found": False}
    return {
        "ok": True,
        "found": True,
        "text": str(payload.get("text") or ""),
        "updated_at": payload.get("updated_at"),
        "mode": payload.get("mode"),
        "page": payload.get("page"),
    }


@app.post("/ocr/google")
async def ocr_google(image: UploadFile = File(...), user: str = Depends(get_current_user)):
    data = await image.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")
    try:
        pages = _auto_crop_pages(pil)
        texts = []
        for p in pages:
            t, _ = _ocr_google_with_boxes(p)
            if t:
                texts.append(t.strip())
        text = "\n\n".join(texts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"text": text}


@app.post("/ocr/google_page")
async def ocr_google_page(
    file: str = Form(...),
    page: int = Form(...),
    rotation: float = Form(0),
    auto_export: bool = Form(True),
    user: str = Depends(get_current_user),
):
    _assert_user_can_access(user, Path(file).name)
    text, pages = _process_pdf_page(file, page, rotation, mode="document")
    _save_ocr_cache(user, file, page, rotation, "document", text.strip())
    export_path = None
    if auto_export:
        export_path = _append_export_pages(user, pages, visible=False)
    return {"text": text, "path": export_path}


@app.post("/scan/page")
async def scan_page(
    file: str = Form(...),
    page: int = Form(...),
    rotation: float = Form(0),
    auto_export: bool = Form(True),
    user: str = Depends(get_current_user),
):
    _assert_user_can_access(user, Path(file).name)
    text, pages = _process_pdf_page(file, page, rotation, mode="scan")
    _save_ocr_cache(user, file, page, rotation, "scan", text.strip())
    export_path = None
    if auto_export:
        export_path = _append_export_pages(user, pages, visible=False)
    return {"text": text, "path": export_path, "pages": len(pages)}


@app.post("/ocr/google_document")
async def ocr_google_document(
    file: str = Form(...),
    rotation: float = Form(0),
    mode: str = Form("document"),
    start_page: int = Form(1),
    end_page: int = Form(0),
    auto_export: bool = Form(True),
    user: str = Depends(get_current_user),
):
    safe_name = Path(file).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")

    doc = pdfium.PdfDocument(str(pdf_path))
    total_pages = len(doc)
    doc.close()
    start_page, end_page = _normalize_page_range(start_page, end_page or total_pages, total_pages)

    all_texts = []
    export_pages = []
    pages_payload = {}
    normalized_mode = "scan" if str(mode).strip().lower() == "scan" else "document"

    for page_no in range(start_page, end_page + 1):
        page_text, processed_pages = _process_pdf_page(safe_name, page_no, rotation, normalized_mode)
        clean_text = page_text.strip()
        pages_payload[str(page_no)] = clean_text
        all_texts.append(f"--- PAGINA {page_no} ---\n\n{clean_text}".strip())
        if auto_export and processed_pages:
            export_pages.extend(processed_pages)

    export_path = None
    if auto_export and export_pages:
        export_path = _append_export_pages(user, export_pages, visible=False)

    full_text = "\n\n".join([part for part in all_texts if part.strip()]).strip()
    return {
        "text": full_text,
        "pages": pages_payload,
        "page_count": total_pages,
        "start_page": start_page,
        "end_page": end_page,
        "path": export_path,
    }


@app.post("/ocr/google_document_async")
async def ocr_google_document_async(
    file: str = Form(...),
    rotation: float = Form(0),
    mode: str = Form("document"),
    start_page: int = Form(1),
    end_page: int = Form(0),
    user: str = Depends(get_current_user),
):
    safe_name = Path(file).name
    _assert_user_can_access(user, safe_name)
    pdf_path = UPLOAD_DIR / safe_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")

    doc = pdfium.PdfDocument(str(pdf_path))
    total_pages = len(doc)
    doc.close()
    start_page, end_page = _normalize_page_range(start_page, end_page or total_pages, total_pages)

    job_id = _safe_name(f"{user}_{safe_name}_{datetime.utcnow().timestamp()}")[:120]
    _set_job_state(
        job_id,
        status="queued",
        user=user,
        file=safe_name,
        current_page=0,
        total_pages=total_pages,
        start_page=start_page,
        end_page=end_page,
        progress=0,
        error=None,
        text="",
        pages={},
    )

    thread = threading.Thread(
        target=_run_document_ocr_job,
        args=(job_id, user, safe_name, total_pages, rotation, mode, start_page, end_page),
        daemon=True,
    )
    thread.start()
    return {"job_id": job_id, "total_pages": total_pages, "start_page": start_page, "end_page": end_page}


@app.get("/ocr/job/{job_id}")
def ocr_job_status(job_id: str, user: str = Depends(get_current_user)):
    state = _get_job_state(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Job not found")
    if state.get("user") != user:
        raise HTTPException(status_code=403, detail="Forbidden")
    return state


@app.post("/scan/view")
async def scan_view(
    image: UploadFile = File(...),
    auto_export: bool = Form(True),
    user: str = Depends(get_current_user),
):
    data = await image.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")

    # Use the stable crop logic that behaved better for your scans.
    pages = _crop_pages_by_ocr_boxes(pil)
    if not pages:
        pages = _auto_crop_pages(pil)

    texts = []
    for p in pages:
        t, _ = _ocr_google_with_boxes(p)
        if t:
            texts.append(t.strip())
    text = "\n\n".join(texts)
    export_path = None
    if auto_export:
        export_path = _append_export_pages(user, pages, visible=False)
    return {"text": text, "path": export_path, "pages": len(pages)}


@app.post("/ocr/tesseract")
async def ocr_tesseract(
    image: UploadFile = File(...),
    lang: str = Form("ron"),
    correct: bool = Form(False),
    user: str = Depends(get_current_user),
):
    data = await image.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")
    try:
        text = _ocr_tesseract(pil, lang)
        if correct:
            if lang == "ron":
                text = _correct_text(text, "ro")
            elif lang == "fra":
                text = _correct_text(text, "fr")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"text": text}


@app.post("/ocr/google_boxes")
async def ocr_google_boxes(image: UploadFile = File(...), user: str = Depends(get_current_user)):
    data = await image.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")
    try:
        text, boxes = _ocr_google_with_boxes(pil)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    w, h = pil.size
    return {"text": text, "boxes": boxes, "width": w, "height": h}


@app.post("/spellcheck")
async def spellcheck(request: Request, user: str = Depends(get_current_user)):
    payload = await request.json()
    text = (payload.get("text") or "").strip()
    mode = (payload.get("mode") or "auto").strip().lower()
    if not text:
        return {"matches": []}

    if mode in ("ro", "fr"):
        return {"matches": _spell_matches(text, mode)}

    # auto: mark words wrong in BOTH RO and FR
    ro = _spell_matches(text, "ro")
    fr = _spell_matches(text, "fr")
    ro_map = {(m["offset"], m["length"]): m for m in ro}
    fr_map = {(m["offset"], m["length"]): m for m in fr}
    keys = sorted(set(ro_map.keys()).intersection(fr_map.keys()))
    out = []
    for k in keys:
        r = ro_map[k]
        f = fr_map[k]
        sug = []
        for s in (r.get("suggestions", []) + f.get("suggestions", [])):
            if s not in sug:
                sug.append(s)
        out.append({
            "offset": r["offset"],
            "length": r["length"],
            "bad": r["bad"],
            "suggestions": sug[:10],
            "lang": "auto",
        })
    return {"matches": out}


@app.post("/export/add")
async def export_add(
    image: UploadFile = File(...),
    visible: bool = Form(False),
    user: str = Depends(get_current_user),
):
    data = await image.read()
    pil = Image.open(io.BytesIO(data)).convert("RGB")
    pages = _auto_crop_pages(pil)
    path = _append_export_pages(user, pages, visible=visible)
    return {"ok": True, "path": path}


@app.get("/export/{name}")
def get_export(name: str, user: str = Depends(get_current_user)):
    safe_name = Path(name).name
    path = EXPORT_DIR / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@app.post("/export/json")
async def export_json(
    request: Request,
    user: str = Depends(get_current_user),
):
    payload = await request.json()
    user_dir = EXPORT_DIR
    user_dir.mkdir(parents=True, exist_ok=True)
    out_path = user_dir / f"{user}_export.json"
    import json as _json
    out_path.write_text(_json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"ok": True, "path": f"/export/{out_path.name}"}


@app.post("/save/selection")
async def save_selection(
    name: str = Form(...),
    text: str = Form(...),
    user: str = Depends(get_current_user),
):
    safe = _safe_name(name)
    user_dir = SNIPPETS_DIR / user
    user_dir.mkdir(parents=True, exist_ok=True)
    path = user_dir / f"{safe}.txt"
    path.write_text(text, encoding="utf-8")
    return {"ok": True, "path": f"/snippets/{user}/{path.name}"}


@app.post("/save/progress")
async def save_progress(
    text: str = Form(...),
    file: str = Form(""),
    page: int = Form(1),
    pages_json: str = Form(""),
    user: str = Depends(get_current_user),
):
    full_text = text
    parsed_pages = {}
    if pages_json:
        try:
            parsed_pages = json.loads(pages_json)
        except Exception:
            parsed_pages = {}
    if isinstance(parsed_pages, dict) and parsed_pages:
        # Build full.txt only from pages that actually have content
        items = []
        for k, v in parsed_pages.items():
            if isinstance(v, str) and v.strip():
                try:
                    pnum = int(k)
                except Exception:
                    continue
                items.append((pnum, v))
        items.sort(key=lambda x: x[0])
        if items:
            parts = []
            for pnum, ptxt in items:
                parts.append(f"\n\n--- PAGINA {pnum} ---\n\n{ptxt}")
            full_text = "".join(parts).strip()
    _write_document_progress_files(user, file, page, parsed_pages if isinstance(parsed_pages, dict) else {}, text_override=full_text)
    doc_id = _progress_doc_id(file)
    return {
        "ok": True,
        "doc_id": doc_id,
        "path_txt": f"/progress/{user}/{doc_id}/full.txt",
        "path_json": f"/progress/{user}/{doc_id}/progress.json",
    }


@app.post("/import/txt_bulk")
async def import_txt_bulk(
    files: List[UploadFile] = File(...),
    start_page: int = Form(1),
    mode: str = Form("merge"),  # merge | overwrite
    map_mode: str = Form("order"),  # order | filename
    page_offset: int = Form(0),  # used only for filename mode: page = file_no + offset
    file: str = Form(""),
    user: str = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nu există fișiere pentru import.")

    entries = []  # list[(name, text)]
    for f in files:
        if not f.filename:
            continue
        name = Path(f.filename).name
        raw = await f.read()
        lower = name.lower()
        if lower.endswith(".txt"):
            entries.append((name, _strip_rtf_simple(_decode_text_bytes(raw))))
            continue
        if lower.endswith(".zip"):
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                    for zname in sorted(zf.namelist()):
                        if zname.endswith("/") or not zname.lower().endswith(".txt"):
                            continue
                        with zf.open(zname) as zitem:
                            zraw = zitem.read()
                        entries.append((Path(zname).name, _strip_rtf_simple(_decode_text_bytes(zraw))))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"ZIP invalid ({name}): {e}")
            continue

    if not entries:
        raise HTTPException(status_code=400, detail="Nu am găsit fișiere .txt valide.")

    entries.sort(key=lambda x: x[0].lower())
    mapped = {}
    current = max(1, int(start_page or 1))
    skipped = []
    for name, text in entries:
        page_num = None
        if map_mode == "filename":
            n = _extract_page_from_name(name)
            if n is not None:
                page_num = n + int(page_offset or 0)
        if page_num is None:
            page_num = current
            current += 1
        if page_num <= 0:
            skipped.append(name)
            continue
        mapped[page_num] = text.strip()

    _, full_json = _progress_paths(user, file)

    existing_pages = {}
    if full_json.exists():
        try:
            payload = json.loads(full_json.read_text(encoding="utf-8"))
            if isinstance(payload.get("pages"), dict):
                existing_pages = {int(k): str(v) for k, v in payload["pages"].items()}
        except Exception:
            existing_pages = {}

    if mode == "overwrite":
        merged_pages = mapped
    else:
        merged_pages = dict(existing_pages)
        merged_pages.update(mapped)

    items = []
    for pnum in sorted(merged_pages.keys()):
        txt = merged_pages[pnum]
        if isinstance(txt, str) and txt.strip():
            items.append((pnum, txt))
    full_text = "\n\n".join([f"--- PAGINA {p} ---\n\n{t}" for p, t in items]).strip()

    _write_document_progress_files(
        user,
        file,
        min(mapped.keys()) if mapped else 1,
        {str(k): v for k, v in merged_pages.items()},
        text_override=full_text,
    )

    doc_id = _progress_doc_id(file)

    return {
        "ok": True,
        "imported_count": len(mapped),
        "skipped": skipped,
        "pages": {str(k): v for k, v in mapped.items()},
        "path_txt": f"/progress/{user}/{doc_id}/full.txt",
        "path_json": f"/progress/{user}/{doc_id}/progress.json",
    }


@app.get("/snippets/{user}/{name}")
def get_snippet(user: str, name: str, current_user: str = Depends(get_current_user)):
    if current_user != ADMIN_USER and current_user != Path(user).name:
        raise HTTPException(status_code=403, detail="Access denied")
    safe_user = Path(user).name
    safe_name = Path(name).name
    path = SNIPPETS_DIR / safe_user / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@app.get("/progress/{user}/{doc_id}/{name}")
def get_progress(user: str, doc_id: str, name: str, current_user: str = Depends(get_current_user)):
    if current_user != ADMIN_USER and current_user != Path(user).name:
        raise HTTPException(status_code=403, detail="Access denied")
    safe_user = Path(user).name
    safe_doc_id = Path(doc_id).name
    safe_name = Path(name).name
    path = PROGRESS_DIR / safe_user / safe_doc_id / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


@app.get("/progress/load")
def load_progress(file: str, owner: str = "", user: str = Depends(get_current_user)):
    safe_name = Path(file).name
    target_owner = Path(owner).name if owner and user == ADMIN_USER else user
    if safe_name and user != ADMIN_USER:
        _assert_user_can_access(user, safe_name)
    payload = _read_progress_payload(target_owner, safe_name)
    if payload is None:
        return {"found": False}
    return {"found": True, "payload": payload, "owner": target_owner}


@app.get("/admin/progress_index")
def admin_progress_index(user: str = Depends(get_current_user)):
    if user != ADMIN_USER:
        raise HTTPException(status_code=403, detail="Admin only")
    entries = []
    if not PROGRESS_DIR.exists():
        return {"entries": entries}
    for user_dir in sorted([p for p in PROGRESS_DIR.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        for doc_dir in sorted([p for p in user_dir.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
            progress_json = doc_dir / "progress.json"
            if not progress_json.exists():
                continue
            try:
                payload = json.loads(progress_json.read_text(encoding="utf-8"))
            except Exception:
                continue
            file_name = str(payload.get("file") or "")
            entries.append({
                "owner": user_dir.name,
                "doc_id": doc_dir.name,
                "file": file_name,
                "label": file_name or doc_dir.name,
                "updated_at": payload.get("updated_at", ""),
                "page": payload.get("page", 1),
            })
    entries.sort(key=lambda item: (item.get("updated_at", ""), item.get("owner", ""), item.get("label", "")), reverse=True)
    return {"entries": entries}


@app.post("/sources/upload")
async def upload_sources(
    file: str = Form(...),
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),  # merge | overwrite
    user: str = Depends(get_current_user),
):
    if not file:
        raise HTTPException(status_code=400, detail="Alege mai întâi documentul PDF.")
    if not files:
        raise HTTPException(status_code=400, detail="Nu există fișiere TXT.")
    doc_id = _safe_doc_id(file)
    user_dir = SOURCES_DIR / user / doc_id
    user_dir.mkdir(parents=True, exist_ok=True)
    if mode == "overwrite":
        for p in user_dir.glob("*.txt"):
            p.unlink(missing_ok=True)
    saved = []
    for f in files:
        if not f.filename:
            continue
        name = Path(f.filename).name
        if not name.lower().endswith(".txt"):
            continue
        content = _strip_rtf_simple(_decode_text_bytes(await f.read()))
        out = user_dir / f"{_safe_name(Path(name).stem)}.txt"
        out.write_text(content, encoding="utf-8")
        saved.append(out.name)
    return {"ok": True, "saved": saved, "count": len(saved), "doc": doc_id}


@app.get("/sources/{file_name}")
def list_sources(file_name: str, user: str = Depends(get_current_user)):
    doc_id = _safe_doc_id(file_name)
    user_dir = SOURCES_DIR / user / doc_id
    if not user_dir.exists():
        return {"files": []}
    files = []
    for p in sorted(user_dir.glob("*.txt")):
        try:
            txt = p.read_text(encoding="utf-8")
        except Exception:
            txt = ""
        files.append({"name": p.name, "text": txt})
    return {"files": files}


@app.post("/sources/upload_docs")
async def upload_filter_docs(
    files: List[UploadFile] = File(...),
    mode: str = Form("merge"),  # merge | overwrite
    user: str = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="Nu există fișiere TXT.")
    user_dir = FILTER_DOCS_DIR / user
    user_dir.mkdir(parents=True, exist_ok=True)
    if mode == "overwrite":
        for p in user_dir.glob("*.txt"):
            p.unlink(missing_ok=True)

    saved = []
    for f in files:
        if not f.filename:
            continue
        name = Path(f.filename).name
        if not name.lower().endswith(".txt"):
            continue
        content = _strip_rtf_simple(_decode_text_bytes(await f.read()))
        doc_id = _safe_name(Path(name).stem)
        out = user_dir / f"{doc_id}.txt"
        out.write_text(content, encoding="utf-8")
        saved.append({"doc_id": doc_id, "name": out.name})

    return {"ok": True, "saved": saved, "count": len(saved)}


@app.get("/sources/docs")
def list_filter_docs(user: str = Depends(get_current_user)):
    user_dir = FILTER_DOCS_DIR / user
    if not user_dir.exists():
        return {"docs": []}
    docs = []
    for p in sorted(user_dir.glob("*.txt")):
        docs.append({"doc_id": p.stem, "name": p.name})
    return {"docs": docs}


@app.post("/articles/export")
async def export_articles(
    request: Request,
    user: str = Depends(get_current_user),
):
    payload = await request.json()
    file_name = Path(str(payload.get("file") or "document")).name
    raw_text = str(payload.get("text") or "")
    apply_cleanup = bool(payload.get("cleanup", True))
    normalized_text = _cleanup_editorial_text(raw_text) if apply_cleanup else raw_text
    articles = _split_articles(normalized_text)
    if not articles:
        raise HTTPException(status_code=400, detail="Nu am putut detecta articolele în text.")

    doc_id = _safe_doc_id(file_name)
    user_dir = ARTICLES_DIR / user / doc_id
    user_dir.mkdir(parents=True, exist_ok=True)
    volume_suffix = _volume_suffix(file_name, normalized_text)

    saved = []
    for idx, article in enumerate(articles, start=1):
        number = article["number"]
        date_slug = _slug_date(article["date"])
        file_number = _filename_article_number(number) or f"article_{idx}"
        file_stem = _safe_name(f"{file_number}_{date_slug}_{volume_suffix}") or f"article_{idx}"
        out = user_dir / f"{file_stem}.txt"
        out.write_text(article["text"].strip() + "\n", encoding="utf-8")
        saved.append({
            "name": out.name,
            "number": number,
            "date": article["date"],
        })

    return {
        "ok": True,
        "count": len(saved),
        "doc_id": doc_id,
        "folder": str(user_dir),
        "files": saved,
    }


@app.get("/articles/file/{doc_id}/{name}")
def get_exported_article_file(
    doc_id: str,
    name: str,
    user: str = Depends(get_current_user),
):
    safe_doc_id = Path(doc_id).name
    safe_name = Path(name).name
    path = ARTICLES_DIR / user / safe_doc_id / safe_name
    if not path.exists() or path.suffix.lower() != ".txt":
        raise HTTPException(status_code=404, detail="Fișierul exportat nu a fost găsit.")
    return FileResponse(path, media_type="text/plain; charset=utf-8", filename=path.name)


@app.post("/text/cleanup")
async def cleanup_text(
    request: Request,
    user: str = Depends(get_current_user),
):
    _ = user
    payload = await request.json()
    raw_text = str(payload.get("text") or "")
    return {"text": _cleanup_editorial_text(raw_text)}


@app.get("/sources/doc/{doc_id}")
def get_filter_doc(doc_id: str, user: str = Depends(get_current_user)):
    safe = _safe_name(doc_id)
    path = FILTER_DOCS_DIR / user / f"{safe}.txt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Document TXT inexistent")
    text = path.read_text(encoding="utf-8")
    return {"doc_id": safe, "text": text}


@app.get("/health")
def health():
    return {"ok": True}

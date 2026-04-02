# OmniScan

OmniScan is a web-based document digitization workspace that combines PDF viewing, OCR, annotation, text correction, and export workflows in one place. It is optimized for scanned books and archival documents, with selection-based OCR, tagging, and structured exports.

## Features
- PDF viewer with navigation, rotation, zoom, selection, and scan-page workflows
- OCR (Google Vision + local OCR options)
- Rich text editing with tagging (labels) and color highlights
- Export to TXT, JSON, and PDF with hidden OCR layer
- Bulk TXT import and document management
- Dedicated filtering interface for tagged content
- Multi-user authentication (admin + per-user file visibility)

## Project Structure
```
webapp/
  backend/        # FastAPI backend
  frontend/       # Static frontend (HTML/CSS/JS)
  data/           # App data (uploads, exports) - NOT versioned
  docker-compose.yml
  Dockerfile
```

## Local Run (Docker)
1. Create a `.env` file in the project root (see `.env.example`).
2. (Optional) Place your Google OCR key as `ocr-key.json` in the project root.
3. Build and run:
```
docker compose up --build
```
4. Open:
```
http://localhost:8050
```

## Local Run (Python)
If you want to run without Docker:
```
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8050
```
Then open:
```
http://localhost:8050
```

## Google OCR Setup
OmniScan can use Google Cloud Vision OCR. You need a service account JSON key.
- Put the file at the project root as `ocr-key.json` (or mount it into the container).
- Set `GOOGLE_APPLICATION_CREDENTIALS` to the path inside the container.

Example with Docker secrets (recommended):
```
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp_key.json
```

## Security Notes
Do **NOT** commit:
- `ocr-key.json`
- `.env`
- `data/` folder
- any PDF/TXT/JSON exported content

The `.gitignore` is configured to prevent accidental upload of these files.

## Deployment
You can expose the app using Cloudflare Tunnel or any reverse proxy. Make sure the backend is reachable on the configured port (default `8050`).

---

Made with care for large-scale digitization workflows.

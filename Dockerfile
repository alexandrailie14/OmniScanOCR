FROM python:3.11
WORKDIR /app
COPY backend/requirements.txt /app/
RUN apt-get update -o Acquire::Retries=3 && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ron \
    tesseract-ocr-fra \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ /app/
COPY frontend/ /app/frontend/
ENV FRONTEND_DIR=/app/frontend
ENV IMG_OCR_WORKBENCH_DIR=/opt/pdf-ocr-workbench
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

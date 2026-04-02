FROM python:3.11
WORKDIR /app
COPY webapp/backend/requirements.txt /app/
RUN apt-get update -o Acquire::Retries=3 && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-ron \
    tesseract-ocr-fra \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
COPY webapp/backend/ /app/
COPY webapp/frontend/ /app/frontend/
COPY pdf-ocr-workbench/ /app/pdf-ocr-workbench/
ENV FRONTEND_DIR=/app/frontend
ENV IMG_OCR_WORKBENCH_DIR=/app/pdf-ocr-workbench
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

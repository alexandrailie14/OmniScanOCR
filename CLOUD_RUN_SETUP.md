# Deploy pe Google Cloud Run

## 1. Setează proiectul și autentificarea

```bash
gcloud auth login
gcloud config set project PROJECT_ID
```

Dacă nu ai proiect setat acum, poți verifica:

```bash
gcloud config list
```

## 2. Activează serviciile necesare

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 3. Creează un bucket pentru `/data`

Acest bucket va înlocui storage-ul local folosit acum de aplicație.

```bash
gcloud storage buckets create gs://BUCKET_NAME --location=REGION
```

## 4. Dă acces serviciului Cloud Run la bucket

După primul deploy, Cloud Run folosește implicit service account-ul Compute Engine default:

```bash
PROJECT_NUMBER="$(gcloud projects describe PROJECT_ID --format='value(projectNumber)')"
gcloud storage buckets add-iam-policy-binding gs://BUCKET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## 5. Rulează deploy-ul

```bash
cd "/Users/aliceilie/Documents/New project/webapp"
chmod +x deploy-cloudrun.sh

export GCP_PROJECT_ID="PROJECT_ID"
export GCP_REGION="europe-west3"
export GCP_SERVICE="studio-manuscrise"
export GCP_BUCKET="BUCKET_NAME"

./deploy-cloudrun.sh
```

## 6. Leagă domeniul

Google recomandă un **global external Application Load Balancer** în fața Cloud Run pentru custom domains:

- Cloud Run custom domains: https://cloud.google.com/run/docs/mapping-custom-domains?hl=en

Poți începe simplu cu URL-ul generat de Cloud Run și apoi să legi:

- `ailie.uk`
- sau un subpath/subdomeniu pentru `studio-manuscrise`

## Note pentru aplicația ta

- Cloud Run are request timeout de maxim 60 minute:
  https://cloud.google.com/run/docs/configuring/request-timeout
- Pentru OCR pe documente foarte mari, pe termen lung s-ar putea să separi UI-ul de joburile lungi.
- Bucket-ul montat la `/data` îți permite să păstrezi structura actuală a aplicației fără rescriere majoră imediată.

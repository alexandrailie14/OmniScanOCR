#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

: "${GCP_PROJECT_ID:?Setează GCP_PROJECT_ID}"
: "${GCP_REGION:?Setează GCP_REGION, de exemplu europe-west3}"
: "${GCP_SERVICE:?Setează GCP_SERVICE, de exemplu studio-manuscrise}"
: "${GCP_BUCKET:?Setează GCP_BUCKET, bucket-ul montat la /data}"

IMAGE_URI="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/cloud-run-source-deploy/${GCP_SERVICE}:$(date +%Y%m%d-%H%M%S)"

cd "$ROOT_DIR"

echo "Build image: $IMAGE_URI"
gcloud builds submit . \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --config=webapp/cloudbuild.cloudrun.yaml \
  --substitutions="_IMAGE_URI=${IMAGE_URI}"

echo "Deploy Cloud Run service: $GCP_SERVICE"
gcloud run deploy "$GCP_SERVICE" \
  --project="$GCP_PROJECT_ID" \
  --region="$GCP_REGION" \
  --image="$IMAGE_URI" \
  --allow-unauthenticated \
  --timeout=3600 \
  --memory=2Gi \
  --cpu=2 \
  --execution-environment=gen2 \
  --set-env-vars="ADMIN_USER=admin,ADMIN_PASS=admin123,SECRET_KEY=change-me" \
  --add-volume="name=data-volume,type=cloud-storage,bucket=${GCP_BUCKET}" \
  --add-volume-mount="volume=data-volume,mount-path=/data"

echo ""
echo "Deploy terminat."
echo "Urmează să mapezi domeniul către serviciu."

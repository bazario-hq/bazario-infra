#!/bin/sh
# Generate the dataset for an environment: reset the database, run migrations,
# load deterministic seed data, upload product photos and write the load
# generator manifest (loadgen/data/manifest.$ENV.json).
#
# Usage: ENV=prod-sim ./scripts/seed.sh            full dataset (destroys existing data)
#        ENV=prod-sim STEP=1 ./scripts/seed.sh     growth step 1 on top of existing data
#        ENV=staging SEED_ARGS=--images-only ./scripts/seed.sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/_common.sh

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (run: make env ENV=$ENV)" >&2; exit 1; }
set -a; . "./$ENV_FILE"; set +a

SIZE="${SIZE:-$ENV}"
STEP="${STEP:-}"
mkdir -p loadgen/data

echo "Starting backing services for ${ENV}"
compose up -d --wait postgres seaweedfs
compose up seaweedfs-init
compose build api

if [ -n "$STEP" ]; then MODE="--grow=${STEP}"; else MODE="--reset"; fi

# Run the seed straight against postgres and object storage (not through toxiproxy) and
# outside the api container's CPU/memory caps, so it finishes in minutes.
started=$(date +%s)
docker run --rm \
  --network "${COMPOSE_PROJECT_NAME}_default" \
  --user "$(id -u):$(id -g)" \
  -v "$(pwd)/loadgen/data:/seed-out" \
  -e NODE_ENV=production \
  -e LOG_LEVEL=warn \
  -e "DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -e S3_ENDPOINT=http://seaweedfs:8333 \
  -e "S3_ACCESS_KEY=${S3_ACCESS_KEY}" \
  -e "S3_SECRET_KEY=${S3_SECRET_KEY}" \
  -e "S3_BUCKET=${S3_BUCKET}" \
  -e S3_FORCE_PATH_STYLE=true \
  "bazario-api:${API_TAG}" \
  node dist/seed/index.js --size="$SIZE" $MODE --manifest="/seed-out/manifest.${ENV}.json" ${SEED_ARGS:-}

echo "Seeded ${ENV} (${SIZE}) in $(( ($(date +%s) - started) / 60 )) min"

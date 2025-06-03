#!/bin/sh
# Save or restore an environment's database, so QA can reset staging to a known
# dataset between test runs. Product photos are not included: they are
# regenerated deterministically (make seed SEED_ARGS=--images-only).
#
# Usage: ENV=staging ./scripts/snapshot.sh save [file]
#        ENV=staging ./scripts/snapshot.sh restore file
set -eu
cd "$(dirname "$0")/.."
. ./scripts/_common.sh

[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (run: make env ENV=$ENV)" >&2; exit 1; }
set -a; . "./$ENV_FILE"; set +a
mkdir -p snapshots

ACTION="${1:-save}"
FILE="${2:-snapshots/${ENV}-$(date -u +%Y%m%d-%H%M).dump}"

case "$ACTION" in
  save)
    compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -Z 6 > "$FILE"
    echo "Saved ${FILE} ($(du -h "$FILE" | cut -f1))"
    cp "loadgen/data/manifest.${ENV}.json" "${FILE%.dump}.manifest.json" 2>/dev/null || true
    ;;
  restore)
    [ -f "$FILE" ] || { echo "No such snapshot: $FILE" >&2; exit 1; }
    echo "Restoring ${FILE} into ${ENV} (the api is stopped while this runs)"
    compose stop api >/dev/null 2>&1 || true
    compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q -c 'drop schema public cascade; create schema public;'
    compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner < "$FILE"
    [ -f "${FILE%.dump}.manifest.json" ] && cp "${FILE%.dump}.manifest.json" "loadgen/data/manifest.${ENV}.json"
    compose up -d api
    echo "Restored ${FILE}"
    ;;
  *)
    echo "Usage: ENV=staging $0 save|restore [file]" >&2
    exit 2
    ;;
esac

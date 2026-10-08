#!/bin/sh
# Return an environment to the previously deployed tag.
# Migrations are forward-only and are not reversed.
# Usage: ENV=staging ./scripts/rollback.sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/_common.sh

[ -s "$HISTORY" ] || { echo "No previous deploy recorded for ${ENV}" >&2; exit 1; }

PREVIOUS="$(tail -n 1 "$HISTORY")"
sed -i.bak '$d' "$HISTORY" && rm -f "${HISTORY}.bak"

echo "Rolling ${ENV} back to ${PREVIOUS}"
set_tag "$PREVIOUS"
compose up -d --build api web
echo "Rolled back to ${PREVIOUS}."

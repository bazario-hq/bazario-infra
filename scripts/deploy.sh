#!/bin/sh
# Deploy a tag to an environment: build, run pending migrations, restart.
# Usage: ENV=staging TAG=<sha> ./scripts/deploy.sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/_common.sh

TAG="${TAG:-}"
[ -n "$TAG" ] || { echo "TAG is required (the commit SHA to deploy)" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE (run: make env ENV=$ENV)" >&2; exit 1; }

PREVIOUS="$(current_tag)"
echo "Deploying ${TAG} to ${ENV} (was ${PREVIOUS})"

set_tag "$TAG"
compose build api web

echo "Running pending migrations"
compose up -d postgres toxiproxy seaweedfs seaweedfs-init
compose run --rm --no-deps api node dist/migrate.js

echo "Restarting application containers"
compose up -d api web

echo "$PREVIOUS" >> "$HISTORY"
echo "Deployed ${TAG}. Watch the dashboards for 15 minutes."

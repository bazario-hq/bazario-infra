#!/bin/sh
# Shared helpers for deploy scripts.
set -eu

ENV="${ENV:-dev}"
ENV_FILE="env/${ENV}.env"
STATE_DIR=".deploy"
# shellcheck disable=SC2034  # used by deploy.sh and rollback.sh
HISTORY="${STATE_DIR}/${ENV}.history"

mkdir -p "$STATE_DIR"

if [ "$ENV" = "dev" ]; then
  FILES="-f compose/base.yml -f compose/dev.yml"
else
  FILES="-f compose/base.yml -f compose/${ENV}.yml -f compose/limits.yml"
fi

compose() {
  docker compose --env-file "$ENV_FILE" $FILES --profile app --profile monitoring "$@"
}

set_tag() {
  if grep -q '^API_TAG=' "$ENV_FILE"; then
    sed -i.bak "s/^API_TAG=.*/API_TAG=$1/; s/^WEB_TAG=.*/WEB_TAG=$1/" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
  else
    printf 'API_TAG=%s\nWEB_TAG=%s\n' "$1" "$1" >> "$ENV_FILE"
  fi
}

current_tag() {
  grep '^API_TAG=' "$ENV_FILE" | cut -d= -f2
}

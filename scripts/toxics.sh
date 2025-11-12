#!/bin/sh
# Add latency (ms) to the api -> postgres and api -> object storage (s3) hops via Toxiproxy.
# Usage: ENV=staging ./scripts/toxics.sh 20
set -eu
cd "$(dirname "$0")/.."
ENV="${ENV:-dev}"
MS="${1:-20}"
PORT="$(grep '^TOXIPROXY_API_PORT=' "env/${ENV}.env" | cut -d= -f2)"

for proxy in postgres s3; do
  curl -fsS -X POST "http://localhost:${PORT}/proxies/${proxy}/toxics" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"latency\",\"type\":\"latency\",\"stream\":\"downstream\",\"attributes\":{\"latency\":${MS},\"jitter\":$((MS / 4))}}" \
    >/dev/null || curl -fsS -X POST "http://localhost:${PORT}/proxies/${proxy}/toxics/latency" \
    -H 'Content-Type: application/json' \
    -d "{\"attributes\":{\"latency\":${MS},\"jitter\":$((MS / 4))}}" >/dev/null
  echo "${proxy}: ${MS}ms latency"
done

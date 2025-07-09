# Runbook: ApiHighErrorRate / ApiDown

`ApiHighErrorRate` fires when more than 2 % of requests return 5xx for 5 minutes. `ApiDown` fires when Prometheus cannot scrape the API for a minute.

## Look first

1. `make ps ENV=<env>`: is the `api` container running and healthy? A restart loop means the process is crashing at start-up (usually configuration or a failed migration).
2. `make logs ENV=<env> SERVICE=api`: group errors by message. One message is a code path; many different ones usually mean a dependency.
3. Dependencies: Postgres reachable (`make psql`), object storage (see `object-storage.md`), Toxiproxy toxics left over from a test (`curl localhost:<TOXIPROXY_API_PORT>/proxies`).
4. Recent deploy? Compare the first error timestamp with `.deploy/<env>.history`.

## Mitigate

- Roll back with `make rollback ENV=<env>` when the errors start at a deploy.
- Remove stray toxics with `make latency MS=0 ENV=<env>`.
- Migrations are forward-only; a rollback does not undo them.

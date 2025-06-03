# bazario-infra

Docker Compose environments, monitoring, load generator and deploy scripts for Bazario.

| Environment | Purpose | Limits |
| --- | --- | --- |
| `dev` | Daily work, hot reload, small data | none |
| `staging` | QA verification after merge | same as prod-sim |
| `prod-sim` | Simulated production with monitoring and synthetic traffic | fixed CPU and memory caps |

## Quick start

    make env ENV=dev        # creates env/dev.env from the example
    make up ENV=dev         # postgres, minio, toxiproxy, mailpit
    make up-app ENV=dev     # adds the api and web (needs the sibling repos checked out next to this one)

The api and web images build from `../bazario-api` and `../bazario-web`, so clone all three repos side by side.

Monitoring (Prometheus, Grafana, Loki, postgres-exporter, cAdvisor) starts automatically for `staging` and `prod-sim`. For dev, add `MONITORING=1`.

## Ports

| Service | dev | staging | prod-sim |
| --- | --- | --- | --- |
| API | 3000 | 3100 | 3200 |
| Web | 5173 | 8080 | 8180 |
| Postgres | 5432 | 5433 | 5434 |
| Grafana | 3001 | 3101 | 3201 |
| Prometheus | 9090 | 9190 | 9290 |
| MinIO console | 9001 | 9101 | 9201 |
| Mailpit | 8025 | 8125 | 8225 |

## Data

Each environment gets a generated dataset (deterministic, so every copy of staging looks the same):

    make seed ENV=dev          # ~1 min
    make seed ENV=staging      # ~5 min, mostly product photos
    make seed ENV=prod-sim     # see below

`make seed` resets the database, runs migrations, loads the data, uploads generated product photos to MinIO and writes `loadgen/data/manifest.<env>.json` for the load generator. It needs the API image, so it builds it first. `make grow ENV=prod-sim STEP=1` adds a growth step (more buyers, products and recent orders) on top of the existing data.

prod-sim is large (hundreds of thousands of products, millions of orders, reviews and notifications). Plan for roughly 15-30 minutes and about 7 GB of disk (database plus photos) on a laptop.

To reset staging to a known state between QA runs:

    make snapshot ENV=staging                    # saves snapshots/staging-<time>.dump
    make restore ENV=staging FILE=snapshots/staging-<time>.dump

Every seeded account uses the password `bazario-demo` (staff: `admin@bazario.example`, `ops@bazario.example`, `trust@bazario.example`).

## Synthetic traffic

    make load ENV=prod-sim                         # continuous, shaped like a real day
    make load ENV=staging LOAD_SCENARIO=smoke      # quick end-to-end check

See [loadgen/README.md](loadgen/README.md) for the scenarios and the traffic model.

## Deploying

    make deploy ENV=staging TAG=<commit sha>
    make rollback ENV=staging

Deploys run pending migrations before restarting the application. Migrations are forward-only, so a rollback restores the previous images but does not reverse them.

## Layout

    compose/      base services plus per-environment overrides and shared limits
    env/          checked-in .env.example per environment
    postgres/     server config and init scripts
    monitoring/   Prometheus, Grafana, Loki and Promtail configuration
    toxiproxy/    proxies between the api and its dependencies
    loadgen/      k6 scenarios and the traffic model
    scripts/      deploy, rollback, seed, snapshot and network-latency helpers
    docs/         ADRs and runbooks

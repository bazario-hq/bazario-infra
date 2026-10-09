# bazario-infra

Docker Compose environments, monitoring, the load generator and deploy scripts for Bazario.

| Environment | Purpose | Limits |
| --- | --- | --- |
| `dev` | Daily work, hot reload, small data | none |
| `staging` | QA verification after merge | same as prod-sim |
| `prod-sim` | Simulated production with monitoring and synthetic traffic | fixed CPU and memory caps |

## Quick start

    make env ENV=dev        # creates env/dev.env from the example
    make up ENV=dev         # postgres, seaweedfs (S3), toxiproxy, mailpit
    make up-app ENV=dev     # adds the api and web (needs the sibling repos checked out next to this one)

The api and web images build from `../bazario-api` and `../bazario-web`, so clone all three repos side by side.

Monitoring (Prometheus, Grafana, Loki, postgres-exporter, cAdvisor) starts automatically for `staging` and `prod-sim`. For dev, add `MONITORING=1`.

## Object storage

Product images live in [SeaweedFS](https://github.com/seaweedfs/seaweedfs), run as a single node with its S3 gateway enabled (`seaweedfs/start.sh`). The API talks to it through Toxiproxy with the AWS SDK (path-style), using the `S3_*` values from the env file; `seaweedfs-init` creates the bucket. The image is pinned by version and digest in `compose/base.yml`; bump both together. We moved here from MinIO after its container images stopped being published (see `docs/adr/0001-object-storage.md`).

## Ports

| Service | dev | staging | prod-sim |
| --- | --- | --- | --- |
| API | 3000 | 3100 | 3200 |
| Web | 5173 | 8080 | 8180 |
| Postgres | 5432 | 5433 | 5434 |
| Grafana | 3001 | 3101 | 3201 |
| Prometheus | 9090 | 9190 | 9290 |
| S3 (SeaweedFS) | 9000 | 9100 | 9200 |
| SeaweedFS file browser | 9001 | 9101 | 9201 |
| Mailpit | 8025 | 8125 | 8225 |

## Data

Each environment gets a generated dataset (deterministic, so every copy of staging looks the same):

    make seed ENV=dev          # ~1 min
    make seed ENV=staging      # ~5 min, mostly product photos
    make seed ENV=prod-sim     # see below

`make seed` resets the database, runs migrations, loads the data, uploads generated product photos to object storage and writes `loadgen/data/manifest.<env>.json` for the load generator. It needs the API image, so it builds it first. `make grow ENV=prod-sim STEP=1` adds a growth step (more buyers, products and recent orders) on top of the existing data.

prod-sim is large (hundreds of thousands of products, millions of orders, reviews and notifications). Plan for roughly 10-20 minutes (plus the first API image build) and about 7 GB of disk: a 5 GB database plus about 1 GB of photos, with headroom for WAL while it loads.

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
    seaweedfs/    object storage start-up and bucket init
    monitoring/   Prometheus, Grafana, Loki and Promtail configuration
    toxiproxy/    proxies between the api and its dependencies
    loadgen/      k6 scenarios and the traffic model
    scripts/      deploy, rollback, seed, snapshot and network-latency helpers
    docs/         ADRs and runbooks

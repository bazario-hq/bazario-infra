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
    loadgen/      k6 scenarios
    scripts/      deploy, rollback and network-latency helpers
    docs/         ADRs and runbooks

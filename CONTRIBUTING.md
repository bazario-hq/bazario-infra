# Contributing

- Branch names: `chore/BZR-123-short-name`, `fix/...`, `feat/...`, `perf/...`
- Commits follow Conventional Commits, e.g. `perf(orders): batch product lookups`.
- Open a pull request against `main` using the template. `main` needs one approving review from the tech lead and green CI.
- Run `make validate` before pushing compose or env changes.
- Shell scripts are checked with `shellcheck`; k6 scenarios must pass `k6 inspect`.
- Architectural changes (a new service, a queue, a cache layer) need an ADR in `docs/adr/` (copy `0000-template.md`).
- Every alert has a runbook in `docs/runbooks/`. Update it when you change the alert.

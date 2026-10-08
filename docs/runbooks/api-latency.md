# Runbook: ApiHighLatencyP95

Fires when API p95 latency stays above 1 s for 5 minutes (`http_request_duration_seconds_bucket`).

## Look first

1. Open the **Bazario overview** dashboard. The *Latency (p95)* panel shows the same series the alert uses; *API request rate* tells you whether traffic changed.
2. Was there a deploy in the last hour? `cat .deploy/<env>.history` lists tags in order. If latency stepped up at deploy time, roll back with `make rollback ENV=<env>` and investigate afterwards.
3. Is it one route or all of them? Group the histogram by `route` in Grafana Explore.
4. Tail the API: `make tail ENV=<env>` and look for slow-request lines and errors.
5. Check the dependencies: Postgres connections panel, container memory, and the object storage runbook if only `/images/*` is slow.

## Mitigate

- Roll back if a deploy lines up with the change.
- If load is the trigger (a marketing push, a k6 run you forgot), say so in the incident issue before doing anything else.
- Do not restart containers just to see if it helps; capture logs and the dashboard first.

## Afterwards

Write a postmortem in `docs/postmortems/` using the template in the Incident issue form.

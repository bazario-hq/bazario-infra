# Runbook: PostgresCpuHigh

Fires when the Postgres container uses more than 90% of its CPU limit for 10 minutes (cAdvisor `container_cpu_usage_seconds_total` against the container's CPU quota). Not active in `dev`, which has no limits.

## Look first

1. *Container CPU (% of limit)* panel on the **Bazario overview** dashboard: only Postgres, or the API too? Compare with *API request rate*: did traffic change?
2. What is running right now?

       make psql ENV=<env>
       select pid, now() - query_start as age, state, wait_event_type, left(query, 100)
         from pg_stat_activity where state <> 'idle' order by age desc;

3. Which statements cost the most over time? Query statistics views give totals per statement if they are enabled in the database you are looking at.
4. Was there a deploy or a migration in the last hour?

## Mitigate

- A single runaway query can be cancelled with `select pg_cancel_backend(<pid>)`; note the query text in the incident issue first.
- Scaling the container's CPU limit changes the comparison baseline for every environment; agree it with the tech lead before doing it.

## Afterwards

Write a postmortem in `docs/postmortems/` using the template in the Incident issue form.

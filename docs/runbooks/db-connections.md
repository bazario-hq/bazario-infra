# Runbook: PostgresConnectionsHigh

Fires when `pg_stat_activity_count` summed over all states is above 80 for 5 minutes (server limit: `max_connections` in `postgres/postgresql.conf`).

## Look first

1. *Postgres connections* panel on the **Bazario overview** dashboard: is it a step, a ramp or a spike?
2. Who holds the connections?

       make psql ENV=<env>
       select application_name, state, count(*) from pg_stat_activity group by 1, 2 order by 3 desc;

3. Anything sitting `idle in transaction` or running for minutes: `select pid, now() - query_start as age, state, left(query, 80) from pg_stat_activity where state <> 'idle' order by age desc;`
4. Did the API restart or deploy recently? Connections are created per process.

## Mitigate

- Fix the cause before touching limits; raising `max_connections` moves the problem and costs memory.
- Terminating a stuck session (`select pg_terminate_backend(<pid>)`) is acceptable in prod-sim if you note the query in the incident issue.

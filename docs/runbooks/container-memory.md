# Runbook: ContainerMemoryNearLimit

Fires when a container's working set is above 90 % of its limit for 10 minutes. Limits live in `compose/limits.yml` and are the same for staging and prod-sim so results stay comparable.

1. Which container? The alert carries the `name` label.
2. Is it flat or climbing? Open *Container memory* on the **Bazario overview** dashboard and look at the last 6 hours.
3. A container that sits at 90 % and stays flat is sized wrong; one that climbs is a different problem. Do not change the limits to quiet the alert without agreeing it in the incident issue.
4. If a container was OOM-killed, `docker inspect <name> --format '{{.State.OOMKilled}}'` says so.

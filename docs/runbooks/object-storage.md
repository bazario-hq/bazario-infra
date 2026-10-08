# Runbook: object storage (SeaweedFS)

Product images are read from SeaweedFS's S3 gateway by the API (`/images/*`).

## Symptoms

- `/images/*` returns 5xx or hangs; product cards show the placeholder.
- API logs mention `NoSuchKey`, `ECONNREFUSED` or timeouts towards `toxiproxy:19000`.

## Checks

1. Is it up? `make ps ENV=<env>` and look at `seaweedfs` health. `curl -s localhost:<S3_PORT>/healthz` should return 200.
2. Is Toxiproxy adding faults? `curl -s localhost:<TOXIPROXY_API_PORT>/proxies/s3/toxics` should be `[]` outside a test.
3. Does the object exist? Browse `http://localhost:<S3_BROWSER_PORT>/buckets/<S3_BUCKET>/`.
4. Disk: `docker compose ... exec seaweedfs df -h /data`.

## Mitigation

- Restart the store: `docker compose ... restart seaweedfs` (data persists in the `s3data` volume).
- Remove a leftover toxic: `curl -X DELETE localhost:<TOXIPROXY_API_PORT>/proxies/s3/toxics/<name>`.
- Missing seed photos: `make seed ENV=<env> SEED_ARGS=--images-only`.

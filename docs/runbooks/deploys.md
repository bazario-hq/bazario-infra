# Runbook: deploying and rolling back

    make deploy ENV=staging TAG=<commit sha>
    make rollback ENV=staging

Deploy order across repos matters when the API contract changes: ship the API first, then the web app.

1. `make deploy` builds the images for the tag, runs pending migrations, then restarts `api` and `web`.
2. Watch the **Bazario overview** dashboard for 15 minutes after a production deploy.
3. `make rollback` restores the previous tag and reverses the last migration, so check the migration notes in the PR before using it on a schema change.

The tag history for each environment is in `.deploy/<env>.history`.

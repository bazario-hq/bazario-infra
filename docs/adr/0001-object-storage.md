# ADR 0001: Object storage on SeaweedFS

- Status: accepted
- Deciders: platform team

## Context

Product images are stored in an S3-compatible object store. We ran MinIO in every environment, pinned to a 2024 release. MinIO stopped publishing container images: the pinned tags can no longer be pulled from Docker Hub or quay.io, so new laptops and CI could not start an environment.

The API uses the AWS SDK with path-style addressing and SigV4. We want a replacement that is actively maintained, ships official images we can pin, runs as a single container for local environments, and covers as much of the S3 API as possible so we are not boxed in later (the roadmap includes scale-out work).

## Options

| | SeaweedFS | Garage |
| --- | --- | --- |
| Official images, active releases | yes (`chrislusf/seaweedfs`) | yes (`dxflrs/garage`) |
| S3 API coverage | broad (multipart, copy, tagging, versioning, CORS, presigned URLs, per-identity bucket permissions) | core API; no ACLs or bucket policies, no versioning |
| Single-container setup | `weed server -s3` | needs a layout/key bootstrap step |

## Decision

SeaweedFS, single node (`weed server -s3`), image pinned by version and digest. Credentials come from the env file (`S3_ACCESS_KEY`, `S3_SECRET_KEY`); the bucket is created by `seaweedfs-init`. Before switching we ran the API's storage calls and the integration flow (upload, variants, `/images/*`) against it.

## Consequences

- Env files use `S3_*` names instead of `MINIO_*`; the Toxiproxy proxy is called `s3`.
- S3 identities and their permissions live in `seaweedfs/start.sh`.
- Existing MinIO volumes are not migrated; regenerate data with `make seed`.

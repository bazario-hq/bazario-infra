#!/bin/sh
# Single-node SeaweedFS (master, volume, filer and S3 gateway in one process).
# The S3 identity comes from the environment so each env file can set its own.
set -eu
cat > /tmp/s3.json <<JSON
{
  "identities": [
    {
      "name": "bazario",
      "credentials": [{ "accessKey": "${S3_ACCESS_KEY}", "secretKey": "${S3_SECRET_KEY}" }],
      "actions": ["Admin", "Read", "List", "Tagging", "Write"]
    }
  ]
}
JSON
exec /entrypoint.sh server \
  -dir=/data \
  -ip.bind=0.0.0.0 \
  -master.volumeSizeLimitMB=1024 \
  -volume.max=0 \
  -s3 -s3.port=8333 -s3.config=/tmp/s3.json

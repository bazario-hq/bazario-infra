#!/bin/sh
# Creates the product image bucket (idempotent).
set -eu
if echo "s3.bucket.list" | weed shell -master=seaweedfs:9333 2>/dev/null | grep -qw "$S3_BUCKET"; then
  echo "bucket $S3_BUCKET exists"
else
  echo "s3.bucket.create -name $S3_BUCKET" | weed shell -master=seaweedfs:9333
fi

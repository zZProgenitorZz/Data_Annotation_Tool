# backend/core/check_aws.py
from backend.core.aws import s3, AWS_REGION, S3_BUCKET
import boto3
print("Region:", AWS_REGION, "Bucket:", S3_BUCKET)

sts = boto3.client("sts", region_name=AWS_REGION)
print("CallerIdentity:", sts.get_caller_identity())

# Check bucket is reachable (requires s3:ListBucket)
s3.list_objects_v2(Bucket=S3_BUCKET, MaxKeys=1)
print("S3 OK")

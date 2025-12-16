import os, boto3
from dotenv import load_dotenv, find_dotenv
from backend.config import settings

# Option A: auto-find the first .env upward from this file
load_dotenv(find_dotenv())

AWS_REGION = os.getenv("AWS_REGION", "eu-north-1")
S3_BUCKET = os.getenv("S3_BUCKET", "aidx-annotation-app-prod")
S3_PREFIX = os.getenv("S3_PREFIX", "images").strip("/")

session = boto3.session.Session(region_name = AWS_REGION)
s3 = session.client("s3")  # uses env creds or role

def s3_key(filename: str) -> str:
    # safe join for "uploads/yourfile.png"
    return f"{S3_PREFIX}/{filename.lstrip('/')}"
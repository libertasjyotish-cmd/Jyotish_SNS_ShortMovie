"""Publishes finished videos to Cloud Storage so the posting APIs can fetch them."""

import os

from google.cloud import storage


def upload(path: str, destination: str, content_type: str = "video/mp4") -> str:
    bucket_name = os.environ["GCS_BUCKET"]
    bucket = storage.Client().bucket(bucket_name)
    blob = bucket.blob(destination)
    blob.upload_from_filename(path, content_type=content_type)
    return f"https://storage.googleapis.com/{bucket_name}/{destination}"

"""
Storage Service — handles profile picture uploads.
Supports local filesystem (default) and S3-compatible storage.
"""
import os
import uuid
import aiofiles
from pathlib import Path
from app.config import get_settings

settings = get_settings()


def _get_upload_dir() -> Path:
    path = Path(settings.UPLOAD_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _ext_from_content_type(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    return mapping.get(content_type, ".jpg")


async def save_profile_picture(person_id: str, data: bytes, content_type: str) -> str:
    """
    Save a profile picture and return its public URL path.
    For local storage: /uploads/{person_id}/{uuid}.jpg
    """
    if settings.STORAGE_BACKEND == "s3":
        return await _save_to_s3(person_id, data, content_type)
    return await _save_local(person_id, data, content_type)


async def _save_local(person_id: str, data: bytes, content_type: str) -> str:
    ext = _ext_from_content_type(content_type)
    upload_dir = _get_upload_dir() / person_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = upload_dir / filename
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(data)
    return f"/uploads/{person_id}/{filename}"


async def _save_to_s3(person_id: str, data: bytes, content_type: str) -> str:
    import boto3
    from botocore.exceptions import BotoCoreError

    s3 = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )
    ext = _ext_from_content_type(content_type)
    key = f"profiles/{person_id}/{uuid.uuid4().hex}{ext}"
    s3.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    base = settings.S3_ENDPOINT_URL or f"https://{settings.S3_BUCKET_NAME}.s3.amazonaws.com"
    return f"{base}/{key}"


def delete_profile_picture(url: str) -> None:
    """Delete a local file by its URL path."""
    if not url or not url.startswith("/uploads/"):
        return
    upload_dir = Path(settings.UPLOAD_DIR)
    rel_path = url.lstrip("/uploads/")
    full_path = Path(settings.UPLOAD_DIR) / rel_path.lstrip("/")
    if full_path.exists():
        full_path.unlink(missing_ok=True)

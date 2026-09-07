"""Adapter API BEBOX untuk upload/download objek arsip."""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from models import CloudStorageSettings
from utils.cloud_storage.exceptions import CloudStorageError
from utils.cloud_storage.secrets import decrypt_secret


def _require_boto3():
    try:
        import boto3  # noqa: F401
        from botocore.config import Config  # noqa: F401
        from botocore.exceptions import BotoCoreError, ClientError  # noqa: F401
    except ImportError as exc:
        raise CloudStorageError(
            "Paket boto3 belum terpasang. Jalankan: pip install boto3"
        ) from exc
    return boto3, Config, ClientError, BotoCoreError


def _plain_secret(row: CloudStorageSettings) -> str:
    enc = (row.secret_access_key_enc or "").strip()
    if not enc:
        raise CloudStorageError("Secret access key belum disimpan.")
    try:
        return decrypt_secret(enc)
    except ValueError as exc:
        raise CloudStorageError(str(exc)) from exc


def build_client(row: CloudStorageSettings):
    boto3, Config, _ClientError, _BotoCoreError = _require_boto3()
    key_id = (row.access_key_id or "").strip()
    if not key_id:
        raise CloudStorageError("Access key belum diisi.")
    endpoint = (row.endpoint_url or "").strip() or None
    region = (row.region or "auto").strip() or "auto"
    kwargs: dict[str, Any] = {
        "service_name": "s3",
        "aws_access_key_id": key_id,
        "aws_secret_access_key": _plain_secret(row),
        "region_name": region,
    }
    if endpoint:
        kwargs["endpoint_url"] = endpoint
        kwargs["config"] = Config(s3={"addressing_style": "path"}, signature_version="s3v4")
    return boto3.client(**kwargs)


def _bucket(row: CloudStorageSettings) -> str:
    bucket = (row.bucket or "").strip()
    if not bucket:
        raise CloudStorageError("Nama bucket belum diisi.")
    return bucket


def test_connection(row: CloudStorageSettings) -> dict[str, Any]:
    boto3, Config, ClientError, BotoCoreError = _require_boto3()
    del boto3, Config
    try:
        client = build_client(row)
        bucket = _bucket(row)
        client.head_bucket(Bucket=bucket)
        return {
            "ok": True,
            "status": "ok",
            "provider": row.provider or "bebox",
            "bucket": bucket,
            "endpoint_url": (row.endpoint_url or "").strip() or None,
            "detail": "Koneksi berhasil (head_bucket).",
        }
    except CloudStorageError as exc:
        return {"ok": False, "status": "error", "detail": str(exc)}
    except (ClientError, BotoCoreError, OSError) as exc:
        return {"ok": False, "status": "error", "detail": str(exc)}


def upload_file(row: CloudStorageSettings, local: Path, remote_key: str) -> None:
    _boto3, _Config, ClientError, BotoCoreError = _require_boto3()
    try:
        client = build_client(row)
        client.upload_file(str(local), _bucket(row), remote_key)
    except CloudStorageError:
        raise
    except (ClientError, BotoCoreError, OSError) as exc:
        raise CloudStorageError(f"Upload gagal: {exc}") from exc


def download_file(row: CloudStorageSettings, remote_key: str, dest: Path) -> None:
    _boto3, _Config, ClientError, BotoCoreError = _require_boto3()
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        client = build_client(row)
        client.download_file(_bucket(row), remote_key, str(dest))
    except CloudStorageError:
        raise
    except (ClientError, BotoCoreError, OSError) as exc:
        raise CloudStorageError(f"Download gagal: {exc}") from exc


def head_object(row: CloudStorageSettings, remote_key: str) -> Optional[dict[str, Any]]:
    _boto3, _Config, ClientError, BotoCoreError = _require_boto3()
    try:
        client = build_client(row)
        return client.head_object(Bucket=_bucket(row), Key=remote_key)
    except CloudStorageError:
        raise
    except ClientError as exc:
        code = str((exc.response or {}).get("Error", {}).get("Code") or "")
        if code in {"404", "NoSuchKey", "NotFound"}:
            return None
        raise CloudStorageError(f"Head object gagal: {exc}") from exc
    except (BotoCoreError, OSError) as exc:
        raise CloudStorageError(f"Head object gagal: {exc}") from exc

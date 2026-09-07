"""Singleton CloudStorageSettings (satu baris, id=1)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from models import CloudStorageSettings, CloudStorageSettingsRead, CloudStorageSettingsUpdate
from utils.cloud_storage.policy import DEFAULT_MODULES, modules_to_str, parse_modules
from utils.cloud_storage.secrets import encrypt_secret, mask_secret, decrypt_secret


def get_or_create_settings(session: Session) -> CloudStorageSettings:
    row = session.get(CloudStorageSettings, 1)
    if row:
        return row
    row = session.exec(select(CloudStorageSettings).limit(1)).first()
    if row:
        return row
    row = CloudStorageSettings(
        id=1,
        enabled=False,
        provider="bebox",
        prefix="bps-jne/",
        hot_days=45,
        size_trigger_gb=100,
        keep_local_pivots=True,
        hydrate_cache_gb=5,
        modules=",".join(DEFAULT_MODULES),
        bytes_archived=0,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def settings_to_read(
    row: CloudStorageSettings,
    *,
    bytes_local_uploads: Optional[int] = None,
) -> CloudStorageSettingsRead:
    secret_set = bool((row.secret_access_key_enc or "").strip())
    masked = None
    if secret_set:
        try:
            masked = mask_secret(decrypt_secret(row.secret_access_key_enc or ""))
        except ValueError:
            masked = "••••"
    data = CloudStorageSettingsRead(
        enabled=bool(row.enabled),
        provider=(row.provider if row.provider and row.provider != "s3_compatible" else "bebox"),
        endpoint_url=row.endpoint_url,
        region=row.region,
        bucket=row.bucket,
        prefix=row.prefix or "bps-jne/",
        access_key_id=row.access_key_id,
        secret_access_key_masked=masked,
        secret_access_key_set=secret_set,
        hot_days=int(row.hot_days or 45),
        size_trigger_gb=int(row.size_trigger_gb or 100),
        keep_local_pivots=bool(row.keep_local_pivots),
        hydrate_cache_gb=int(row.hydrate_cache_gb or 5),
        modules=parse_modules(row.modules),
        last_run_at=row.last_run_at,
        last_error=row.last_error,
        bytes_archived=int(row.bytes_archived or 0),
        bytes_local_uploads=bytes_local_uploads,
        updated_at=row.updated_at,
        updated_by_email=row.updated_by_email,
    )
    return data


def apply_update(
    session: Session,
    row: CloudStorageSettings,
    payload: CloudStorageSettingsUpdate,
    *,
    updated_by_email: Optional[str] = None,
) -> CloudStorageSettings:
    if payload.enabled is not None:
        row.enabled = bool(payload.enabled)
    if payload.provider is not None:
        provider = (payload.provider or "").strip() or "bebox"
        row.provider = provider
    if payload.endpoint_url is not None:
        row.endpoint_url = (payload.endpoint_url or "").strip() or None
    if payload.region is not None:
        row.region = (payload.region or "").strip() or "auto"
    if payload.bucket is not None:
        row.bucket = (payload.bucket or "").strip() or None
    if payload.prefix is not None:
        prefix = (payload.prefix or "").strip() or "bps-jne/"
        if not prefix.endswith("/"):
            prefix += "/"
        row.prefix = prefix
    if payload.access_key_id is not None:
        row.access_key_id = (payload.access_key_id or "").strip() or None
    secret = payload.secret_access_key
    if secret is not None and str(secret).strip():
        row.secret_access_key_enc = encrypt_secret(str(secret).strip())
    if payload.hot_days is not None:
        row.hot_days = max(1, min(3650, int(payload.hot_days)))
    if payload.size_trigger_gb is not None:
        row.size_trigger_gb = max(1, min(100_000, int(payload.size_trigger_gb)))
    if payload.keep_local_pivots is not None:
        row.keep_local_pivots = bool(payload.keep_local_pivots)
    if payload.hydrate_cache_gb is not None:
        row.hydrate_cache_gb = max(1, min(500, int(payload.hydrate_cache_gb)))
    if payload.modules is not None:
        row.modules = modules_to_str(payload.modules)
    row.updated_at = datetime.utcnow()
    if updated_by_email is not None:
        row.updated_by_email = updated_by_email
    session.add(row)
    session.commit()
    session.refresh(row)
    return row

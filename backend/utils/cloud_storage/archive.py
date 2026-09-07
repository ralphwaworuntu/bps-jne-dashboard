"""Archive kandidat cold ke object storage lalu ganti file lokal dengan stub."""
from __future__ import annotations

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

from sqlmodel import Session

from database import engine
from models import CloudStorageSettings
from utils.cloud_storage.exceptions import CloudStorageError
from utils.cloud_storage.inventory import collect_inventory
from utils.cloud_storage.policy import remote_key_for
from utils.cloud_storage.s3_compatible import upload_file
from utils.cloud_storage.settings_store import get_or_create_settings
from utils.cloud_storage.stub import write_stub

ProgressCb = Callable[[str, int, str], None]


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _content_type(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".csv": "text/csv",
        ".json": "application/json",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".zip": "application/zip",
    }.get(suffix, "application/octet-stream")


def plan_archive(session: Optional[Session] = None) -> dict[str, Any]:
    own = session is None
    if own:
        session = Session(engine)
    try:
        row = get_or_create_settings(session)
        inv = collect_inventory(row)
        inv["enabled"] = bool(row.enabled)
        inv["dry_run"] = True
        return inv
    finally:
        if own:
            session.close()


def run_archive(
    *,
    report: Optional[ProgressCb] = None,
    session: Optional[Session] = None,
) -> dict[str, Any]:
    def _report(stage: str, percent: int, message: str) -> None:
        if report:
            report(stage, percent, message)

    own = session is None
    if own:
        session = Session(engine)
    assert session is not None
    archived = 0
    archived_bytes = 0
    errors: list[str] = []
    try:
        row = get_or_create_settings(session)
        if not row.enabled:
            raise CloudStorageError("API penyimpanan belum diaktifkan.")
        if not (row.bucket or "").strip() or not (row.access_key_id or "").strip():
            raise CloudStorageError("Endpoint / bucket / access key belum lengkap.")

        _report("scanning", 5, "Memindai kandidat cold…")
        inv = collect_inventory(row)
        # Ambil ulang path penuh dari preview + sisanya dengan scan kedua via inventory candidates
        # Inventory hanya mengembalikan 80 preview; archive semua kandidat lewat scan ulang.
        from utils.cloud_storage.inventory import _iter_module_files
        from utils.cloud_storage.policy import (
            is_archiveable_file,
            is_cold_by_age,
            parse_modules,
        )
        from utils.cloud_storage.stub import has_stub, is_stub_path

        modules = parse_modules(row.modules)
        keep_pivots = bool(row.keep_local_pivots)
        hot_days = int(row.hot_days or 45)
        targets: list[Path] = []
        for module in modules:
            for path in _iter_module_files(module):
                if is_stub_path(path) or has_stub(path):
                    continue
                if not is_archiveable_file(path, keep_local_pivots=keep_pivots):
                    continue
                if not is_cold_by_age(path, hot_days):
                    continue
                targets.append(path)

        total = len(targets)
        if total == 0:
            row.last_run_at = datetime.utcnow()
            row.last_error = None
            session.add(row)
            session.commit()
            _report("done", 100, "Tidak ada kandidat yang perlu diarsipkan.")
            return {
                "archived": 0,
                "archived_bytes": 0,
                "skipped": 0,
                "errors": [],
                "candidate_count": inv.get("candidate_count") or 0,
            }

        for idx, path in enumerate(targets, start=1):
            pct = 10 + int(80 * idx / total)
            _report("uploading", pct, f"Mengunggah {path.name} ({idx}/{total})…")
            try:
                size = int(path.stat().st_size)
                digest = _sha256(path)
                key = remote_key_for(path, row.prefix or "bps-jne/")
                upload_file(row, path, key)
                write_stub(
                    path,
                    remote_key=key,
                    bytes_len=size,
                    sha256=digest,
                    content_type=_content_type(path),
                )
                path.unlink()
                archived += 1
                archived_bytes += size
            except Exception as exc:
                errors.append(f"{path.name}: {exc}")

        row.last_run_at = datetime.utcnow()
        row.last_error = ("; ".join(errors)[:2000] if errors else None)
        row.bytes_archived = int(row.bytes_archived or 0) + archived_bytes
        session.add(row)
        session.commit()
        _report("done", 100, f"Selesai: {archived} file diarsipkan.")
        return {
            "archived": archived,
            "archived_bytes": archived_bytes,
            "errors": errors,
            "candidate_count": total,
        }
    except Exception as exc:
        try:
            row = get_or_create_settings(session)
            row.last_error = str(exc)[:2000]
            session.add(row)
            session.commit()
        except Exception:
            pass
        raise
    finally:
        if own:
            session.close()

"""Scan uploads/ untuk inventori + kandidat archive (dry-run)."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from models import CloudStorageSettings
from utils.cloud_storage.policy import (
    SKIP_DIR_NAMES,
    UPLOADS_ROOT,
    file_age_days,
    is_archiveable_file,
    is_cold_by_age,
    parse_modules,
    remote_key_for,
)
from utils.cloud_storage.stub import has_stub, is_stub_path
from utils.sys_performance import _dir_size_bytes, _uploads_freshness


def _iter_module_files(module: str, *, max_files: int = 8_000):
    root = UPLOADS_ROOT / module
    if not root.is_dir():
        return
    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIR_NAMES and not d.startswith(".")]
        for name in filenames:
            if count >= max_files:
                return
            yield Path(dirpath) / name
            count += 1


def collect_inventory(row: CloudStorageSettings) -> dict[str, Any]:
    freshness = _uploads_freshness()
    total_bytes = int(freshness.get("total_bytes") or 0)
    sized_files = int(freshness.get("sized_files") or 0)
    size_trigger_bytes = int(row.size_trigger_gb or 100) * 1024 * 1024 * 1024
    size_trigger_hit = total_bytes >= size_trigger_bytes
    modules = parse_modules(row.modules)
    keep_pivots = bool(row.keep_local_pivots)
    hot_days = int(row.hot_days or 45)
    now = datetime.now(timezone.utc)

    candidates: list[dict[str, Any]] = []
    already_cold = 0
    scanned = 0
    for module in modules:
        for path in _iter_module_files(module):
            scanned += 1
            if is_stub_path(path):
                already_cold += 1
                continue
            if not is_archiveable_file(path, keep_local_pivots=keep_pivots):
                continue
            if has_stub(path):
                already_cold += 1
                continue
            if not is_cold_by_age(path, hot_days, now):
                continue
            try:
                size = int(path.stat().st_size)
            except OSError:
                continue
            age = file_age_days(path, now) or 0.0
            try:
                rel = path.resolve().relative_to(UPLOADS_ROOT.resolve()).as_posix()
            except ValueError:
                rel = path.name
            candidates.append(
                {
                    "path": rel,
                    "module": module,
                    "bytes": size,
                    "age_days": round(age, 1),
                    "remote_key": remote_key_for(path, row.prefix or "bps-jne/"),
                }
            )

    candidates.sort(key=lambda x: (-int(x["bytes"]), -float(x["age_days"])))
    preview = candidates[:80]
    candidate_bytes = sum(int(c["bytes"]) for c in candidates)
    should_run = bool(candidates) or size_trigger_hit

    return {
        "uploads_total_bytes": total_bytes,
        "uploads_sized_files": sized_files,
        "folders": freshness.get("folders") or [],
        "size_trigger_gb": int(row.size_trigger_gb or 100),
        "size_trigger_hit": size_trigger_hit,
        "hot_days": hot_days,
        "modules": modules,
        "keep_local_pivots": keep_pivots,
        "scanned_files": scanned,
        "already_cold": already_cold,
        "candidate_count": len(candidates),
        "candidate_bytes": candidate_bytes,
        "should_run": should_run,
        "trigger": "OR",
        "candidates": preview,
        "candidates_truncated": max(0, len(candidates) - len(preview)),
    }


def uploads_total_bytes() -> int:
    b, _ = _dir_size_bytes(UPLOADS_ROOT, max_files=20_000)
    return int(b)

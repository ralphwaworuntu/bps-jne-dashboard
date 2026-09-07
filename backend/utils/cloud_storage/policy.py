"""Kebijakan hot / cold untuk arsip uploads ke BEBOX.

Hot window (default 45 hari):
  - CSV/XLSX detail tetap di VPS.
  - Pivot/stats/meta selalu tetap lokal jika keep_local_pivots=true.

Cold (usia > hot_days):
  - File besar dipindah ke BEBOX; lokal diganti stub ``{name}.cold.json``.
  - Saat user buka periode lama: pivot tetap dari lokal; detail di-hydrate
    ke cache LRU (hydrate_cache_gb) lalu dibaca seperti file biasa.

Trigger archive (OR, bukan AND):
  - Ada kandidat lebih tua dari hot_days, ATAU
  - Total folder uploads ≥ size_trigger_gb (default 100).
    Yang diarsipkan tetap hanya kandidat cold (bukan file masih dalam hot window).
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from models import CloudStorageSettings

UPLOADS_ROOT = Path("uploads")
HYDRATE_CACHE_DIR = UPLOADS_ROOT / ".hydrate_cache"

DEFAULT_MODULES = ("all_shipment", "kiriman_yes", "alc_penjualan", "jobs")
KNOWN_MODULES = (
    "all_shipment",
    "kiriman_yes",
    "alc_penjualan",
    "jobs",
    "lastmile",
    "firstmile",
    "master",
    "ops_master_data",
    "finance",
)

KEEP_NAME_SUFFIXES = (
    ".pivot.json",
    ".stats.json",
    ".meta",
    ".cold.json",
)
KEEP_FILENAMES = {
    "_sys_speedtest_last.json",
}
SKIP_DIR_NAMES = {".hydrate_cache", "__pycache__", ".git"}

# File yang boleh diarsipkan (detail baked / raw / leftovers).
ARCHIVE_SUFFIXES = {
    ".csv",
    ".xlsx",
    ".xls",
    ".xlsm",
    ".zip",
    ".bin",
    ".parquet",
    ".jsonl",
}

# Di uploads/jobs/: JSON status job kecil tetap lokal.
JOBS_KEEP_JSON = True


def parse_modules(raw: str | None) -> list[str]:
    if not raw or not str(raw).strip():
        return list(DEFAULT_MODULES)
    out: list[str] = []
    for part in str(raw).split(","):
        name = part.strip().strip("/").lower()
        if name and name not in out:
            out.append(name)
    return out or list(DEFAULT_MODULES)


def modules_to_str(modules: Iterable[str] | None) -> str:
    cleaned = parse_modules(",".join(modules or []))
    return ",".join(cleaned)


def keep_local_file(path: Path, *, keep_local_pivots: bool = True) -> bool:
    name = path.name
    if name in KEEP_FILENAMES:
        return True
    lower = name.lower()
    if any(lower.endswith(suf) for suf in KEEP_NAME_SUFFIXES):
        return True
    if keep_local_pivots and lower.endswith(".json") and "pivot" in lower:
        return True
    return False


def is_archiveable_file(path: Path, *, keep_local_pivots: bool = True) -> bool:
    if not path.is_file():
        return False
    if keep_local_file(path, keep_local_pivots=keep_local_pivots):
        return False
    if JOBS_KEEP_JSON and path.suffix.lower() == ".json":
        try:
            rel = path.resolve().relative_to(UPLOADS_ROOT.resolve())
        except ValueError:
            rel = path
        parts = rel.parts if hasattr(rel, "parts") else ()
        if parts and parts[0] == "jobs" and "raw" not in parts:
            return False
    suffix = path.suffix.lower()
    if suffix in ARCHIVE_SUFFIXES:
        return True
    try:
        return path.stat().st_size >= 1_048_576
    except OSError:
        return False


def file_age_days(path: Path, now: datetime | None = None) -> float | None:
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return None
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    age = current.timestamp() - mtime
    return max(0.0, age / 86400.0)


def is_cold_by_age(path: Path, hot_days: int, now: datetime | None = None) -> bool:
    age = file_age_days(path, now)
    if age is None:
        return False
    return age > max(1, int(hot_days or 45))


def remote_key_for(path: Path, prefix: str) -> str:
    prefix = (prefix or "bps-jne/").strip().replace("\\", "/")
    if not prefix.endswith("/"):
        prefix += "/"
    try:
        rel = path.resolve().relative_to(UPLOADS_ROOT.resolve()).as_posix()
    except ValueError:
        rel = path.name
    return f"{prefix}{rel}"


def settings_policy_dict(row: CloudStorageSettings) -> dict[str, Any]:
    return {
        "hot_days": int(row.hot_days or 45),
        "size_trigger_gb": int(row.size_trigger_gb or 100),
        "keep_local_pivots": bool(row.keep_local_pivots),
        "hydrate_cache_gb": int(row.hydrate_cache_gb or 5),
        "modules": parse_modules(row.modules),
        "trigger": "OR (usia > hot_days ATAU total uploads ≥ size_trigger_gb)",
        "keep_local": list(KEEP_NAME_SUFFIXES),
    }

"""Cache JSON untuk dataset CSV besar (geotagging / cakupan) agar GET tidak selalu parse ulang."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


def cache_path_for(source: Path) -> Path:
    return source.with_suffix(source.suffix + ".records.json")


def is_cache_fresh(source: Path, cache: Path) -> bool:
    if not source.is_file() or not cache.is_file():
        return False
    try:
        return cache.stat().st_mtime >= source.stat().st_mtime
    except OSError:
        return False


def load_or_build_records(
    source: Path,
    builder: Callable[[], Dict[str, Any]],
) -> Dict[str, Any]:
    """
    builder() harus mengembalikan dict minimal: {"records": [...], ...facets optional}
    """
    cache = cache_path_for(source)
    if is_cache_fresh(source, cache):
        try:
            return json.loads(cache.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    payload = builder()
    try:
        cache.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass
    return payload


def invalidate_cache(source: Path) -> None:
    cache = cache_path_for(source)
    if cache.is_file():
        try:
            cache.unlink()
        except OSError:
            pass

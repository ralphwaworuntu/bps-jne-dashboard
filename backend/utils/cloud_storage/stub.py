"""Manifest `.cold.json` menggantikan file besar yang sudah di-setor ke cloud."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

COLD_SUFFIX = ".cold.json"


def stub_path_for(original: Path) -> Path:
    return original.with_name(original.name + COLD_SUFFIX)


def original_path_from_stub(stub: Path) -> Path:
    name = stub.name
    if name.endswith(COLD_SUFFIX):
        return stub.with_name(name[: -len(COLD_SUFFIX)])
    return stub


def is_stub_path(path: Path) -> bool:
    return path.name.endswith(COLD_SUFFIX)


def read_stub(path: Path) -> Optional[dict[str, Any]]:
    stub = path if is_stub_path(path) else stub_path_for(path)
    if not stub.is_file():
        return None
    try:
        data = json.loads(stub.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    return data


def write_stub(
    original: Path,
    *,
    remote_key: str,
    bytes_len: int,
    sha256: str,
    content_type: str = "application/octet-stream",
) -> Path:
    stub = stub_path_for(original)
    payload = {
        "version": 1,
        "remote_key": remote_key,
        "bytes": int(bytes_len),
        "sha256": sha256,
        "archived_at": datetime.now(timezone.utc).isoformat(),
        "original_name": original.name,
        "content_type": content_type,
    }
    stub.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return stub


def has_stub(original: Path) -> bool:
    return stub_path_for(original).is_file()

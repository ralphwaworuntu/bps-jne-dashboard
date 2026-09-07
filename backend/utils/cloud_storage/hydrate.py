"""Hydrate file dingin dari cloud ke cache LRU lokal."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Optional

from sqlmodel import Session

from database import engine
from models import CloudStorageSettings
from utils.cloud_storage.exceptions import CloudStorageError, ColdStorageUnavailable
from utils.cloud_storage.policy import HYDRATE_CACHE_DIR, UPLOADS_ROOT
from utils.cloud_storage.s3_compatible import download_file
from utils.cloud_storage.settings_store import get_or_create_settings
from utils.cloud_storage.stub import has_stub, original_path_from_stub, read_stub, stub_path_for


def cache_path_for(original: Path) -> Path:
    try:
        rel = original.resolve().relative_to(UPLOADS_ROOT.resolve())
    except ValueError:
        rel = Path(original.name)
    return HYDRATE_CACHE_DIR / rel


def _evict_lru(max_bytes: int) -> None:
    if not HYDRATE_CACHE_DIR.is_dir():
        return
    files: list[tuple[float, int, Path]] = []
    total = 0
    for dirpath, _dirnames, filenames in os.walk(HYDRATE_CACHE_DIR):
        for name in filenames:
            fp = Path(dirpath) / name
            try:
                st = fp.stat()
            except OSError:
                continue
            files.append((st.st_mtime, int(st.st_size), fp))
            total += int(st.st_size)
    if total <= max_bytes:
        return
    files.sort(key=lambda x: x[0])  # oldest first
    for _mtime, size, fp in files:
        if total <= max_bytes:
            break
        try:
            fp.unlink()
            total -= size
        except OSError:
            continue


def hydrate_from_stub(
    original: Path,
    *,
    session: Optional[Session] = None,
    row: Optional[CloudStorageSettings] = None,
) -> Path:
    """Unduh object ke cache dan kembalikan path file yang bisa dibaca."""
    stub = read_stub(original)
    if not stub:
        raise ColdStorageUnavailable(f"Stub cold tidak ditemukan untuk {original.name}.")
    remote_key = str(stub.get("remote_key") or "").strip()
    if not remote_key:
        raise ColdStorageUnavailable("Stub rusak: remote_key kosong.")

    dest = cache_path_for(original)
    expected = str(stub.get("sha256") or "").strip()
    if dest.is_file() and dest.stat().st_size > 0:
        if not expected or _sha256(dest) == expected:
            dest.touch()
            return dest

    own_session = session is None
    if row is None:
        if own_session:
            session = Session(engine)
        assert session is not None
        row = get_or_create_settings(session)
    try:
        if not row.enabled:
            raise ColdStorageUnavailable(
                "Data di cold storage tidak tersedia (API penyimpanan belum diaktifkan)."
            )
        download_file(row, remote_key, dest)
        if expected:
            got = _sha256(dest)
            if got != expected:
                try:
                    dest.unlink()
                except OSError:
                    pass
                raise ColdStorageUnavailable("Checksum hydrate tidak cocok; file cloud mungkin rusak.")
        max_bytes = max(1, int(row.hydrate_cache_gb or 5)) * 1024 * 1024 * 1024
        _evict_lru(max_bytes)
        return dest
    except CloudStorageError as exc:
        raise ColdStorageUnavailable(
            f"Data di cold storage tidak tersedia: {exc}"
        ) from exc
    finally:
        if own_session and session is not None:
            session.close()


def resolve_readable_path(original: Path, *, session: Optional[Session] = None) -> Path:
    """File lokal, cache hydrate, atau unduh dari cloud bila hanya stub yang ada."""
    if original.is_file() and original.stat().st_size > 0:
        return original
    cached = cache_path_for(original)
    if cached.is_file() and cached.stat().st_size > 0:
        cached.touch()
        return cached
    if has_stub(original) or (original.exists() is False and stub_path_for(original).is_file()):
        return hydrate_from_stub(original, session=session)
    if original.name.endswith(".cold.json"):
        return hydrate_from_stub(original_path_from_stub(original), session=session)
    raise FileNotFoundError(str(original))


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

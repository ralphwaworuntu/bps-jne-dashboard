"""Endpoint Operations Master Data: upload Excel/CSV + baca data terpaginasi."""
from __future__ import annotations

import io
import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from auth import get_current_active_user
from database import get_session
from models import OpsMasterDataKind, OpsMasterDataUpload, User
from services.paths import OPS_MASTER_DATA_DIR
from utils.dataset_cache import invalidate_cache, load_or_build_records
from utils.excel_worker import run_in_excel_worker
from utils.notification_manager import create_notification
from utils.ops_master_data import (
    ALLOWED_COLOR_CLASSES,
    columns_for_kind,
    dedupe_column_names,
    get_kind_def,
    invalidate_registry,
    kind_to_api_dict,
    label_for_kind,
    list_kind_defs,
    normalize_kind,
    normalize_master_columns,
    refresh_registry,
    slugify_kind,
)
from utils.page_util import filter_records_by_query, paginate_list

router = APIRouter(prefix="/ops/master-data", tags=["ops-master-data"])

ALLOWED_SUFFIXES = {".xlsx", ".xls", ".csv"}
MAX_FILE_SIZE = 300 * 1024 * 1024


class CreateKindBody(BaseModel):
    label: str = Field(min_length=1, max_length=200)
    description: str = ""
    columns: List[str] = Field(min_length=1)
    color_class: str = "blue"
    tab_label: Optional[str] = None
    kind: Optional[str] = None  # optional override slug


class PatchKindBody(BaseModel):
    label: Optional[str] = None
    description: Optional[str] = None
    columns: Optional[List[str]] = None
    color_class: Optional[str] = None
    tab_label: Optional[str] = None


def _kind_dir(kind: str) -> Path:
    return OPS_MASTER_DATA_DIR / kind


def _parsed_path(kind: str) -> Path:
    return _kind_dir(kind) / f"{kind}.csv"


def _safe_filename(name: str) -> str:
    base = Path(name or "file").name
    cleaned = re.sub(r"[^a-zA-Z0-9._\-]", "_", base)
    return cleaned[:200] or "file"


def _parse_upload(raw: bytes, suffix: str, kind: str) -> pd.DataFrame:
    if suffix == ".csv":
        try:
            frame = pd.read_csv(
                io.BytesIO(raw),
                dtype=str,
                sep=None,
                engine="python",
                keep_default_na=False,
            )
        except UnicodeDecodeError:
            frame = pd.read_csv(
                io.BytesIO(raw),
                dtype=str,
                sep=None,
                engine="python",
                encoding="latin1",
                keep_default_na=False,
            )
    else:
        frame = pd.read_excel(io.BytesIO(raw), dtype=str)

    frame.columns = [str(c).strip() for c in frame.columns]
    frame = frame.loc[:, ~frame.columns.str.contains("^Unnamed")]
    return normalize_master_columns(frame, kind)


def _upload_to_dict(rec: OpsMasterDataUpload) -> dict:
    return {
        "id": rec.id,
        "kind": rec.kind,
        "original_filename": rec.original_filename,
        "row_count": rec.row_count,
        "uploaded_by": rec.uploaded_by_email,
        "created_at": rec.created_at.isoformat(),
        "label": label_for_kind(rec.kind),
        "columns": columns_for_kind(rec.kind),
        "is_active": bool(getattr(rec, "is_active", True)),
    }


def _history_to_dict(rec: OpsMasterDataUpload) -> dict:
    stored = Path(rec.stored_path)
    return {
        "id": rec.id,
        "kind": rec.kind,
        "original_filename": rec.original_filename,
        "row_count": rec.row_count,
        "uploaded_by": rec.uploaded_by_email,
        "created_at": rec.created_at.isoformat(),
        "is_active": bool(getattr(rec, "is_active", True)),
        "downloadable": stored.is_file(),
    }


def _move_to_archive(path: Path, archive_dir: Path, ts: str) -> Optional[Path]:
    if not path.is_file():
        return None
    dest = archive_dir / f"{path.stem}_{ts}{path.suffix}"
    path.replace(dest)
    meta = path.with_suffix(path.suffix + ".meta")
    if meta.is_file():
        meta.replace(archive_dir / f"{dest.name}.meta")
    return dest


def _archive_active_uploads(session: Session, normalized_kind: str) -> None:
    """Arsipkan upload aktif + file canonical di disk sebelum upload baru."""
    target_dir = _kind_dir(normalized_kind)
    archive_dir = target_dir / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    active_recs = session.exec(
        select(OpsMasterDataUpload)
        .where(OpsMasterDataUpload.kind == normalized_kind)
        .where(OpsMasterDataUpload.is_active == True)  # noqa: E712
    ).all()

    for rec in active_recs:
        raw = Path(rec.stored_path)
        parsed = Path(rec.parsed_path)
        new_raw = _move_to_archive(raw, archive_dir, ts)
        new_parsed = _move_to_archive(parsed, archive_dir, ts)
        if new_raw:
            rec.stored_path = str(new_raw)
        if new_parsed:
            rec.parsed_path = str(new_parsed)
        rec.is_active = False
        session.add(rec)

    for raw in target_dir.glob(f"{normalized_kind}_raw.*"):
        if raw.is_file():
            _move_to_archive(raw, archive_dir, ts)

    parsed_canonical = _parsed_path(normalized_kind)
    if parsed_canonical.is_file():
        _move_to_archive(parsed_canonical, archive_dir, ts)


def _load_records(parsed_path: Path, kind: str) -> List[dict]:
    if not parsed_path.is_file():
        return []

    def _build():
        df = pd.read_csv(parsed_path, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip() for c in df.columns]
        df = normalize_master_columns(df, kind).fillna("")
        return {"records": df.to_dict(orient="records")}

    payload = load_or_build_records(parsed_path, _build)
    return payload.get("records") or []


def _ensure_registry(session: Session) -> None:
    if not list_kind_defs():
        refresh_registry(session)
    else:
        # Keep warm; still refresh if DB has more than memory (cheap enough)
        refresh_registry(session)


@router.get("/kinds")
def list_kinds(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _ensure_registry(session)
    return {"items": [kind_to_api_dict(d) for d in list_kind_defs()]}


@router.post("/kinds")
def create_kind(
    body: CreateKindBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    label = (body.label or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="label wajib diisi.")

    columns = dedupe_column_names([str(c).strip() for c in body.columns if str(c).strip()])
    if not columns:
        raise HTTPException(status_code=400, detail="Minimal satu kolom header diperlukan.")

    color = (body.color_class or "blue").strip().lower()
    if color not in ALLOWED_COLOR_CLASSES:
        raise HTTPException(
            status_code=400,
            detail=f"color_class harus salah satu dari: {', '.join(sorted(ALLOWED_COLOR_CLASSES))}",
        )

    kind = slugify_kind(body.kind or label)
    if not re.fullmatch(r"[a-z0-9_]+", kind):
        raise HTTPException(status_code=400, detail="Slug kind tidak valid.")

    existing = session.exec(
        select(OpsMasterDataKind).where(OpsMasterDataKind.kind == kind)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Jenis database '{kind}' sudah ada. Gunakan nama lain.",
        )

    tab_label = (body.tab_label or label).strip()
    # Max sort_order among custom + builtins
    all_rows = session.exec(select(OpsMasterDataKind)).all()
    max_order = max((r.sort_order for r in all_rows), default=0)

    rec = OpsMasterDataKind(
        kind=kind,
        label=label if label.lower().startswith("database") else f"Database {label}",
        description=(body.description or "").strip()
        or f"Referensi {label} (.xlsx / .xls / .csv)",
        tab_label=tab_label,
        color_class=color,
        columns_json=json.dumps(columns, ensure_ascii=False),
        is_builtin=False,
        card_group=None,
        sort_order=max_order + 10,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    invalidate_registry()
    refresh_registry(session)

    return {"item": kind_to_api_dict(get_kind_def(kind))}


@router.patch("/kinds/{kind}")
def patch_kind(
    kind: str,
    body: PatchKindBody,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    try:
        normalized = normalize_kind(kind)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    rec = session.exec(
        select(OpsMasterDataKind).where(OpsMasterDataKind.kind == normalized)
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Jenis database tidak ditemukan.")

    if body.label is not None:
        label = body.label.strip()
        if not label:
            raise HTTPException(status_code=400, detail="label tidak boleh kosong.")
        rec.label = label
    if body.description is not None:
        rec.description = body.description.strip()
    if body.tab_label is not None:
        tab = body.tab_label.strip()
        if not tab:
            raise HTTPException(status_code=400, detail="tab_label tidak boleh kosong.")
        rec.tab_label = tab
    if body.color_class is not None:
        color = body.color_class.strip().lower()
        if color not in ALLOWED_COLOR_CLASSES:
            raise HTTPException(status_code=400, detail="color_class tidak valid.")
        rec.color_class = color
    if body.columns is not None:
        columns = dedupe_column_names(
            [str(c).strip() for c in body.columns if str(c).strip()]
        )
        if not columns:
            raise HTTPException(status_code=400, detail="Minimal satu kolom diperlukan.")
        rec.columns_json = json.dumps(columns, ensure_ascii=False)

    session.add(rec)
    session.commit()
    session.refresh(rec)
    invalidate_registry()
    refresh_registry(session)
    return {"item": kind_to_api_dict(get_kind_def(normalized))}


@router.delete("/kinds/{kind}")
def delete_kind(
    kind: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    normalized = (kind or "").strip().lower()
    rec = session.exec(
        select(OpsMasterDataKind).where(OpsMasterDataKind.kind == normalized)
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Jenis database tidak ditemukan.")
    if rec.is_builtin:
        raise HTTPException(
            status_code=400,
            detail="Database bawaan tidak dapat dihapus.",
        )

    uploads = session.exec(
        select(OpsMasterDataUpload).where(OpsMasterDataUpload.kind == normalized)
    ).all()
    for up in uploads:
        try:
            invalidate_cache(Path(up.parsed_path))
        except Exception:
            pass
        session.delete(up)

    session.delete(rec)
    session.commit()

    target_dir = _kind_dir(normalized)
    if target_dir.exists():
        try:
            shutil.rmtree(target_dir)
        except OSError as e:
            print(f"WARN gagal hapus folder {target_dir}: {e}")

    invalidate_registry()
    refresh_registry(session)
    return {"message": f"Database '{normalized}' berhasil dihapus.", "kind": normalized}


@router.get("/uploads")
def list_uploads(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Status upload terbaru per jenis master data."""
    _ensure_registry(session)
    out = {}
    for defn in list_kind_defs():
        rec = session.exec(
            select(OpsMasterDataUpload)
            .where(OpsMasterDataUpload.kind == defn.kind)
            .where(OpsMasterDataUpload.is_active == True)  # noqa: E712
            .order_by(OpsMasterDataUpload.created_at.desc())
            .limit(1)
        ).first()
        out[defn.kind] = _upload_to_dict(rec) if rec else None
    return {"items": out}


@router.get("/uploads/history")
def list_all_upload_history(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Riwayat upload per kind (termasuk arsip)."""
    _ensure_registry(session)
    out: dict = {}
    for defn in list_kind_defs():
        rows = session.exec(
            select(OpsMasterDataUpload)
            .where(OpsMasterDataUpload.kind == defn.kind)
            .order_by(OpsMasterDataUpload.created_at.desc())
        ).all()
        if rows:
            out[defn.kind] = [_history_to_dict(r) for r in rows]
    return {"items": out}


@router.get("/{kind}/history")
def list_kind_upload_history(
    kind: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _ensure_registry(session)
    try:
        normalized_kind = normalize_kind(kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    rows = session.exec(
        select(OpsMasterDataUpload)
        .where(OpsMasterDataUpload.kind == normalized_kind)
        .order_by(OpsMasterDataUpload.created_at.desc())
    ).all()
    return {"items": [_history_to_dict(r) for r in rows]}


@router.get("/{kind}/download/{upload_id}")
def download_master_data_upload(
    kind: str,
    upload_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _ensure_registry(session)
    try:
        normalized_kind = normalize_kind(kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    rec = session.get(OpsMasterDataUpload, upload_id)
    if not rec or rec.kind != normalized_kind:
        raise HTTPException(status_code=404, detail="Upload tidak ditemukan.")

    stored = Path(rec.stored_path)
    if not stored.is_file():
        raise HTTPException(status_code=404, detail="File asli tidak ditemukan di server.")

    return FileResponse(
        path=str(stored),
        filename=rec.original_filename,
        media_type="application/octet-stream",
    )


@router.post("/upload/{kind}")
async def upload_master_data(
    kind: str,
    request: Request,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _ensure_registry(session)
    try:
        normalized_kind = normalize_kind(kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File terlalu besar. Maksimum 300MB")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Jenis file tidak didukung. Gunakan Excel (.xlsx / .xls) atau CSV (.csv)",
        )

    await file.seek(0)
    content = await file.read()

    try:
        df = await run_in_excel_worker(_parse_upload, content, suffix, normalized_kind)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {e!s}") from e

    target_dir = _kind_dir(normalized_kind)
    target_dir.mkdir(parents=True, exist_ok=True)

    raw_path = target_dir / f"{normalized_kind}_raw{suffix}"
    parsed_path = _parsed_path(normalized_kind)

    _archive_active_uploads(session, normalized_kind)

    raw_path.write_bytes(content)
    df.to_csv(parsed_path, index=False)
    invalidate_cache(parsed_path)

    meta_path = parsed_path.with_suffix(parsed_path.suffix + ".meta")
    try:
        meta_path.write_text(
            json.dumps(
                {
                    "original_filename": file.filename,
                    "kind": normalized_kind,
                    "uploaded_by": current_user.email,
                    "timestamp": datetime.now().isoformat(),
                    "row_count": int(len(df)),
                }
            ),
            encoding="utf-8",
        )
    except OSError:
        pass

    record = OpsMasterDataUpload(
        kind=normalized_kind,
        original_filename=_safe_filename(file.filename or normalized_kind),
        stored_path=str(raw_path),
        parsed_path=str(parsed_path),
        row_count=int(len(df)),
        uploaded_by_user_id=current_user.id,
        uploaded_by_email=current_user.email,
        is_active=True,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    label = label_for_kind(normalized_kind)
    create_notification(
        session,
        title="Upload Success",
        message=f"{label} ({file.filename}) berhasil diunggah ({len(df)} baris).",
        type="success",
        user_id=current_user.id,
    )

    return {
        "message": f"{label} berhasil diunggah",
        "upload": _upload_to_dict(record),
        "rows": int(len(df)),
        "columns": columns_for_kind(normalized_kind),
    }


@router.get("/{kind}")
async def get_master_data(
    kind: str,
    page: int = 1,
    limit: int = 50,
    q: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    _ensure_registry(session)
    try:
        normalized_kind = normalize_kind(kind)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    record = session.exec(
        select(OpsMasterDataUpload)
        .where(OpsMasterDataUpload.kind == normalized_kind)
        .where(OpsMasterDataUpload.is_active == True)  # noqa: E712
        .order_by(OpsMasterDataUpload.created_at.desc())
        .limit(1)
    ).first()

    parsed_path = Path(record.parsed_path) if record else _parsed_path(normalized_kind)
    columns = columns_for_kind(normalized_kind)
    label = label_for_kind(normalized_kind)

    if not parsed_path.is_file():
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": limit,
            "pages": 0,
            "columns": columns,
            "upload": None,
            "message": f"Data {label} belum diunggah.",
        }

    try:
        records = await run_in_excel_worker(_load_records, parsed_path, normalized_kind)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca data: {e!s}") from e

    records = filter_records_by_query(records, q)
    total = len(records)

    if limit is None or int(limit) <= 0:
        return {
            "items": records,
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
            "columns": columns,
            "upload": _upload_to_dict(record) if record else None,
        }

    result = paginate_list(records, page=page, limit=limit)
    result["columns"] = columns
    result["upload"] = _upload_to_dict(record) if record else None
    return result

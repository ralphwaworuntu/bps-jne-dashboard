"""Endpoint ALC: upload & pembacaan data penjualan (SCO / APEX) per periode."""
from __future__ import annotations

import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from auth import get_current_active_user
from database import get_session
from models import AlcPenjualanUpload, User
from services.paths import ALC_PENJUALAN_DIR
from utils.alc_penjualan_merge import (
    PENJUALAN_COLUMNS,
    filter_merged_by_cabang,
    merge_sco_apex_by_awb,
    normalize_penjualan_columns,
    pair_uploads_by_period,
)
from utils.dataset_cache import invalidate_cache, load_or_build_records
from utils.excel_worker import run_in_excel_worker
from utils.notification_manager import create_notification
from utils.page_util import filter_records_by_query, paginate_list

router = APIRouter(prefix="/alc", tags=["alc"])

PENJUALAN_KINDS = {"SCO", "APEX"}
ALLOWED_SUFFIXES = {".xlsx", ".xls", ".csv"}
MAX_FILE_SIZE = 300 * 1024 * 1024


def _normalize_kind(kind: str) -> str:
    normalized = (kind or "").strip().upper()
    if normalized not in PENJUALAN_KINDS:
        raise HTTPException(status_code=400, detail="kind harus 'SCO' atau 'APEX'")
    return normalized


def _validate_period(month: int, year: int) -> None:
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="month harus 1-12")
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="year tidak valid")


def _kind_dir(kind: str) -> Path:
    return ALC_PENJUALAN_DIR / kind.lower()


def _period_stem(kind: str, month: int, year: int) -> str:
    return f"{kind.lower()}_{year}_{month:02d}"


def _parsed_path(kind: str, month: int, year: int) -> Path:
    return _kind_dir(kind) / f"{_period_stem(kind, month, year)}.csv"


def _safe_filename(name: str) -> str:
    base = Path(name or "file").name
    cleaned = re.sub(r"[^a-zA-Z0-9._\-]", "_", base)
    return cleaned[:200] or "file"


def _parse_upload(raw: bytes, suffix: str) -> pd.DataFrame:
    if suffix == ".csv":
        try:
            frame = pd.read_csv(
                io.BytesIO(raw), dtype=str, sep=None,
                engine="python", keep_default_na=False,
            )
        except UnicodeDecodeError:
            frame = pd.read_csv(
                io.BytesIO(raw), dtype=str, sep=None,
                engine="python", encoding="latin1", keep_default_na=False,
            )
    else:
        frame = pd.read_excel(io.BytesIO(raw), dtype=str)

    frame.columns = [str(c).strip() for c in frame.columns]
    frame = frame.loc[:, ~frame.columns.str.contains("^Unnamed")]
    frame = normalize_penjualan_columns(frame)
    return frame.fillna("")


def _upload_to_dict(rec: AlcPenjualanUpload) -> dict:
    return {
        "id": rec.id,
        "kind": rec.kind,
        "month": rec.month,
        "year": rec.year,
        "original_filename": rec.original_filename,
        "row_count": rec.row_count,
        "uploaded_by": rec.uploaded_by_email,
        "created_at": rec.created_at.isoformat(),
    }


@router.post("/penjualan/upload/{kind}")
async def upload_penjualan(
    kind: str,
    request: Request,
    file: UploadFile = File(...),
    month: int = Form(...),
    year: int = Form(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Simpan file penjualan SCO/APEX untuk satu periode, lalu parse ke CSV kanonik."""
    normalized_kind = _normalize_kind(kind)
    _validate_period(month, year)

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
        df = await run_in_excel_worker(_parse_upload, content, suffix)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca file: {e!s}") from e

    target_dir = _kind_dir(normalized_kind)
    target_dir.mkdir(parents=True, exist_ok=True)

    stem = _period_stem(normalized_kind, month, year)
    raw_path = target_dir / f"{stem}_raw{suffix}"
    parsed_path = _parsed_path(normalized_kind, month, year)

    # Arsipkan berkas periode yang sama sebelum diganti.
    if raw_path.exists() or parsed_path.exists():
        archive_dir = target_dir / "archive"
        archive_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        for existing in (raw_path, parsed_path):
            if existing.exists():
                existing.replace(archive_dir / f"{existing.stem}_{ts}{existing.suffix}")

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
                    "month": month,
                    "year": year,
                    "uploaded_by": current_user.email,
                    "timestamp": datetime.now().isoformat(),
                }
            ),
            encoding="utf-8",
        )
    except OSError:
        pass

    existing_records = session.exec(
        select(AlcPenjualanUpload).where(
            AlcPenjualanUpload.kind == normalized_kind,
            AlcPenjualanUpload.month == month,
            AlcPenjualanUpload.year == year,
        )
    ).all()
    for old in existing_records:
        session.delete(old)

    record = AlcPenjualanUpload(
        kind=normalized_kind,
        month=month,
        year=year,
        original_filename=_safe_filename(file.filename or stem),
        stored_path=str(raw_path),
        parsed_path=str(parsed_path),
        row_count=int(len(df)),
        uploaded_by_user_id=current_user.id,
        uploaded_by_email=current_user.email,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    create_notification(
        session,
        title="Upload Success",
        message=(
            f"Data penjualan {normalized_kind} ({file.filename}) periode "
            f"{month:02d}/{year} berhasil diunggah ({len(df)} baris)."
        ),
        type="success",
        user_id=current_user.id,
    )

    return {
        "message": f"Data {normalized_kind} berhasil diunggah",
        "upload": _upload_to_dict(record),
    }


@router.get("/penjualan/uploads")
def list_penjualan_uploads(
    kind: Optional[str] = None,
    year: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Riwayat upload penjualan, terbaru lebih dulu."""
    stmt = select(AlcPenjualanUpload)
    if kind:
        stmt = stmt.where(AlcPenjualanUpload.kind == _normalize_kind(kind))
    if year:
        stmt = stmt.where(AlcPenjualanUpload.year == year)
    stmt = stmt.order_by(
        AlcPenjualanUpload.year.desc(),
        AlcPenjualanUpload.month.desc(),
        AlcPenjualanUpload.created_at.desc(),
    )
    records = session.exec(stmt).all()
    return {"items": [_upload_to_dict(r) for r in records]}


def _load_records_from_upload(rec: AlcPenjualanUpload) -> List[dict]:
    parsed_path = Path(rec.parsed_path)
    if not parsed_path.is_file():
        return []

    def _build():
        df = pd.read_csv(parsed_path, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip() for c in df.columns]
        df = normalize_penjualan_columns(df).fillna("")
        return {"records": df.to_dict(orient="records")}

    payload = load_or_build_records(parsed_path, _build)
    return payload.get("records") or []


def _merge_all_periods(uploads: List[AlcPenjualanUpload]) -> Dict[str, Any]:
    pairs = pair_uploads_by_period(uploads)
    combined: List[dict] = []
    period_stats: List[dict] = []
    totals = {
        "sco_awb_count": 0,
        "apex_awb_count": 0,
        "matched_awb_count": 0,
        "only_sco_count": 0,
        "only_apex_count": 0,
        "merged_row_count": 0,
        "periods_paired": 0,
        "periods_incomplete": 0,
        "awb_count_equal": True,
        "awb_content_equal": True,
    }

    for sco_rec, apex_rec in pairs:
        sco_rows = _load_records_from_upload(sco_rec) if sco_rec else []
        apex_rows = _load_records_from_upload(apex_rec) if apex_rec else []
        merged, stats = merge_sco_apex_by_awb(sco_rows, apex_rows)
        combined.extend(merged)

        year = (sco_rec or apex_rec).year if (sco_rec or apex_rec) else None
        month = (sco_rec or apex_rec).month if (sco_rec or apex_rec) else None
        incomplete = sco_rec is None or apex_rec is None
        if incomplete:
            totals["periods_incomplete"] += 1
        else:
            totals["periods_paired"] += 1

        period_stats.append(
            {
                "year": year,
                "month": month,
                "has_sco": sco_rec is not None,
                "has_apex": apex_rec is not None,
                **stats,
            }
        )
        for key in (
            "sco_awb_count",
            "apex_awb_count",
            "matched_awb_count",
            "only_sco_count",
            "only_apex_count",
            "merged_row_count",
        ):
            totals[key] += int(stats.get(key, 0) or 0)
        totals["awb_count_equal"] = totals["awb_count_equal"] and bool(stats.get("awb_count_equal"))
        totals["awb_content_equal"] = totals["awb_content_equal"] and bool(stats.get("awb_content_equal"))

    return {
        "records": combined,
        "match": {
            **totals,
            "periods": period_stats,
        },
    }


@router.get("/penjualan")
async def get_penjualan(
    nama: Optional[str] = None,
    tipe: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    q: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """
    Data penjualan hasil VLOOKUP SCO↔APEX by AWB.
    Fase awal: filter plotting by Cabang (`tipe=Cabang` + `nama`).
    """
    uploads = session.exec(
        select(AlcPenjualanUpload).order_by(
            AlcPenjualanUpload.year.desc(),
            AlcPenjualanUpload.month.desc(),
            AlcPenjualanUpload.created_at.desc(),
        )
    ).all()

    if not uploads:
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": limit,
            "pages": 0,
            "columns": PENJUALAN_COLUMNS,
            "uploads_count": 0,
            "match": {
                "sco_awb_count": 0,
                "apex_awb_count": 0,
                "matched_awb_count": 0,
                "only_sco_count": 0,
                "only_apex_count": 0,
                "merged_row_count": 0,
                "periods_paired": 0,
                "periods_incomplete": 0,
                "awb_count_equal": True,
                "awb_content_equal": True,
                "periods": [],
            },
        }

    try:
        payload = await run_in_excel_worker(_merge_all_periods, list(uploads))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menggabungkan data penjualan: {e!s}") from e

    records: List[dict] = payload.get("records") or []
    match = payload.get("match") or {}

    entity_tipe = (tipe or "Cabang").strip()
    # Fase awal: olah by Cabang. Filter Agen menyusul.
    if nama and nama.strip() and entity_tipe.lower() == "cabang":
        records = filter_merged_by_cabang(records, nama.strip())
    elif nama and nama.strip():
        # Sementara: Agen belum diolah — kembalikan kosong agar jelas.
        records = []

    records = filter_records_by_query(records, q)
    result = paginate_list(records, page=page, limit=limit)
    result["columns"] = PENJUALAN_COLUMNS
    result["uploads_count"] = len(uploads)
    result["match"] = match
    return result


@router.get("/penjualan/download/{upload_id}")
def download_penjualan_upload(
    upload_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    record = session.get(AlcPenjualanUpload, upload_id)
    if not record:
        raise HTTPException(status_code=404, detail="Upload tidak ditemukan")
    path = Path(record.stored_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Berkas tidak ada di server")
    return FileResponse(
        path,
        filename=record.original_filename,
        media_type="application/octet-stream",
    )

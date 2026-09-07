"""Outstanding harian — parse/enrich sama All Inbound & CTC, simpan terpisah.

Tabel: UN INBOUND (filter Bagian A) dan OTS (take-out setara INBOUND CTC).
Periode hanya harian.
"""
from __future__ import annotations

import io
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from services.paths import ALL_SHIPMENT_DIR
from utils.ctc_inbound import (
    CTC_DETAIL_COLUMNS,
    PERIOD_MODE_COL,
    UPLOAD_DATE_COL,
    _canonicalize_columns,
    _ensure_detail_columns,
    filter_inbound_rows_after_un_inbound,
    filter_un_inbound_rows,
    parse_ctc_upload,
)
from utils.inbound_pivot import _strip_apostrophe
from utils.page_util import filter_dataframe_by_query

OTS_DAILY_DIR = ALL_SHIPMENT_DIR / "outstanding_daily"


def daily_file_path(date_iso: str) -> Path:
    return OTS_DAILY_DIR / f"{date_iso}.csv"


def latest_outstanding_daily_path() -> Optional[Path]:
    if not OTS_DAILY_DIR.is_dir():
        return None
    files = [
        p
        for p in OTS_DAILY_DIR.glob("????-??-??.csv")
        if p.is_file()
    ]
    if not files:
        return None
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def normalize_kind(kind: str | None) -> str:
    k = (kind or "ots").strip().lower()
    if k in {"inbound", "ots"}:
        return "ots"
    if k == "un_inbound":
        return "un_inbound"
    return "ots"


def save_outstanding_upload(
    df: pd.DataFrame,
    date_iso: str,
    original_filename: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> Path:
    OTS_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    day_df = _ensure_detail_columns(df.copy())
    day_df[UPLOAD_DATE_COL] = date_iso
    day_df[PERIOD_MODE_COL] = "harian"
    path = daily_file_path(date_iso)
    if path.exists():
        archive = OTS_DAILY_DIR / "archive"
        archive.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path.replace(archive / f"{date_iso}_{ts}.csv")
        meta_old = path.with_suffix(".meta.json")
        if meta_old.exists():
            meta_old.replace(archive / f"{date_iso}_{ts}.meta.json")

    day_df.to_csv(path, index=False, encoding="utf-8-sig")
    meta = {
        "original_filename": original_filename or "",
        "uploaded_by": uploaded_by or "",
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        "rows": int(len(day_df)),
        "period_mode": "harian",
        "date": date_iso,
    }
    path.with_suffix(".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def read_outstanding_frame(date_iso: Optional[str] = None) -> pd.DataFrame:
    if not date_iso:
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)
    path = daily_file_path(date_iso)
    from utils.cloud_storage.exceptions import ColdStorageUnavailable
    from utils.cloud_storage.hydrate import resolve_readable_path
    from utils.cloud_storage.stub import has_stub

    if not path.is_file() and not has_stub(path):
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)
    try:
        readable = resolve_readable_path(path)
        df = pd.read_csv(readable, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip() for c in df.columns]
        df = _canonicalize_columns(df)
        if "AWB" in df.columns:
            df["AWB"] = df["AWB"].map(_strip_apostrophe)
        if "ID_ACCOUNT" in df.columns:
            df["ID_ACCOUNT"] = df["ID_ACCOUNT"].map(_strip_apostrophe)
        return _ensure_detail_columns(df)
    except ColdStorageUnavailable:
        raise
    except Exception:
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)


def prepare_outstanding_view(
    date_iso: Optional[str] = None,
    kind: str = "ots",
    q: Optional[str] = None,
) -> pd.DataFrame:
    df = read_outstanding_frame(date_iso)
    kind_norm = normalize_kind(kind)
    if kind_norm == "un_inbound":
        df = filter_un_inbound_rows(df)
    else:
        df = filter_inbound_rows_after_un_inbound(df)
    if df.empty:
        return df
    view = df.copy()
    for col in CTC_DETAIL_COLUMNS:
        if col not in view.columns:
            view[col] = ""
    view = view[CTC_DETAIL_COLUMNS].fillna("")
    return filter_dataframe_by_query(view, q)


def list_outstanding_detail(
    date_iso: Optional[str] = None,
    kind: str = "ots",
    page: int = 1,
    limit: int = 0,
    q: Optional[str] = None,
) -> dict[str, Any]:
    kind_norm = normalize_kind(kind)
    view = prepare_outstanding_view(date_iso, kind_norm, q)
    table_label = "UN INBOUND" if kind_norm == "un_inbound" else "OTS"
    if view.empty:
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": 0,
            "pages": 0,
            "columns": CTC_DETAIL_COLUMNS,
            "message": f"Belum ada data {table_label} Outstanding untuk tanggal {date_iso or '-'}.",
        }

    total = int(len(view))
    if limit is None or int(limit) <= 0:
        return {
            "items": view.to_dict(orient="records"),
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
            "columns": CTC_DETAIL_COLUMNS,
            "message": None,
        }

    page_n, lim = int(page or 1), int(limit)
    if page_n < 1:
        page_n = 1
    if lim < 1:
        lim = 1
    start = (page_n - 1) * lim
    page_df = view.iloc[start : start + lim]
    pages = (total + lim - 1) // lim if lim and total else 0
    return {
        "items": page_df.to_dict(orient="records"),
        "total": total,
        "page": page_n,
        "limit": lim,
        "pages": pages,
        "columns": CTC_DETAIL_COLUMNS,
        "message": None,
    }


def export_outstanding_xlsx(
    date_iso: Optional[str] = None,
    kind: str = "ots",
    q: Optional[str] = None,
) -> dict[str, Any]:
    kind_norm = normalize_kind(kind)
    frame = prepare_outstanding_view(date_iso, kind_norm, q)
    if frame.empty:
        frame = pd.DataFrame(columns=CTC_DETAIL_COLUMNS)
    else:
        frame = frame.fillna("")
    xlsx_buffer = io.BytesIO()
    sheet = "UN INBOUND" if kind_norm == "un_inbound" else "OTS"
    with pd.ExcelWriter(xlsx_buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, index=False, sheet_name=sheet[:31])
    suffix = (date_iso or "").replace("-", "")
    filename = f"outstanding_{kind_norm}_harian_{suffix or 'export'}.xlsx"
    return {"filename": filename, "content": xlsx_buffer.getvalue()}


def parse_outstanding_upload(raw: bytes, suffix: str, date_iso: str) -> pd.DataFrame:
    return parse_ctc_upload(raw, suffix, "harian", date_iso, None, None)

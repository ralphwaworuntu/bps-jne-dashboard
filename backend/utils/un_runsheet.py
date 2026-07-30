"""UN RUNSHEET — store harian terpisah, enrichment CTC, pivot aging LT IM / LT MTI."""
from __future__ import annotations

import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from services.paths import ALL_SHIPMENT_DIR
from utils.ctc_inbound import (
    CTC_DETAIL_COLUMNS,
    UPLOAD_DATE_COL,
    _datedif_d,
    _h_plus,
    _is_blank,
    _parse_apex_datetime,
    enrich_ctc_columns,
    parse_ctc_upload,
)
from utils.inbound_pivot import _cell_str
from utils.page_util import filter_dataframe_by_query

UN_RUNSHEET_DAILY_DIR = ALL_SHIPMENT_DIR / "un_runsheet_daily"

AGING_COLS = ["H+0", "H+1", "H+2", "H+3"]
STATUS_COL = "VALIDASI STATUS CABANG"
NASIONAL_COL = "VALIDASI STATUS NASIONAL"
ZONA_COL = "ZONA"
KECAMATAN_COL = "KECAMATAN"
CABANG_COL = "CABANG BY CODING DEST"
LT_IM_COL = "LT IM - TODAY"
LT_MTI_COL = "LT MTI - TODAY"
DATE_RUNSHEET_COL = "DATE_RUNSHEET"
CODING_COL = "CODING"
MTS_COL = "MANIFEST_TRANSIT_AGEN"
DATE_TRANSIT_COL = "DATE_TRANSIT"
OUTBOUND_MANIFEST_COL = "OUTBOUND_MANIFEST"

_H_PLUS_RE = re.compile(r"^H\+(\d+)$", re.IGNORECASE)


def _norm_status(value: Any) -> str:
    return re.sub(r"\s+", " ", _cell_str(value).strip().upper())


def _is_un_inbound_status(value: Any) -> bool:
    return _norm_status(value) == "UN INBOUND"


def _is_un_runsheet_status(value: Any) -> bool:
    return _norm_status(value) in {"UN RUNSHEET", "UNRUNSHEET"}


def _is_un_outbound_lt(value: Any) -> bool:
    return _norm_status(value) == "UN OUTBOUND"


def _starts_with_koe(value: Any) -> bool:
    return _cell_str(value).strip().upper().startswith("KOE")


def _lt_im_from_date_transit(value: Any) -> str:
    today_dt = datetime.combine(date.today(), datetime.min.time())
    return _h_plus(_datedif_d(_parse_apex_datetime(value), today_dt))


def daily_file_path(date_iso: str) -> Path:
    return UN_RUNSHEET_DAILY_DIR / f"{date_iso}.csv"


def filtered_file_path(date_iso: str) -> Path:
    return UN_RUNSHEET_DAILY_DIR / f"{date_iso}.filtered.csv"


def pivot_cache_path(date_iso: str) -> Path:
    return UN_RUNSHEET_DAILY_DIR / f"{date_iso}.pivot.json"


def save_un_runsheet_for_date(
    df: pd.DataFrame,
    date_iso: str,
    original_filename: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> Path:
    UN_RUNSHEET_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    day_df = enrich_ctc_columns(df.copy())
    day_df[UPLOAD_DATE_COL] = date_iso
    path = daily_file_path(date_iso)
    day_df.to_csv(path, index=False, encoding="utf-8-sig")
    meta = {
        "original_filename": original_filename or "",
        "uploaded_by": uploaded_by or "",
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        "rows": int(len(day_df)),
        "date": date_iso,
    }
    path.with_suffix(".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def write_ready_artifacts(date_iso: str) -> Dict[str, Any]:
    """Hitung pipeline sekali → simpan filtered CSV + pivot JSON (hasil siap pakai)."""
    UN_RUNSHEET_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    source = read_un_runsheet_frame(date_iso)
    filtered = process_un_runsheet_pipeline(source)
    fpath = filtered_file_path(date_iso)
    if filtered.empty:
        pd.DataFrame(columns=CTC_DETAIL_COLUMNS).to_csv(
            fpath, index=False, encoding="utf-8-sig"
        )
    else:
        view = filtered.copy()
        for col in CTC_DETAIL_COLUMNS:
            if col not in view.columns:
                view[col] = ""
        view[CTC_DETAIL_COLUMNS].fillna("").to_csv(
            fpath, index=False, encoding="utf-8-sig"
        )

    cabang_options = list_cabang_options(filtered)
    pivot_lt_im_rows = _build_lt_im_hierarchy(filtered)
    pivot_lt_mti_rows = _build_lt_mti_hierarchy(filtered)
    pivot_payload = {
        "date": date_iso,
        "cabang": "(All)",
        "cabang_options": cabang_options,
        "aging_columns": AGING_COLS,
        "pivot_lt_im": {
            "field": "LT IM TODAY",
            "rows": pivot_lt_im_rows,
            "grand_total": _pivot_grand_total(pivot_lt_im_rows),
        },
        "pivot_lt_mti": {
            "field": "LT MTI TODAY",
            "rows": pivot_lt_mti_rows,
            "grand_total": _pivot_grand_total(pivot_lt_mti_rows),
        },
        "row_count_source": int(len(filtered)),
        "message": None
        if not filtered.empty
        else f"Belum ada data UN RUNSHEET untuk tanggal {date_iso}.",
    }
    ppath = pivot_cache_path(date_iso)
    ppath.write_text(json.dumps(pivot_payload, ensure_ascii=False), encoding="utf-8")
    return {
        "filtered_path": str(fpath),
        "pivot_path": str(ppath),
        "filtered_rows": int(len(filtered)),
    }


def read_filtered_frame(date_iso: str) -> pd.DataFrame:
    """Baca cache filtered; fallback hitung sekali + tulis cache jika belum ada."""
    fpath = filtered_file_path(date_iso)
    if fpath.is_file():
        try:
            df = pd.read_csv(fpath, dtype=str, keep_default_na=False)
            df.columns = [str(c).strip() for c in df.columns]
            for col in CTC_DETAIL_COLUMNS:
                if col not in df.columns:
                    df[col] = ""
            return df
        except Exception:
            pass
    # Legacy data tanpa cache: bangun sekali lalu simpan
    if daily_file_path(date_iso).is_file():
        write_ready_artifacts(date_iso)
        if fpath.is_file():
            try:
                df = pd.read_csv(fpath, dtype=str, keep_default_na=False)
                df.columns = [str(c).strip() for c in df.columns]
                for col in CTC_DETAIL_COLUMNS:
                    if col not in df.columns:
                        df[col] = ""
                return df
            except Exception:
                pass
    return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)


def read_un_runsheet_frame(date_iso: str) -> pd.DataFrame:
    path = daily_file_path(date_iso)
    if not path.is_file():
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)
    try:
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip() for c in df.columns]
        # Performa: jangan enrich ulang saat read.
        # Enrichment sudah dilakukan di parse/save upload.
        for col in CTC_DETAIL_COLUMNS:
            if col not in df.columns:
                df[col] = ""
        return df
    except Exception:
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)


def parse_un_runsheet_upload(raw: bytes, suffix: str, date_iso: str) -> pd.DataFrame:
    """Parse APEX → enrich CTC formulas → tag tanggal harian."""
    return parse_ctc_upload(
        raw,
        suffix,
        period_mode="harian",
        date_iso=date_iso,
    )


def process_un_runsheet_pipeline(df: pd.DataFrame) -> pd.DataFrame:
    """Proses Excel UN RUNSHEET langkah 1–14 (berurutan).

    1 Keep DATE_RUNSHEET blank
    2 Keep CODING blank
    3 Drop LT IM - TODAY = Un Outbound
    4–5 Un Inbound + MTS → UN RUNSHEET / DALAM PENERUSAN; LT IM dari DATE_TRANSIT
    6–7 Un Inbound + OM non-KOE → keep hanya KOTA KUPANG
    9–10 Un Inbound + LT MTI blank → Un Inbound
    12–13 UN RUNSHEET + LT MTI blank → copy LT IM
    """
    if df is None or df.empty:
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)

    out = df.copy()
    for col in (
        DATE_RUNSHEET_COL,
        CODING_COL,
        LT_IM_COL,
        LT_MTI_COL,
        NASIONAL_COL,
        STATUS_COL,
        MTS_COL,
        DATE_TRANSIT_COL,
        OUTBOUND_MANIFEST_COL,
        CABANG_COL,
    ):
        if col not in out.columns:
            out[col] = ""

    # 1) DATE_RUNSHEET blank only
    out = out.loc[out[DATE_RUNSHEET_COL].map(_is_blank)].copy()
    if out.empty:
        return out

    # 2) CODING blank only
    out = out.loc[out[CODING_COL].map(_is_blank)].copy()
    if out.empty:
        return out

    # 3) drop LT IM = Un Outbound
    out = out.loc[~out[LT_IM_COL].map(_is_un_outbound_lt)].copy()
    if out.empty:
        return out

    # 4–5) Un Inbound + MTS → transform
    un_inbound = out[NASIONAL_COL].map(_is_un_inbound_status)
    has_mts = ~out[MTS_COL].map(_is_blank)
    mts_mask = un_inbound & has_mts
    if mts_mask.any():
        out.loc[mts_mask, NASIONAL_COL] = "UN RUNSHEET"
        out.loc[mts_mask, STATUS_COL] = "DALAM PENERUSAN"
        fix_lt = mts_mask & out[LT_IM_COL].map(_is_un_inbound_status)
        if fix_lt.any():
            out.loc[fix_lt, LT_IM_COL] = out.loc[fix_lt, DATE_TRANSIT_COL].map(
                _lt_im_from_date_transit
            )

    # 6–7) Un Inbound + OM non-KOE: hapus selain KOTA KUPANG
    un_inbound = out[NASIONAL_COL].map(_is_un_inbound_status)
    om_non_koe = ~out[OUTBOUND_MANIFEST_COL].map(_starts_with_koe)
    cabang_upper = out[CABANG_COL].map(lambda v: _cell_str(v).strip().upper())
    drop_mask = un_inbound & om_non_koe & (cabang_upper != "KOTA KUPANG")
    out = out.loc[~drop_mask].copy()
    if out.empty:
        return out

    # 9–10) Un Inbound + LT MTI blank → Un Inbound
    un_inbound = out[NASIONAL_COL].map(_is_un_inbound_status)
    mti_blank = out[LT_MTI_COL].map(_is_blank)
    fill_un_inbound = un_inbound & mti_blank
    if fill_un_inbound.any():
        out.loc[fill_un_inbound, LT_MTI_COL] = "Un Inbound"

    # 12–13) UN RUNSHEET + LT MTI blank → copy LT IM
    un_rs = out[NASIONAL_COL].map(_is_un_runsheet_status)
    mti_blank = out[LT_MTI_COL].map(_is_blank)
    fill_from_im = un_rs & mti_blank
    if fill_from_im.any():
        out.loc[fill_from_im, LT_MTI_COL] = out.loc[fill_from_im, LT_IM_COL].map(
            lambda v: _cell_str(v)
        )

    return out.reset_index(drop=True)


def filter_un_runsheet_universe(df: pd.DataFrame) -> pd.DataFrame:
    """Universe tampilan UN RUNSHEET = hasil pipeline proses data."""
    return process_un_runsheet_pipeline(df)


def apply_cabang_filter(df: pd.DataFrame, cabang: Optional[str]) -> pd.DataFrame:
    if df.empty:
        return df
    needle = (cabang or "").strip()
    if not needle or needle in {"(All)", "All", "*"}:
        return df
    if CABANG_COL not in df.columns:
        return df
    col = df[CABANG_COL].map(lambda v: _cell_str(v).strip())
    return df.loc[col.str.lower() == needle.lower()].copy()


def aging_bucket(value: Any) -> Optional[str]:
    """Map LT IM/MTI TODAY → H+0..H+3 (H+3 = N≥3). Non H+n → None."""
    text = _cell_str(value).strip().upper()
    match = _H_PLUS_RE.match(text)
    if not match:
        return None
    n = int(match.group(1))
    if n <= 0:
        return "H+0"
    if n == 1:
        return "H+1"
    if n == 2:
        return "H+2"
    return "H+3"


def _empty_counts() -> Dict[str, int]:
    return {c: 0 for c in AGING_COLS}


def _add_count(target: Dict[str, int], bucket: str) -> None:
    if bucket in target:
        target[bucket] += 1


def _with_grand_total(counts: Dict[str, int]) -> Dict[str, int]:
    out = dict(counts)
    out["Grand Total"] = sum(counts.get(c, 0) for c in AGING_COLS)
    return out


def _build_lt_im_hierarchy(df: pd.DataFrame) -> List[dict]:
    """status → zona → counts (LT IM - TODAY)."""
    if df.empty:
        return []

    tree: Dict[str, Dict[str, Dict[str, int]]] = {}
    status_totals: Dict[str, Dict[str, int]] = {}

    for _, row in df.iterrows():
        status = _cell_str(row.get(STATUS_COL, "")).strip() or "(Kosong)"
        zona = _cell_str(row.get(ZONA_COL, "")).strip() or "(Kosong)"
        bucket = aging_bucket(row.get(LT_IM_COL, ""))
        if not bucket:
            continue
        if status not in tree:
            tree[status] = {}
            status_totals[status] = _empty_counts()
        if zona not in tree[status]:
            tree[status][zona] = _empty_counts()
        _add_count(tree[status][zona], bucket)
        _add_count(status_totals[status], bucket)

    rows: List[dict] = []
    for status in sorted(tree.keys(), key=lambda s: s.lower()):
        children = []
        for zona in sorted(tree[status].keys(), key=lambda z: z.lower()):
            children.append(
                {
                    "label": zona,
                    "level": 1,
                    "counts": _with_grand_total(tree[status][zona]),
                }
            )
        rows.append(
            {
                "label": status,
                "level": 0,
                "counts": _with_grand_total(status_totals[status]),
                "children": children,
            }
        )
    return rows


def _build_lt_mti_hierarchy(df: pd.DataFrame) -> List[dict]:
    """status → zona → kecamatan → counts (LT MTI - TODAY)."""
    if df.empty:
        return []

    # status -> zona -> kecamatan -> counts
    tree: Dict[str, Dict[str, Dict[str, Dict[str, int]]]] = {}
    status_totals: Dict[str, Dict[str, int]] = {}
    zona_totals: Dict[str, Dict[str, Dict[str, int]]] = {}

    for _, row in df.iterrows():
        status = _cell_str(row.get(STATUS_COL, "")).strip() or "(Kosong)"
        zona = _cell_str(row.get(ZONA_COL, "")).strip() or "(Kosong)"
        kec = _cell_str(row.get(KECAMATAN_COL, "")).strip() or "(Kosong)"
        bucket = aging_bucket(row.get(LT_MTI_COL, ""))
        if not bucket:
            continue
        if status not in tree:
            tree[status] = {}
            status_totals[status] = _empty_counts()
            zona_totals[status] = {}
        if zona not in tree[status]:
            tree[status][zona] = {}
            zona_totals[status][zona] = _empty_counts()
        if kec not in tree[status][zona]:
            tree[status][zona][kec] = _empty_counts()
        _add_count(tree[status][zona][kec], bucket)
        _add_count(zona_totals[status][zona], bucket)
        _add_count(status_totals[status], bucket)

    rows: List[dict] = []
    for status in sorted(tree.keys(), key=lambda s: s.lower()):
        zona_children = []
        for zona in sorted(tree[status].keys(), key=lambda z: z.lower()):
            kec_children = []
            for kec in sorted(tree[status][zona].keys(), key=lambda k: k.lower()):
                kec_children.append(
                    {
                        "label": kec,
                        "level": 2,
                        "counts": _with_grand_total(tree[status][zona][kec]),
                    }
                )
            zona_children.append(
                {
                    "label": zona,
                    "level": 1,
                    "counts": _with_grand_total(zona_totals[status][zona]),
                    "children": kec_children,
                }
            )
        rows.append(
            {
                "label": status,
                "level": 0,
                "counts": _with_grand_total(status_totals[status]),
                "children": zona_children,
            }
        )
    return rows


def _pivot_grand_total(hierarchy: List[dict]) -> Dict[str, int]:
    totals = _empty_counts()
    for node in hierarchy:
        counts = node.get("counts") or {}
        for col in AGING_COLS:
            totals[col] += int(counts.get(col, 0) or 0)
    return _with_grand_total(totals)


def list_cabang_options(df: pd.DataFrame) -> List[str]:
    if df.empty or CABANG_COL not in df.columns:
        return []
    return sorted(
        {
            _cell_str(v).strip()
            for v in df[CABANG_COL].tolist()
            if _cell_str(v).strip()
        },
        key=lambda x: x.lower(),
    )


def build_un_runsheet_pivot(date_iso: str, cabang: Optional[str] = None) -> dict:
    """Baca pivot dari cache siap pakai; cabang filter dihitung dari filtered cache."""
    full = read_filtered_frame(date_iso)
    cabang_options = list_cabang_options(full)
    needle = (cabang or "").strip()
    use_all = not needle or needle in {"(All)", "All", "*"}

    if use_all:
        # Snapshot pivot (All) dari cache bila ada
        ppath = pivot_cache_path(date_iso)
        if ppath.is_file():
            try:
                payload = json.loads(ppath.read_text(encoding="utf-8"))
                payload["cabang"] = "(All)"
                payload["cabang_options"] = cabang_options
                return payload
            except Exception:
                pass
        filtered = full
    else:
        filtered = apply_cabang_filter(full, cabang)

    pivot_lt_im_rows = _build_lt_im_hierarchy(filtered)
    pivot_lt_mti_rows = _build_lt_mti_hierarchy(filtered)

    return {
        "date": date_iso,
        "cabang": cabang or "(All)",
        "cabang_options": cabang_options,
        "aging_columns": AGING_COLS,
        "pivot_lt_im": {
            "field": "LT IM TODAY",
            "rows": pivot_lt_im_rows,
            "grand_total": _pivot_grand_total(pivot_lt_im_rows),
        },
        "pivot_lt_mti": {
            "field": "LT MTI TODAY",
            "rows": pivot_lt_mti_rows,
            "grand_total": _pivot_grand_total(pivot_lt_mti_rows),
        },
        "row_count_source": int(len(filtered)),
        "message": None
        if not filtered.empty
        else f"Belum ada data UN RUNSHEET untuk tanggal {date_iso}.",
    }


def list_un_runsheet_detail(
    date_iso: str,
    cabang: Optional[str] = None,
    page: int = 1,
    limit: int = 0,
    q: Optional[str] = None,
) -> dict:
    full = read_filtered_frame(date_iso)
    cabang_options = list_cabang_options(full)
    df = apply_cabang_filter(full, cabang)

    if df.empty:
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": 0,
            "pages": 0,
            "columns": CTC_DETAIL_COLUMNS,
            "cabang_options": cabang_options,
            "message": f"Belum ada data UN RUNSHEET untuk tanggal {date_iso}.",
        }

    view = df.copy()
    for col in CTC_DETAIL_COLUMNS:
        if col not in view.columns:
            view[col] = ""
    view = view[CTC_DETAIL_COLUMNS].fillna("")
    view = filter_dataframe_by_query(view, q)
    total = int(len(view))

    if limit is None or int(limit) <= 0:
        records = view.to_dict(orient="records")
        return {
            "items": records,
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
            "columns": CTC_DETAIL_COLUMNS,
            "cabang_options": cabang_options,
            "message": None,
        }

    page_n, lim = int(page or 1), int(limit)
    if page_n < 1:
        page_n = 1
    if lim < 1:
        lim = 1
    max_limit = max(lim, 200)
    if lim > max_limit:
        lim = max_limit
    start = (page_n - 1) * lim
    end = start + lim
    records = view.iloc[start:end].to_dict(orient="records")
    pages = (total + lim - 1) // lim if lim and total else 0
    return {
        "items": records,
        "total": total,
        "page": page_n,
        "limit": lim,
        "pages": pages,
        "columns": CTC_DETAIL_COLUMNS,
        "cabang_options": cabang_options,
        "message": None,
    }

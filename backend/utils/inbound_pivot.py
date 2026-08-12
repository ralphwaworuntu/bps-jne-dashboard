"""Pivot & detail Inbound APEX (Count of AWB + tabel detail penuh)."""
from __future__ import annotations

import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import pandas as pd

from services.paths import ALL_SHIPMENT_DIR
from utils.page_util import filter_records_by_query, paginate_list
from utils.excel_io import read_excel_fast

INBOUND_DAILY_DIR = ALL_SHIPMENT_DIR / "inbound_daily"
ZONA_COLS = ["A", "B", "C", "D"]
UPLOAD_DATE_COL = "_UPLOAD_DATE"

INBOUND_DETAIL_COLUMNS = [
    "Wilayah Grouping",
    "Cabang",
    "Zone",
    "Kecamatan",
    "AWB",
    "ID_ACCOUNT",
    "SHIPPER_NAME",
    "TGL_ENTRY",
    "CONSIGNEE_NAME",
    "ADDR1",
    "ADDR2",
    "ADDR3",
    "LAST_OFFICE_DATE",
    "LAST_WAREHOUSE_DATE",
    "NOREF",
    "ORIGIN",
    "DEST",
    "SERVICE",
    "QTY",
    "WEIGHT",
    "GOODS_DESCR",
    "INSURANCE_ID",
    "GOODS_VALUE",
    "INSURANCE_VALUE(+)",
    "AMOUNT",
    "INTRUCTION",
    "NOTICE",
    "HOLD_REASON",
    "RECEIVING",
    "RECEIVING_DATE",
    "OUTBOUND_MANIFEST",
    "OUTBOUND_MANIFEST_DATE",
    "INBOUND_MANIFEST",
    "USER_IM",
    "INBOUND_MANIFEST_DATE",
    "MANIFEST_TRANSIT_AGEN",
    "DATE_TRANSIT",
    "HVO_NO",
    "HVO_DATE",
    "HVO_HUB",
    "HVO_HUB_NAME",
    "HVO_HUB_DESTINATION",
    "HVO_HUB_DESTINATION_NAME",
    "HVI_NO",
    "HVI_DATE",
    "RUNSHEET_NO",
    "DATE_RUNSHEET",
    "RUNSHEET_COURIER_ID",
    "RUNSHEET_COURIER_NAME",
    "CODING",
    "STATUS_POD",
    "TGL_RECEIVED",
    "STATUS_LATITUDE",
    "STATUS_LONGITUDE",
    "AGING",
    "ETD",
    "SLA",
    "CARRER",
    "RECEIVED/REASON",
    "TGL_UPDATE_STATUS_POD",
    "WUS_OUTGOING_CODE",
    "WUS_REMARKS",
    "WUS_DATE",
    "INVOICED",
    "AWB_CANCEL",
    "COD_FLAG",
    "BILNOTE_FLAG",
    "BILNOTE_AMOUNT",
    "REFNO_UOB",
    "SCO_NO",
    "WO/DO/PO",
    "NO_INVOICE",
    "PAYMENT_TYPE",
    "DATE_1ST_ATTEMPT",
    "RESULT_1ST_ATTEMPT",
    "LATLONG_1ST_ATTEMPT",
    "DATE_2ND_ATTEMPT",
    "RESULT_2ND_ATTEMPT",
    "LATLONG_2ND_ATTEMPT",
    "DATE_LAST_ATTEMPT",
    "RESULT_LAST_ATTEMPT",
    "LATLONG_LAST_ATTEMPT",
    "PRA_RUNSHEET_NO",
    "PRA_RUNSHEET_NAME",
    "PRA_RUNSHEET_DATE",
    "CS3_DATE",
    "CONNOTE_RETURN_RT",
    "DATE_CONNOTE_RETURN_RT",
    "CONNOTE_RETURN_RF",
    "DATE_CONNOTE_RETURN_RF",
    "USER_CONNOTE",
    "USER_ZONE_CONNOTE",
    "CONFIRM_SHIPMENT_UNDEL",
    "TRANSIT_MANIFEST",
    "TRANSIT_MANIFEST_DATE",
    "TRANSIT_MANIFEST_USER",
    "IREG_MANIFEST",
    "IREG_CODE",
    "IREG_DATE",
    "URL_TTD",
    "URL_FOTO",
    "USER_OM",
    "USER_RECEIVING",
    "AGING_ONGOING",
    "CLAIM_NO",
    "CLAIM_DOC_NO",
    "CLAIM_DATE",
    "NO_CNOTE_FW",
    "ORIGIN_FW",
    "DEST_FW",
    "CODING_STATUS_FW",
    "DESC_STATUS_FW",
    "HBG_NO",
    "HBG_DATE",
    "1ST_HVO_NO",
    "1ST_HVO_DATE",
    "1ST_HVO_USER",
    "LAST_HVO_NO",
    "LAST_HVO_DATE",
    "LAST_HVO_USER",
    "MANIFEST_TRANSIT_SUBAGEN_NO",
    "MANIFEST_TRANSIT_SUBAGEN_DATE",
    "MANIFEST_INBOUND_SUBAGEN_NO",
    "MANIFEST_INBOUND_SUBAGEN_DATE",
    "BAG_NO",
    "LATEST_SM_NO",
    "LATEST_SM_DATE",
    "1ST_PREVIOUS_SM_NO",
    "1ST_PREVIOUS_SM_DATE",
    "2ND_PREVIOUS_SM_NO",
    "2ND_PREVIOUS_SM_DATE",
    "1ST_TRANSIT_MANIFEST_NO",
    "1ST_TRANSIT_MANIFEST_DATE",
    "2ND_TRANSIT_MANIFEST_NO",
    "2ND_TRANSIT_MANIFEST_DATE",
    "3RD_TRANSIT_MANIFEST_NO",
    "3RD_TRANSIT_MANIFEST_DATE",
    "LAST_TRANSIT_MANIFEST_NO",
    "LAST_TRANSIT_MANIFEST_DATE",
    "MTI_USER",
    "MTS_USER",
    "HO_COURIER_NO",
    "HO_COURIER_DATE",
    "WAREHOUSE_DATE",
    "OFFICE_DATE",
    "IRREG_REMAKS",
    "BPIK",
    "ZONE_USER_ENTRI",
    "CORRECT_DESTINATION",
    "CORRECT_SERVICE",
    "CORRECT_AMOUNT",
    "HACB_NO",
    "HACB_DATE",
    "HACB_USER",
    "HBAG_NO",
    "HBAG_DATE",
    "HBAG_USER",
    "PICKUP_DATE",
    "PICKUP_STATUS",
    "PICKUP_COURIER_ID",
    "1ST_RUNSHEET_DATE",
    "1ST_RUNSHEET_COURIERID",
    "URL_CHAT",
    "SINGLE_LEG",
    "LAST_DATE_DO",
    "NO_RCW",
    "DATE_RCW",
    "USER_RCW",
    "DATE_LPR",
    "NO_LPR",
    "NO_RDO",
    "DATE_RDO",
    "NO_DO",
    "PROJECT_KR",
    "HO_OFFICE_NO",
    "HO_OFFICE_DATE",
    "LATEST_SM_ORIGIN",
    "LATEST_SM_DEST",
    "1ST_PREVIOUS_SM_ORIGIN",
    "1ST_PREVIOUS_SM_DEST",
    "2ND_PREVIOUS_SM_ORIGIN",
    "2ND_PREVIOUS_SM_DEST",
    "STATUS_WEB",
    "TGL_TARIK_REPORT",
]

# Kolom hasil lookup DATABASE1 (Coding NTT), bukan dari file APEX.
LOOKUP_GEO_COLUMNS = ["Wilayah Grouping", "Cabang", "Zone", "Kecamatan"]
APEX_DATA_COLUMNS = [
    c
    for c in INBOUND_DETAIL_COLUMNS
    if c not in LOOKUP_GEO_COLUMNS
]

_ALIAS_TO_CANONICAL: Dict[str, str] = {
    col.strip().lower(): col for col in INBOUND_DETAIL_COLUMNS
}
_ALIAS_TO_CANONICAL.update({
    "wilayah_grouping": "Wilayah Grouping",
    "wilayahgrouping": "Wilayah Grouping",
    "zona": "Zone",
    "zone": "Zone",
    "cabang": "Cabang",
    "kecamatan": "Kecamatan",
    "no awb": "AWB",
    "no_awb": "AWB",
    "cnote": "AWB",
    "connote": "AWB",
    "insurance_value": "INSURANCE_VALUE(+)",
    "insurance value(+)": "INSURANCE_VALUE(+)",
    "insurance_value(+)": "INSURANCE_VALUE(+)",
    "received/reason": "RECEIVED/REASON",
    "wo/do/po": "WO/DO/PO",
    # legacy stored columns
    "wilayah_grouping_legacy": "Wilayah Grouping",
    "zona_legacy": "Zone",
    "cabang_legacy": "Cabang",
})


def _find_col(columns: Sequence[Any], aliases: Sequence[str]) -> Optional[str]:
    normalized = {str(c).strip().lower(): str(c) for c in columns}
    for alias in aliases:
        if alias in normalized:
            return normalized[alias]
    return None


def _cell_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "null", "nat"}:
        return ""
    return text


def _strip_apostrophe(value: Any) -> str:
    """Hapus tanda ' (Excel text-marker) dari AWB / ID_ACCOUNT."""
    text = _cell_str(value)
    if not text:
        return ""
    return text.replace("'", "").replace("\u2019", "").replace("`", "").strip()


def _normalize_lookup_key(value: Any) -> str:
    """Kunci VLOOKUP: trim + upper (DEST ↔ Coding)."""
    return _cell_str(value).upper()


def load_coding_ntt_geo_map() -> Dict[str, Dict[str, str]]:
    """DATABASE1: Coding → kolom geografis, exact-match seperti VLOOKUP FALSE.

    Kolom 4=Kecamatan, 8=ZONA, 9=CABANG, 10=WILAYAH GROUPING.
    """
    from services.paths import OPS_MASTER_DATA_DIR
    from utils.ops_master_data import (
        KIND_CODING_NTT,
        normalize_master_columns,
    )

    parsed = OPS_MASTER_DATA_DIR / KIND_CODING_NTT / f"{KIND_CODING_NTT}.csv"
    raw_xlsx = OPS_MASTER_DATA_DIR / KIND_CODING_NTT / f"{KIND_CODING_NTT}_raw.xlsx"
    raw_xls = OPS_MASTER_DATA_DIR / KIND_CODING_NTT / f"{KIND_CODING_NTT}_raw.xls"

    frame: Optional[pd.DataFrame] = None
    # Utamakan CSV ter-parse; fallback raw jika kolom wilayah kosong/typo
    if parsed.is_file():
        try:
            frame = pd.read_csv(parsed, dtype=str, keep_default_na=False)
            frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
            frame = normalize_master_columns(frame, KIND_CODING_NTT)
        except Exception:
            frame = None

    need_raw = (
        frame is None
        or frame.empty
        or "WILAYAH GROUPING" not in frame.columns
        or not frame["WILAYAH GROUPING"].astype(str).str.strip().any()
    )
    if need_raw:
        for path in (raw_xlsx, raw_xls):
            if not path.is_file():
                continue
            try:
                frame = read_excel_fast(path, dtype=str)
                frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
                frame = normalize_master_columns(frame, KIND_CODING_NTT)
                break
            except Exception:
                continue

    if frame is None or frame.empty:
        return {}

    coding = frame["Coding"].map(_normalize_lookup_key)
    # First match wins (VLOOKUP FALSE)
    mapping: Dict[str, Dict[str, str]] = {}
    for idx, key in enumerate(coding.tolist()):
        if not key or key in mapping:
            continue
        row = frame.iloc[idx]
        mapping[key] = {
            "Wilayah Grouping": _cell_str(row.get("WILAYAH GROUPING", "")),
            "Cabang": _cell_str(row.get("CABANG", "")),
            "Zone": _cell_str(row.get("ZONA", "")),
            "Kecamatan": _cell_str(row.get("Kecamatan", "")),
        }
    return mapping


def load_coding_ntt_wilayah_map() -> Dict[str, str]:
    """Kompatibilitas: peta Coding → WILAYAH GROUPING."""
    return {
        key: values["Wilayah Grouping"]
        for key, values in load_coding_ntt_geo_map().items()
    }


def apply_geo_from_dest(df: pd.DataFrame) -> pd.DataFrame:
    """Isi empat kolom hasil VLOOKUP DEST ke DATABASE1 (Coding NTT).

    - Kecamatan: kolom 4
    - Zone: kolom 8
    - Cabang: kolom 9
    - Wilayah Grouping: kolom 10
    """
    out = df.copy()
    if "DEST" not in out.columns:
        for col in LOOKUP_GEO_COLUMNS:
            if col not in out.columns:
                out[col] = ""
        return out

    lookup = load_coding_ntt_geo_map()
    dest_keys = out["DEST"].map(_normalize_lookup_key)
    for col in LOOKUP_GEO_COLUMNS:
        out[col] = dest_keys.map(
            lambda key, field=col: lookup.get(key, {}).get(field, "") if key else ""
        )
    return out


def apply_wilayah_grouping_from_dest(df: pd.DataFrame) -> pd.DataFrame:
    """Kompatibilitas untuk pemanggil lama; kini mengisi semua kolom geo."""
    return apply_geo_from_dest(df)


def _normalize_zona(value: Any) -> str:
    text = str(value or "").strip().upper()
    if not text:
        return ""
    match = re.search(r"\b([ABCD])\b", text)
    if match:
        return match.group(1)
    if text[:1] in ZONA_COLS:
        return text[:1]
    return ""


def _parse_date_value(value: Any) -> Optional[str]:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    if not text:
        return None
    try:
        as_float = float(text)
        if as_float > 20000:
            dt = pd.to_datetime(as_float, unit="D", origin="1899-12-30", errors="coerce")
            if pd.notna(dt):
                return dt.date().isoformat()
    except Exception:
        pass
    dt = pd.to_datetime(text, errors="coerce", format="%Y-%m-%d")
    if pd.isna(dt):
        dt = pd.to_datetime(text, dayfirst=True, errors="coerce")
    if pd.notna(dt):
        return dt.date().isoformat()
    return None


def daily_file_path(date_iso: str) -> Path:
    return INBOUND_DAILY_DIR / f"{date_iso}.csv"


def pivot_cache_path(date_iso: str) -> Path:
    return INBOUND_DAILY_DIR / f"{date_iso}.pivot.json"


def list_available_dates() -> List[str]:
    if not INBOUND_DAILY_DIR.exists():
        return []
    dates = []
    for p in INBOUND_DAILY_DIR.glob("*.csv"):
        if p.name.endswith(".meta") or p.name.endswith(".pivot.json"):
            continue
        stem = p.stem
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", stem):
            dates.append(stem)
    return sorted(dates, reverse=True)


def _canonicalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: Dict[str, str] = {}
    for raw in df.columns:
        key = str(raw).strip().lower()
        # map legacy internal names
        if key in {"wilayah_grouping", "tanggal", "zona", "cabang"} and key not in {
            c.lower() for c in INBOUND_DETAIL_COLUMNS
        }:
            legacy = {
                "wilayah_grouping": "Wilayah Grouping",
                "zona": "Zone",
                "cabang": "Cabang",
            }
            if key in legacy:
                rename_map[raw] = legacy[key]
                continue
        canonical = _ALIAS_TO_CANONICAL.get(key)
        if canonical and raw != canonical:
            rename_map[raw] = canonical
    if rename_map:
        df = df.rename(columns=rename_map)
    # drop duplicate columns keep first
    df = df.loc[:, ~pd.Index(df.columns).duplicated()].copy()
    return df


def _ensure_detail_columns(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in INBOUND_DETAIL_COLUMNS if c not in df.columns]
    if missing:
        df = pd.concat(
            [df, pd.DataFrame({c: "" for c in missing}, index=df.index)],
            axis=1,
        )
    keep = [c for c in INBOUND_DETAIL_COLUMNS if c in df.columns]
    extras = [c for c in df.columns if c not in keep and c != UPLOAD_DATE_COL]
    ordered = keep + extras
    if UPLOAD_DATE_COL in df.columns:
        ordered = ordered + [UPLOAD_DATE_COL]
    return df[ordered].fillna("")


def read_inbound_frame(date_iso: Optional[str] = None) -> pd.DataFrame:
    INBOUND_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    paths: List[Path] = []
    if date_iso:
        p = daily_file_path(date_iso)
        if p.is_file():
            paths = [p]
    else:
        paths = [daily_file_path(d) for d in list_available_dates()]

    frames: List[pd.DataFrame] = []
    for path in paths:
        try:
            df = pd.read_csv(path, dtype=str, keep_default_na=False)
            df.columns = [str(c).strip() for c in df.columns]
            df = _canonicalize_columns(df)
            if UPLOAD_DATE_COL not in df.columns:
                # legacy files used TANGGAL
                if "TANGGAL" in df.columns:
                    df[UPLOAD_DATE_COL] = df["TANGGAL"]
                else:
                    df[UPLOAD_DATE_COL] = path.stem
            df = _ensure_detail_columns(df)
            # Bersihkan ' pada AWB / ID_ACCOUNT (file lama / export Excel)
            if "AWB" in df.columns:
                df["AWB"] = df["AWB"].map(_strip_apostrophe)
            if "ID_ACCOUNT" in df.columns:
                df["ID_ACCOUNT"] = df["ID_ACCOUNT"].map(_strip_apostrophe)
            # Bake-once: geo sudah diisi saat upload; jangan VLOOKUP ulang saat read.
            frames.append(df)
        except Exception:
            continue
    if not frames:
        empty = pd.DataFrame(columns=INBOUND_DETAIL_COLUMNS + [UPLOAD_DATE_COL])
        return empty
    return pd.concat(frames, ignore_index=True)


def _read_apex_csv(raw: bytes) -> pd.DataFrame:
    """Baca CSV APEX cepat (c-engine) dengan fallback encoding/delimiter."""
    last_err: Optional[Exception] = None
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
        for sep in (",", ";", "\t"):
            try:
                frame = pd.read_csv(
                    io.BytesIO(raw),
                    dtype=str,
                    sep=sep,
                    encoding=encoding,
                    keep_default_na=False,
                    low_memory=False,
                )
                if frame.shape[1] >= 2:
                    return frame
            except Exception as e:
                last_err = e
                continue
        # sniffer fallback (lebih lambat)
        try:
            frame = pd.read_csv(
                io.BytesIO(raw),
                dtype=str,
                sep=None,
                engine="python",
                encoding=encoding,
                keep_default_na=False,
            )
            if frame.shape[1] >= 1:
                return frame
        except Exception as e:
            last_err = e
            continue
    raise ValueError(
        f"Gagal membaca file CSV APEX. Pastikan encoding/delimiter valid. ({last_err})"
    )


def parse_inbound_upload(raw: bytes, suffix: str, forced_date: str) -> pd.DataFrame:
    """Parse file APEX CSV → kolom AWB … TGL_TARIK_REPORT (vectorized, cepat).

    Empat kolom geo diisi VLOOKUP DEST ke Coding NTT (kolom 4, 8, 9, 10).
    """
    if suffix == ".csv":
        frame = _read_apex_csv(raw)
    else:
        frame = read_excel_fast(raw, dtype=str)

    # Bersihkan header (BOM, spasi)
    frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
    unnamed_mask = frame.columns.str.contains(r"^Unnamed", case=False, na=False)
    if unnamed_mask.any():
        frame = frame.loc[:, ~unnamed_mask]
    frame = _canonicalize_columns(frame)

    if "AWB" not in frame.columns:
        awb_found = _find_col(frame.columns, ["awb", "no awb", "cnote", "connote"])
        if awb_found:
            frame = frame.rename(columns={awb_found: "AWB"})
    if "AWB" not in frame.columns:
        raise ValueError("Kolom AWB tidak ditemukan di file APEX.")

    # Ambil hanya kolom APEX yang ada; sisanya diisi kosong lewat _ensure_detail_columns
    pieces: Dict[str, Any] = {}
    for col in LOOKUP_GEO_COLUMNS:
        pieces[col] = ""

    for col in APEX_DATA_COLUMNS:
        if col not in frame.columns:
            pieces[col] = ""
            continue
        series = frame[col]
        if isinstance(series, pd.DataFrame):
            series = series.iloc[:, 0]
        pieces[col] = series.map(_cell_str)

    out = pd.DataFrame(pieces, index=frame.index)
    out["AWB"] = out["AWB"].map(_strip_apostrophe)
    if "ID_ACCOUNT" in out.columns:
        out["ID_ACCOUNT"] = out["ID_ACCOUNT"].map(_strip_apostrophe)

    out = out[out["AWB"].astype(str).str.strip() != ""].copy()
    if out.empty:
        raise ValueError(
            "Tidak ada baris valid. Pastikan file APEX (CSV) punya kolom AWB berisi data."
        )

    out = _ensure_detail_columns(out)
    out = apply_geo_from_dest(out)
    out[UPLOAD_DATE_COL] = forced_date
    return out.fillna("")


def save_inbound_for_date(
    df: pd.DataFrame,
    date_iso: str,
    original_filename: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> Path:
    """Simpan seluruh baris upload ke file harian tanggal terpilih (replace)."""
    INBOUND_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    day_df = df.copy()
    day_df[UPLOAD_DATE_COL] = date_iso
    day_df = _ensure_detail_columns(day_df)
    if UPLOAD_DATE_COL not in day_df.columns:
        day_df[UPLOAD_DATE_COL] = date_iso
    else:
        # pastikan UPLOAD_DATE_COL tetap ada di urutan akhir
        cols = [c for c in day_df.columns if c != UPLOAD_DATE_COL] + [UPLOAD_DATE_COL]
        day_df = day_df[cols]
    day_df[UPLOAD_DATE_COL] = date_iso

    path = daily_file_path(date_iso)
    if path.exists():
        archive = INBOUND_DAILY_DIR / "archive"
        archive.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        path.replace(archive / f"{date_iso}_{ts}.csv")
        meta_old = path.with_suffix(path.suffix + ".meta")
        if meta_old.exists():
            meta_old.replace(archive / f"{date_iso}_{ts}.csv.meta")
        pivot_old = pivot_cache_path(date_iso)
        if pivot_old.exists():
            pivot_old.replace(archive / f"{date_iso}_{ts}.pivot.json")

    day_df.to_csv(path, index=False)
    meta = {
        "original_filename": original_filename,
        "uploaded_by": uploaded_by,
        "timestamp": datetime.now().isoformat(),
        "row_count": int(len(day_df)),
        "date": date_iso,
        "apex_columns": APEX_DATA_COLUMNS,
    }
    try:
        path.with_suffix(path.suffix + ".meta").write_text(
            json.dumps(meta, ensure_ascii=False), encoding="utf-8"
        )
    except OSError:
        pass
    # Bake pivot sekali saat save (hasil siap pakai).
    try:
        write_inbound_pivot_artifacts(date_iso, day_df)
    except Exception:
        pass
    return path


def _wilayah_series(df: pd.DataFrame) -> pd.Series:
    if "Wilayah Grouping" in df.columns:
        return df["Wilayah Grouping"]
    if "WILAYAH_GROUPING" in df.columns:
        return df["WILAYAH_GROUPING"]
    return pd.Series([""] * len(df))


def _cabang_series(df: pd.DataFrame) -> pd.Series:
    if "Cabang" in df.columns:
        return df["Cabang"]
    if "CABANG" in df.columns:
        return df["CABANG"]
    return pd.Series(["UNKNOWN"] * len(df))


def _zone_series(df: pd.DataFrame) -> pd.Series:
    if "Zone" in df.columns:
        return df["Zone"]
    if "ZONA" in df.columns:
        return df["ZONA"]
    return pd.Series([""] * len(df))


def _starts_with_koe(value: Any) -> bool:
    return _cell_str(value).upper().startswith("KOE")


def mask_un_inbound_rows(df: pd.DataFrame) -> pd.Series:
    """UN INBOUND: INBOUND_MANIFEST_DATE kosong (ORIGIN KOE* diizinkan)."""
    if df.empty:
        return pd.Series(dtype=bool)
    imd = (
        df["INBOUND_MANIFEST_DATE"]
        if "INBOUND_MANIFEST_DATE" in df.columns
        else pd.Series([""] * len(df), index=df.index)
    )
    return imd.map(_cell_str).eq("")


def mask_inbound_drop_rows(df: pd.DataFrame) -> pd.Series:
    """Hapus dari INBOUND hanya jika ketiga kriteria terpenuhi sekaligus."""
    if df.empty:
        return pd.Series(dtype=bool)
    om = (
        df["OUTBOUND_MANIFEST"]
        if "OUTBOUND_MANIFEST" in df.columns
        else pd.Series([""] * len(df), index=df.index)
    )
    om_s = om.map(_cell_str)
    outbound_non_koe = om_s.ne("") & ~om_s.map(_starts_with_koe)
    # IMD kosong + OUTBOUND_MANIFEST terisi ≠ KOE*
    return mask_un_inbound_rows(df) & outbound_non_koe


def mask_inbound_rows(df: pd.DataFrame) -> pd.Series:
    """INBOUND: Zone A–D, dikurangi baris yang memenuhi ketiga kriteria hapus."""
    if df.empty:
        return pd.Series(dtype=bool)
    zone_ok = _zone_series(df).map(_normalize_zona).isin(ZONA_COLS)
    return zone_ok & ~mask_inbound_drop_rows(df)


def _pivot_cabang_zone(filtered: pd.DataFrame) -> tuple[List[dict], Dict[str, int]]:
    """Hitung pivot Cabang × Zone A–D. Key baris: Cabang."""
    cabang_s = _cabang_series(filtered)
    zone_s = _zone_series(filtered)

    matrix: Dict[str, Dict[str, int]] = {}
    for cabang_raw, zona_raw in zip(cabang_s.tolist(), zone_s.tolist()):
        cabang = str(cabang_raw or "").strip() or "UNKNOWN"
        zona = _normalize_zona(zona_raw)
        if zona not in ZONA_COLS:
            continue
        if cabang not in matrix:
            matrix[cabang] = {z: 0 for z in ZONA_COLS}
        matrix[cabang][zona] += 1

    rows_out: List[dict] = []
    grand = {z: 0 for z in ZONA_COLS}
    grand["Grand Total"] = 0

    sortable = []
    for cabang, counts in matrix.items():
        total = sum(counts[z] for z in ZONA_COLS)
        sortable.append((cabang, counts, total))
    sortable.sort(key=lambda x: (-x[2], x[0]))

    for cabang, counts, total in sortable:
        rows_out.append({"Cabang": cabang, **counts, "Grand Total": total})
        for z in ZONA_COLS:
            grand[z] += counts[z]
        grand["Grand Total"] += total

    return rows_out, grand


def _compute_inbound_pivot_payload(
    df: pd.DataFrame,
    date_iso: str,
    wilayah_grouping: Optional[str] = None,
    kind: str = "inbound",
) -> dict:
    """Hitung pivot dari frame (tanpa baca ulang Master)."""
    kind_norm = (kind or "inbound").strip().lower()
    if kind_norm not in {"inbound", "un_inbound"}:
        kind_norm = "inbound"

    empty = {
        "date": date_iso,
        "kind": kind_norm,
        "columns": ZONA_COLS,
        "rows": [],
        "grand_total": {**{z: 0 for z in ZONA_COLS}, "Grand Total": 0},
        "wilayah_options": [],
        "available_dates": list_available_dates(),
        "message": None,
        "row_count_source": 0,
    }
    if df.empty:
        empty["message"] = f"Belum ada data untuk tanggal {date_iso}."
        return empty

    wilayah_s = _wilayah_series(df)
    wilayah_options = sorted(
        {str(v).strip() for v in wilayah_s.tolist() if str(v).strip()},
        key=lambda x: x.lower(),
    )

    filtered = df
    if wilayah_grouping and wilayah_grouping not in ("", "(All)", "All"):
        needle = wilayah_grouping.strip().lower()
        mask = wilayah_s.astype(str).str.strip().str.lower() == needle
        filtered = df[mask]

    if kind_norm == "un_inbound":
        bucket = filtered[mask_un_inbound_rows(filtered)].copy()
        label = "UN INBOUND"
    else:
        bucket = filtered[mask_inbound_rows(filtered)].copy()
        label = "INBOUND"

    rows_out, grand = _pivot_cabang_zone(bucket)

    return {
        "date": date_iso,
        "kind": kind_norm,
        "columns": ZONA_COLS,
        "rows": rows_out,
        "grand_total": grand,
        "wilayah_options": wilayah_options,
        "available_dates": list_available_dates(),
        "message": None
        if rows_out
        else (
            f"Tidak ada data {label} untuk dipivot (Cabang × Zone A–D) pada tanggal {date_iso}."
            if len(bucket)
            else f"Tidak ada data {label} untuk tanggal {date_iso}."
        ),
        "row_count_source": int(len(bucket)),
    }


def write_inbound_pivot_artifacts(
    date_iso: str,
    df: Optional[pd.DataFrame] = None,
) -> Path:
    """Bake pivot All (inbound + un_inbound) ke {date}.pivot.json."""
    INBOUND_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    frame = df if df is not None else read_inbound_frame(date_iso)
    payload = {
        "date": date_iso,
        "wilayah_options": sorted(
            {
                str(v).strip()
                for v in _wilayah_series(frame).tolist()
                if str(v).strip()
            },
            key=lambda x: x.lower(),
        ),
        "inbound": _compute_inbound_pivot_payload(frame, date_iso, None, "inbound"),
        "un_inbound": _compute_inbound_pivot_payload(
            frame, date_iso, None, "un_inbound"
        ),
        "baked_at": datetime.now().isoformat(timespec="seconds"),
    }
    # Drop nested available_dates duplication noise from kind payloads for storage size;
    # keep on kind payloads for API compatibility when served directly.
    path = pivot_cache_path(date_iso)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


def build_inbound_pivot(
    date_iso: str,
    wilayah_grouping: Optional[str] = None,
    kind: str = "inbound",
) -> dict:
    """Pivot Cabang × Zone — baca cache siap pakai bila All; filter wilayah rebuild ringan dari CSV.

    kind=inbound → PIVOT INBOUND
    kind=un_inbound → PIVOT UN INBOUND
    """
    kind_norm = (kind or "inbound").strip().lower()
    if kind_norm not in {"inbound", "un_inbound"}:
        kind_norm = "inbound"

    use_all_wilayah = (
        not wilayah_grouping or wilayah_grouping in ("", "(All)", "All")
    )

    if use_all_wilayah:
        ppath = pivot_cache_path(date_iso)
        if ppath.is_file():
            try:
                cached = json.loads(ppath.read_text(encoding="utf-8"))
                block = cached.get(kind_norm) or {}
                if isinstance(block, dict) and "rows" in block:
                    block = dict(block)
                    block["kind"] = kind_norm
                    block["available_dates"] = list_available_dates()
                    block["wilayah_options"] = cached.get(
                        "wilayah_options", block.get("wilayah_options", [])
                    )
                    return block
            except Exception:
                pass
        # Migrasi data lama: bake sekali lalu serve
        df = read_inbound_frame(date_iso)
        try:
            write_inbound_pivot_artifacts(date_iso, df)
        except Exception:
            pass
        return _compute_inbound_pivot_payload(df, date_iso, None, kind_norm)

    # Filter wilayah: hitung dari CSV (geo sudah baked), tanpa Master lookup
    df = read_inbound_frame(date_iso)
    return _compute_inbound_pivot_payload(df, date_iso, wilayah_grouping, kind_norm)


def list_inbound_detail(
    date_iso: str,
    wilayah_grouping: Optional[str] = None,
    page: int = 1,
    limit: int = 0,
    q: Optional[str] = None,
) -> dict:
    df = read_inbound_frame(date_iso)
    if df.empty:
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": 0,
            "pages": 0,
            "columns": INBOUND_DETAIL_COLUMNS,
            "message": f"Belum ada data detail untuk tanggal {date_iso}.",
        }

    wilayah_s = _wilayah_series(df)
    filtered = df
    if wilayah_grouping and wilayah_grouping not in ("", "(All)", "All"):
        needle = wilayah_grouping.strip().lower()
        filtered = df[wilayah_s.astype(str).str.strip().str.lower() == needle]

    # Only expose detail columns to UI (hide internal upload date)
    view = filtered.copy()
    for col in INBOUND_DETAIL_COLUMNS:
        if col not in view.columns:
            view[col] = ""
    view = view[INBOUND_DETAIL_COLUMNS].fillna("")
    records = view.to_dict(orient="records")
    records = filter_records_by_query(records, q)
    total = len(records)

    # limit <= 0 → unlimited (semua baris)
    if limit is None or int(limit) <= 0:
        return {
            "items": records,
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
            "columns": INBOUND_DETAIL_COLUMNS,
            "message": None,
        }

    result = paginate_list(
        records,
        page=page,
        limit=limit,
        max_limit=max(int(limit), 200),
    )
    result["columns"] = INBOUND_DETAIL_COLUMNS
    result["message"] = None
    return result


def _filter_by_wilayah(df: pd.DataFrame, wilayah_grouping: Optional[str]) -> pd.DataFrame:
    if df.empty:
        return df
    if not wilayah_grouping or wilayah_grouping in ("", "(All)", "All"):
        return df
    wilayah_s = _wilayah_series(df)
    needle = wilayah_grouping.strip().lower()
    return df[wilayah_s.astype(str).str.strip().str.lower() == needle].copy()


def _pivot_rows_to_dataframe(rows: List[dict], grand: Dict[str, int]) -> pd.DataFrame:
    cols = ["Cabang", *ZONA_COLS, "Grand Total"]
    if not rows:
        return pd.DataFrame(columns=cols)
    frame = pd.DataFrame(rows)
    for c in cols:
        if c not in frame.columns:
            frame[c] = 0 if c != "Cabang" else ""
    frame = frame[cols]
    foot = {"Cabang": "Grand Total", **{z: grand.get(z, 0) for z in ZONA_COLS}}
    foot["Grand Total"] = grand.get("Grand Total", 0)
    return pd.concat([frame, pd.DataFrame([foot])], ignore_index=True)


def export_inbound_excel(
    date_iso: str,
    wilayah_grouping: Optional[str] = None,
) -> bytes:
    """Excel 3 sheet: PIVOT (INBOUND+UN INBOUND), INBOUND, UN INBOUND."""
    df = read_inbound_frame(date_iso)
    filtered = _filter_by_wilayah(df, wilayah_grouping)

    if filtered.empty:
        inbound_df = pd.DataFrame(columns=INBOUND_DETAIL_COLUMNS)
        un_df = pd.DataFrame(columns=INBOUND_DETAIL_COLUMNS)
    else:
        for col in INBOUND_DETAIL_COLUMNS:
            if col not in filtered.columns:
                filtered[col] = ""
        inbound_df = filtered.loc[mask_inbound_rows(filtered), INBOUND_DETAIL_COLUMNS].fillna("")
        un_df = filtered.loc[mask_un_inbound_rows(filtered), INBOUND_DETAIL_COLUMNS].fillna("")

    inbound_rows, inbound_grand = _pivot_cabang_zone(inbound_df)
    un_rows, un_grand = _pivot_cabang_zone(un_df)
    pivot_in = _pivot_rows_to_dataframe(inbound_rows, inbound_grand)
    pivot_un = _pivot_rows_to_dataframe(un_rows, un_grand)

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # Sheet 1: kedua pivot berurutan, dipisah baris kosong + judul
        startrow = 0
        title_in = pd.DataFrame([["PIVOT INBOUND", f"Tanggal: {date_iso}"]])
        title_in.to_excel(
            writer, sheet_name="PIVOT", index=False, header=False, startrow=startrow
        )
        startrow += 2
        pivot_in.to_excel(writer, sheet_name="PIVOT", index=False, startrow=startrow)
        startrow += len(pivot_in) + 3
        title_un = pd.DataFrame([["PIVOT UN INBOUND", f"Tanggal: {date_iso}"]])
        title_un.to_excel(
            writer, sheet_name="PIVOT", index=False, header=False, startrow=startrow
        )
        startrow += 2
        pivot_un.to_excel(writer, sheet_name="PIVOT", index=False, startrow=startrow)

        inbound_df.to_excel(writer, sheet_name="INBOUND", index=False)
        un_df.to_excel(writer, sheet_name="UN INBOUND", index=False)

    return output.getvalue()

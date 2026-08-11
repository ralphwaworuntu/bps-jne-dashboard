"""Kolom, rumus, dan normalisasi Master Data Report Firstmile."""
from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

import pandas as pd
from utils.ops_master_data import (
    KIND_CODING_FIRSTMILE,
    KIND_CODING_NASIONAL,
    KIND_SERVICE,
)

FIRSTMILE_REPORT_DETAIL_COLUMNS: List[str] = [
    "Wilayah origin",
    "Cabang Origin",
    "RING",
    "Kategori Kiriman",
    "Shipment Type",
    "Service",
    "LT, Transaksi - Today",
    "LT, Transaksi - Rcc",
    "Kategori Waktu RCC",
    "Validasi RCC",
    "Validasi Manifest",
    "LT, RCC - OM",
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


def _norm_key(value: str) -> str:
    return " ".join(str(value or "").strip().lower().replace("_", " ").split())


# Alias → canonical (keys sudah dinormalisasi). Exact-match diutamakan di resolve.
_COLUMN_ALIASES: Dict[str, str] = {}
for _col in FIRSTMILE_REPORT_DETAIL_COLUMNS:
    _key = _norm_key(_col)
    # Jangan overwrite jika bentrok (Service vs SERVICE)
    if _key not in _COLUMN_ALIASES:
        _COLUMN_ALIASES[_key] = _col
_COLUMN_ALIASES.update(
    {
        "wilayah origin": "Wilayah origin",
        "wilayah_origin": "Wilayah origin",
        "cabang origin": "Cabang Origin",
        "cabang_origin": "Cabang Origin",
        "kota": "Cabang Origin",
        "city": "Cabang Origin",
        "branch": "Cabang Origin",
        "ring": "RING",
        "ring origin": "RING",
        "kategori kiriman": "Kategori Kiriman",
        "shipment type": "Shipment Type",
        "shipment_type": "Shipment Type",
        "service": "Service",
        "layanan": "Service",
        "lt transaksi today": "LT, Transaksi - Today",
        "lt, transaksi - today": "LT, Transaksi - Today",
        "lt transaksi - today": "LT, Transaksi - Today",
        "lt transaksi rcc": "LT, Transaksi - Rcc",
        "lt, transaksi - rcc": "LT, Transaksi - Rcc",
        "lt transaksi - rcc": "LT, Transaksi - Rcc",
        "kategori waktu rcc": "Kategori Waktu RCC",
        "validasi rcc": "Validasi RCC",
        "validasi manifest": "Validasi Manifest",
        "lt rcc om": "LT, RCC - OM",
        "lt, rcc - om": "LT, RCC - OM",
        "lt rcc - om": "LT, RCC - OM",
        "tanggal": "TGL_ENTRY",
        "date": "TGL_ENTRY",
        "tgl entry": "TGL_ENTRY",
        "tanggal entry": "TGL_ENTRY",
    }
)


def resolve_column_name(raw: str) -> Optional[str]:
    raw_s = str(raw or "").strip()
    if not raw_s:
        return None
    # Exact match dulu (penting untuk Service vs SERVICE)
    if raw_s in FIRSTMILE_REPORT_DETAIL_COLUMNS:
        return raw_s
    return _COLUMN_ALIASES.get(_norm_key(raw_s))


def _cell_str(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\ufeff", "").strip()
    return "" if text.lower() in {"nan", "none", "nat"} else text


def _left(text: Any, n: int) -> str:
    return _cell_str(text)[:n]


def _is_blank(value: Any) -> bool:
    return _cell_str(value) == ""


def _parse_datetime(value: Any) -> Optional[datetime]:
    text = _cell_str(value)
    if not text:
        return None
    for fmt in (
        "%m/%d/%y %H:%M",
        "%m/%d/%Y %H:%M",
        "%m/%d/%y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%y",
        "%m/%d/%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%d/%m/%y %H:%M",
        "%d/%m/%Y %H:%M",
        "%d/%m/%y",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        dt = pd.to_datetime(text, errors="coerce")
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except Exception:
        return None


def _days_excel(end_value: Any, start_value: Any) -> Optional[int]:
    end_dt = _parse_datetime(end_value)
    start_dt = _parse_datetime(start_value)
    if end_dt is None or start_dt is None:
        return None
    # Mimic Excel DAYS (difference in whole date serials).
    return (end_dt.date() - start_dt.date()).days


def _hour(value: Any) -> Optional[int]:
    dt = _parse_datetime(value)
    return None if dt is None else dt.hour


def _load_master_data_frame(kind: str, required_columns: Optional[List[str]] = None) -> Optional[pd.DataFrame]:
    """Reuse loader master data dari modul CTC."""
    from utils.ctc_inbound import _load_master_data_frame as _ctc_loader

    return _ctc_loader(kind, required_columns)


@lru_cache(maxsize=1)
def _coding_firstmile_lookup() -> Dict[str, Dict[str, str]]:
    frame = _load_master_data_frame(KIND_CODING_FIRSTMILE, ["Coding"])
    if frame is None:
        return {}
    mapping: Dict[str, Dict[str, str]] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("Coding", ""))
        if not key or key in mapping:
            continue
        mapping[key] = {
            "CABANG": _cell_str(row.get("CABANG", "")),
            "WILAYAH GROUPING": _cell_str(row.get("WILAYAH GROUPING", "")),
        }
    return mapping


@lru_cache(maxsize=1)
def _coding_nasional_ring_lookup() -> Dict[str, str]:
    frame = _load_master_data_frame(KIND_CODING_NASIONAL, ["RING ORIGIN"])
    if frame is None:
        return {}
    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        ring = _cell_str(row.get("RING ORIGIN", ""))
        if not ring:
            continue
        for key_col in ("SYSCODE", "CODE", "THREE LETTER CODE"):
            key = _cell_str(row.get(key_col, ""))
            if key and key not in mapping:
                mapping[key] = ring
    return mapping


@lru_cache(maxsize=1)
def _service_lookup() -> Dict[str, str]:
    frame = _load_master_data_frame(KIND_SERVICE, ["GROUPING", "GROUPING SERVICE"])
    if frame is None:
        return {}
    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("GROUPING", "")).upper()
        if key and key not in mapping:
            mapping[key] = _cell_str(row.get("GROUPING SERVICE", ""))
    return mapping


def _compute_kategori_kiriman(awb: str, service_raw: str) -> str:
    if _left(awb, 2).upper() == "RT":
        return "RT"
    if service_raw.upper() == "CML":
        return "CML"
    if _left(awb, 5).upper() in {"FWKOE", "FWLBJ"}:
        return "FW"
    if service_raw.upper() == "P2P":
        return "Roket"
    return "Penjualan"


def _compute_shipment_type(
    service_raw: str,
    kategori_kiriman: str,
    origin: str,
    dest: str,
) -> str:
    if _left(service_raw, 3).upper() == "CTC":
        return "INTRA CITY"
    if service_raw.upper() == "P2P":
        return "INTRA CITY"
    if kategori_kiriman.upper() == "ROKET":
        return "INTRA CITY"
    if _left(origin, 3).upper() == _left(dest, 3).upper() and _left(origin, 3):
        return "INTER CITY"
    if _left(service_raw, 4).upper() == "INTL":
        return "INTL"
    return "DOMESTIC"


def _compute_lt_transaksi_today(tgl_entry: str) -> str:
    days = _days_excel(datetime.now(), tgl_entry)
    if days is None:
        return ""
    return ">H+7" if days > 7 else f"H+{days}"


def _compute_validasi_rcc(awb_cancel: str, receiving: str) -> str:
    if awb_cancel.upper() == "Y":
        return "Cancel"
    if _is_blank(receiving):
        return "Un Receiving"
    return "Receiving"


def _compute_lt_transaksi_rcc(
    awb_cancel: str,
    validasi_rcc: str,
    receiving_date: str,
    tgl_entry: str,
) -> str:
    if awb_cancel.upper() == "Y":
        return "Cancel"
    if validasi_rcc == "Un Receiving":
        return "Un Receiving"
    days = _days_excel(receiving_date, tgl_entry)
    if days is None:
        return ""
    if days > 5:
        return ">H+5"
    if days < 0:
        return "Wrong Date"
    return f"H+{days}"


def _compute_kategori_waktu_rcc(
    lt_transaksi_rcc: str,
    receiving_date: str,
    tgl_entry: str,
) -> str:
    h = lt_transaksi_rcc
    hu = h.upper()
    if h == "Un Receiving":
        return "Un Receiving"
    if hu == "WRONG DATE":
        return "WRONG DATE"
    if hu == "CANCEL":
        return "CANCEL"
    days = _days_excel(receiving_date, tgl_entry)
    if days is None:
        return ""
    if days == 0:
        return "H+0"
    if days == 1:
        hr = _hour(receiving_date)
        if hr is None:
            return "H+1"
        if hr < 6:
            return "H+1 <06:00"
        if hr < 12:
            return "H+1 <12:00"
        return "H+1 >12:00"

    # Keep logic aligned with provided formula (uses HOUR(P2) in else branch).
    hr = _hour(receiving_date)
    if hr is not None and hr < 6:
        suffix = "<06:00"
    else:
        entry_hr = _hour(tgl_entry)
        suffix = "<12:00" if entry_hr is not None and entry_hr < 12 else ">12:00"
    return f"H+{days} {suffix}"


def _compute_validasi_manifest(awb_cancel: str, outbound_manifest: str) -> str:
    if awb_cancel.upper() == "Y":
        return "Cancel"
    if _is_blank(outbound_manifest):
        # Samakan dengan referensi rumus LT, RCC - OM (K2="Un Outbound Manifest").
        return "Un Outbound Manifest"
    return "Outbound Manifest"


def _compute_lt_rcc_om(
    kategori_waktu_rcc: str,
    validasi_rcc: str,
    validasi_manifest: str,
    shipment_type: str,
    outbound_manifest_date: str,
    receiving_date: str,
) -> str:
    kw = _cell_str(kategori_waktu_rcc).upper()
    vr = _cell_str(validasi_rcc).upper()
    vm = _cell_str(validasi_manifest).upper()
    st = _cell_str(shipment_type).upper()

    if kw == "CANCEL":
        return "Cancel"
    if vr == "UN RECEIVING":
        return "Un Receiving"
    # Rumus referensi: IF(K2="Un Outbound Manifest","Un Outbound Manifest",...)
    if vm == "UN OUTBOUND MANIFEST":
        return "Un Outbound Manifest"
    if st == "INTRA CITY":
        return "H+0"

    days = _days_excel(outbound_manifest_date, receiving_date)
    if days is None:
        return ""
    if days > 5:
        return ">H+5"
    if days < 0:
        return "Wrong Date"
    if days == 1:
        hr = _hour(outbound_manifest_date)
        if hr is None:
            return "H+1"
        if hr < 6:
            return "H+1 <06:00"
        if hr < 12:
            return "H+1 <12:00"
        return "H+1 >12:00"
    return f"H+{days}"


def _apply_firstmile_formulas(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    lookup_firstmile = _coding_firstmile_lookup()
    lookup_ring = _coding_nasional_ring_lookup()
    lookup_service = _service_lookup()

    wilayah_values: List[str] = []
    cabang_values: List[str] = []
    ring_values: List[str] = []
    kategori_values: List[str] = []
    shipment_values: List[str] = []
    service_values: List[str] = []
    lt_today_values: List[str] = []
    lt_rcc_values: List[str] = []
    kategori_rcc_values: List[str] = []
    validasi_rcc_values: List[str] = []
    validasi_manifest_values: List[str] = []
    lt_rcc_om_values: List[str] = []

    for _, row in out.iterrows():
        origin = _cell_str(row.get("ORIGIN", ""))
        service_raw = _cell_str(row.get("SERVICE", ""))
        awb = _cell_str(row.get("AWB", ""))
        dest = _cell_str(row.get("DEST", ""))
        tgl_entry = _cell_str(row.get("TGL_ENTRY", ""))
        receiving = _cell_str(row.get("RECEIVING", ""))
        receiving_date = _cell_str(row.get("RECEIVING_DATE", ""))
        outbound_manifest = _cell_str(row.get("OUTBOUND_MANIFEST", ""))
        outbound_manifest_date = _cell_str(row.get("OUTBOUND_MANIFEST_DATE", ""))
        awb_cancel = _cell_str(row.get("AWB_CANCEL", ""))

        fm = lookup_firstmile.get(origin, {})
        wilayah_origin = fm.get("WILAYAH GROUPING", "")
        cabang_origin = fm.get("CABANG", "")

        ring = lookup_ring.get(origin, "")
        if not ring:
            ring = lookup_ring.get(_left(origin, 3), "")

        kategori = _compute_kategori_kiriman(awb, service_raw)
        shipment = _compute_shipment_type(service_raw, kategori, origin, dest)
        service_mapped = lookup_service.get(_left(service_raw, 3).upper(), "")
        lt_today = _compute_lt_transaksi_today(tgl_entry)
        validasi_rcc = _compute_validasi_rcc(awb_cancel, receiving)
        lt_rcc = _compute_lt_transaksi_rcc(awb_cancel, validasi_rcc, receiving_date, tgl_entry)
        kategori_rcc = _compute_kategori_waktu_rcc(lt_rcc, receiving_date, tgl_entry)
        validasi_manifest = _compute_validasi_manifest(awb_cancel, outbound_manifest)
        lt_rcc_om = _compute_lt_rcc_om(
            kategori_rcc,
            validasi_rcc,
            validasi_manifest,
            shipment,
            outbound_manifest_date,
            receiving_date,
        )

        wilayah_values.append(wilayah_origin)
        cabang_values.append(cabang_origin)
        ring_values.append(ring)
        kategori_values.append(kategori)
        shipment_values.append(shipment)
        service_values.append(service_mapped)
        lt_today_values.append(lt_today)
        lt_rcc_values.append(lt_rcc)
        kategori_rcc_values.append(kategori_rcc)
        validasi_rcc_values.append(validasi_rcc)
        validasi_manifest_values.append(validasi_manifest)
        lt_rcc_om_values.append(lt_rcc_om)

    out["Wilayah origin"] = wilayah_values
    out["Cabang Origin"] = cabang_values
    out["RING"] = ring_values
    out["Kategori Kiriman"] = kategori_values
    out["Shipment Type"] = shipment_values
    out["Service"] = service_values
    out["LT, Transaksi - Today"] = lt_today_values
    out["LT, Transaksi - Rcc"] = lt_rcc_values
    out["Kategori Waktu RCC"] = kategori_rcc_values
    out["Validasi RCC"] = validasi_rcc_values
    out["Validasi Manifest"] = validasi_manifest_values
    out["LT, RCC - OM"] = lt_rcc_om_values
    return out


def canonicalize_firstmile_report_df(df: pd.DataFrame) -> pd.DataFrame:
    """Rename/isi header saja — tanpa formula Master (untuk baca artifact bake-once)."""
    if df is None or df.empty:
        return pd.DataFrame(columns=FIRSTMILE_REPORT_DETAIL_COLUMNS)

    rename: Dict[str, str] = {}
    used_targets: set[str] = set()
    for col in df.columns:
        target = resolve_column_name(str(col))
        if not target or target in used_targets:
            continue
        rename[col] = target
        used_targets.add(target)

    out = df.rename(columns=rename).copy()
    missing = [c for c in FIRSTMILE_REPORT_DETAIL_COLUMNS if c not in out.columns]
    if missing:
        missing_df = pd.DataFrame({c: [""] * len(out) for c in missing})
        out = pd.concat([out, missing_df], axis=1)
    out = out.fillna("")
    for col in FIRSTMILE_REPORT_DETAIL_COLUMNS:
        out[col] = out[col].astype(str)
    return out[FIRSTMILE_REPORT_DETAIL_COLUMNS]


def normalize_firstmile_report_df(df: pd.DataFrame) -> pd.DataFrame:
    """Rename + apply formulas Master — hanya untuk upload/job bake-once."""
    out = canonicalize_firstmile_report_df(df)
    if out.empty:
        return out
    out = _apply_firstmile_formulas(out)
    for col in FIRSTMILE_REPORT_DETAIL_COLUMNS:
        out[col] = out[col].astype(str)
    return out[FIRSTMILE_REPORT_DETAIL_COLUMNS]


def format_report_date(value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return "Unknown"
    try:
        dt = pd.to_datetime(raw, dayfirst=True, errors="coerce")
        if pd.isna(dt):
            return raw
        return dt.strftime("%d-%b")
    except Exception:
        return raw


def list_firstmile_report_rows(
    df: pd.DataFrame,
    *,
    service: Optional[str] = None,
) -> List[dict]:
    # Bake-once: CSV sudah berisi hasil formula; jangan VLOOKUP ulang.
    normalized = canonicalize_firstmile_report_df(df)
    if normalized.empty:
        return []

    filtered = normalized
    if service and service not in ("", "(All)", "All"):
        svc = service.strip()
        mask = filtered["Service"].astype(str).str.strip() == svc
        # fallback ke kolom SERVICE APEX jika Service kosong
        if not mask.any():
            mask = filtered["SERVICE"].astype(str).str.strip() == svc
        filtered = filtered[mask]

    records = filtered.to_dict(orient="records")
    for row in records:
        # helper untuk filter pivot di frontend
        tgl = str(row.get("TGL_ENTRY") or "").strip()
        row["_pivot_date"] = format_report_date(tgl)
        cabang = str(row.get("Cabang Origin") or "").strip()
        if not cabang:
            cabang = str(row.get("ORIGIN") or "").strip() or "Unknown"
        row["_pivot_city"] = cabang
    return records

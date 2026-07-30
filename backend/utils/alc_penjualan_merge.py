"""Gabungan data penjualan SCO + APEX berbasis AWB (setara VLOOKUP)."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import pandas as pd

PENJUALAN_COLUMNS = [
    "AWB",
    "ID_ACCOUNT",
    "NAMA DEBITUR",
    "CNOTE USER NAME",
    "TGL_ENTRY",
    "ORIGIN",
    "CABANG",
    "DEST",
    "SERVICE",
    "PAYMENT_TYPE",
    "QTY",
    "WEIGHT",
    "INSURANCE",
    "AMOUNT",
    "KOMISI",
]

# Kolom yang diambil dari masing-masing sumber (selain AWB sebagai kunci).
SCO_VALUE_COLUMNS = ["CNOTE USER NAME"]
APEX_VALUE_COLUMNS = [
    "ID_ACCOUNT",
    "TGL_ENTRY",
    "ORIGIN",
    "DEST",
    "SERVICE",
    "QTY",
    "WEIGHT",
    "INSURANCE",
    "AMOUNT",
    "PAYMENT_TYPE",
]

_ALIAS_MAP: Dict[str, str] = {col.strip().lower(): col for col in PENJUALAN_COLUMNS}
_ALIAS_MAP.update({
    "no awb": "AWB",
    "no_awb": "AWB",
    "no.awb": "AWB",
    "connote": "AWB",
    "cnote": "AWB",
    "cnote_no": "AWB",
    "cnote no": "AWB",
    "no cnote": "AWB",
    "no_cnote": "AWB",
    "awb no": "AWB",
    "awb_no": "AWB",
    "id account": "ID_ACCOUNT",
    "idaccount": "ID_ACCOUNT",
    "account id": "ID_ACCOUNT",
    "account_id": "ID_ACCOUNT",
    "nama_debitur": "NAMA DEBITUR",
    "namadebitur": "NAMA DEBITUR",
    "debitur": "NAMA DEBITUR",
    "cnote username": "CNOTE USER NAME",
    "cnote_user_name": "CNOTE USER NAME",
    "cnote_username": "CNOTE USER NAME",
    "cnote user": "CNOTE USER NAME",
    "username cnote": "CNOTE USER NAME",
    "user name": "CNOTE USER NAME",
    "tgl entry": "TGL_ENTRY",
    "tanggal entry": "TGL_ENTRY",
    "tanggal_entry": "TGL_ENTRY",
    "payment type": "PAYMENT_TYPE",
    "paymenttype": "PAYMENT_TYPE",
    "cabang/agen": "CABANG",
    "cabang agen": "CABANG",
    "branch": "CABANG",
    "destination": "DEST",
    "berat": "WEIGHT",
    "asuransi": "INSURANCE",
    "insurance_value": "INSURANCE",
    "insurance value": "INSURANCE",
    "insurance_value(+)": "INSURANCE",
    "insurance value(+)": "INSURANCE",
    "insurance value (+)": "INSURANCE",
    "insurance_value (+)": "INSURANCE",
    "nominal": "AMOUNT",
})


def normalize_penjualan_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: Dict[str, str] = {}
    for raw_col in df.columns:
        key = str(raw_col).strip().lower()
        canonical = _ALIAS_MAP.get(key)
        if canonical and raw_col != canonical:
            rename_map[raw_col] = canonical
    if rename_map:
        df = df.rename(columns=rename_map)
    for col in PENJUALAN_COLUMNS:
        if col not in df.columns:
            df[col] = ""
    # Jika ada duplikat nama kolom setelah rename, ambil yang pertama.
    df = df.loc[:, ~df.columns.duplicated()].copy()
    return df[PENJUALAN_COLUMNS].fillna("")


def _norm_awb(value: Any) -> str:
    text = str(value or "").strip().upper()
    if text.endswith(".0"):
        text = text[:-2]
    return text


def _records_to_frame(records: Sequence[dict]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame(columns=PENJUALAN_COLUMNS)
    df = pd.DataFrame(list(records))
    return normalize_penjualan_columns(df)


def _awb_series(df: pd.DataFrame) -> pd.Series:
    if "AWB" not in df.columns:
        return pd.Series(dtype=str)
    return df["AWB"].map(_norm_awb)


def build_awb_match_stats(sco_awbs: Iterable[str], apex_awbs: Iterable[str]) -> Dict[str, Any]:
    sco_set = {a for a in sco_awbs if a}
    apex_set = {a for a in apex_awbs if a}
    matched = sco_set & apex_set
    only_sco = sco_set - apex_set
    only_apex = apex_set - sco_set
    return {
        "sco_awb_count": len(sco_set),
        "apex_awb_count": len(apex_set),
        "matched_awb_count": len(matched),
        "only_sco_count": len(only_sco),
        "only_apex_count": len(only_apex),
        "awb_count_equal": len(sco_set) == len(apex_set),
        "awb_content_equal": sco_set == apex_set,
    }


def merge_sco_apex_by_awb(
    sco_records: Sequence[dict],
    apex_records: Sequence[dict],
) -> Tuple[List[dict], Dict[str, Any]]:
    """
    Gabungkan SCO + APEX seperti VLOOKUP pada kolom AWB.

    - Kunci: AWB (normalisasi trim + upper)
    - Dari SCO: CNOTE USER NAME
    - Dari APEX: ID_ACCOUNT, TGL_ENTRY, ORIGIN, DEST, SERVICE, QTY, WEIGHT,
      INSURANCE, AMOUNT, PAYMENT_TYPE
    - Hanya AWB yang ada di kedua file yang masuk tabel (inner join)
    - KOMISI & NAMA DEBITUR dikosongkan (akan diatur belakangan)
    """
    sco_df = _records_to_frame(sco_records)
    apex_df = _records_to_frame(apex_records)

    sco_df = sco_df.copy()
    apex_df = apex_df.copy()
    sco_df["_AWB_KEY"] = _awb_series(sco_df)
    apex_df["_AWB_KEY"] = _awb_series(apex_df)

    sco_df = sco_df[sco_df["_AWB_KEY"] != ""].drop_duplicates(subset=["_AWB_KEY"], keep="first")
    apex_df = apex_df[apex_df["_AWB_KEY"] != ""].drop_duplicates(subset=["_AWB_KEY"], keep="first")

    stats = build_awb_match_stats(sco_df["_AWB_KEY"].tolist(), apex_df["_AWB_KEY"].tolist())

    if sco_df.empty or apex_df.empty:
        return [], stats

    sco_lookup = sco_df.set_index("_AWB_KEY", drop=False)
    apex_lookup = apex_df.set_index("_AWB_KEY", drop=False)
    matched_keys = sorted(set(sco_lookup.index) & set(apex_lookup.index))

    rows: List[dict] = []
    for key in matched_keys:
        sco_row = sco_lookup.loc[key]
        apex_row = apex_lookup.loc[key]
        # Jika duplicate index masih tersisa, ambil baris pertama.
        if isinstance(sco_row, pd.DataFrame):
            sco_row = sco_row.iloc[0]
        if isinstance(apex_row, pd.DataFrame):
            apex_row = apex_row.iloc[0]

        cabang_val = str(apex_row.get("CABANG", "") or sco_row.get("CABANG", "") or "").strip()
        row = {
            "AWB": key,
            "ID_ACCOUNT": str(apex_row.get("ID_ACCOUNT", "") or ""),
            "NAMA DEBITUR": "",
            "CNOTE USER NAME": str(sco_row.get("CNOTE USER NAME", "") or ""),
            "TGL_ENTRY": str(apex_row.get("TGL_ENTRY", "") or ""),
            "ORIGIN": str(apex_row.get("ORIGIN", "") or ""),
            "CABANG": cabang_val,
            "DEST": str(apex_row.get("DEST", "") or ""),
            "SERVICE": str(apex_row.get("SERVICE", "") or ""),
            "PAYMENT_TYPE": str(apex_row.get("PAYMENT_TYPE", "") or ""),
            "QTY": str(apex_row.get("QTY", "") or ""),
            "WEIGHT": str(apex_row.get("WEIGHT", "") or ""),
            "INSURANCE": str(apex_row.get("INSURANCE", "") or ""),
            "AMOUNT": str(apex_row.get("AMOUNT", "") or ""),
            "KOMISI": "",
        }
        rows.append(row)

    stats["merged_row_count"] = len(rows)
    return rows, stats


def filter_merged_by_cabang(records: Sequence[dict], cabang_nama: str) -> List[dict]:
    """
    Plotting by Cabang (fase awal):
    cocokkan nama cabang terhadap kolom CABANG atau CNOTE USER NAME.
    """
    needle = (cabang_nama or "").strip().lower()
    if not needle:
        return list(records)

    out: List[dict] = []
    for row in records:
        cabang = str(row.get("CABANG", "") or "").strip().lower()
        cnote_user = str(row.get("CNOTE USER NAME", "") or "").strip().lower()
        origin = str(row.get("ORIGIN", "") or "").strip().lower()
        if needle == cabang or needle in cabang or needle == cnote_user or needle in cnote_user or needle == origin:
            plotted = dict(row)
            # Pastikan kolom CABANG terisi nama cabang yang dipilih.
            if not plotted.get("CABANG"):
                plotted["CABANG"] = cabang_nama.strip()
            out.append(plotted)
    return out


def pair_uploads_by_period(
    uploads: Sequence[Any],
) -> List[Tuple[Optional[Any], Optional[Any]]]:
    """Pasangkan upload SCO & APEX per (year, month)."""
    by_period: Dict[Tuple[int, int], Dict[str, Any]] = {}
    for rec in uploads:
        key = (int(rec.year), int(rec.month))
        bucket = by_period.setdefault(key, {"SCO": None, "APEX": None})
        kind = str(rec.kind).upper()
        if kind in ("SCO", "APEX"):
            # Ambil yang terbaru jika ada lebih dari satu.
            prev = bucket[kind]
            if prev is None or rec.created_at > prev.created_at:
                bucket[kind] = rec

    pairs: List[Tuple[Optional[Any], Optional[Any]]] = []
    for key in sorted(by_period.keys(), reverse=True):
        bucket = by_period[key]
        pairs.append((bucket["SCO"], bucket["APEX"]))
    return pairs

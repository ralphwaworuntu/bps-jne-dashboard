"""All Inbound & CTC — parse upload, enrichment kolom formula, simpan/baca periode."""
from __future__ import annotations

import io
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from services.paths import ALL_SHIPMENT_DIR
from utils.inbound_pivot import _cell_str, _read_apex_csv, _strip_apostrophe
from utils.page_util import filter_records_by_query, paginate_list

CTC_DAILY_DIR = ALL_SHIPMENT_DIR / "ctc_daily"
CTC_MONTHLY_DIR = ALL_SHIPMENT_DIR / "ctc_monthly"
UPLOAD_DATE_COL = "_UPLOAD_DATE"
PERIOD_MODE_COL = "_PERIOD_MODE"
UPDATE_DAY_COL = "_UPDATE_DAY"

# IFERROR fallback akhir rumus SLA BREACH (beda dari CUST NAME — tanpa spasi trailing)
SLA_BREACH_DEFAULT = "Non CCC"

# Referensi kolom: Ekstraksi_Heading_Kolom.md
# CTC sheet: A=CUST NAME, D=3LC Origin Regional, O=ZONA, AN=ID_ACCOUNT,
#            AX=ORIGIN, AY=DEST, AZ=SERVICE
# SLA Shopee: A=KOLOM DUMMY (key), H=SLA_BREACH (VLOOKUP kolom 8)
# SLA Lazada range F6:AH455 — F=DESTINATION (kunci AY), indeks VLOOKUP 15/16/17/27/28/29
# Account: I=SLA Breach Zona A&B (kolom 9), J=SLA Breach Zona C&D (kolom 10)

SLA_SHOPEE_BREACH_VLOOKUP_COL = 8

# (LEFT(SERVICE,3), 3LC Origin Regional) → indeks kolom relatif range F:AH
LAZADA_BREACH_VLOOKUP_COL: Dict[tuple[str, str], int] = {
    ("JTR", "Jabo, Jabar, Banten"): 27,
    ("JTR", "Jateng, Jatim, Bali"): 28,
    ("JTR", "Others"): 29,
    ("REG", "Jabo, Jabar, Banten"): 15,
    ("REG", "Jateng, Jatim, Bali"): 16,
    ("REG", "Others"): 17,
}

ACCOUNT_SLA_BREACH_AB_VLOOKUP_COL = 9   # I — SLA Breach Zona A & B
ACCOUNT_SLA_BREACH_CD_VLOOKUP_COL = 10  # J — SLA Breach Zona C & D

# IFERROR(VLOOKUP(...), "NON CCC ") — trailing space sesuai template Excel
CUST_NAME_DEFAULT = "NON CCC "
HOLD_DEFAULT = "NON CCC "
SLA_HOLD_DEFAULT = "Non CCC"

# Account (Ekstraksi_Heading_Kolom.md): E=Hold/ Not Hold (5), F=SLA Hold (6)
ACCOUNT_HOLD_FIELD = "Hold/ Not Hold"
ACCOUNT_SLA_HOLD_FIELD = "SLA Hold"

# Coding NTT / tabelcoding (md Excel): D=Kecamatan(4), G=ZONA(7), H=CABANG(8), I=WILAYAH(9)
# DB kita punya Status Cabang ekstra — lookup by nama kolom, bukan indeks mentah.
CODING_NTT_FIELD_KECAMATAN = "Kecamatan"
CODING_NTT_FIELD_ZONA = "ZONA"
CODING_NTT_FIELD_CABANG = "CABANG"
CODING_NTT_FIELD_WILAYAH = "WILAYAH GROUPING"

# ID Kurir named range "ID": L=Courier ID(1), M=Cabang(2), N=Agen(3) — VLOOKUP col 3
ID_KURIR_VLOOKUP_FIELD = "Agen"

CTC_DETAIL_COLUMNS = [
    "CUST NAME",
    "INDUSTRY",
    "3LC Origin",
    "3LC Origin Regional",
    "SLA BREACH",
    "MAXIMAL BREACH",
    "SISA AGING",
    "UPDATE SLA",
    "HOLD / NOT HOLD",
    "SLA HOLD",
    "WILAYAH GROUPING",
    "CABANG BY CODING DEST",
    "CABANG BY RUNSHEET COURIER",
    "KECAMATAN",
    "ZONA",
    "UPDATE SERVICE",
    "KATEGORY SERVICE",
    "JAM TRANSAKSI",
    "UPDATE TRANSAKSI",
    "DAYS",
    "Kategori Inbound",
    "POTENSI AUTOCLOSE",
    "REMINDING DAYS",
    "TANGGAL ACUAN AUTOCLOSE",
    "STATUS TRACING",
    "UMUR KIRIMAN",
    "TR - IM",
    "TR - 1ST ATTEMP",
    "TR - DELIVERED",
    "LT IM - TODAY",
    "LT MTI - TODAY",
    "LT IM - 1ST ATTEMPT",
    "1ST ATTEMPT DATE FIX",
    "REMINDER 1ST ATTEMPT",
    "VALIDASI OPEN POD",
    "VALIDASI STATUS NASIONAL",
    "VALIDASI STATUS CABANG",
    "OPEN/CLOSE",
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

_ALIAS_TO_CANONICAL: Dict[str, str] = {
    col.strip().lower(): col for col in CTC_DETAIL_COLUMNS
}
_ALIAS_TO_CANONICAL.update({
    "cust_name": "CUST NAME",
    "cust name": "CUST NAME",
    "id account": "ID_ACCOUNT",
    "idaccount": "ID_ACCOUNT",
    "account id": "ID_ACCOUNT",
    "no awb": "AWB",
    "cnote": "AWB",
    "connote": "AWB",
})


def _account_lookup_key(value: Any) -> str:
    """Kunci VLOOKUP ID_ACCOUNT ↔ No. Account (exact match, FALSE)."""
    text = _strip_apostrophe(value)
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".", 1)[0]
    return text


def _load_master_data_frame(
    kind: str,
    required_columns: Optional[List[str]] = None,
) -> Optional[pd.DataFrame]:
    """Baca CSV ter-parse Master Data Operations, fallback ke raw Excel."""
    from services.paths import OPS_MASTER_DATA_DIR
    from utils.ops_master_data import normalize_master_columns

    parsed = OPS_MASTER_DATA_DIR / kind / f"{kind}.csv"
    raw_xlsx = OPS_MASTER_DATA_DIR / kind / f"{kind}_raw.xlsx"
    raw_xls = OPS_MASTER_DATA_DIR / kind / f"{kind}_raw.xls"

    frame: Optional[pd.DataFrame] = None
    if parsed.is_file():
        try:
            frame = pd.read_csv(parsed, dtype=str, keep_default_na=False)
            frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
            frame = normalize_master_columns(frame, kind)
        except Exception:
            frame = None

    if frame is None or frame.empty:
        for path in (raw_xlsx, raw_xls):
            if not path.is_file():
                continue
            try:
                frame = pd.read_excel(path, dtype=str)
                frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
                frame = normalize_master_columns(frame, kind)
                break
            except Exception:
                continue

    if frame is None or frame.empty:
        return None
    if required_columns:
        missing = [c for c in required_columns if c not in frame.columns]
        if missing:
            return None
    return frame


def _account_field_map(field: str) -> Dict[str, str]:
    """Map No. Account → kolom tertentu di Master Data Account."""
    frame = _load_master_data_frame("account", ["No. Account", field])
    if frame is None:
        return {}

    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _account_lookup_key(row.get("No. Account", ""))
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get(field, ""))
    return mapping


def load_account_cust_name_map() -> Dict[str, str]:
    """Database Account (accountup2603): No. Account → Cust Name (kolom 2).

    =IFERROR(VLOOKUP(AN2, accountup2603, 2, FALSE), "NON CCC ")
    """
    return _account_field_map("Cust Name")


def load_account_industry_map() -> Dict[str, str]:
    """Database Account: No. Account → CUST_INDUSTRY_NEW (kolom 8).

    =IFERROR(VLOOKUP(AN2, accountup2603, 8, FALSE), "NON CCC ")
    """
    return _account_field_map("CUST_INDUSTRY_NEW")


def _apply_account_vlookup(
    df: pd.DataFrame,
    target_col: str,
    field_map: Dict[str, str],
) -> pd.DataFrame:
    out = df.copy()
    if "ID_ACCOUNT" not in out.columns:
        out[target_col] = CUST_NAME_DEFAULT
        return out

    keys = out["ID_ACCOUNT"].map(_account_lookup_key)

    def _resolve(key: str) -> str:
        if not key:
            return CUST_NAME_DEFAULT
        return field_map.get(key, CUST_NAME_DEFAULT)

    out[target_col] = keys.map(_resolve)
    return out


def apply_cust_name_from_account(df: pd.DataFrame) -> pd.DataFrame:
    """Isi CUST NAME dari VLOOKUP ID_ACCOUNT ke Master Data Account."""
    return _apply_account_vlookup(df, "CUST NAME", load_account_cust_name_map())


def apply_industry_from_account(df: pd.DataFrame) -> pd.DataFrame:
    """Isi INDUSTRY dari VLOOKUP ID_ACCOUNT kolom 8 (CUST_INDUSTRY_NEW)."""
    return _apply_account_vlookup(df, "INDUSTRY", load_account_industry_map())


def apply_3lc_origin(df: pd.DataFrame) -> pd.DataFrame:
    """=LEFT(ORIGIN, 3) — AX = ORIGIN di data APEX."""
    out = df.copy()
    if "ORIGIN" not in out.columns:
        out["3LC Origin"] = ""
        return out
    out["3LC Origin"] = out["ORIGIN"].map(lambda v: _cell_str(v)[:3])
    return out


def load_lazada_origin_regional_map() -> Dict[str, str]:
    """Origin Grouping Lazada: 3LC ORIGIN → ORIGIN (kolom 3).

    =IF(CUST NAME="LAZADA", VLOOKUP(3LC Origin, 'Database SLA Lazada'!A:C, 3, FALSE), "")
  """
    from utils.ops_master_data import KIND_ORIGIN_GROUPING_LAZADA

    frame = _load_master_data_frame(
        KIND_ORIGIN_GROUPING_LAZADA,
        ["3LC ORIGIN", "ORIGIN"],
    )
    if frame is None:
        return {}

    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("3LC ORIGIN", "")).upper()
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get("ORIGIN", ""))
    return mapping


def apply_3lc_origin_regional(df: pd.DataFrame) -> pd.DataFrame:
    """=IF(CUST NAME="LAZADA", VLOOKUP(3LC Origin, Database SLA Lazada, 3, FALSE), "")."""
    out = df.copy()
    lookup = load_lazada_origin_regional_map()
    cust_names = (
        out["CUST NAME"].map(_cell_str)
        if "CUST NAME" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )
    three_lc = (
        out["3LC Origin"].map(_cell_str)
        if "3LC Origin" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )

    def _resolve(cust_name: str, tlc: str) -> str:
        if cust_name.strip().upper() != "LAZADA":
            return ""
        if not tlc:
            return ""
        return lookup.get(tlc.strip().upper(), "")

    out["3LC Origin Regional"] = [
        _resolve(c, t) for c, t in zip(cust_names.tolist(), three_lc.tolist())
    ]
    return out


def _normalize_cust_name(value: Any) -> str:
    return _cell_str(value).strip().upper()


def _service_prefix(value: Any) -> str:
    return _cell_str(value)[:3].upper()


def _zona_letter(value: Any) -> str:
    z = _cell_str(value).strip().upper()
    if len(z) >= 1 and z[0] in {"A", "B", "C", "D"}:
        return z[0]
    return ""


def load_sla_shopee_breach_map() -> Dict[str, str]:
    """=VLOOKUP(LEFT(SERVICE,3)&ORIGIN&DEST, 'Database SLA Shopee'!A:I, 8, FALSE).

    Database SLA Shopee (Ekstraksi_Heading_Kolom.md): A=KOLOM DUMMY, H=SLA_BREACH.
    """
    from utils.ops_master_data import KIND_SLA_SHOPEE, SLA_SHOPEE_COLUMNS

    frame = _load_master_data_frame(KIND_SLA_SHOPEE, ["KOLOM DUMMY"])
    if frame is None:
        return {}

    shopee_cols = [c for c in SLA_SHOPEE_COLUMNS if c in frame.columns]
    if "KOLOM DUMMY" not in shopee_cols:
        return {}
    breach_col = (
        shopee_cols[SLA_SHOPEE_BREACH_VLOOKUP_COL - 1]
        if len(shopee_cols) >= SLA_SHOPEE_BREACH_VLOOKUP_COL
        else "SLA_BREACH"
    )

    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("KOLOM DUMMY", ""))
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get(breach_col, ""))
    return mapping


def _lazada_f_ah_columns(frame: pd.DataFrame) -> List[str]:
    """Kolom range F:AH — mulai DESTINATION (Excel F = lookup kolom 1)."""
    cols = list(frame.columns)
    if "DESTINATION" not in cols:
        return cols
    return cols[cols.index("DESTINATION") :]


def load_sla_lazada_breach_by_dest() -> Dict[str, List[str]]:
    """VLOOKUP(AY, 'Database SLA Lazada'!F6:AH455, N, FALSE) — kunci = DEST."""
    from utils.ops_master_data import KIND_SLA_LAZADA

    frame = _load_master_data_frame(KIND_SLA_LAZADA, ["DESTINATION"])
    if frame is None:
        return {}

    range_cols = _lazada_f_ah_columns(frame)
    mapping: Dict[str, List[str]] = {}
    for _, row in frame.iterrows():
        dest = _cell_str(row.get("DESTINATION", ""))
        if not dest or dest in mapping:
            continue
        mapping[dest] = [_cell_str(row.get(col, "")) for col in range_cols]
    return mapping


def _lazada_vlookup_value(row_values: List[str], vlookup_col: int) -> str:
    """Ambil nilai kolom ke-N relatif range F:AH (F = indeks 1)."""
    if vlookup_col < 1 or vlookup_col > len(row_values):
        return ""
    return row_values[vlookup_col - 1]


def load_account_sla_breach_ab_map() -> Dict[str, str]:
    """Account kolom 9 (I) — SLA Breach Zona A & B."""
    return _account_field_map("SLA Breach Zona A & B")


def load_account_sla_breach_cd_map() -> Dict[str, str]:
    """Account kolom 10 (J) — SLA Breach Zona C & D."""
    return _account_field_map("SLA Breach Zona C & D")


def resolve_sla_breach(
    cust_name: str,
    service: str,
    origin: str,
    dest: str,
    regional: str,
    zona: str,
    id_account: str,
    shopee_map: Dict[str, str],
    lazada_map: Dict[str, List[str]],
    account_ab: Dict[str, str],
    account_cd: Dict[str, str],
) -> str:
    """Nested IF SLA BREACH — selaras Ekstraksi_Heading_Kolom.md."""
    cust = _normalize_cust_name(cust_name)

    # IF(A2="Shopee", VLOOKUP(LEFT(AZ,3)&AX&AY, SLA Shopee, 8, FALSE), ...)
    if cust == "SHOPEE":
        key = f"{_service_prefix(service)}{_cell_str(origin)}{_cell_str(dest)}"
        return shopee_map.get(key, "")

    # Cabang LAZADA — VLOOKUP(AY, SLA Lazada F:AH, 15|16|17|27|28|29, FALSE)
    if cust == "LAZADA":
        row_values = lazada_map.get(_cell_str(dest), [])
        if not row_values:
            return ""
        svc_kind = "JTR" if _service_prefix(service) == "JTR" else "REG"
        reg = _cell_str(regional)
        vlookup_col = LAZADA_BREACH_VLOOKUP_COL.get((svc_kind, reg))
        if not vlookup_col:
            return ""
        return _lazada_vlookup_value(row_values, vlookup_col)

    # IFERROR(IF(OR(O="A",O="B"), VLOOKUP(AN, account, 9, FALSE), ...), "Non CCC")
    acct_key = _account_lookup_key(id_account)
    zone = _zona_letter(zona)
    if zone in ("A", "B"):
        if not acct_key or acct_key not in account_ab:
            return SLA_BREACH_DEFAULT
        return account_ab[acct_key]
    if zone in ("C", "D"):
        if not acct_key or acct_key not in account_cd:
            return SLA_BREACH_DEFAULT
        return account_cd[acct_key]
    return "FALSE"


def apply_sla_breach(df: pd.DataFrame) -> pd.DataFrame:
    """Nested IF SLA BREACH: Shopee → Lazada (JTR/REG) → Account by ZONA."""
    out = df.copy()
    shopee_map = load_sla_shopee_breach_map()
    lazada_map = load_sla_lazada_breach_by_dest()
    account_ab = load_account_sla_breach_ab_map()
    account_cd = load_account_sla_breach_cd_map()

    def _row_get(col: str, idx: int) -> str:
        if col not in out.columns:
            return ""
        return _cell_str(out.at[idx, col])

    values: List[str] = []
    for idx in out.index:
        values.append(
            resolve_sla_breach(
                _row_get("CUST NAME", idx),
                _row_get("SERVICE", idx),
                _row_get("ORIGIN", idx),
                _row_get("DEST", idx),
                _row_get("3LC Origin Regional", idx),
                _row_get("ZONA", idx),
                _row_get("ID_ACCOUNT", idx),
                shopee_map,
                lazada_map,
                account_ab,
                account_cd,
            )
        )
    out["SLA BREACH"] = values
    return out


def _is_lazada_or_shopee(cust_name: Any) -> bool:
    return _normalize_cust_name(cust_name) in {"LAZADA", "SHOPEE"}


def _parse_apex_datetime(value: Any) -> Optional[datetime]:
    """Parse TGL_ENTRY APEX: '07/24/26 14:25' / '07/24/2026' / ISO."""
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
        "%d/%m/%y %H:%M",
        "%d/%m/%Y %H:%M",
        "%d-%m-%y",
        "%d-%m-%Y",
    ):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    try:
        parsed = pd.to_datetime(text, dayfirst=False, errors="coerce")
        if pd.isna(parsed):
            return None
        return parsed.to_pydatetime()
    except Exception:
        return None


def _parse_stored_date(value: Any) -> Optional[date]:
    """Parse MAXIMAL BREACH / tanggal tersimpan (YYYY-MM-DD atau APEX)."""
    text = _cell_str(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%y", "%m/%d/%Y", "%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    dt = _parse_apex_datetime(text)
    return dt.date() if dt else None


def _to_int_days(value: Any) -> Optional[int]:
    text = _cell_str(value).replace(",", "").strip()
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def apply_maximal_breach(df: pd.DataFrame) -> pd.DataFrame:
    """=IF(OR(A="LAZADA", A="SHOPEE"), AP+E, "") — TGL_ENTRY + SLA BREACH hari."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        cust = out.at[idx, "CUST NAME"] if "CUST NAME" in out.columns else ""
        if not _is_lazada_or_shopee(cust):
            values.append("")
            continue
        entry = _parse_apex_datetime(
            out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
        )
        days = _to_int_days(out.at[idx, "SLA BREACH"] if "SLA BREACH" in out.columns else "")
        if entry is None or days is None:
            values.append("")
            continue
        values.append((entry + timedelta(days=days)).strftime("%Y-%m-%d"))
    out["MAXIMAL BREACH"] = values
    return out


def apply_sisa_aging(df: pd.DataFrame) -> pd.DataFrame:
    """=IF(OR(A="LAZADA",A="SHOPEE"), DAYS(F, TODAY()), "") — F=MAXIMAL BREACH."""
    out = df.copy()
    today = date.today()
    values: List[str] = []
    for idx in out.index:
        cust = out.at[idx, "CUST NAME"] if "CUST NAME" in out.columns else ""
        if not _is_lazada_or_shopee(cust):
            values.append("")
            continue
        max_breach = _parse_stored_date(
            out.at[idx, "MAXIMAL BREACH"] if "MAXIMAL BREACH" in out.columns else ""
        )
        if max_breach is None:
            values.append("")
            continue
        # Excel DAYS(end, start) = end - start
        values.append(str((max_breach - today).days))
    out["SISA AGING"] = values
    return out


def apply_update_sla(df: pd.DataFrame) -> pd.DataFrame:
    """=IF(OR(A=SHOPEE|LAZADA), IF(G<7,"OVER SLA", IF(AND(G>7,G<11),"MENDEKATI OVER SLA", IF(G>10,"ON SLA"))), "")."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        cust = out.at[idx, "CUST NAME"] if "CUST NAME" in out.columns else ""
        if not _is_lazada_or_shopee(cust):
            values.append("")
            continue
        g = _to_int_days(out.at[idx, "SISA AGING"] if "SISA AGING" in out.columns else "")
        if g is None:
            values.append("")
            continue
        if g < 7:
            values.append("OVER SLA")
        elif g > 7 and g < 11:
            values.append("MENDEKATI OVER SLA")
        elif g > 10:
            values.append("ON SLA")
        else:
            # Excel: G=7 tidak masuk cabang manapun → FALSE
            values.append("")
    out["UPDATE SLA"] = values
    return out


def apply_hold_not_hold(df: pd.DataFrame) -> pd.DataFrame:
    """=IFERROR(VLOOKUP(AN, account, 5, FALSE), "NON CCC ") — Hold/ Not Hold."""
    out = df.copy()
    lookup = _account_field_map(ACCOUNT_HOLD_FIELD)
    if "ID_ACCOUNT" not in out.columns:
        out["HOLD / NOT HOLD"] = HOLD_DEFAULT
        return out
    keys = out["ID_ACCOUNT"].map(_account_lookup_key)
    out["HOLD / NOT HOLD"] = keys.map(
        lambda key: HOLD_DEFAULT if not key else lookup.get(key, HOLD_DEFAULT)
    )
    return out


def apply_sla_hold(df: pd.DataFrame) -> pd.DataFrame:
    """=IFERROR(IF(AN="","",VLOOKUP(AN, account, 6, FALSE)), "Non CCC") — SLA Hold."""
    out = df.copy()
    lookup = _account_field_map(ACCOUNT_SLA_HOLD_FIELD)
    if "ID_ACCOUNT" not in out.columns:
        out["SLA HOLD"] = ""
        return out

    def _resolve(raw: Any) -> str:
        key = _account_lookup_key(raw)
        if not key:
            return ""
        return lookup.get(key, SLA_HOLD_DEFAULT)

    out["SLA HOLD"] = out["ID_ACCOUNT"].map(_resolve)
    return out


def load_coding_ntt_dest_map() -> Dict[str, Dict[str, str]]:
    """tabelcoding: Coding (DEST) → Kecamatan / ZONA / CABANG / WILAYAH GROUPING."""
    from utils.ops_master_data import KIND_CODING_NTT

    fields = [
        CODING_NTT_FIELD_KECAMATAN,
        CODING_NTT_FIELD_ZONA,
        CODING_NTT_FIELD_CABANG,
        CODING_NTT_FIELD_WILAYAH,
    ]
    frame = _load_master_data_frame(KIND_CODING_NTT, ["Coding"])
    if frame is None:
        return {}

    # Alias typo md: WILAYAH GOUPING
    wilayah_col = CODING_NTT_FIELD_WILAYAH
    if wilayah_col not in frame.columns:
        for alt in ("WILAYAH GOUPING", "WILAYAH_GROUPING", "Wilayah Grouping"):
            if alt in frame.columns:
                wilayah_col = alt
                break

    mapping: Dict[str, Dict[str, str]] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("Coding", ""))
        if not key or key in mapping:
            continue
        mapping[key] = {
            CODING_NTT_FIELD_KECAMATAN: _cell_str(row.get(CODING_NTT_FIELD_KECAMATAN, "")),
            CODING_NTT_FIELD_ZONA: _cell_str(row.get(CODING_NTT_FIELD_ZONA, "")),
            CODING_NTT_FIELD_CABANG: _cell_str(row.get(CODING_NTT_FIELD_CABANG, "")),
            CODING_NTT_FIELD_WILAYAH: _cell_str(row.get(wilayah_col, "")),
        }
    return mapping


def apply_coding_dest_lookups(df: pd.DataFrame) -> pd.DataFrame:
    """VLOOKUP(AY/DEST, tabelcoding) → WILAYAH GROUPING, CABANG BY CODING DEST, KECAMATAN, ZONA."""
    out = df.copy()
    lookup = load_coding_ntt_dest_map()

    wilayah: List[str] = []
    cabang: List[str] = []
    kecamatan: List[str] = []
    zona: List[str] = []

    for idx in out.index:
        dest = _cell_str(out.at[idx, "DEST"] if "DEST" in out.columns else "")
        if not dest:
            wilayah.append("")
            cabang.append("")
            kecamatan.append("")
            zona.append("")
            continue
        row = lookup.get(dest, {})
        # IF(AY="","", VLOOKUP(...)) — jika DEST ada tapi tidak ketemu → ""
        wilayah.append(row.get(CODING_NTT_FIELD_WILAYAH, ""))
        cabang.append(row.get(CODING_NTT_FIELD_CABANG, ""))
        # KECAMATAN: =VLOOKUP(AY, tabelcoding, 4, 0) tanpa IF kosong
        kecamatan.append(row.get(CODING_NTT_FIELD_KECAMATAN, ""))
        zona.append(row.get(CODING_NTT_FIELD_ZONA, ""))

    out["WILAYAH GROUPING"] = wilayah
    out["CABANG BY CODING DEST"] = cabang
    out["KECAMATAN"] = kecamatan
    out["ZONA"] = zona
    return out


def load_id_kurir_agen_map() -> Dict[str, str]:
    """VLOOKUP(CD, ID, 3, FALSE) — Courier ID → Agen (kolom 3)."""
    from utils.ops_master_data import KIND_ID_KURIR

    frame = _load_master_data_frame(KIND_ID_KURIR, ["Courier ID", ID_KURIR_VLOOKUP_FIELD])
    if frame is None:
        return {}

    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("Courier ID", ""))
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get(ID_KURIR_VLOOKUP_FIELD, ""))
    return mapping


def apply_cabang_by_runsheet_courier(df: pd.DataFrame) -> pd.DataFrame:
    """=IF(CD="","", IFERROR(VLOOKUP(CD, ID, 3, 0), "")) — CD=RUNSHEET_COURIER_ID."""
    out = df.copy()
    lookup = load_id_kurir_agen_map()
    if "RUNSHEET_COURIER_ID" not in out.columns:
        out["CABANG BY RUNSHEET COURIER"] = ""
        return out

    def _resolve(raw: Any) -> str:
        key = _cell_str(raw)
        if not key:
            return ""
        return lookup.get(key, "")

    out["CABANG BY RUNSHEET COURIER"] = out["RUNSHEET_COURIER_ID"].map(_resolve)
    return out


def resolve_update_service(service: Any, origin: Any, dest: Any) -> str:
    """=IF(LEFT(SERVICE,3)="CTC","CTC", IF(AND(LEFT(ORIGIN,3)="KOE", LEFT(DEST,3)="KOE"), "INTERCITY", "DOMESTIC"))."""
    if _service_prefix(service) == "CTC":
        return "CTC"
    if _cell_str(origin)[:3].upper() == "KOE" and _cell_str(dest)[:3].upper() == "KOE":
        return "INTERCITY"
    return "DOMESTIC"


def load_service_kategory_map() -> Dict[str, str]:
    """=VLOOKUP(LEFT(SERVICE,3), SERVICE!A:B, 2, FALSE) — GROUPING → GROUPING SERVICE."""
    from utils.ops_master_data import KIND_SERVICE

    frame = _load_master_data_frame(KIND_SERVICE, ["GROUPING", "GROUPING SERVICE"])
    if frame is None:
        return {}

    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("GROUPING", "")).upper()
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get("GROUPING SERVICE", ""))
    return mapping


def _extract_time_from_entry(value: Any) -> Optional[datetime]:
    """Ambil komponen waktu dari TGL_ENTRY (setara MOD(AP,1) di Excel)."""
    dt = _parse_apex_datetime(value)
    return dt


def _format_time_hms(dt: datetime) -> str:
    return dt.strftime("%H:%M:%S")


_WEEKDAY_ID = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
]


def apply_update_service(df: pd.DataFrame) -> pd.DataFrame:
    """P = UPDATE SERVICE dari LEFT(SERVICE/ORIGIN/DEST)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        values.append(
            resolve_update_service(
                out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "",
                out.at[idx, "ORIGIN"] if "ORIGIN" in out.columns else "",
                out.at[idx, "DEST"] if "DEST" in out.columns else "",
            )
        )
    out["UPDATE SERVICE"] = values
    return out


def apply_kategory_service(df: pd.DataFrame) -> pd.DataFrame:
    """Q = KATEGORY SERVICE — VLOOKUP LEFT(SERVICE,3) ke Database SERVICE kolom 2."""
    out = df.copy()
    lookup = load_service_kategory_map()
    if "SERVICE" not in out.columns:
        out["KATEGORY SERVICE"] = ""
        return out
    out["KATEGORY SERVICE"] = out["SERVICE"].map(
        lambda v: lookup.get(_service_prefix(v), "")
    )
    return out


def apply_jam_transaksi(df: pd.DataFrame) -> pd.DataFrame:
    """R = JAM TRANSAKSI — IF(P="INTERCITY", MOD(AP,1), P)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        update_svc = _cell_str(
            out.at[idx, "UPDATE SERVICE"] if "UPDATE SERVICE" in out.columns else ""
        )
        if update_svc != "INTERCITY":
            values.append(update_svc)
            continue
        dt = _extract_time_from_entry(
            out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
        )
        values.append(_format_time_hms(dt) if dt else "")
    out["JAM TRANSAKSI"] = values
    return out


def apply_update_transaksi(df: pd.DataFrame) -> pd.DataFrame:
    """S = UPDATE TRANSAKSI — cabang INTERCITY vs jam 11:00."""
    out = df.copy()
    cutoff = datetime.strptime("11:00:00", "%H:%M:%S").time()
    values: List[str] = []
    for idx in out.index:
        update_svc = _cell_str(
            out.at[idx, "UPDATE SERVICE"] if "UPDATE SERVICE" in out.columns else ""
        )
        if update_svc != "INTERCITY":
            values.append(update_svc)
            continue
        dt = _extract_time_from_entry(
            out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
        )
        if dt is None:
            values.append("")
            continue
        if dt.time() <= cutoff:
            values.append("TR < 11:00")
        else:
            values.append("TR > 11:00")
    out["UPDATE TRANSAKSI"] = values
    return out


def apply_days(df: pd.DataFrame) -> pd.DataFrame:
    """T = DAYS — IF(P="INTERCITY", TEXT(AP,"DDDD"), P)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        update_svc = _cell_str(
            out.at[idx, "UPDATE SERVICE"] if "UPDATE SERVICE" in out.columns else ""
        )
        if update_svc != "INTERCITY":
            values.append(update_svc)
            continue
        dt = _extract_time_from_entry(
            out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
        )
        if dt is None:
            values.append("")
            continue
        # Excel DDDD — nama hari penuh (locale ID)
        values.append(_WEEKDAY_ID[dt.weekday()])
    out["DAYS"] = values
    return out


# ─── Batch: Kategori Inbound → OPEN/CLOSE (formula tracing & validasi) ───


def _is_blank(value: Any) -> bool:
    return _cell_str(value) == ""


def _excel_days(end: Optional[datetime], start: Optional[datetime]) -> Optional[int]:
    """Excel DAYS(end_date, start_date) = end - start (tanggal saja)."""
    if end is None or start is None:
        return None
    return (end.date() - start.date()).days


def _datedif_d(start: Optional[datetime], end: Optional[datetime]) -> Optional[int]:
    """Excel DATEDIF(start, end, \"D\")."""
    return _excel_days(end, start)


def _h_plus(days: Optional[int]) -> str:
    if days is None:
        return ""
    return f"H+{days}"


def _min_parsed_dates(*values: Any) -> str:
    """Excel MIN atas tanggal — kosong diabaikan."""
    dates: List[date] = []
    for value in values:
        dt = _parse_apex_datetime(value)
        if dt is not None:
            dates.append(dt.date())
    if not dates:
        return ""
    return min(dates).strftime("%Y-%m-%d")


def _left(value: Any, n: int) -> str:
    return _cell_str(value)[:n]


def _right(value: Any, n: int) -> str:
    text = _cell_str(value)
    return text[-n:] if n else ""


def _upper(value: Any) -> str:
    return _cell_str(value).upper()


def _trim_upper(value: Any) -> str:
    return _cell_str(value).strip().upper()


def load_username_inbound_gate_map() -> Dict[str, str]:
    """Database 1 R:S — Username → Gate Inbound (VLOOKUP kolom 2)."""
    from utils.ops_master_data import KIND_USERNAME_INBOUND

    frame = _load_master_data_frame(KIND_USERNAME_INBOUND, ["Username", "Gate Inbound"])
    if frame is None:
        return {}
    mapping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("Username", ""))
        if not key or key in mapping:
            continue
        mapping[key] = _cell_str(row.get("Gate Inbound", ""))
    # juga index upper untuk matching longgar
    for key, val in list(mapping.items()):
        up = key.upper()
        if up not in mapping:
            mapping[up] = val
    return mapping


def load_status_coding1_maps() -> Tuple[Dict[str, str], Dict[str, str]]:
    """Database 2 AB:AQ — STATUS CODE → CLOSE/OPEN (col2) & GROUPING (col4)."""
    from utils.ops_master_data import KIND_STATUS_CODING_1

    frame = _load_master_data_frame(KIND_STATUS_CODING_1, ["STATUS CODE"])
    if frame is None:
        return {}, {}
    close_open: Dict[str, str] = {}
    grouping: Dict[str, str] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("STATUS CODE", ""))
        if not key or key in close_open:
            continue
        close_open[key] = _cell_str(row.get("CLOSE/OPEN", ""))
        grouping[key] = _cell_str(row.get("GROUPING", ""))
    return close_open, grouping


def load_autoclose_sla_map() -> Dict[str, int]:
    """Database 2 AT:AV — CODE AUTOCLOSE → SLA AUTOCLOSE (kolom 2)."""
    from utils.ops_master_data import KIND_CODING_AUTOCLOSE

    frame = _load_master_data_frame(KIND_CODING_AUTOCLOSE, ["CODE AUTOCLOSE", "SLA AUTOCLOSE"])
    if frame is None:
        return {}
    mapping: Dict[str, int] = {}
    for _, row in frame.iterrows():
        key = _cell_str(row.get("CODE AUTOCLOSE", ""))
        if not key or key in mapping:
            continue
        days = _to_int_days(row.get("SLA AUTOCLOSE", ""))
        if days is not None:
            mapping[key] = days
    return mapping


def apply_kategori_inbound(df: pd.DataFrame) -> pd.DataFrame:
    """U — IF(BP=\"\", IF(OR(AZ=CTC19|CTC23),\"CTC\",\"UN INBOUND\"), VLOOKUP(BP, Username→Gate))."""
    out = df.copy()
    gate_map = load_username_inbound_gate_map()
    values: List[str] = []
    for idx in out.index:
        user_im = _cell_str(out.at[idx, "USER_IM"] if "USER_IM" in out.columns else "")
        service = _cell_str(out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "")
        if not user_im:
            values.append("CTC" if service in {"CTC19", "CTC23"} else "UN INBOUND")
            continue
        values.append(gate_map.get(user_im, gate_map.get(user_im.upper(), "")))
    out["Kategori Inbound"] = values
    return out


def apply_potensi_autoclose(df: pd.DataFrame) -> pd.DataFrame:
    """V — ZONA A/B + blank BILNOTE → CL2; C/D → CL4; BILNOTE + AWB JN* → D25; else D26."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        zona = _zona_letter(out.at[idx, "ZONA"] if "ZONA" in out.columns else "")
        bilnote = out.at[idx, "BILNOTE_AMOUNT"] if "BILNOTE_AMOUNT" in out.columns else ""
        awb = _cell_str(out.at[idx, "AWB"] if "AWB" in out.columns else "")
        bil_blank = _is_blank(bilnote)
        if zona == "A" and bil_blank:
            values.append("CL2")
        elif zona == "B" and bil_blank:
            values.append("CL2")
        elif zona == "C" and bil_blank:
            values.append("CL4")
        elif zona == "D" and bil_blank:
            values.append("CL4")
        elif (not bil_blank) and awb[:2].upper() == "JN":
            values.append("D25")
        elif not bil_blank:
            values.append("D26")
        else:
            values.append("")
    out["POTENSI AUTOCLOSE"] = values
    return out


def apply_tanggal_acuan_autoclose(df: pd.DataFrame) -> pd.DataFrame:
    """X = MIN(1ST_RUNSHEET_DATE, INBOUND_MANIFEST_DATE, MANIFEST_TRANSIT_SUBAGEN_DATE, PRA_RUNSHEET_DATE)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        values.append(
            _min_parsed_dates(
                out.at[idx, "1ST_RUNSHEET_DATE"] if "1ST_RUNSHEET_DATE" in out.columns else "",
                out.at[idx, "INBOUND_MANIFEST_DATE"] if "INBOUND_MANIFEST_DATE" in out.columns else "",
                out.at[idx, "MANIFEST_TRANSIT_SUBAGEN_DATE"] if "MANIFEST_TRANSIT_SUBAGEN_DATE" in out.columns else "",
                out.at[idx, "PRA_RUNSHEET_DATE"] if "PRA_RUNSHEET_DATE" in out.columns else "",
            )
        )
    out["TANGGAL ACUAN AUTOCLOSE"] = values
    return out


def apply_status_tracing(df: pd.DataFrame) -> pd.DataFrame:
    """Y — dari LEFT(CONFIRM_SHIPMENT_UNDEL)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        dw = _cell_str(
            out.at[idx, "CONFIRM_SHIPMENT_UNDEL"]
            if "CONFIRM_SHIPMENT_UNDEL" in out.columns
            else ""
        )
        if dw[:9].upper() == "UNCONFIRM":
            values.append("UNCONFIRM")
        elif dw[:7].upper() == "CONFIRM":
            values.append("CONFIRM")
        elif dw[:3].upper() == "WH1":
            values.append("WH1")
        elif dw[:10].upper() == "REQ RETURN":
            values.append("RETURN")
        else:
            values.append("TIDAK ADA TRACING")
    out["STATUS TRACING"] = values
    return out


def apply_validasi_status_nasional(df: pd.DataFrame) -> pd.DataFrame:
    """AJ — UN INBOUND / CANCEL / UNRUNSHEET / UN STATUS / VLOOKUP(CODING→GROUPING)."""
    out = df.copy()
    _, grouping_map = load_status_coding1_maps()
    values: List[str] = []
    for idx in out.index:
        om = out.at[idx, "OUTBOUND_MANIFEST"] if "OUTBOUND_MANIFEST" in out.columns else ""
        imd = out.at[idx, "INBOUND_MANIFEST_DATE"] if "INBOUND_MANIFEST_DATE" in out.columns else ""
        cancel = out.at[idx, "AWB_CANCEL"] if "AWB_CANCEL" in out.columns else ""
        date_rs = out.at[idx, "DATE_RUNSHEET"] if "DATE_RUNSHEET" in out.columns else ""
        coding = _cell_str(out.at[idx, "CODING"] if "CODING" in out.columns else "")
        if (not _is_blank(om)) and _is_blank(imd):
            values.append("UN INBOUND")
        elif not _is_blank(cancel):
            values.append("CANCEL")
        elif _is_blank(date_rs) and _is_blank(coding):
            values.append("UNRUNSHEET")
        elif (not _is_blank(date_rs)) and _is_blank(coding):
            values.append("UN STATUS")
        else:
            values.append(grouping_map.get(coding, ""))
    out["VALIDASI STATUS NASIONAL"] = values
    return out


def apply_open_close(df: pd.DataFrame) -> pd.DataFrame:
    """AL — OPEN untuk UN INBOUND/UNRUNSHEET/UN STATUS; CANCEL→CLOSE; else VLOOKUP CLOSE/OPEN."""
    out = df.copy()
    close_open_map, _ = load_status_coding1_maps()
    values: List[str] = []
    for idx in out.index:
        aj = _cell_str(
            out.at[idx, "VALIDASI STATUS NASIONAL"]
            if "VALIDASI STATUS NASIONAL" in out.columns
            else ""
        )
        coding = _cell_str(out.at[idx, "CODING"] if "CODING" in out.columns else "")
        if aj == "UN INBOUND":
            values.append("OPEN")
        elif aj == "UNRUNSHEET":
            values.append("OPEN")
        elif aj == "UN STATUS":
            values.append("OPEN")
        elif aj == "CANCEL":
            values.append("CLOSE")
        else:
            values.append(close_open_map.get(coding, ""))
    out["OPEN/CLOSE"] = values
    return out


def apply_reminding_days(df: pd.DataFrame) -> pd.DataFrame:
    """W — CLOSE / Ikuti SLA LAZADA / DAYS(TODAY, X+SLA_AUTOCLOSE)."""
    out = df.copy()
    autoclose_map = load_autoclose_sla_map()
    today = date.today()
    values: List[str] = []
    for idx in out.index:
        al = _cell_str(out.at[idx, "OPEN/CLOSE"] if "OPEN/CLOSE" in out.columns else "")
        y = _cell_str(out.at[idx, "STATUS TRACING"] if "STATUS TRACING" in out.columns else "")
        cf = _cell_str(out.at[idx, "CODING"] if "CODING" in out.columns else "")
        v = _cell_str(out.at[idx, "POTENSI AUTOCLOSE"] if "POTENSI AUTOCLOSE" in out.columns else "")
        x_raw = out.at[idx, "TANGGAL ACUAN AUTOCLOSE"] if "TANGGAL ACUAN AUTOCLOSE" in out.columns else ""

        if al[:5].upper() == "CLOSE":
            values.append("CLOSE")
        elif y == "WH1":
            values.append("CLOSE")
        elif cf in {"CR1", "CR8", "PS2", "PS3"}:
            values.append("CLOSE")
        elif al[-9:].upper() == "AUTOCLOSE":
            values.append("CLOSE")
        elif v == "D25":
            values.append("Ikuti SLA LAZADA")
        else:
            x_dt = _parse_stored_date(x_raw)
            sla_days = autoclose_map.get(v)
            if x_dt is None or sla_days is None:
                values.append("")
            else:
                deadline = x_dt + timedelta(days=sla_days)
                # DAYS(TODAY(), X+SLA) = today - deadline
                values.append(str((today - deadline).days))
    out["REMINDING DAYS"] = values
    return out


def apply_umur_kiriman(df: pd.DataFrame) -> pd.DataFrame:
    """Z — IF(PICKUP_STATUS=\"S01\", DAYS(TODAY,PICKUP_DATE), DAYS(TODAY,TGL_ENTRY)) & \" Hari\"."""
    out = df.copy()
    today_dt = datetime.combine(date.today(), datetime.min.time())
    values: List[str] = []
    for idx in out.index:
        pk_status = _cell_str(out.at[idx, "PICKUP_STATUS"] if "PICKUP_STATUS" in out.columns else "")
        if pk_status == "S01":
            start = _parse_apex_datetime(
                out.at[idx, "PICKUP_DATE"] if "PICKUP_DATE" in out.columns else ""
            )
        else:
            start = _parse_apex_datetime(
                out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
            )
        days = _excel_days(today_dt, start)
        values.append(f"{days} Hari" if days is not None else "")
    out["UMUR KIRIMAN"] = values
    return out


def apply_tr_im(df: pd.DataFrame) -> pd.DataFrame:
    """AA — CTC / UN INBOUND / H+DAYS(IMD, TGL_ENTRY)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        svc = _service_prefix(out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "")
        imd = out.at[idx, "INBOUND_MANIFEST_DATE"] if "INBOUND_MANIFEST_DATE" in out.columns else ""
        entry = _parse_apex_datetime(out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else "")
        if svc == "CTC":
            values.append("CTC")
        elif svc != "CTC" and _is_blank(imd):
            values.append("UN INBOUND")
        elif svc != "CTC" and not _is_blank(imd):
            values.append(_h_plus(_excel_days(_parse_apex_datetime(imd), entry)))
        else:
            values.append("")
    out["TR - IM"] = values
    return out


def apply_tr_1st_attemp(df: pd.DataFrame) -> pd.DataFrame:
    """AB — IF(blank GM, AJ, H+DAYS(GM, AP))."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        gm = out.at[idx, "1ST_RUNSHEET_DATE"] if "1ST_RUNSHEET_DATE" in out.columns else ""
        aj = _cell_str(
            out.at[idx, "VALIDASI STATUS NASIONAL"]
            if "VALIDASI STATUS NASIONAL" in out.columns
            else ""
        )
        entry = _parse_apex_datetime(out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else "")
        if _is_blank(gm):
            values.append(aj)
        elif not _is_blank(gm):
            values.append(_h_plus(_excel_days(_parse_apex_datetime(gm), entry)))
        else:
            values.append("")
    out["TR - 1ST ATTEMP"] = values
    return out


def apply_tr_delivered(df: pd.DataFrame) -> pd.DataFrame:
    """AC — IF(AJ=\"DELIVERED\", H+DAYS(CH, AP), AJ)."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        aj = _cell_str(
            out.at[idx, "VALIDASI STATUS NASIONAL"]
            if "VALIDASI STATUS NASIONAL" in out.columns
            else ""
        )
        if aj == "DELIVERED":
            ch = _parse_apex_datetime(
                out.at[idx, "TGL_RECEIVED"] if "TGL_RECEIVED" in out.columns else ""
            )
            entry = _parse_apex_datetime(
                out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
            )
            values.append(_h_plus(_excel_days(ch, entry)))
        else:
            values.append(aj)
    out["TR - DELIVERED"] = values
    return out


def apply_lt_im_today(df: pd.DataFrame) -> pd.DataFrame:
    """AD — CTC / CML / Un Inbound / Un Outbound / H+DATEDIF(BQ, TODAY)."""
    out = df.copy()
    today_dt = datetime.combine(date.today(), datetime.min.time())
    values: List[str] = []
    for idx in out.index:
        svc = _service_prefix(out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "")
        entry = _parse_apex_datetime(out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else "")
        imd = out.at[idx, "INBOUND_MANIFEST_DATE"] if "INBOUND_MANIFEST_DATE" in out.columns else ""
        omd = out.at[idx, "OUTBOUND_MANIFEST_DATE"] if "OUTBOUND_MANIFEST_DATE" in out.columns else ""
        if svc == "CTC":
            values.append(_h_plus(_datedif_d(entry, today_dt)))
        elif svc == "CML":
            values.append("CML")
        elif _is_blank(imd) and not _is_blank(omd):
            values.append("Un Inbound")
        elif _is_blank(omd):
            values.append("Un Outbound")
        else:
            values.append(_h_plus(_datedif_d(_parse_apex_datetime(imd), today_dt)))
    out["LT IM - TODAY"] = values
    return out


def apply_lt_mti_today(df: pd.DataFrame) -> pd.DataFrame:
    """AE — CTC / copy AD untuk gate matching / DALAM PENERUSAN / H+DATEDIF(FB, TODAY)."""
    out = df.copy()
    today_dt = datetime.combine(date.today(), datetime.min.time())
    values: List[str] = []
    for idx in out.index:
        svc = _service_prefix(out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "")
        u = _cell_str(out.at[idx, "Kategori Inbound"] if "Kategori Inbound" in out.columns else "")
        l = _cell_str(
            out.at[idx, "CABANG BY CODING DEST"] if "CABANG BY CODING DEST" in out.columns else ""
        )
        ad = _cell_str(out.at[idx, "LT IM - TODAY"] if "LT IM - TODAY" in out.columns else "")
        ey = out.at[idx, "MANIFEST_TRANSIT_SUBAGEN_NO"] if "MANIFEST_TRANSIT_SUBAGEN_NO" in out.columns else ""
        fa = out.at[idx, "MANIFEST_INBOUND_SUBAGEN_NO"] if "MANIFEST_INBOUND_SUBAGEN_NO" in out.columns else ""
        fb = out.at[idx, "MANIFEST_INBOUND_SUBAGEN_DATE"] if "MANIFEST_INBOUND_SUBAGEN_DATE" in out.columns else ""

        if svc == "CTC":
            values.append("CTC")
        elif u == "DIRECT CABANG":
            values.append(ad)
        elif u == "GATE LABUAN BAJO" and l == "LABUAN BAJO":
            values.append(ad)
        elif u == "GATE KUPANG" and l == "KOTA KUPANG":
            values.append(ad)
        elif u == "GATE WAINGAPU" and l == "WAINGAPU":
            values.append(ad)
        elif (not _is_blank(ey)) and _is_blank(fa):
            values.append("DALAM PENERUSAN")
        elif not _is_blank(fb):
            values.append(_h_plus(_datedif_d(_parse_apex_datetime(fb), today_dt)))
        else:
            values.append("")
    out["LT MTI - TODAY"] = values
    return out


def apply_1st_attempt_date_fix(df: pd.DataFrame) -> pd.DataFrame:
    """AG — KOE/LBJ courier → GM; else MIN(DD, CH) jika ada tanggal."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        gn = _left(
            out.at[idx, "1ST_RUNSHEET_COURIERID"] if "1ST_RUNSHEET_COURIERID" in out.columns else "",
            3,
        ).upper()
        gm = out.at[idx, "1ST_RUNSHEET_DATE"] if "1ST_RUNSHEET_DATE" in out.columns else ""
        cc = out.at[idx, "DATE_RUNSHEET"] if "DATE_RUNSHEET" in out.columns else ""
        dd = out.at[idx, "DATE_1ST_ATTEMPT"] if "DATE_1ST_ATTEMPT" in out.columns else ""
        ch = out.at[idx, "TGL_RECEIVED"] if "TGL_RECEIVED" in out.columns else ""

        if gn in {"KOE", "LBJ"}:
            gm_dt = _parse_apex_datetime(gm)
            values.append(gm_dt.strftime("%Y-%m-%d %H:%M") if gm_dt else _cell_str(gm))
        elif gn != "KOE" and _is_blank(cc) and _is_blank(dd):
            values.append("")
        elif gn != "LBJ" and _is_blank(cc) and _is_blank(dd):
            values.append("")
        else:
            values.append(_min_parsed_dates(dd, ch))
    out["1ST ATTEMPT DATE FIX"] = values
    return out


def apply_lt_im_1st_attempt(df: pd.DataFrame) -> pd.DataFrame:
    """AF — IF(AG=\"\",\"\", H+DAYS(AG, AP|BQ))."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        ag = out.at[idx, "1ST ATTEMPT DATE FIX"] if "1ST ATTEMPT DATE FIX" in out.columns else ""
        if _is_blank(ag):
            values.append("")
            continue
        ag_dt = _parse_apex_datetime(ag)
        if ag_dt is None:
            d = _parse_stored_date(ag)
            ag_dt = datetime.combine(d, datetime.min.time()) if d else None
        svc = _service_prefix(out.at[idx, "SERVICE"] if "SERVICE" in out.columns else "")
        if svc == "CTC":
            start = _parse_apex_datetime(
                out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else ""
            )
        else:
            start = _parse_apex_datetime(
                out.at[idx, "INBOUND_MANIFEST_DATE"] if "INBOUND_MANIFEST_DATE" in out.columns else ""
            )
        values.append(_h_plus(_excel_days(ag_dt, start)))
    out["LT IM - 1ST ATTEMPT"] = values
    return out


def apply_reminder_1st_attempt(df: pd.DataFrame) -> pd.DataFrame:
    """AH — bandingkan AG vs AP+ETD, atau sisa hari wajib runsheet."""
    out = df.copy()
    today = date.today()
    values: List[str] = []
    for idx in out.index:
        ag_raw = out.at[idx, "1ST ATTEMPT DATE FIX"] if "1ST ATTEMPT DATE FIX" in out.columns else ""
        entry = _parse_apex_datetime(out.at[idx, "TGL_ENTRY"] if "TGL_ENTRY" in out.columns else "")
        etd = _to_int_days(out.at[idx, "ETD"] if "ETD" in out.columns else "")

        if not _is_blank(ag_raw):
            ag_dt = _parse_apex_datetime(ag_raw)
            if ag_dt is None:
                d = _parse_stored_date(ag_raw)
                ag_dt = datetime.combine(d, datetime.min.time()) if d else None
            if entry is None or etd is None or ag_dt is None:
                values.append("")
            else:
                # CL+AP-AG < 0 → Over SLA
                delta = etd + (entry.date() - ag_dt.date()).days
                if delta < 0:
                    values.append("SUDAH RUNSHEET - 1st Attempt Over SLA")
                else:
                    values.append("SUDAH RUNSHEET - 1st Attempt On SLA")
            continue

        if entry is None or etd is None:
            values.append("")
            continue
        deadline = entry.date() + timedelta(days=etd)
        remaining = (deadline - today).days  # DAYS(AP+CL, TODAY)
        if remaining >= 6:
            values.append("MASIH ON SLA")
        elif remaining == 0:
            values.append("HARI INI WAJIB RUNSHEET")
        elif remaining < 0:
            values.append("BELUM RUNSHEET - SUDAH OVER SLA 1st Attemp")
        else:
            values.append(f"{remaining} HARI LAGI WAJIB RUNSHEET")
    out["REMINDER 1ST ATTEMPT"] = values
    return out


def apply_validasi_open_pod(df: pd.DataFrame) -> pd.DataFrame:
    """AI — OPEN POD H+ dari DATE_RUNSHEET vs TGL_TARIK_REPORT / TGL_RECEIVED."""
    out = df.copy()
    values: List[str] = []
    for idx in out.index:
        cc = out.at[idx, "DATE_RUNSHEET"] if "DATE_RUNSHEET" in out.columns else ""
        if _is_blank(cc):
            values.append("")
            continue
        aj = _cell_str(
            out.at[idx, "VALIDASI STATUS NASIONAL"]
            if "VALIDASI STATUS NASIONAL" in out.columns
            else ""
        )
        cc_dt = _parse_apex_datetime(cc)
        hj = _parse_apex_datetime(
            out.at[idx, "TGL_TARIK_REPORT"] if "TGL_TARIK_REPORT" in out.columns else ""
        )
        ch = _parse_apex_datetime(
            out.at[idx, "TGL_RECEIVED"] if "TGL_RECEIVED" in out.columns else ""
        )
        if aj == "UN STATUS":
            d = _excel_days(hj, cc_dt)
            if d is not None and d > 0:
                values.append(f"OPEN POD H+{d}")
                continue
        d2 = _excel_days(ch, cc_dt)
        if d2 is not None and d2 > 0:
            values.append(f"OPEN POD H+{d2}")
        else:
            values.append("")
    out["VALIDASI OPEN POD"] = values
    return out


def resolve_validasi_status_cabang(row: Dict[str, Any]) -> str:
    """AK — nested IF panjang sesuai rumus Excel VALIDASI STATUS CABANG."""
    aj = _cell_str(row.get("VALIDASI STATUS NASIONAL", ""))
    az = _service_prefix(row.get("SERVICE", ""))
    ey = row.get("MANIFEST_TRANSIT_SUBAGEN_NO", "")
    fa = row.get("MANIFEST_INBOUND_SUBAGEN_NO", "")
    u = _cell_str(row.get("Kategori Inbound", ""))
    l = _cell_str(row.get("CABANG BY CODING DEST", ""))
    bq = row.get("INBOUND_MANIFEST_DATE", "")
    ce = row.get("RUNSHEET_COURIER_NAME", "")
    bn = row.get("OUTBOUND_MANIFEST_DATE", "")
    fb = row.get("MANIFEST_INBOUND_SUBAGEN_DATE", "")
    a = _upper(row.get("CUST NAME", ""))
    h = _cell_str(row.get("UPDATE SLA", ""))
    cg = _cell_str(row.get("STATUS_POD", ""))
    cf = _cell_str(row.get("CODING", ""))
    y = _trim_upper(row.get("STATUS TRACING", ""))
    b = _trim_upper(row.get("INDUSTRY", ""))
    today_dt = datetime.combine(date.today(), datetime.min.time())

    def _imd_age(src: Any) -> int:
        d = _datedif_d(_parse_apex_datetime(src), today_dt)
        return d if d is not None else -1

    if aj == "DELIVERED":
        return "DELIVERED"
    if aj == "RETURN":
        return "RETURN"
    if aj == "CANCEL":
        return "CANCEL-BATAL KIRIM"
    if aj == "AUTO CLOSE":
        return "AUTOCLOSE-KROSCEK FISIK-CONFIRM TEAM CS/CCC"
    if aj == "BREACH MP":
        return "BREACH MP-KROSCEK FISIK-CONFIRM TEAM CS/CCC"
    if aj == "BREACH NON MP":
        return "BREACH NON MP-KROSCEK FISIK-CONFIRM TEAM CS/CCC"
    if aj == "STATUS CLAIM":
        return "STATUS CLAIM-KROSCEK FISIK-CONFIRM CCC"
    if aj == "KIRIMAN RETURN BREACH MP":
        return "KROSCEK FISIK-JIKA BELUM RETURN-CONFIRM TEAM UNDEL"
    if aj == "KIRIMAN DISITA OLEH BEA CUKAI":
        return "KIRIMAN DISITA OLEH BEA CUKAI"
    if aj == "IRREGULARITY - DELIVERY":
        return "IRREGULARITY - DELIVERY"
    if aj == "UN INBOUND":
        return "UN INBOUND-KROSCEK FISIK SUDAH SCAN BAG"
    if aj == "PROBLEM SHIPMENT":
        return "PROBLEM SHIPMENT"
    if aj == "DESTROYED":
        return "DESTROYED-KROSCEK FISIK KIRIMAN"
    if aj == "PROOF OF DELIVERY / RETURN TO SHIPPER":
        return "PROOF OF DELIVERY / RETURN TO SHIPPER"
    if aj == "DELIVERY PROBLEM":
        return "DELIVERY PROBLEM-KROSCEK-MAKSIMALKAN DELIVERY"
    if aj == "UNRUNSHEET" and az == "CML":
        return "UNRUNSHEET-CML"
    if aj == "UNRUNSHEET" and az == "CTC":
        return "UNRUNSHEET-CTC"
    if aj == "UNRUNSHEET" and (not _is_blank(ey)) and _is_blank(fa):
        return "DALAM PENERUSAN"
    if aj == "UNRUNSHEET" and u == "GATE KUPANG" and l == "KOTA KUPANG" and (not _is_blank(ey)):
        return "UNRUNSHEET-INFO CORDEST"
    if aj == "UNRUNSHEET" and u == "GATE LABUAN BAJO" and l == "LABUAN BAJO" and _imd_age(bq) == 0:
        return "UNRUNSHEET-INB SA HARI INI"
    if aj == "UNRUNSHEET" and u == "GATE TAMBOLAKA" and l == "TAMBOLAKA" and _imd_age(bq) == 0:
        return "UNRUNSHEET-INB SA HARI INI"
    if aj == "UNRUNSHEET" and u == "GATE WAINGAPU" and l == "WAINGAPU" and _imd_age(bq) == 0:
        return "UNRUNSHEET-INB SA HARI INI"
    if aj == "UNRUNSHEET" and u == "DIRECT CABANG" and _imd_age(bq) == 0:
        return "UNRUNSHEET-INB SA HARI INI"
    if u == "DIRECT CABANG" and _is_blank(ce):
        return "UNRUNSHEET-MAKSIMALKAN DELIVERY"
    if u == "GATE WAINGAPU" and l == "WAINGAPU" and _is_blank(ce):
        return "UNRUNSHEET-MAKSIMALKAN DELIVERY"
    if u == "GATE TAMBOLAKA" and l == "TAMBOLAKA" and _is_blank(ce):
        return "UNRUNSHEET-MAKSIMALKAN DELIVERY"
    if u == "GATE KUPANG" and l == "KOTA KUPANG" and _is_blank(ce):
        return "UNRUNSHEET-MAKSIMALKAN DELIVERY"
    if aj == "UNRUNSHEET" and (not _is_blank(bn)) and _is_blank(bq):
        return "UN INBOUND-KROSCEK FISIK SUDAH SCAN BAG"
    if aj == "UNRUNSHEET" and (not _is_blank(fb)) and _imd_age(fb) == 0:
        return "UNRUNSHEET-INB SA HARI INI"
    if aj == "UNRUNSHEET":
        return "UNRUNSHEET-MAKSIMALKAN DELIVERY"
    if a == "LAZADA" and h == "OVER SLA BESOK":
        return "LAZADA - OVER SLA BESOK - RETURN HARI INI"
    if a == "LAZADA" and h == "MENDEKATI OVER SLA":
        return "LAZADA - MENDEKATI OVER SLA - GAGAL SEGERA RETURN"
    if a == "LAZADA" and h == "ON SLA":
        return "LAZADA - FU ANTAR ULANG - GAGAL SEGERA RETURN"
    if a == "LAZADA" and h == "OVER SLA":
        return "LAZADA - OVER SLA - CONFIRM TIM CCC"
    if aj == "UNDEL - Irregularity" and cg == "Missing":
        return "MISSING-TERBITKAN KRONOLOGIS"
    if aj == "UNDEL - Irregularity" and cf == "U12":
        return "MISROUTE - KROSCEK FISIK - MAKSIMALKAN DL JIKA SUDAH MASUK"
    if aj == "CUSTOMER REQUEST" and cf == "CR5":
        return "REQUEST HOLD - KROSCEK FISIK - KONFIRMASI TIM CS/CC/INBOUND"
    if (
        aj in {"UNDELIVERED", "CUSTOMER REQUEST"}
        and y == "WH1"
        and b in {"NON CCC", "CORPORATE KOE", "PROJECT KOE"}
    ):
        return "KIRIMAN WH1 - PASTIKAN FU TRACING UNDEL & BUKTI CHAT AKURAT"
    if aj in {"UNDELIVERED", "UN STATUS", "CUSTOMER REQUEST"} and b[:11] == "MARKETPLACE":
        return f"{aj}- MAKSIMALKAN DELIVERY SEBELUM BREACH & PROSES SESUAI REGULASI UNDEL"
    if aj in {"UNDELIVERED", "UN STATUS", "CUSTOMER REQUEST"} and b[:11] != "MARKETPLACE":
        return "MAKSIMALKAN PENGANTARAN MIN 3X ANTAR-JIKA GAGAL BUKTI HARUS VALID"
    return ""


def apply_validasi_status_cabang(df: pd.DataFrame) -> pd.DataFrame:
    """AK — VALIDASI STATUS CABANG."""
    out = df.copy()
    cols_needed = [
        "VALIDASI STATUS NASIONAL",
        "SERVICE",
        "MANIFEST_TRANSIT_SUBAGEN_NO",
        "MANIFEST_INBOUND_SUBAGEN_NO",
        "Kategori Inbound",
        "CABANG BY CODING DEST",
        "INBOUND_MANIFEST_DATE",
        "RUNSHEET_COURIER_NAME",
        "OUTBOUND_MANIFEST_DATE",
        "MANIFEST_INBOUND_SUBAGEN_DATE",
        "CUST NAME",
        "UPDATE SLA",
        "STATUS_POD",
        "CODING",
        "STATUS TRACING",
        "INDUSTRY",
    ]
    values: List[str] = []
    for idx in out.index:
        row = {c: (out.at[idx, c] if c in out.columns else "") for c in cols_needed}
        values.append(resolve_validasi_status_cabang(row))
    out["VALIDASI STATUS CABANG"] = values
    return out


def enrich_ctc_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Terapkan semua kolom hasil rumus Excel (VLOOKUP / IFERROR / LEFT / IF)."""
    out = apply_cust_name_from_account(df)
    out = apply_industry_from_account(out)
    out = apply_3lc_origin(out)
    out = apply_3lc_origin_regional(out)
    # Coding dest dulu agar ZONA tersedia untuk fallback SLA BREACH (Account by zona)
    out = apply_coding_dest_lookups(out)
    out = apply_sla_breach(out)
    out = apply_maximal_breach(out)
    out = apply_sisa_aging(out)
    out = apply_update_sla(out)
    out = apply_hold_not_hold(out)
    out = apply_sla_hold(out)
    out = apply_cabang_by_runsheet_courier(out)
    out = apply_update_service(out)
    out = apply_kategory_service(out)
    out = apply_jam_transaksi(out)
    out = apply_update_transaksi(out)
    out = apply_days(out)
    # Tracing / validasi (urutan dependency penting)
    out = apply_kategori_inbound(out)
    out = apply_potensi_autoclose(out)
    out = apply_tanggal_acuan_autoclose(out)
    out = apply_status_tracing(out)
    out = apply_validasi_status_nasional(out)
    out = apply_open_close(out)
    out = apply_reminding_days(out)
    out = apply_umur_kiriman(out)
    out = apply_tr_im(out)
    out = apply_tr_1st_attemp(out)
    out = apply_tr_delivered(out)
    out = apply_lt_im_today(out)
    out = apply_lt_mti_today(out)
    out = apply_1st_attempt_date_fix(out)
    out = apply_lt_im_1st_attempt(out)
    out = apply_reminder_1st_attempt(out)
    out = apply_validasi_open_pod(out)
    out = apply_validasi_status_cabang(out)
    return out


def _canonicalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: Dict[str, str] = {}
    for raw in df.columns:
        key = str(raw).strip().lower()
        canonical = _ALIAS_TO_CANONICAL.get(key)
        if canonical and raw != canonical:
            rename_map[raw] = canonical
    if rename_map:
        df = df.rename(columns=rename_map)
    return df.loc[:, ~pd.Index(df.columns).duplicated()].copy()


def _ensure_detail_columns(df: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in CTC_DETAIL_COLUMNS if c not in df.columns]
    if missing:
        df = pd.concat(
            [df, pd.DataFrame({c: "" for c in missing}, index=df.index)],
            axis=1,
        )
    keep = [c for c in CTC_DETAIL_COLUMNS if c in df.columns]
    extras = [c for c in df.columns if c not in keep and c not in {
        UPLOAD_DATE_COL, PERIOD_MODE_COL, UPDATE_DAY_COL,
    }]
    ordered = keep + extras
    for meta in (UPLOAD_DATE_COL, PERIOD_MODE_COL, UPDATE_DAY_COL):
        if meta in df.columns:
            ordered.append(meta)
    return df[ordered].fillna("")


def daily_file_path(date_iso: str) -> Path:
    return CTC_DAILY_DIR / f"{date_iso}.csv"


def monthly_file_path(month_yyyy_mm: str, update_day: str) -> Path:
    day = (update_day or "2").strip()
    return CTC_MONTHLY_DIR / f"{month_yyyy_mm}_day{day}.csv"


def parse_ctc_upload(
    raw: bytes,
    suffix: str,
    period_mode: str,
    date_iso: str,
    month_yyyy_mm: Optional[str] = None,
    update_day: Optional[str] = None,
) -> pd.DataFrame:
    """Parse file upload → kolom CTC + enrichment CUST NAME."""
    if suffix == ".csv":
        frame = _read_apex_csv(raw)
    else:
        frame = pd.read_excel(io.BytesIO(raw), dtype=str)

    frame.columns = [str(c).replace("\ufeff", "").strip() for c in frame.columns]
    unnamed_mask = frame.columns.str.contains(r"^Unnamed", case=False, na=False)
    if unnamed_mask.any():
        frame = frame.loc[:, ~unnamed_mask]
    frame = _canonicalize_columns(frame)

    if "AWB" not in frame.columns:
        raise ValueError("Kolom AWB tidak ditemukan di file upload.")

    pieces: Dict[str, Any] = {}
    for col in CTC_DETAIL_COLUMNS:
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
        raise ValueError("Tidak ada baris valid. Pastikan file punya kolom AWB berisi data.")

    out = _ensure_detail_columns(out)
    out = enrich_ctc_columns(out)

    mode = (period_mode or "harian").strip().lower()
    out[PERIOD_MODE_COL] = mode
    if mode == "bulanan":
        out[UPLOAD_DATE_COL] = (month_yyyy_mm or date_iso[:7]).strip()
        out[UPDATE_DAY_COL] = (update_day or "2").strip()
    else:
        out[UPLOAD_DATE_COL] = date_iso
        out[UPDATE_DAY_COL] = ""
    return out.fillna("")


def save_ctc_upload(
    df: pd.DataFrame,
    period_mode: str,
    date_iso: str,
    month_yyyy_mm: Optional[str] = None,
    update_day: Optional[str] = None,
    original_filename: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> Path:
    """Simpan upload CTC per periode (replace file periode tersebut)."""
    mode = (period_mode or "harian").strip().lower()
    day_df = _ensure_detail_columns(df.copy())
    day_df = enrich_ctc_columns(day_df)

    if mode == "bulanan":
        CTC_MONTHLY_DIR.mkdir(parents=True, exist_ok=True)
        month = (month_yyyy_mm or date_iso[:7]).strip()
        day = (update_day or "2").strip()
        path = monthly_file_path(month, day)
        day_df[UPLOAD_DATE_COL] = month
        day_df[UPDATE_DAY_COL] = day
        day_df[PERIOD_MODE_COL] = "bulanan"
    else:
        CTC_DAILY_DIR.mkdir(parents=True, exist_ok=True)
        path = daily_file_path(date_iso)
        day_df[UPLOAD_DATE_COL] = date_iso
        day_df[PERIOD_MODE_COL] = "harian"

    day_df.to_csv(path, index=False, encoding="utf-8-sig")

    meta = {
        "original_filename": original_filename or "",
        "uploaded_by": uploaded_by or "",
        "uploaded_at": datetime.now().isoformat(timespec="seconds"),
        "rows": int(len(day_df)),
        "period_mode": mode,
    }
    path.with_suffix(".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def read_ctc_frame(
    period_mode: str,
    date_iso: Optional[str] = None,
    month_yyyy_mm: Optional[str] = None,
    update_day: Optional[str] = None,
) -> pd.DataFrame:
    """Baca data CTC untuk periode terpilih."""
    mode = (period_mode or "harian").strip().lower()
    path: Optional[Path] = None
    if mode == "bulanan":
        month = (month_yyyy_mm or "").strip()
        day = (update_day or "2").strip()
        if month:
            path = monthly_file_path(month, day)
    else:
        if date_iso:
            path = daily_file_path(date_iso)

    if path is None or not path.is_file():
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)

    try:
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
        df.columns = [str(c).strip() for c in df.columns]
        df = _canonicalize_columns(df)
        if "AWB" in df.columns:
            df["AWB"] = df["AWB"].map(_strip_apostrophe)
        if "ID_ACCOUNT" in df.columns:
            df["ID_ACCOUNT"] = df["ID_ACCOUNT"].map(_strip_apostrophe)
        df = _ensure_detail_columns(df)
        # Penting performa: jangan enrich ulang saat read.
        # Enrichment sudah dilakukan saat parse/upload + save.
        return df
    except Exception:
        return pd.DataFrame(columns=CTC_DETAIL_COLUMNS)


def _is_blank_text(value: Any) -> bool:
    return _cell_str(value) == ""


def _starts_with_ctc(value: Any) -> bool:
    return _cell_str(value).upper().startswith("CTC")


def _starts_with_koe(value: Any) -> bool:
    return _cell_str(value).upper().startswith("KOE")


def _starts_with_koe_runsheet(value: Any) -> bool:
    return _cell_str(value).upper().startswith("KOE")


def _un_inbound_mask(df: pd.DataFrame) -> pd.Series:
    """Mask Bagian A (filter UN INBOUND) — dijalankan 1 per 1, AND berurutan.

    1) INBOUND_MANIFEST_DATE blank
    2) MANIFEST_TRANSIT_AGEN blank
    3) SERVICE tidak berawalan CTC
    4) ORIGIN tidak berawalan KOE
    """
    if df.empty:
        return pd.Series([False] * 0, dtype=bool)

    imd = (
        df["INBOUND_MANIFEST_DATE"]
        if "INBOUND_MANIFEST_DATE" in df.columns
        else pd.Series([""] * len(df), index=df.index)
    )
    mta = (
        df["MANIFEST_TRANSIT_AGEN"]
        if "MANIFEST_TRANSIT_AGEN" in df.columns
        else pd.Series([""] * len(df), index=df.index)
    )
    service = (
        df["SERVICE"]
        if "SERVICE" in df.columns
        else pd.Series([""] * len(df), index=df.index)
    )
    origin = (
        df["ORIGIN"] if "ORIGIN" in df.columns else pd.Series([""] * len(df), index=df.index)
    )

    mask = imd.map(_is_blank_text)
    mask = mask & mta.map(_is_blank_text)
    mask = mask & (~service.map(_starts_with_ctc))
    mask = mask & (~origin.map(_starts_with_koe))
    return mask


def filter_un_inbound_rows(df: pd.DataFrame) -> pd.DataFrame:
    """UN INBOUND: duplikat subset hasil filter Bagian A."""
    if df.empty:
        return df.copy()
    view = df.copy()
    return view[_un_inbound_mask(view)].copy()


def filter_inbound_rows_after_un_inbound(df: pd.DataFrame) -> pd.DataFrame:
    """Take out INBOUND — MELANJUTKAN filter Bagian A (tanpa clear filter).

    Setelah copy ke UN INBOUND, filter A tetap aktif. Lalu lanjut:
    1) RUNSHEET_NO tidak berawalan KOE
    2) OUTBOUND_MANIFEST blank -> hapus
    3) HOLD_REASON terisi -> hapus
    4) CABANG BY CODING DEST selain Kota Kupang/Tambolaka/Waingapu
    5) Jika masih tersisa -> hapus semua

    Hanya baris yang lolos Bagian A yang bisa di-take out.
    Baris di luar Bagian A tetap di INBOUND.
    """
    if df.empty:
        return df.copy()

    out = df.copy()

    # Lanjutkan dari Bagian A (tidak mulai ulang dari seluruh dataset).
    candidate = _un_inbound_mask(out)
    delete_mask = pd.Series([False] * len(out), index=out.index)

    runsheet = (
        out["RUNSHEET_NO"]
        if "RUNSHEET_NO" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )
    outbound = (
        out["OUTBOUND_MANIFEST"]
        if "OUTBOUND_MANIFEST" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )
    hold_reason = (
        out["HOLD_REASON"]
        if "HOLD_REASON" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )
    cabang_dest = (
        out["CABANG BY CODING DEST"]
        if "CABANG BY CODING DEST" in out.columns
        else pd.Series([""] * len(out), index=out.index)
    )

    # Step-1 (lanjutan): sempitkan ke RUNSHEET_NO tidak berawalan KOE
    candidate = candidate & (~runsheet.map(_starts_with_koe_runsheet))

    # Step-2: OUTBOUND_MANIFEST blank => langsung hapus
    step2_delete = candidate & outbound.map(_is_blank_text)
    delete_mask |= step2_delete
    candidate = candidate & ~step2_delete

    # Step-3: HOLD_REASON ada isi => langsung hapus
    step3_delete = candidate & (~hold_reason.map(_is_blank_text))
    delete_mask |= step3_delete
    candidate = candidate & ~step3_delete

    # Step-4: CABANG BY CODING DEST selain whitelist
    allowed = {"KOTA KUPANG", "TAMBOLAKA", "WAINGAPU"}
    cabang_upper = cabang_dest.map(lambda v: _cell_str(v).upper())
    candidate = candidate & (~cabang_upper.isin(allowed))

    # Step-5: jika masih tersisa kandidat, hapus semua
    delete_mask |= candidate

    return out[~delete_mask].copy()


def list_ctc_detail(
    period_mode: str,
    date_iso: Optional[str] = None,
    month_yyyy_mm: Optional[str] = None,
    update_day: Optional[str] = None,
    kind: str = "inbound",
    page: int = 1,
    limit: int = 0,
    q: Optional[str] = None,
) -> dict:
    df = read_ctc_frame(period_mode, date_iso, month_yyyy_mm, update_day)
    kind_norm = (kind or "inbound").strip().lower()
    if kind_norm not in {"inbound", "un_inbound"}:
        kind_norm = "inbound"

    if kind_norm == "un_inbound":
        # Duplikasi subset hasil filter ke tabel UN INBOUND (tanpa menghapus dari INBOUND).
        df = filter_un_inbound_rows(df)
    else:
        # INBOUND dibersihkan setelah proses UN INBOUND selesai.
        df = filter_inbound_rows_after_un_inbound(df)

    if df.empty:
        label = date_iso if (period_mode or "harian") == "harian" else f"{month_yyyy_mm} Tgl {update_day}"
        table_label = "UN INBOUND" if kind_norm == "un_inbound" else "INBOUND"
        return {
            "items": [],
            "total": 0,
            "page": 1,
            "limit": 0,
            "pages": 0,
            "columns": CTC_DETAIL_COLUMNS,
            "message": f"Belum ada data {table_label} All Inbound & CTC untuk periode {label}.",
        }

    view = df.copy()
    for col in CTC_DETAIL_COLUMNS:
        if col not in view.columns:
            view[col] = ""
    view = view[CTC_DETAIL_COLUMNS].fillna("")
    records = view.to_dict(orient="records")
    records = filter_records_by_query(records, q)
    total = len(records)

    if limit is None or int(limit) <= 0:
        return {
            "items": records,
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
            "columns": CTC_DETAIL_COLUMNS,
            "message": None,
        }

    result = paginate_list(
        records,
        page=page,
        limit=limit,
        max_limit=max(int(limit), 200),
    )
    result["columns"] = CTC_DETAIL_COLUMNS
    result["message"] = None
    return result


def export_ctc_detail_xlsx(
    period_mode: str,
    date_iso: Optional[str] = None,
    month_yyyy_mm: Optional[str] = None,
    update_day: Optional[str] = None,
    kind: str = "inbound",
    q: Optional[str] = None,
) -> dict:
    payload = list_ctc_detail(
        period_mode=period_mode,
        date_iso=date_iso,
        month_yyyy_mm=month_yyyy_mm,
        update_day=update_day,
        kind=kind,
        page=1,
        limit=0,
        q=q,
    )
    items = payload.get("items", []) or []
    frame = pd.DataFrame(items, columns=CTC_DETAIL_COLUMNS).fillna("")

    xlsx_buffer = io.BytesIO()
    with pd.ExcelWriter(xlsx_buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, index=False, sheet_name="All Inbound CTC")
    xlsx_bytes = xlsx_buffer.getvalue()

    mode = (period_mode or "harian").strip().lower()
    kind_norm = (kind or "inbound").strip().lower()
    if mode == "bulanan":
        suffix = f"{(month_yyyy_mm or '').replace('-', '')}_u{update_day or '2'}"
    else:
        suffix = (date_iso or "").replace("-", "")
    filename = f"all_inbound_ctc_{kind_norm}_{mode}_{suffix or 'export'}.xlsx"
    return {"filename": filename, "content": xlsx_bytes}

"""Database Kiriman YES — kolom detail + list rows (filter/search/paging).

Penyimpanan per periode upload:
  uploads/kiriman_yes/harian/{YYYY-MM-DD}/kiriman_yes_data.csv
  uploads/kiriman_yes/bulanan/{YYYY-MM}/tgl{2|8}/kiriman_yes_data.csv

Legacy (auto-migrate):
  uploads/kiriman_yes/{YYYY-MM-DD}/...
  uploads/kiriman_yes/kiriman_yes_data.csv
"""
from __future__ import annotations

import io
import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from services.paths import KIRIMAN_YES_DIR, KIRIMAN_YES_FILE
from utils.page_util import filter_dataframe_by_query

DATA_FILENAME = "kiriman_yes_data.csv"


def _norm_period_mode(mode: Optional[str]) -> str:
    m = (mode or "harian").strip().lower()
    return m if m in {"harian", "bulanan"} else "harian"


def period_folder(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    mode = _norm_period_mode(period_mode)
    if mode == "bulanan":
        month_yyyy_mm = (month or "").strip() or ((date or "")[:7])
        day = (update_day or "2").strip()
        if day not in {"2", "8"}:
            day = "2"
        return KIRIMAN_YES_DIR / "bulanan" / month_yyyy_mm / f"tgl{day}"
    date_iso = (date or "").strip()
    return KIRIMAN_YES_DIR / "harian" / date_iso


def data_path_for_period(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    return period_folder(
        period_mode, date=date, month=month, update_day=update_day
    ) / DATA_FILENAME


def meta_path_for_period(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    return data_path_for_period(
        period_mode, date=date, month=month, update_day=update_day
    ).with_name(DATA_FILENAME + ".meta")


def pivot_path_for_period(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    return period_folder(
        period_mode, date=date, month=month, update_day=update_day
    ) / "kiriman_yes.pivot.json"


def read_kiriman_yes_pivot_cache(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    path = pivot_path_for_period(
        period_mode, date=date, month=month, update_day=update_day
    )
    if not path.is_file():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def write_kiriman_yes_pivot_cache(
    payload: Dict[str, Any],
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    folder = period_folder(
        period_mode, date=date, month=month, update_day=update_day
    )
    folder.mkdir(parents=True, exist_ok=True)
    path = pivot_path_for_period(
        period_mode, date=date, month=month, update_day=update_day
    )
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


def bake_kiriman_yes_pivots(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Path:
    """Hitung pivot Database + OTS sekali dan simpan ke JSON (hasil siap pakai)."""
    # Import lokal untuk hindari circular import saat load module.
    from routers.ops import compute_kiriman_yes_pivot

    mode = _norm_period_mode(period_mode)
    database = compute_kiriman_yes_pivot(
        table="database",
        date=date,
        period_mode=mode,
        month=month,
        update_day=update_day,
    )
    ots = compute_kiriman_yes_pivot(
        table="ots",
        date=date,
        period_mode=mode,
        month=month,
        update_day=update_day,
    )
    payload = {
        "database": database,
        "ots": ots,
        "baked_at": datetime.now().isoformat(timespec="seconds"),
        "period_mode": mode,
        "date": date,
        "month": month,
        "update_day": update_day,
    }
    return write_kiriman_yes_pivot_cache(
        payload,
        mode,
        date=date,
        month=month,
        update_day=update_day,
    )


# Back-compat aliases
def day_dir(date_iso: str) -> Path:
    return period_folder("harian", date=date_iso)


def data_path_for_date(date_iso: str) -> Path:
    return data_path_for_period("harian", date=date_iso)


def meta_path_for_date(date_iso: str) -> Path:
    return meta_path_for_period("harian", date=date_iso)


def resolve_data_path(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Optional[Path]:
    """Cari file data (layout baru, lalu legacy flat date)."""
    migrate_legacy_if_needed()
    path = data_path_for_period(
        period_mode, date=date, month=month, update_day=update_day
    )
    if path.is_file():
        return path
    # Legacy flat YYYY-MM-DD (harian only)
    if _norm_period_mode(period_mode) == "harian":
        legacy = KIRIMAN_YES_DIR / (date or "").strip() / DATA_FILENAME
        if legacy.is_file():
            return legacy
    return None


def _legacy_meta_upload_date() -> Optional[str]:
    meta = KIRIMAN_YES_FILE.parent / (KIRIMAN_YES_FILE.name + ".meta")
    if meta.is_file():
        try:
            payload = json.loads(meta.read_text(encoding="utf-8"))
            ts = str(payload.get("timestamp") or "")
            if ts:
                return datetime.fromisoformat(ts.replace("Z", "")).strftime("%Y-%m-%d")
        except Exception:
            pass
    if KIRIMAN_YES_FILE.is_file():
        return datetime.fromtimestamp(KIRIMAN_YES_FILE.stat().st_mtime).strftime("%Y-%m-%d")
    return None


def migrate_legacy_if_needed() -> Optional[str]:
    """Migrate root file + flat date folders ke layout harian/."""
    migrated: Optional[str] = None

    # Flat YYYY-MM-DD → harian/YYYY-MM-DD
    if KIRIMAN_YES_DIR.is_dir():
        for p in list(KIRIMAN_YES_DIR.iterdir()):
            if not p.is_dir() or p.name in {"archive", "harian", "bulanan"}:
                continue
            try:
                datetime.strptime(p.name, "%Y-%m-%d")
            except ValueError:
                continue
            src = p / DATA_FILENAME
            if not src.is_file():
                continue
            dest_dir = KIRIMAN_YES_DIR / "harian" / p.name
            dest = dest_dir / DATA_FILENAME
            dest_dir.mkdir(parents=True, exist_ok=True)
            if not dest.is_file():
                shutil.move(str(src), str(dest))
                src_meta = p / (DATA_FILENAME + ".meta")
                if src_meta.is_file():
                    shutil.move(str(src_meta), str(dest.with_name(DATA_FILENAME + ".meta")))
                migrated = p.name
            # bersihkan folder flat kosong
            try:
                if not any(p.iterdir()):
                    p.rmdir()
            except OSError:
                pass

    if KIRIMAN_YES_FILE.is_file():
        date_iso = _legacy_meta_upload_date() or datetime.now().strftime("%Y-%m-%d")
        dest = data_path_for_period("harian", date=date_iso)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.is_file():
            archive = KIRIMAN_YES_DIR / "archive"
            archive.mkdir(parents=True, exist_ok=True)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            shutil.move(str(KIRIMAN_YES_FILE), str(archive / f"legacy_{ts}.csv"))
            legacy_meta = KIRIMAN_YES_DIR / (DATA_FILENAME + ".meta")
            if legacy_meta.is_file():
                shutil.move(str(legacy_meta), str(archive / f"legacy_{ts}.csv.meta"))
        else:
            shutil.move(str(KIRIMAN_YES_FILE), str(dest))
            legacy_meta = KIRIMAN_YES_DIR / (DATA_FILENAME + ".meta")
            if legacy_meta.is_file():
                shutil.move(str(legacy_meta), str(dest.with_name(DATA_FILENAME + ".meta")))
        migrated = date_iso

    return migrated


def list_upload_dates(period_mode: Optional[str] = "harian") -> List[str]:
    """Daftar tanggal (harian) atau label bulan/tgl (bulanan)."""
    migrate_legacy_if_needed()
    mode = _norm_period_mode(period_mode)
    out: List[str] = []
    if mode == "harian":
        root = KIRIMAN_YES_DIR / "harian"
        if root.is_dir():
            for p in root.iterdir():
                if not p.is_dir():
                    continue
                try:
                    datetime.strptime(p.name, "%Y-%m-%d")
                except ValueError:
                    continue
                if (p / DATA_FILENAME).is_file():
                    out.append(p.name)
        out.sort(reverse=True)
        return out

    # bulanan → "YYYY-MM|2" / "YYYY-MM|8"
    root = KIRIMAN_YES_DIR / "bulanan"
    if root.is_dir():
        for month_dir in root.iterdir():
            if not month_dir.is_dir():
                continue
            try:
                datetime.strptime(f"{month_dir.name}-01", "%Y-%m-%d")
            except ValueError:
                continue
            for day_dir in month_dir.iterdir():
                if not day_dir.is_dir():
                    continue
                if day_dir.name not in {"tgl2", "tgl8"}:
                    continue
                if (day_dir / DATA_FILENAME).is_file():
                    day = "2" if day_dir.name == "tgl2" else "8"
                    out.append(f"{month_dir.name}|{day}")
    out.sort(reverse=True)
    return out


def latest_upload_date(period_mode: Optional[str] = "harian") -> Optional[str]:
    dates = list_upload_dates(period_mode)
    return dates[0] if dates else None


def period_label(
    period_mode: Optional[str],
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> str:
    mode = _norm_period_mode(period_mode)
    if mode == "bulanan":
        m = (month or "").strip() or ((date or "")[:7])
        d = (update_day or "2").strip()
        try:
            dt = datetime.strptime(f"{m}-01", "%Y-%m-%d")
            month_name = dt.strftime("%B %Y")
        except ValueError:
            month_name = m
        return f"Bulanan {month_name} · Tgl {d}"
    return f"Harian {(date or '').strip()}"


def clean_kiriman_yes_df(df: pd.DataFrame) -> pd.DataFrame:
    """Buang baris kosong / dokumentasi Excel yang ikut ter-upload."""
    if df is None or df.empty:
        return df if df is not None else pd.DataFrame()

    out = df.copy()
    out.columns = [str(c).strip() for c in out.columns]
    out = out.fillna("").astype(str)

    # 1) baris sepenuhnya kosong
    nonempty = out.apply(lambda r: any(str(v).strip() != "" for v in r), axis=1)
    out = out.loc[nonempty]

    # 2) kolom AWB wajib terisi & bukan teks dokumentasi
    awb_col = None
    for c in out.columns:
        if str(c).strip().upper() == "AWB":
            awb_col = c
            break
    if awb_col is not None:
        awb = out[awb_col].astype(str).str.strip()
        junk_awb = (
            awb.eq("")
            | awb.str.upper().isin({"AWB", "E = AWB", "NO AWB", "CNOTE"})
            | awb.str.contains(r"^\s*[A-Z]\s*=", regex=True, na=False)
            | awb.str.contains(",", regex=False, na=False)
        )
        out = out.loc[~junk_awb]

    # 3) baris header/dokumentasi yang menempel di ORIGIN (list kolom dipaste)
    origin_col = None
    for c in out.columns:
        if str(c).strip().upper() == "ORIGIN":
            origin_col = c
            break
    if origin_col is not None:
        origin = out[origin_col].astype(str)
        junk_origin = origin.str.contains(
            r"ORIGIN\s*,\s*Destinasi|TRANSAKSI\s*-\s*TODAY\s*,\s*AWB",
            case=False,
            regex=True,
            na=False,
        ) | (origin.str.len() > 200)
        out = out.loc[~junk_origin]

    return out.reset_index(drop=True)


def resolve_period(
    period_mode: Optional[str] = "harian",
    *,
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """Return (mode, date_iso, month_yyyy_mm, update_day)."""
    mode = _norm_period_mode(period_mode)
    if mode == "harian":
        date_iso = (date or "").strip()
        if not date_iso:
            date_iso = latest_upload_date("harian") or ""
        return mode, date_iso or None, None, None

    month_yyyy_mm = (month or "").strip() or ((date or "")[:7] if date else "")
    day = (update_day or "2").strip()
    if day not in {"2", "8"}:
        day = "2"
    if not month_yyyy_mm:
        latest = latest_upload_date("bulanan") or ""
        if "|" in latest:
            month_yyyy_mm, day = latest.split("|", 1)
    return mode, None, month_yyyy_mm or None, day


def parse_kiriman_yes_bytes(content: bytes, suffix: str = ".csv") -> pd.DataFrame:
    """Parse upload bytes → DataFrame mentah (belum clean)."""
    suf = (suffix or "").lower()
    if suf in {".xlsx", ".xls"}:
        df = pd.read_excel(io.BytesIO(content), dtype=str)
    else:
        try:
            df = pd.read_csv(
                io.BytesIO(content),
                dtype=str,
                sep=None,
                engine="python",
                keep_default_na=False,
            )
        except UnicodeDecodeError:
            df = pd.read_csv(
                io.BytesIO(content),
                dtype=str,
                sep=None,
                engine="python",
                encoding="latin1",
                keep_default_na=False,
            )
    df.columns = [str(c).strip() for c in df.columns]
    return df.fillna("")


_PROGRESS_BUCKETS = frozenset(
    {
        "CLOSE - SUCCESS",
        "CLOSE - CANCEL",
        "CLOSE - RETURN",
        "UNDEL",
        "ON DELIVERY",
        "UN RUNSHEET",
        "UN INBOUND",
        "UN OM",
        "UN RCC",
    }
)


def map_progress_bucket(raw: str) -> Optional[str]:
    """Normalisasi nilai PROGRESS / STATUS_POD ke bucket pivot."""
    return _map_status_bucket(raw)


def _needs_formula_enrich(df: pd.DataFrame) -> bool:
    """True jika kolom PROGRESS belum berisi bucket hasil rumus."""
    if df is None or df.empty:
        return False
    prog_col = _find_source_col(list(df.columns), "PROGRESS")
    if not prog_col:
        return True
    vals = df[prog_col].astype(str).str.strip()
    nonempty = vals[vals != ""]
    if nonempty.empty:
        return True
    matched = nonempty.isin(_PROGRESS_BUCKETS).mean()
    return matched < 0.5


def ensure_kiriman_yes_enriched(
    df: pd.DataFrame,
    *,
    persist_path: Optional[Path] = None,
    period_mode: Optional[str] = "harian",
    date: Optional[str] = None,
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> pd.DataFrame:
    """Terapkan rumus jika CSV masih mentah; opsional tulis ulang file."""
    if df is None or df.empty or not _needs_formula_enrich(df):
        return df if df is not None else pd.DataFrame()

    enriched = apply_kiriman_yes_formulas(df)
    if _needs_formula_enrich(enriched):
        return enriched

    if persist_path and persist_path.is_file():
        enriched.to_csv(persist_path, index=False)
        meta_path = persist_path.with_name(persist_path.name + ".meta")
        meta: Dict[str, Any] = {}
        if meta_path.is_file():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
            except Exception:
                meta = {}
        meta["formulas_applied_at"] = datetime.now().isoformat()
        meta["formulas_repaired_at"] = meta["formulas_applied_at"]
        meta["rows_saved"] = int(len(enriched))
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    return enriched


def read_kiriman_yes_raw(
    date_iso: Optional[str] = None,
    *,
    period_mode: Optional[str] = "harian",
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> pd.DataFrame:
    mode, date_v, month_v, day_v = resolve_period(
        period_mode,
        date=date_iso,
        month=month,
        update_day=update_day,
    )
    path = resolve_data_path(
        mode, date=date_v, month=month_v, update_day=day_v
    )
    if not path:
        return pd.DataFrame()
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    df.columns = [str(c).strip() for c in df.columns]
    cleaned = clean_kiriman_yes_df(df.fillna(""))
    return ensure_kiriman_yes_enriched(
        cleaned,
        persist_path=path,
        period_mode=mode,
        date=date_v,
        month=month_v,
        update_day=day_v,
    )


def save_kiriman_yes_upload(
    df: pd.DataFrame,
    *,
    date_iso: Optional[str] = None,
    period_mode: str = "harian",
    month: Optional[str] = None,
    update_day: Optional[str] = None,
    original_filename: str,
    uploaded_by: str,
) -> Path:
    mode = _norm_period_mode(period_mode)
    if mode == "harian":
        date_v = (date_iso or "").strip()
        datetime.strptime(date_v, "%Y-%m-%d")
        month_v = None
        day_v = None
        archive_key = date_v
    else:
        date_v = None
        month_v = (month or "").strip() or ((date_iso or "")[:7])
        day_v = (update_day or "2").strip()
        if day_v not in {"2", "8"}:
            day_v = "2"
        datetime.strptime(f"{month_v}-01", "%Y-%m-%d")
        archive_key = f"{month_v}_tgl{day_v}"

    dest_dir = period_folder(mode, date=date_v, month=month_v, update_day=day_v)
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = data_path_for_period(mode, date=date_v, month=month_v, update_day=day_v)
    if path.is_file():
        archive = KIRIMAN_YES_DIR / "archive"
        archive.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.move(str(path), str(archive / f"kiriman_yes_{archive_key}_{ts}.csv"))
        old_meta = meta_path_for_period(mode, date=date_v, month=month_v, update_day=day_v)
        if old_meta.is_file():
            shutil.move(
                str(old_meta),
                str(archive / f"kiriman_yes_{archive_key}_{ts}.csv.meta"),
            )
        old_pivot = pivot_path_for_period(mode, date=date_v, month=month_v, update_day=day_v)
        if old_pivot.is_file():
            shutil.move(
                str(old_pivot),
                str(archive / f"kiriman_yes_{archive_key}_{ts}.pivot.json"),
            )

    cleaned = clean_kiriman_yes_df(df)
    # Hitung rumus SEKALI saat upload (Origin / Destinasi / PROGRESS / TRANSAKSI - TODAY)
    enriched = apply_kiriman_yes_formulas(cleaned)
    if _needs_formula_enrich(enriched):
        raise ValueError(
            "Gagal menerapkan rumus Kiriman YES (kolom PROGRESS masih mentah). "
            "Pastikan kolom STATUS_POD & tanggal manifest ada di file upload."
        )
    enriched.to_csv(path, index=False)
    label = period_label(mode, date=date_v, month=month_v, update_day=day_v)
    meta = {
        "original_filename": original_filename,
        "uploaded_by": uploaded_by,
        "timestamp": datetime.now().isoformat(),
        "period_mode": mode,
        "upload_date": date_v,
        "month": month_v,
        "update_day": day_v,
        "period_label": label,
        "formulas_applied_at": datetime.now().isoformat(),
        "rows_raw": int(len(df)),
        "rows_saved": int(len(enriched)),
    }
    meta_path_for_period(mode, date=date_v, month=month_v, update_day=day_v).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    rel = str(path.relative_to(KIRIMAN_YES_DIR)).replace("\\", "/")
    with open(KIRIMAN_YES_DIR / "upload_log.jsonl", "a", encoding="utf-8") as lf:
        lf.write(
            json.dumps(
                {
                    "filename": rel,
                    "original_filename": original_filename,
                    "uploaded_by": uploaded_by,
                    "period_mode": mode,
                    "upload_date": date_v,
                    "month": month_v,
                    "update_day": day_v,
                    "timestamp": meta["timestamp"],
                    "formulas_applied_at": meta["formulas_applied_at"],
                    "rows_raw": meta["rows_raw"],
                    "rows_saved": meta["rows_saved"],
                },
                ensure_ascii=False,
            )
            + "\n"
        )
    try:
        bake_kiriman_yes_pivots(
            mode, date=date_v, month=month_v, update_day=day_v
        )
    except Exception:
        pass
    return path


def read_upload_meta(
    date_iso: Optional[str] = None,
    *,
    period_mode: Optional[str] = "harian",
    month: Optional[str] = None,
    update_day: Optional[str] = None,
) -> Dict[str, Any]:
    mode, date_v, month_v, day_v = resolve_period(
        period_mode,
        date=date_iso,
        month=month,
        update_day=update_day,
    )
    path = meta_path_for_period(mode, date=date_v, month=month_v, update_day=day_v)
    if not path.is_file() and mode == "harian" and date_v:
        legacy = KIRIMAN_YES_DIR / date_v / (DATA_FILENAME + ".meta")
        path = legacy if legacy.is_file() else path
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


# Header tabel detail (urutan sesuai spesifikasi UI).
KIRIMAN_YES_DETAIL_COLUMNS: List[str] = [
    "ORIGIN",
    "Destinasi",
    "PROGRESS",
    "TRANSAKSI - TODAY",
    "AWB",
    "ID_ACCOUNT",
    "SHIPPER_NAME",
    "TGL_ENTRY",
    "CONSIGNEE_NAME",
    "ADDR1",
    "ADDR2",
    "ADDR3",
    "CONTACT",
    "NOTELP",
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

# Nama unik untuk materialisasi DataFrame (ORIGIN ke-2 → ORIGIN__RAW di internal,
# lalu di-export ke dict dengan key "ORIGIN" dua kali via list of tuples — diganti:
# FE memakai list display; BE mengisi dict dengan key unik lalu FE columns map.
# Praktis: materialisasi pakai nama unik, response items pakai display names;
# karena JSON object tidak boleh key duplikat, ORIGIN ke-2 tetap "ORIGIN"
# (nilai sama). FE columns array boleh punya "ORIGIN" 2× → baca key yang sama.

_COL_ALIASES: Dict[str, List[str]] = {
    "ORIGIN": ["origin", "3lc origin", "origin code"],
    "Destinasi": [
        "destinasi",
        "destination",
        "cabang destinasi",
        "cabang",
        "dest name",
        "dest_name",
    ],
    "PROGRESS": ["progress", "status progress", "progres"],
    "TRANSAKSI - TODAY": [
        "transaksi - today",
        "transaksi today",
        "lt transaksi today",
        "lt, transaksi - today",
        "lt",
        "status lt",
    ],
    "STATUS_POD": ["status_pod", "status pod", "statuspod", "pod status"],
    "CONTACT": ["contact", "kontak", "pic", "phone contact"],
    "NOTELP": ["notelp", "no telp", "no_telp", "telp", "phone", "hp", "no hp"],
    "TGL_ENTRY": ["tgl_entry", "tgl entry", "tanggal entry", "entry date"],
    "DEST": ["dest", "destination code", "3lc dest"],
    "AWB": ["awb", "cnote", "connote", "no awb"],
}


def _norm_header(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().replace("_", " ").split())


def _find_source_col(columns: List[str], target: str) -> Optional[str]:
    by_norm = {_norm_header(c): c for c in columns}
    # Exact / case-insensitive match to canonical name
    if _norm_header(target) in by_norm:
        return by_norm[_norm_header(target)]
    for alias in _COL_ALIASES.get(target, []):
        if _norm_header(alias) in by_norm:
            return by_norm[_norm_header(alias)]
    # Loose: strip punctuation
    target_compact = _norm_header(target).replace("-", " ").replace("/", " ")
    for c in columns:
        if _norm_header(c).replace("-", " ").replace("/", " ") == target_compact:
            return c
    return None


def _parse_entry_date(raw: Any) -> Optional[datetime]:
    s = str(raw or "").strip()
    if not s:
        return None
    # excel serial
    try:
        n = float(s)
        if n > 20000:
            return pd.to_datetime(n, unit="D", origin="1899-12-30").to_pydatetime()
    except Exception:
        pass
    for fmt in (
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d/%m/%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
    ):
        try:
            return datetime.strptime(s[:19], fmt)
        except ValueError:
            continue
    try:
        dt = pd.to_datetime(s, dayfirst=True, errors="coerce")
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except Exception:
        return None


def _normalize_coding_key(value: Any) -> str:
    return str(value or "").strip().upper()


def load_coding_ntt_cabang_map() -> Dict[str, str]:
    """Database1 Coding NTT: Coding → CABANG (VLOOKUP kolom 9)."""
    try:
        from utils.inbound_pivot import load_coding_ntt_geo_map

        geo = load_coding_ntt_geo_map()
        return {
            key: str(vals.get("Cabang") or "").strip()
            for key, vals in geo.items()
            if key
        }
    except Exception:
        return {}


def _vlookup_cabang(code: Any, cabang_map: Dict[str, str]) -> str:
    key = _normalize_coding_key(code)
    if not key:
        return ""
    return cabang_map.get(key, "")


def _transaksi_today_label(tgl_entry: Any, today: Optional[datetime] = None) -> str:
    """Bagian LT dari TGL_ENTRY: H+n / >H+5 (tanpa cek CLOSE)."""
    dt = _parse_entry_date(tgl_entry)
    if dt is None:
        return ""
    base = today or datetime.now()
    days = (base.date() - dt.date()).days
    if days < 0:
        return "Wrong Date"
    if days > 5:
        return ">H+5"
    return f"H+{days}"


def _transaksi_today_formula(
    progress: Any,
    tgl_entry: Any,
    today: Optional[datetime] = None,
) -> str:
    """=IF(LEFT(PROGRESS,5)="CLOSE","CLOSE",IF(DAYS(TODAY(),TGL_ENTRY)>5,">H+5","H+"&DAYS(...)))."""
    prog = str(progress or "").strip()
    if prog.upper()[:5] == "CLOSE":
        return "CLOSE"
    return _transaksi_today_label(tgl_entry, today)


def _find_origin_coding_col(df: pd.DataFrame) -> Optional[str]:
    """Kolom kode ORIGIN untuk VLOOKUP (bukan hasil CABANG).

    File hasil Excel sering punya ORIGIN (nama cabang) + ORIGIN.1 (kode KOE…).
    Upload APEX mentah biasanya hanya punya satu kolom ORIGIN berisi kode.
    """
    cols = list(df.columns)
    # Pandas rename duplikat header ORIGIN → ORIGIN.1
    for name in ("ORIGIN.1", "Origin.1", "ORIGIN_CODE", "Origin Code"):
        if name in df.columns:
            return name

    candidates: List[str] = []
    for c in cols:
        n = _norm_header(c)
        if n in {"origin", "3lc origin", "origin code"} or n.startswith("origin."):
            candidates.append(c)

    def _looks_like_coding(series: pd.Series) -> bool:
        sample = series.astype(str).str.strip()
        sample = sample[sample != ""]
        if sample.empty:
            return False
        hit = sample.head(80).str.match(r"^[A-Za-z]{2,5}\d{3,}", na=False).mean()
        return hit >= 0.5

    for c in candidates:
        if _looks_like_coding(df[c]):
            return c

    # Fallback: kolom ORIGIN apa adanya (APEX mentah)
    return _find_source_col(cols, "ORIGIN")


def _has_date_value(raw: Any) -> bool:
    """True jika sel berisi tanggal (bukan blank)."""
    s = str(raw or "").strip()
    if not s or s.lower() in {"nan", "none", "nat", "-"}:
        return False
    return _parse_entry_date(s) is not None


def _norm_status_pod(raw: Any) -> str:
    return str(raw or "").strip().upper()


def _is_awb_cancelled(raw: Any) -> bool:
    s = str(raw or "").strip().upper()
    return s in {"Y", "YES", "1", "TRUE"}


def _is_return_signal(
    *,
    status_pod: str,
    connote_return_rt: Any,
    confirm_shipment_undel: Any,
) -> bool:
    pod = status_pod
    pod_compact = pod.replace(" ", "").replace("/", "")
    if (
        "RETURN" in pod
        or pod == "RU"
        or pod.startswith("RU ")
        or pod.startswith("RU/")
        or pod_compact.startswith("RUSHIPPER")
    ):
        return True
    if str(connote_return_rt or "").strip():
        return True
    confirm = str(confirm_shipment_undel or "").strip().upper()
    if confirm.startswith("RETURN"):
        return True
    return False


def _is_auto_close_signal(
    *,
    status_web: Any,
    received_reason: Any,
    ireg_code: Any,
) -> bool:
    web = str(status_web or "").strip().upper()
    if "AUTO CLOSE" in web or web.endswith("AUTOCLOSE") or web == "AUTO CLOSE":
        return True
    reason = str(received_reason or "").strip().upper()
    if reason.startswith("CLOSE") or "CLOSE BY" in reason:
        return True
    # Selaras pola CLOSE di CTC (REMINDING DAYS / IREG)
    code = str(ireg_code or "").strip().upper()
    if code in {"CR1", "CR8", "PS2", "PS3"}:
        return True
    return False


def _stale_open_reference_date(
    progress: str,
    *,
    date_runsheet: Any,
    inbound_manifest_date: Any,
    outbound_manifest_date: Any,
    receiving_date: Any,
    tgl_entry: Any,
) -> Any:
    """Tanggal acuan untuk autoclose PROGRESS open yang sudah lewat >5 hari."""
    if progress == "ON DELIVERY":
        return date_runsheet
    if progress == "UN RUNSHEET":
        return inbound_manifest_date
    if progress in {"UN INBOUND", "UN IM"}:
        return outbound_manifest_date
    if progress == "UN OM":
        return receiving_date
    if progress == "UN RCC":
        return tgl_entry
    return None


def _compute_progress_value(
    *,
    status_pod: Any,
    date_runsheet: Any,
    inbound_manifest_date: Any,
    outbound_manifest_date: Any,
    receiving_date: Any,
    awb_cancel: Any = None,
    connote_return_rt: Any = None,
    confirm_shipment_undel: Any = None,
    status_web: Any = None,
    received_reason: Any = None,
    ireg_code: Any = None,
    tgl_entry: Any = None,
    today: Optional[datetime] = None,
) -> str:
    """Hitung PROGRESS — pengecekan berurutan, tidak boleh lompat.

    1. AWB_CANCEL = Y              → CLOSE - CANCEL
    2. STATUS_POD SUCCESS          → CLOSE - SUCCESS
    3. STATUS_POD UNDEL            → UNDEL
    4. RETURN / RU / CONNOTE_RT…   → CLOSE - RETURN
    5. AUTO CLOSE / CLOSE BY / IREG → CLOSE - SUCCESS
    6. DATE_RUNSHEET ada           → ON DELIVERY
    7. INBOUND_MANIFEST_DATE ada   → UN RUNSHEET
    8. OUTBOUND_MANIFEST_DATE ada  → UN INBOUND
    9. RECEIVING_DATE ada          → UN OM
    10. RECEIVING_DATE blank       → UN RCC
    11. Open (selain UNDEL) & DAYS(TODAY, acuan)>5 → CLOSE - SUCCESS
        (selaras Excel: sisa open >H+5 hampir selalu UNDEL saja)
    """
    if _is_awb_cancelled(awb_cancel):
        return "CLOSE - CANCEL"

    pod = _norm_status_pod(status_pod)
    pod_compact = pod.replace(" ", "").replace("/", "")
    if pod == "SUCCESS" or pod.endswith(" SUCCESS") or pod.endswith("/SUCCESS"):
        return "CLOSE - SUCCESS"
    if "UNDEL" in pod_compact:
        return "UNDEL"
    if _is_return_signal(
        status_pod=pod,
        connote_return_rt=connote_return_rt,
        confirm_shipment_undel=confirm_shipment_undel,
    ):
        return "CLOSE - RETURN"
    if _is_auto_close_signal(
        status_web=status_web,
        received_reason=received_reason,
        ireg_code=ireg_code,
    ):
        return "CLOSE - SUCCESS"
    if _has_date_value(date_runsheet):
        progress = "ON DELIVERY"
    elif _has_date_value(inbound_manifest_date):
        progress = "UN RUNSHEET"
    elif _has_date_value(outbound_manifest_date):
        progress = "UN INBOUND"
    elif _has_date_value(receiving_date):
        progress = "UN OM"
    elif not _has_date_value(receiving_date):
        progress = "UN RCC"
    else:
        progress = ""

    # Autoclose open tua (kecuali UNDEL) → CLOSE - SUCCESS
    if progress and progress != "UNDEL" and (
        progress.startswith("UN ") or progress == "ON DELIVERY"
    ):
        ref = _stale_open_reference_date(
            progress,
            date_runsheet=date_runsheet,
            inbound_manifest_date=inbound_manifest_date,
            outbound_manifest_date=outbound_manifest_date,
            receiving_date=receiving_date,
            tgl_entry=tgl_entry,
        )
        dt = _parse_entry_date(ref)
        base = today or datetime.now()
        if dt is not None and (base.date() - dt.date()).days > 5:
            return "CLOSE - SUCCESS"
    return progress


def _series_at(out: pd.DataFrame, col: Optional[str], index) -> pd.Series:
    if col and col in out.columns:
        return out[col]
    return pd.Series("", index=index, dtype=str)


def apply_kiriman_yes_formulas(df: pd.DataFrame) -> pd.DataFrame:
    """Terapkan rumus Excel Kiriman YES di atas frame APEX mentah.

    - Origin     = VLOOKUP(ORIGIN_CODE, Database1 Coding NTT!$A:$K, 9, 0) → CABANG
    - Destinasi  = VLOOKUP(DEST,       Database1 Coding NTT!$A:$K, 9, 0) → CABANG
    - PROGRESS   = urutan STATUS_POD lalu tanggal (lihat _compute_progress_value)
    - TRANSAKSI - TODAY = IF(LEFT(PROGRESS,5)="CLOSE","CLOSE", H+/ >H+5 dari TGL_ENTRY)
    """
    if df is None or df.empty:
        return df if df is not None else pd.DataFrame()

    out = df.copy()
    out.columns = [str(c).strip() for c in out.columns]
    cols = list(out.columns)
    cabang_map = load_coding_ntt_cabang_map()

    origin_code_col = _find_origin_coding_col(out)
    dest_code_col = _find_source_col(cols, "DEST")
    if dest_code_col and _norm_header(dest_code_col) in {
        "destinasi",
        "cabang",
        "cabang destinasi",
    }:
        dest_code_col = None
        for c in cols:
            if _norm_header(c) in {"dest", "destination code", "3lc dest"}:
                dest_code_col = c
                break

    if origin_code_col is not None:
        origin_codes = out[origin_code_col].astype(str)
        if origin_code_col == "ORIGIN" or (
            "ORIGIN.1" not in out.columns
            and origin_code_col not in {"ORIGIN.1", "Origin.1"}
        ):
            sample = origin_codes.str.strip()
            sample = sample[sample != ""]
            looks_coding = False
            if not sample.empty:
                looks_coding = bool(
                    sample.head(80).str.match(r"^[A-Za-z]{2,5}\d{3,}", na=False).mean()
                    >= 0.5
                )
            if looks_coding or origin_code_col == "ORIGIN":
                out["ORIGIN.1"] = origin_codes
        out["ORIGIN"] = origin_codes.map(lambda v: _vlookup_cabang(v, cabang_map))
    elif "ORIGIN" not in out.columns:
        out["ORIGIN"] = ""

    if dest_code_col is not None:
        out["Destinasi"] = out[dest_code_col].map(
            lambda v: _vlookup_cabang(v, cabang_map)
        )
    elif "Destinasi" not in out.columns:
        out["Destinasi"] = ""

    pod_col = _find_source_col(cols, "STATUS_POD")
    dr_col = _find_source_col(cols, "DATE_RUNSHEET")
    im_col = _find_source_col(cols, "INBOUND_MANIFEST_DATE")
    om_col = _find_source_col(cols, "OUTBOUND_MANIFEST_DATE")
    rc_col = _find_source_col(cols, "RECEIVING_DATE")
    cancel_col = _find_source_col(cols, "AWB_CANCEL")
    rt_col = _find_source_col(cols, "CONNOTE_RETURN_RT")
    confirm_col = _find_source_col(cols, "CONFIRM_SHIPMENT_UNDEL")
    web_col = _find_source_col(cols, "STATUS_WEB")
    reason_col = _find_source_col(cols, "RECEIVED/REASON")
    ireg_col = _find_source_col(cols, "IREG_CODE")

    pod_s = _series_at(out, pod_col, out.index)
    dr_s = _series_at(out, dr_col, out.index)
    im_s = _series_at(out, im_col, out.index)
    om_s = _series_at(out, om_col, out.index)
    rc_s = _series_at(out, rc_col, out.index)
    cancel_s = _series_at(out, cancel_col, out.index)
    rt_s = _series_at(out, rt_col, out.index)
    confirm_s = _series_at(out, confirm_col, out.index)
    web_s = _series_at(out, web_col, out.index)
    reason_s = _series_at(out, reason_col, out.index)
    ireg_s = _series_at(out, ireg_col, out.index)

    tgl_col = _find_source_col(cols, "TGL_ENTRY")
    today = datetime.now()
    tgl_series = _series_at(out, tgl_col, out.index)

    out["PROGRESS"] = [
        _compute_progress_value(
            status_pod=p,
            date_runsheet=dr,
            inbound_manifest_date=im,
            outbound_manifest_date=om,
            receiving_date=rc,
            awb_cancel=ac,
            connote_return_rt=rt,
            confirm_shipment_undel=cf,
            status_web=sw,
            received_reason=rr,
            ireg_code=ig,
            tgl_entry=te,
            today=today,
        )
        for p, dr, im, om, rc, ac, rt, cf, sw, rr, ig, te in zip(
            pod_s.tolist(),
            dr_s.tolist(),
            im_s.tolist(),
            om_s.tolist(),
            rc_s.tolist(),
            cancel_s.tolist(),
            rt_s.tolist(),
            confirm_s.tolist(),
            web_s.tolist(),
            reason_s.tolist(),
            ireg_s.tolist(),
            tgl_series.tolist(),
        )
    ]

    out["TRANSAKSI - TODAY"] = [
        _transaksi_today_formula(p, t, today)
        for p, t in zip(out["PROGRESS"].tolist(), tgl_series.tolist())
    ]

    return out


def build_kiriman_yes_detail_frame(df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """Normalisasi ke kolom detail dari CSV yang sudah di-enrich saat upload."""
    unique_cols: List[str] = []
    seen = set()
    for c in KIRIMAN_YES_DETAIL_COLUMNS:
        if c in seen:
            continue
        seen.add(c)
        unique_cols.append(c)

    src = df if df is not None else read_kiriman_yes_raw()
    if src is None or src.empty:
        return pd.DataFrame(columns=unique_cols)

    src_cols = list(src.columns)
    series_map: Dict[str, pd.Series] = {}

    for col in unique_cols:
        found = _find_source_col(src_cols, col)
        if found is not None:
            series_map[col] = src[found].astype(str)
        elif col in src.columns:
            series_map[col] = src[col].astype(str)
        else:
            series_map[col] = pd.Series("", index=src.index, dtype=str)

    out = pd.DataFrame(series_map)
    return out[unique_cols].fillna("").astype(str)


def _map_status_bucket(raw: str) -> Optional[str]:
    s = (raw or "").strip()
    if not s:
        return None
    known = {
        "CLOSE - SUCCESS",
        "CLOSE - CANCEL",
        "UNDEL",
        "CLOSE - RETURN",
        "ON DELIVERY",
        "UN RUNSHEET",
        "UN INBOUND",
        "UN OM",
        "UN RCC",
    }
    if s in known:
        return s
    compact = " ".join(s.replace("_", " ").replace("-", " - ").split()).upper()
    if compact in {"CLOSE - SUCCESS", "CLOSE SUCCESS", "SUCCESS"}:
        return "CLOSE - SUCCESS"
    if compact in {"CLOSE - CANCEL", "CLOSE CANCEL"} or (
        "CLOSE" in compact and "CANCEL" in compact
    ):
        return "CLOSE - CANCEL"
    if compact in {"CLOSE - RETURN", "CLOSE RETURN"} or "RETURN" in compact:
        return "CLOSE - RETURN"
    if "UNDEL" in compact.replace(" ", ""):
        return "UNDEL"
    if compact == "ON DELIVERY":
        return "ON DELIVERY"
    if compact == "UN RUNSHEET":
        return "UN RUNSHEET"
    if compact == "UN INBOUND":
        return "UN INBOUND"
    if compact in {"UN OM", "UNOM"}:
        return "UN OM"
    if compact in {"UN RCC", "UNRCC"}:
        return "UN RCC"
    return None


def _cabang_options_from_view(view: pd.DataFrame) -> List[str]:
    """Opsi filter Cabang Destinasi = nilai unik kolom Destinasi."""
    vals: set[str] = set()
    if "Destinasi" not in view.columns:
        return []
    for v in view["Destinasi"].astype(str).tolist():
        s = str(v).strip()
        if s:
            vals.add(s)
    return sorted(vals, key=lambda x: x.lower())


def _origin_options_from_view(view: pd.DataFrame) -> List[str]:
    """Opsi filter Cabang Origin = nilai unik kolom ORIGIN (hasil VLOOKUP)."""
    vals: set[str] = set()
    if "ORIGIN" not in view.columns:
        return []
    for v in view["ORIGIN"].astype(str).tolist():
        s = str(v).strip()
        if s:
            vals.add(s)
    return sorted(vals, key=lambda x: x.lower())


def apply_kiriman_yes_filters(
    view: pd.DataFrame,
    *,
    status_pod: Optional[str] = None,
    cabang: Optional[str] = None,
    origin: Optional[str] = None,
    lt: Optional[str] = None,
) -> pd.DataFrame:
    """Filter baris dalam satu file upload. Tanggal upload dipilih lewat pemilihan file."""
    out = view

    pod = (status_pod or "").strip()
    if pod and pod not in {"(All)", "All", ""}:
        if "STATUS_POD" in out.columns:
            buckets = {
                "CLOSE - SUCCESS",
                "UNDEL",
                "CLOSE - RETURN",
                "ON DELIVERY",
                "UN RUNSHEET",
                "UN INBOUND",
                "UN OM",
                "UN RCC",
            }
            if pod in buckets:
                mask = out["STATUS_POD"].astype(str).map(_map_status_bucket) == pod
                mask = mask | (out["STATUS_POD"].astype(str).str.strip() == pod)
                if "PROGRESS" in out.columns:
                    mask = mask | (out["PROGRESS"].astype(str).str.strip() == pod)
                out = out[mask]
            else:
                out = out[out["STATUS_POD"].astype(str).str.strip() == pod]

    org = (origin or "").strip()
    if org and org not in {"(All)", "All", ""}:
        if "ORIGIN" in out.columns:
            out = out[out["ORIGIN"].astype(str).str.strip() == org]
        else:
            out = out.iloc[0:0]

    cab = (cabang or "").strip()
    if cab and cab not in {"(All)", "All", ""}:
        if "Destinasi" in out.columns:
            out = out[out["Destinasi"].astype(str).str.strip() == cab]
        else:
            out = out.iloc[0:0]

    lt_f = (lt or "").strip()
    if lt_f and lt_f not in {"(All)", "All", ""}:
        if "TRANSAKSI - TODAY" in out.columns:
            out = out[out["TRANSAKSI - TODAY"].astype(str).str.strip() == lt_f]

    return out


def list_kiriman_yes_detail(
    *,
    status_pod: Optional[str] = None,
    cabang: Optional[str] = None,
    origin: Optional[str] = None,
    lt: Optional[str] = None,
    date: Optional[str] = None,
    period_mode: Optional[str] = "harian",
    month: Optional[str] = None,
    update_day: Optional[str] = None,
    page: int = 1,
    limit: int = 0,
    q: Optional[str] = None,
) -> Dict[str, Any]:
    mode, date_iso, month_v, day_v = resolve_period(
        period_mode,
        date=date,
        month=month,
        update_day=update_day,
    )
    upload_dates = list_upload_dates(mode)
    label = period_label(mode, date=date_iso, month=month_v, update_day=day_v)

    empty_base = {
        "items": [],
        "total": 0,
        "page": 1,
        "limit": int(limit or 0),
        "pages": 0,
        "columns": KIRIMAN_YES_DETAIL_COLUMNS,
        "cabang_options": [],
        "origin_options": [],
        "upload_dates": upload_dates,
        "upload_date": date_iso,
        "period_mode": mode,
        "month": month_v,
        "update_day": day_v,
        "period_label": label,
    }

    if mode == "harian" and not date_iso:
        return {
            **empty_base,
            "message": "Belum ada data. Upload master Kiriman Yes terlebih dahulu.",
        }
    if mode == "bulanan" and not month_v:
        return {
            **empty_base,
            "message": "Belum ada data bulanan. Upload master Kiriman Yes terlebih dahulu.",
        }

    raw = read_kiriman_yes_raw(
        date_iso,
        period_mode=mode,
        month=month_v,
        update_day=day_v,
    )
    if raw.empty:
        return {
            **empty_base,
            "message": f"Belum ada master upload untuk {label}.",
        }

    base = build_kiriman_yes_detail_frame(raw)
    origin_options = _origin_options_from_view(base)
    # Opsi destinasi mengikuti filter origin (jika dipilih)
    destinasi_base = apply_kiriman_yes_filters(base, origin=origin)
    cabang_options = _cabang_options_from_view(destinasi_base)

    view = apply_kiriman_yes_filters(
        base,
        status_pod=status_pod,
        cabang=cabang,
        origin=origin,
        lt=lt,
    )
    view = filter_dataframe_by_query(view, q)
    total = int(len(view))
    meta = read_upload_meta(
        date_iso,
        period_mode=mode,
        month=month_v,
        update_day=day_v,
    )

    def records_from(frame: pd.DataFrame) -> List[Dict[str, Any]]:
        return frame.to_dict(orient="records")

    payload_base = {
        "columns": KIRIMAN_YES_DETAIL_COLUMNS,
        "cabang_options": cabang_options,
        "origin_options": origin_options,
        "upload_dates": upload_dates,
        "upload_date": date_iso,
        "period_mode": mode,
        "month": month_v,
        "update_day": day_v,
        "period_label": label,
        "meta": {
            "original_filename": meta.get("original_filename"),
            "uploaded_by": meta.get("uploaded_by"),
            "timestamp": meta.get("timestamp"),
            "rows_raw": meta.get("rows_raw"),
            "rows_saved": meta.get("rows_saved"),
        },
        "message": None,
    }

    page_i = max(1, int(page or 1))
    limit_i = int(limit or 0)
    if limit_i <= 0:
        return {
            **payload_base,
            "items": records_from(view),
            "total": total,
            "page": 1,
            "limit": 0,
            "pages": 1 if total else 0,
        }

    pages = max(1, (total + limit_i - 1) // limit_i) if total else 0
    if pages and page_i > pages:
        page_i = pages
    start = (page_i - 1) * limit_i
    end = start + limit_i
    slice_df = view.iloc[start:end]
    return {
        **payload_base,
        "items": records_from(slice_df),
        "total": total,
        "page": page_i,
        "limit": limit_i,
        "pages": pages,
    }

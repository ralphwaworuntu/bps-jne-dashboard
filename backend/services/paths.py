"""Shared upload directory / file path constants and small helpers."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import json

MASTER_DATA_DIR = Path("uploads/master")
MASTER_DATA_117_DIR = Path("uploads/master_117")
APEX_OTS_DIR = Path("uploads/apex_ots")
APEX_TRANSIT_DIR = Path("uploads/apex_transit")
LASTMILE_DIR = Path("uploads/lastmile")
FIRSTMILE_DIR = Path("uploads/firstmile")
GEOTAGGING_DIR = Path("uploads/geotagging")
DB_CCC_DIR = Path("uploads/db_ccc")
BREACH_MONITORING_DIR = Path("uploads/breach_monitoring")
POTENSI_CLAIM_DIR = Path("uploads/potensi_claim")
SMU_DIR = Path("uploads/smu")
MASTER_REPORT_DIR = Path("uploads/master_report")
CAKUPAN_DIR = Path("uploads/cakupan_area")
KIRIMAN_YES_DIR = Path("uploads/kiriman_yes")
ALL_SHIPMENT_DIR = Path("uploads/all_shipment")
ALC_PENJUALAN_DIR = Path("uploads/alc_penjualan")
OPS_MASTER_DATA_DIR = Path("uploads/ops_master_data")

REF_SLA_LAZADA_DIR = Path("uploads/referensi/sla_lazada")
REF_SERVICE_DIR = Path("uploads/referensi/service")
REF_SLA_SHOPEE_DIR = Path("uploads/referensi/sla_shopee")
REF_DB_1_DIR = Path("uploads/referensi/db_1")
REF_DB_2_DIR = Path("uploads/referensi/db_2")
REF_ACCOUNT_DIR = Path("uploads/referensi/account")

REF_SLA_LAZADA_FILE = REF_SLA_LAZADA_DIR / "ref_sla_lazada.xlsx"
REF_SERVICE_FILE = REF_SERVICE_DIR / "ref_service.xlsx"
REF_SLA_SHOPEE_FILE = REF_SLA_SHOPEE_DIR / "ref_sla_shopee.xlsx"
REF_DB_1_FILE = REF_DB_1_DIR / "ref_db_1.xlsx"
REF_DB_2_FILE = REF_DB_2_DIR / "ref_db_2.xlsx"
REF_ACCOUNT_FILE = REF_ACCOUNT_DIR / "ref_account.xlsx"

MASTER_DATA_FILE = MASTER_DATA_DIR / "master_data.xlsx"
MASTER_DATA_117_FILE = MASTER_DATA_117_DIR / "master_data_117.xlsx"
APEX_OTS_FILE = APEX_OTS_DIR / "apex_ots.xlsx"
APEX_TRANSIT_FILE = APEX_TRANSIT_DIR / "apex_transit.xlsx"
LASTMILE_FILE = LASTMILE_DIR / "allshipment_lastmile.xlsx"
FIRSTMILE_FILE = FIRSTMILE_DIR / "allshipment_firstmile.xlsx"
FIRSTMILE_OTS_GENERAL_FILE = FIRSTMILE_DIR / "ots_general_cache.csv"
FIRSTMILE_OTS_CABANG_FILE = FIRSTMILE_DIR / "ots_cabang_cache.csv"
GEOTAGGING_FILE = GEOTAGGING_DIR / "geotagging_data.csv"
DB_CCC_FILE = DB_CCC_DIR / "db_ccc_data.xlsx"
BREACH_MONITORING_FILE = BREACH_MONITORING_DIR / "breach_monitoring_data.xlsx"
POTENSI_CLAIM_FILE = POTENSI_CLAIM_DIR / "potensi_claim_data.xlsx"
SMU_FILE = SMU_DIR / "smu_data.csv"
MASTER_REPORT_FILE = MASTER_REPORT_DIR / "master_report_data.csv"
CAKUPAN_FILE = CAKUPAN_DIR / "cakupan_area_data.csv"
KIRIMAN_YES_FILE = KIRIMAN_YES_DIR / "kiriman_yes_data.csv"

ALL_SHIPMENT_TEMPLATE_KINDS = {
    "all_inbound_ctc": "template_all_inbound_ctc",
    "inbound": "template_inbound",
    "outstanding": "template_outstanding",
}


def _find_stem_file(directory: Path, stem: str):
    if not directory.exists():
        return None
    matches = [
        p for p in directory.glob(f"{stem}.*")
        if p.is_file() and not p.name.endswith(".meta") and p.suffix.lower() != ".meta"
    ]
    return matches[0] if matches else None


def _all_shipment_master_file():
    return _find_stem_file(ALL_SHIPMENT_DIR, "master_inbound")


def _all_shipment_template_file(kind: str):
    stem = ALL_SHIPMENT_TEMPLATE_KINDS.get(kind)
    if not stem:
        return None
    return _find_stem_file(ALL_SHIPMENT_DIR, stem)


def _range_from_mtime(path: Optional[Path]):
    """14-day inclusive window ending on file mtime (placeholder until Excel date parsing)."""
    if not path or not path.exists():
        return None, None
    end = datetime.fromtimestamp(path.stat().st_mtime)
    start = end - timedelta(days=13)
    return start.isoformat(), end.isoformat()


def _save_all_shipment_upload(content: bytes, stem: str, original_filename: Optional[str], uploaded_by: Optional[str] = None):
    ALL_SHIPMENT_DIR.mkdir(parents=True, exist_ok=True)
    archive_dir = ALL_SHIPMENT_DIR / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(original_filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls", ".csv"}:
        suffix = ".xlsx"
    for old in ALL_SHIPMENT_DIR.glob(f"{stem}.*"):
        if not old.is_file():
            continue
        if old.name.endswith(".meta"):
            continue
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            archived = archive_dir / f"{old.stem}_{ts}{old.suffix}"
            old.replace(archived)
            old_meta = ALL_SHIPMENT_DIR / f"{old.name}.meta"
            if old_meta.exists():
                old_meta.replace(archive_dir / f"{archived.name}.meta")
        except Exception:
            try:
                old.unlink()
            except Exception:
                pass
    dest = ALL_SHIPMENT_DIR / f"{stem}{suffix}"
    with open(dest, "wb") as f:
        f.write(content)
    meta_path = ALL_SHIPMENT_DIR / f"{stem}{suffix}.meta"
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "original_filename": original_filename,
                    "uploaded_by": uploaded_by,
                    "timestamp": datetime.now().isoformat(),
                },
                f,
            )
    except Exception:
        pass
    return dest


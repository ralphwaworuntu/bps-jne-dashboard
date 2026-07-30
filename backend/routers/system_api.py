"""Core system routes: health, protected uploads, system-info."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlmodel import Session

from auth import get_current_active_user, get_user_from_token_string
from database import get_session
from models import User
from services.paths import (
    MASTER_DATA_FILE,
    MASTER_DATA_117_FILE,
    APEX_OTS_FILE,
    APEX_TRANSIT_FILE,
    LASTMILE_FILE,
    FIRSTMILE_FILE,
    GEOTAGGING_FILE,
    DB_CCC_FILE,
    BREACH_MONITORING_FILE,
    POTENSI_CLAIM_FILE,
    REF_SLA_LAZADA_FILE,
    REF_SERVICE_FILE,
    REF_SLA_SHOPEE_FILE,
    REF_DB_1_FILE,
    REF_DB_2_FILE,
    REF_ACCOUNT_FILE,
    SMU_FILE,
    MASTER_REPORT_FILE,
    CAKUPAN_FILE,
    KIRIMAN_YES_FILE,
    _all_shipment_master_file,
    _all_shipment_template_file,
    _range_from_mtime,
)

router = APIRouter(tags=["system"])

UPLOADS_ROOT = Path("uploads").resolve()


@router.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}


@router.get("/uploads/{file_path:path}")
async def serve_protected_upload(
    file_path: str,
    request: Request,
    token: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """Serve file di uploads/ hanya untuk user terautentikasi (Bearer atau ?token=)."""
    auth_token = token
    if not auth_token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            auth_token = auth_header[7:]
    if not auth_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    get_user_from_token_string(auth_token, session)

    candidate = (UPLOADS_ROOT / file_path).resolve()
    try:
        candidate.relative_to(UPLOADS_ROOT)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not candidate.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(candidate)


@router.get("/system-info")
def get_system_info(current_user: User = Depends(get_current_active_user)):
    def get_file_time(path: Optional[Path]):
        if path and path.exists():
            dt = datetime.fromtimestamp(path.stat().st_mtime)
            return dt.isoformat()
        return None

    def get_original_filename(path: Optional[Path]):
        if not path or not path.exists():
            return None
        meta_path = path.parent / (path.name + ".meta")
        if meta_path.exists():
            try:
                import json

                with open(meta_path, "r") as f:
                    data = json.load(f)
                    return data.get("original_filename")
            except Exception:
                pass
        return None

    master_inbound = _all_shipment_master_file()
    tpl_ctc = _all_shipment_template_file("all_inbound_ctc")
    tpl_inbound = _all_shipment_template_file("inbound")
    tpl_outstanding = _all_shipment_template_file("outstanding")
    ctc_range_start, ctc_range_end = _range_from_mtime(tpl_ctc)

    return {
        "master_last_update": get_file_time(MASTER_DATA_FILE),
        "master_117_last_update": get_file_time(MASTER_DATA_117_FILE),
        "apex_ots_last_update": get_file_time(APEX_OTS_FILE),
        "apex_transit_last_update": get_file_time(APEX_TRANSIT_FILE),
        "lastmile_last_update": get_file_time(LASTMILE_FILE),
        "firstmile_last_update": get_file_time(FIRSTMILE_FILE),
        "geotagging_last_update": get_file_time(GEOTAGGING_FILE),
        "db_ccc_last_update": get_file_time(DB_CCC_FILE),
        "breach_monitoring_last_update": get_file_time(BREACH_MONITORING_FILE),
        "potensi_claim_last_update": get_file_time(POTENSI_CLAIM_FILE),
        "ref_sla_lazada_last_update": get_file_time(REF_SLA_LAZADA_FILE),
        "ref_service_last_update": get_file_time(REF_SERVICE_FILE),
        "ref_sla_shopee_last_update": get_file_time(REF_SLA_SHOPEE_FILE),
        "ref_db_1_last_update": get_file_time(REF_DB_1_FILE),
        "ref_db_2_last_update": get_file_time(REF_DB_2_FILE),
        "ref_account_last_update": get_file_time(REF_ACCOUNT_FILE),
        "master_filename": get_original_filename(MASTER_DATA_FILE),
        "master_117_filename": get_original_filename(MASTER_DATA_117_FILE),
        "apex_ots_filename": get_original_filename(APEX_OTS_FILE),
        "apex_transit_filename": get_original_filename(APEX_TRANSIT_FILE),
        "lastmile_filename": get_original_filename(LASTMILE_FILE),
        "firstmile_filename": get_original_filename(FIRSTMILE_FILE),
        "geotagging_filename": get_original_filename(GEOTAGGING_FILE),
        "db_ccc_filename": get_original_filename(DB_CCC_FILE),
        "breach_monitoring_filename": get_original_filename(BREACH_MONITORING_FILE),
        "potensi_claim_filename": get_original_filename(POTENSI_CLAIM_FILE),
        "ref_sla_lazada_filename": get_original_filename(REF_SLA_LAZADA_FILE),
        "ref_service_filename": get_original_filename(REF_SERVICE_FILE),
        "ref_sla_shopee_filename": get_original_filename(REF_SLA_SHOPEE_FILE),
        "ref_db_1_filename": get_original_filename(REF_DB_1_FILE),
        "ref_db_2_filename": get_original_filename(REF_DB_2_FILE),
        "ref_account_filename": get_original_filename(REF_ACCOUNT_FILE),
        "smu_last_update": get_file_time(SMU_FILE),
        "smu_filename": get_original_filename(SMU_FILE),
        "master_report_last_update": get_file_time(MASTER_REPORT_FILE),
        "master_report_filename": get_original_filename(MASTER_REPORT_FILE),
        "cakupan_last_update": get_file_time(CAKUPAN_FILE),
        "cakupan_filename": get_original_filename(CAKUPAN_FILE),
        "kiriman_yes_last_update": get_file_time(KIRIMAN_YES_FILE),
        "kiriman_yes_filename": get_original_filename(KIRIMAN_YES_FILE),
        "all_shipment_master_inbound_last_update": get_file_time(master_inbound),
        "all_shipment_master_inbound_filename": get_original_filename(master_inbound),
        "all_inbound_ctc_last_update": get_file_time(tpl_ctc),
        "all_inbound_ctc_filename": get_original_filename(tpl_ctc),
        "all_inbound_ctc_range_start": ctc_range_start,
        "all_inbound_ctc_range_end": ctc_range_end,
        "inbound_last_update": get_file_time(tpl_inbound),
        "inbound_filename": get_original_filename(tpl_inbound),
        "outstanding_last_update": get_file_time(tpl_outstanding),
        "outstanding_filename": get_original_filename(tpl_outstanding),
    }

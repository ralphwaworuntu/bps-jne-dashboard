from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from typing import List, Optional
from sqlmodel import Session, select
from datetime import datetime, timezone, timedelta
import os
import shutil
import io
import pandas as pd
from fastapi.responses import StreamingResponse

from database import get_session
from models import User, CorrectionRequest, CorrectionAttachment
from auth import get_current_active_user

# Define upload directory for proofs
CORRECTION_PROOFS_DIR = "uploads/correction_proofs"
os.makedirs(CORRECTION_PROOFS_DIR, exist_ok=True)

router = APIRouter(
    prefix="/correction-requests",
    tags=["correction-requests"]
)

@router.post("/", response_model=CorrectionRequest)
@router.post("", response_model=CorrectionRequest, include_in_schema=False)
async def create_correction_request(
    awb: str = Form(...),
    address_1: str = Form(...),
    coding_awal: str = Form(...),
    kecamatan_awal: str = Form(...),
    coding_akhir: str = Form(...),
    kecamatan_akhir: str = Form(...),
    address_2: Optional[str] = Form(None),
    alasan: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Permission Check: Only Admin or PIC Cabang can create (or Super Admin)
    allowed_roles = ["Admin Cabang", "PIC Cabang", "Super Admin", "admin"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized to create requests")

    if not (1 <= len(files) <= 6):
        raise HTTPException(status_code=400, detail="Harap lampirkan 1 sampai 6 gambar")

    new_request = CorrectionRequest(
        awb=awb,
        address_1=address_1,
        coding_awal=coding_awal,
        kecamatan_awal=kecamatan_awal,
        coding_akhir=coding_akhir,
        kecamatan_akhir=kecamatan_akhir,
        address_2=address_2,
        alasan=alasan,
        user_id=current_user.id
    )
    
    session.add(new_request)
    session.commit()
    session.refresh(new_request)
    
    for file in files:
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_filename = file.filename.replace(" ", "_")
        filename = f"req_{new_request.id}_branch_{timestamp}_{safe_filename}"
        file_path = os.path.join(CORRECTION_PROOFS_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment = CorrectionAttachment(
            request_id=new_request.id,
            file_path=f"/{CORRECTION_PROOFS_DIR}/{filename}",
            filename=file.filename,
            attachment_type="branch"
        )
        session.add(attachment)
        
    session.commit()
    session.refresh(new_request)
        
    return new_request

@router.get("/", response_model=List[dict])
@router.get("", response_model=List[dict], include_in_schema=False)
async def get_correction_requests(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # List all requests (Sorted by Date Newest)
    statement = select(CorrectionRequest)

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
            statement = statement.where(CorrectionRequest.entry_date >= start_dt)
        except ValueError:
             pass 
             
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            statement = statement.where(CorrectionRequest.entry_date <= end_dt)
        except ValueError:
            pass

    statement = statement.order_by(CorrectionRequest.entry_date.desc())
    results = session.exec(statement).all()
    
    # Needs to serialize with attachments. We'll return a dict representation
    output = []
    for req in results:
        req_dict = req.dict()
        req_dict["attachments"] = [att.dict() for att in req.attachments]
        output.append(req_dict)
        
    return output

@router.put("/{request_id}", response_model=CorrectionRequest)
async def update_correction_request(
    request_id: int,
    awb: str = Form(...),
    address_1: str = Form(...),
    address_2: str = Form(...),
    coding_awal: str = Form(...),
    kecamatan_awal: str = Form(...),
    coding_akhir: str = Form(...),
    kecamatan_akhir: str = Form(...),
    alasan: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    req = session.get(CorrectionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Permission Logic for Edit:
    # 1. Creator can edit only if NOT Submitted? User requirement said "Jika sudah submit, admin dan PIC tidak bisa edit".
    #    This implies Creator CANNOT edit after submit. Status starts as Submitted.
    #    So Creator effectively CANNOT edit.
    # 2. SCO and BPS CAN edit.
    
    can_edit = False
    if current_user.role in ["Admin SCO", "Admin BPS", "Super Admin", "admin"]:
        can_edit = True
        
    if not can_edit:
        raise HTTPException(status_code=403, detail="Cannot edit submitted request")

    if not can_edit:
        raise HTTPException(status_code=403, detail="Cannot edit submitted request")

    req.awb = awb
    req.address_1 = address_1
    req.address_2 = address_2
    req.coding_awal = coding_awal
    req.kecamatan_awal = kecamatan_awal
    req.coding_akhir = coding_akhir
    req.kecamatan_akhir = kecamatan_akhir
    req.alasan = alasan
    
    session.add(req)
    session.commit()
    session.refresh(req)
    return req

@router.post("/{request_id}/upload-sco-proof", response_model=dict)
async def upload_sco_proof(
    request_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    if current_user.role not in ["Admin SCO", "Super Admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only SCO can upload validation proofs")
        
    req = session.get(CorrectionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if not (1 <= len(files) <= 5):
        raise HTTPException(status_code=400, detail="Harap unggah 1 hingga 5 foto sebagai bukti validasi")
        
    uploaded_attachments = []
    
    for file in files:
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_filename = file.filename.replace(" ", "_")
        filename = f"req_{request_id}_{timestamp}_{safe_filename}"
        file_path = os.path.join(CORRECTION_PROOFS_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment = CorrectionAttachment(
            request_id=request_id,
            file_path=f"/{CORRECTION_PROOFS_DIR}/{filename}",
            filename=file.filename,
            attachment_type="sco"
        )
        session.add(attachment)
        uploaded_attachments.append(attachment)
        
    session.commit()
        
    return {
        "message": f"Successfully uploaded {len(files)} proofs",
        "attachments": [att.dict() for att in uploaded_attachments]
    }

@router.post("/{request_id}/upload-bps-proof", response_model=dict)
async def upload_bps_proof(
    request_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    if current_user.role not in ["Admin BPS", "Super Admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only BPS can upload execution proofs")
        
    req = session.get(CorrectionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if not (1 <= len(files) <= 5):
        raise HTTPException(status_code=400, detail="Harap unggah 1 hingga 5 foto sebagai bukti eksekusi")
        
    uploaded_attachments = []
    
    for file in files:
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_filename = file.filename.replace(" ", "_")
        filename = f"req_{request_id}_bps_{timestamp}_{safe_filename}"
        file_path = os.path.join(CORRECTION_PROOFS_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment = CorrectionAttachment(
            request_id=request_id,
            file_path=f"/{CORRECTION_PROOFS_DIR}/{filename}",
            filename=file.filename,
            attachment_type="bps"
        )
        session.add(attachment)
        uploaded_attachments.append(attachment)
        
    session.commit()
    
    return {
        "message": f"Successfully uploaded {len(files)} BPS proofs",
        "attachments": [att.dict() for att in uploaded_attachments]
    }

@router.post("/{request_id}/status", response_model=dict)
async def update_status(
    request_id: int,
    status: str = Form(...),
    rejection_reason: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    req = session.get(CorrectionRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # Workflow Logic
    if status in ["Approved", "Rejected"]:
        # Only SCO
        if current_user.role not in ["Admin SCO", "Super Admin", "admin"]:
            raise HTTPException(status_code=403, detail="Only SCO can Approve/Reject")
        
        if status == "Rejected" and not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
            
        req.status = status
        if status == "Rejected":
            req.rejection_reason = rejection_reason
            
    elif status == "Done":
        # Only BPS
        if current_user.role not in ["Admin BPS", "Super Admin", "admin"]:
            raise HTTPException(status_code=403, detail="Only BPS can mark as Done")
        
        # Must be Approved first? Or Rejected too? "seluruh status yang sudah di approve dan di tolak akan masuk ke tim BPS"
        if req.status != "Approved":
             raise HTTPException(status_code=400, detail="Request must be Approved to be executed")
             
        req.status = status
        
    else:
        raise HTTPException(status_code=400, detail="Invalid status")

    session.add(req)
    session.commit()
    session.refresh(req)
    
    # Return as dict to include attachments
    req_dict = req.dict()
    req_dict["attachments"] = [att.dict() for att in req.attachments]
    return req_dict

@router.post("/import")
async def import_correction_requests(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Permission Check
    allowed_roles = ["Admin Cabang", "PIC Cabang", "Super Admin", "admin"]
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Not authorized to import requests")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        import pandas as pd
        import io
        from datetime import datetime, timezone, timedelta
        
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Required columns
        required_columns = [
            'awb', 'address_1', 'coding_awal', 'kecamatan_awal', 
            'coding_akhir', 'kecamatan_akhir', 'address_2', 
            'alasan'
        ]
        
        # Validate columns
        if not all(col in df.columns for col in required_columns):
            missing = [col for col in required_columns if col not in df.columns]
            raise HTTPException(status_code=400, detail=f"Missing columns: {', '.join(missing)}")
        
        success_count = 0
        errors = []
        skipped = 0
        
        # Time Check: 18:00 WITA (UTC+8) -> Server usually runs on local time or UTC.
        # Assuming server time is configured or we use UTC offset.
        # WITA is UTC+8. 18:00 WITA = 10:00 UTC.
        
        utc_now = datetime.now(timezone.utc)
        # Manually create offset for WITA (UTC+8)
        wita_offset = timezone(timedelta(hours=8))
        wita_now = utc_now.astimezone(wita_offset)
        
        is_late_upload = False
        limit_time = wita_now.replace(hour=18, minute=0, second=0, microsecond=0)
        
        if wita_now > limit_time:
            is_late_upload = True
        
        for index, row in df.iterrows():
            row_num = index + 2 # Header is row 1
            
            # Validation 1: Mandatory fields
            if pd.isna(row['awb']) or pd.isna(row['address_1']) or str(row['awb']).strip() == '':
                errors.append(f"Baris {row_num}: AWB dan Address 1 wajib diisi.")
                skipped += 1
                continue

            # Validation 2: Coding Awal != Coding Akhir
            coding_awal = str(row['coding_awal']).strip() if not pd.isna(row['coding_awal']) else ""
            coding_akhir = str(row['coding_akhir']).strip() if not pd.isna(row['coding_akhir']) else ""
            
            if coding_awal and coding_akhir and coding_awal == coding_akhir:
                 errors.append(f"Baris {row_num}: Coding Awal dan Coding Akhir tidak boleh sama ({coding_awal}).")
                 continue
                 
            # Validation 3: Kecamatan Awal != Kecamatan Akhir
            kec_awal = str(row['kecamatan_awal']).strip() if not pd.isna(row['kecamatan_awal']) else ""
            kec_akhir = str(row['kecamatan_akhir']).strip() if not pd.isna(row['kecamatan_akhir']) else ""
             
            if kec_awal and kec_akhir and kec_awal == kec_akhir:
                 errors.append(f"Baris {row_num}: Kecamatan Awal dan Kecamatan Akhir tidak boleh sama ({kec_awal}).")
                 continue

            new_request = CorrectionRequest(
                awb=str(row['awb']),
                address_1=str(row['address_1']),
                coding_awal=coding_awal,
                kecamatan_awal=kec_awal,
                coding_akhir=coding_akhir,
                kecamatan_akhir=kec_akhir,
                address_2=str(row['address_2']) if not pd.isna(row['address_2']) else None,
                alasan=str(row['alasan']) if not pd.isna(row['alasan']) else "",
                user_id=current_user.id,
                entry_date=datetime.now(),
                status="Submitted"
            )
            session.add(new_request)
            success_count += 1
            
        session.commit()
        
        msg = f"Berhasil impor {success_count} data."
        if errors:
            msg += f" Terdapat {len(errors)} data gagal validasi. Cek konsol/log untuk detail."
        
        if is_late_upload:
            msg += " PERHATIAN: Request di atas jam 18.00 WITA akan diproses hari berikutnya."
            
        return {
            "message": msg,
            "success_count": success_count,
            "errors": errors,
            "is_late": is_late_upload
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-correction-requests")
async def export_correction_requests(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    awb: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Base query
    statement = select(CorrectionRequest)
    
    # Apply filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
            statement = statement.where(CorrectionRequest.entry_date >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            statement = statement.where(CorrectionRequest.entry_date <= end_dt)
        except ValueError:
            pass

    if awb:
        statement = statement.where(CorrectionRequest.awb == awb)
        
    if status:
        statement = statement.where(CorrectionRequest.status == status)

    statement = statement.order_by(CorrectionRequest.entry_date.desc())
    results = session.exec(statement).all()
    
    if not results:
        raise HTTPException(status_code=404, detail="No data found for the given filters")

    # Serialize to dict for pandas
    data = []
    for req in results:
            # Extract links for attachments
            branch_links = ", ".join([f"http://127.0.0.1:8000{att.file_path}" for att in req.attachments if att.attachment_type == "branch"])
            sco_links = ", ".join([f"http://127.0.0.1:8000{att.file_path}" for att in req.attachments if att.attachment_type == "sco"])
            bps_links = ", ".join([f"http://127.0.0.1:8000{att.file_path}" for att in req.attachments if att.attachment_type == "bps"])

            data.append({
                "TGL Request": req.entry_date.strftime("%Y-%m-%d %H:%M:%S") if req.entry_date else "",
                "AWB": req.awb,
                "Address 1": req.address_1,
                "Address 2": req.address_2,
                "Kode Awal": req.coding_awal,
                "Kecamatan Awal": req.kecamatan_awal,
                "Kode Akhir": req.coding_akhir,
                "Kecamatan Akhir": req.kecamatan_akhir,
                "Alasan": req.alasan,
                "Status": req.status,
                "Alasan Penolakan": req.rejection_reason or "-",
                "Lampiran (Cabang)": branch_links or "-",
                "Bukti Validasi (SCO)": sco_links or "-",
                "Bukti Eksekusi (BPS)": bps_links or "-"
            })
        
    df = pd.DataFrame(data)
    
    # Save to memory buffer
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Data Cordest')
    
    buffer.seek(0)
    
    # Return as StreamingResponse
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"Data_Cordest_{timestamp}.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        buffer, 
        headers=headers, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

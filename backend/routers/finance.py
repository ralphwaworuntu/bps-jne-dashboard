import os
import re
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from auth import get_current_active_user
from database import get_session
from models import FinanceUpload, User

router = APIRouter(prefix="/finance", tags=["finance"])

FINANCE_BASE = Path("uploads/finance")

REKENING_ALLOWED = {".xlsx", ".xls", ".xlsm", ".csv", ".pdf"}
BUKTI_ALLOWED = {".xlsx", ".xls", ".xlsm", ".csv"}


def _safe_filename(name: str) -> str:
    base = os.path.basename(name or "file")
    cleaned = re.sub(r"[^a-zA-Z0-9._\-]", "_", base)
    return cleaned[:200] if cleaned else "file"


@router.get("/my-files")
def get_my_latest_files(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    """Metadata file terbaru per jenis untuk user yang login."""
    out = {"rekening_koran": None, "bukti_transaksi": None}
    for kind in ("rekening_koran", "bukti_transaksi"):
        stmt = (
            select(FinanceUpload)
            .where(FinanceUpload.user_id == current_user.id, FinanceUpload.kind == kind)
            .order_by(FinanceUpload.created_at.desc())
            .limit(1)
        )
        rec = session.exec(stmt).first()
        if rec:
            out[kind] = {
                "id": rec.id,
                "original_filename": rec.original_filename,
                "created_at": rec.created_at.isoformat(),
            }
    return out


@router.get("/download/{upload_id}")
def download_finance_file(
    upload_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    rec = session.get(FinanceUpload, upload_id)
    if not rec or rec.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    path = Path(rec.stored_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Berkas tidak ada di server")
    return FileResponse(
        path,
        filename=rec.original_filename,
        media_type="application/octet-stream",
    )


def _save_upload(
    session: Session,
    user: User,
    file: UploadFile,
    kind: str,
    allowed_ext: set,
) -> FinanceUpload:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak valid")
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Ekstensi tidak diperbolehkan. Diizinkan: {', '.join(sorted(allowed_ext))}",
        )

    sub = FINANCE_BASE / str(user.id) / kind
    sub.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{_safe_filename(file.filename)}"
    dest = sub / stored_name

    try:
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {e!s}") from e

    rel = dest.as_posix()
    rec = FinanceUpload(
        user_id=user.id,
        kind=kind,
        original_filename=file.filename,
        stored_path=rel,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


@router.post("/upload/rekening-koran")
async def upload_rekening_koran(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    rec = _save_upload(session, current_user, file, "rekening_koran", REKENING_ALLOWED)
    return {
        "id": rec.id,
        "original_filename": rec.original_filename,
        "created_at": rec.created_at.isoformat(),
        "message": "Rekening koran tersimpan di server",
    }


@router.post("/upload/bukti-transaksi")
async def upload_bukti_transaksi(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    rec = _save_upload(session, current_user, file, "bukti_transaksi", BUKTI_ALLOWED)
    return {
        "id": rec.id,
        "original_filename": rec.original_filename,
        "created_at": rec.created_at.isoformat(),
        "message": "Bukti transaksi tersimpan di server",
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import get_current_active_user
from database import get_session
from models import (
    User,
    HCCandidateApplication,
    HCCandidateCreate,
    HCCandidateRead,
    HCKasbonApplication,
    HCKasbonCreate,
    HCKasbonRead,
)

router = APIRouter(prefix="/hc", tags=["hc"])


@router.get("/candidates", response_model=list[HCCandidateRead])
def list_candidates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(HCCandidateApplication).order_by(HCCandidateApplication.created_at.desc())
    return session.exec(stmt).all()


@router.post("/candidates", response_model=HCCandidateRead)
def create_candidate(
    payload: HCCandidateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    if not payload.nama.strip():
        raise HTTPException(status_code=400, detail="Nama wajib diisi")
    if not payload.posisi.strip():
        raise HTTPException(status_code=400, detail="Posisi wajib diisi")
    if not payload.cabang.strip():
        raise HTTPException(status_code=400, detail="Cabang wajib diisi")
    if not payload.no_hp.strip():
        raise HTTPException(status_code=400, detail="No. HP wajib diisi")

    rec = HCCandidateApplication(
        created_by_user_id=current_user.id,
        nama=payload.nama.strip(),
        posisi=payload.posisi.strip(),
        cabang=payload.cabang.strip(),
        no_hp=payload.no_hp.strip(),
        email=(payload.email.strip() if payload.email else None),
        alamat=(payload.alamat.strip() if payload.alamat else None),
        tanggal_lahir=(payload.tanggal_lahir.strip() if payload.tanggal_lahir else None),
        pendidikan_terakhir=(payload.pendidikan_terakhir.strip() if payload.pendidikan_terakhir else None),
        pengalaman_singkat=(payload.pengalaman_singkat.strip() if payload.pengalaman_singkat else None),
        sumber=(payload.sumber.strip() if payload.sumber else "Internal"),
        status=(payload.status.strip() if payload.status else "Baru"),
        catatan=(payload.catatan.strip() if payload.catatan else None),
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


@router.get("/kasbon", response_model=list[HCKasbonRead])
def list_kasbon(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(HCKasbonApplication).order_by(HCKasbonApplication.created_at.desc())
    return session.exec(stmt).all()


@router.post("/kasbon", response_model=HCKasbonRead)
def create_kasbon(
    payload: HCKasbonCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    if not payload.nama_karyawan.strip():
        raise HTTPException(status_code=400, detail="Nama karyawan wajib diisi")
    if not payload.nik.strip():
        raise HTTPException(status_code=400, detail="NIK wajib diisi")
    if not payload.divisi.strip():
        raise HTTPException(status_code=400, detail="Divisi wajib diisi")
    if payload.nominal <= 0:
        raise HTTPException(status_code=400, detail="Nominal harus > 0")
    if payload.tenor_bulan <= 0:
        raise HTTPException(status_code=400, detail="Tenor harus > 0")
    if not payload.alasan.strip():
        raise HTTPException(status_code=400, detail="Alasan wajib diisi")

    rec = HCKasbonApplication(
        created_by_user_id=current_user.id,
        nama_karyawan=payload.nama_karyawan.strip(),
        nik=payload.nik.strip(),
        divisi=payload.divisi.strip(),
        nominal=int(payload.nominal),
        sisa=int(payload.nominal),
        tenor_bulan=int(payload.tenor_bulan),
        alasan=payload.alasan.strip(),
        catatan=(payload.catatan.strip() if payload.catatan else None),
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


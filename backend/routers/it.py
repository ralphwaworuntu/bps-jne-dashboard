from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from auth import get_current_active_user, get_password_hash
from database import get_session, engine
from models import (
    User,
    UserCreate,
    UserRead,
    UserUpdate,
    UserResetPassword,
    SystemErrorLog,
    SystemErrorLogRead,
    RoleOption,
)

router = APIRouter(prefix="/it", tags=["it"])

# Roles mapped to sidebar sections
SECTION_ROLES: list[RoleOption] = [
    RoleOption(
        section="Overview",
        role="Super Admin",
        description="Akses penuh seluruh sistem",
    ),
    RoleOption(
        section="Operations",
        role="Admin Operations",
        description="Lastmile, Firstmile, Geotagging, Issue Harian",
    ),
    RoleOption(
        section="Finance",
        role="Admin Finance",
        description="Kelola Transaksi",
    ),
    RoleOption(
        section="ALC",
        role="Admin ALC",
        description="Managemen CTC, Data Cabang/Agen, Form Transfer, Resume, Penjualan, Delivery, COD, Project, By. Jemput, By. Return, Data GA, Master Data ALC",
    ),
    RoleOption(
        section="Sales",
        role="Admin Sales",
        description="Req Koreksi, Tracking Invoice",
    ),
    RoleOption(
        section="HC",
        role="Admin HC",
        description="Kelola Calon Karyawan, Kelola Kasbon Karyawan",
    ),
    RoleOption(
        section="IT",
        role="Admin IT",
        description="Kelola User, Log Error, Sys Performance",
    ),
]

ALLOWED_ROLES = {r.role for r in SECTION_ROLES}
IT_ADMIN_ROLES = {"Super Admin", "Admin IT", "admin"}


def require_it_admin(current_user: User) -> None:
    if current_user.role not in IT_ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Akses ditolak. Hanya Super Admin / Admin IT.",
        )


def persist_error_log(
    *,
    message: str,
    traceback_text: Optional[str] = None,
    path: Optional[str] = None,
    method: Optional[str] = None,
    level: str = "ERROR",
    source: str = "backend",
) -> None:
    """Helper untuk menyimpan error ke tabel SystemErrorLog (best-effort)."""
    try:
        with Session(engine) as session:
            rec = SystemErrorLog(
                level=level,
                source=source,
                path=path,
                method=method,
                message=message[:2000],
                traceback=(traceback_text[:8000] if traceback_text else None),
            )
            session.add(rec)
            session.commit()
    except Exception:
        pass


@router.get("/roles", response_model=list[RoleOption])
def list_roles(current_user: User = Depends(get_current_active_user)):
    require_it_admin(current_user)
    return SECTION_ROLES


@router.get("/users", response_model=list[UserRead])
def list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    q: Optional[str] = Query(default=None),
):
    require_it_admin(current_user)
    stmt = select(User).order_by(col(User.created_at).desc())
    users = list(session.exec(stmt).all())
    if q:
        needle = q.strip().lower()
        users = [
            u
            for u in users
            if needle in (u.email or "").lower()
            or needle in (u.full_name or "").lower()
            or needle in (u.role or "").lower()
            or needle in (u.department or "").lower()
        ]
    return users


@router.post("/users", response_model=UserRead)
def create_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    require_it_admin(current_user)

    email = (payload.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email wajib diisi")
    if not (payload.password or "").strip():
        raise HTTPException(status_code=400, detail="Password wajib diisi")
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    role = (payload.role or "").strip()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Role tidak valid. Pilih salah satu: {', '.join(sorted(ALLOWED_ROLES))}",
        )

    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    section = next((r.section for r in SECTION_ROLES if r.role == role), None)
    department = (payload.department or section or "").strip() or None

    db_user = User(
        email=email,
        full_name=(payload.full_name or "").strip() or None,
        role=role,
        department=department,
        shift=(payload.shift or "").strip() or None,
        hashed_password=get_password_hash(payload.password),
        is_active=True,
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    require_it_admin(current_user)

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if payload.role is not None:
        role = payload.role.strip()
        if role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Role tidak valid. Pilih salah satu: {', '.join(sorted(ALLOWED_ROLES))}",
            )
        user.role = role
        if payload.department is None:
            section = next((r.section for r in SECTION_ROLES if r.role == role), None)
            if section:
                user.department = section

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip() or None
    if payload.department is not None:
        user.department = payload.department.strip() or None
    if payload.shift is not None:
        user.shift = payload.shift.strip() or None
    if payload.is_active is not None:
        if user.id == current_user.id and payload.is_active is False:
            raise HTTPException(status_code=400, detail="Tidak bisa menonaktifkan akun sendiri")
        user.is_active = payload.is_active

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/users/{user_id}/reset-password", response_model=UserRead)
def reset_password(
    user_id: int,
    payload: UserResetPassword,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    require_it_admin(current_user)

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    new_password = (payload.new_password or "").strip()
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    user.hashed_password = get_password_hash(new_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get("/sys-performance")
def get_sys_performance(
    current_user: User = Depends(get_current_active_user),
):
    """Snapshot kinerja sistem untuk halaman IT → Sys Performance."""
    require_it_admin(current_user)
    from utils.sys_performance import collect_sys_performance

    return collect_sys_performance()


@router.post("/sys-performance/speed-test")
def run_sys_performance_speed_test(
    current_user: User = Depends(get_current_active_user),
):
    """Uji aktif kecepatan VPS → internet (download/upload/latency/jitter)."""
    require_it_admin(current_user)
    from utils.sys_performance import run_internet_speedtest

    return run_internet_speedtest()


@router.get("/error-logs", response_model=list[SystemErrorLogRead])
def list_error_logs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(default=100, ge=1, le=500),
):
    require_it_admin(current_user)
    stmt = (
        select(SystemErrorLog)
        .order_by(col(SystemErrorLog.created_at).desc())
        .limit(limit)
    )
    return list(session.exec(stmt).all())


@router.delete("/error-logs")
def clear_error_logs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    require_it_admin(current_user)
    logs = session.exec(select(SystemErrorLog)).all()
    count = 0
    for log in logs:
        session.delete(log)
        count += 1
    session.commit()
    return {"deleted": count, "cleared_at": datetime.utcnow().isoformat()}

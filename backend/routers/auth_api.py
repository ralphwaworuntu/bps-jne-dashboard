"""Auth routes: login token, register gate, current user."""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from auth import (
    verify_password,
    create_access_token,
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from database import get_session
from models import User, UserRead, Token

router = APIRouter(tags=["auth"])


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    statement = select(User).where(User.email == form_data.username)
    results = session.exec(statement)
    user = results.first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", status_code=status.HTTP_403_FORBIDDEN)
async def register_user():
    """Pendaftaran publik ditutup. Buat user lewat modul IT → Kelola User.

    Body diabaikan sengaja: jangan parse sebagai ``User`` / ``UserCreate`` di sini
    agar attempt bot/scan tidak memicu ValidationError CRITICAL di middleware.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Pendaftaran publik ditutup. Hubungi Admin IT untuk dibuatkan akun.",
    )


@router.get("/users/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

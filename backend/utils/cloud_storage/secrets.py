"""Enkripsi secret_access_key memakai kunci turunan JWT_SECRET_KEY."""
from __future__ import annotations

import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

from utils.env_load import load_dotenv_file

load_dotenv_file()


def _fernet() -> Fernet:
    raw = (os.getenv("JWT_SECRET_KEY") or "bps-jne-local-dev-only").encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError) as exc:
        raise ValueError("Secret cloud storage tidak bisa didekripsi.") from exc


def mask_secret(plain: str | None) -> str | None:
    if not plain:
        return None
    if len(plain) <= 4:
        return "****"
    return f"••••{plain[-4:]}"

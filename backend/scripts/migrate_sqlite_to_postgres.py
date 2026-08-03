"""Salin data dari SQLite lokal (database.db) ke Postgres (DATABASE_URL).

Jalankan dari folder backend (venv aktif), setelah:
  docker compose up -d
  alembic upgrade head

  python scripts/migrate_sqlite_to_postgres.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Pastikan import backend root
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from sqlalchemy import create_engine, inspect, text, MetaData, Table
from sqlmodel import SQLModel

import models  # noqa: F401
from utils.env_load import load_dotenv_file

load_dotenv_file()

SQLITE_URL = f"sqlite:///{BACKEND_ROOT / 'database.db'}"
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    print("ERROR: Set DATABASE_URL ke Postgres di backend/.env sebelum migrasi.")
    sys.exit(1)

if not (BACKEND_ROOT / "database.db").is_file():
    print("ERROR: backend/database.db tidak ditemukan.")
    sys.exit(1)


def _copy_table(sqlite_eng, pg_eng, table_name: str) -> int:
    meta = MetaData()
    src = Table(table_name, meta, autoload_with=sqlite_eng)
    # Pastikan tabel ada di Postgres (dari metadata SQLModel / Alembic)
    with sqlite_eng.connect() as sconn, pg_eng.begin() as pconn:
        rows = sconn.execute(src.select()).mappings().all()
        if not rows:
            return 0
        dest = Table(table_name, MetaData(), autoload_with=pg_eng)
        payload = [dict(r) for r in rows]
        # Kosongkan dulu agar idempotent (dev lokal)
        pconn.execute(text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE'))
        pconn.execute(dest.insert(), payload)
        return len(payload)


def main() -> None:
    print(f"Source: {SQLITE_URL}")
    print(f"Target: {DATABASE_URL}")

    sqlite_eng = create_engine(SQLITE_URL)
    pg_eng = create_engine(DATABASE_URL)

    # Pastikan schema Postgres ada
    SQLModel.metadata.create_all(pg_eng)

    insp = inspect(sqlite_eng)
    tables = [t for t in insp.get_table_names() if not t.startswith("alembic")]
    # Urutan kasar: parent dulu
    preferred = [
        "user",
        "opsmasterdatakind",
        "opsmasterdataupload",
        "dailyissue",
        "dailyissueattachment",
        "notification",
        "financeupload",
        "alcpenjualanupload",
        "correctionrequest",
        "correctionattachment",
    ]
    ordered = [t for t in preferred if t in tables] + [t for t in tables if t not in preferred]

    total = 0
    for name in ordered:
        try:
            n = _copy_table(sqlite_eng, pg_eng, name)
            print(f"  OK  {name}: {n} rows")
            total += n
        except Exception as e:
            print(f"  SKIP/FAIL {name}: {e}")

    # Alembic version stamp
    try:
        with pg_eng.begin() as conn:
            conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS alembic_version ("
                    "version_num VARCHAR(32) NOT NULL PRIMARY KEY)"
                )
            )
            # Ambil revision dari sqlite jika ada
            with sqlite_eng.connect() as sconn:
                try:
                    rev = sconn.execute(text("SELECT version_num FROM alembic_version")).scalar()
                except Exception:
                    rev = None
            if rev:
                conn.execute(text("DELETE FROM alembic_version"))
                conn.execute(
                    text("INSERT INTO alembic_version (version_num) VALUES (:v)"),
                    {"v": rev},
                )
                print(f"  alembic_version -> {rev}")
    except Exception as e:
        print(f"  WARN alembic_version: {e}")

    print(f"Selesai. Total baris disalin (approx): {total}")

    # Setelah insert ID eksplisit, sequence harus di-sync agar INSERT berikutnya tidak bentrok PK
    try:
        from scripts.sync_postgres_sequences import sync_sequences

        print("Sync sequences…")
        sync_sequences(pg_eng)
    except Exception as e:
        print(f"  WARN sync sequences: {e}")
        print("  Jalankan manual: python scripts/sync_postgres_sequences.py")


if __name__ == "__main__":
    main()
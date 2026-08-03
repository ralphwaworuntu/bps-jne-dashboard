"""Sync Postgres serial/identity sequences with MAX(id) after data restore/migration."""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from sqlalchemy import create_engine, inspect, text

from utils.env_load import load_dotenv_file

load_dotenv_file()

DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    print("ERROR: DATABASE_URL Postgres required")
    sys.exit(1)


def sync_sequences(engine) -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table in insp.get_table_names():
            cols = {c["name"] for c in insp.get_columns(table)}
            if "id" not in cols:
                continue
            seqname = conn.execute(
                text("SELECT pg_get_serial_sequence(:t, 'id')"),
                {"t": table},
            ).scalar()
            if not seqname:
                # quoted table name variant
                seqname = conn.execute(
                    text('SELECT pg_get_serial_sequence(:t, \'id\')'),
                    {"t": f'public."{table}"'},
                ).scalar()
            if not seqname:
                print(f"SKIP {table}: no serial sequence on id")
                continue
            mx = conn.execute(text(f'SELECT COALESCE(MAX(id), 0) FROM "{table}"')).scalar() or 0
            if mx > 0:
                conn.execute(text("SELECT setval(:seq, :val, true)"), {"seq": seqname, "val": int(mx)})
            else:
                conn.execute(text("SELECT setval(:seq, 1, false)"), {"seq": seqname})
            print(f"OK  {table}: {seqname} -> next after {mx}")


def main() -> None:
    print(f"Target: {DATABASE_URL}")
    eng = create_engine(DATABASE_URL)
    sync_sequences(eng)
    print("Done.")


if __name__ == "__main__":
    main()

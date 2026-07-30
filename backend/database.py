from sqlmodel import SQLModel, create_engine, Session, text
from sqlalchemy import event

# Memuat modul models agar semua tabel (termasuk yang baru) terdaftar di metadata
import models  # noqa: F401

SQLITE_FILE_NAME = "database.db"
SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

# busy_timeout: tunggu hingga 30s saat DB sedang ditulis proses lain
connect_args = {
    "check_same_thread": False,
    "timeout": 30,
}
engine = create_engine(SQLITE_URL, echo=False, connect_args=connect_args)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """WAL + busy_timeout: tulis lebih tahan concurrent tanpa mengubah data aplikasi."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
    # Pastikan WAL aktif juga lewat engine (idempotent)
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session

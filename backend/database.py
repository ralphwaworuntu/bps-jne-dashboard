from sqlmodel import SQLModel, create_engine, Session, text
from sqlalchemy import event
import os

# Memuat modul models agar semua tabel (termasuk yang baru) terdaftar di metadata
import models  # noqa: F401
from utils.env_load import load_dotenv_file

load_dotenv_file()

SQLITE_FILE_NAME = "database.db"
SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()
SQLALCHEMY_DATABASE_URL = DATABASE_URL or SQLITE_URL
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

connect_args = {}
if IS_SQLITE:
    # busy_timeout: tunggu hingga 30s saat DB sedang ditulis proses lain
    connect_args = {
        "check_same_thread": False,
        "timeout": 30,
    }

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=not IS_SQLITE,
)


if IS_SQLITE:

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
    if IS_SQLITE:
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.commit()


def get_session():
    with Session(engine) as session:
        yield session

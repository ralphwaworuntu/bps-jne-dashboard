from sqlmodel import SQLModel, create_engine, Session

# Memuat modul models agar semua tabel (termasuk yang baru) terdaftar di metadata
import models  # noqa: F401

SQLITE_FILE_NAME = "database.db"
SQLITE_URL = f"sqlite:///{SQLITE_FILE_NAME}"

connect_args = {"check_same_thread": False}
engine = create_engine(SQLITE_URL, echo=True, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

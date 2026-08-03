from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import os

from database import create_db_and_tables
from routers import (
    alc,
    daily_issue,
    correction_request,
    notifications,
    analytics,
    finance,
    hc,
    sales,
    it,
    auth_api,
    system_api,
    ops,
    ops_master,
)

app = FastAPI(title="BPS JNE Dashboard API")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://172.20.10.2:3000",
    "http://172.20.10.2:3001",
    "http://192.168.1.38:3000",
    "http://192.168.1.38:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        from fastapi import HTTPException as FastAPIHTTPException
        from fastapi.exceptions import RequestValidationError
        from pydantic import ValidationError

        # Client / expected errors — jangan spam Log Error sebagai CRITICAL
        if isinstance(e, FastAPIHTTPException):
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=dict(e.headers) if e.headers else None,
            )
        if isinstance(e, (RequestValidationError, ValidationError)):
            return JSONResponse(
                status_code=422,
                content={"detail": "Validation error"},
            )

        import traceback

        error_msg = traceback.format_exc()
        print(f"CRITICAL GLOBAL ERROR: {e}")

        log_path = os.path.join(os.getcwd(), "backend_global_error.log")
        with open(log_path, "a") as log_file:
            log_file.write(f"\n[{datetime.now()}] Global Error: {str(e)}\n{error_msg}\n")

        try:
            from routers.it import persist_error_log

            persist_error_log(
                message=str(e),
                traceback_text=error_msg,
                path=str(request.url.path),
                method=request.method,
                level="CRITICAL",
                source="middleware",
            )
        except Exception:
            pass

        origin = request.headers.get("origin", "")
        cors_headers = {}
        if origin in origins:
            cors_headers = {
                "Access-Control-Allow-Origin": origin,
                "Vary": "Origin",
            }

        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"},
            headers=cors_headers,
        )


@app.on_event("startup")
def on_startup():
    # Prefer Alembic migrations; keep create_all as safety net for fresh clones.
    try:
        from alembic.config import Config
        from alembic import command
        from pathlib import Path

        ini = Path(__file__).resolve().parent / "alembic.ini"
        if ini.is_file():
            cfg = Config(str(ini))
            command.upgrade(cfg, "head")
    except Exception as e:
        print(f"WARN alembic upgrade skipped: {e}")
    create_db_and_tables()

    # Kolom opsional untuk migrasi SQLite tanpa Alembic revision baru
    try:
        from sqlalchemy import text
        from database import engine

        with engine.connect() as conn:
            cols = conn.execute(text("PRAGMA table_info(opsmasterdataupload)")).fetchall()
            col_names = {row[1] for row in cols}
            if "is_active" not in col_names:
                conn.execute(
                    text(
                        "ALTER TABLE opsmasterdataupload "
                        "ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"
                    )
                )
                conn.commit()
    except Exception as e:
        print(f"WARN ops master upload migration skipped: {e}")

    # Seed definisi Master Data bawaan + warm registry
    try:
        from database import engine
        from sqlmodel import Session
        from utils.ops_master_data import seed_builtin_kinds

        with Session(engine) as session:
            added = seed_builtin_kinds(session)
            if added:
                print(f"Seeded {added} builtin Master Data kind(s).")
    except Exception as e:
        print(f"WARN master data kind seed skipped: {e}")

    try:
        from utils.process_jobs import start_worker, register_builtin_handlers

        register_builtin_handlers()
        start_worker()
    except Exception as e:
        print(f"WARN process_jobs worker start skipped: {e}")


# Domain routers (existing)
app.include_router(daily_issue.router)
app.include_router(correction_request.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(finance.router)
app.include_router(hc.router)
app.include_router(sales.router)
app.include_router(it.router)
app.include_router(alc.router)
app.include_router(ops_master.router)

# Extracted from former monolithic main.py
app.include_router(system_api.router)
app.include_router(auth_api.router)
app.include_router(ops.router)

from routers import jobs as jobs_router  # noqa: E402

app.include_router(jobs_router.router)


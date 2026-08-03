"""Celery app — broker Redis untuk job berat (CTC / UN RUNSHEET).

Jalankan worker (dari folder backend, venv aktif):

  celery -A celery_app.celery worker --loglevel=INFO --pool=threads --concurrency=2

Di Windows pakai --pool=threads (bukan prefork).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Pastikan folder backend ada di sys.path (systemd / cwd tidak selalu sama).
_BACKEND_ROOT = Path(__file__).resolve().parent
_backend_str = str(_BACKEND_ROOT)
if _backend_str not in sys.path:
    sys.path.insert(0, _backend_str)

from celery import Celery

from utils.env_load import load_dotenv_file

load_dotenv_file()

REDIS_URL = (os.getenv("REDIS_URL") or "redis://127.0.0.1:6379/0").strip()

celery = Celery(
    "bps_jne",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["celery_app"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Makassar",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)


@celery.task(name="process_jobs.run_job", bind=True)
def run_job(self, job_id: str) -> dict:
    """Eksekusi satu job berat di worker process."""
    from utils import process_jobs

    process_jobs.register_builtin_handlers()
    process_jobs.execute_job(job_id)
    job = process_jobs.get_job(job_id) or {}
    return {
        "id": job_id,
        "status": job.get("status"),
        "error": job.get("error") or "",
    }

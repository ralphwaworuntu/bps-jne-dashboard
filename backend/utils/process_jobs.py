"""Async process jobs: antrian max-1, progress di disk JSON, hasil siap pakai.

Fase 3 nanti bisa ganti store (Redis) tanpa ubah kontrak job_id/status.
"""
from __future__ import annotations

import json
import threading
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

JOBS_DIR = Path("uploads/jobs")
JOBS_RAW_DIR = JOBS_DIR / "raw"

ProgressCb = Callable[[str, int, str], None]
JobHandler = Callable[[Dict[str, Any], ProgressCb], Dict[str, Any]]

_handlers: Dict[str, JobHandler] = {}
_queue: List[str] = []
_lock = threading.Lock()
_worker_started = False
_active_job_id: Optional[str] = None


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def ensure_dirs() -> None:
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_RAW_DIR.mkdir(parents=True, exist_ok=True)


def job_path(job_id: str) -> Path:
    return JOBS_DIR / f"{job_id}.json"


def register_handler(kind: str, handler: JobHandler) -> None:
    _handlers[kind] = handler


def _read_job(job_id: str) -> Optional[Dict[str, Any]]:
    path = job_path(job_id)
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_job(job: Dict[str, Any]) -> None:
    ensure_dirs()
    path = job_path(str(job["id"]))
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return _read_job(job_id)


def list_jobs_for_user(user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    ensure_dirs()
    items: List[Dict[str, Any]] = []
    for path in JOBS_DIR.glob("*.json"):
        if path.name.endswith(".tmp"):
            continue
        try:
            job = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if int(job.get("user_id") or 0) != int(user_id):
            continue
        items.append(job)
    items.sort(key=lambda j: str(j.get("created_at") or ""), reverse=True)
    return items[: max(1, int(limit))]


def update_job_progress(
    job_id: str,
    *,
    status: Optional[str] = None,
    stage: Optional[str] = None,
    percent: Optional[int] = None,
    message: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    with _lock:
        job = _read_job(job_id)
        if not job:
            return None
        if status is not None:
            job["status"] = status
        if stage is not None:
            job["stage"] = stage
        if percent is not None:
            job["percent"] = max(0, min(100, int(percent)))
        if message is not None:
            job["message"] = message
        if result is not None:
            job["result"] = result
        if error is not None:
            job["error"] = error
        job["updated_at"] = _now_iso()
        _write_job(job)
        return job


def _cleanup_raw(job: Dict[str, Any]) -> None:
    raw = job.get("raw_path")
    if not raw:
        return
    try:
        path = Path(str(raw))
        if path.is_file():
            path.unlink()
    except Exception:
        pass


def _run_one(job_id: str) -> None:
    global _active_job_id
    job = _read_job(job_id)
    if not job:
        return

    kind = str(job.get("kind") or "")
    handler = _handlers.get(kind)
    update_job_progress(
        job_id,
        status="running",
        stage="starting",
        percent=5,
        message="Memulai pemrosesan…",
    )

    def report(stage: str, percent: int, message: str = "") -> None:
        update_job_progress(
            job_id,
            status="running",
            stage=stage,
            percent=percent,
            message=message or stage,
        )

    try:
        if handler is None:
            raise RuntimeError(f"Tidak ada handler untuk kind={kind}")
        result = handler(job, report)
        update_job_progress(
            job_id,
            status="completed",
            stage="completed",
            percent=100,
            message="Selesai",
            result=result or {},
            error="",
        )
        fresh = _read_job(job_id) or job
        _cleanup_raw(fresh)
    except Exception as e:
        traceback.print_exc()
        update_job_progress(
            job_id,
            status="failed",
            stage="failed",
            percent=100,
            message="Gagal",
            error=str(e),
        )
        fresh = _read_job(job_id) or job
        _cleanup_raw(fresh)
    finally:
        with _lock:
            if _active_job_id == job_id:
                _active_job_id = None


def _worker_loop() -> None:
    global _active_job_id
    while True:
        job_id: Optional[str] = None
        with _lock:
            if _active_job_id is None and _queue:
                job_id = _queue.pop(0)
                _active_job_id = job_id
        if job_id is None:
            threading.Event().wait(0.35)
            continue
        _run_one(job_id)


def start_worker() -> None:
    global _worker_started
    with _lock:
        if _worker_started:
            return
        ensure_dirs()
        # Recover interrupted jobs
        for path in JOBS_DIR.glob("*.json"):
            try:
                job = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            status = str(job.get("status") or "")
            jid = str(job.get("id") or path.stem)
            if status == "running":
                job["status"] = "queued"
                job["stage"] = "queued"
                job["percent"] = 0
                job["message"] = "Diantre ulang setelah restart server"
                job["updated_at"] = _now_iso()
                _write_job(job)
                if jid not in _queue:
                    _queue.append(jid)
            elif status == "queued" and jid not in _queue:
                _queue.append(jid)
        t = threading.Thread(target=_worker_loop, name="process_jobs_worker", daemon=True)
        t.start()
        _worker_started = True


def enqueue_job(
    *,
    kind: str,
    user_id: int,
    payload: Dict[str, Any],
    raw_bytes: Optional[bytes] = None,
    raw_suffix: str = ".bin",
    original_filename: str = "",
) -> Dict[str, Any]:
    """Buat job + antre. Return snapshot job (status queued)."""
    start_worker()
    ensure_dirs()
    job_id = uuid.uuid4().hex
    raw_path = ""
    if raw_bytes is not None:
        dest = JOBS_RAW_DIR / f"{job_id}{raw_suffix}"
        dest.write_bytes(raw_bytes)
        raw_path = str(dest)

    job: Dict[str, Any] = {
        "id": job_id,
        "kind": kind,
        "status": "queued",
        "stage": "queued",
        "percent": 0,
        "message": "Dalam antrian…",
        "user_id": int(user_id),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
        "original_filename": original_filename or "",
        "raw_path": raw_path,
        "payload": payload or {},
        "result": {},
        "error": "",
    }
    with _lock:
        _write_job(job)
        _queue.append(job_id)
        # Jika ada job aktif, tetap queued; worker yang ambil.
    return job


def public_job_view(job: Dict[str, Any]) -> Dict[str, Any]:
    """Subset aman untuk API response."""
    return {
        "id": job.get("id"),
        "kind": job.get("kind"),
        "status": job.get("status"),
        "stage": job.get("stage"),
        "percent": int(job.get("percent") or 0),
        "message": job.get("message") or "",
        "error": job.get("error") or "",
        "created_at": job.get("created_at"),
        "updated_at": job.get("updated_at"),
        "original_filename": job.get("original_filename") or "",
        "result": job.get("result") or {},
    }


# ── Handlers CTC / UN RUNSHEET ──────────────────────────────────────────────


def _handle_ctc_upload(job: Dict[str, Any], report: ProgressCb) -> Dict[str, Any]:
    from utils.ctc_inbound import parse_ctc_upload, save_ctc_upload
    from utils.notification_manager import create_notification
    from database import engine
    from sqlmodel import Session

    payload = job.get("payload") or {}
    raw_path = Path(str(job.get("raw_path") or ""))
    if not raw_path.is_file():
        raise FileNotFoundError("File upload sementara tidak ditemukan")

    report("parsing", 15, "Membaca & mem-parse file…")
    content = raw_path.read_bytes()
    suffix = str(payload.get("suffix") or raw_path.suffix or ".xlsx")
    mode = str(payload.get("period_mode") or "harian")
    date_iso = str(payload.get("date") or "")
    month_yyyy_mm = str(payload.get("month") or "") or None
    day_cutoff = str(payload.get("update_day") or "") or None
    filename = str(job.get("original_filename") or "")
    uploaded_by = str(payload.get("uploaded_by") or "")

    report("enriching", 40, "Menghitung rumus CTC…")
    df = parse_ctc_upload(
        content,
        suffix,
        mode,
        date_iso,
        month_yyyy_mm,
        day_cutoff,
    )

    report("saving", 80, "Menyimpan hasil siap pakai (CSV)…")
    saved = save_ctc_upload(
        df,
        mode,
        date_iso,
        month_yyyy_mm,
        day_cutoff,
        filename,
        uploaded_by,
    )

    period_label = date_iso if mode == "harian" else f"{month_yyyy_mm} Tgl {day_cutoff}"
    rows = int(len(df))
    try:
        with Session(engine) as session:
            create_notification(
                session,
                title="Upload Success",
                message=(
                    f"All Inbound & CTC {period_label} ({filename}) "
                    f"berhasil diunggah ({rows} baris)."
                ),
                type="success",
                user_id=int(job.get("user_id") or 0) or None,
            )
    except Exception:
        pass

    return {
        "rows": rows,
        "saved_as": str(saved),
        "period_mode": mode,
        "date": date_iso,
        "month": month_yyyy_mm,
        "update_day": day_cutoff,
        "period_label": period_label,
    }


def _handle_un_runsheet_upload(job: Dict[str, Any], report: ProgressCb) -> Dict[str, Any]:
    from utils.un_runsheet import (
        parse_un_runsheet_upload,
        save_un_runsheet_for_date,
        write_ready_artifacts,
    )
    from utils.notification_manager import create_notification
    from database import engine
    from sqlmodel import Session

    payload = job.get("payload") or {}
    raw_path = Path(str(job.get("raw_path") or ""))
    if not raw_path.is_file():
        raise FileNotFoundError("File upload sementara tidak ditemukan")

    report("parsing", 15, "Membaca & mem-parse UN RUNSHEET…")
    content = raw_path.read_bytes()
    suffix = str(payload.get("suffix") or raw_path.suffix or ".xlsx")
    date_iso = str(payload.get("date") or "")
    filename = str(job.get("original_filename") or "")
    uploaded_by = str(payload.get("uploaded_by") or "")

    report("enriching", 40, "Enrich CTC + pipeline UN RUNSHEET…")
    df = parse_un_runsheet_upload(content, suffix, date_iso)

    report("saving", 75, "Menyimpan CSV sumber…")
    saved = save_un_runsheet_for_date(df, date_iso, filename, uploaded_by)

    report("saving", 88, "Menulis cache filtered + pivot siap pakai…")
    artifacts = write_ready_artifacts(date_iso)

    rows = int(len(df))
    try:
        with Session(engine) as session:
            create_notification(
                session,
                title="Upload Success",
                message=(
                    f"UN RUNSHEET tanggal {date_iso} ({filename}) "
                    f"berhasil diunggah ({rows} baris)."
                ),
                type="success",
                user_id=int(job.get("user_id") or 0) or None,
            )
    except Exception:
        pass

    return {
        "rows": rows,
        "saved_as": str(saved),
        "date": date_iso,
        "filtered_rows": int(artifacts.get("filtered_rows") or 0),
        "filtered_path": artifacts.get("filtered_path"),
        "pivot_path": artifacts.get("pivot_path"),
    }


def register_builtin_handlers() -> None:
    register_handler("all_inbound_ctc", _handle_ctc_upload)
    register_handler("un_runsheet", _handle_un_runsheet_upload)


# Warm handlers on import
register_builtin_handlers()

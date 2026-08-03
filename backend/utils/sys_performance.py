"""Collect host / service / job metrics for IT Sys Performance dashboard."""
from __future__ import annotations

import os
import platform
import socket
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, col, select

from database import IS_SQLITE, SQLALCHEMY_DATABASE_URL, engine
from models import SystemErrorLog
from utils.env_load import load_dotenv_file

load_dotenv_file()


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, float(value)))


def _score_from_latency_ms(latency_ms: Optional[float], good: float = 50.0, bad: float = 500.0) -> float:
    if latency_ms is None:
        return 0.0
    if latency_ms <= good:
        return 100.0
    if latency_ms >= bad:
        return 0.0
    return _clamp(100.0 * (1.0 - (latency_ms - good) / (bad - good)))


def _score_from_usage(percent: float) -> float:
    """High usage → lower health score."""
    p = _clamp(percent)
    if p <= 50:
        return 100.0
    if p >= 95:
        return 5.0
    return _clamp(100.0 - (p - 50.0) * (95.0 / 45.0))


def _ping_database() -> Dict[str, Any]:
    t0 = time.perf_counter()
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - t0) * 1000, 2)
        backend = "sqlite" if IS_SQLITE else "postgresql"
        if "postgresql" in (SQLALCHEMY_DATABASE_URL or "").lower():
            backend = "postgresql"
        return {"status": "ok", "latency_ms": latency, "backend": backend}
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": None,
            "backend": "sqlite" if IS_SQLITE else "postgresql",
            "detail": str(e)[:200],
        }


def _ping_redis() -> Dict[str, Any]:
    url = (os.getenv("REDIS_URL") or "").strip()
    if not url:
        return {"status": "disabled", "latency_ms": None, "detail": "REDIS_URL tidak diset"}
    try:
        import redis

        t0 = time.perf_counter()
        client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        latency = round((time.perf_counter() - t0) * 1000, 2)
        return {"status": "ok", "latency_ms": latency}
    except Exception as e:
        return {"status": "error", "latency_ms": None, "detail": str(e)[:200]}


def _celery_status() -> Dict[str, Any]:
    use = (os.getenv("USE_CELERY") or "1").strip().lower() not in {"0", "false", "no", "off"}
    redis_url = (os.getenv("REDIS_URL") or "").strip()
    if not use or not redis_url:
        return {
            "status": "disabled",
            "workers": 0,
            "active_tasks": 0,
            "detail": "Celery tidak aktif (in-process fallback)",
        }
    try:
        from celery_app import celery as celery_app

        insp = celery_app.control.inspect(timeout=1.0)
        ping = insp.ping() or {}
        active = insp.active() or {}
        workers = len(ping)
        active_tasks = sum(len(v or []) for v in active.values())
        if workers == 0:
            return {
                "status": "degraded",
                "workers": 0,
                "active_tasks": 0,
                "detail": "Tidak ada Celery worker yang merespons",
            }
        return {"status": "ok", "workers": workers, "active_tasks": active_tasks}
    except Exception as e:
        return {
            "status": "error",
            "workers": 0,
            "active_tasks": 0,
            "detail": str(e)[:200],
        }


def _host_metrics() -> Dict[str, Any]:
    try:
        import psutil
    except ImportError:
        return {
            "hostname": socket.gethostname(),
            "platform": platform.platform(),
            "uptime_seconds": None,
            "cpu": {"percent": 0.0, "count": os.cpu_count() or 1, "load_avg": [None, None, None]},
            "memory": {"total_bytes": 0, "used_bytes": 0, "percent": 0.0},
            "disk": [],
            "detail": "psutil belum terpasang",
        }

    boot = getattr(psutil, "boot_time", lambda: time.time())()
    uptime = int(time.time() - boot)
    cpu_percent = float(psutil.cpu_percent(interval=0.2))
    mem = psutil.virtual_memory()
    load_avg: List[Optional[float]] = [None, None, None]
    try:
        la = os.getloadavg()  # type: ignore[attr-defined]
        load_avg = [round(float(x), 2) for x in la]
    except (AttributeError, OSError):
        pass

    disks: List[Dict[str, Any]] = []
    seen = set()
    for part in psutil.disk_partitions(all=False):
        mount = part.mountpoint
        if mount in seen:
            continue
        # Skip optical / empty on Windows
        if "cdrom" in (part.opts or "").lower():
            continue
        try:
            usage = psutil.disk_usage(mount)
        except (PermissionError, OSError):
            continue
        seen.add(mount)
        disks.append(
            {
                "mount": mount,
                "total_bytes": int(usage.total),
                "used_bytes": int(usage.used),
                "percent": round(float(usage.percent), 1),
            }
        )

    return {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "uptime_seconds": uptime,
        "cpu": {
            "percent": round(cpu_percent, 1),
            "count": int(psutil.cpu_count() or os.cpu_count() or 1),
            "load_avg": load_avg,
        },
        "memory": {
            "total_bytes": int(mem.total),
            "used_bytes": int(mem.used),
            "percent": round(float(mem.percent), 1),
        },
        "disk": disks,
    }


def _list_recent_jobs(limit: int = 40) -> List[Dict[str, Any]]:
    from utils import process_jobs

    process_jobs.ensure_dirs()
    items: List[Dict[str, Any]] = []
    for path in process_jobs.JOBS_DIR.glob("*.json"):
        if path.name.endswith(".tmp"):
            continue
        try:
            import json

            job = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        items.append(job)
    items.sort(key=lambda j: str(j.get("updated_at") or j.get("created_at") or ""), reverse=True)
    return items[: max(1, int(limit))]


def _parse_job_ts(job: Dict[str, Any]) -> Optional[datetime]:
    raw = job.get("updated_at") or job.get("created_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", ""))
    except Exception:
        return None


def _jobs_summary(jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    queued = running = failed_24h = completed_24h = 0
    recent: List[Dict[str, Any]] = []

    for job in jobs:
        status = str(job.get("status") or "").lower()
        ts = _parse_job_ts(job)
        if status in {"queued", "pending"}:
            queued += 1
        elif status in {"running", "processing"}:
            running += 1
        if ts and ts >= day_ago:
            if status == "failed":
                failed_24h += 1
            elif status in {"completed", "done", "success"}:
                completed_24h += 1
        if len(recent) < 8:
            recent.append(
                {
                    "id": job.get("id"),
                    "kind": job.get("kind"),
                    "status": job.get("status"),
                    "percent": int(job.get("percent") or 0),
                    "message": (job.get("message") or "")[:120],
                    "updated_at": job.get("updated_at") or job.get("created_at"),
                }
            )

    total_done = failed_24h + completed_24h
    success_rate = 100.0 if total_done == 0 else round(100.0 * completed_24h / total_done, 1)
    queue_pressure = queued + running
    # Health: success rate penalized by queue backlog
    processing_score = _clamp(success_rate - min(40.0, queue_pressure * 8.0))

    return {
        "queued": queued,
        "running": running,
        "failed_last_24h": failed_24h,
        "completed_last_24h": completed_24h,
        "success_rate_24h": success_rate,
        "processing_score": round(processing_score, 1),
        "recent": recent,
    }


def _errors_summary() -> Dict[str, Any]:
    day_ago = datetime.utcnow() - timedelta(hours=24)
    last_24h = critical_24h = 0
    try:
        with Session(engine) as session:
            rows = list(
                session.exec(
                    select(SystemErrorLog)
                    .where(SystemErrorLog.created_at >= day_ago)
                    .order_by(col(SystemErrorLog.created_at).desc())
                    .limit(500)
                ).all()
            )
        last_24h = len(rows)
        critical_24h = sum(1 for r in rows if str(r.level or "").upper() == "CRITICAL")
    except Exception:
        pass

    # 0 errors → 100; many critical → low
    score = 100.0 - min(90.0, last_24h * 4.0 + critical_24h * 15.0)
    return {
        "last_24h": last_24h,
        "critical_last_24h": critical_24h,
        "stability_score": round(_clamp(score), 1),
    }


def _uploads_freshness() -> Dict[str, Any]:
    """Rough traffic/data freshness from key upload mtimes."""
    roots = [
        Path("uploads"),
        Path("uploads/all_shipment"),
        Path("uploads/jobs"),
    ]
    newest: Optional[float] = None
    file_count = 0
    for root in roots:
        if not root.is_dir():
            continue
        for p in root.rglob("*"):
            if not p.is_file():
                continue
            if p.suffix.lower() in {".tmp", ".meta"}:
                continue
            try:
                mtime = p.stat().st_mtime
            except OSError:
                continue
            file_count += 1
            if newest is None or mtime > newest:
                newest = mtime

    age_hours = None
    if newest is not None:
        age_hours = round((time.time() - newest) / 3600.0, 2)

    # Fresher data → higher traffic/activity score (capped)
    if age_hours is None:
        activity = 40.0
    elif age_hours <= 1:
        activity = 95.0
    elif age_hours <= 24:
        activity = 80.0
    elif age_hours <= 72:
        activity = 55.0
    else:
        activity = 30.0

    return {
        "tracked_files": file_count,
        "newest_age_hours": age_hours,
        "activity_score": activity,
    }


def collect_sys_performance() -> Dict[str, Any]:
    host = _host_metrics()
    db = _ping_database()
    redis = _ping_redis()
    celery = _celery_status()
    jobs = _jobs_summary(_list_recent_jobs(80))
    errors = _errors_summary()
    uploads = _uploads_freshness()

    cpu_pct = float((host.get("cpu") or {}).get("percent") or 0)
    mem_pct = float((host.get("memory") or {}).get("percent") or 0)
    disks = host.get("disk") or []
    disk_pct = float(disks[0]["percent"]) if disks else 0.0

    db_ok = db.get("status") == "ok"
    redis_ok = redis.get("status") in {"ok", "disabled"}
    celery_ok = celery.get("status") in {"ok", "disabled", "degraded"}

    backend_parts = [
        _score_from_latency_ms(db.get("latency_ms")),
        100.0 if redis_ok and redis.get("status") == "ok" else (70.0 if redis.get("status") == "disabled" else 20.0),
        100.0 if celery.get("status") == "ok" else (65.0 if celery.get("status") == "disabled" else 35.0),
        _score_from_usage(cpu_pct) * 0.5 + 50,
    ]
    backend_score = round(sum(backend_parts) / len(backend_parts), 1) if db_ok else 25.0

    hardware_score = round(
        (
            _score_from_usage(cpu_pct)
            + _score_from_usage(mem_pct)
            + _score_from_usage(disk_pct)
        )
        / 3.0,
        1,
    )

    traffic_score = round(
        (
            float(uploads["activity_score"])
            + _score_from_latency_ms(db.get("latency_ms"), good=20, bad=300)
            + float(jobs["processing_score"])
        )
        / 3.0,
        1,
    )

    overall = round(
        (
            backend_score
            + float(jobs["processing_score"])
            + hardware_score
            + traffic_score
            + float(errors["stability_score"])
        )
        / 5.0,
        1,
    )

    return {
        "collected_at": datetime.utcnow().isoformat() + "Z",
        "host": {
            "hostname": host.get("hostname"),
            "platform": host.get("platform"),
            "uptime_seconds": host.get("uptime_seconds"),
        },
        "cpu": host.get("cpu"),
        "memory": host.get("memory"),
        "disk": disks,
        "services": {
            "api": {"status": "ok", "detail": "running"},
            "database": db,
            "redis": redis,
            "celery": celery,
        },
        "jobs": jobs,
        "errors": errors,
        "uploads": uploads,
        "gauges": {
            "overall": overall,
            "backend": backend_score,
            "processing": float(jobs["processing_score"]),
            "hardware": hardware_score,
            "traffic": traffic_score,
            "stability": float(errors["stability_score"]),
            "cpu": cpu_pct,
            "memory": mem_pct,
            "disk": disk_pct,
        },
    }

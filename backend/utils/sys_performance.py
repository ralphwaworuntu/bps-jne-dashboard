"""Collect host / service / job metrics for IT Sys Performance dashboard."""
from __future__ import annotations

import os
import platform
import shutil
import socket
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlmodel import Session, col, select

from database import IS_SQLITE, SQLALCHEMY_DATABASE_URL, engine
from models import SystemErrorLog
from utils.env_load import load_dotenv_file

load_dotenv_file()

_APP_PROCESS_HINTS: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    ("api", ("uvicorn", "main:app")),
    ("celery", ("celery", "celery_app")),
    ("web", ("next-server", "next start", "npm run start")),
)

_UNIT_NAMES = ("bps-api", "bps-celery", "bps-web")
_PORT_CHECKS: Tuple[Tuple[str, str, int], ...] = (
    ("api", "127.0.0.1", 8000),
    ("web", "127.0.0.1", 3000),
)

_UPLOAD_TOP_DIRS = (
    "kiriman_yes",
    "all_shipment",
    "jobs",
    "ops_master_data",
    "alc_penjualan",
)


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


def _percentile(sorted_vals: Sequence[float], pct: float) -> Optional[float]:
    if not sorted_vals:
        return None
    if len(sorted_vals) == 1:
        return round(float(sorted_vals[0]), 2)
    k = (len(sorted_vals) - 1) * (pct / 100.0)
    f = int(k)
    c = min(f + 1, len(sorted_vals) - 1)
    if f == c:
        return round(float(sorted_vals[f]), 2)
    d0 = sorted_vals[f] * (c - k)
    d1 = sorted_vals[c] * (k - f)
    return round(float(d0 + d1), 2)


def _dir_size_bytes(root: Path, *, max_files: int = 80_000) -> Tuple[int, int]:
    """Return (total_bytes, file_count). Caps walk to avoid blocking on huge trees."""
    total = 0
    count = 0
    if not root.is_dir():
        return 0, 0
    try:
        for dirpath, _dirnames, filenames in os.walk(root):
            for name in filenames:
                if count >= max_files:
                    return total, count
                fp = Path(dirpath) / name
                try:
                    total += int(fp.stat().st_size)
                    count += 1
                except OSError:
                    continue
    except OSError:
        pass
    return total, count


def _ping_database() -> Dict[str, Any]:
    t0 = time.perf_counter()
    backend = "sqlite" if IS_SQLITE else "postgresql"
    if "postgresql" in (SQLALCHEMY_DATABASE_URL or "").lower():
        backend = "postgresql"
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            latency = round((time.perf_counter() - t0) * 1000, 2)
            out: Dict[str, Any] = {
                "status": "ok",
                "latency_ms": latency,
                "backend": backend,
            }
            if backend == "postgresql":
                try:
                    ver = conn.execute(text("SHOW server_version")).scalar()
                    out["version"] = str(ver or "")[:40]
                except Exception:
                    out["version"] = None
                try:
                    connections = conn.execute(
                        text("SELECT count(*) FROM pg_stat_activity")
                    ).scalar()
                    out["connections"] = int(connections or 0)
                except Exception:
                    out["connections"] = None
                try:
                    size = conn.execute(
                        text("SELECT pg_database_size(current_database())")
                    ).scalar()
                    out["size_bytes"] = int(size or 0)
                except Exception:
                    out["size_bytes"] = None
            else:
                out["version"] = None
                out["connections"] = None
                out["size_bytes"] = None
                try:
                    # SQLite file size if path-like
                    url = SQLALCHEMY_DATABASE_URL or ""
                    if url.startswith("sqlite"):
                        # sqlite:///./database.db or sqlite:///database.db
                        path_part = url.split("sqlite:///")[-1]
                        p = Path(path_part)
                        if p.is_file():
                            out["size_bytes"] = int(p.stat().st_size)
                except Exception:
                    pass
            return out
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": None,
            "backend": backend,
            "detail": str(e)[:200],
            "version": None,
            "connections": None,
            "size_bytes": None,
        }


def _ping_redis() -> Dict[str, Any]:
    url = (os.getenv("REDIS_URL") or "").strip()
    if not url:
        return {
            "status": "disabled",
            "latency_ms": None,
            "detail": "REDIS_URL tidak diset",
            "used_memory_bytes": None,
            "used_memory_human": None,
            "connected_clients": None,
            "uptime_days": None,
            "queue_depth": None,
        }
    try:
        import redis

        t0 = time.perf_counter()
        client = redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=2)
        client.ping()
        latency = round((time.perf_counter() - t0) * 1000, 2)
        info = client.info()
        used = info.get("used_memory")
        try:
            queue_depth = int(client.llen("celery") or 0)
        except Exception:
            queue_depth = None
        return {
            "status": "ok",
            "latency_ms": latency,
            "used_memory_bytes": int(used) if used is not None else None,
            "used_memory_human": str(info.get("used_memory_human") or "") or None,
            "connected_clients": int(info.get("connected_clients") or 0),
            "uptime_days": int(info.get("uptime_in_days") or 0),
            "queue_depth": queue_depth,
        }
    except Exception as e:
        return {
            "status": "error",
            "latency_ms": None,
            "detail": str(e)[:200],
            "used_memory_bytes": None,
            "used_memory_human": None,
            "connected_clients": None,
            "uptime_days": None,
            "queue_depth": None,
        }


def _celery_status() -> Dict[str, Any]:
    use = (os.getenv("USE_CELERY") or "1").strip().lower() not in {"0", "false", "no", "off"}
    redis_url = (os.getenv("REDIS_URL") or "").strip()
    if not use or not redis_url:
        return {
            "status": "disabled",
            "workers": 0,
            "active_tasks": 0,
            "reserved_tasks": 0,
            "scheduled_tasks": 0,
            "queue_depth": None,
            "detail": "Celery tidak aktif (in-process fallback)",
        }

    queue_depth: Optional[int] = None
    try:
        import redis

        r = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
        queue_depth = int(r.llen("celery") or 0)
    except Exception:
        pass

    try:
        from celery_app import celery as celery_app

        insp = celery_app.control.inspect(timeout=1.0)
        ping = insp.ping() or {}
        active = insp.active() or {}
        reserved = insp.reserved() or {}
        scheduled = insp.scheduled() or {}
        workers = len(ping)
        active_tasks = sum(len(v or []) for v in active.values())
        reserved_tasks = sum(len(v or []) for v in reserved.values())
        scheduled_tasks = sum(len(v or []) for v in scheduled.values())
        if workers == 0:
            return {
                "status": "degraded",
                "workers": 0,
                "active_tasks": 0,
                "reserved_tasks": 0,
                "scheduled_tasks": 0,
                "queue_depth": queue_depth,
                "detail": "Tidak ada Celery worker yang merespons",
            }
        return {
            "status": "ok",
            "workers": workers,
            "active_tasks": active_tasks,
            "reserved_tasks": reserved_tasks,
            "scheduled_tasks": scheduled_tasks,
            "queue_depth": queue_depth,
        }
    except Exception as e:
        return {
            "status": "error",
            "workers": 0,
            "active_tasks": 0,
            "reserved_tasks": 0,
            "scheduled_tasks": 0,
            "queue_depth": queue_depth,
            "detail": str(e)[:200],
        }


def _port_open(host: str, port: int, timeout: float = 0.4) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _find_systemctl() -> Optional[str]:
    """Resolve systemctl even when systemd unit PATH is venv-only."""
    found = shutil.which("systemctl")
    if found:
        return found
    for candidate in ("/usr/bin/systemctl", "/bin/systemctl"):
        if Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return candidate
    return None


def _systemd_units() -> List[Dict[str, Any]]:
    """Best-effort systemd is-active for bps-* units (Linux/VPS)."""
    results: List[Dict[str, Any]] = []
    systemctl = _find_systemctl()
    if not systemctl:
        for name in _UNIT_NAMES:
            results.append(
                {
                    "name": name,
                    "active": "unknown",
                    "detail": "systemctl tidak tersedia",
                }
            )
        return results

    for name in _UNIT_NAMES:
        try:
            proc = subprocess.run(
                [systemctl, "is-active", name],
                capture_output=True,
                text=True,
                timeout=2,
                check=False,
                env={**os.environ, "PATH": "/usr/bin:/bin:" + (os.environ.get("PATH") or "")},
            )
            active = (proc.stdout or "").strip() or "unknown"
            detail = None
            if active == "unknown" and (proc.stderr or "").strip():
                detail = (proc.stderr or "").strip()[:120]
            results.append({"name": name, "active": active, "detail": detail})
        except Exception as e:
            results.append({"name": name, "active": "unknown", "detail": str(e)[:120]})
    return results


def _service_ports() -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for label, host, port in _PORT_CHECKS:
        open_ = _port_open(host, port)
        out.append(
            {
                "name": label,
                "host": host,
                "port": port,
                "open": open_,
                "status": "ok" if open_ else "down",
            }
        )
    return out


def _api_service_status(ports: List[Dict[str, Any]], units: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_port = next((p for p in ports if p.get("name") == "api"), None)
    unit = next((u for u in units if u.get("name") == "bps-api"), None)
    if api_port and api_port.get("open"):
        detail = "listening :8000"
        if unit and unit.get("active") not in (None, "unknown"):
            detail = f"systemd={unit.get('active')} · {detail}"
        return {"status": "ok", "detail": detail}
    if unit and str(unit.get("active") or "") == "active":
        return {"status": "degraded", "detail": "unit active tapi port 8000 tidak terbuka"}
    return {"status": "error", "detail": "port 8000 tidak merespons"}


def _app_processes() -> List[Dict[str, Any]]:
    try:
        import psutil
    except ImportError:
        return []

    # Prime cpu_percent
    procs = []
    try:
        for p in psutil.process_iter(["pid", "name", "cmdline", "memory_info"]):
            procs.append(p)
    except Exception:
        return []

    for p in procs:
        try:
            p.cpu_percent(interval=None)
        except (psutil.Error, Exception):
            pass
    time.sleep(0.15)

    grouped: Dict[str, Dict[str, Any]] = {}
    for role, hints in _APP_PROCESS_HINTS:
        grouped[role] = {
            "role": role,
            "pid": None,
            "name": None,
            "cpu_percent": 0.0,
            "rss_bytes": 0,
            "count": 0,
        }

    for p in procs:
        try:
            info = p.info
            name = str(info.get("name") or "").lower()
            cmdline_list = info.get("cmdline") or []
            cmd = " ".join(str(x) for x in cmdline_list).lower()
            blob = f"{name} {cmd}"
        except (psutil.Error, Exception):
            continue

        matched_role: Optional[str] = None
        for role, hints in _APP_PROCESS_HINTS:
            if any(h in blob for h in hints):
                # Prefer celery over generic node when both might match
                if role == "web" and ("celery" in blob or "uvicorn" in blob):
                    continue
                if role == "api" and "celery" in blob:
                    continue
                matched_role = role
                break
        if not matched_role:
            continue

        try:
            cpu = float(p.cpu_percent(interval=None) or 0.0)
            mem = p.memory_info()
            rss = int(getattr(mem, "rss", 0) or 0)
            pid = int(p.pid)
            pname = str(info.get("name") or matched_role)
        except (psutil.Error, Exception):
            continue

        g = grouped[matched_role]
        g["count"] = int(g["count"]) + 1
        g["cpu_percent"] = round(float(g["cpu_percent"]) + cpu, 1)
        g["rss_bytes"] = int(g["rss_bytes"]) + rss
        # Keep highest-RSS pid as representative
        if g["pid"] is None or rss >= int(g.get("_top_rss") or 0):
            g["pid"] = pid
            g["name"] = pname
            g["_top_rss"] = rss

    out: List[Dict[str, Any]] = []
    for role, _hints in _APP_PROCESS_HINTS:
        g = grouped[role]
        g.pop("_top_rss", None)
        if int(g["count"]) == 0:
            out.append(
                {
                    "role": role,
                    "pid": None,
                    "name": None,
                    "cpu_percent": 0.0,
                    "rss_bytes": 0,
                    "count": 0,
                }
            )
        else:
            out.append(
                {
                    "role": role,
                    "pid": g["pid"],
                    "name": g["name"],
                    "cpu_percent": round(float(g["cpu_percent"]), 1),
                    "rss_bytes": int(g["rss_bytes"]),
                    "count": int(g["count"]),
                }
            )
    return out


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
            "swap": {"total_bytes": 0, "used_bytes": 0, "percent": 0.0},
            "disk": [],
            "detail": "psutil belum terpasang",
        }

    boot = getattr(psutil, "boot_time", lambda: time.time())()
    uptime = int(time.time() - boot)
    cpu_percent = float(psutil.cpu_percent(interval=0.2))
    mem = psutil.virtual_memory()
    try:
        swap = psutil.swap_memory()
        swap_info = {
            "total_bytes": int(swap.total),
            "used_bytes": int(swap.used),
            "percent": round(float(swap.percent), 1),
        }
    except Exception:
        swap_info = {"total_bytes": 0, "used_bytes": 0, "percent": 0.0}

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
        if "cdrom" in (part.opts or "").lower():
            continue
        fstype = (part.fstype or "").lower()
        if fstype in {"tmpfs", "devtmpfs", "squashfs"}:
            continue
        if fstype == "overlay" and mount not in {"/", "C:\\", "C:"}:
            continue
        try:
            usage = psutil.disk_usage(mount)
        except (PermissionError, OSError):
            continue
        seen.add(mount)
        disks.append(
            {
                "mount": mount,
                "fstype": part.fstype or "",
                "total_bytes": int(usage.total),
                "used_bytes": int(usage.used),
                "percent": round(float(usage.percent), 1),
            }
        )

    # Prefer sorting: root first, then by used percent desc
    def _disk_sort_key(d: Dict[str, Any]) -> Tuple[int, float]:
        m = str(d.get("mount") or "")
        rootish = 0 if m in {"/", "C:\\", "C:"} else 1
        return (rootish, -float(d.get("percent") or 0))

    disks.sort(key=_disk_sort_key)

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
        "swap": swap_info,
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


def _list_all_jobs(max_files: int = 500) -> List[Dict[str, Any]]:
    from utils import process_jobs

    process_jobs.ensure_dirs()
    items: List[Dict[str, Any]] = []
    for i, path in enumerate(process_jobs.JOBS_DIR.glob("*.json")):
        if i >= max_files:
            break
        if path.name.endswith(".tmp"):
            continue
        try:
            import json

            job = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        items.append(job)
    return items


def _parse_job_ts(job: Dict[str, Any], field: str = "updated_at") -> Optional[datetime]:
    if field == "created_at":
        raw = job.get("created_at")
    else:
        raw = job.get("updated_at") or job.get("created_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", ""))
    except Exception:
        return None


def _job_duration_seconds(job: Dict[str, Any]) -> Optional[float]:
    start = _parse_job_ts(job, "created_at")
    end = _parse_job_ts(job, "updated_at")
    if not start or not end:
        return None
    secs = (end - start).total_seconds()
    if secs < 0:
        return None
    return float(secs)


def _jobs_summary(jobs: List[Dict[str, Any]], all_jobs: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)
    queued = running = failed_24h = completed_24h = 0
    recent: List[Dict[str, Any]] = []
    pool = all_jobs if all_jobs is not None else jobs

    by_kind: Dict[str, Dict[str, Any]] = {}

    for job in pool:
        status = str(job.get("status") or "").lower()
        kind = str(job.get("kind") or "unknown")
        ts = _parse_job_ts(job, "updated_at")
        if status in {"queued", "pending"}:
            queued += 1
        elif status in {"running", "processing"}:
            running += 1

        bucket = by_kind.setdefault(
            kind,
            {
                "kind": kind,
                "completed_24h": 0,
                "failed_24h": 0,
                "durations_sec": [],
            },
        )

        if ts and ts >= day_ago:
            if status == "failed":
                failed_24h += 1
                bucket["failed_24h"] += 1
            elif status in {"completed", "done", "success"}:
                completed_24h += 1
                bucket["completed_24h"] += 1
                dur = _job_duration_seconds(job)
                if dur is not None:
                    bucket["durations_sec"].append(dur)

    for job in jobs:
        if len(recent) >= 8:
            break
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

    # Also count queued/running only from recent list scan of pool already done

    total_done = failed_24h + completed_24h
    success_rate = 100.0 if total_done == 0 else round(100.0 * completed_24h / total_done, 1)
    queue_pressure = queued + running
    processing_score = _clamp(success_rate - min(40.0, queue_pressure * 8.0))

    all_durs: List[float] = []
    per_kind: List[Dict[str, Any]] = []
    for kind, bucket in sorted(by_kind.items(), key=lambda x: x[0]):
        durs = sorted(bucket["durations_sec"])
        all_durs.extend(durs)
        done = int(bucket["completed_24h"]) + int(bucket["failed_24h"])
        fail_rate = 0.0 if done == 0 else round(100.0 * int(bucket["failed_24h"]) / done, 1)
        per_kind.append(
            {
                "kind": kind,
                "completed_24h": int(bucket["completed_24h"]),
                "failed_24h": int(bucket["failed_24h"]),
                "fail_rate_24h": fail_rate,
                "p50_seconds": _percentile(durs, 50),
                "p95_seconds": _percentile(durs, 95),
                "sample_size": len(durs),
            }
        )

    all_durs_sorted = sorted(all_durs)
    return {
        "queued": queued,
        "running": running,
        "failed_last_24h": failed_24h,
        "completed_last_24h": completed_24h,
        "success_rate_24h": success_rate,
        "processing_score": round(processing_score, 1),
        "latency_p50_seconds": _percentile(all_durs_sorted, 50),
        "latency_p95_seconds": _percentile(all_durs_sorted, 95),
        "by_kind": per_kind,
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

    score = 100.0 - min(90.0, last_24h * 4.0 + critical_24h * 15.0)
    return {
        "last_24h": last_24h,
        "critical_last_24h": critical_24h,
        "stability_score": round(_clamp(score), 1),
    }


def _uploads_freshness() -> Dict[str, Any]:
    """Rough traffic/data freshness + folder sizes under uploads/."""
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

    uploads_root = Path("uploads")
    total_bytes, sized_files = _dir_size_bytes(uploads_root)
    folders: List[Dict[str, Any]] = []
    if uploads_root.is_dir():
        for name in _UPLOAD_TOP_DIRS:
            sub = uploads_root / name
            if not sub.is_dir():
                continue
            b, c = _dir_size_bytes(sub, max_files=40_000)
            folders.append({"name": name, "bytes": b, "files": c})
        # Any other top-level dirs
        try:
            for child in sorted(uploads_root.iterdir()):
                if not child.is_dir():
                    continue
                if child.name in _UPLOAD_TOP_DIRS or child.name.startswith("."):
                    continue
                b, c = _dir_size_bytes(child, max_files=20_000)
                if b > 0:
                    folders.append({"name": child.name, "bytes": b, "files": c})
        except OSError:
            pass
    folders.sort(key=lambda x: int(x.get("bytes") or 0), reverse=True)

    return {
        "tracked_files": file_count,
        "newest_age_hours": age_hours,
        "activity_score": activity,
        "total_bytes": total_bytes,
        "sized_files": sized_files,
        "folders": folders[:12],
    }


def collect_sys_performance() -> Dict[str, Any]:
    host = _host_metrics()
    processes = _app_processes()
    units = _systemd_units()
    ports = _service_ports()
    db = _ping_database()
    redis = _ping_redis()
    celery = _celery_status()
    # Prefer redis queue_depth on celery payload
    if celery.get("queue_depth") is None and redis.get("queue_depth") is not None:
        celery["queue_depth"] = redis.get("queue_depth")

    recent_jobs = _list_recent_jobs(80)
    all_jobs = _list_all_jobs(500)
    jobs = _jobs_summary(recent_jobs, all_jobs)
    errors = _errors_summary()
    uploads = _uploads_freshness()
    api_svc = _api_service_status(ports, units)

    cpu_pct = float((host.get("cpu") or {}).get("percent") or 0)
    mem_pct = float((host.get("memory") or {}).get("percent") or 0)
    disks = host.get("disk") or []
    disk_pct = float(disks[0]["percent"]) if disks else 0.0
    swap_pct = float((host.get("swap") or {}).get("percent") or 0)

    db_ok = db.get("status") == "ok"
    redis_ok = redis.get("status") in {"ok", "disabled"}

    backend_parts = [
        _score_from_latency_ms(db.get("latency_ms")),
        100.0 if redis_ok and redis.get("status") == "ok" else (70.0 if redis.get("status") == "disabled" else 20.0),
        100.0 if celery.get("status") == "ok" else (65.0 if celery.get("status") == "disabled" else 35.0),
        _score_from_usage(cpu_pct) * 0.5 + 50,
    ]
    if api_svc.get("status") != "ok":
        backend_parts.append(30.0)
    backend_score = round(sum(backend_parts) / len(backend_parts), 1) if db_ok else 25.0

    hardware_score = round(
        (
            _score_from_usage(cpu_pct)
            + _score_from_usage(mem_pct)
            + _score_from_usage(disk_pct)
            + _score_from_usage(swap_pct)
        )
        / 4.0,
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
        "swap": host.get("swap"),
        "disk": disks,
        "processes": processes,
        "units": units,
        "ports": ports,
        "services": {
            "api": api_svc,
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
            "swap": swap_pct,
        },
    }

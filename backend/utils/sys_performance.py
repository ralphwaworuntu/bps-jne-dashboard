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

# Network probe targets (VPS → internet). TCP avoids needing root for ICMP.
_NET_PROBE_HOST = "1.1.1.1"
_NET_PROBE_PORT = 443
_SPEEDTEST_DOWN_URL = "https://speed.cloudflare.com/__down?bytes={bytes}"
_SPEEDTEST_UP_URL = "https://speed.cloudflare.com/__up"
_SPEEDTEST_RESULT_PATH = Path("uploads/jobs/_sys_speedtest_last.json")
_DOWNLOAD_TEST_BYTES = 5 * 1024 * 1024  # 5 MiB
_UPLOAD_TEST_BYTES = 2 * 1024 * 1024  # 2 MiB

# Cache heavy upload folder sizing between refreshes
_uploads_cache: Optional[Tuple[float, Dict[str, Any]]] = None
_UPLOADS_CACHE_TTL_SEC = 60.0



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


def _tcp_rtt_ms(host: str, port: int, timeout: float = 2.0) -> Optional[float]:
    t0 = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            pass
        return round((time.perf_counter() - t0) * 1000, 2)
    except OSError:
        return None


def _network_latency_jitter(samples: int = 3) -> Dict[str, Any]:
    """Lightweight RTT probe — keep sample count low for dashboard refresh path."""
    rtts: List[float] = []
    n = max(2, min(int(samples), 6))
    for i in range(n):
        ms = _tcp_rtt_ms(_NET_PROBE_HOST, _NET_PROBE_PORT, timeout=1.2)
        if ms is not None:
            rtts.append(ms)
        if i + 1 < n:
            time.sleep(0.02)
    if not rtts:
        return {
            "status": "error",
            "probe": f"{_NET_PROBE_HOST}:{_NET_PROBE_PORT}",
            "latency_ms": None,
            "jitter_ms": None,
            "min_ms": None,
            "max_ms": None,
            "samples": 0,
            "detail": "Gagal mengukur RTT ke internet",
        }
    avg = sum(rtts) / len(rtts)
    jitter = 0.0
    if len(rtts) > 1:
        jitter = sum(abs(rtts[i] - rtts[i - 1]) for i in range(1, len(rtts))) / (
            len(rtts) - 1
        )
    return {
        "status": "ok",
        "probe": f"{_NET_PROBE_HOST}:{_NET_PROBE_PORT}",
        "latency_ms": round(avg, 2),
        "jitter_ms": round(jitter, 2),
        "min_ms": round(min(rtts), 2),
        "max_ms": round(max(rtts), 2),
        "samples": len(rtts),
    }


def _network_iface_throughput(sample_seconds: float = 0.0) -> Dict[str, Any]:
    """Throughput from delta vs previous sample (no sleep on refresh path)."""
    global _last_net_sample
    try:
        import psutil
    except ImportError:
        return {
            "bytes_sent": 0,
            "bytes_recv": 0,
            "tx_mbps": None,
            "rx_mbps": None,
            "detail": "psutil belum terpasang",
        }

    try:
        c1 = psutil.net_io_counters()
        now = time.perf_counter()
        tx_mbps: Optional[float] = None
        rx_mbps: Optional[float] = None
        sample_dt: Optional[float] = None

        if sample_seconds and sample_seconds > 0:
            c0 = c1
            t0 = now
            time.sleep(max(0.15, sample_seconds))
            c1 = psutil.net_io_counters()
            now = time.perf_counter()
            dt = max(0.001, now - t0)
            sample_dt = round(dt, 3)
            tx_mbps = round((max(0, int(c1.bytes_sent) - int(c0.bytes_sent)) * 8) / dt / 1_000_000, 3)
            rx_mbps = round((max(0, int(c1.bytes_recv) - int(c0.bytes_recv)) * 8) / dt / 1_000_000, 3)
        elif _last_net_sample is not None:
            t0, s0, r0 = _last_net_sample
            dt = now - t0
            if dt >= 0.4:
                sample_dt = round(dt, 3)
                tx_mbps = round((max(0, int(c1.bytes_sent) - s0) * 8) / dt / 1_000_000, 3)
                rx_mbps = round((max(0, int(c1.bytes_recv) - r0) * 8) / dt / 1_000_000, 3)

        _last_net_sample = (now, int(c1.bytes_sent), int(c1.bytes_recv))
        return {
            "bytes_sent": int(c1.bytes_sent),
            "bytes_recv": int(c1.bytes_recv),
            "tx_mbps": tx_mbps,
            "rx_mbps": rx_mbps,
            "sample_seconds": sample_dt,
        }
    except Exception as e:
        return {
            "bytes_sent": 0,
            "bytes_recv": 0,
            "tx_mbps": None,
            "rx_mbps": None,
            "detail": str(e)[:160],
        }


def _read_last_speedtest() -> Optional[Dict[str, Any]]:
    try:
        if not _SPEEDTEST_RESULT_PATH.is_file():
            return None
        import json

        data = json.loads(_SPEEDTEST_RESULT_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _write_last_speedtest(payload: Dict[str, Any]) -> None:
    try:
        import json

        _SPEEDTEST_RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
        _SPEEDTEST_RESULT_PATH.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass


def _network_snapshot() -> Dict[str, Any]:
    latency = _network_latency_jitter(samples=2)
    iface = _network_iface_throughput(sample_seconds=0.0)
    last = _read_last_speedtest()
    return {
        "latency": latency,
        "interface": iface,
        "last_speedtest": last,
    }


def run_internet_speedtest(
    *,
    download_bytes: int = _DOWNLOAD_TEST_BYTES,
    upload_bytes: int = _UPLOAD_TEST_BYTES,
) -> Dict[str, Any]:
    """Active VPS→internet speed test (Cloudflare endpoints). On-demand only."""
    import ssl
    import urllib.request

    latency = _network_latency_jitter(samples=6)
    ctx = ssl.create_default_context()
    ua = "BPS-JNE-Dashboard-SpeedTest/1.0"

    download_mbps: Optional[float] = None
    upload_mbps: Optional[float] = None
    down_bytes = 0
    up_bytes = 0
    down_ms: Optional[float] = None
    up_ms: Optional[float] = None
    errors: List[str] = []

    # --- Download ---
    try:
        url = _SPEEDTEST_DOWN_URL.format(bytes=int(download_bytes))
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            chunks = []
            while True:
                chunk = resp.read(256 * 1024)
                if not chunk:
                    break
                chunks.append(chunk)
        elapsed = max(0.001, time.perf_counter() - t0)
        payload = b"".join(chunks)
        down_bytes = len(payload)
        down_ms = round(elapsed * 1000, 1)
        download_mbps = round((down_bytes * 8) / elapsed / 1_000_000, 2)
    except Exception as e:
        errors.append(f"download: {e!s}"[:180])

    # --- Upload ---
    try:
        body = os.urandom(int(upload_bytes))
        req = urllib.request.Request(
            _SPEEDTEST_UP_URL,
            data=body,
            method="POST",
            headers={
                "User-Agent": ua,
                "Content-Type": "application/octet-stream",
                "Content-Length": str(len(body)),
            },
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            resp.read()
        elapsed = max(0.001, time.perf_counter() - t0)
        up_bytes = len(body)
        up_ms = round(elapsed * 1000, 1)
        upload_mbps = round((up_bytes * 8) / elapsed / 1_000_000, 2)
    except Exception as e:
        errors.append(f"upload: {e!s}"[:180])

    status = "ok"
    if download_mbps is None and upload_mbps is None:
        status = "error"
    elif errors:
        status = "partial"

    result = {
        "status": status,
        "tested_at": datetime.utcnow().isoformat() + "Z",
        "provider": "cloudflare",
        "latency_ms": latency.get("latency_ms"),
        "jitter_ms": latency.get("jitter_ms"),
        "download_mbps": download_mbps,
        "upload_mbps": upload_mbps,
        "download_bytes": down_bytes,
        "upload_bytes": up_bytes,
        "download_ms": down_ms,
        "upload_ms": up_ms,
        "probe": latency.get("probe"),
        "detail": "; ".join(errors) if errors else None,
    }
    _write_last_speedtest(result)
    return result


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

        insp = celery_app.control.inspect(timeout=0.25)
        ping = insp.ping() or {}
        active = insp.active() or {}
        reserved_tasks = 0
        scheduled_tasks = 0
        workers = len(ping)
        active_tasks = sum(len(v or []) for v in active.values())
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

    name_allow = {
        "python",
        "python.exe",
        "python3",
        "python3.exe",
        "celery",
        "celery.exe",
        "node",
        "node.exe",
        "next-server",
        "npm",
        "npm.cmd",
    }

    grouped: Dict[str, Dict[str, Any]] = {}
    for role, _hints in _APP_PROCESS_HINTS:
        grouped[role] = {
            "role": role,
            "pid": None,
            "name": None,
            "cpu_percent": 0.0,
            "rss_bytes": 0,
            "count": 0,
            "_top_rss": 0,
        }

    try:
        for p in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                info = p.info
                pname = str(info.get("name") or "")
                name_l = pname.lower()
                if name_l not in name_allow and not name_l.startswith("python"):
                    continue
                try:
                    cmdline_list = p.cmdline() or []
                except (psutil.Error, Exception):
                    cmdline_list = []
                cmd = " ".join(str(x) for x in cmdline_list).lower()
                blob = f"{name_l} {cmd}"
            except (psutil.Error, Exception):
                continue

            matched_role: Optional[str] = None
            for role, hints in _APP_PROCESS_HINTS:
                if any(h in blob for h in hints):
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
                mem = info.get("memory_info")
                rss = int(getattr(mem, "rss", 0) or 0) if mem is not None else 0
                if rss <= 0:
                    mem2 = p.memory_info()
                    rss = int(getattr(mem2, "rss", 0) or 0)
                pid = int(p.pid)
            except (psutil.Error, Exception):
                continue

            g = grouped[matched_role]
            g["count"] = int(g["count"]) + 1
            g["cpu_percent"] = round(float(g["cpu_percent"]) + cpu, 1)
            g["rss_bytes"] = int(g["rss_bytes"]) + rss
            if g["pid"] is None or rss >= int(g.get("_top_rss") or 0):
                g["pid"] = pid
                g["name"] = pname or matched_role
                g["_top_rss"] = rss
    except Exception:
        pass

    out: List[Dict[str, Any]] = []
    for role, _hints in _APP_PROCESS_HINTS:
        g = grouped[role]
        g.pop("_top_rss", None)
        out.append(
            {
                "role": role,
                "pid": g["pid"],
                "name": g["name"],
                "cpu_percent": round(float(g["cpu_percent"]), 1) if int(g["count"]) else 0.0,
                "rss_bytes": int(g["rss_bytes"]) if int(g["count"]) else 0,
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
    cpu_percent = float(psutil.cpu_percent(interval=0.05))
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
    recent_ago = now - timedelta(hours=6)
    queued = running = failed_24h = completed_24h = 0
    failed_6h = completed_6h = 0
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
            if ts >= recent_ago:
                if status == "failed":
                    failed_6h += 1
                elif status in {"completed", "done", "success"}:
                    completed_6h += 1

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

    total_done_24h = failed_24h + completed_24h
    success_rate = 100.0 if total_done_24h == 0 else round(100.0 * completed_24h / total_done_24h, 1)

    # Gauge: prefer last 6 hours so recovered systems go green without waiting 24h
    total_done_6h = failed_6h + completed_6h
    if total_done_6h > 0:
        success_for_score = 100.0 * completed_6h / total_done_6h
    else:
        success_for_score = success_rate
    queue_pressure = queued + running
    processing_score = _clamp(success_for_score - min(40.0, queue_pressure * 8.0))

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
    global _uploads_cache
    now = time.time()
    if _uploads_cache and (now - _uploads_cache[0]) < _UPLOADS_CACHE_TTL_SEC:
        return dict(_uploads_cache[1])

    uploads_root = Path("uploads")
    newest: Optional[float] = None
    file_count = 0

    probe_roots = [
        Path("uploads/jobs"),
        Path("uploads/kiriman_yes"),
        Path("uploads/all_shipment"),
    ]
    for root in probe_roots:
        if not root.is_dir():
            continue
        try:
            for p in root.rglob("*"):
                if file_count >= 2500:
                    break
                if not p.is_file():
                    continue
                if p.suffix.lower() in {".tmp"}:
                    continue
                try:
                    mtime = p.stat().st_mtime
                except OSError:
                    continue
                file_count += 1
                if newest is None or mtime > newest:
                    newest = mtime
        except OSError:
            pass

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

    total_bytes, sized_files = _dir_size_bytes(uploads_root, max_files=20_000)
    folders: List[Dict[str, Any]] = []
    if uploads_root.is_dir():
        for name in _UPLOAD_TOP_DIRS:
            sub = uploads_root / name
            if not sub.is_dir():
                continue
            b, c = _dir_size_bytes(sub, max_files=10_000)
            folders.append({"name": name, "bytes": b, "files": c})
        try:
            for child in sorted(uploads_root.iterdir()):
                if not child.is_dir():
                    continue
                if child.name in _UPLOAD_TOP_DIRS or child.name.startswith("."):
                    continue
                b, c = _dir_size_bytes(child, max_files=6_000)
                if b > 0:
                    folders.append({"name": child.name, "bytes": b, "files": c})
        except OSError:
            pass
    folders.sort(key=lambda x: int(x.get("bytes") or 0), reverse=True)

    payload = {
        "tracked_files": file_count,
        "newest_age_hours": age_hours,
        "activity_score": activity,
        "total_bytes": total_bytes,
        "sized_files": sized_files,
        "folders": folders[:12],
    }
    _uploads_cache = (now, payload)
    return dict(payload)


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
    network = _network_snapshot()

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
            + _score_from_latency_ms(
                (network.get("latency") or {}).get("latency_ms"), good=40, bad=250
            )
        )
        / 4.0,
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
        "network": network,
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

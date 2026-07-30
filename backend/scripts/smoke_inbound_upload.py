"""Smoke test: login → upload APEX CSV (small + large) → rows via API + Next proxy."""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
PROXY = "http://127.0.0.1:3000/api"
DATE = "2026-07-26"
CREDS = [
    ("admin@bps.go.id", "admin123"),
    ("admininbound@bps.go.id", "admin123"),
]


def post_form(url: str, data: bytes, headers: dict, timeout: int = 300) -> tuple[int, str]:
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body
    except Exception as e:
        return 0, str(e)


def get_json(url: str, token: str) -> tuple[int, dict | str]:
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {token}"}, method="GET"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body


def login() -> str:
    for user, password in CREDS:
        data = f"username={user}&password={password}".encode()
        code, body = post_form(
            f"{BASE}/token",
            data,
            {"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        if code == 200:
            token = json.loads(body).get("access_token")
            if token:
                print(f"[ok] login as {user}")
                return token
        print(f"[..] login fail {user}: {code} {body[:120]}")
    raise SystemExit("Tidak bisa login")


def build_csv(n_rows: int, with_apostrophe: bool = True) -> bytes:
    headers = [
        "AWB",
        "ID_ACCOUNT",
        "SHIPPER_NAME",
        "TGL_ENTRY",
        "CONSIGNEE_NAME",
        "ADDR1",
        "ORIGIN",
        "DEST",
        "SERVICE",
        "QTY",
        "WEIGHT",
        "STATUS_POD",
        "STATUS_WEB",
        "TGL_TARIK_REPORT",
    ]
    lines = [",".join(headers)]
    for i in range(n_rows):
        if with_apostrophe:
            awb = f"'KOE{i:07d}"
            acc = f"'ACC{i:05d}"
        else:
            awb = f"KOE{i:07d}"
            acc = f"ACC{i:05d}"
        lines.append(
            ",".join(
                [
                    awb,
                    acc,
                    f"Shipper {i}",
                    "26/07/2026",
                    f"Consignee {i}",
                    f"Addr {i}",
                    "KOE",
                    "DPS",
                    "REG",
                    "1",
                    "1.0",
                    "DLV",
                    "OK",
                    DATE,
                ]
            )
        )
    return ("\n".join(lines) + "\n").encode("utf-8")


def multipart_upload(
    url: str, token: str, csv_bytes: bytes, filename: str, date: str
) -> tuple[int, str]:
    boundary = "----SmokeBound7MA4YWxkTrZu0gW"
    parts = [
        f"--{boundary}\r\n".encode(),
        b'Content-Disposition: form-data; name="date"\r\n\r\n',
        f"{date}\r\n".encode(),
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
        b"Content-Type: text/csv\r\n\r\n",
        csv_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ]
    return post_form(
        url,
        b"".join(parts),
        {
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )


def main() -> int:
    token = login()
    failures = 0

    small = build_csv(5)
    t0 = time.perf_counter()
    code, body = multipart_upload(
        f"{BASE}/api/all-shipment/inbound/upload",
        token,
        small,
        "apex_small.csv",
        DATE,
    )
    dt = time.perf_counter() - t0
    print(f"[small direct] HTTP {code} in {dt:.2f}s :: {body[:200]}")
    if code != 200:
        failures += 1

    large_n = 20000
    large = build_csv(large_n)
    print(f"[large] bytes={len(large):,} rows={large_n}")
    t0 = time.perf_counter()
    code, body = multipart_upload(
        f"{BASE}/api/all-shipment/inbound/upload",
        token,
        large,
        "apex_large.csv",
        DATE,
    )
    dt = time.perf_counter() - t0
    print(f"[large direct] HTTP {code} in {dt:.2f}s :: {body[:300]}")
    if code != 200:
        failures += 1
    else:
        payload = json.loads(body)
        if int(payload.get("rows") or 0) != large_n:
            print(f"[fail] expected {large_n} rows got {payload.get('rows')}")
            failures += 1

    code_r, detail = get_json(
        f"{BASE}/api/all-shipment/inbound/rows?date={DATE}&limit=0", token
    )
    total = detail.get("total") if isinstance(detail, dict) else detail
    print(f"[rows] HTTP {code_r} total={total}")
    if code_r != 200 or not isinstance(detail, dict) or int(detail.get("total") or 0) < 1:
        failures += 1
    else:
        sample = (detail.get("items") or [{}])[0]
        if "'" in str(sample.get("AWB", "")) or "'" in str(sample.get("ID_ACCOUNT", "")):
            print("[fail] apostrophe masih ada", sample.get("AWB"), sample.get("ID_ACCOUNT"))
            failures += 1

    mid = build_csv(500)
    t0 = time.perf_counter()
    code_p, body_p = multipart_upload(
        f"{PROXY}/api/all-shipment/inbound/upload",
        token,
        mid,
        "apex_proxy.csv",
        DATE,
    )
    dt = time.perf_counter() - t0
    print(f"[proxy mid] HTTP {code_p} in {dt:.2f}s :: {body_p[:300]}")
    if code_p != 200:
        failures += 1

    if failures:
        print(f"[FAILED] {failures} check(s)")
        return 1
    print("[SUCCESS] smoke inbound upload OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

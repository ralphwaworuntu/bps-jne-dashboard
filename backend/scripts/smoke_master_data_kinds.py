"""Smoke test Master Data kinds CRUD + upload."""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8000"


def req(method: str, path: str, data=None, headers=None, raw: bool = False):
    h = dict(headers or {})
    body = None
    if data is not None and not raw:
        body = json.dumps(data).encode()
        h["Content-Type"] = "application/json"
    elif data is not None and raw:
        body = data
    request = urllib.request.Request(BASE + path, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:
            raw_body = resp.read().decode() or "{}"
            try:
                return resp.status, json.loads(raw_body)
            except json.JSONDecodeError:
                return resp.status, raw_body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def main() -> None:
    form = urllib.parse.urlencode(
        {"username": "admin@bps.go.id", "password": "admin123"}
    ).encode()
    st, tok = req(
        "POST",
        "/token",
        data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        raw=True,
    )
    assert st == 200 and isinstance(tok, dict), (st, tok)
    auth = {"Authorization": f"Bearer {tok['access_token']}"}
    print("login ok")

    st, kinds = req("GET", "/ops/master-data/kinds", headers=auth)
    assert st == 200 and isinstance(kinds, dict), (st, kinds)
    print("kinds", len(kinds["items"]))

    req("DELETE", "/ops/master-data/kinds/uji_coba_demo", headers=auth)

    st, created = req(
        "POST",
        "/ops/master-data/kinds",
        data={
            "label": "Uji Coba Demo",
            "description": "smoke test",
            "columns": ["Kolom A", "Kolom B"],
            "color_class": "blue",
        },
        headers=auth,
    )
    assert st == 200 and isinstance(created, dict), (st, created)
    kind = created["item"]["kind"]
    print("create", kind)

    boundary = "----boundsmoke"
    csv_body = b"Kolom A,Kolom B\nfoo,bar\nbaz,qux\n"
    payload = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="demo.csv"\r\n'
        "Content-Type: text/csv\r\n\r\n"
    ).encode() + csv_body + f"\r\n--{boundary}--\r\n".encode()
    st, up = req(
        "POST",
        f"/ops/master-data/upload/{kind}",
        data=payload,
        headers={**auth, "Content-Type": f"multipart/form-data; boundary={boundary}"},
        raw=True,
    )
    assert st == 200 and isinstance(up, dict), (st, up)
    print("upload rows", up["rows"])

    st, page = req("GET", f"/ops/master-data/{kind}?limit=0", headers=auth)
    assert st == 200 and isinstance(page, dict), (st, page)
    assert page["total"] == 2, page
    print("fetch total", page["total"], page["items"])

    st, deleted = req("DELETE", f"/ops/master-data/kinds/{kind}", headers=auth)
    assert st == 200, (st, deleted)
    print("delete ok", deleted)

    st, after = req("GET", f"/ops/master-data/{kind}?limit=0", headers=auth)
    assert st == 400, (st, after)
    print("after delete rejected", st)

    st, builtin = req("DELETE", "/ops/master-data/kinds/coding_nasional", headers=auth)
    assert st == 400, (st, builtin)
    print("builtin protected ok")

    print("SMOKE PASS")


if __name__ == "__main__":
    main()

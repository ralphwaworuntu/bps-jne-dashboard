"""Smoke test upload history retention + download."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8000"


def main() -> None:
    form = urllib.parse.urlencode(
        {"username": "admin@bps.go.id", "password": "admin123"}
    ).encode()
    req = urllib.request.Request(
        BASE + "/token",
        data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    tok = json.loads(urllib.request.urlopen(req, timeout=10).read())
    auth = {"Authorization": "Bearer " + tok["access_token"]}

    r = urllib.request.Request(BASE + "/ops/master-data/uploads/history", headers=auth)
    body = json.loads(urllib.request.urlopen(r, timeout=10).read())
    print("history kinds", len(body.get("items", {})))

    kind = "uji_coba_demo"
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                BASE + f"/ops/master-data/kinds/{kind}", headers=auth, method="DELETE"
            )
        )
    except Exception:
        pass

    payload = json.dumps(
        {"label": "Uji Coba Demo", "columns": ["Kolom A", "Kolom B"]}
    ).encode()
    r = urllib.request.Request(
        BASE + "/ops/master-data/kinds",
        data=payload,
        headers={**auth, "Content-Type": "application/json"},
        method="POST",
    )
    kind = json.loads(urllib.request.urlopen(r).read())["item"]["kind"]

    def upload(content: bytes, name: str) -> None:
        b = "----b"
        body_bytes = (
            f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{name}"\r\n'
            "Content-Type: text/csv\r\n\r\n"
        ).encode() + content + f"\r\n--{b}--\r\n".encode()
        req = urllib.request.Request(
            BASE + f"/ops/master-data/upload/{kind}",
            data=body_bytes,
            headers={**auth, "Content-Type": f"multipart/form-data; boundary={b}"},
            method="POST",
        )
        urllib.request.urlopen(req)

    upload(b"Kolom A,Kolom B\n1,2\n", "v1.csv")
    upload(b"Kolom A,Kolom B\n3,4\n5,6\n", "v2.csv")

    r = urllib.request.Request(BASE + f"/ops/master-data/{kind}/history", headers=auth)
    hist = json.loads(urllib.request.urlopen(r).read())
    print("records", len(hist["items"]), "active", sum(1 for x in hist["items"] if x["is_active"]))

    dl = hist["items"][0]["id"]
    req = urllib.request.Request(
        BASE + f"/ops/master-data/{kind}/download/{dl}", headers=auth
    )
    resp = urllib.request.urlopen(req)
    print("download bytes", len(resp.read()))

    urllib.request.urlopen(
        urllib.request.Request(
            BASE + f"/ops/master-data/kinds/{kind}", headers=auth, method="DELETE"
        )
    )
    print("ok")


if __name__ == "__main__":
    main()

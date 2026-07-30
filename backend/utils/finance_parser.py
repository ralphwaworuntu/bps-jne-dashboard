"""
Parser finance di server — mirror logika frontend (parseRekeningKoran / parseBuktiTransaksi)
agar hasil baris sama, lalu di-cache sebagai JSON di samping file upload.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

HEADER_TO_FIELD = {
    "tanggal": "tanggal",
    "deskripsi transaksi": "deskripsiTransaksi",
    "amount": "amount",
    "type": "type",
    "catatan": "catatan",
    "unknow": "unknow",
    "unknown": "unknow",
    "divisi/pic": "divisiPic",
    "divisi / pic": "divisiPic",
    "divisi pic": "divisiPic",
}


def _normalize_header(h: str) -> str:
    return re.sub(r"\s+", " ", str(h).replace("\u00a0", " ").strip().lower())


def _empty_rekening() -> Dict[str, str]:
    return {
        "tanggal": "",
        "deskripsiTransaksi": "",
        "amount": "",
        "type": "",
        "catatan": "",
        "unknow": "",
        "divisiPic": "",
    }


def parse_rekening_koran_file(path: Path) -> Dict[str, Any]:
    """Kembalikan {rows, matchedHeaders} — sama bentuk dengan frontend."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return {"rows": [], "matchedHeaders": 0, "skipped": "pdf"}

    if suffix == ".csv":
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
    else:
        df = pd.read_excel(path, dtype=str)

    if df.empty:
        return {"rows": [], "matchedHeaders": 0}

    df.columns = [str(c).strip() for c in df.columns]
    excel_to_field: Dict[str, str] = {}
    for col in df.columns:
        field = HEADER_TO_FIELD.get(_normalize_header(col))
        if field:
            excel_to_field[col] = field

    rows: List[Dict[str, str]] = []
    for _, series in df.iterrows():
        rec = _empty_rekening()
        for excel_key, field in excel_to_field.items():
            v = series.get(excel_key, "")
            rec[field] = "" if v is None else str(v).strip()
        if any(rec.values()):
            rows.append(rec)

    return {"rows": rows, "matchedHeaders": len(excel_to_field)}


def parse_bukti_transaksi_file(path: Path) -> List[Dict[str, Any]]:
    """Mirror parseBuktiTransaksiBuffer: multi-sheet, F1 total, header map (pandas)."""
    xl = pd.ExcelFile(path)
    sheets_out: List[Dict[str, Any]] = []

    for sheet_name in xl.sheet_names:
        raw = pd.read_excel(path, sheet_name=sheet_name, header=None, dtype=str)
        raw = raw.fillna("")
        if raw.empty:
            sheets_out.append(
                {"sheetName": sheet_name, "f1TotalSetoranBank": "", "rows": []}
            )
            continue

        # F1 = row 0, col 5
        f1_text = ""
        if raw.shape[1] > 5:
            f1_text = str(raw.iat[0, 5]).strip()

        header_row = None
        col_map: Dict[str, int] = {}
        scan_to = min(15, len(raw))
        for r in range(scan_to):
            candidate: Dict[str, int] = {}
            for c in range(min(raw.shape[1], 30)):
                nk = _normalize_header(raw.iat[r, c])
                if not nk:
                    continue
                if nk == "hari":
                    candidate["hari"] = c
                elif nk in ("tanggal", "tgl"):
                    candidate["tanggal"] = c
                elif nk == "bri":
                    candidate["bri"] = c
                elif nk == "bni":
                    candidate["bni"] = c
                elif nk in ("lainnya", "lain lain", "lain-lain"):
                    candidate["lainnya"] = c
                elif nk in ("total setoran", "total"):
                    candidate["totalSetoran"] = c
            if len(candidate) >= 3:
                header_row = r
                col_map = candidate
                break

        if header_row is None:
            sheets_out.append(
                {"sheetName": sheet_name, "f1TotalSetoranBank": f1_text, "rows": []}
            )
            continue

        rows: List[Dict[str, str]] = []
        for r in range(header_row + 1, len(raw)):
            def cell(field: str, row: int = r) -> str:
                c = col_map.get(field)
                if c is None or c >= raw.shape[1]:
                    return ""
                return str(raw.iat[row, c]).strip()

            rec = {
                "hari": cell("hari"),
                "tanggal": cell("tanggal"),
                "bri": cell("bri"),
                "bni": cell("bni"),
                "lainnya": cell("lainnya"),
                "totalSetoran": cell("totalSetoran"),
            }
            if any(rec.values()):
                rows.append(rec)

        sheets_out.append(
            {
                "sheetName": sheet_name,
                "f1TotalSetoranBank": f1_text,
                "rows": rows,
            }
        )

    return sheets_out


def parsed_cache_path(stored_path: str | Path) -> Path:
    p = Path(stored_path)
    return p.with_suffix(p.suffix + ".parsed.json")


def write_parsed_cache(stored_path: str | Path, kind: str) -> Path:
    path = Path(stored_path)
    cache = parsed_cache_path(path)
    if kind == "rekening_koran":
        payload = parse_rekening_koran_file(path)
    elif kind == "bukti_transaksi":
        payload = {"sheets": parse_bukti_transaksi_file(path)}
    else:
        raise ValueError(f"Unknown finance kind: {kind}")
    cache.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return cache


def read_parsed_cache(stored_path: str | Path) -> Optional[dict]:
    cache = parsed_cache_path(stored_path)
    if not cache.is_file():
        return None
    try:
        return json.loads(cache.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

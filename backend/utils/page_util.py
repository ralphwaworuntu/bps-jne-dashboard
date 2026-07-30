"""Helper pagination respons seragam."""
from __future__ import annotations

from typing import Any, Iterable, List, Sequence

import pandas as pd


def clamp_page_limit(page: int | None, limit: int | None, default_limit: int = 50, max_limit: int = 200):
    p = int(page or 1)
    lim = int(limit or default_limit)
    if p < 1:
        p = 1
    if lim < 1:
        lim = 1
    if lim > max_limit:
        lim = max_limit
    return p, lim


def paginate_list(
    records: Sequence[Any],
    page: int = 1,
    limit: int = 50,
    *,
    default_limit: int = 50,
    max_limit: int = 200,
    extra: dict | None = None,
) -> dict:
    page, limit = clamp_page_limit(page, limit, default_limit, max_limit)
    total = len(records)
    start = (page - 1) * limit
    end = start + limit
    pages = (total + limit - 1) // limit if limit and total else 0
    out = {
        "items": list(records[start:end]),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }
    if extra:
        out.update(extra)
    return out


def filter_records_by_query(records: Iterable[dict], q: str | None) -> List[dict]:
    """Search full-kolom di list of dict (semua values)."""
    if not q or not str(q).strip():
        return list(records)
    needle = str(q).strip().lower()
    out: List[dict] = []
    for row in records:
        if any(needle in str(v).lower() for v in row.values()):
            out.append(row)
    return out


def filter_dataframe_by_query(df: pd.DataFrame, q: str | None) -> pd.DataFrame:
    """Search full-kolom di DataFrame (semua kolom), tanpa to_dict dulu."""
    if df is None or df.empty:
        return df
    if not q or not str(q).strip():
        return df
    needle = str(q).strip().lower()
    mask = pd.Series(False, index=df.index)
    for col in df.columns:
        series = df[col]
        if isinstance(series, pd.DataFrame):
            series = series.iloc[:, 0]
        mask |= series.astype(str).str.lower().str.contains(needle, regex=False, na=False)
    return df.loc[mask].copy()

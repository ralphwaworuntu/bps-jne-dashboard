"""Excel IO helpers — prefer calamine (Rust) for faster .xlsx/.xlsb reads."""
from __future__ import annotations

import io
from pathlib import Path
from typing import Any, BinaryIO, Optional, Union

import pandas as pd

PathLike = Union[str, Path]
Source = Union[PathLike, bytes, BinaryIO]


def read_excel_fast(
    source: Source,
    *,
    dtype: Any = str,
    **kwargs: Any,
) -> pd.DataFrame:
    """Baca Excel dengan engine calamine; fallback ke engine default pandas jika gagal.

    Tidak mengubah isi data — hanya mempercepat parse file.
    """
    buf: Optional[BinaryIO] = None
    path: Optional[PathLike] = None

    if isinstance(source, (bytes, bytearray)):
        buf = io.BytesIO(source)
    elif hasattr(source, "read"):
        buf = source  # type: ignore[assignment]
    else:
        path = source  # type: ignore[assignment]

    target: Any = buf if buf is not None else path

    try:
        if buf is not None and hasattr(buf, "seek"):
            buf.seek(0)
        return pd.read_excel(target, engine="calamine", dtype=dtype, **kwargs)
    except Exception:
        if buf is not None and hasattr(buf, "seek"):
            buf.seek(0)
        return pd.read_excel(target, dtype=dtype, **kwargs)

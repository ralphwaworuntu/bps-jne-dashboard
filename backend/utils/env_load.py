"""Load backend/.env into os.environ (tanpa dependency python-dotenv)."""
from __future__ import annotations

import os
from pathlib import Path


def load_dotenv_file(path: Path | None = None) -> None:
    env_path = path or (Path(__file__).resolve().parent.parent / ".env")
    if not env_path.is_file():
        return
    try:
        for line in env_path.read_text(encoding="utf-8").splitlines():
            text = line.strip()
            if not text or text.startswith("#") or "=" not in text:
                continue
            key, _, val = text.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key:
                os.environ[key] = val
    except Exception:
        pass

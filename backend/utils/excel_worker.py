"""Jalankan fungsi sync (pandas/Excel) di thread pool agar event loop FastAPI tidak macet."""
from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="excel_worker")


async def run_in_excel_worker(func: Callable[..., T], *args, **kwargs) -> T:
    loop = asyncio.get_running_loop()

    def _call() -> T:
        return func(*args, **kwargs)

    return await loop.run_in_executor(_executor, _call)

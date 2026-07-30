"""Job status API — progress polling untuk upload/olah data besar."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from auth import get_current_active_user
from models import User
from utils import process_jobs

router = APIRouter(tags=["jobs"])


@router.get("/api/jobs/{job_id}")
def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
):
    job = process_jobs.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job tidak ditemukan")
    owner = int(job.get("user_id") or 0)
    if owner and owner != int(current_user.id):
        raise HTTPException(status_code=403, detail="Job milik user lain")
    return process_jobs.public_job_view(job)


@router.get("/api/jobs")
def list_my_jobs(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
):
    items = process_jobs.list_jobs_for_user(int(current_user.id), limit=limit)
    return {"items": [process_jobs.public_job_view(j) for j in items]}

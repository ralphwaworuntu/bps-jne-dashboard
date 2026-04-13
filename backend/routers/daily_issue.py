from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from sqlmodel import Session, select
from datetime import datetime
import os
import shutil
from pathlib import Path

from database import get_session
from models import User, DailyIssue, DailyIssueAttachment, DailyIssueRead
from auth import get_current_active_user

router = APIRouter(
    prefix="/daily-issues",
    tags=["daily-issues"]
)

UPLOAD_DIR = Path("uploads/daily_issues")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("", response_model=DailyIssueRead, include_in_schema=False)
@router.post("/", response_model=DailyIssueRead)
async def create_daily_issue(
    wilayah: str = Form(...),
    zona: str = Form(...),
    divisi: str = Form(...),
    process_type: str = Form(...),
    awb: Optional[str] = Form(None),
    description: str = Form(...),
    action_taken: str = Form(...),
    solution_recommendation: str = Form(...),
    due_date: str = Form(...),
    internal_constraint: Optional[str] = Form(None),
    external_constraint: Optional[str] = Form(None),
    status_issue: str = Form("Open", alias="status"),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Validation: Min 1 constraint
    if not internal_constraint and not external_constraint:
        raise HTTPException(
            status_code=400, 
            detail="Must provide at least one constraint (Internal or External)"
        )

    # Auto-generate Issue Number: ISSUE-YYYYMMDD-SEQ
    today_str = datetime.now().strftime("%Y%m%d")
    
    # Correct Way to get next sequence: Count issues today
    # Note: This checks issues created today based on the sequence pattern or DB Date
    # Simplified approach: Count all issues starting with ISSUE-{today_str}
    
    statement = select(DailyIssue).where(DailyIssue.issue_number.startswith(f"ISSUE-{today_str}"))
    results = session.exec(statement).all()
    seq = len(results) + 1
    issue_number = f"ISSUE-{today_str}-{seq:03d}"

    # Parse Dates
    try:
        due_date_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Date Format")

    shift_val = current_user.shift if current_user.shift else "Unknown"

    new_issue = DailyIssue(
        issue_number=issue_number,
        wilayah=wilayah,
        zona=zona,
        date=datetime.now(),
        shift=shift_val,
        divisi=divisi,
        process_type=process_type,
        awb=awb,
        description=description,
        internal_constraint=internal_constraint,
        external_constraint=external_constraint,
        action_taken=action_taken,
        solution_recommendation=solution_recommendation,
        due_date=due_date_dt,
        status=status_issue,
        user_id=current_user.id
    )
    
    session.add(new_issue)
    session.commit()
    session.refresh(new_issue)

    # Handle Files
    if len(files) > 6:
        raise HTTPException(status_code=400, detail="Max 6 files allowed")

    for file in files:
        if file.filename:
            # Secure filename or just use UUID if needed, but keeping simple for now
            # Format: {issue_id}_{original_name}
            safe_filename = f"{new_issue.id}_{file.filename}"
            file_path = UPLOAD_DIR / safe_filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            attachment = DailyIssueAttachment(
                issue_id=new_issue.id,
                filename=file.filename,
                file_path=str(file_path)
            )
            session.add(attachment)
    
    session.commit()
    session.refresh(new_issue)
    
    return new_issue

@router.put("/{issue_id}", response_model=DailyIssueRead)
async def update_daily_issue(
    issue_id: int,
    wilayah: str = Form(...),
    zona: str = Form(...),
    divisi: str = Form(...),
    process_type: str = Form(...),
    awb: Optional[str] = Form(None),
    description: str = Form(...),
    action_taken: str = Form(...),
    solution_recommendation: str = Form(...),
    due_date: str = Form(...),
    internal_constraint: Optional[str] = Form(None),
    external_constraint: Optional[str] = Form(None),
    status_issue: str = Form("Open", alias="status"),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    issue = session.get(DailyIssue, issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
        
    # Validation: Min 1 constraint
    if not internal_constraint and not external_constraint:
         raise HTTPException(
            status_code=400, 
            detail="Must provide at least one constraint (Internal or External)"
        )

    # Parse Dates
    try:
        due_date_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Date Format")

    issue.wilayah = wilayah
    issue.zona = zona
    issue.divisi = divisi
    issue.process_type = process_type
    issue.awb = awb
    issue.description = description
    issue.action_taken = action_taken
    issue.solution_recommendation = solution_recommendation
    issue.due_date = due_date_dt
    issue.internal_constraint = internal_constraint
    issue.external_constraint = external_constraint
    issue.status = status_issue
    
    session.add(issue)
    session.commit()
    session.refresh(issue)
    
    return issue

from sqlalchemy.orm import selectinload

@router.get("", response_model=List[DailyIssueRead], include_in_schema=False)
@router.get("/", response_model=List[DailyIssueRead])
async def get_daily_issues(
    skip: int = 0, 
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    print(f"DEBUG: Endpoint reached by {current_user.email}") # DEBUG
    statement = select(DailyIssue).options(selectinload(DailyIssue.attachments))
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(hour=0, minute=0, second=0)
            statement = statement.where(DailyIssue.date >= start_dt)
        except ValueError:
             pass # Ignore invalid dates
             
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            statement = statement.where(DailyIssue.date <= end_dt)
        except ValueError:
            pass

    statement = statement.offset(skip).limit(limit).order_by(DailyIssue.date.desc())
    results = session.exec(statement).all()
    return results

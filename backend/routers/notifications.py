from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Notification, User
from auth import get_current_active_user

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[Notification])
def get_notifications(
    skip: int = 0, 
    limit: int = 20, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    # Fetch notifications for this user OR global ones (user_id is None)
    # Ordered by newest first
    statement = select(Notification).where(
        (Notification.user_id == current_user.id) | (Notification.user_id == None)
    ).order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    
    notifications = session.exec(statement).all()
    return notifications

@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Ensure ownership or it's a global one (if global, marking read might be tricky per user without specific table, 
    # but for now let's assume we copy logic or just allow it if user matches)
    if notification.user_id and notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"status": "success"}

@router.post("/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    # Update all unread for this user
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    notifications = session.exec(statement).all()
    
    for note in notifications:
        note.is_read = True
        session.add(note)
    
    session.commit()
    return {"status": "success", "count": len(notifications)}

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, col, or_
from typing import List

from database import get_session
from models import Notification, NotificationRead, User
from auth import get_current_active_user

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"],
    responses={404: {"description": "Not found"}},
)


@router.get("/", response_model=List[NotificationRead])
@router.get("", response_model=List[NotificationRead], include_in_schema=False)
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    statement = (
        select(Notification)
        .where(
            or_(
                Notification.user_id == current_user.id,
                col(Notification.user_id).is_(None),
            )
        )
        .order_by(col(Notification.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    return session.exec(statement).all()


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id and notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"status": "success"}


@router.post("/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_active_user),
):
    statement = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    )
    notifications = session.exec(statement).all()

    for note in notifications:
        note.is_read = True
        session.add(note)

    session.commit()
    return {"status": "success", "count": len(notifications)}

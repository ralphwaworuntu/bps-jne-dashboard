from typing import Optional

from sqlmodel import Session
from models import Notification


def create_notification(
    session: Session,
    title: str,
    message: str,
    type: str,
    user_id: Optional[int] = None,
):
    """
    Creates a new notification.
    If user_id is None, it's considered a system-wide notification.
    """
    notification = Notification(
        title=title,
        message=message,
        type=type,
        user_id=user_id,
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

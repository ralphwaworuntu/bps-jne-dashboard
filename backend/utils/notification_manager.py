from sqlmodel import Session
from models import Notification

def create_notification(session: Session, title: str, message: str, type: str, user_id: int = None):
    """
    Creates a new notification.
    If user_id is None, it's considered a system-wide notification (logic to be handled by fetcher).
    For now, we primarily support user-targeted notifications.
    """
    notification = Notification(
        title=title,
        message=message,
        type=type,
        user_id=user_id
    )
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

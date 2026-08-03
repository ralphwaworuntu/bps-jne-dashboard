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

    Best-effort: gagal insert (mis. sequence out-of-sync) tidak melempar —
    supaya upload/proses utama tidak gagal hanya karena notifikasi.
    """
    try:
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
    except Exception as e:
        try:
            session.rollback()
        except Exception:
            pass
        print(f"[notification] skip create ({type}): {e}")
        return None
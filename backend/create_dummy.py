from sqlmodel import Session
from database import engine
from models import DailyIssue, User
from datetime import datetime, timedelta

def create_dummy():
    with Session(engine) as session:
        # Get Admin User
        user = session.query(User).filter(User.email == "admin@bps.go.id").first()
        if not user:
            print("Admin user not found. Run seed.py first.")
            return

        today_str = datetime.now().strftime("%Y%m%d")
        
        dummy = DailyIssue(
            issue_number=f"ISSUE-{today_str}-TEST",
            wilayah="KOTA KUPANG",
            zona="Zona A",
            date=datetime.now(),
            shift="Shift 1",
            process_type="Lastmile",
            divisi="OUTBOUND",
            description="Ini adalah contoh data dummy untuk pengujian detail issue. Masalah keterlambatan kurir karena hujan deras.",
            internal_constraint="Kurir kurang personil",
            external_constraint="Cuaca buruk (Hujan)",
            action_taken="Menambah jam lembur untuk kurir yang ada",
            solution_recommendation="Recruitment part-time kurir saat peak/musim hujan",
            due_date=datetime.now() + timedelta(days=1),
            status="On Progress",
            awb="0012345678, 0087654321",
            user_id=user.id
        )
        
        try:
            session.add(dummy)
            session.commit()
            print("Successfully created dummy issue data.")
        except Exception as e:
            print(f"Failed to create dummy data: {e}")

if __name__ == "__main__":
    create_dummy()

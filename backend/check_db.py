from sqlmodel import Session, select
from database import engine
from models import DailyIssue

def check_data():
    with Session(engine) as session:
        issues = session.exec(select(DailyIssue)).all()
        print(f"Total Issues found: {len(issues)}")
        for i in issues:
            print(f"- {i.issue_number} | {i.wilayah} | {i.status}")

if __name__ == "__main__":
    check_data()

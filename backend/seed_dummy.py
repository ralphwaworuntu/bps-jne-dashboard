
from sqlmodel import Session, select
from database import engine
from models import DailyIssue, DailyIssueAttachment, User
from datetime import datetime
import os
import shutil
from pathlib import Path

def normalize_issue_number(issue_number):
    return issue_number.strip().upper()

def seed_data():
    with Session(engine) as session:
        # 1. Ensure User Exists
        user = session.exec(select(User)).first()
        if not user:
            print("No users found. Please register a user first.")
            return

        target_issue_number = "ISSUE-20260113-TEST"
        
        # 2. Check/Create Issue
        issue = session.exec(select(DailyIssue).where(DailyIssue.issue_number == target_issue_number)).first()
        
        if not issue:
            print(f"Creating Issue {target_issue_number}...")
            issue = DailyIssue(
                issue_number=target_issue_number,
                wilayah="KOTA KUPANG",
                zona="Zona A",
                date=datetime.now(),
                shift="Shift 1",
                divisi="OUTBOUND",
                process_type="Lastmile",
                description="This is a dummy issue for testing image gallery.",
                action_taken="Generated dummy data",
                solution_recommendation="Verify gallery display",
                due_date=datetime.now(),
                status="Open",
                internal_constraint="Testing Image Uploads",
                user_id=user.id
            )
            session.add(issue)
            session.commit()
            session.refresh(issue)
        else:
            print(f"Issue {target_issue_number} already exists.")

        # 3. Create Dummy Images
        UPLOAD_DIR = Path("uploads/daily_issues")
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        colors = ["red", "green", "blue", "yellow", "purple", "orange"]
        
        # We need PIL to generate real images, or we can just create dummy text files if frontend blindly displays them (frontend expects images).
        # Let's try to import PIL, if not available, copy a file or create simple SVG/BMP if possible without lib?
        # Better: Assume PIL is not there and create a simple PPM or BMP file manually which is easy in pure python.
        
        for i, color in enumerate(colors):
            filename = f"dummy_{i}_{color}.jpg"
            # Format: {issue_id}_{original_name}
            safe_filename = f"{issue.id}_{filename}"
            file_path = UPLOAD_DIR / safe_filename
            
            # Check if attachment exists
            existing_att = session.exec(select(DailyIssueAttachment).where(DailyIssueAttachment.filename == filename).where(DailyIssueAttachment.issue_id == issue.id)).first()
            
            if not existing_att:
                print(f"Creating attachment {filename}...")
                
                # Generate simple image (PPM format is easiest text based image format, but browsers don't support it well).
                # Let's generate a minimal valid BMP or just copy a file if exists.
                # Actually, I'll assume PIL is installed in the venv since this is a python env.
                # If not, I will write bytes for a 1x1 GIF/PNG.
                
                try:
                    from PIL import Image
                    img = Image.new('RGB', (400, 300), color=color)
                    img.save(file_path)
                except ImportError:
                    # Fallback: Create a text file effectively or 1x1 pixel text? No, that won't show.
                    # Let's write a simple SVG maybe? Browsers support SVG.
                    # But the frontend uses <img> tag, so SVG works.
                    svg_content = f'<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="{color}"/></svg>'
                    file_path = file_path.with_suffix('.svg')
                    filename = filename.replace('.jpg', '.svg')
                    safe_filename = safe_filename.replace('.jpg', '.svg')
                    with open(file_path, "w") as f:
                        f.write(svg_content)
                
                attachment = DailyIssueAttachment(
                    issue_id=issue.id,
                    filename=filename,
                    file_path=str(file_path) # Store relative path or absolute?
                    # The backend router stores: file_path = UPLOAD_DIR / safe_filename (which is Relative Path object)
                    # And stores str(file_path). UPLOAD_DIR is "uploads/daily_issues"
                )
                session.add(attachment)
                
        session.commit()
        print("Done seeding data.")

if __name__ == "__main__":
    seed_data()

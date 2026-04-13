from database import engine
from sqlmodel import text

def migrate():
    print("Migrating database...")
    with engine.connect() as conn:
        try:
            # Check if columns exist (simplified approach: just try to add and ignore error if exists, or simple add)
            # SQLite doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN universally in older versions, 
            # but usually it's fine to just run it. If it fails, it means column exists.
            
            try:
                conn.execute(text("ALTER TABLE dailyissue ADD COLUMN process_type VARCHAR DEFAULT 'Lastmile'"))
                print("Added process_type column.")
            except Exception as e:
                print(f"Skipping process_type (maybe exists): {e}")

            try:
                conn.execute(text("ALTER TABLE dailyissue ADD COLUMN awb VARCHAR"))
                print("Added awb column.")
            except Exception as e:
                print(f"Skipping awb (maybe exists): {e}")

            conn.commit()
            print("Migration complete.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()

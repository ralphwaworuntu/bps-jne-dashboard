import sqlite3

try:
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Check if column exists first to avoid error
    cursor.execute("PRAGMA table_info(correctionrequest)")
    columns = [info[1] for info in cursor.fetchall()]
    
    if 'awb' not in columns:
        print("Adding 'awb' column...")
        cursor.execute("ALTER TABLE correctionrequest ADD COLUMN awb VARCHAR DEFAULT '-'")
        conn.commit()
        print("Success: Column 'awb' added.")
    else:
        print("Column 'awb' already exists.")
        
    conn.close()

except Exception as e:
    print(f"Error: {e}")

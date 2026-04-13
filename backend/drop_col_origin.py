import sqlite3

def drop_column():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE correctionrequest DROP COLUMN origin;")
        print("Dropped origin column.")
    except Exception as e:
        print(f"Error dropping origin: {e}")

    try:
        cursor.execute("ALTER TABLE correctionrequest DROP COLUMN customer_id;")
        print("Dropped customer_id column.")
    except Exception as e:
        print(f"Error dropping customer_id: {e}")        
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    drop_column()

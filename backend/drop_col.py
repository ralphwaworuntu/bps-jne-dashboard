import sqlite3

def drop_column():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE correctionrequest DROP COLUMN user_cnnote;")
        print("Dropped user_cnnote column.")
    except Exception as e:
        print(f"Error dropping user_cnnote: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    drop_column()

import sqlite3

def add_columns():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE correctionrequest ADD COLUMN address_1 VARCHAR;")
        print("Added address_1 column.")
    except Exception as e:
        print(f"Error adding address_1: {e}")
        
    try:
        cursor.execute("ALTER TABLE correctionrequest ADD COLUMN address_2 VARCHAR;")
        print("Added address_2 column.")
    except Exception as e:
        print(f"Error adding address_2: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()

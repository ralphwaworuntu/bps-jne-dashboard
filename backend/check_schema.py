import sqlite3

conn = sqlite3.connect('database.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(correctionrequest);")
columns = cursor.fetchall()
print("correctionrequest columns:")
for col in columns:
    print(col)
conn.close()
